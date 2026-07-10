// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";

import {AegisEscrow} from "../src/AegisEscrow.sol";
import {IAegisEscrow} from "../src/interfaces/IAegisEscrow.sol";
import {Mock1271Wallet} from "./mocks/Mock1271Wallet.sol";
import {TestUSDC} from "./mocks/TestUSDC.sol";

/// @notice Shared harness: one funder EOA, one KMS-style agent EOA, and a
///         contributor modeled as an ERC-1271 smart wallet owned by an EOA key —
///         mirroring the production topology (funder EOA/Safe, Turnkey agent key,
///         ERC-7579 contributor account).
abstract contract AegisEscrowTestBase is Test {
    AegisEscrow internal escrow;
    TestUSDC internal usdc;

    uint256 internal funderKey;
    address internal funder;
    uint256 internal agentKey;
    address internal agent;
    uint256 internal contributorOwnerKey;
    address internal contributorOwner;
    Mock1271Wallet internal contributorWallet;

    uint128 internal constant M0_AMOUNT = 1_000e6;
    uint128 internal constant M1_AMOUNT = 2_500e6;
    uint128 internal constant M2_AMOUNT = 1_500e6;
    uint256 internal constant TOTAL = uint256(M0_AMOUNT) + M1_AMOUNT + M2_AMOUNT;
    uint40 internal constant DISPUTE_WINDOW = 7 days;
    bytes32 internal constant REPO_COMMITMENT = keccak256(abi.encode(uint256(123456789), "main"));
    bytes32 internal constant COMMIT_HASH = keccak256("commit:deadbeef");

    function setUp() public virtual {
        (funder, funderKey) = makeAddrAndKey("funder");
        (agent, agentKey) = makeAddrAndKey("agent");
        (contributorOwner, contributorOwnerKey) = makeAddrAndKey("contributorOwner");
        contributorWallet = new Mock1271Wallet(contributorOwner);

        escrow = new AegisEscrow();
        usdc = new TestUSDC();
        usdc.transfer(funder, TOTAL * 10);
        vm.deal(funder, 100 ether);
    }

    // ─────────────────────────── Escrow helpers ──────────────────────────

    function _milestoneInputs() internal view returns (IAegisEscrow.MilestoneInput[] memory inputs) {
        inputs = new IAegisEscrow.MilestoneInput[](3);
        inputs[0] = IAegisEscrow.MilestoneInput(M0_AMOUNT, uint40(block.timestamp + 30 days), keccak256("spec-0"));
        inputs[1] = IAegisEscrow.MilestoneInput(M1_AMOUNT, uint40(block.timestamp + 60 days), keccak256("spec-1"));
        inputs[2] = IAegisEscrow.MilestoneInput(M2_AMOUNT, uint40(block.timestamp + 90 days), keccak256("spec-2"));
    }

    function _createEscrow(address token) internal returns (uint256 escrowId) {
        vm.prank(funder);
        escrowId = escrow.createEscrow(
            address(contributorWallet), agent, token, DISPUTE_WINDOW, REPO_COMMITMENT, _milestoneInputs()
        );
    }

    function _createFundedEscrow() internal returns (uint256 escrowId) {
        escrowId = _createEscrow(address(usdc));
        vm.startPrank(funder);
        usdc.approve(address(escrow), TOTAL);
        escrow.fund(escrowId);
        vm.stopPrank();
    }

    function _submit(uint256 escrowId, uint256 milestoneId) internal {
        vm.prank(address(contributorWallet));
        escrow.submitMilestone(escrowId, milestoneId, COMMIT_HASH, "ipfs://artifact");
    }

    // ────────────────────────── Signature helpers ────────────────────────

    function _sign(uint256 pk, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    /// @dev 2-of-3 release: funder + agent, both plain ECDSA.
    function _approveWithFunderAndAgent(uint256 escrowId, uint256 milestoneId) internal {
        bytes32 digest = escrow.hashReleaseAuthorization(escrowId, milestoneId);
        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        signers[0] = funder;
        sigs[0] = _sign(funderKey, digest);
        signers[1] = agent;
        sigs[1] = _sign(agentKey, digest);
        escrow.approveMilestone(escrowId, milestoneId, signers, sigs);
    }

    /// @dev 2-of-3 release: agent (ECDSA) + contributor (ERC-1271 via owner key).
    function _approveWithAgentAndContributor(uint256 escrowId, uint256 milestoneId) internal {
        bytes32 digest = escrow.hashReleaseAuthorization(escrowId, milestoneId);
        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        signers[0] = agent;
        sigs[0] = _sign(agentKey, digest);
        signers[1] = address(contributorWallet);
        sigs[1] = _sign(contributorOwnerKey, digest);
        escrow.approveMilestone(escrowId, milestoneId, signers, sigs);
    }

    function _disputeSigs(uint256 escrowId, uint256 milestoneId, bool approved)
        internal
        view
        returns (bytes memory funderSig, bytes memory contributorSig)
    {
        bytes32 digest = escrow.hashDisputeResolution(escrowId, milestoneId, approved);
        funderSig = _sign(funderKey, digest);
        contributorSig = _sign(contributorOwnerKey, digest);
    }
}
