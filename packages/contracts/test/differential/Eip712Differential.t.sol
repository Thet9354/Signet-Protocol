// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {AegisEscrow} from "../../src/AegisEscrow.sol";

/// @notice Differential test: the Solidity EIP-712 digest must byte-match what
///         viem's `hashTypedData` produces from packages/shared — i.e. what the
///         relayer asks the KMS to sign and what the frontend asks the passkey
///         to sign. A mismatch here means every off-chain signature would fail
///         on-chain verification.
/// @dev Requires ffi = true and `pnpm install` in packages/shared.
contract Eip712DifferentialTest is Test {
    AegisEscrow internal escrow;

    function setUp() public {
        escrow = new AegisEscrow();
    }

    function _viemDigest(
        uint256 escrowId,
        uint256 milestoneId,
        uint40 reviewNonce,
        bytes32 commitHash,
        uint256 amount,
        address recipient
    ) internal returns (bytes32) {
        string[] memory cmd = new string[](10);
        cmd[0] = "node";
        cmd[1] = string.concat(vm.projectRoot(), "/../shared/scripts/hash-release-auth.mjs");
        cmd[2] = vm.toString(block.chainid);
        cmd[3] = vm.toString(address(escrow));
        cmd[4] = vm.toString(escrowId);
        cmd[5] = vm.toString(milestoneId);
        cmd[6] = vm.toString(uint256(reviewNonce));
        cmd[7] = vm.toString(commitHash);
        cmd[8] = vm.toString(amount);
        cmd[9] = vm.toString(recipient);

        bytes memory out = vm.ffi(cmd);
        assertEq(out.length, 32, "ffi oracle returned malformed digest");
        return bytes32(out);
    }

    function test_digest_matchesViem_fixedVectors() public {
        bytes32 solDigest = escrow.computeReleaseDigest(
            0, 0, 1, keccak256("commit:deadbeef"), 1_000e6, 0x1111111111111111111111111111111111111111
        );
        bytes32 viemDigest =
            _viemDigest(0, 0, 1, keccak256("commit:deadbeef"), 1_000e6, 0x1111111111111111111111111111111111111111);
        assertEq(solDigest, viemDigest);
    }

    function test_digest_matchesViem_boundaryValues() public {
        bytes32 solDigest = escrow.computeReleaseDigest(
            type(uint256).max,
            type(uint256).max,
            type(uint40).max,
            bytes32(type(uint256).max),
            type(uint128).max,
            0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF
        );
        bytes32 viemDigest = _viemDigest(
            type(uint256).max,
            type(uint256).max,
            type(uint40).max,
            bytes32(type(uint256).max),
            type(uint128).max,
            0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF
        );
        assertEq(solDigest, viemDigest);
    }

    /// @dev A handful of fuzzed vectors (kept low: each run shells out to node).
    /// forge-config: default.fuzz.runs = 12
    function testFuzz_digest_matchesViem(
        uint256 escrowId,
        uint256 milestoneId,
        uint40 reviewNonce,
        bytes32 commitHash,
        uint128 amount,
        address recipient
    ) public {
        vm.assume(recipient != address(0));
        bytes32 solDigest =
            escrow.computeReleaseDigest(escrowId, milestoneId, reviewNonce, commitHash, amount, recipient);
        bytes32 viemDigest = _viemDigest(escrowId, milestoneId, reviewNonce, commitHash, amount, recipient);
        assertEq(solDigest, viemDigest);
    }
}
