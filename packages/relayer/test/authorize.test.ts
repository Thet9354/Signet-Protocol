import { recoverAddress } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";

import { runGates } from "../src/evaluation/gates.js";
import { authorizeRelease, ReleasePolicyViolation } from "../src/signing/authorize.js";
import { LocalDevSigner } from "../src/signing/signer.js";
import { MilestoneState } from "../src/types.js";
import { approvingVerdict, FakeReader, makeTask, passingGateInputs, THRESHOLDS } from "./fakes.js";

const agentKey = generatePrivateKey();
const signer = new LocalDevSigner(agentKey);
const passingReport = runGates(passingGateInputs(), THRESHOLDS);
const failingReport = runGates(passingGateInputs({ testsPassed: false }), THRESHOLDS);

function params(overrides: Partial<Parameters<typeof authorizeRelease>[0]> = {}) {
  return {
    reader: new FakeReader(),
    signer,
    task: makeTask(),
    verdict: approvingVerdict(),
    gateReport: passingReport,
    ...overrides,
  };
}

describe("authorizeRelease policy", () => {
  it("signs a valid approval and the signature recovers to the agent address", async () => {
    const { digest, signature } = await authorizeRelease(params());
    const recovered = await recoverAddress({ hash: digest, signature });
    expect(recovered).toBe(privateKeyToAccount(agentKey).address);
  });

  it("refuses when deterministic gates failed, even with an approving LLM verdict", async () => {
    await expect(authorizeRelease(params({ gateReport: failingReport }))).rejects.toThrow(
      ReleasePolicyViolation,
    );
  });

  it("refuses non-approve verdicts", async () => {
    await expect(
      authorizeRelease(params({ verdict: approvingVerdict({ decision: "escalate" }) })),
    ).rejects.toThrow(ReleasePolicyViolation);
  });

  it("refuses when the evaluator flagged suspected injection", async () => {
    await expect(
      authorizeRelease(params({ verdict: approvingVerdict({ injectionSuspected: true }) })),
    ).rejects.toThrow(/injection/);
  });

  it("refuses low-confidence approvals", async () => {
    await expect(
      authorizeRelease(params({ verdict: approvingVerdict({ confidence: 0.5 }) })),
    ).rejects.toThrow(/confidence/);
  });

  it("refuses an approve verdict with an unsatisfied criterion", async () => {
    const verdict = approvingVerdict();
    verdict.criteria[0]!.satisfied = false;
    await expect(authorizeRelease(params({ verdict }))).rejects.toThrow(/criteria/);
  });

  it("refuses when the verdict is bound to a different commit", async () => {
    const verdict = approvingVerdict({ commitHash: `0x${"ab".repeat(32)}` });
    await expect(authorizeRelease(params({ verdict }))).rejects.toThrow(/commit/);
  });

  it("refuses when the milestone left InReview between evaluation and signing", async () => {
    const reader = new FakeReader();
    reader.milestone.state = MilestoneState.Disputed;
    await expect(authorizeRelease(params({ reader }))).rejects.toThrow(/InReview/);
  });

  it("refuses when the milestone was resubmitted (stale reviewNonce)", async () => {
    const reader = new FakeReader();
    reader.milestone.reviewNonce = 2;
    await expect(authorizeRelease(params({ reader }))).rejects.toThrow(/resubmitted/);
  });

  it("refuses when local and on-chain digests disagree", async () => {
    const reader = new FakeReader();
    reader.hashReleaseAuthorization = async () => `0x${"00".repeat(32)}`;
    await expect(authorizeRelease(params({ reader }))).rejects.toThrow(/digest/);
  });
});
