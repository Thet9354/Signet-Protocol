// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {CommonBase} from "forge-std/Base.sol";
import {StdCheats} from "forge-std/StdCheats.sol";
import {StdUtils} from "forge-std/StdUtils.sol";

import {AegisEscrow} from "../../src/AegisEscrow.sol";
import {IAegisEscrow} from "../../src/interfaces/IAegisEscrow.sol";
import {Mock1271Wallet} from "../mocks/Mock1271Wallet.sol";
import {TestUSDC} from "../mocks/TestUSDC.sol";

/// @notice Randomized action handler. Every fund movement is mirrored in ghost
///         accounting so the invariant contract can assert exact solvency.
contract EscrowHandler is CommonBase, StdCheats, StdUtils {
    AegisEscrow public immutable escrow;
    TestUSDC public immutable usdc;

    uint256 internal constant FUNDER_KEY = 0xF00D;
    uint256 internal constant AGENT_KEY = 0xA9E27;
    uint256 internal constant CONTRIBUTOR_OWNER_KEY = 0xC0DE;
    uint40 internal constant DISPUTE_WINDOW = 7 days;

    address public immutable funder;
    address public immutable agent;
    Mock1271Wallet public immutable contributorWallet;

    uint256[] public escrowIds;
    // Ghost accounting
    uint256 public ghostFunded;
    uint256 public ghostPaid;
    uint256 public ghostRefunded;
    // Milestones we observed reaching a terminal state, for absorption checks.
    uint256[] public terminalEscrowIds;
    uint256[] public terminalMilestoneIds;
    IAegisEscrow.MilestoneState[] public terminalStates;

    constructor(AegisEscrow escrow_, TestUSDC usdc_) {
        escrow = escrow_;
        usdc = usdc_;
        funder = vm.addr(FUNDER_KEY);
        agent = vm.addr(AGENT_KEY);
        contributorWallet = new Mock1271Wallet(vm.addr(CONTRIBUTOR_OWNER_KEY));
    }

    function escrowCount() external view returns (uint256) {
        return escrowIds.length;
    }

    function terminalCount() external view returns (uint256) {
        return terminalEscrowIds.length;
    }

    // ────────────────────────────── Actions ──────────────────────────────

    function createFunded(uint256 milestoneSeed, uint256 amountSeed) external {
        if (escrowIds.length >= 8) return;
        uint256 count = bound(milestoneSeed, 1, 4);
        IAegisEscrow.MilestoneInput[] memory inputs = new IAegisEscrow.MilestoneInput[](count);
        uint256 total;
        for (uint256 i; i < count; ++i) {
            uint128 amount = uint128(bound(uint256(keccak256(abi.encode(amountSeed, i))), 1, 1e12));
            inputs[i] = IAegisEscrow.MilestoneInput({
                amount: amount,
                deadline: uint40(
                    block.timestamp + bound(uint256(keccak256(abi.encode(amountSeed, i, "d"))), 1 days, 90 days)
                ),
                specHash: keccak256(abi.encode("spec", escrowIds.length, i))
            });
            total += amount;
        }

        vm.startPrank(funder);
        uint256 id = escrow.createEscrow(
            address(contributorWallet), agent, address(usdc), DISPUTE_WINDOW, keccak256("repo"), inputs
        );
        usdc.approve(address(escrow), total);
        escrow.fund(id);
        vm.stopPrank();

        ghostFunded += total;
        escrowIds.push(id);
    }

    function submit(uint256 idSeed, uint256 msSeed) external {
        (uint256 id, uint256 msId, bool ok) = _pick(idSeed, msSeed);
        if (!ok) return;
        IAegisEscrow.Milestone memory ms = escrow.getMilestone(id, msId);
        if (ms.state != IAegisEscrow.MilestoneState.Pending && ms.state != IAegisEscrow.MilestoneState.Rejected) {
            return;
        }
        vm.prank(address(contributorWallet));
        escrow.submitMilestone(id, msId, keccak256(abi.encode(id, msId, ms.reviewNonce)), "ipfs://x");
    }

    function approve(uint256 idSeed, uint256 msSeed) external {
        (uint256 id, uint256 msId, bool ok) = _pick(idSeed, msSeed);
        if (!ok) return;
        IAegisEscrow.Milestone memory ms = escrow.getMilestone(id, msId);
        if (ms.state != IAegisEscrow.MilestoneState.InReview) return;

        bytes32 digest = escrow.hashReleaseAuthorization(id, msId);
        address[] memory signers = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        signers[0] = funder;
        sigs[0] = _sign(FUNDER_KEY, digest);
        signers[1] = agent;
        sigs[1] = _sign(AGENT_KEY, digest);
        escrow.approveMilestone(id, msId, signers, sigs);

        ghostPaid += ms.amount;
        _recordTerminal(id, msId, IAegisEscrow.MilestoneState.Approved);
    }

    function disputeAndResolve(uint256 idSeed, uint256 msSeed, bool approved) external {
        (uint256 id, uint256 msId, bool ok) = _pick(idSeed, msSeed);
        if (!ok) return;
        IAegisEscrow.Milestone memory ms = escrow.getMilestone(id, msId);
        if (ms.state != IAegisEscrow.MilestoneState.InReview) return;

        vm.prank(funder);
        escrow.raiseDispute(id, msId);

        bytes32 digest = escrow.hashDisputeResolution(id, msId, approved);
        escrow.resolveDispute(id, msId, approved, _sign(FUNDER_KEY, digest), _sign(CONTRIBUTOR_OWNER_KEY, digest));

        if (approved) {
            ghostPaid += ms.amount;
            _recordTerminal(id, msId, IAegisEscrow.MilestoneState.Approved);
        }
    }

    function reclaim(uint256 idSeed, uint256 msSeed) external {
        (uint256 id, uint256 msId, bool ok) = _pick(idSeed, msSeed);
        if (!ok) return;
        IAegisEscrow.Milestone memory ms = escrow.getMilestone(id, msId);
        if (ms.state == IAegisEscrow.MilestoneState.Approved || ms.state == IAegisEscrow.MilestoneState.Refunded) {
            return;
        }

        vm.warp(uint256(ms.deadline) + DISPUTE_WINDOW + 1);
        vm.prank(funder);
        escrow.reclaimExpired(id, msId);

        ghostRefunded += ms.amount;
        _recordTerminal(id, msId, IAegisEscrow.MilestoneState.Refunded);
    }

    function cancelMutual(uint256 idSeed) external {
        if (escrowIds.length == 0) return;
        uint256 id = escrowIds[bound(idSeed, 0, escrowIds.length - 1)];
        IAegisEscrow.Escrow memory esc = escrow.getEscrow(id);
        if (esc.state != IAegisEscrow.EscrowState.Funded) return;

        uint256 refund;
        for (uint256 i; i < esc.milestones.length; ++i) {
            IAegisEscrow.MilestoneState st = esc.milestones[i].state;
            if (st != IAegisEscrow.MilestoneState.Approved && st != IAegisEscrow.MilestoneState.Refunded) {
                refund += esc.milestones[i].amount;
                _recordTerminal(id, i, IAegisEscrow.MilestoneState.Refunded);
            }
        }

        uint256 sigDeadline = block.timestamp + 1 hours;
        bytes32 digest = escrow.hashCancelAuthorization(id, sigDeadline);
        escrow.cancelByMutualConsent(id, sigDeadline, _sign(FUNDER_KEY, digest), _sign(CONTRIBUTOR_OWNER_KEY, digest));

        ghostRefunded += refund;
    }

    // ────────────────────────────── Internal ─────────────────────────────

    function _pick(uint256 idSeed, uint256 msSeed) internal view returns (uint256 id, uint256 msId, bool ok) {
        if (escrowIds.length == 0) return (0, 0, false);
        id = escrowIds[bound(idSeed, 0, escrowIds.length - 1)];
        IAegisEscrow.Escrow memory esc = escrow.getEscrow(id);
        if (esc.state != IAegisEscrow.EscrowState.Funded) return (0, 0, false);
        msId = bound(msSeed, 0, esc.milestones.length - 1);
        ok = true;
    }

    function _sign(uint256 pk, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function _recordTerminal(uint256 id, uint256 msId, IAegisEscrow.MilestoneState st) internal {
        terminalEscrowIds.push(id);
        terminalMilestoneIds.push(msId);
        terminalStates.push(st);
    }
}

contract EscrowInvariantTest is Test {
    AegisEscrow internal escrow;
    TestUSDC internal usdc;
    EscrowHandler internal handler;

    function setUp() public {
        escrow = new AegisEscrow();
        usdc = new TestUSDC();
        handler = new EscrowHandler(escrow, usdc);
        usdc.transfer(handler.funder(), 1e24);
        targetContract(address(handler));
    }

    /// @dev Exact solvency: the escrow's balance is precisely what was funded
    ///      minus what was paid out and refunded. Any drift means value was
    ///      created or destroyed.
    function invariant_exactSolvency() public view {
        assertEq(
            usdc.balanceOf(address(escrow)),
            handler.ghostFunded() - handler.ghostPaid() - handler.ghostRefunded(),
            "escrow balance drifted from ghost accounting"
        );
    }

    /// @dev The escrow always holds enough to cover every outstanding
    ///      (non-terminal) milestone obligation.
    function invariant_balanceCoversObligations() public view {
        uint256 obligations;
        uint256 count = handler.escrowCount();
        for (uint256 i; i < count; ++i) {
            IAegisEscrow.Escrow memory esc = escrow.getEscrow(handler.escrowIds(i));
            if (esc.state != IAegisEscrow.EscrowState.Funded) continue;
            for (uint256 j; j < esc.milestones.length; ++j) {
                IAegisEscrow.MilestoneState st = esc.milestones[j].state;
                if (st != IAegisEscrow.MilestoneState.Approved && st != IAegisEscrow.MilestoneState.Refunded) {
                    obligations += esc.milestones[j].amount;
                }
            }
        }
        assertGe(usdc.balanceOf(address(escrow)), obligations, "obligations exceed balance");
    }

    /// @dev Terminal states are absorbing: once a milestone is Approved or
    ///      Refunded it never transitions again (payment idempotence).
    function invariant_terminalStatesAbsorbing() public view {
        uint256 count = handler.terminalCount();
        for (uint256 i; i < count; ++i) {
            IAegisEscrow.Milestone memory ms =
                escrow.getMilestone(handler.terminalEscrowIds(i), handler.terminalMilestoneIds(i));
            assertEq(uint8(ms.state), uint8(handler.terminalStates(i)), "terminal milestone state mutated");
        }
    }

    /// @dev A Completed or Cancelled escrow holds no live milestones.
    function invariant_finishedEscrowsHaveNoLiveMilestones() public view {
        uint256 count = handler.escrowCount();
        for (uint256 i; i < count; ++i) {
            IAegisEscrow.Escrow memory esc = escrow.getEscrow(handler.escrowIds(i));
            if (esc.state == IAegisEscrow.EscrowState.Funded) continue;
            for (uint256 j; j < esc.milestones.length; ++j) {
                IAegisEscrow.MilestoneState st = esc.milestones[j].state;
                assertTrue(
                    st == IAegisEscrow.MilestoneState.Approved || st == IAegisEscrow.MilestoneState.Refunded,
                    "finished escrow has live milestone"
                );
            }
        }
    }
}
