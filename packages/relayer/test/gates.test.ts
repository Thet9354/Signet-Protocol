import { describe, expect, it } from "vitest";

import { runGates } from "../src/evaluation/gates.js";
import { passingGateInputs, THRESHOLDS } from "./fakes.js";

describe("runGates", () => {
  it("passes when every check clears its threshold", () => {
    const report = runGates(passingGateInputs(), THRESHOLDS);
    expect(report.passed).toBe(true);
    expect(report.checks).toHaveLength(5);
  });

  it.each([
    ["failing tests", { testsPassed: false }, "tests"],
    ["low coverage", { coveragePct: 42 }, "coverage"],
    ["oversized diff", { changedLines: 100_000 }, "diff-size"],
    ["unknown author", { commitAuthorLogin: "attacker" }, "provenance"],
    ["lockfile tampering", { lockfileChanged: true }, "lockfile"],
  ])("fails on %s", (_label, override, failedCheck) => {
    const report = runGates(passingGateInputs(override), THRESHOLDS);
    expect(report.passed).toBe(false);
    expect(report.checks.find((c) => c.name === failedCheck)?.passed).toBe(false);
  });

  it("allows lockfile changes when the rubric permits them", () => {
    const report = runGates(passingGateInputs({ lockfileChanged: true }), {
      ...THRESHOLDS,
      allowLockfileChanges: true,
    });
    expect(report.passed).toBe(true);
  });
});
