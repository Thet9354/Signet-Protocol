import { generatePrivateKey } from "viem/accounts";
import { describe, expect, it } from "vitest";

import { verifyMilestone, type PipelineDeps } from "../src/pipeline/verifyMilestone.js";
import { LocalDevSigner } from "../src/signing/signer.js";
import { MemoryVerificationStore } from "../src/store/memoryStore.js";
import { MilestoneState, type Evaluator } from "../src/types.js";
import {
  approvingVerdict,
  FakeReader,
  fakeRepoProvider,
  fakeRubricProvider,
  makeTask,
  passingGateInputs,
  THRESHOLDS,
} from "./fakes.js";

function evaluatorReturning(verdict = approvingVerdict()): Evaluator & { calls: number } {
  const stub = {
    calls: 0,
    async evaluate() {
      stub.calls += 1;
      return verdict;
    },
  };
  return stub;
}

function deps(overrides: Partial<PipelineDeps> = {}): PipelineDeps {
  return {
    reader: new FakeReader(),
    repoProvider: fakeRepoProvider(passingGateInputs()),
    rubricProvider: fakeRubricProvider,
    evaluator: evaluatorReturning(),
    signer: new LocalDevSigner(generatePrivateKey()),
    store: new MemoryVerificationStore(),
    thresholds: THRESHOLDS,
    ...overrides,
  };
}

describe("verifyMilestone pipeline", () => {
  it("approves and signs a passing submission", async () => {
    const record = await verifyMilestone(deps(), makeTask());
    expect(record.outcome).toBe("approved");
    expect(record.signature).toMatch(/^0x[0-9a-f]{130}$/);
    expect(record.digest).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("is idempotent per review round", async () => {
    const d = deps();
    const first = await verifyMilestone(d, makeTask());
    const second = await verifyMilestone(d, makeTask());
    expect(second).toBe(first);
    expect((d.evaluator as ReturnType<typeof evaluatorReturning>).calls).toBe(1);
  });

  it("skips stale tasks after a resubmission", async () => {
    const reader = new FakeReader();
    reader.milestone.reviewNonce = 2; // task carries nonce 1
    const record = await verifyMilestone(deps({ reader }), makeTask());
    expect(record.outcome).toBe("skipped");
  });

  it("skips when the milestone is not InReview", async () => {
    const reader = new FakeReader();
    reader.milestone.state = MilestoneState.Pending;
    const record = await verifyMilestone(deps({ reader }), makeTask());
    expect(record.outcome).toBe("skipped");
  });

  it("escalates when the rubric does not match the on-chain specHash", async () => {
    const record = await verifyMilestone(
      deps({ rubricProvider: { fetch: async () => "tampered rubric" } }),
      makeTask(),
    );
    expect(record.outcome).toBe("escalated");
    expect(record.reason).toMatch(/specHash/);
  });

  it("rejects on gate failure without calling the LLM", async () => {
    const evaluator = evaluatorReturning();
    const record = await verifyMilestone(
      deps({ evaluator, repoProvider: fakeRepoProvider(passingGateInputs({ testsPassed: false })) }),
      makeTask(),
    );
    expect(record.outcome).toBe("rejected");
    expect(record.signature).toBeUndefined();
    expect(evaluator.calls).toBe(0);
  });

  it("records reject verdicts without a signature", async () => {
    const record = await verifyMilestone(
      deps({ evaluator: evaluatorReturning(approvingVerdict({ decision: "reject" })) }),
      makeTask(),
    );
    expect(record.outcome).toBe("rejected");
    expect(record.signature).toBeUndefined();
  });

  it("escalates policy violations instead of signing (e.g. injection flag)", async () => {
    const record = await verifyMilestone(
      deps({ evaluator: evaluatorReturning(approvingVerdict({ injectionSuspected: true })) }),
      makeTask(),
    );
    expect(record.outcome).toBe("escalated");
    expect(record.reason).toMatch(/policy violation/);
    expect(record.signature).toBeUndefined();
  });
});
