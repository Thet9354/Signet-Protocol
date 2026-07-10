/**
 * Selector-scoped sponsorship policy.
 *
 * The paymaster should never blanket-sponsor arbitrary calls — that is how
 * sponsorship budgets get drained. This mirrors the server-side policy
 * configured on the Pimlico dashboard and is enforced client-side before a
 * sponsorship request is even made: only AegisEscrow participant actions
 * qualify.
 */
import { toFunctionSelector, type Address, type Hex } from "viem";

export const SPONSORED_SIGNATURES = [
  "function submitMilestone(uint256,uint256,bytes32,string)",
  "function approveMilestone(uint256,uint256,address[],bytes[])",
  "function raiseDispute(uint256,uint256)",
  "function resolveDispute(uint256,uint256,bool,bytes,bytes)",
] as const;

export const SPONSORED_SELECTORS: readonly Hex[] = SPONSORED_SIGNATURES.map((sig) =>
  toFunctionSelector(sig),
);

export interface Call {
  to: Address;
  data?: Hex;
  value?: bigint;
}

export function isSponsorableCall(call: Call, escrowAddress: Address): boolean {
  if (call.to.toLowerCase() !== escrowAddress.toLowerCase()) return false;
  if (call.value && call.value > 0n) return false;
  if (!call.data || call.data.length < 10) return false;
  const selector = call.data.slice(0, 10).toLowerCase() as Hex;
  return SPONSORED_SELECTORS.some((s) => s.toLowerCase() === selector);
}

export function assertSponsorable(calls: Call[], escrowAddress: Address): void {
  for (const call of calls) {
    if (!isSponsorableCall(call, escrowAddress)) {
      throw new Error(
        `Call to ${call.to} with selector ${call.data?.slice(0, 10) ?? "0x"} is outside the sponsorship policy`,
      );
    }
  }
}
