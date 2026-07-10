// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AegisEscrowTestBase} from "../AegisEscrowTestBase.sol";
import {IAegisEscrow} from "../../src/interfaces/IAegisEscrow.sol";

contract DisputeTest is AegisEscrowTestBase {
    function _disputedMilestone() internal returns (uint256 id) {
        id = _createFundedEscrow();
        _submit(id, 0);
        vm.prank(funder);
        escrow.raiseDispute(id, 0);
    }

    function test_raiseDispute_byEitherHumanParty() public {
        uint256 id = _createFundedEscrow();
        _submit(id, 0);
        vm.prank(address(contributorWallet));
        escrow.raiseDispute(id, 0);
        assertEq(uint8(escrow.getMilestone(id, 0).state), uint8(IAegisEscrow.MilestoneState.Disputed));
    }

    function test_raiseDispute_revert_agentCannotDispute() public {
        uint256 id = _createFundedEscrow();
        _submit(id, 0);
        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.UnauthorizedCaller.selector, agent));
        vm.prank(agent);
        escrow.raiseDispute(id, 0);
    }

    function test_raiseDispute_revert_notInReview() public {
        uint256 id = _createFundedEscrow();
        vm.expectRevert(
            abi.encodeWithSelector(IAegisEscrow.InvalidMilestoneState.selector, IAegisEscrow.MilestoneState.Pending)
        );
        vm.prank(funder);
        escrow.raiseDispute(id, 0);
    }

    function test_resolveDispute_approved_paysContributor() public {
        uint256 id = _disputedMilestone();
        (bytes memory fSig, bytes memory cSig) = _disputeSigs(id, 0, true);

        escrow.resolveDispute(id, 0, true, fSig, cSig);

        assertEq(uint8(escrow.getMilestone(id, 0).state), uint8(IAegisEscrow.MilestoneState.Approved));
        assertEq(usdc.balanceOf(address(contributorWallet)), M0_AMOUNT);
    }

    function test_resolveDispute_rejected_allowsResubmission() public {
        uint256 id = _disputedMilestone();
        (bytes memory fSig, bytes memory cSig) = _disputeSigs(id, 0, false);

        escrow.resolveDispute(id, 0, false, fSig, cSig);
        assertEq(uint8(escrow.getMilestone(id, 0).state), uint8(IAegisEscrow.MilestoneState.Rejected));
        assertEq(usdc.balanceOf(address(contributorWallet)), 0);
    }

    function test_resolveDispute_revert_verdictSwap() public {
        // Signatures over "rejected" must not authorize an "approved" resolution.
        uint256 id = _disputedMilestone();
        (bytes memory fSig, bytes memory cSig) = _disputeSigs(id, 0, false);

        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.InvalidSignature.selector, funder));
        escrow.resolveDispute(id, 0, true, fSig, cSig);
    }

    function test_resolveDispute_revert_missingContributorConsent() public {
        uint256 id = _disputedMilestone();
        bytes32 digest = escrow.hashDisputeResolution(id, 0, true);
        bytes memory fSig = _sign(funderKey, digest);
        bytes memory notContributor = _sign(agentKey, digest);

        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.InvalidSignature.selector, address(contributorWallet)));
        escrow.resolveDispute(id, 0, true, fSig, notContributor);
    }

    function test_resolveDispute_revert_replay() public {
        uint256 id = _disputedMilestone();
        (bytes memory fSig, bytes memory cSig) = _disputeSigs(id, 0, true);
        escrow.resolveDispute(id, 0, true, fSig, cSig);

        vm.expectRevert(
            abi.encodeWithSelector(IAegisEscrow.InvalidMilestoneState.selector, IAegisEscrow.MilestoneState.Approved)
        );
        escrow.resolveDispute(id, 0, true, fSig, cSig);
    }

    // ────────────────────────── reclaimExpired ───────────────────────────

    function test_reclaimExpired_afterDeadlinePlusGrace() public {
        uint256 id = _createFundedEscrow();
        IAegisEscrow.Milestone memory ms = escrow.getMilestone(id, 0);
        vm.warp(uint256(ms.deadline) + DISPUTE_WINDOW + 1);

        uint256 funderBefore = usdc.balanceOf(funder);
        vm.prank(funder);
        escrow.reclaimExpired(id, 0);

        assertEq(uint8(escrow.getMilestone(id, 0).state), uint8(IAegisEscrow.MilestoneState.Refunded));
        assertEq(usdc.balanceOf(funder), funderBefore + M0_AMOUNT);
    }

    function test_reclaimExpired_revert_beforeGraceElapsed() public {
        uint256 id = _createFundedEscrow();
        IAegisEscrow.Milestone memory ms = escrow.getMilestone(id, 0);
        uint256 reclaimableAt = uint256(ms.deadline) + DISPUTE_WINDOW;
        vm.warp(reclaimableAt); // boundary: strictly-greater required

        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.DeadlineNotElapsed.selector, reclaimableAt));
        vm.prank(funder);
        escrow.reclaimExpired(id, 0);
    }

    function test_reclaimExpired_revert_notFunder() public {
        uint256 id = _createFundedEscrow();
        vm.warp(block.timestamp + 365 days);
        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.UnauthorizedCaller.selector, address(contributorWallet)));
        vm.prank(address(contributorWallet));
        escrow.reclaimExpired(id, 0);
    }

    function test_reclaimExpired_revert_alreadyApproved() public {
        uint256 id = _createFundedEscrow();
        _submit(id, 0);
        _approveWithFunderAndAgent(id, 0);
        vm.warp(block.timestamp + 365 days);

        vm.expectRevert(
            abi.encodeWithSelector(IAegisEscrow.InvalidMilestoneState.selector, IAegisEscrow.MilestoneState.Approved)
        );
        vm.prank(funder);
        escrow.reclaimExpired(id, 0);
    }

    function test_reclaimAll_completesEscrow() public {
        uint256 id = _createFundedEscrow();
        vm.warp(block.timestamp + 365 days);
        vm.startPrank(funder);
        for (uint256 i; i < 3; ++i) {
            escrow.reclaimExpired(id, i);
        }
        vm.stopPrank();
        assertEq(uint8(escrow.getEscrow(id).state), uint8(IAegisEscrow.EscrowState.Completed));
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    // ─────────────────────── cancelByMutualConsent ───────────────────────

    function test_cancelByMutualConsent_refundsUnreleased() public {
        uint256 id = _createFundedEscrow();
        _submit(id, 0);
        _approveWithFunderAndAgent(id, 0); // milestone 0 already paid out

        uint256 sigDeadline = block.timestamp + 1 hours;
        bytes32 digest = escrow.hashCancelAuthorization(id, sigDeadline);
        bytes memory fSig = _sign(funderKey, digest);
        bytes memory cSig = _sign(contributorOwnerKey, digest);

        uint256 funderBefore = usdc.balanceOf(funder);
        escrow.cancelByMutualConsent(id, sigDeadline, fSig, cSig);

        assertEq(uint8(escrow.getEscrow(id).state), uint8(IAegisEscrow.EscrowState.Cancelled));
        assertEq(usdc.balanceOf(funder), funderBefore + M1_AMOUNT + M2_AMOUNT);
        assertEq(usdc.balanceOf(address(contributorWallet)), M0_AMOUNT); // keeps earned payout
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    function test_cancelByMutualConsent_revert_expiredSignature() public {
        uint256 id = _createFundedEscrow();
        uint256 sigDeadline = block.timestamp - 1;
        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.SignatureExpired.selector, sigDeadline));
        escrow.cancelByMutualConsent(id, sigDeadline, "", "");
    }

    function test_cancelByMutualConsent_revert_withoutContributorSig() public {
        uint256 id = _createFundedEscrow();
        uint256 sigDeadline = block.timestamp + 1 hours;
        bytes32 digest = escrow.hashCancelAuthorization(id, sigDeadline);
        bytes memory fSig = _sign(funderKey, digest);

        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.InvalidSignature.selector, address(contributorWallet)));
        escrow.cancelByMutualConsent(id, sigDeadline, fSig, fSig);
    }
}
