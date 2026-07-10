// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AegisEscrowTestBase} from "../AegisEscrowTestBase.sol";
import {IAegisEscrow} from "../../src/interfaces/IAegisEscrow.sol";

contract ApproveTest is AegisEscrowTestBase {
    function test_approve_funderPlusAgent_paysContributor() public {
        uint256 id = _createFundedEscrow();
        _submit(id, 0);

        _approveWithFunderAndAgent(id, 0);

        assertEq(uint8(escrow.getMilestone(id, 0).state), uint8(IAegisEscrow.MilestoneState.Approved));
        assertEq(usdc.balanceOf(address(contributorWallet)), M0_AMOUNT);
        assertEq(usdc.balanceOf(address(escrow)), TOTAL - M0_AMOUNT);
    }

    function test_approve_agentPlusContributor1271() public {
        uint256 id = _createFundedEscrow();
        _submit(id, 1);

        _approveWithAgentAndContributor(id, 1);

        assertEq(uint8(escrow.getMilestone(id, 1).state), uint8(IAegisEscrow.MilestoneState.Approved));
        assertEq(usdc.balanceOf(address(contributorWallet)), M1_AMOUNT);
    }

    function test_approve_isPermissionless() public {
        uint256 id = _createFundedEscrow();
        _submit(id, 0);
        bytes32 digest = escrow.hashReleaseAuthorization(id, 0);

        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        signers[0] = funder;
        sigs[0] = _sign(funderKey, digest);
        signers[1] = agent;
        sigs[1] = _sign(agentKey, digest);

        // A random relayer/front-runner submits — the only effect is the
        // authorized payout to the contributor.
        vm.prank(makeAddr("mevBot"));
        escrow.approveMilestone(id, 0, signers, sigs);
        assertEq(usdc.balanceOf(address(contributorWallet)), M0_AMOUNT);
    }

    function test_approve_nativeEscrow_paysEth() public {
        uint256 id = _createEscrow(address(0));
        vm.prank(funder);
        escrow.fund{value: TOTAL}(id);
        _submit(id, 0);

        _approveWithFunderAndAgent(id, 0);
        assertEq(address(contributorWallet).balance, M0_AMOUNT);
    }

    function test_approve_revert_duplicateSigner() public {
        uint256 id = _createFundedEscrow();
        _submit(id, 0);
        bytes32 digest = escrow.hashReleaseAuthorization(id, 0);

        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        signers[0] = agent;
        sigs[0] = _sign(agentKey, digest);
        signers[1] = agent;
        sigs[1] = _sign(agentKey, digest);

        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.DuplicateSigner.selector, agent));
        escrow.approveMilestone(id, 0, signers, sigs);
    }

    function test_approve_revert_outsiderSigner() public {
        uint256 id = _createFundedEscrow();
        _submit(id, 0);
        bytes32 digest = escrow.hashReleaseAuthorization(id, 0);
        (address outsider, uint256 outsiderKey) = makeAddrAndKey("outsider");

        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        signers[0] = agent;
        sigs[0] = _sign(agentKey, digest);
        signers[1] = outsider;
        sigs[1] = _sign(outsiderKey, digest);

        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.InvalidSigner.selector, outsider));
        escrow.approveMilestone(id, 0, signers, sigs);
    }

    function test_approve_revert_signatureFromWrongKey() public {
        uint256 id = _createFundedEscrow();
        _submit(id, 0);
        bytes32 digest = escrow.hashReleaseAuthorization(id, 0);

        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        signers[0] = funder;
        sigs[0] = _sign(funderKey, digest);
        signers[1] = agent;
        sigs[1] = _sign(funderKey, digest); // claims agent, signed by funder

        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.InvalidSignature.selector, agent));
        escrow.approveMilestone(id, 0, signers, sigs);
    }

    function test_approve_revert_badSignatureCount() public {
        uint256 id = _createFundedEscrow();
        _submit(id, 0);
        address[] memory signers = new address[](1);
        bytes[] memory sigs = new bytes[](1);
        signers[0] = funder;
        sigs[0] = _sign(funderKey, escrow.hashReleaseAuthorization(id, 0));

        vm.expectRevert(IAegisEscrow.BadSignatureCount.selector);
        escrow.approveMilestone(id, 0, signers, sigs);
    }

    function test_approve_revert_notInReview() public {
        uint256 id = _createFundedEscrow();
        bytes32 digest = escrow.hashReleaseAuthorization(id, 0);
        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        signers[0] = funder;
        sigs[0] = _sign(funderKey, digest);
        signers[1] = agent;
        sigs[1] = _sign(agentKey, digest);

        vm.expectRevert(
            abi.encodeWithSelector(IAegisEscrow.InvalidMilestoneState.selector, IAegisEscrow.MilestoneState.Pending)
        );
        escrow.approveMilestone(id, 0, signers, sigs);
    }

    /// @dev Payment idempotence: once Approved, the same valid signatures can
    ///      never trigger a second payout.
    function test_approve_revert_replayAfterApproval() public {
        uint256 id = _createFundedEscrow();
        _submit(id, 0);
        bytes32 digest = escrow.hashReleaseAuthorization(id, 0);

        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        signers[0] = funder;
        sigs[0] = _sign(funderKey, digest);
        signers[1] = agent;
        sigs[1] = _sign(agentKey, digest);

        escrow.approveMilestone(id, 0, signers, sigs);
        vm.expectRevert(
            abi.encodeWithSelector(IAegisEscrow.InvalidMilestoneState.selector, IAegisEscrow.MilestoneState.Approved)
        );
        escrow.approveMilestone(id, 0, signers, sigs);
    }

    /// @dev Stale-round signatures: authorizations from review round N must be
    ///      unusable in round N+1 (reviewNonce is part of the digest).
    function test_approve_revert_staleSignaturesAfterResubmission() public {
        uint256 id = _createFundedEscrow();
        _submit(id, 0);

        // Signatures collected for round 1.
        bytes32 staleDigest = escrow.hashReleaseAuthorization(id, 0);
        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        signers[0] = funder;
        sigs[0] = _sign(funderKey, staleDigest);
        signers[1] = agent;
        sigs[1] = _sign(agentKey, staleDigest);

        // Round 1 gets disputed and rejected; contributor resubmits (round 2).
        vm.prank(funder);
        escrow.raiseDispute(id, 0);
        (bytes memory fSig, bytes memory cSig) = _disputeSigs(id, 0, false);
        escrow.resolveDispute(id, 0, false, fSig, cSig);
        vm.prank(address(contributorWallet));
        escrow.submitMilestone(id, 0, keccak256("commit:v2"), "");

        // Round-1 signatures no longer verify against the round-2 digest.
        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.InvalidSignature.selector, funder));
        escrow.approveMilestone(id, 0, signers, sigs);
    }

    function test_approve_revert_signatureForDifferentMilestone() public {
        uint256 id = _createFundedEscrow();
        _submit(id, 0);
        _submit(id, 1);

        bytes32 digestFor0 = escrow.hashReleaseAuthorization(id, 0);
        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        signers[0] = funder;
        sigs[0] = _sign(funderKey, digestFor0);
        signers[1] = agent;
        sigs[1] = _sign(agentKey, digestFor0);

        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.InvalidSignature.selector, funder));
        escrow.approveMilestone(id, 1, signers, sigs);
    }

    function test_approve_allMilestones_completesEscrow() public {
        uint256 id = _createFundedEscrow();
        for (uint256 i; i < 3; ++i) {
            _submit(id, i);
            _approveWithFunderAndAgent(id, i);
        }
        assertEq(uint8(escrow.getEscrow(id).state), uint8(IAegisEscrow.EscrowState.Completed));
        assertEq(usdc.balanceOf(address(contributorWallet)), TOTAL);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }
}
