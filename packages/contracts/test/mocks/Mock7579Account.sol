// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AegisAutoApproveValidator} from "../../src/modules/AegisAutoApproveValidator.sol";

/// @notice Minimal ERC-7579-shaped smart account for module unit tests:
///         routes ERC-1271 checks to a single installed validator and lets its
///         owner execute arbitrary calls (createEscrow, fund, setPolicy, …).
///         Production integration uses ModuleKit against real Kernel/Safe7579.
contract Mock7579Account {
    address public immutable owner;
    AegisAutoApproveValidator public validator;

    constructor(address owner_) {
        owner = owner_;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    function installModule(AegisAutoApproveValidator module, bytes calldata initData) external onlyOwner {
        validator = module;
        module.onInstall(initData);
    }

    function execute(address target, uint256 value, bytes calldata data) external onlyOwner returns (bytes memory) {
        (bool ok, bytes memory result) = target.call{value: value}(data);
        if (!ok) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
        return result;
    }

    /// @dev ERC-1271 entrypoint — forwards to the installed validator, as
    ///      Kernel v3 does for its active validator.
    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4) {
        if (address(validator) == address(0)) return bytes4(0xffffffff);
        return validator.isValidSignatureWithSender(msg.sender, hash, signature);
    }

    receive() external payable {}
}
