
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SimpleApprovalGate.sol";

contract DeployNewApprovalGate is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY_DEPLOY");
        address approver = address(0x75e32B5BA0817fEF917f21902EC5a84005d00943);
        
        vm.startBroadcast(deployerPrivateKey);
        
        SimpleApprovalGate gate = new SimpleApprovalGate(approver);
        
        console.log("NEW SimpleApprovalGate deployed at:", address(gate));
        console.log("Approver address:", approver);
        console.log("Chain ID:", block.chainid);
        
        vm.stopBroadcast();
    }
}
