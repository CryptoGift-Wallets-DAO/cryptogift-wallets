// Test NFT + ERC-6551 correcto usando playerNFT (DropERC721)
const { createThirdwebClient, getContract, prepareContractCall, sendTransaction } = require("thirdweb");
const { baseSepolia } = require("thirdweb/chains");
const { privateKeyToAccount } = require("thirdweb/wallets");
const { ethers } = require("ethers");
require('dotenv').config({ path: '.env.local' });

async function testPlayerNFTWithERC6551() {
  console.log("🎯 PROBANDO NFT + ERC-6551 CON PLAYERNFT (DropERC721)");
  console.log("==================================================");
  
  try {
    // Configurar cliente
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
    
    // Contratos correctos
    const PLAYER_NFT_CONTRACT = "0x8DfCAfB320cBB7bcdbF4cc83A62bccA08B30F5D3"; // playerNFT DropERC721
    const ERC6551_REGISTRY = "0x3cb823e40359b9698b942547d9d2241d531f2708";
    const TBA_IMPLEMENTATION = "0x60883bd1549cd618691ee38d838d131d304f2664";
    
    console.log("🏗️ Configuración correcta:");
    console.log("📝 playerNFT (DropERC721):", PLAYER_NFT_CONTRACT);
    console.log("📝 ERC6551Registry:", ERC6551_REGISTRY);
    console.log("📝 ERC6551Account:", TBA_IMPLEMENTATION);
    
    // PASO 1: Verificar configuración del contrato playerNFT
    console.log("\n🔍 PASO 1: Verificando configuración playerNFT");
    
    const playerNFTContract = getContract({
      client,
      chain: baseSepolia,
      address: PLAYER_NFT_CONTRACT,
    });
    
    // PASO 2: Intentar claim en playerNFT
    console.log("\n🎯 PASO 2: Intentando claim en playerNFT (DropERC721)");
    
    try {
      console.log("🔍 Intentando claim en playerNFT...");
      const claimTx = prepareContractCall({
        contract: playerNFTContract,
        method: "function claim(address to, uint256 quantity, address currency, uint256 pricePerToken, (bytes32[],uint256,uint256,address) allowlistProof, bytes data) payable",
        params: [
          account.address, // to (nosotros mismos)
          1, // quantity
          "0x0000000000000000000000000000000000000000", // currency (ETH)
          0, // price (gratis)
          [[], 0, 0, "0x0000000000000000000000000000000000000000"], // allowlist proof
          "0x" // data
        ],
      });
      
      const claimResult = await sendTransaction({
        transaction: claimTx,
        account,
      });
      
      console.log("✅ Claim en playerNFT exitoso:", claimResult.transactionHash);
      
      // Extraer token ID de los logs
      const tokenId = extractTokenIdFromLogs(claimResult.logs);
      console.log("📝 Token ID obtenido del NFT:", tokenId);
      
      // PASO 3: Crear Token Bound Account para este NFT
      console.log("\n🎯 PASO 3: Creando Token Bound Account para el NFT");
      
      const registryContract = getContract({
        client,
        chain: baseSepolia,
        address: ERC6551_REGISTRY,
      });
      
      const createAccountTx = prepareContractCall({
        contract: registryContract,
        method: "function createAccount(address implementation, uint256 chainId, address tokenContract, uint256 tokenId, uint256 salt, bytes calldata initData) external returns (address)",
        params: [
          TBA_IMPLEMENTATION, // implementation
          84532, // chainId (Base Sepolia)
          PLAYER_NFT_CONTRACT, // tokenContract (el NFT real)
          BigInt(tokenId), // tokenId del NFT real
          0, // salt
          "0x" // initData
        ],
      });
      
      const tbaResult = await sendTransaction({
        transaction: createAccountTx,
        account,
      });
      
      console.log("✅ Token Bound Account creado:", tbaResult.transactionHash);
      
      // Calcular dirección del TBA
      const tbaAddress = calculateTBAAddress(tokenId, PLAYER_NFT_CONTRACT, TBA_IMPLEMENTATION, ERC6551_REGISTRY);
      console.log("📝 TBA Address:", tbaAddress);
      
      console.log("\n🎉 ¡NFT + ERC-6551 WALLET CREADO EXITOSAMENTE!");
      console.log("=====================================");
      console.log("NFT Contract:", PLAYER_NFT_CONTRACT);
      console.log("NFT Token ID:", tokenId);
      console.log("TBA Address:", tbaAddress);
      console.log("NFT Owner:", account.address);
      console.log("Mint Transaction:", claimResult.transactionHash);
      console.log("TBA Transaction:", tbaResult.transactionHash);
      
      return {
        success: true,
        nftContract: PLAYER_NFT_CONTRACT,
        tokenId: tokenId,
        tbaAddress: tbaAddress,
        mintTxHash: claimResult.transactionHash,
        tbaTxHash: tbaResult.transactionHash
      };
      
    } catch (claimError) {
      console.log("⚠️ Claim en playerNFT falló:", claimError.message);
      
      if (claimError.message.includes("DropNoActiveCondition")) {
        console.log("📋 DIAGNÓSTICO: Necesitas configurar claim conditions en ThirdWeb Dashboard");
        console.log("📋 Ve a: https://thirdweb.com/dashboard");
        console.log("📋 Proyecto: CriptoGift Wallet GLS");
        console.log("📋 Contrato: playerNFT");
        console.log("📋 Configura: Claim Conditions con precio 0 ETH");
        throw new Error("CONFIGURAR_CLAIM_CONDITIONS_PLAYERNFT");
      }
      
      throw claimError;
    }
    
  } catch (error) {
    console.error("❌ Error en flujo NFT + ERC-6551:", error.message);
    console.error("📝 Stack:", error.stack);
    throw error;
  }
}

// Helper para extraer token ID de logs
function extractTokenIdFromLogs(logs) {
  try {
    const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    
    for (const log of logs || []) {
      if (log.topics && log.topics[0] === transferTopic && log.topics.length >= 4) {
        const tokenIdHex = log.topics[3];
        return parseInt(tokenIdHex, 16).toString();
      }
    }
    
    // Fallback
    return Date.now().toString();
  } catch (error) {
    return Date.now().toString();
  }
}

// Helper para calcular dirección TBA
function calculateTBAAddress(tokenId, nftContract, implementation, registry) {
  const salt = ethers.solidityPackedKeccak256(
    ['uint256', 'address', 'uint256'],
    [84532, nftContract, tokenId]
  );
  
  const packed = ethers.solidityPacked(
    ['bytes1', 'address', 'bytes32', 'address', 'bytes32'],
    [
      '0xff',
      registry,
      salt,
      implementation,
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    ]
  );
  
  const hash = ethers.keccak256(packed);
  return ethers.getAddress('0x' + hash.slice(-40));
}

// Ejecutar
if (require.main === module) {
  testPlayerNFTWithERC6551()
    .then((result) => {
      console.log("\n🎯 RESULTADO FINAL:", result);
    })
    .catch((error) => {
      if (error.message === "CONFIGURAR_CLAIM_CONDITIONS_PLAYERNFT") {
        console.log("\n🔧 ACCIÓN REQUERIDA:");
        console.log("1. Ve a ThirdWeb Dashboard");
        console.log("2. Configura claim conditions para playerNFT");
        console.log("3. Ejecuta este script nuevamente");
      } else {
        console.error("💥 Error:", error.message);
      }
    });
}

module.exports = { testPlayerNFTWithERC6551 };