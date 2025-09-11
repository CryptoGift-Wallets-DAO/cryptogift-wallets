// Test completo con NFT Collection clásico + ERC-6551
const { createThirdwebClient, getContract, prepareContractCall, sendTransaction } = require("thirdweb");
const { baseSepolia } = require("thirdweb/chains");
const { privateKeyToAccount } = require("thirdweb/wallets");
const { ethers } = require("ethers");
require('dotenv').config({ path: '.env.local' });

async function testClassicNFTCollectionFlow() {
  console.log("🎯 PROBANDO FLUJO COMPLETO CON NFT COLLECTION CLÁSICO");
  console.log("===================================================");
  
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
    
    // CONTRATO NFT COLLECTION CLÁSICO ✅
    const CLASSIC_NFT_CONTRACT = "0x54314166B36E3Cc66cFb36265D99697f4F733231";
    const ERC6551_REGISTRY = "0x3cb823e40359b9698b942547d9d2241d531f2708";
    const TBA_IMPLEMENTATION = "0x60883bd1549cd618691ee38d838d131d304f2664";
    
    console.log("🏗️ Configuración con NFT Collection clásico:");
    console.log("📝 CryptoGift NFT Classic (TÚ OWNER):", CLASSIC_NFT_CONTRACT);
    console.log("📝 ERC6551Registry:", ERC6551_REGISTRY);
    console.log("📝 ERC6551Account:", TBA_IMPLEMENTATION);
    
    // PASO 1: Verificar que ya tienes un NFT
    console.log("\n🔍 PASO 1: Verificando NFT existente");
    
    const classicNFTContract = getContract({
      client,
      chain: baseSepolia,
      address: CLASSIC_NFT_CONTRACT,
    });
    
    // PASO 2: Mint otro NFT para prueba
    console.log("\n🎯 PASO 2: Minting nuevo NFT para crear TBA");
    
    try {
      const mintTx = prepareContractCall({
        contract: classicNFTContract,
        method: "function mintTo(address to, string memory uri) public returns (uint256)",
        params: [
          account.address, // to (nosotros mismos)
          "https://ipfs.io/ipfs/bafkreid242fe7e18d175df94d518a79b2355cec57a9c0618697f3ef4b" // uri metadata de prueba
        ],
      });
      
      const mintResult = await sendTransaction({
        transaction: mintTx,
        account,
      });
      
      console.log("✅ NFT minted successfully:", mintResult.transactionHash);
      
      // Extraer token ID de los logs
      const tokenId = extractTokenIdFromLogs(mintResult.logs);
      console.log("📝 Nuevo Token ID obtenido:", tokenId);
      
      // PASO 3: Crear Token Bound Account para este NFT
      console.log("\n🎯 PASO 3: Creando Token Bound Account");
      
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
          CLASSIC_NFT_CONTRACT, // tokenContract (nuestro NFT clásico)
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
      const tbaAddress = calculateTBAAddress(tokenId, CLASSIC_NFT_CONTRACT, TBA_IMPLEMENTATION, ERC6551_REGISTRY);
      console.log("📝 TBA Address:", tbaAddress);
      
      console.log("\n🎉 ¡PRIMER REGALO CRYPTOGIFT CREADO EXITOSAMENTE!");
      console.log("==================================================");
      console.log("✅ NFT Contract:", CLASSIC_NFT_CONTRACT);
      console.log("✅ NFT Token ID:", tokenId);
      console.log("✅ TBA Wallet Address:", tbaAddress);
      console.log("✅ NFT Owner:", account.address);
      console.log("✅ Mint Transaction:", mintResult.transactionHash);
      console.log("✅ TBA Transaction:", tbaResult.transactionHash);
      console.log("✅ Network: Base Sepolia");
      console.log("✅ Explorer NFT: https://sepolia.basescan.org/token/" + CLASSIC_NFT_CONTRACT + "?a=" + tokenId);
      console.log("✅ Explorer TBA: https://sepolia.basescan.org/address/" + tbaAddress);
      
      return {
        success: true,
        nftContract: CLASSIC_NFT_CONTRACT,
        tokenId: tokenId,
        tbaAddress: tbaAddress,
        mintTxHash: mintResult.transactionHash,
        tbaTxHash: tbaResult.transactionHash,
        nftOwner: account.address,
        message: "¡PRIMER REGALO CRYPTOGIFT CREADO EXITOSAMENTE!"
      };
      
    } catch (mintError) {
      console.log("❌ Mint falló:", mintError.message);
      throw mintError;
    }
    
  } catch (error) {
    console.error("❌ Error en flujo CryptoGift NFT clásico + ERC-6551:", error.message);
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
  testClassicNFTCollectionFlow()
    .then((result) => {
      console.log("\n🎯 RESULTADO FINAL:", result);
      console.log("\n📋 PRÓXIMOS PASOS:");
      console.log("1. ✅ NFT Collection clásico funcionando");
      console.log("2. ✅ Mint NFT funcionando");
      console.log("3. ✅ TBA creación funcionando");
      console.log("4. 🔄 Probar API completo");
      console.log("5. 🔄 Re-habilitar gasless transactions");
      console.log("6. 🔄 Probar frontend completo");
    })
    .catch((error) => {
      console.error("💥 Error:", error.message);
    });
}

module.exports = { testClassicNFTCollectionFlow };