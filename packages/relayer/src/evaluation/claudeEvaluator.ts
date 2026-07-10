/**
 * Claude-backed evaluator using structured outputs: the response is
 * constrained to VerdictSchema server-side and validated again client-side.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import type { EvaluationInput, Evaluator } from "../types.js";
import { buildEvaluationPrompt, EVALUATOR_SYSTEM_PROMPT } from "./prompt.js";
import { VerdictSchema, type Verdict } from "./schema.js";

export class ClaudeEvaluator implements Evaluator {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(options: { model?: string; client?: Anthropic } = {}) {
    this.client = options.client ?? new Anthropic();
    this.model = options.model ?? "claude-sonnet-5";
  }

  async evaluate(input: EvaluationInput): Promise<Verdict> {
    const response = await this.client.messages.parse({
      model: this.model,
      max_tokens: 16000,
      system: EVALUATOR_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildEvaluationPrompt(input) }],
      output_config: { format: zodOutputFormat(VerdictSchema) },
    });

    if (response.stop_reason === "refusal") {
      // Model declined to evaluate — surface as a human-review case, never an approval.
      return {
        decision: "escalate",
        commitHash: input.commitHash,
        criteria: [{ criterion: "evaluation", satisfied: false, evidence: "model refused to evaluate" }],
        reasoning: "Evaluator refused the request; human review required.",
        confidence: 0,
        injectionSuspected: true,
      };
    }

    const verdict = response.parsed_output;
    if (!verdict) {
      throw new Error("Evaluator returned unparseable output");
    }
    // Belt-and-suspenders: re-validate before anything downstream consumes it.
    return VerdictSchema.parse(verdict);
  }
}
