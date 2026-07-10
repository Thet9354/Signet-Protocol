/**
 * Deterministic gates — the non-LLM floor of milestone verification.
 *
 * These run BEFORE the model and the model can never override them upward:
 * a failed gate is a rejection regardless of what the LLM concludes. This is
 * the primary defense against prompt-injection in contributor code — injected
 * instructions can at worst talk the LLM out of an approval, never into one
 * that the deterministic checks wouldn't grant.
 */

export interface GateInputs {
  /** Full test suite ran and exited 0 in the sandbox. */
  testsPassed: boolean;
  /** Line coverage percentage reported by the sandboxed run. */
  coveragePct: number;
  /** Total changed lines in the submission diff. */
  changedLines: number;
  /** GitHub login of the commit author. */
  commitAuthorLogin: string;
  /** Whether dependency lockfiles were modified. */
  lockfileChanged: boolean;
}

export interface GateThresholds {
  minCoveragePct: number;
  maxChangedLines: number;
  /** GitHub logins registered for this escrow's contributor. */
  allowedAuthorLogins: string[];
  allowLockfileChanges: boolean;
}

export interface GateCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface GateReport {
  passed: boolean;
  checks: GateCheck[];
}

export function runGates(inputs: GateInputs, thresholds: GateThresholds): GateReport {
  const checks: GateCheck[] = [
    {
      name: "tests",
      passed: inputs.testsPassed,
      detail: inputs.testsPassed ? "test suite passed" : "test suite failed or did not run",
    },
    {
      name: "coverage",
      passed: inputs.coveragePct >= thresholds.minCoveragePct,
      detail: `coverage ${inputs.coveragePct.toFixed(1)}% (minimum ${thresholds.minCoveragePct}%)`,
    },
    {
      name: "diff-size",
      passed: inputs.changedLines <= thresholds.maxChangedLines,
      detail: `${inputs.changedLines} changed lines (maximum ${thresholds.maxChangedLines})`,
    },
    {
      name: "provenance",
      passed: thresholds.allowedAuthorLogins.includes(inputs.commitAuthorLogin),
      detail: `commit author "${inputs.commitAuthorLogin}"`,
    },
    {
      name: "lockfile",
      passed: thresholds.allowLockfileChanges || !inputs.lockfileChanged,
      detail: inputs.lockfileChanged ? "lockfile modified" : "lockfile unchanged",
    },
  ];
  return { passed: checks.every((c) => c.passed), checks };
}
