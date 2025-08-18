// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SimpleApprovalGate.sol";

contract DeployApprovalGate is Script {
    function run() external {
        // Get deployer private key from env
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY_DEPLOY");
        address approver = vm.envOr("APPROVER_ADDRESS", address(0x1dBa3F54F9ef623b94398D96323B6a27F2A7b37B));
        
        // Start broadcast
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy contract
        SimpleApprovalGate gate = new SimpleApprovalGate(approver);
        
        // Log deployment info
        console.log("SimpleApprovalGate deployed at:", address(gate));
        console.log("Approver address:", approver);
        console.log("Chain ID:", block.chainid);
        
        vm.stopBroadcast();
    }
}