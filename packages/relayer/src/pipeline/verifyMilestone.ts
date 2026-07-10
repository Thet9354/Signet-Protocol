/**
 * The verification pipeline: reconcile → acquire → gates → evaluate → sign.
 *
 * Structured as pure sequential steps over injected ports so it can run under
 * any durable-execution host (each step is idempotent given the task key).
 */
import { keccak256, toBytes, type Hex } from "viem";

import { runGates, type GateThresholds } from "../evaluation/gates.js";
import { authorizeRelease, ReleasePolicyViolation } from "../signing/authorize.js";
import {
  MilestoneState,
  taskKey,
  type EscrowReader,
  type Evaluator,
  type ReleaseSigner,
  type RepoProvider,
  type RubricProvider,
  type VerificationRecord,
  type VerificationStore,
  type VerificationTask,
} from "../types.js";

export interface PipelineDeps {
  reader: EscrowReader;
  repoProvider: RepoProvider;
  rubricProvider: RubricProvider;
  evaluator: Evaluator;
  signer: ReleaseSigner;
  store: VerificationStore;
  thresholds: GateThresholds;
}

export async function verifyMilestone(
  deps: PipelineDeps,
  task: VerificationTask,
): Promise<VerificationRecord> {
  const key = taskKey(task);

  // Idempotency: one verification per (escrow, milestone, review round).
  const existing = await deps.store.get(key);
  if (existing) return existing;

  const finish = async (record: VerificationRecord): Promise<VerificationRecord> => {
    await deps.store.put(key, record);
    return record;
  };
  const base = { task, completedAt: "" };
  const now = () => new Date().toISOString();

  // ── Step 1: reconcile against on-chain truth ─────────────────────────────
  const [escrow, milestone] = await Promise.all([
    deps.reader.getEscrow(task.escrowId),
    deps.reader.getMilestone(task.escrowId, task.milestoneId),
  ]);
  if (milestone.state !== MilestoneState.InReview) {
    return finish({ ...base, outcome: "skipped", reason: `milestone not InReview (state=${milestone.state})`, completedAt: now() });
  }
  if (milestone.reviewNonce !== task.reviewNonce || milestone.commitHash.toLowerCase() !== task.commitHash.toLowerCase()) {
    return finish({ ...base, outcome: "skipped", reason: "task is stale: milestone was resubmitted", completedAt: now() });
  }

  // ── Step 2: rubric integrity — evaluate against the pre-committed spec ───
  const rubric = await deps.rubricProvider.fetch(milestone.specHash);
  const rubricHash = keccak256(toBytes(rubric)) as Hex;
  if (rubricHash.toLowerCase() !== milestone.specHash.toLowerCase()) {
    return finish({ ...base, outcome: "escalated", reason: "rubric document does not match on-chain specHash", completedAt: now() });
  }

  // ── Step 3: acquire the commit + deterministic gates ─────────────────────
  const snapshot = await deps.repoProvider.snapshot(task, escrow);
  const gateReport = runGates(snapshot.gateInputs, deps.thresholds);
  if (!gateReport.passed) {
    // Gates are a hard floor — no LLM call, no signature.
    return finish({ ...base, gateReport, outcome: "rejected", reason: "deterministic gates failed", completedAt: now() });
  }

  // ── Step 4: LLM evaluation (output enters only as a schema-validated verdict)
  const verdict = await deps.evaluator.evaluate({
    rubricMarkdown: rubric,
    diff: snapshot.diff,
    gateReport,
    commitHash: task.commitHash,
  });
  if (verdict.decision === "escalate") {
    return finish({ ...base, gateReport, verdict, outcome: "escalated", reason: verdict.reasoning, completedAt: now() });
  }
  if (verdict.decision === "reject") {
    return finish({ ...base, gateReport, verdict, outcome: "rejected", reason: verdict.reasoning, completedAt: now() });
  }

  // ── Step 5: policy re-validation + KMS signature ─────────────────────────
  try {
    const { digest, signature } = await authorizeRelease({
      reader: deps.reader,
      signer: deps.signer,
      task,
      verdict,
      gateReport,
    });
    return finish({ ...base, gateReport, verdict, digest, signature, outcome: "approved", completedAt: now() });
  } catch (err) {
    if (err instanceof ReleasePolicyViolation) {
      return finish({ ...base, gateReport, verdict, outcome: "escalated", reason: `policy violation: ${err.message}`, completedAt: now() });
    }
    throw err;
  }
}
