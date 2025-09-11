// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/GiftEscrowDeploy.sol";

contract DeploySimple is Script {
    // Base Sepolia Biconomy forwarder
    address constant TRUSTED_FORWARDER = 0x69015912AA33720b842dCD6aC059Ed623F28d9f7;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY_DEPLOY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== GIFTEESCROW DEPLOYMENT ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("Balance:", deployer.balance / 1e18, "ETH");
        
        require(block.chainid == 84532, "Must deploy on Base Sepolia");
        // Comment out balance check for dry run
        // require(deployer.balance > 0.01 ether, "Insufficient balance");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying GiftEscrow...");
        GiftEscrowDeploy escrow = new GiftEscrowDeploy();
        
        console.log("Contract deployed at:", address(escrow));
        console.log("Version:", escrow.VERSION());
        console.log("Immutable:", escrow.IMMUTABLE());
        
        // Skip funding for dry run with zero balance
        if (deployer.balance > 0.5 ether) {
            payable(address(escrow)).transfer(0.5 ether);
            console.log("Contract funded with 0.5 ETH");
        } else {
            console.log("Skipping funding - insufficient balance");
        }
        
        vm.stopBroadcast();
        
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("Update .env.local with:");
        console.log("ESCROW_CONTRACT_ADDRESS=", address(escrow));
        console.log("NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=", address(escrow));
    }
}