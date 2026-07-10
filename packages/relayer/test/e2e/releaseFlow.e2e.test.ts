/**
 * End-to-end release flow against a real chain (anvil):
 *
 *   funder createEscrow + fund → contributor submitMilestone →
 *   relayer observes the event, runs the pipeline (real chain reads, real
 *   agent-key signature; fake repo/LLM) → funder co-signs the same digest →
 *   a THIRD party submits approveMilestone → contributor is paid on-chain.
 *
 * This proves the property everything else depends on: a relayer-produced
 * signature verifies inside AegisEscrow's 2-of-3 check.
 *
 * Requires `anvil` on PATH (or ANVIL_PATH) and forge build artifacts.
 */
import { spawn, type ChildProcess } from "node:child_process";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseEventLogs,
  toBytes,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { aegisEscrowAbi, aegisEscrowBytecode, testUsdcAbi, testUsdcBytecode } from "@aegis/shared/abi";
import { ViemEscrowReader } from "../../src/chain/escrowReader.js";
import { verifyMilestone } from "../../src/pipeline/verifyMilestone.js";
import { LocalDevSigner } from "../../src/signing/signer.js";
import { MemoryVerificationStore } from "../../src/store/memoryStore.js";
import type { VerificationTask } from "../../src/types.js";
import { fakeRepoProvider, passingGateInputs, THRESHOLDS } from "../fakes.js";

// Anvil's default funded accounts.
const FUNDER_KEY: Hex = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const CONTRIBUTOR_KEY: Hex = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const AGENT_KEY: Hex = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
const RELAYER_KEY: Hex = "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6";

const PORT = 8560;
const RPC = `http://127.0.0.1:${PORT}`;

const RUBRIC = "# Milestone 0: CLI MVP\n- Config parser implemented\n- Parser covered by tests\n";
const SPEC_HASH = keccak256(toBytes(RUBRIC));
const COMMIT_HASH = keccak256(toBytes("commit:e2e"));
const AMOUNT = 1_000_000_000n; // 1,000 tUSDC (6 decimals)

let anvil: ChildProcess;
let publicClient: PublicClient;

const funder = privateKeyToAccount(FUNDER_KEY);
const contributor = privateKeyToAccount(CONTRIBUTOR_KEY);
const agent = privateKeyToAccount(AGENT_KEY);
const relayer = privateKeyToAccount(RELAYER_KEY);

function wallet(account: typeof funder) {
  return createWalletClient({ account, chain: foundry, transport: http(RPC) });
}

async function waitForRpc(): Promise<void> {
  for (let i = 0; i < 100; i++) {
    try {
      await publicClient.getChainId();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  throw new Error("anvil did not become ready");
}

async function deploy(abi: unknown, bytecode: Hex, account: typeof funder, args: unknown[] = []) {
  const hash = await wallet(account).deployContract({
    abi: abi as never,
    bytecode,
    args: args as never,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt.contractAddress as Address;
}

beforeAll(async () => {
  anvil = spawn(process.env.ANVIL_PATH ?? "anvil", ["--port", String(PORT), "--silent"], {
    stdio: "ignore",
  });
  publicClient = createPublicClient({ chain: foundry, transport: http(RPC) });
  await waitForRpc();
});

afterAll(() => {
  anvil?.kill("SIGKILL");
});

describe("full release flow on anvil", () => {
  it("relayer signature + funder co-signature release funds to the contributor", async () => {
    // ── Deploy & set up the escrow (funder) ─────────────────────────────
    const usdc = await deploy(testUsdcAbi, testUsdcBytecode as Hex, funder);
    const escrow = await deploy(aegisEscrowAbi, aegisEscrowBytecode as Hex, funder);

    const createHash = await wallet(funder).writeContract({
      address: escrow,
      abi: aegisEscrowAbi,
      functionName: "createEscrow",
      args: [
        contributor.address,
        agent.address,
        usdc,
        604_800, // 7-day dispute window (uint40)
        keccak256(toBytes("github:aegis-demo:main")),
        [{ amount: AMOUNT, deadline: 4_000_000_000, specHash: SPEC_HASH }],
      ],
    });
    const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash });
    const [created] = parseEventLogs({
      abi: aegisEscrowAbi,
      eventName: "EscrowCreated",
      logs: createReceipt.logs,
    });
    const escrowId = created!.args.escrowId;

    await wallet(funder).writeContract({
      address: usdc,
      abi: testUsdcAbi,
      functionName: "approve",
      args: [escrow, AMOUNT],
    });
    const fundHash = await wallet(funder).writeContract({
      address: escrow,
      abi: aegisEscrowAbi,
      functionName: "fund",
      args: [escrowId],
    });
    await publicClient.waitForTransactionReceipt({ hash: fundHash });

    // ── Contributor submits the milestone ───────────────────────────────
    const submitHash = await wallet(contributor).writeContract({
      address: escrow,
      abi: aegisEscrowAbi,
      functionName: "submitMilestone",
      args: [escrowId, 0n, COMMIT_HASH, "ipfs://artifact-e2e"],
    });
    const submitReceipt = await publicClient.waitForTransactionReceipt({ hash: submitHash });

    // ── Relayer derives its task from the on-chain event (as in prod) ───
    const [submitted] = parseEventLogs({
      abi: aegisEscrowAbi,
      eventName: "MilestoneSubmitted",
      logs: submitReceipt.logs,
    });
    const task: VerificationTask = {
      escrowId: submitted!.args.escrowId,
      milestoneId: submitted!.args.milestoneId,
      reviewNonce: submitted!.args.reviewNonce,
      commitHash: submitted!.args.commitHash,
      artifactURI: submitted!.args.artifactURI,
    };

    // ── Relayer pipeline: real chain reads + real agent signature ───────
    const record = await verifyMilestone(
      {
        reader: new ViemEscrowReader(publicClient, escrow, foundry.id),
        repoProvider: fakeRepoProvider(passingGateInputs()),
        rubricProvider: { fetch: async () => RUBRIC },
        evaluator: {
          // Stands in for ClaudeEvaluator; e2e asserts the crypto path, not the LLM.
          async evaluate(input) {
            return {
              decision: "approve",
              commitHash: input.commitHash,
              criteria: [{ criterion: "rubric satisfied", satisfied: true, evidence: "e2e fixture" }],
              reasoning: "e2e fixture approval",
              confidence: 0.99,
              injectionSuspected: false,
            };
          },
        },
        signer: new LocalDevSigner(AGENT_KEY),
        store: new MemoryVerificationStore(),
        thresholds: THRESHOLDS,
      },
      task,
    );

    expect(record.outcome).toBe("approved");
    const digest = record.digest!;
    const agentSignature = record.signature!;

    // ── Funder co-signs the same digest ─────────────────────────────────
    const funderSignature = await funder.sign({ hash: digest });

    // ── A third party executes the release (permissionless) ─────────────
    const approveHash = await wallet(relayer).writeContract({
      address: escrow,
      abi: aegisEscrowAbi,
      functionName: "approveMilestone",
      args: [escrowId, 0n, [funder.address, agent.address], [funderSignature, agentSignature]],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    // ── The contributor got paid; the milestone is terminal ─────────────
    const balance = await publicClient.readContract({
      address: usdc,
      abi: testUsdcAbi,
      functionName: "balanceOf",
      args: [contributor.address],
    });
    expect(balance).toBe(AMOUNT);

    const milestone = await publicClient.readContract({
      address: escrow,
      abi: aegisEscrowAbi,
      functionName: "getMilestone",
      args: [escrowId, 0n],
    });
    expect(milestone.state).toBe(2); // Approved
  });
});
