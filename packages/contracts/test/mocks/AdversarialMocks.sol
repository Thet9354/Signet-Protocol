// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";

import {AegisEscrow} from "../../src/AegisEscrow.sol";

/// @notice ERC-1271 wallet whose owner can be swapped — models a contributor
///         smart account rotating its signer after a signature was issued.
contract MutableOwner1271Wallet is IERC1271 {
    address public owner;

    constructor(address owner_) {
        owner = owner_;
    }

    function setOwner(address newOwner) external {
        owner = newOwner;
    }

    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4) {
        (address recovered,,) = ECDSA.tryRecover(hash, signature);
        return recovered == owner && recovered != address(0) ? bytes4(0x1626ba7e) : bytes4(0xffffffff);
    }

    receive() external payable {}
}

/// @notice ERC-1271 wallet that approves everything but returns a wrong magic value.
contract WrongMagic1271Wallet is IERC1271 {
    function isValidSignature(bytes32, bytes calldata) external pure returns (bytes4) {
        return 0xdeadbeef;
    }

    receive() external payable {}
}

/// @notice Contract with no payable path — an ETH recipient that always reverts.
contract RevertingReceiver {
    // no receive/fallback
}

/// @notice ERC-20 that attempts to re-enter `approveMilestone` during the
///         payout transfer, swallowing the inner revert so the attack outcome
///         is observable instead of aborting the outer call.
contract ReentrantToken is ERC20 {
    AegisEscrow public escrow;
    bytes public reentryCalldata;
    bool public attackAttempted;
    bool public attackSucceeded;

    constructor() ERC20("Reentrant", "REENT") {
        _mint(msg.sender, 1e30);
    }

    function arm(AegisEscrow escrow_, bytes calldata callData) external {
        escrow = escrow_;
        reentryCalldata = callData;
    }

    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);
        // Fire once, on the escrow's outbound payout.
        if (address(escrow) != address(0) && from == address(escrow) && !attackAttempted) {
            attackAttempted = true;
            (bool ok,) = address(escrow).call(reentryCalldata);
            attackSucceeded = ok;
        }
    }
}
