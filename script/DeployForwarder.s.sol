// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";

/**
 * @title Deploy ERC2771Forwarder for Base Sepolia
 * @dev Deploys OpenZeppelin ERC2771Forwarder for gasless transactions
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */
contract DeployForwarder is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY_DEPLOY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying ERC2771Forwarder for Base Sepolia...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        
        ERC2771Forwarder forwarder = new ERC2771Forwarder("GiftEscrowForwarder");
        
        console.log("ERC2771Forwarder deployed to:", address(forwarder));
        
        // Verify forwarder functionality
        address deployer = vm.addr(deployerPrivateKey);
        uint256 nonce = forwarder.nonces(deployer);
        console.log("Deployer nonce:", nonce);
        
        vm.stopBroadcast();
        
        console.log("=== FORWARDER DEPLOYMENT SUMMARY ===");
        console.log("Contract: ERC2771Forwarder");
        console.log("Address:", address(forwarder));
        console.log("Network: Base Sepolia (84532)");
        console.log("Name: GiftEscrowForwarder");
        console.log("====================================");
    }
}