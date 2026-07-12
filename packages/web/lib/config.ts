import { baseSepolia, foundry } from "viem/chains";
import type { Address, Chain } from "viem";

const CHAINS: Record<string, Chain> = {
  [String(foundry.id)]: foundry,
  [String(baseSepolia.id)]: baseSepolia,
};

const chainId = process.env.NEXT_PUBLIC_CHAIN_ID ?? String(foundry.id);

export const appConfig = {
  chain: CHAINS[chainId] ?? foundry,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545",
  escrowAddress: (process.env.NEXT_PUBLIC_ESCROW_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as Address,
  /** Block the escrow was deployed at — event scans start here (0 for local anvil). */
  startBlock: BigInt(process.env.NEXT_PUBLIC_START_BLOCK ?? "0"),
  /** Pimlico bundler + verifying paymaster; unset = local dev without sponsorship. */
  pimlicoApiKey: process.env.NEXT_PUBLIC_PIMLICO_API_KEY,
} as const;

export function pimlicoRpcUrl(): string {
  if (!appConfig.pimlicoApiKey) {
    throw new Error("NEXT_PUBLIC_PIMLICO_API_KEY is not set — gasless mode unavailable");
  }
  return `https://api.pimlico.io/v2/${appConfig.chain.id}/rpc?apikey=${appConfig.pimlicoApiKey}`;
}
