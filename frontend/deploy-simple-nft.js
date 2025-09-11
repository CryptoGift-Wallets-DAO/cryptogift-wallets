// Script para desplegar contrato NFT simple usando Hardhat/ethers
const { ethers } = require("ethers");
require('dotenv').config({ path: '.env.local' });

// ABI simplificado del contrato CryptoGiftNFT
const CONTRACT_ABI = [
  "constructor(address initialOwner)",
  "function mintTo(address to, string memory uri) public returns (uint256)",
  "function getCurrentTokenId() public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function name() public view returns (string)",
  "function symbol() public view returns (string)",
  "function owner() public view returns (address)"
];

// Bytecode del contrato (esto sería generado por el compilador Solidity)
// Por simplicidad, vamos a usar un contrato de ThirdWeb pre-desplegado
const THIRDWEB_NFT_COLLECTION = "NFTCollection";

async function deploySimpleNFT() {
  console.log("🚀 Desplegando contrato NFT simple...");
  
  try {
    // Configurar provider
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL || "https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e"
    );
    
    // Configurar wallet
    const privateKey = process.env.PRIVATE_KEY_DEPLOY;
    if (!privateKey) {
      throw new Error("PRIVATE_KEY_DEPLOY not found in environment");
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log("📝 Deployer wallet:", wallet.address);
    
    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log("💰 Wallet balance:", ethers.formatEther(balance), "ETH");
    
    if (balance === 0n) {
      throw new Error("Wallet has no ETH for gas fees");
    }
    
    // NUEVA ESTRATEGIA: Usar ThirdWeb para crear un contrato simple
    console.log("🔧 NUEVA ESTRATEGIA: Crear contrato NFT usando interfaz ThirdWeb");
    console.log("🌐 Ve a: https://thirdweb.com/explore/nft-collection");
    console.log("📋 Parámetros sugeridos:");
    console.log("  - Name: CryptoGift NFT-Wallets");
    console.log("  - Symbol: CGNFT");
    console.log("  - Network: Base Sepolia");
    console.log("  - Primary Sale Recipient:", wallet.address);
    console.log("  - Royalty Fee: 0%");
    console.log("  - Platform Fee: 0%");
    
    // Mostrar qué hacer después
    console.log("\n📝 PASOS A SEGUIR:");
    console.log("1. Ve a ThirdWeb Dashboard");
    console.log("2. Conecta wallet con dirección:", wallet.address);
    console.log("3. Crea nuevo NFT Collection contract");
    console.log("4. Copia la dirección del contrato desplegado");
    console.log("5. Actualiza NEXT_PUBLIC_NFT_DROP_ADDRESS en .env.local");
    
    // Verificar si ya existe un contrato configurado
    const existingContract = process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS;
    if (existingContract && existingContract !== "0x8DfCAfB320cBB7bcdbF4cc83A62bccA08B30F5D3") {
      console.log("\n✅ Ya tienes un contrato configurado:", existingContract);
      console.log("🔗 ThirdWeb Dashboard:", `https://thirdweb.com/base-sepolia/${existingContract}`);
      
      // Probar el contrato existente
      try {
        const contractCode = await provider.getCode(existingContract);
        if (contractCode !== "0x") {
          console.log("✅ Contrato verificado en blockchain");
          return existingContract;
        } else {
          console.log("❌ Contrato no encontrado en blockchain");
        }
      } catch (error) {
        console.log("❌ Error verificando contrato:", error.message);
      }
    }
    
    console.log("\n🎯 CREANDO NUEVO CONTRATO...");
    console.log("Como no podemos desplegar directamente, necesitas usar ThirdWeb Dashboard");
    console.log("Dirección sugerida para desplegar:", wallet.address);
    
    return null;
    
  } catch (error) {
    console.error("❌ Error en despliegue:", error);
    throw error;
  }
}

// Test de contrato existente
async function testExistingContract(contractAddress) {
  console.log("🧪 Probando contrato existente:", contractAddress);
  
  try {
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL || "https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e"
    );
    
    // Verificar que el contrato existe
    const code = await provider.getCode(contractAddress);
    if (code === "0x") {
      throw new Error("Contract not found on blockchain");
    }
    
    console.log("✅ Contract exists on blockchain");
    console.log("📝 Contract code length:", code.length);
    
    // Intentar llamadas básicas
    const contract = new ethers.Contract(contractAddress, [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function owner() view returns (address)",
      "function totalSupply() view returns (uint256)"
    ], provider);
    
    try {
      const name = await contract.name();
      console.log("✅ Contract name:", name);
    } catch (e) {
      console.log("⚠️ Could not read name:", e.message);
    }
    
    try {
      const symbol = await contract.symbol();
      console.log("✅ Contract symbol:", symbol);
    } catch (e) {
      console.log("⚠️ Could not read symbol:", e.message);
    }
    
    try {
      const owner = await contract.owner();
      console.log("✅ Contract owner:", owner);
    } catch (e) {
      console.log("⚠️ Could not read owner:", e.message);
    }
    
    return true;
  } catch (error) {
    console.error("❌ Contract test failed:", error.message);
    return false;
  }
}

// Solo ejecutar si se llama directamente
if (require.main === module) {
  deploySimpleNFT()
    .then((address) => {
      if (address) {
        console.log(`\n🎉 ¡Contrato listo!`);
        console.log(`📝 Dirección: ${address}`);
      } else {
        console.log(`\n📋 Usa ThirdWeb Dashboard para crear el contrato`);
      }
    })
    .catch((error) => {
      console.error("💥 Error:", error.message);
      process.exit(1);
    });
}

// Export para usar en otros scripts
module.exports = { deploySimpleNFT, testExistingContract };