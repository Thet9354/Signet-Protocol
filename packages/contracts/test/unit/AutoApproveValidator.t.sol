// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AegisEscrowTestBase} from "../AegisEscrowTestBase.sol";
import {AegisAutoApproveValidator} from "../../src/modules/AegisAutoApproveValidator.sol";
import {IAegisEscrow} from "../../src/interfaces/IAegisEscrow.sol";
import {Mock7579Account} from "../mocks/Mock7579Account.sol";

/// @notice The ERC-7579 "autonomous treasury policy" module: a funder smart
///         account pre-authorizes AI-approved releases below a cap, so the
///         funder's 2-of-3 vote is cast programmatically via ERC-1271.
contract AutoApproveValidatorTest is AegisEscrowTestBase {
    AegisAutoApproveValidator internal module;
    Mock7579Account internal funderAccount;
    uint256 internal escrowId;

    // Cap sits between M0 (1,000e6) and M1 (2,500e6).
    uint256 internal constant CAP = 2_000e6;

    function setUp() public override {
        super.setUp();
        module = new AegisAutoApproveValidator();
        funderAccount = new Mock7579Account(address(this));
        usdc.transfer(address(funderAccount), TOTAL);

        // The smart account is the funder: it creates, approves, and funds.
        bytes memory created = funderAccount.execute(
            address(escrow),
            0,
            abi.encodeCall(
                escrow.createEscrow,
                (address(contributorWallet), agent, address(usdc), DISPUTE_WINDOW, REPO_COMMITMENT, _milestoneInputs())
            )
        );
        escrowId = abi.decode(created, (uint256));
        funderAccount.execute(address(usdc), 0, abi.encodeCall(usdc.approve, (address(escrow), TOTAL)));
        funderAccount.execute(address(escrow), 0, abi.encodeCall(escrow.fund, (escrowId)));

        // Install the policy: auto-approve AI-attested releases up to CAP.
        funderAccount.installModule(module, abi.encode(address(escrow), CAP));
    }

    function _policySignature(uint256 milestoneId, bytes memory agentSig) internal view returns (bytes memory) {
        return abi.encode(address(escrow), escrowId, milestoneId, agentSig);
    }

    function _approveViaPolicy(uint256 milestoneId) internal {
        bytes32 digest = escrow.hashReleaseAuthorization(escrowId, milestoneId);
        bytes memory agentSig = _sign(agentKey, digest);

        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        // Vote 1: the funder account, via the policy validator (ERC-1271).
        signers[0] = address(funderAccount);
        sigs[0] = _policySignature(milestoneId, agentSig);
        // Vote 2: the AI oracle's own ECDSA signature.
        signers[1] = agent;
        sigs[1] = agentSig;
        escrow.approveMilestone(escrowId, milestoneId, signers, sigs);
    }

    function test_autoApprove_releasesUnderCap_withoutHumanSignature() public {
        _submit(escrowId, 0); // M0 = 1,000e6 ≤ CAP
        _approveViaPolicy(0);

        assertEq(uint8(escrow.getMilestone(escrowId, 0).state), uint8(IAegisEscrow.MilestoneState.Approved));
        assertEq(usdc.balanceOf(address(contributorWallet)), M0_AMOUNT);
    }

    function test_autoApprove_revert_overCap() public {
        _submit(escrowId, 1); // M1 = 2,500e6 > CAP
        bytes32 digest = escrow.hashReleaseAuthorization(escrowId, 1);
        bytes memory agentSig = _sign(agentKey, digest);
        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        signers[0] = address(funderAccount);
        sigs[0] = _policySignature(1, agentSig);
        signers[1] = agent;
        sigs[1] = agentSig;

        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.InvalidSignature.selector, address(funderAccount)));
        escrow.approveMilestone(escrowId, 1, signers, sigs);
    }

    function test_autoApprove_revert_withoutValidAgentAttestation() public {
        _submit(escrowId, 0);
        bytes32 digest = escrow.hashReleaseAuthorization(escrowId, 0);
        (, uint256 outsiderKey) = makeAddrAndKey("outsider");
        bytes memory forgedSig = _sign(outsiderKey, digest);

        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        signers[0] = address(funderAccount);
        sigs[0] = _policySignature(0, forgedSig);
        signers[1] = agent;
        sigs[1] = forgedSig;

        // Both votes collapse without a genuine oracle signature.
        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.InvalidSignature.selector, address(funderAccount)));
        escrow.approveMilestone(escrowId, 0, signers, sigs);
    }

    function test_autoApprove_revert_afterPolicyRevoked() public {
        _submit(escrowId, 0);
        funderAccount.execute(address(module), 0, abi.encodeCall(module.setPolicy, (address(escrow), 0)));

        bytes32 digest = escrow.hashReleaseAuthorization(escrowId, 0);
        bytes memory agentSig = _sign(agentKey, digest);
        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        signers[0] = address(funderAccount);
        sigs[0] = _policySignature(0, agentSig);
        signers[1] = agent;
        sigs[1] = agentSig;

        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.InvalidSignature.selector, address(funderAccount)));
        escrow.approveMilestone(escrowId, 0, signers, sigs);
    }

    function test_autoApprove_revert_forForeignEscrowsFunder() public {
        // A different funder's escrow on the same contract: the policy only
        // applies where the account itself is the funder.
        uint256 foreignId = _createFundedEscrow(); // funder = EOA `funder`
        _submit(foreignId, 0);

        bytes32 digest = escrow.hashReleaseAuthorization(foreignId, 0);
        bytes memory agentSig = _sign(agentKey, digest);
        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        signers[0] = address(funderAccount);
        sigs[0] = abi.encode(address(escrow), foreignId, uint256(0), agentSig);
        signers[1] = agent;
        sigs[1] = agentSig;

        // The account isn't a party to that escrow at all.
        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.InvalidSigner.selector, address(funderAccount)));
        escrow.approveMilestone(foreignId, 0, signers, sigs);
    }

    /// A dispute (or any transition out of InReview) immediately voids the
    /// policy authorization: the validator re-reads live state on every check.
    function test_autoApprove_voidedWhenMilestoneLeavesInReview() public {
        _submit(escrowId, 0);
        bytes32 digest = escrow.hashReleaseAuthorization(escrowId, 0);
        bytes memory agentSig = _sign(agentKey, digest);
        bytes memory policySig = _policySignature(0, agentSig);

        vm.prank(address(contributorWallet));
        escrow.raiseDispute(escrowId, 0);

        // The validator itself now refuses this digest (called as the account,
        // so the configured cap applies and the InReview check is what fails)…
        vm.prank(address(funderAccount));
        assertEq(module.isValidSignatureWithSender(address(this), digest, policySig), bytes4(0xffffffff));
        // …wrapped call is only tested via the validator since the escrow's
        // own state guard rejects the approval even earlier:
        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        signers[0] = address(funderAccount);
        sigs[0] = policySig;
        signers[1] = agent;
        sigs[1] = agentSig;
        vm.expectRevert(
            abi.encodeWithSelector(IAegisEscrow.InvalidMilestoneState.selector, IAegisEscrow.MilestoneState.Disputed)
        );
        escrow.approveMilestone(escrowId, 0, signers, sigs);
    }
}
