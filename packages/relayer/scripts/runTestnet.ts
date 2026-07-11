/**
 * Testnet relayer runner — the AI oracle as a long-running process.
 *
 * Watches MilestoneSubmitted on the deployed AegisEscrow, runs the
 * verification pipeline for each submission, and prints the detached oracle
 * signature to paste into the dashboard's signature tracker.
 *
 * $0 configuration: uses the fixture repo provider + evaluator (same as the
 * e2e suite) so no GitHub App or Anthropic API call is needed. The chain
 * reads, policy layer, digest cross-check, and agent signature are all real.
 * Swap in ClaudeEvaluator + a real RepoProvider for live evaluations.
 *
 *   RPC_URL=https://sepolia.base.org \
 *   CHAIN_ID=84532 \
 *   ESCROW_ADDRESS=0x... \
 *   AGENT_DEV_PRIVATE_KEY=0x... \
 *   pnpm runner
 */
import fs from "node:fs";
import path from "node:path";
import { createPublicClient, http, keccak256, toBytes, type Hex } from "viem";

import { ViemEscrowReader, watchMilestoneSubmitted } from "../src/chain/escrowReader.js";
import type { GateThresholds } from "../src/evaluation/gates.js";
import { verifyMilestone, type PipelineDeps } from "../src/pipeline/verifyMilestone.js";
import { LocalDevSigner } from "../src/signing/signer.js";
import { MemoryVerificationStore } from "../src/store/memoryStore.js";
import { taskKey, type RubricProvider, type VerificationTask } from "../src/types.js";
import { aegisEscrowAbi } from "@aegis/shared/abi";

// ── Config ────────────────────────────────────────────────────────────────
const RPC_URL = process.env.RPC_URL ?? "https://sepolia.base.org";
const ESCROW_ADDRESS = (process.env.ESCROW_ADDRESS ?? "") as Hex;
const AGENT_KEY = (process.env.AGENT_DEV_PRIVATE_KEY ?? "") as Hex;
const CHAIN_ID = Number(process.env.CHAIN_ID ?? 84532);
// Defaults to the Base Sepolia deployment block of AegisEscrow.
const START_BLOCK = BigInt(process.env.START_BLOCK ?? 43_984_800);
// Public RPCs cap eth_getLogs ranges (sepolia.base.org: 2000 blocks).
const SCAN_CHUNK = 1_800n;

if (!ESCROW_ADDRESS || !AGENT_KEY) {
  console.error("Set ESCROW_ADDRESS and AGENT_DEV_PRIVATE_KEY");
  process.exit(1);
}

// ── Rubrics: files in ./rubrics indexed by keccak256(contents) ────────────
// The escrow's specHash commits to the rubric BEFORE work begins; the wizard
// textarea contents must byte-match one of these files.
function loadRubrics(): Map<string, string> {
  const dir = path.join(import.meta.dirname, "..", "rubrics");
  const map = new Map<string, string>();
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const content = fs.readFileSync(path.join(dir, file), "utf8");
    map.set(keccak256(toBytes(content)).toLowerCase(), content);
    console.log(`rubric loaded: ${file} → ${keccak256(toBytes(content))}`);
  }
  return map;
}

const rubrics = loadRubrics();
const rubricProvider: RubricProvider = {
  async fetch(specHash) {
    return rubrics.get(specHash.toLowerCase()) ?? "";
  },
};

// ── Pipeline wiring (fixture repo/evaluator; real chain, policy, signer) ──
const THRESHOLDS: GateThresholds = {
  minCoveragePct: 80,
  maxChangedLines: 5_000,
  allowedAuthorLogins: ["demo-contributor"],
  allowLockfileChanges: false,
};

const client = createPublicClient({ transport: http(RPC_URL) });

const deps: PipelineDeps = {
  reader: new ViemEscrowReader(client, ESCROW_ADDRESS, CHAIN_ID),
  repoProvider: {
    async snapshot() {
      return {
        diff: "+// fixture snapshot — swap in GitCliProvider for live repo evaluation",
        gateInputs: {
          testsPassed: true,
          coveragePct: 91.2,
          changedLines: 412,
          commitAuthorLogin: "demo-contributor",
          lockfileChanged: false,
        },
      };
    },
  },
  rubricProvider,
  evaluator: {
    async evaluate(input) {
      return {
        decision: "approve",
        commitHash: input.commitHash,
        criteria: [{ criterion: "rubric satisfied", satisfied: true, evidence: "fixture evaluation" }],
        reasoning: "Fixture evaluator (testnet rehearsal, $0 mode).",
        confidence: 0.97,
        injectionSuspected: false,
      };
    },
  },
  signer: new LocalDevSigner(AGENT_KEY),
  store: new MemoryVerificationStore(),
  thresholds: THRESHOLDS,
};

// ── Processing ────────────────────────────────────────────────────────────
async function process_(task: VerificationTask): Promise<void> {
  console.log(`\n■ submission ${taskKey(task)} commit=${task.commitHash.slice(0, 18)}…`);
  try {
    const record = await verifyMilestone(deps, task);
    console.log(`  outcome: ${record.outcome}${record.reason ? ` — ${record.reason}` : ""}`);
    if (record.outcome === "approved") {
      console.log("\n════════════ ORACLE SIGNATURE (paste into the dashboard) ════════════");
      console.log(`escrow    ${ESCROW_ADDRESS}  milestone ${task.milestoneId} (round ${task.reviewNonce})`);
      console.log(`digest    ${record.digest}`);
      console.log(`signature ${record.signature}`);
      console.log("══════════════════════════════════════════════════════════════════════\n");
    }
  } catch (err) {
    console.error("  pipeline error:", err instanceof Error ? err.message : err);
  }
}

async function main(): Promise<void> {
  const signerAddress = await deps.signer.address();
  console.log(`Aegis oracle relayer (testnet, fixture-eval mode)`);
  console.log(`escrow ${ESCROW_ADDRESS} · chain ${CHAIN_ID} · agent ${signerAddress}`);

  // Catch up on submissions made before the runner started (chunked — public
  // RPCs reject wide eth_getLogs ranges).
  const latest = await client.getBlockNumber();
  let scanned = 0;
  for (let from = START_BLOCK; from <= latest; from += SCAN_CHUNK) {
    const to = from + SCAN_CHUNK - 1n > latest ? latest : from + SCAN_CHUNK - 1n;
    const past = await client.getContractEvents({
      address: ESCROW_ADDRESS,
      abi: aegisEscrowAbi,
      eventName: "MilestoneSubmitted",
      fromBlock: from,
      toBlock: to,
    });
    for (const log of past) {
      const { escrowId, milestoneId, reviewNonce, commitHash, artifactURI } = log.args;
      if (escrowId === undefined || milestoneId === undefined || reviewNonce === undefined || !commitHash) continue;
      scanned += 1;
      await process_({ escrowId, milestoneId, reviewNonce, commitHash, artifactURI: artifactURI ?? "" });
    }
  }
  console.log(`catch-up scan (blocks ${START_BLOCK}→${latest}): ${scanned} past submission(s)`);

  watchMilestoneSubmitted(client, ESCROW_ADDRESS, (task) => void process_(task));
  console.log("watching for new submissions… (ctrl-C to stop)");
}

void main();
