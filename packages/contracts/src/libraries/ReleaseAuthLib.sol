// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title ReleaseAuthLib
/// @notice EIP-712 struct hashing for every off-chain authorization Aegis accepts.
///         Kept in one library so the relayer, frontend, and tests share a single
///         canonical encoding (mirrored in packages/shared/src/eip712.ts).
library ReleaseAuthLib {
    bytes32 internal constant RELEASE_AUTH_TYPEHASH = keccak256(
        "ReleaseAuthorization(uint256 escrowId,uint256 milestoneId,uint40 reviewNonce,bytes32 commitHash,uint256 amount,address recipient)"
    );

    bytes32 internal constant DISPUTE_RESOLUTION_TYPEHASH =
        keccak256("DisputeResolution(uint256 escrowId,uint256 milestoneId,uint40 reviewNonce,bool approved)");

    bytes32 internal constant CANCEL_TYPEHASH = keccak256("CancelAuthorization(uint256 escrowId,uint256 sigDeadline)");

    function releaseStructHash(
        uint256 escrowId,
        uint256 milestoneId,
        uint40 reviewNonce,
        bytes32 commitHash,
        uint256 amount,
        address recipient
    ) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(RELEASE_AUTH_TYPEHASH, escrowId, milestoneId, reviewNonce, commitHash, amount, recipient)
        );
    }

    function disputeStructHash(uint256 escrowId, uint256 milestoneId, uint40 reviewNonce, bool approved)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(DISPUTE_RESOLUTION_TYPEHASH, escrowId, milestoneId, reviewNonce, approved));
    }

    function cancelStructHash(uint256 escrowId, uint256 sigDeadline) internal pure returns (bytes32) {
        return keccak256(abi.encode(CANCEL_TYPEHASH, escrowId, sigDeadline));
    }
}
