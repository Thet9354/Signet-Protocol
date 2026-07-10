/**
 * Canonical EIP-712 domain and types for Aegis Protocol.
 *
 * Single source of truth for every off-chain signer (relayer KMS flow,
 * frontend passkey flow) — mirrors ReleaseAuthLib.sol. Any change here MUST
 * be mirrored in packages/contracts/src/libraries/ReleaseAuthLib.sol and is
 * guarded by test/differential/Eip712Differential.t.sol.
 */
import type { Address, Hex, TypedDataDomain } from "viem";
import { hashTypedData } from "viem";

export const AEGIS_DOMAIN_NAME = "AegisEscrow";
export const AEGIS_DOMAIN_VERSION = "1";

export function aegisDomain(chainId: number, verifyingContract: Address): TypedDataDomain {
  return {
    name: AEGIS_DOMAIN_NAME,
    version: AEGIS_DOMAIN_VERSION,
    chainId,
    verifyingContract,
  };
}

export const aegisTypes = {
  ReleaseAuthorization: [
    { name: "escrowId", type: "uint256" },
    { name: "milestoneId", type: "uint256" },
    { name: "reviewNonce", type: "uint40" },
    { name: "commitHash", type: "bytes32" },
    { name: "amount", type: "uint256" },
    { name: "recipient", type: "address" },
  ],
  DisputeResolution: [
    { name: "escrowId", type: "uint256" },
    { name: "milestoneId", type: "uint256" },
    { name: "reviewNonce", type: "uint40" },
    { name: "approved", type: "bool" },
  ],
  CancelAuthorization: [
    { name: "escrowId", type: "uint256" },
    { name: "sigDeadline", type: "uint256" },
  ],
} as const;

export interface ReleaseAuthorization {
  escrowId: bigint;
  milestoneId: bigint;
  reviewNonce: number;
  commitHash: Hex;
  amount: bigint;
  recipient: Address;
}

export function hashReleaseAuthorization(
  chainId: number,
  verifyingContract: Address,
  message: ReleaseAuthorization,
): Hex {
  return hashTypedData({
    domain: aegisDomain(chainId, verifyingContract),
    types: aegisTypes,
    primaryType: "ReleaseAuthorization",
    message,
  });
}
