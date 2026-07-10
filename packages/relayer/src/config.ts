import { z } from "zod";

const hex = z.string().regex(/^0x[0-9a-fA-F]+$/);

export const ConfigSchema = z.object({
  RPC_URL: z.string().url(),
  CHAIN_ID: z.coerce.number().int().positive(),
  ESCROW_ADDRESS: hex.length(42),
  /** Dev-only. Production uses a Turnkey/KMS signer — no key material in env. */
  AGENT_DEV_PRIVATE_KEY: hex.length(66).optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  EVALUATION_MODEL: z.string().default("claude-sonnet-5"),
  GITHUB_WEBHOOK_SECRET: z.string().min(16).optional(),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
});

export type RelayerConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RelayerConfig {
  return ConfigSchema.parse(env);
}
