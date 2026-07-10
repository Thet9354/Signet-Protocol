// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IAegisEscrow
/// @notice Milestone escrow released by 2-of-3 EIP-712 authorization among
///         funder, contributor (ERC-1271 smart account), and an AI oracle key.
interface IAegisEscrow {
    // ─────────────────────────────── Types ───────────────────────────────

    enum EscrowState {
        None,
        Created,
        Funded,
        Completed,
        Cancelled
    }

    enum MilestoneState {
        Pending,
        InReview,
        Approved,
        Disputed,
        Rejected,
        Refunded
    }

    struct MilestoneInput {
        uint128 amount;
        uint40 deadline;
        bytes32 specHash; // keccak256 of the off-chain acceptance rubric
    }

    struct Milestone {
        uint128 amount;
        uint40 deadline;
        uint40 reviewNonce; // increments on every submission; invalidates stale authorizations
        MilestoneState state;
        bytes32 specHash;
        bytes32 commitHash; // exact git commit under review, set on submission
    }

    struct Escrow {
        address funder;
        address contributor; // ERC-7579 smart account (verified via ERC-1271)
        address agentSigner; // KMS-backed attestation key; holds no funds
        address token; // address(0) => native ETH
        uint40 disputeWindow; // grace period after a milestone deadline before funder may reclaim
        EscrowState state;
        bytes32 repoCommitment; // keccak256(abi.encode(githubRepoId, allowedBranch))
        Milestone[] milestones;
    }

    // ─────────────────────────────── Events ──────────────────────────────

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed funder,
        address indexed contributor,
        address agentSigner,
        address token,
        bytes32 repoCommitment
    );
    event EscrowFunded(uint256 indexed escrowId, address token, uint256 totalAmount);
    event MilestoneSubmitted(
        uint256 indexed escrowId,
        uint256 indexed milestoneId,
        uint40 reviewNonce,
        bytes32 commitHash,
        string artifactURI
    );
    event MilestoneApproved(
        uint256 indexed escrowId, uint256 indexed milestoneId, bytes32 commitHash, uint256 amount, address[] signers
    );
    event DisputeRaised(uint256 indexed escrowId, uint256 indexed milestoneId, address indexed raisedBy);
    event DisputeResolved(uint256 indexed escrowId, uint256 indexed milestoneId, bool approved);
    event MilestoneRefunded(uint256 indexed escrowId, uint256 indexed milestoneId, uint256 amount);
    event EscrowCompleted(uint256 indexed escrowId);
    event EscrowCancelled(uint256 indexed escrowId, uint256 refundedAmount);

    // ─────────────────────────────── Errors ──────────────────────────────

    error InvalidEscrowState(EscrowState actual);
    error InvalidMilestoneState(MilestoneState actual);
    error UnauthorizedCaller(address caller);
    error BadSignatureCount();
    error DuplicateSigner(address signer);
    error InvalidSigner(address signer);
    error InvalidSignature(address signer);
    error DeadlineNotElapsed(uint256 reclaimableAt);
    error SignatureExpired(uint256 sigDeadline);
    error FundingMismatch(uint256 expected, uint256 provided);
    error MilestoneOutOfRange(uint256 milestoneId);
    error NoMilestones();
    error ZeroAmount();
    error ZeroAddress();
    error ZeroCommitHash();
    error SignersNotDistinct();
    error NativeTransferFailed();

    // ────────────────────────────── Lifecycle ────────────────────────────

    function createEscrow(
        address contributor,
        address agentSigner,
        address token,
        uint40 disputeWindow,
        bytes32 repoCommitment,
        MilestoneInput[] calldata milestones
    ) external returns (uint256 escrowId);

    function fund(uint256 escrowId) external payable;

    function cancelUnfunded(uint256 escrowId) external;

    function submitMilestone(uint256 escrowId, uint256 milestoneId, bytes32 commitHash, string calldata artifactURI)
        external;

    /// @notice Permissionlessly executable: validity derives from signatures, not sender.
    function approveMilestone(
        uint256 escrowId,
        uint256 milestoneId,
        address[] calldata signers,
        bytes[] calldata signatures
    ) external;

    function raiseDispute(uint256 escrowId, uint256 milestoneId) external;

    /// @notice Requires BOTH human parties — the AI oracle has no vote in dispute resolution.
    function resolveDispute(
        uint256 escrowId,
        uint256 milestoneId,
        bool approved,
        bytes calldata funderSignature,
        bytes calldata contributorSignature
    ) external;

    function reclaimExpired(uint256 escrowId, uint256 milestoneId) external;

    function cancelByMutualConsent(
        uint256 escrowId,
        uint256 sigDeadline,
        bytes calldata funderSignature,
        bytes calldata contributorSignature
    ) external;

    // ─────────────────────────────── Views ───────────────────────────────

    function getEscrow(uint256 escrowId) external view returns (Escrow memory);

    function getMilestone(uint256 escrowId, uint256 milestoneId) external view returns (Milestone memory);

    /// @notice Digest for the milestone's CURRENT review round, from storage.
    function hashReleaseAuthorization(uint256 escrowId, uint256 milestoneId) external view returns (bytes32);

    /// @notice Raw-parameter digest, for off-chain signers (relayer/frontend) and differential tests.
    function computeReleaseDigest(
        uint256 escrowId,
        uint256 milestoneId,
        uint40 reviewNonce,
        bytes32 commitHash,
        uint256 amount,
        address recipient
    ) external view returns (bytes32);

    function hashDisputeResolution(uint256 escrowId, uint256 milestoneId, bool approved) external view returns (bytes32);

    function hashCancelAuthorization(uint256 escrowId, uint256 sigDeadline) external view returns (bytes32);
}
