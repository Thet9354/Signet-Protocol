// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {AegisEscrow} from "../src/AegisEscrow.sol";

/// @notice Deploys AegisEscrow.
/// @dev    forge script script/Deploy.s.sol --rpc-url base_sepolia --account deployer --broadcast --verify
contract Deploy is Script {
    function run() external returns (AegisEscrow escrow) {
        vm.startBroadcast();
        escrow = new AegisEscrow();
        vm.stopBroadcast();
    }
}
