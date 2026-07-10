// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AegisEscrowTestBase} from "../AegisEscrowTestBase.sol";
import {IAegisEscrow} from "../../src/interfaces/IAegisEscrow.sol";

contract CreateFundTest is AegisEscrowTestBase {
    function test_createEscrow_storesConfiguration() public {
        uint256 id = _createEscrow(address(usdc));

        IAegisEscrow.Escrow memory esc = escrow.getEscrow(id);
        assertEq(esc.funder, funder);
        assertEq(esc.contributor, address(contributorWallet));
        assertEq(esc.agentSigner, agent);
        assertEq(esc.token, address(usdc));
        assertEq(esc.disputeWindow, DISPUTE_WINDOW);
        assertEq(uint8(esc.state), uint8(IAegisEscrow.EscrowState.Created));
        assertEq(esc.repoCommitment, REPO_COMMITMENT);
        assertEq(esc.milestones.length, 3);
        assertEq(esc.milestones[1].amount, M1_AMOUNT);
        assertEq(uint8(esc.milestones[0].state), uint8(IAegisEscrow.MilestoneState.Pending));
        assertEq(esc.milestones[0].reviewNonce, 0);
    }

    function test_createEscrow_incrementsIds() public {
        assertEq(_createEscrow(address(usdc)), 0);
        assertEq(_createEscrow(address(0)), 1);
    }

    function test_createEscrow_revert_zeroContributor() public {
        vm.expectRevert(IAegisEscrow.ZeroAddress.selector);
        vm.prank(funder);
        escrow.createEscrow(address(0), agent, address(usdc), DISPUTE_WINDOW, REPO_COMMITMENT, _milestoneInputs());
    }

    function test_createEscrow_revert_zeroAgent() public {
        vm.expectRevert(IAegisEscrow.ZeroAddress.selector);
        vm.prank(funder);
        escrow.createEscrow(
            address(contributorWallet), address(0), address(usdc), DISPUTE_WINDOW, REPO_COMMITMENT, _milestoneInputs()
        );
    }

    function test_createEscrow_revert_signersNotDistinct() public {
        vm.expectRevert(IAegisEscrow.SignersNotDistinct.selector);
        vm.prank(funder);
        escrow.createEscrow(funder, agent, address(usdc), DISPUTE_WINDOW, REPO_COMMITMENT, _milestoneInputs());

        vm.expectRevert(IAegisEscrow.SignersNotDistinct.selector);
        vm.prank(funder);
        escrow.createEscrow(
            address(contributorWallet),
            address(contributorWallet),
            address(usdc),
            DISPUTE_WINDOW,
            REPO_COMMITMENT,
            _milestoneInputs()
        );
    }

    function test_createEscrow_revert_noMilestones() public {
        IAegisEscrow.MilestoneInput[] memory none = new IAegisEscrow.MilestoneInput[](0);
        vm.expectRevert(IAegisEscrow.NoMilestones.selector);
        vm.prank(funder);
        escrow.createEscrow(address(contributorWallet), agent, address(usdc), DISPUTE_WINDOW, REPO_COMMITMENT, none);
    }

    function test_createEscrow_revert_zeroAmountMilestone() public {
        IAegisEscrow.MilestoneInput[] memory inputs = _milestoneInputs();
        inputs[1].amount = 0;
        vm.expectRevert(IAegisEscrow.ZeroAmount.selector);
        vm.prank(funder);
        escrow.createEscrow(address(contributorWallet), agent, address(usdc), DISPUTE_WINDOW, REPO_COMMITMENT, inputs);
    }

    function test_fund_erc20_pullsExactTotal() public {
        uint256 id = _createEscrow(address(usdc));
        vm.startPrank(funder);
        usdc.approve(address(escrow), TOTAL);
        vm.expectEmit(true, false, false, true);
        emit IAegisEscrow.EscrowFunded(id, address(usdc), TOTAL);
        escrow.fund(id);
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(escrow)), TOTAL);
        assertEq(uint8(escrow.getEscrow(id).state), uint8(IAegisEscrow.EscrowState.Funded));
    }

    function test_fund_native_exactValue() public {
        uint256 id = _createEscrow(address(0));
        vm.prank(funder);
        escrow.fund{value: TOTAL}(id);
        assertEq(address(escrow).balance, TOTAL);
    }

    function test_fund_native_revert_wrongValue() public {
        uint256 id = _createEscrow(address(0));
        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.FundingMismatch.selector, TOTAL, TOTAL - 1));
        vm.prank(funder);
        escrow.fund{value: TOTAL - 1}(id);
    }

    function test_fund_erc20_revert_nonzeroMsgValue() public {
        uint256 id = _createEscrow(address(usdc));
        vm.startPrank(funder);
        usdc.approve(address(escrow), TOTAL);
        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.FundingMismatch.selector, 0, 1 ether));
        escrow.fund{value: 1 ether}(id);
        vm.stopPrank();
    }

    function test_fund_revert_notFunder() public {
        uint256 id = _createEscrow(address(usdc));
        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.UnauthorizedCaller.selector, agent));
        vm.prank(agent);
        escrow.fund(id);
    }

    function test_fund_revert_doubleFund() public {
        uint256 id = _createFundedEscrow();
        vm.expectRevert(
            abi.encodeWithSelector(IAegisEscrow.InvalidEscrowState.selector, IAegisEscrow.EscrowState.Funded)
        );
        vm.prank(funder);
        escrow.fund(id);
    }

    function test_cancelUnfunded() public {
        uint256 id = _createEscrow(address(usdc));
        vm.prank(funder);
        escrow.cancelUnfunded(id);
        assertEq(uint8(escrow.getEscrow(id).state), uint8(IAegisEscrow.EscrowState.Cancelled));

        // Terminal: cannot fund a cancelled escrow.
        vm.expectRevert(
            abi.encodeWithSelector(IAegisEscrow.InvalidEscrowState.selector, IAegisEscrow.EscrowState.Cancelled)
        );
        vm.prank(funder);
        escrow.fund(id);
    }

    function test_cancelUnfunded_revert_notFunder() public {
        uint256 id = _createEscrow(address(usdc));
        vm.expectRevert(abi.encodeWithSelector(IAegisEscrow.UnauthorizedCaller.selector, address(contributorWallet)));
        vm.prank(address(contributorWallet));
        escrow.cancelUnfunded(id);
    }
}
