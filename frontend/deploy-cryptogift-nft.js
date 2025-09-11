// Deploy CryptoGiftNFT usando ThirdWeb v5
const { createThirdwebClient, deployContract } = require("thirdweb");
const { baseSepolia } = require("thirdweb/chains");
const { privateKeyToAccount } = require("thirdweb/wallets");
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function deployCryptoGiftNFT() {
  console.log("🚀 DEPLOYING CryptoGiftNFT usando ThirdWeb v5");
  console.log("===============================================");

  try {
    // Configurar cliente ThirdWeb
    const client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID,
      secretKey: process.env.TW_SECRET_KEY,
    });

    // Configurar cuenta del deployer
    const account = privateKeyToAccount({
      client,
      privateKey: process.env.PRIVATE_KEY_DEPLOY,
    });

    console.log("📝 Deployer account:", account.address);
    console.log("📝 Network: Base Sepolia");
    console.log("📝 Chain ID: 84532");

    // Leer el bytecode del contrato compilado
    console.log("🔍 Reading contract bytecode...");
    
    // Para ThirdWeb v5, necesitamos el ABI y bytecode
    const contractSource = `
      // SPDX-License-Identifier: MIT
      pragma solidity ^0.8.0;

      import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
      import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
      import "@openzeppelin/contracts/access/Ownable.sol";
      import "@openzeppelin/contracts/utils/Counters.sol";

      contract CryptoGiftNFT is ERC721, ERC721URIStorage, Ownable {
          using Counters for Counters.Counter;
          
          Counters.Counter private _tokenIdCounter;
          string private _contractURI;
          
          event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI);
          
          constructor(
              string memory name,
              string memory symbol,
              string memory contractURI_,
              address owner
          ) ERC721(name, symbol) {
              _contractURI = contractURI_;
              _transferOwnership(owner);
              _tokenIdCounter.increment();
          }
          
          function mintTo(address to, string memory uri) public onlyOwner returns (uint256) {
              uint256 tokenId = _tokenIdCounter.current();
              _tokenIdCounter.increment();
              
              _safeMint(to, tokenId);
              _setTokenURI(tokenId, uri);
              
              emit NFTMinted(to, tokenId, uri);
              return tokenId;
          }
          
          function getCurrentTokenId() public view returns (uint256) {
              return _tokenIdCounter.current();
          }
          
          function totalSupply() public view returns (uint256) {
              return _tokenIdCounter.current() - 1;
          }
          
          function contractURI() public view returns (string memory) {
              return _contractURI;
          }
          
          function setContractURI(string memory contractURI_) public onlyOwner {
              _contractURI = contractURI_;
          }
          
          function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
              super._burn(tokenId);
          }
          
          function tokenURI(uint256 tokenId) 
              public 
              view 
              override(ERC721, ERC721URIStorage) 
              returns (string memory) 
          {
              return super.tokenURI(tokenId);
          }
          
          function supportsInterface(bytes4 interfaceId) 
              public 
              view 
              override(ERC721, ERC721URIStorage) 
              returns (bool) 
          {
              return super.supportsInterface(interfaceId);
          }
      }
    `;

    // Para ThirdWeb v5, usamos un approach diferente
    console.log("🔍 Using ThirdWeb Dashboard deployment...");
    console.log("");
    console.log("📋 MANUAL DEPLOYMENT REQUIRED:");
    console.log("================================");
    console.log("1. Ve a: https://thirdweb.com/dashboard");
    console.log("2. Conecta tu wallet:", account.address);
    console.log("3. Crea nuevo contrato: NFT Collection");
    console.log("4. Configura:");
    console.log("   - Name: CryptoGift Wallets");
    console.log("   - Symbol: CGIFT");
    console.log("   - Network: Base Sepolia");
    console.log("   - Owner: " + account.address);
    console.log("");
    console.log("📝 ALTERNATIVE: Usar ThirdWeb CLI");
    console.log("================================");
    console.log("cd /mnt/c/Users/rafae/cryptogift-wallets");
    console.log("npx thirdweb deploy --chain base-sepolia");
    console.log("");

    // Mientras tanto, vamos a crear un contrato de prueba usando directamente ethers
    console.log("🔧 Creating test deployment script...");
    
    const { ethers } = require("ethers");
    
    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY_DEPLOY, provider);
    
    console.log("💰 Checking deployer balance...");
    const balance = await provider.getBalance(wallet.address);
    console.log("📝 Balance:", ethers.formatEther(balance), "ETH");
    
    if (balance === 0n) {
      throw new Error("Insufficient ETH for deployment. Need ETH for gas fees.");
    }

    console.log("✅ Ready for deployment");
    console.log("📝 Deployer has sufficient ETH");

    // Por ahora, devolvemos la información para deployment manual
    return {
      success: true,
      deployerAddress: account.address,
      network: "Base Sepolia",
      chainId: 84532,
      balance: ethers.formatEther(balance),
      nextSteps: [
        "Use ThirdWeb Dashboard to deploy NFT Collection",
        "Set name: CryptoGift Wallets", 
        "Set symbol: CGIFT",
        "Set owner: " + account.address,
        "Update .env.local with new contract address"
      ]
    };

  } catch (error) {
    console.error("❌ Deployment preparation failed:", error.message);
    throw error;
  }
}

// Ejecutar
if (require.main === module) {
  deployCryptoGiftNFT()
    .then((result) => {
      console.log("\n🎯 DEPLOYMENT PREPARATION COMPLETE:", result);
    })
    .catch((error) => {
      console.error("💥 Error:", error.message);
    });
}

module.exports = { deployCryptoGiftNFT };