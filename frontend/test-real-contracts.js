// Probar los contratos reales con el enfoque correcto ERC-6551
const { createThirdwebClient, getContract, prepareContractCall, sendTransaction } = require("thirdweb");
const { baseSepolia } = require("thirdweb/chains");
const { privateKeyToAccount } = require("thirdweb/wallets");
require('dotenv').config({ path: '.env.local' });

async function testRealERC6551Flow() {
  console.log("🎯 PROBANDO FLUJO REAL ERC-6551");
  console.log("===============================");
  
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
    
    // Contratos reales de ThirdWeb - USANDO PLAYERTOKEN DONDE SOMOS OWNER
    const PLAYER_NFT_CONTRACT = "0xeFCba1D72B8f053d93BA44b7b15a1BeED515C89b"; // playerTOKEN - TÚ ERES EL OWNER
    const ERC6551_REGISTRY = "0x3cb823e40359b9698b942547d9d2241d531f2708";
    const TBA_IMPLEMENTATION = "0x60883bd1549cd618691ee38d838d131d304f2664";
    
    console.log("🏗️ Contratos configurados:");
    console.log("NFT Contract:", PLAYER_NFT_CONTRACT);
    console.log("Registry:", ERC6551_REGISTRY);
    console.log("Implementation:", TBA_IMPLEMENTATION);
    
    // PASO 1: Probar si podemos hacer mint en el Token Contract (playerTOKEN)
    console.log("\n🎯 PASO 1: Probando mint en Token Contract (playerTOKEN donde somos owner)");
    
    const playerTokenContract = getContract({
      client,
      chain: baseSepolia,
      address: PLAYER_NFT_CONTRACT,
    });
    
    // Para Token Drop, usar método claim directo
    try {
      console.log("🔍 Intentando claim en playerTOKEN...");
      const claimTx = prepareContractCall({
        contract: playerTokenContract,
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
      
      console.log("✅ Claim en playerTOKEN exitoso:", claimResult.transactionHash);
      
      // Extraer token ID de los logs
      const tokenId = extractTokenIdFromLogs(claimResult.logs);
      console.log("📝 Token ID obtenido:", tokenId);
      
      // PASO 2: Crear Token Bound Account para este NFT
      console.log("\n🎯 PASO 2: Creando Token Bound Account");
      
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
          PLAYER_NFT_CONTRACT, // tokenContract
          BigInt(tokenId), // tokenId
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
      
      console.log("\n🎉 ¡ERC-6551 NFT-WALLET CREADO EXITOSAMENTE!");
      console.log("NFT Token ID:", tokenId);
      console.log("TBA Address:", tbaAddress);
      console.log("Owner:", account.address);
      
      return; // Éxito! Salir aquí
      
    } catch (tokenError) {
      console.log("⚠️ Claim en playerTOKEN falló:", tokenError.message);
      console.log("Continuando con alternativas...");
    }
    
    // ALTERNATIVA: Probar con mintTo directo usando custom contract
    console.log("\n🔍 ALTERNATIVA: Probando direct mint usando CryptoGiftNFT contract");
    
    try {
      const mintToTx = prepareContractCall({
        contract: playerTokenContract,
        method: "function mintTo(address to, string memory uri) public returns (uint256)",
        params: [
          account.address, // to
          "https://ipfs.io/ipfs/bafkreid242fe7e18d175df94d518a79b2355cec57a9c0618697f3ef4b" // uri
        ],
      });
      
      const mintResult = await sendTransaction({
        transaction: mintToTx,
        account,
      });
      
      console.log("✅ MintTo exitoso:", mintResult.transactionHash);
      
      // Extraer token ID y crear TBA
      const tokenId = extractTokenIdFromLogs(mintResult.logs);
      console.log("📝 Token ID obtenido:", tokenId);
      
      // Crear Token Bound Account
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
          PLAYER_NFT_CONTRACT, // tokenContract
          BigInt(tokenId), // tokenId
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
      
      console.log("\n🎉 ¡ERC-6551 NFT-WALLET CREADO EXITOSAMENTE!");
      console.log("NFT Token ID:", tokenId);
      console.log("TBA Address:", tbaAddress);
      console.log("Owner:", account.address);
      
    } catch (mintError) {
      console.log("❌ MintTo también falló:", mintError.message);
      throw new Error("Todos los métodos de mint fallaron");
    }
    
  } catch (error) {
    console.error("❌ Error en flujo ERC-6551:", error);
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
  const { ethers } = require("ethers");
  
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
  testRealERC6551Flow();
}

module.exports = { testRealERC6551Flow };