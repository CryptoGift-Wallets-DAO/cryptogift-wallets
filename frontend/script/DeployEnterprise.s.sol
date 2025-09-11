// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/GiftEscrow.sol";

contract DeployEnterprise is Script {
    // Base Sepolia OpenZeppelin ERC2771Forwarder (NUEVO)
    address constant TRUSTED_FORWARDER = 0x8e7975c85a3cD434918D15C3461c620B0400FFf9;
    
    function run() external {
        string memory pkHex = vm.envString("PRIVATE_KEY_DEPLOY");
        uint256 deployerPrivateKey = vm.parseUint(pkHex);
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== GIFTESCROW ENTERPRISE DEPLOYMENT ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("Balance:", deployer.balance / 1e18, "ETH");
        console.log("Trusted Forwarder:", TRUSTED_FORWARDER);
        
        require(block.chainid == 84532, "Must deploy on Base Sepolia");
        require(deployer.balance > 0.005 ether, "Insufficient balance for deployment");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying GiftEscrow Enterprise...");
        GiftEscrowEnterprise escrow = new GiftEscrowEnterprise(TRUSTED_FORWARDER);
        
        console.log("Contract deployed at:", address(escrow));
        console.log("Version:", escrow.VERSION());
        console.log("Immutable:", escrow.IMMUTABLE());
        
        // Verify contract features
        console.log("Checking enterprise features...");
        console.log("PAUSER_ROLE:", vm.toString(escrow.PAUSER_ROLE()));
        console.log("EMERGENCY_ROLE:", vm.toString(escrow.EMERGENCY_ROLE()));
        console.log("GATE_MANAGER_ROLE:", vm.toString(escrow.GATE_MANAGER_ROLE()));
        console.log("MAX_ATTEMPTS:", escrow.MAX_ATTEMPTS());
        console.log("GATE_GAS_LIMIT:", escrow.GATE_GAS_LIMIT());
        
        // Fund contract for incentives if deployer has sufficient balance
        if (deployer.balance > 1 ether) {
            payable(address(escrow)).transfer(0.5 ether);
            console.log("Contract funded with 0.5 ETH");
        } else {
            console.log("Skipping funding - insufficient balance");
        }
        
        vm.stopBroadcast();
        
        console.log("\n=== ENTERPRISE DEPLOYMENT COMPLETE ===");
        console.log("Update .env.local with:");
        console.log("ESCROW_CONTRACT_ADDRESS=", address(escrow));
        console.log("NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=", address(escrow));
        console.log("\nNext steps:");
        console.log("1. Run smoke tests");
        console.log("2. Set up monitoring");
        console.log("3. Configure paymaster");
        console.log("4. Update frontend");
    }
}