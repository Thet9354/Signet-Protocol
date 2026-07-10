/**
 * The signing policy layer — the LAST gate before the agent key is used.
 *
 * This module deliberately imports nothing from the evaluation package except
 * the (schema-validated) verdict type. LLM output influences signing only
 * through that single typed value, and every claim it makes is re-verified
 * against on-chain state here before a signature is requested.
 */
import type { Hex } from "viem";

import { hashReleaseAuthorization } from "@aegis/shared";
import type { GateReport } from "../evaluation/gates.js";
import type { Verdict } from "../evaluation/schema.js";
import { MilestoneState, type EscrowReader, type ReleaseSigner, type VerificationTask } from "../types.js";

export class ReleasePolicyViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReleasePolicyViolation";
  }
}

export interface AuthorizeParams {
  reader: EscrowReader;
  signer: ReleaseSigner;
  task: VerificationTask;
  verdict: Verdict;
  gateReport: GateReport;
  /** Minimum LLM confidence required to co-sign. */
  minConfidence?: number;
}

export interface ReleaseAuthorizationResult {
  digest: Hex;
  signature: Hex;
}

export async function authorizeRelease(params: AuthorizeParams): Promise<ReleaseAuthorizationResult> {
  const { reader, signer, task, verdict, gateReport } = params;
  const minConfidence = params.minConfidence ?? 0.8;

  // 1. Verdict policy — gates are a floor the LLM cannot override.
  if (!gateReport.passed) {
    throw new ReleasePolicyViolation("deterministic gates failed; LLM verdict cannot override them");
  }
  if (verdict.decision !== "approve") {
    throw new ReleasePolicyViolation(`verdict is "${verdict.decision}", not "approve"`);
  }
  if (verdict.injectionSuspected) {
    throw new ReleasePolicyViolation("evaluator flagged suspected prompt injection");
  }
  if (verdict.confidence < minConfidence) {
    throw new ReleasePolicyViolation(`confidence ${verdict.confidence} below threshold ${minConfidence}`);
  }
  if (verdict.commitHash.toLowerCase() !== task.commitHash.toLowerCase()) {
    throw new ReleasePolicyViolation("verdict commit hash does not match the submitted commit");
  }
  if (!verdict.criteria.every((c) => c.satisfied)) {
    throw new ReleasePolicyViolation('verdict is "approve" but not all criteria are satisfied');
  }

  // 2. Re-read on-chain state — the evaluation may have taken minutes.
  const [escrow, milestone] = await Promise.all([
    reader.getEscrow(task.escrowId),
    reader.getMilestone(task.escrowId, task.milestoneId),
  ]);
  if (milestone.state !== MilestoneState.InReview) {
    throw new ReleasePolicyViolation(`milestone is no longer InReview (state=${milestone.state})`);
  }
  if (milestone.reviewNonce !== task.reviewNonce) {
    throw new ReleasePolicyViolation("milestone was resubmitted since this evaluation started");
  }
  if (milestone.commitHash.toLowerCase() !== task.commitHash.toLowerCase()) {
    throw new ReleasePolicyViolation("on-chain commit hash does not match the evaluated commit");
  }

  // 3. Compute the digest locally from canonical shared types, then cross-check
  //    against the contract's own view — a mismatch means an encoding drift
  //    and must never be signed.
  const digest = hashReleaseAuthorization(reader.chainId, reader.address, {
    escrowId: task.escrowId,
    milestoneId: task.milestoneId,
    reviewNonce: milestone.reviewNonce,
    commitHash: milestone.commitHash,
    amount: milestone.amount,
    recipient: escrow.contributor,
  });
  const onChainDigest = await reader.hashReleaseAuthorization(task.escrowId, task.milestoneId);
  if (digest.toLowerCase() !== onChainDigest.toLowerCase()) {
    throw new ReleasePolicyViolation("locally computed digest does not match contract digest");
  }

  const signature = await signer.signDigest(digest);
  return { digest, signature };
}
