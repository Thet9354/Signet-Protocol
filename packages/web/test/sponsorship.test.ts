import { encodeFunctionData, type Address } from "viem";
import { describe, expect, it } from "vitest";

import { aegisEscrowAbi } from "@aegis/shared/abi";
import { assertSponsorable, isSponsorableCall, SPONSORED_SELECTORS } from "../lib/aa/sponsorship";

const ESCROW: Address = "0x00000000000000000000000000000000000a3915";
const OTHER: Address = "0x1111111111111111111111111111111111111111";

const submitData = encodeFunctionData({
  abi: aegisEscrowAbi,
  functionName: "submitMilestone",
  args: [0n, 0n, `0x${"ab".repeat(32)}`, "ipfs://x"],
});
const fundData = encodeFunctionData({
  abi: aegisEscrowAbi,
  functionName: "fund",
  args: [0n],
});

describe("sponsorship policy", () => {
  it("derives four sponsored selectors", () => {
    expect(SPONSORED_SELECTORS).toHaveLength(4);
    expect(new Set(SPONSORED_SELECTORS).size).toBe(4);
  });

  it("sponsors participant actions on the escrow contract", () => {
    expect(isSponsorableCall({ to: ESCROW, data: submitData }, ESCROW)).toBe(true);
  });

  it("refuses the same selector on a different target (paymaster-drain vector)", () => {
    expect(isSponsorableCall({ to: OTHER, data: submitData }, ESCROW)).toBe(false);
  });

  it("refuses non-allowlisted selectors — funding is never sponsored", () => {
    expect(isSponsorableCall({ to: ESCROW, data: fundData }, ESCROW)).toBe(false);
  });

  it("refuses value transfers and bare calls", () => {
    expect(isSponsorableCall({ to: ESCROW, data: submitData, value: 1n }, ESCROW)).toBe(false);
    expect(isSponsorableCall({ to: ESCROW }, ESCROW)).toBe(false);
    expect(isSponsorableCall({ to: ESCROW, data: "0x" }, ESCROW)).toBe(false);
  });

  it("assertSponsorable rejects a batch containing one bad call", () => {
    expect(() =>
      assertSponsorable(
        [
          { to: ESCROW, data: submitData },
          { to: ESCROW, data: fundData },
        ],
        ESCROW,
      ),
    ).toThrow(/sponsorship policy/);
  });
});
