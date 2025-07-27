// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import "../contracts/GiftEscrowV2.sol";

/**
 * @title Deploy GiftEscrow Enterprise V2
 * @dev Deploys GiftEscrowEnterpriseV2 with registerGiftMinted for zero-custody architecture
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */
contract DeployEnterpriseV2 is Script {
    // Base Sepolia forwarder - NEWLY DEPLOYED CORRECT FORWARDER
    address public constant TRUSTED_FORWARDER = 0x51363999497B813063eBe367f1f2875569a1ef4E;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY_DEPLOY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying GiftEscrowEnterpriseV2...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Trusted Forwarder:", TRUSTED_FORWARDER);
        
        GiftEscrowEnterpriseV2 escrow = new GiftEscrowEnterpriseV2(TRUSTED_FORWARDER);
        
        console.log("GiftEscrowEnterpriseV2 deployed to:", address(escrow));
        
        // Verify initial state
        console.log("Version:", escrow.VERSION());
        console.log("Gift Counter:", escrow.giftCounter());
        console.log("Trusted Forwarder:", escrow.trustedForwarder());
        console.log("Paused:", escrow.paused());
        
        // Verify admin roles
        address deployer = vm.addr(deployerPrivateKey);
        console.log("Has DEFAULT_ADMIN_ROLE:", escrow.hasRole(escrow.DEFAULT_ADMIN_ROLE(), deployer));
        console.log("Has MINTER_ROLE:", escrow.hasRole(escrow.MINTER_ROLE(), deployer));
        console.log("Has PAUSER_ROLE:", escrow.hasRole(escrow.PAUSER_ROLE(), deployer));
        
        vm.stopBroadcast();
        
        console.log("=== DEPLOYMENT SUMMARY ===");
        console.log("Contract: GiftEscrowEnterpriseV2");
        console.log("Address:", address(escrow));
        console.log("Network: Base Sepolia (84532)");
        console.log("Version: 2.0.0");
        console.log("Zero Custody: ENABLED");
        console.log("registerGiftMinted: AVAILABLE");
        console.log("=========================");
    }
}