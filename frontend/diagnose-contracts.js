// DIAGNÓSTICO REAL DE CONTRATOS - Sin especulaciones
const { createThirdwebClient, getContract, readContract } = require("thirdweb");
const { baseSepolia } = require("thirdweb/chains");
const { ethers } = require("ethers");
require('dotenv').config({ path: '.env.local' });

async function diagnoseContracts() {
  console.log("🔍 DIAGNÓSTICO REAL DE CONTRATOS");
  console.log("================================");
  
  // Configurar provider directo (sin ThirdWeb)
  const provider = new ethers.JsonRpcProvider(
    process.env.NEXT_PUBLIC_RPC_URL || "https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e"
  );
  
  const contracts = [
    { name: "playerNFT", address: "0x8DfCAfB320cBB7bcdbF4cc83A62bccA08B30F5D3" },
    { name: "playerTOKEN", address: "0xeFCba1D72B8f053d93BA44b7b15a1BeED515C89b" },
    { name: "ERC6551Registry", address: "0x3cB823E40359B9698b942547D9d2241d531f2708" },
    { name: "ERC6551Account", address: "0x60883bD1549CD618691EE38D838d131d304f2664" },
  ];
  
  for (const contract of contracts) {
    console.log(`\n🔍 ANALIZANDO ${contract.name}: ${contract.address}`);
    console.log("=".repeat(50));
    
    try {
      // 1. Verificar que el contrato existe
      const code = await provider.getCode(contract.address);
      if (code === "0x") {
        console.log("❌ CONTRATO NO EXISTE EN BLOCKCHAIN");
        continue;
      }
      console.log("✅ Contrato existe en blockchain");
      console.log(`📏 Código length: ${code.length} bytes`);
      
      // 2. Probar métodos específicos según el tipo
      if (contract.name === "playerNFT" || contract.name === "playerTOKEN") {
        await testNFTContract(provider, contract.address);
      } else if (contract.name === "ERC6551Registry") {
        await testRegistryContract(provider, contract.address);
      } else if (contract.name === "ERC6551Account") {
        await testAccountContract(provider, contract.address);
      }
      
    } catch (error) {
      console.log(`❌ Error analizando ${contract.name}:`, error.message);
    }
  }
  
  // 3. Verificar permisos del deployer
  console.log(`\n🔍 VERIFICANDO PERMISOS DEL DEPLOYER`);
  console.log("=".repeat(50));
  const deployerAddress = "0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a";
  console.log(`📝 Deployer address: ${deployerAddress}`);
  
  try {
    const balance = await provider.getBalance(deployerAddress);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance === 0n) {
      console.log("❌ SIN ETH PARA GAS - ESTE ES EL PROBLEMA");
    } else {
      console.log("✅ Tiene ETH para gas");
    }
  } catch (error) {
    console.log("❌ Error verificando balance:", error.message);
  }
}

// Probar métodos específicos de NFT
async function testNFTContract(provider, address) {
  console.log("📋 Probando métodos NFT...");
  
  // ABI mínimo para probar métodos comunes
  const nftABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function owner() view returns (address)",
    "function totalSupply() view returns (uint256)",
    "function mintTo(address to, string memory uri) public returns (uint256)",
    "function claim(address to, uint256 quantity, address currency, uint256 pricePerToken, (bytes32[],uint256,uint256,address) allowlistProof, bytes data) payable",
    "function supportsInterface(bytes4 interfaceId) view returns (bool)"
  ];
  
  const contract = new ethers.Contract(address, nftABI, provider);
  
  // Probar métodos de lectura
  const readMethods = [
    { name: "name", args: [] },
    { name: "symbol", args: [] },
    { name: "owner", args: [] },
    { name: "totalSupply", args: [] },
    { name: "supportsInterface", args: ["0x80ac58cd"] } // ERC721
  ];
  
  for (const method of readMethods) {
    try {
      const result = await contract[method.name](...method.args);
      console.log(`✅ ${method.name}(): ${result}`);
    } catch (error) {
      console.log(`❌ ${method.name}(): ${error.message.split('\n')[0]}`);
    }
  }
}

// Probar métodos del Registry
async function testRegistryContract(provider, address) {
  console.log("📋 Probando métodos ERC6551Registry...");
  
  const registryABI = [
    "function createAccount(address implementation, uint256 chainId, address tokenContract, uint256 tokenId, uint256 salt, bytes calldata initData) external returns (address)",
    "function account(address implementation, uint256 chainId, address tokenContract, uint256 tokenId, uint256 salt) external view returns (address)"
  ];
  
  const contract = new ethers.Contract(address, registryABI, provider);
  
  // Probar método de lectura
  try {
    const testAccount = await contract.account(
      "0x60883bD1549CD618691EE38D838d131d304f2664", // implementation
      84532, // chainId
      "0x8DfCAfB320cBB7bcdbF4cc83A62bccA08B30F5D3", // tokenContract
      1, // tokenId
      0 // salt
    );
    console.log(`✅ account() method works: ${testAccount}`);
  } catch (error) {
    console.log(`❌ account(): ${error.message.split('\n')[0]}`);
  }
}

// Probar métodos del Account
async function testAccountContract(provider, address) {
  console.log("📋 Probando métodos ERC6551Account...");
  
  const accountABI = [
    "function owner() view returns (address)",
    "function token() view returns (uint256, address, uint256)",
    "function state() view returns (uint256)",
    "function supportsInterface(bytes4 interfaceId) view returns (bool)"
  ];
  
  const contract = new ethers.Contract(address, accountABI, provider);
  
  const readMethods = [
    { name: "supportsInterface", args: ["0x6faff5f1"] }, // ERC6551Account interface
    { name: "state", args: [] }
  ];
  
  for (const method of readMethods) {
    try {
      const result = await contract[method.name](...method.args);
      console.log(`✅ ${method.name}(): ${result}`);
    } catch (error) {
      console.log(`❌ ${method.name}(): ${error.message.split('\n')[0]}`);
    }
  }
}

// Ejecutar diagnóstico
if (require.main === module) {
  diagnoseContracts()
    .then(() => {
      console.log("\n🎯 DIAGNÓSTICO COMPLETADO");
      console.log("========================");
    })
    .catch((error) => {
      console.error("💥 Error en diagnóstico:", error);
    });
}

module.exports = { diagnoseContracts };