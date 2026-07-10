/** Shared fakes for pipeline/policy tests. */
import { keccak256, toBytes, type Address, type Hex } from "viem";

import { hashReleaseAuthorization } from "@aegis/shared";
import type { GateInputs, GateThresholds } from "../src/evaluation/gates.js";
import type { Verdict } from "../src/evaluation/schema.js";
import {
  MilestoneState,
  type EscrowOnChain,
  type EscrowReader,
  type MilestoneOnChain,
  type RepoProvider,
  type RubricProvider,
  type VerificationTask,
} from "../src/types.js";

export const CHAIN_ID = 31337;
export const ESCROW_ADDRESS: Address = "0x00000000000000000000000000000000000a3915";
export const CONTRIBUTOR: Address = "0x1111111111111111111111111111111111111111";
export const RUBRIC = "# Milestone 0\n- CLI parses config\n- Tests cover the parser\n";
export const SPEC_HASH = keccak256(toBytes(RUBRIC));
export const COMMIT_HASH: Hex = keccak256(toBytes("commit:v1"));

export function makeTask(overrides: Partial<VerificationTask> = {}): VerificationTask {
  return {
    escrowId: 0n,
    milestoneId: 0n,
    reviewNonce: 1,
    commitHash: COMMIT_HASH,
    artifactURI: "ipfs://artifact",
    ...overrides,
  };
}

export class FakeReader implements EscrowReader {
  readonly chainId = CHAIN_ID;
  readonly address = ESCROW_ADDRESS;

  escrow: EscrowOnChain = {
    funder: "0x2222222222222222222222222222222222222222",
    contributor: CONTRIBUTOR,
    agentSigner: "0x3333333333333333333333333333333333333333",
    token: "0x4444444444444444444444444444444444444444",
    repoCommitment: keccak256(toBytes("repo")),
  };

  milestone: MilestoneOnChain = {
    amount: 1_000_000_000n,
    deadline: 4_000_000_000,
    reviewNonce: 1,
    state: MilestoneState.InReview,
    specHash: SPEC_HASH,
    commitHash: COMMIT_HASH,
  };

  async getEscrow(): Promise<EscrowOnChain> {
    return this.escrow;
  }

  async getMilestone(): Promise<MilestoneOnChain> {
    return this.milestone;
  }

  async hashReleaseAuthorization(escrowId: bigint, milestoneId: bigint): Promise<Hex> {
    // Faithful mirror of the contract's digest so the policy cross-check passes.
    return hashReleaseAuthorization(this.chainId, this.address, {
      escrowId,
      milestoneId,
      reviewNonce: this.milestone.reviewNonce,
      commitHash: this.milestone.commitHash,
      amount: this.milestone.amount,
      recipient: this.escrow.contributor,
    });
  }
}

export function passingGateInputs(overrides: Partial<GateInputs> = {}): GateInputs {
  return {
    testsPassed: true,
    coveragePct: 92.4,
    changedLines: 480,
    commitAuthorLogin: "contributor-dev",
    lockfileChanged: false,
    ...overrides,
  };
}

export const THRESHOLDS: GateThresholds = {
  minCoveragePct: 80,
  maxChangedLines: 5_000,
  allowedAuthorLogins: ["contributor-dev"],
  allowLockfileChanges: false,
};

export function approvingVerdict(overrides: Partial<Verdict> = {}): Verdict {
  return {
    decision: "approve",
    commitHash: COMMIT_HASH,
    criteria: [
      { criterion: "CLI parses config", satisfied: true, evidence: "parser implemented in src/cli.ts" },
      { criterion: "Tests cover the parser", satisfied: true, evidence: "parser.test.ts added, coverage 92%" },
    ],
    reasoning: "All rubric criteria satisfied with direct evidence in the diff.",
    confidence: 0.95,
    injectionSuspected: false,
    ...overrides,
  };
}

export function fakeRepoProvider(inputs: GateInputs): RepoProvider {
  return {
    async snapshot() {
      return { diff: "--- a/src/cli.ts\n+++ b/src/cli.ts\n+export function parse() {}", gateInputs: inputs };
    },
  };
}

export const fakeRubricProvider: RubricProvider = {
  async fetch() {
    return RUBRIC;
  },
};
