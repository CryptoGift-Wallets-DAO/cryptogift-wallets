// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";

contract DeployForwarder is Script {
    
    function run() external {
        string memory pkHex = vm.envString("PRIVATE_KEY_DEPLOY");
        uint256 deployerPrivateKey = vm.parseUint(pkHex);
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== ERC2771FORWARDER DEPLOYMENT ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("Balance:", deployer.balance / 1e18, "ETH");
        
        require(block.chainid == 84532, "Must deploy on Base Sepolia");
        require(deployer.balance > 0.005 ether, "Insufficient balance for deployment");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying ERC2771Forwarder...");
        ERC2771Forwarder forwarder = new ERC2771Forwarder("GiftEscrowForwarder");
        
        console.log("Forwarder deployed at:", address(forwarder));
        
        vm.stopBroadcast();
        
        console.log("\n=== FORWARDER DEPLOYMENT COMPLETE ===");
        console.log("TRUSTED_FORWARDER =", address(forwarder));
        console.log("Update script with this address and redeploy GiftEscrow");
    }
}