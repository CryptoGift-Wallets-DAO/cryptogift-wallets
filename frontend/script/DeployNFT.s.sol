// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/CryptoGiftNFT.sol";

contract DeployNFT is Script {
    function run() external returns (CryptoGiftNFT) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY_DEPLOY");
        address deployerAddress = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the NFT contract with the deployer as initial owner
        CryptoGiftNFT nft = new CryptoGiftNFT(deployerAddress);
        
        vm.stopBroadcast();
        
        console.log("CryptoGiftNFT deployed to:", address(nft));
        console.log("Owner:", nft.owner());
        console.log("Name:", nft.name());
        console.log("Symbol:", nft.symbol());
        
        return nft;
    }
}