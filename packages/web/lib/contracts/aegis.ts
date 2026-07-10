/** Chain-read helpers and display mappings for AegisEscrow. */
import { createPublicClient, formatUnits, http, type Address, type PublicClient } from "viem";

import { aegisEscrowAbi } from "@aegis/shared/abi";
import { appConfig } from "../config";

export { aegisEscrowAbi };

export const ESCROW_STATE_LABELS = ["None", "Created", "Funded", "Completed", "Cancelled"] as const;
export const MILESTONE_STATE_LABELS = [
  "Pending",
  "In review",
  "Approved",
  "Disputed",
  "Rejected",
  "Refunded",
] as const;

export const MILESTONE_STATE_STYLES: Record<string, string> = {
  Pending: "bg-zinc-800 text-zinc-300",
  "In review": "bg-amber-950 text-amber-300",
  Approved: "bg-emerald-950 text-emerald-300",
  Disputed: "bg-red-950 text-red-300",
  Rejected: "bg-orange-950 text-orange-300",
  Refunded: "bg-sky-950 text-sky-300",
};

export function publicClient(): PublicClient {
  return createPublicClient({ chain: appConfig.chain, transport: http(appConfig.rpcUrl) });
}

/** Escrow ids come from EscrowCreated logs — the contract keeps no public counter. */
export async function fetchEscrowIds(client: PublicClient, escrow: Address): Promise<bigint[]> {
  const logs = await client.getContractEvents({
    address: escrow,
    abi: aegisEscrowAbi,
    eventName: "EscrowCreated",
    fromBlock: 0n,
  });
  return logs
    .map((log) => log.args.escrowId)
    .filter((id): id is bigint => id !== undefined)
    .sort((a, b) => (a < b ? -1 : 1));
}

/** ETH escrows use 18 decimals; ERC-20 escrows are assumed USDC-style 6. */
export function formatAmount(amount: bigint, token: Address): string {
  const isNative = token === "0x0000000000000000000000000000000000000000";
  const value = formatUnits(amount, isNative ? 18 : 6);
  return `${value} ${isNative ? "ETH" : "USDC"}`;
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
