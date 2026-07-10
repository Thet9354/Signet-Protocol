// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AegisEscrowTestBase} from "../AegisEscrowTestBase.sol";
import {AegisEscrow} from "../../src/AegisEscrow.sol";
import {IAegisEscrow} from "../../src/interfaces/IAegisEscrow.sol";
import {
    MutableOwner1271Wallet,
    ReentrantToken,
    RevertingReceiver,
    WrongMagic1271Wallet
} from "../mocks/AdversarialMocks.sol";

/// @notice Adversarial matrix: every test models a concrete attacker with a
///         concrete capability and asserts the exact failure mode.
contract AdversarialTest is AegisEscrowTestBase {
    // ── Replay: signatures must be useless anywhere but their exact context ──

    /// Attacker capability: valid 2-of-3 signatures for escrow A, identical
    /// terms on escrow B. Digest binds escrowId → replay fails.
    function test_replay_acrossEscrows() public {
        uint256 idA = _createFundedEscrow();
        uint256 idB = _createFundedEscrow();
        _submit(idA, 0);
        _submit(idB, 0);

        bytes32 digestA = escrow.hashReleaseAuthorization(idA, 0);
        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        signers[0] = funder;
        sigs[0] = _sign(funderKey, digestA);
        signers[1] = agent;
        sigs[1] = _sign(agentKey, digestA);

        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.InvalidSignature.selector, funder));
        escrow.approveMilestone(idB, 0, signers, sigs);
    }

    /// Attacker capability: valid signatures for the same escrowId on a second
    /// AegisEscrow deployment. Domain separator binds verifyingContract.
    function test_replay_acrossContracts() public {
        uint256 id = _createFundedEscrow();
        _submit(id, 0);
        bytes32 digest = escrow.hashReleaseAuthorization(id, 0);
        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        signers[0] = funder;
        sigs[0] = _sign(funderKey, digest);
        signers[1] = agent;
        sigs[1] = _sign(agentKey, digest);

        // Same parties, same terms, different contract instance.
        AegisEscrow second = new AegisEscrow();
        vm.startPrank(funder);
        uint256 id2 = second.createEscrow(
            address(contributorWallet), agent, address(usdc), DISPUTE_WINDOW, REPO_COMMITMENT, _milestoneInputs()
        );
        usdc.approve(address(second), TOTAL);
        second.fund(id2);
        vm.stopPrank();
        vm.prank(address(contributorWallet));
        second.submitMilestone(id2, 0, COMMIT_HASH, "ipfs://artifact");

        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.InvalidSignature.selector, funder));
        second.approveMilestone(id2, 0, signers, sigs);
    }

    // ── ERC-1271 edge cases ──────────────────────────────────────────────

    /// Attacker capability: contributor account rotates its owner key after a
    /// co-signature was collected. 1271 validity is checked at EXECUTION time,
    /// so the stale owner's signature no longer authorizes anything.
    function test_1271_ownerSwapInvalidatesCollectedSignature() public {
        MutableOwner1271Wallet wallet = new MutableOwner1271Wallet(contributorOwner);
        vm.prank(funder);
        uint256 id = escrow.createEscrow(
            address(wallet), agent, address(usdc), DISPUTE_WINDOW, REPO_COMMITMENT, _milestoneInputs()
        );
        vm.startPrank(funder);
        usdc.approve(address(escrow), TOTAL);
        escrow.fund(id);
        vm.stopPrank();
        vm.prank(address(wallet));
        escrow.submitMilestone(id, 0, COMMIT_HASH, "");

        bytes32 digest = escrow.hashReleaseAuthorization(id, 0);
        bytes memory contributorSig = _sign(contributorOwnerKey, digest);

        wallet.setOwner(makeAddr("newOwner"));

        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        signers[0] = agent;
        sigs[0] = _sign(agentKey, digest);
        signers[1] = address(wallet);
        sigs[1] = contributorSig;

        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.InvalidSignature.selector, address(wallet)));
        escrow.approveMilestone(id, 0, signers, sigs);
    }

    /// Attacker capability: a malicious contributor wallet that "approves"
    /// everything but with a non-standard magic value. Strict 1271 matching
    /// rejects it.
    function test_1271_wrongMagicValueRejected() public {
        WrongMagic1271Wallet wallet = new WrongMagic1271Wallet();
        vm.prank(funder);
        uint256 id = escrow.createEscrow(
            address(wallet), agent, address(usdc), DISPUTE_WINDOW, REPO_COMMITMENT, _milestoneInputs()
        );
        vm.startPrank(funder);
        usdc.approve(address(escrow), TOTAL);
        escrow.fund(id);
        vm.stopPrank();
        vm.prank(address(wallet));
        escrow.submitMilestone(id, 0, COMMIT_HASH, "");

        bytes32 digest = escrow.hashReleaseAuthorization(id, 0);
        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        signers[0] = agent;
        sigs[0] = _sign(agentKey, digest);
        signers[1] = address(wallet);
        sigs[1] = hex"deadbeef";

        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.InvalidSignature.selector, address(wallet)));
        escrow.approveMilestone(id, 0, signers, sigs);
    }

    // ── Reentrancy ───────────────────────────────────────────────────────

    /// Attacker capability: a malicious funding token whose transfer hook
    /// re-enters approveMilestone during the payout. Two independent defenses
    /// (state set before interaction + transient reentrancy guard) make the
    /// inner call fail; exactly one payout happens.
    function test_reentrantToken_cannotDoublePay() public {
        ReentrantToken evil = new ReentrantToken();
        evil.transfer(funder, TOTAL);

        vm.prank(funder);
        uint256 id = escrow.createEscrow(
            address(contributorWallet), agent, address(evil), DISPUTE_WINDOW, REPO_COMMITMENT, _milestoneInputs()
        );
        vm.startPrank(funder);
        evil.approve(address(escrow), TOTAL);
        escrow.fund(id);
        vm.stopPrank();
        _submit(id, 0);

        bytes32 digest = escrow.hashReleaseAuthorization(id, 0);
        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        signers[0] = funder;
        sigs[0] = _sign(funderKey, digest);
        signers[1] = agent;
        sigs[1] = _sign(agentKey, digest);

        evil.arm(escrow, abi.encodeCall(escrow.approveMilestone, (id, 0, signers, sigs)));

        escrow.approveMilestone(id, 0, signers, sigs);

        assertTrue(evil.attackAttempted(), "reentry hook did not fire");
        assertFalse(evil.attackSucceeded(), "reentrant approveMilestone must fail");
        assertEq(evil.balanceOf(address(contributorWallet)), M0_AMOUNT, "must pay exactly once");
    }

    // ── Payout edge cases ────────────────────────────────────────────────

    /// A contributor address that reverts on ETH receipt makes the release
    /// revert loudly (NativeTransferFailed) rather than mark the milestone
    /// paid — funds stay recoverable via dispute/reclaim paths.
    function test_ethPayout_toRevertingReceiverFailsLoudly() public {
        RevertingReceiver receiver = new RevertingReceiver();
        vm.prank(funder);
        uint256 id = escrow.createEscrow(
            address(receiver), agent, address(0), DISPUTE_WINDOW, REPO_COMMITMENT, _milestoneInputs()
        );
        vm.prank(funder);
        escrow.fund{value: TOTAL}(id);
        vm.prank(address(receiver));
        escrow.submitMilestone(id, 0, COMMIT_HASH, "");

        // Contract recipients can't ECDSA-sign; use funder+agent (2-of-3
        // without the contributor).
        bytes32 digest = escrow.hashReleaseAuthorization(id, 0);
        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        signers[0] = funder;
        sigs[0] = _sign(funderKey, digest);
        signers[1] = agent;
        sigs[1] = _sign(agentKey, digest);

        vm.expectRevert(IAegisEscrow.NativeTransferFailed.selector);
        escrow.approveMilestone(id, 0, signers, sigs);

        // Not marked paid — recoverable.
        assertEq(uint8(escrow.getMilestone(id, 0).state), uint8(IAegisEscrow.MilestoneState.InReview));
    }
}
