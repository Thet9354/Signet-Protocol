/**
 * Full end-to-end release rehearsal against the LIVE Base Sepolia deployment.
 *
 * Drives every on-chain step and, crucially, produces the AI-oracle signature
 * by invoking the REAL relayer pipeline (verifyMilestone) in-process — same
 * deterministic gates, rubric-hash check, policy re-validation, digest
 * cross-check, and agent-key signature the long-running runner uses.
 *
 *   funder createEscrow + fund (TestUSDC)
 *     → contributor submitMilestone
 *       → relayer pipeline verifies + signs  (verifyMilestone)
 *         → funder co-signs the same digest
 *           → permissionless approveMilestone([funder, agent])
 *             → contributor is paid on-chain
 *
 * Contributor is a throwaway EOA here (the passkey/Kernel path needs a
 * browser); the release is authorized by funder + AI oracle, which is the
 * headline 2-of-3 flow. Recipient still gets real TestUSDC on Base Sepolia.
 */
import fs from "node:fs";
import path from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseEventLogs,
  parseEther,
  toBytes,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { baseSepolia } from "viem/chains";

import { aegisEscrowAbi, testUsdcAbi } from "@aegis/shared/abi";
import { ViemEscrowReader } from "../src/chain/escrowReader.js";
import type { GateThresholds } from "../src/evaluation/gates.js";
import { verifyMilestone, type PipelineDeps } from "../src/pipeline/verifyMilestone.js";
import { LocalDevSigner } from "../src/signing/signer.js";
import { MemoryVerificationStore } from "../src/store/memoryStore.js";
import type { RubricProvider } from "../src/types.js";

const RPC_URL = process.env.RPC_URL ?? "https://sepolia.base.org";
const ESCROW = (process.env.ESCROW_ADDRESS ?? "") as Address;
const USDC = (process.env.USDC_ADDRESS ?? "") as Address;
const FUNDER_KEY = (process.env.FUNDER_PRIVATE_KEY ?? "") as Hex;
const AGENT_KEY = (process.env.AGENT_DEV_PRIVATE_KEY ?? "") as Hex;
const CHAIN_ID = baseSepolia.id;
const AMOUNT = 1_000_000_000n; // 1,000 TestUSDC (6 decimals)
const EXPLORER = "https://sepolia.basescan.org";

if (!ESCROW || !USDC || !FUNDER_KEY || !AGENT_KEY) {
  console.error("Set ESCROW_ADDRESS, USDC_ADDRESS, FUNDER_PRIVATE_KEY, AGENT_DEV_PRIVATE_KEY");
  process.exit(1);
}

const funder = privateKeyToAccount(FUNDER_KEY);
const agent = privateKeyToAccount(AGENT_KEY);
const contributor = privateKeyToAccount(generatePrivateKey()); // throwaway recipient

const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
// Chainless client for the reader — avoids OP-stack formatter type friction;
// ViemEscrowReader takes chainId explicitly.
const readerClient = createPublicClient({ transport: http(RPC_URL) });
const funderWallet = createWalletClient({ account: funder, chain: baseSepolia, transport: http(RPC_URL) });
const contributorWallet = createWalletClient({ account: contributor, chain: baseSepolia, transport: http(RPC_URL) });

const rubric = fs.readFileSync(path.join(import.meta.dirname, "..", "rubrics", "milestone-0.md"), "utf8");
const SPEC_HASH = keccak256(toBytes(rubric));
const COMMIT_HASH = keccak256(toBytes("commit:rehearsal-" + Date.now()));

function link(kind: "address" | "tx", v: string) {
  return `${EXPLORER}/${kind}/${v}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Base Sepolia's public RPC is a load-balanced fleet with read-your-writes
// lag: a call can route to a node that hasn't seen a just-confirmed tx.
// Wait for 2 confirmations so state propagates before dependent steps.
async function wait(hash: Hex, label: string) {
  const r = await publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
  console.log(`   ${label}: ${r.status}  ${link("tx", hash)}`);
  if (r.status !== "success") throw new Error(`${label} reverted`);
  return r;
}

// Retry a write that depends on a just-written value being visible fleet-wide.
async function waitRetry(send: () => Promise<Hex>, label: string, attempts = 4) {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await wait(await send(), label);
    } catch (err) {
      if (i === attempts) throw err;
      console.log(`   ${label}: attempt ${i} failed (RPC lag), retrying…`);
      await sleep(4000);
    }
  }
  throw new Error("unreachable");
}

async function main() {
  console.log("Aegis end-to-end rehearsal — Base Sepolia\n");
  console.log(`escrow      ${ESCROW}`);
  console.log(`funder      ${funder.address}`);
  console.log(`agent       ${agent.address}`);
  console.log(`contributor ${contributor.address} (throwaway recipient)\n`);

  // 1. Fund the throwaway contributor with a little gas so it can submit.
  console.log("1. Funding contributor with gas…");
  await wait(
    await funderWallet.sendTransaction({ to: contributor.address, value: parseEther("0.0005") }),
    "gas transfer",
  );

  // 2. Funder creates the escrow (rubric committed via specHash).
  console.log("2. Creating escrow…");
  const createReceipt = await wait(
    await funderWallet.writeContract({
      address: ESCROW,
      abi: aegisEscrowAbi,
      functionName: "createEscrow",
      args: [
        contributor.address,
        agent.address,
        USDC,
        604_800, // 7-day dispute window
        keccak256(toBytes("github:aegis-demo/cli:main")),
        [{ amount: AMOUNT, deadline: Math.floor(Date.now() / 1000) + 30 * 86_400, specHash: SPEC_HASH }],
      ],
    }),
    "createEscrow",
  );
  const [created] = parseEventLogs({ abi: aegisEscrowAbi, eventName: "EscrowCreated", logs: createReceipt.logs });
  const escrowId = created!.args.escrowId;
  console.log(`   escrowId = ${escrowId}`);

  // 3. Funder approves + funds the escrow with TestUSDC.
  console.log("3. Approving + funding escrow…");
  await wait(
    await funderWallet.writeContract({
      address: USDC,
      abi: testUsdcAbi,
      functionName: "approve",
      args: [ESCROW, AMOUNT],
    }),
    "approve",
  );
  // fund transfers the approved tokens — retry to absorb allowance-read lag.
  await waitRetry(
    () => funderWallet.writeContract({ address: ESCROW, abi: aegisEscrowAbi, functionName: "fund", args: [escrowId] }),
    "fund",
  );

  // 4. Contributor submits the milestone (the commit under review).
  console.log("4. Contributor submitting milestone…");
  await waitRetry(
    () => contributorWallet.writeContract({
      address: ESCROW,
      abi: aegisEscrowAbi,
      functionName: "submitMilestone",
      args: [escrowId, 0n, COMMIT_HASH, "ipfs://bafy-rehearsal-artifact"],
    }),
    "submitMilestone",
  );

  // 5. The AI oracle relayer verifies and signs — REAL pipeline, in-process.
  console.log("5. Running the relayer verification pipeline…");
  const thresholds: GateThresholds = {
    minCoveragePct: 80,
    maxChangedLines: 5_000,
    allowedAuthorLogins: ["demo-contributor"],
    allowLockfileChanges: false,
  };
  const rubricProvider: RubricProvider = { async fetch() {
    return rubric;
  } };
  const deps: PipelineDeps = {
    reader: new ViemEscrowReader(readerClient, ESCROW, CHAIN_ID),
    repoProvider: { async snapshot() {
      return {
        diff: "+// rehearsal fixture snapshot",
        gateInputs: { testsPassed: true, coveragePct: 91.2, changedLines: 412, commitAuthorLogin: "demo-contributor", lockfileChanged: false },
      };
    } },
    rubricProvider,
    evaluator: { async evaluate(input) {
      return {
        decision: "approve",
        commitHash: input.commitHash,
        criteria: [{ criterion: "rubric satisfied", satisfied: true, evidence: "rehearsal fixture" }],
        reasoning: "Fixture evaluator (testnet rehearsal, $0 mode).",
        confidence: 0.97,
        injectionSuspected: false,
      };
    } },
    signer: new LocalDevSigner(AGENT_KEY),
    store: new MemoryVerificationStore(),
    thresholds,
  };
  const record = await verifyMilestone(deps, {
    escrowId,
    milestoneId: 0n,
    reviewNonce: 1,
    commitHash: COMMIT_HASH,
    artifactURI: "ipfs://bafy-rehearsal-artifact",
  });
  console.log(`   pipeline outcome: ${record.outcome}`);
  if (record.outcome !== "approved") {
    throw new Error(`pipeline did not approve: ${record.reason}`);
  }
  const digest = record.digest!;
  const agentSignature = record.signature!;
  console.log(`   digest         ${digest}`);
  console.log(`   oracle sig     ${agentSignature.slice(0, 26)}… (agent ${agent.address})`);

  // 6. Funder co-signs the SAME digest (second of the 2-of-3).
  console.log("6. Funder co-signing…");
  const funderSignature = await funder.sign({ hash: digest });
  console.log(`   funder sig     ${funderSignature.slice(0, 26)}…`);

  // 7. Permissionless execution — anyone can submit the two signatures.
  console.log("7. Executing release (approveMilestone)…");
  const balBefore = (await publicClient.readContract({
    address: USDC, abi: testUsdcAbi, functionName: "balanceOf", args: [contributor.address],
  })) as bigint;
  const approveReceipt = await waitRetry(
    () => funderWallet.writeContract({
      address: ESCROW,
      abi: aegisEscrowAbi,
      functionName: "approveMilestone",
      args: [escrowId, 0n, [funder.address, agent.address], [funderSignature, agentSignature]],
    }),
    "approveMilestone",
  );
  const balAfter = (await publicClient.readContract({
    address: USDC, abi: testUsdcAbi, functionName: "balanceOf", args: [contributor.address],
  })) as bigint;
  const ms = (await publicClient.readContract({
    address: ESCROW, abi: aegisEscrowAbi, functionName: "getMilestone", args: [escrowId, 0n],
  })) as { state: number };

  console.log("\n──────────────────── RESULT ────────────────────");
  console.log(`milestone state : ${ms.state === 2 ? "Approved ✓" : `unexpected(${ms.state})`}`);
  console.log(`contributor paid: ${(balAfter - balBefore) / 1_000_000n} TestUSDC`);
  console.log(`release tx      : ${link("tx", approveReceipt.transactionHash)}`);
  console.log(`escrow #${escrowId}      : ${link("address", ESCROW)}`);
  console.log(`recipient       : ${link("address", contributor.address)}`);
  console.log("─────────────────────────────────────────────────");

  if (ms.state !== 2 || balAfter - balBefore !== AMOUNT) {
    throw new Error("rehearsal assertion failed");
  }
  console.log("\n✓ Full 2-of-3 release verified end-to-end on Base Sepolia.");
}

void main().catch((e) => {
  console.error("\nRehearsal failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
