// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {AegisEscrow} from "../src/AegisEscrow.sol";
import {TestUSDC} from "../test/mocks/TestUSDC.sol";

/// @notice Testnet deploy: AegisEscrow + a TestUSDC faucet token (minted to the
///         deployer) so the funder can create USDC escrows without a token
///         faucet. For a real-USDC demo, skip TestUSDC and use Circle's Base
///         Sepolia USDC at 0x036CbD53842c5426634e7929541eC2318f3dCF7e.
///
///   forge script script/DeployTestnet.s.sol \
///     --rpc-url base_sepolia --account deployer --broadcast --verify -vvv
contract DeployTestnet is Script {
    function run() external returns (AegisEscrow escrow, TestUSDC usdc) {
        vm.startBroadcast();
        escrow = new AegisEscrow();
        usdc = new TestUSDC();
        vm.stopBroadcast();

        console.log("AegisEscrow deployed:", address(escrow));
        console.log("TestUSDC deployed:   ", address(usdc));
        console.log("Deployer tUSDC balance:", usdc.balanceOf(msg.sender));
        console.log("");
        console.log("Set in packages/web/.env.local:");
        console.log("  NEXT_PUBLIC_CHAIN_ID=84532");
        console.log("  NEXT_PUBLIC_RPC_URL=https://sepolia.base.org");
        console.log(string.concat("  NEXT_PUBLIC_ESCROW_ADDRESS=", vm.toString(address(escrow))));
    }
}
