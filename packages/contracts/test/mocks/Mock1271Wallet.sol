// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @notice Minimal ERC-1271 smart wallet standing in for the contributor's
///         ERC-7579 account in unit tests: valid iff the payload was signed
///         by the wallet's owner key.
contract Mock1271Wallet is IERC1271 {
    address public immutable owner;

    constructor(address owner_) {
        owner = owner_;
    }

    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4) {
        (address recovered,,) = ECDSA.tryRecover(hash, signature);
        return recovered == owner && recovered != address(0) ? bytes4(0x1626ba7e) : bytes4(0xffffffff);
    }

    receive() external payable {}
}
