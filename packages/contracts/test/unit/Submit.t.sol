// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AegisEscrowTestBase} from "../AegisEscrowTestBase.sol";
import {IAegisEscrow} from "../../src/interfaces/IAegisEscrow.sol";

contract SubmitTest is AegisEscrowTestBase {
    function test_submit_movesToInReviewAndBumpsNonce() public {
        uint256 id = _createFundedEscrow();

        vm.expectEmit(true, true, false, true);
        emit IAegisEscrow.MilestoneSubmitted(id, 0, 1, COMMIT_HASH, "ipfs://artifact");
        _submit(id, 0);

        IAegisEscrow.Milestone memory ms = escrow.getMilestone(id, 0);
        assertEq(uint8(ms.state), uint8(IAegisEscrow.MilestoneState.InReview));
        assertEq(ms.reviewNonce, 1);
        assertEq(ms.commitHash, COMMIT_HASH);
    }

    function test_submit_revert_notContributor() public {
        uint256 id = _createFundedEscrow();
        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.UnauthorizedCaller.selector, funder));
        vm.prank(funder);
        escrow.submitMilestone(id, 0, COMMIT_HASH, "");
    }

    function test_submit_revert_unfundedEscrow() public {
        uint256 id = _createEscrow(address(usdc));
        vm.expectRevert(
            abi.encodeWithSelector(IAegisEscrow.InvalidEscrowState.selector, IAegisEscrow.EscrowState.Created)
        );
        vm.prank(address(contributorWallet));
        escrow.submitMilestone(id, 0, COMMIT_HASH, "");
    }

    function test_submit_revert_zeroCommitHash() public {
        uint256 id = _createFundedEscrow();
        vm.expectRevert(IAegisEscrow.ZeroCommitHash.selector);
        vm.prank(address(contributorWallet));
        escrow.submitMilestone(id, 0, bytes32(0), "");
    }

    function test_submit_revert_alreadyInReview() public {
        uint256 id = _createFundedEscrow();
        _submit(id, 0);
        vm.expectRevert(
            abi.encodeWithSelector(IAegisEscrow.InvalidMilestoneState.selector, IAegisEscrow.MilestoneState.InReview)
        );
        _submit(id, 0);
    }

    function test_submit_revert_milestoneOutOfRange() public {
        uint256 id = _createFundedEscrow();
        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.MilestoneOutOfRange.selector, 3));
        vm.prank(address(contributorWallet));
        escrow.submitMilestone(id, 3, COMMIT_HASH, "");
    }

    function test_resubmit_afterRejection_bumpsNonceAgain() public {
        uint256 id = _createFundedEscrow();
        _submit(id, 0);

        // Reject via the dispute path (only route to Rejected).
        vm.prank(funder);
        escrow.raiseDispute(id, 0);
        (bytes memory fSig, bytes memory cSig) = _disputeSigs(id, 0, false);
        escrow.resolveDispute(id, 0, false, fSig, cSig);
        assertEq(uint8(escrow.getMilestone(id, 0).state), uint8(IAegisEscrow.MilestoneState.Rejected));

        vm.prank(address(contributorWallet));
        escrow.submitMilestone(id, 0, keccak256("commit:v2"), "ipfs://artifact-v2");

        IAegisEscrow.Milestone memory ms = escrow.getMilestone(id, 0);
        assertEq(uint8(ms.state), uint8(IAegisEscrow.MilestoneState.InReview));
        assertEq(ms.reviewNonce, 2);
        assertEq(ms.commitHash, keccak256("commit:v2"));
    }
}
