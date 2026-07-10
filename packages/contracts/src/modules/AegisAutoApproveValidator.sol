// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import {IAegisEscrow} from "../interfaces/IAegisEscrow.sol";

/// @title AegisAutoApproveValidator
/// @notice ERC-7579 validator module — "autonomous treasury policy" for funders.
///
///         Installed on a funder's ERC-7579 smart account, it makes the
///         account's ERC-1271 check accept an AegisEscrow release digest IFF:
///           1. the account itself is the funder of the escrow,
///           2. the account pre-registered the escrow with a per-release cap,
///           3. the milestone is currently InReview and its amount ≤ cap, and
///           4. the payload carries a valid AI-oracle signature over the digest.
///
///         Effect: for releases under the cap, the funder's 2-of-3 vote is cast
///         programmatically the moment the AI approves — no human tap needed.
///         This is an EXPLICIT, capped delegation of the funder's vote to the
///         oracle: below the cap, the agent's attestation alone completes the
///         threshold (agent signature + this policy). Funders opt in per
///         escrow, bound the exposure with `maxAmount`, and can revoke at any
///         time; above the cap the normal human co-sign path applies.
///
/// @dev    Tested here against a minimal mock account; production integration
///         is validated with Rhinestone ModuleKit against Kernel/Safe7579/Nexus.
contract AegisAutoApproveValidator {
    uint256 internal constant MODULE_TYPE_VALIDATOR = 1;
    bytes4 internal constant ERC1271_MAGIC = 0x1626ba7e;
    bytes4 internal constant ERC1271_INVALID = 0xffffffff;
    uint256 internal constant SIG_VALIDATION_FAILED = 1;

    /// @notice account => escrow contract => per-release cap (0 = not authorized)
    mapping(address account => mapping(address escrow => uint256 maxAmount)) public releaseCap;

    event PolicySet(address indexed account, address indexed escrow, uint256 maxAmount);

    // ─────────────────────────── ERC-7579 module ──────────────────────────

    function onInstall(bytes calldata data) external {
        if (data.length != 0) {
            (address escrow, uint256 maxAmount) = abi.decode(data, (address, uint256));
            _setPolicy(escrow, maxAmount);
        }
    }

    function onUninstall(bytes calldata data) external {
        if (data.length != 0) {
            address escrow = abi.decode(data, (address));
            _setPolicy(escrow, 0);
        }
    }

    function isModuleType(uint256 typeId) external pure returns (bool) {
        return typeId == MODULE_TYPE_VALIDATOR;
    }

    /// @dev Per-escrow config only; any account is always (re)installable.
    function isInitialized(address) external pure returns (bool) {
        return false;
    }

    /// @notice Called by the smart account (msg.sender). Adjust or revoke a policy.
    function setPolicy(address escrow, uint256 maxAmount) external {
        _setPolicy(escrow, maxAmount);
    }

    function _setPolicy(address escrow, uint256 maxAmount) internal {
        releaseCap[msg.sender][escrow] = maxAmount;
        emit PolicySet(msg.sender, escrow, maxAmount);
    }

    // ────────────────────────── Signature validation ──────────────────────

    /// @notice ERC-7579 validator hook for ERC-1271 flows. The account forwards
    ///         `isValidSignature(hash, signature)` here; `signature` encodes
    ///         (escrow, escrowId, milestoneId, agentSignature).
    /// @dev    Every check reads live escrow state — a resubmission (reviewNonce
    ///         bump) or state transition invalidates the authorization because
    ///         the recomputed digest no longer matches `hash`.
    function isValidSignatureWithSender(address, bytes32 hash, bytes calldata signature)
        external
        view
        returns (bytes4)
    {
        (address escrowAddr, uint256 escrowId, uint256 milestoneId, bytes memory agentSig) =
            abi.decode(signature, (address, uint256, uint256, bytes));

        uint256 cap = releaseCap[msg.sender][escrowAddr];
        if (cap == 0) return ERC1271_INVALID;

        IAegisEscrow escrow = IAegisEscrow(escrowAddr);

        // The digest being approved must be exactly the escrow's CURRENT
        // release digest for this milestone.
        if (escrow.hashReleaseAuthorization(escrowId, milestoneId) != hash) return ERC1271_INVALID;

        IAegisEscrow.Escrow memory esc = escrow.getEscrow(escrowId);
        if (esc.funder != msg.sender) return ERC1271_INVALID;

        IAegisEscrow.Milestone memory ms = escrow.getMilestone(escrowId, milestoneId);
        if (ms.state != IAegisEscrow.MilestoneState.InReview) return ERC1271_INVALID;
        if (ms.amount > cap) return ERC1271_INVALID;

        // The AI oracle must have attested to this exact digest.
        (address recovered,,) = ECDSA.tryRecover(hash, agentSig);
        if (recovered == address(0) || recovered != esc.agentSigner) return ERC1271_INVALID;

        return ERC1271_MAGIC;
    }

    /// @dev This module authorizes 1271 approvals only — never UserOperations.
    function validateUserOp(bytes calldata, bytes32) external pure returns (uint256) {
        return SIG_VALIDATION_FAILED;
    }
}
