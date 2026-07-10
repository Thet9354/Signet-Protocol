/**
 * Ports (interfaces) for the verification pipeline.
 *
 * The pipeline is written against these so every external dependency —
 * chain reads, repo acquisition, LLM evaluation, key custody — can be swapped
 * independently: fakes in tests, Turnkey/GitHub/Anthropic in production.
 */
import type { Address, Hex } from "viem";
import type { GateInputs, GateReport } from "./evaluation/gates.js";
import type { Verdict } from "./evaluation/schema.js";

// Mirrors IAegisEscrow.MilestoneState
export enum MilestoneState {
  Pending = 0,
  InReview = 1,
  Approved = 2,
  Disputed = 3,
  Rejected = 4,
  Refunded = 5,
}

export interface MilestoneOnChain {
  amount: bigint;
  deadline: number;
  reviewNonce: number;
  state: MilestoneState;
  specHash: Hex;
  commitHash: Hex;
}

export interface EscrowOnChain {
  funder: Address;
  contributor: Address;
  agentSigner: Address;
  token: Address;
  repoCommitment: Hex;
}

/** Read-only view of AegisEscrow state. */
export interface EscrowReader {
  readonly chainId: number;
  readonly address: Address;
  getEscrow(escrowId: bigint): Promise<EscrowOnChain>;
  getMilestone(escrowId: bigint, milestoneId: bigint): Promise<MilestoneOnChain>;
  /** The contract's own view of the current release digest — used as a cross-check. */
  hashReleaseAuthorization(escrowId: bigint, milestoneId: bigint): Promise<Hex>;
}

/** A verification job, derived from a MilestoneSubmitted event. */
export interface VerificationTask {
  escrowId: bigint;
  milestoneId: bigint;
  reviewNonce: number;
  commitHash: Hex;
  artifactURI: string;
}

/** Acquires the submitted commit and produces deterministic gate inputs. */
export interface RepoProvider {
  snapshot(task: VerificationTask, escrow: EscrowOnChain): Promise<RepoSnapshot>;
}

export interface RepoSnapshot {
  /** Unified diff of the submission, fed to the LLM evaluator. */
  diff: string;
  /** Outputs of sandboxed test/coverage/provenance runs. */
  gateInputs: GateInputs;
}

/** Resolves the milestone rubric document; pipeline verifies keccak256(doc) == specHash. */
export interface RubricProvider {
  fetch(specHash: Hex): Promise<string>;
}

export interface EvaluationInput {
  rubricMarkdown: string;
  diff: string;
  gateReport: GateReport;
  commitHash: Hex;
}

/** LLM evaluation. Output is schema-validated; it never touches signing. */
export interface Evaluator {
  evaluate(input: EvaluationInput): Promise<Verdict>;
}

/**
 * Detached-signature producer for the agent key. In production this is a
 * Turnkey/KMS-backed signer whose policy only permits AegisEscrow-domain
 * EIP-712 digests; the key is non-exportable and holds no funds.
 */
export interface ReleaseSigner {
  address(): Promise<Address>;
  signDigest(digest: Hex): Promise<Hex>;
}

/** Idempotency + audit store. Keyed by escrowId:milestoneId:reviewNonce. */
export interface VerificationStore {
  get(key: string): Promise<VerificationRecord | undefined>;
  put(key: string, record: VerificationRecord): Promise<void>;
}

export interface VerificationRecord {
  task: VerificationTask;
  gateReport?: GateReport;
  verdict?: Verdict;
  digest?: Hex;
  signature?: Hex;
  outcome: "approved" | "rejected" | "escalated" | "skipped";
  reason?: string;
  completedAt: string;
}

export function taskKey(task: Pick<VerificationTask, "escrowId" | "milestoneId" | "reviewNonce">): string {
  return `${task.escrowId}:${task.milestoneId}:${task.reviewNonce}`;
}
