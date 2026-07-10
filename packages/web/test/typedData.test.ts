/**
 * The web co-sign flow signs typed data (wallets can't sign raw digests).
 * This locks in that viem's hashTypedData over the exact payload the UI sends
 * to wallets equals the shared canonical digest — i.e. what the contract
 * verifies and what the relayer's KMS signs.
 */
import { hashTypedData, keccak256, toBytes } from "viem";
import { describe, expect, it } from "vitest";

import { aegisDomain, aegisTypes, hashReleaseAuthorization } from "@aegis/shared";

describe("co-sign typed data", () => {
  it("UI typed-data payload hashes to the canonical release digest", () => {
    const chainId = 84532; // Base Sepolia
    const escrow = "0x00000000000000000000000000000000000a3915" as const;
    const message = {
      escrowId: 3n,
      milestoneId: 1n,
      reviewNonce: 2,
      commitHash: keccak256(toBytes("commit:ui")),
      amount: 2_500_000_000n,
      recipient: "0x1111111111111111111111111111111111111111" as const,
    };

    const uiDigest = hashTypedData({
      domain: aegisDomain(chainId, escrow),
      types: aegisTypes,
      primaryType: "ReleaseAuthorization",
      message,
    });

    expect(uiDigest).toBe(hashReleaseAuthorization(chainId, escrow, message));
  });
});
