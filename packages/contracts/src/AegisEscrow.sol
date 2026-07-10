// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

import {IAegisEscrow} from "./interfaces/IAegisEscrow.sol";
import {ReleaseAuthLib} from "./libraries/ReleaseAuthLib.sol";

/// @title AegisEscrow
/// @notice Milestone escrow released by 2-of-3 EIP-712 authorization among the
///         funder, the contributor's smart account, and an AI oracle key.
///
///         Trust model: the AI oracle is fault-tolerant, not trusted. It holds one
///         vote of three, custodies no funds, and is excluded from dispute
///         resolution — the two human parties acting together always override it.
///
///         Release authorizations are detached EIP-712 signatures bound to
///         (escrowId, milestoneId, reviewNonce, commitHash, amount, recipient) and
///         domain-separated by (chainId, verifyingContract). `approveMilestone` is
///         therefore permissionlessly executable and griefing-neutral: a front-runner
///         can only cause the authorized payout to happen, at their own gas cost.
contract AegisEscrow is IAegisEscrow, EIP712, ReentrancyGuardTransient {
    using SafeERC20 for IERC20;

    uint256 public constant THRESHOLD = 2;

    uint256 internal _nextEscrowId;
    mapping(uint256 escrowId => Escrow) internal _escrows;

    constructor() EIP712("AegisEscrow", "1") {}

    // ────────────────────────────── Lifecycle ────────────────────────────

    /// @inheritdoc IAegisEscrow
    function createEscrow(
        address contributor,
        address agentSigner,
        address token,
        uint40 disputeWindow,
        bytes32 repoCommitment,
        MilestoneInput[] calldata milestones
    ) external returns (uint256 escrowId) {
        if (contributor == address(0) || agentSigner == address(0)) {
            revert ZeroAddress();
        }
        // The 2-of-3 duplicate-signer check relies on the three parties being
        // pairwise-distinct addresses.
        if (contributor == msg.sender || agentSigner == msg.sender || contributor == agentSigner) {
            revert SignersNotDistinct();
        }
        uint256 count = milestones.length;
        if (count == 0) revert NoMilestones();

        escrowId = _nextEscrowId++;
        Escrow storage esc = _escrows[escrowId];
        esc.funder = msg.sender;
        esc.contributor = contributor;
        esc.agentSigner = agentSigner;
        esc.token = token;
        esc.disputeWindow = disputeWindow;
        esc.state = EscrowState.Created;
        esc.repoCommitment = repoCommitment;

        for (uint256 i; i < count; ++i) {
            if (milestones[i].amount == 0) revert ZeroAmount();
            esc.milestones
                .push(
                    Milestone({
                        amount: milestones[i].amount,
                        deadline: milestones[i].deadline,
                        reviewNonce: 0,
                        state: MilestoneState.Pending,
                        specHash: milestones[i].specHash,
                        commitHash: bytes32(0)
                    })
                );
        }

        emit EscrowCreated(escrowId, msg.sender, contributor, agentSigner, token, repoCommitment);
    }

    /// @inheritdoc IAegisEscrow
    function fund(uint256 escrowId) external payable nonReentrant {
        Escrow storage esc = _escrows[escrowId];
        if (esc.state != EscrowState.Created) revert InvalidEscrowState(esc.state);
        if (msg.sender != esc.funder) revert UnauthorizedCaller(msg.sender);

        uint256 total = _totalAmount(esc);
        esc.state = EscrowState.Funded;

        if (esc.token == address(0)) {
            if (msg.value != total) revert FundingMismatch(total, msg.value);
        } else {
            if (msg.value != 0) revert FundingMismatch(0, msg.value);
            IERC20(esc.token).safeTransferFrom(msg.sender, address(this), total);
        }

        emit EscrowFunded(escrowId, esc.token, total);
    }

    /// @inheritdoc IAegisEscrow
    function cancelUnfunded(uint256 escrowId) external {
        Escrow storage esc = _escrows[escrowId];
        if (esc.state != EscrowState.Created) revert InvalidEscrowState(esc.state);
        if (msg.sender != esc.funder) revert UnauthorizedCaller(msg.sender);
        esc.state = EscrowState.Cancelled;
        emit EscrowCancelled(escrowId, 0);
    }

    /// @inheritdoc IAegisEscrow
    function submitMilestone(uint256 escrowId, uint256 milestoneId, bytes32 commitHash, string calldata artifactURI)
        external
    {
        Escrow storage esc = _escrows[escrowId];
        if (esc.state != EscrowState.Funded) revert InvalidEscrowState(esc.state);
        if (msg.sender != esc.contributor) revert UnauthorizedCaller(msg.sender);
        if (commitHash == bytes32(0)) revert ZeroCommitHash();

        Milestone storage ms = _milestone(esc, milestoneId);
        if (ms.state != MilestoneState.Pending && ms.state != MilestoneState.Rejected) {
            revert InvalidMilestoneState(ms.state);
        }

        ms.commitHash = commitHash;
        ms.state = MilestoneState.InReview;
        // Invalidates every authorization issued for a previous review round.
        ++ms.reviewNonce;

        emit MilestoneSubmitted(escrowId, milestoneId, ms.reviewNonce, commitHash, artifactURI);
    }

    /// @inheritdoc IAegisEscrow
    function approveMilestone(
        uint256 escrowId,
        uint256 milestoneId,
        address[] calldata signers,
        bytes[] calldata signatures
    ) external nonReentrant {
        Escrow storage esc = _escrows[escrowId];
        if (esc.state != EscrowState.Funded) revert InvalidEscrowState(esc.state);
        Milestone storage ms = _milestone(esc, milestoneId);
        if (ms.state != MilestoneState.InReview) revert InvalidMilestoneState(ms.state);

        if (signers.length != THRESHOLD || signatures.length != THRESHOLD) revert BadSignatureCount();
        if (signers[0] == signers[1]) revert DuplicateSigner(signers[0]);

        bytes32 digest = _hashTypedDataV4(
            ReleaseAuthLib.releaseStructHash(
                escrowId, milestoneId, ms.reviewNonce, ms.commitHash, ms.amount, esc.contributor
            )
        );
        for (uint256 i; i < THRESHOLD; ++i) {
            address signer = signers[i];
            if (signer != esc.funder && signer != esc.contributor && signer != esc.agentSigner) {
                revert InvalidSigner(signer);
            }
            // ERC-1271-aware: the contributor signs through their smart account.
            if (!SignatureChecker.isValidSignatureNow(signer, digest, signatures[i])) {
                revert InvalidSignature(signer);
            }
        }

        ms.state = MilestoneState.Approved;
        emit MilestoneApproved(escrowId, milestoneId, ms.commitHash, ms.amount, signers);
        _finalizeIfComplete(escrowId, esc);

        _payout(esc.token, esc.contributor, ms.amount);
    }

    /// @inheritdoc IAegisEscrow
    function raiseDispute(uint256 escrowId, uint256 milestoneId) external {
        Escrow storage esc = _escrows[escrowId];
        if (esc.state != EscrowState.Funded) revert InvalidEscrowState(esc.state);
        if (msg.sender != esc.funder && msg.sender != esc.contributor) revert UnauthorizedCaller(msg.sender);

        Milestone storage ms = _milestone(esc, milestoneId);
        if (ms.state != MilestoneState.InReview) revert InvalidMilestoneState(ms.state);

        ms.state = MilestoneState.Disputed;
        emit DisputeRaised(escrowId, milestoneId, msg.sender);
    }

    /// @inheritdoc IAegisEscrow
    function resolveDispute(
        uint256 escrowId,
        uint256 milestoneId,
        bool approved,
        bytes calldata funderSignature,
        bytes calldata contributorSignature
    ) external nonReentrant {
        Escrow storage esc = _escrows[escrowId];
        if (esc.state != EscrowState.Funded) revert InvalidEscrowState(esc.state);
        Milestone storage ms = _milestone(esc, milestoneId);
        if (ms.state != MilestoneState.Disputed) revert InvalidMilestoneState(ms.state);

        bytes32 digest =
            _hashTypedDataV4(ReleaseAuthLib.disputeStructHash(escrowId, milestoneId, ms.reviewNonce, approved));
        if (!SignatureChecker.isValidSignatureNow(esc.funder, digest, funderSignature)) {
            revert InvalidSignature(esc.funder);
        }
        if (!SignatureChecker.isValidSignatureNow(esc.contributor, digest, contributorSignature)) {
            revert InvalidSignature(esc.contributor);
        }

        emit DisputeResolved(escrowId, milestoneId, approved);
        if (approved) {
            ms.state = MilestoneState.Approved;
            address[] memory signers = new address[](2);
            signers[0] = esc.funder;
            signers[1] = esc.contributor;
            emit MilestoneApproved(escrowId, milestoneId, ms.commitHash, ms.amount, signers);
            _finalizeIfComplete(escrowId, esc);
            _payout(esc.token, esc.contributor, ms.amount);
        } else {
            // Non-terminal: the contributor may resubmit, which bumps reviewNonce.
            ms.state = MilestoneState.Rejected;
        }
    }

    /// @inheritdoc IAegisEscrow
    function reclaimExpired(uint256 escrowId, uint256 milestoneId) external nonReentrant {
        Escrow storage esc = _escrows[escrowId];
        if (esc.state != EscrowState.Funded) revert InvalidEscrowState(esc.state);
        if (msg.sender != esc.funder) revert UnauthorizedCaller(msg.sender);

        Milestone storage ms = _milestone(esc, milestoneId);
        if (ms.state == MilestoneState.Approved || ms.state == MilestoneState.Refunded) {
            revert InvalidMilestoneState(ms.state);
        }
        uint256 reclaimableAt = uint256(ms.deadline) + esc.disputeWindow;
        if (block.timestamp <= reclaimableAt) revert DeadlineNotElapsed(reclaimableAt);

        ms.state = MilestoneState.Refunded;
        emit MilestoneRefunded(escrowId, milestoneId, ms.amount);
        _finalizeIfComplete(escrowId, esc);

        _payout(esc.token, esc.funder, ms.amount);
    }

    /// @inheritdoc IAegisEscrow
    function cancelByMutualConsent(
        uint256 escrowId,
        uint256 sigDeadline,
        bytes calldata funderSignature,
        bytes calldata contributorSignature
    ) external nonReentrant {
        if (block.timestamp > sigDeadline) revert SignatureExpired(sigDeadline);

        Escrow storage esc = _escrows[escrowId];
        if (esc.state != EscrowState.Funded) revert InvalidEscrowState(esc.state);

        bytes32 digest = _hashTypedDataV4(ReleaseAuthLib.cancelStructHash(escrowId, sigDeadline));
        if (!SignatureChecker.isValidSignatureNow(esc.funder, digest, funderSignature)) {
            revert InvalidSignature(esc.funder);
        }
        if (!SignatureChecker.isValidSignatureNow(esc.contributor, digest, contributorSignature)) {
            revert InvalidSignature(esc.contributor);
        }

        uint256 refund;
        uint256 count = esc.milestones.length;
        for (uint256 i; i < count; ++i) {
            Milestone storage ms = esc.milestones[i];
            if (ms.state != MilestoneState.Approved && ms.state != MilestoneState.Refunded) {
                ms.state = MilestoneState.Refunded;
                refund += ms.amount;
            }
        }
        esc.state = EscrowState.Cancelled;
        emit EscrowCancelled(escrowId, refund);

        if (refund != 0) {
            _payout(esc.token, esc.funder, refund);
        }
    }

    // ─────────────────────────────── Views ───────────────────────────────

    /// @inheritdoc IAegisEscrow
    function getEscrow(uint256 escrowId) external view returns (Escrow memory) {
        return _escrows[escrowId];
    }

    /// @inheritdoc IAegisEscrow
    function getMilestone(uint256 escrowId, uint256 milestoneId) external view returns (Milestone memory) {
        Escrow storage esc = _escrows[escrowId];
        return _milestone(esc, milestoneId);
    }

    /// @inheritdoc IAegisEscrow
    function hashReleaseAuthorization(uint256 escrowId, uint256 milestoneId) external view returns (bytes32) {
        Escrow storage esc = _escrows[escrowId];
        Milestone storage ms = _milestone(esc, milestoneId);
        return _hashTypedDataV4(
            ReleaseAuthLib.releaseStructHash(
                escrowId, milestoneId, ms.reviewNonce, ms.commitHash, ms.amount, esc.contributor
            )
        );
    }

    /// @inheritdoc IAegisEscrow
    function computeReleaseDigest(
        uint256 escrowId,
        uint256 milestoneId,
        uint40 reviewNonce,
        bytes32 commitHash,
        uint256 amount,
        address recipient
    ) external view returns (bytes32) {
        return _hashTypedDataV4(
            ReleaseAuthLib.releaseStructHash(escrowId, milestoneId, reviewNonce, commitHash, amount, recipient)
        );
    }

    /// @inheritdoc IAegisEscrow
    function hashDisputeResolution(uint256 escrowId, uint256 milestoneId, bool approved)
        external
        view
        returns (bytes32)
    {
        Escrow storage esc = _escrows[escrowId];
        Milestone storage ms = _milestone(esc, milestoneId);
        return _hashTypedDataV4(ReleaseAuthLib.disputeStructHash(escrowId, milestoneId, ms.reviewNonce, approved));
    }

    /// @inheritdoc IAegisEscrow
    function hashCancelAuthorization(uint256 escrowId, uint256 sigDeadline) external view returns (bytes32) {
        return _hashTypedDataV4(ReleaseAuthLib.cancelStructHash(escrowId, sigDeadline));
    }

    // ────────────────────────────── Internal ─────────────────────────────

    function _milestone(Escrow storage esc, uint256 milestoneId) internal view returns (Milestone storage) {
        if (milestoneId >= esc.milestones.length) revert MilestoneOutOfRange(milestoneId);
        return esc.milestones[milestoneId];
    }

    function _totalAmount(Escrow storage esc) internal view returns (uint256 total) {
        uint256 count = esc.milestones.length;
        for (uint256 i; i < count; ++i) {
            total += esc.milestones[i].amount;
        }
    }

    /// @dev Escrow completes once every milestone reached a terminal state
    ///      (Approved or Refunded). Rejected is non-terminal: it is resubmittable.
    function _finalizeIfComplete(uint256 escrowId, Escrow storage esc) internal {
        uint256 count = esc.milestones.length;
        for (uint256 i; i < count; ++i) {
            MilestoneState st = esc.milestones[i].state;
            if (st != MilestoneState.Approved && st != MilestoneState.Refunded) return;
        }
        esc.state = EscrowState.Completed;
        emit EscrowCompleted(escrowId);
    }

    function _payout(address token, address to, uint256 amount) internal {
        if (token == address(0)) {
            (bool ok,) = to.call{value: amount}("");
            if (!ok) revert NativeTransferFailed();
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }
}
