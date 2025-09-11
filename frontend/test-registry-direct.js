// Test directo del ERC6551 Registry
const { ethers } = require("ethers");
require('dotenv').config({ path: '.env.local' });

async function testRegistryDirect() {
  console.log("🔍 PROBANDO ERC6551 REGISTRY DIRECTAMENTE");
  console.log("=========================================");
  
  try {
    // Configurar provider
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY_DEPLOY, provider);
    
    console.log("📝 Wallet address:", wallet.address);
    
    // Direcciones - USANDO DIRECCIONES OFICIALES ERC-6551
    const ERC6551_REGISTRY = "0x000000006551c19487814612e58FE06813775758"; // OFICIAL
    const TBA_IMPLEMENTATION = "0x2d25602551487c3f3354dd80d76d54383a243358"; // OFICIAL
    const NFT_CONTRACT = "0x54314166B36E3Cc66cFb36265D99697f4F733231";
    const TOKEN_ID = "1752469080056"; // El que acabamos de crear
    
    console.log("📝 Registry:", ERC6551_REGISTRY);
    console.log("📝 Implementation:", TBA_IMPLEMENTATION);
    console.log("📝 NFT Contract:", NFT_CONTRACT);
    console.log("📝 Token ID:", TOKEN_ID);
    
    // ABI mínimo del Registry
    const registryABI = [
      "function createAccount(address implementation, uint256 chainId, address tokenContract, uint256 tokenId, uint256 salt, bytes calldata initData) external returns (address)",
      "function account(address implementation, uint256 chainId, address tokenContract, uint256 tokenId, uint256 salt) external view returns (address)"
    ];
    
    const registry = new ethers.Contract(ERC6551_REGISTRY, registryABI, wallet);
    
    // PASO 1: Verificar que el registry funciona con método de lectura
    console.log("\n🔍 PASO 1: Probando método account() (read-only)");
    try {
      const predictedAddress = await registry.account(
        TBA_IMPLEMENTATION,
        84532, // Base Sepolia
        NFT_CONTRACT,
        TOKEN_ID,
        0
      );
      console.log("✅ Predicted TBA address:", predictedAddress);
    } catch (readError) {
      console.log("❌ Read method failed:", readError.message);
    }
    
    // PASO 2: Verificar que los contratos existen
    console.log("\n🔍 PASO 2: Verificando contratos existen");
    
    const registryCode = await provider.getCode(ERC6551_REGISTRY);
    const implCode = await provider.getCode(TBA_IMPLEMENTATION);
    const nftCode = await provider.getCode(NFT_CONTRACT);
    
    console.log("✅ Registry exists:", registryCode !== "0x");
    console.log("✅ Implementation exists:", implCode !== "0x");
    console.log("✅ NFT Contract exists:", nftCode !== "0x");
    
    // PASO 3: Verificar balance del deployer
    const balance = await provider.getBalance(wallet.address);
    console.log("💰 Deployer balance:", ethers.formatEther(balance), "ETH");
    
    if (balance === 0n) {
      throw new Error("Sin ETH para gas");
    }
    
    // PASO 4: Intentar crear TBA con gas estimation
    console.log("\n🔍 PASO 3: Estimando gas para createAccount");
    try {
      const gasEstimate = await registry.createAccount.estimateGas(
        TBA_IMPLEMENTATION,
        84532,
        NFT_CONTRACT,
        TOKEN_ID,
        0,
        "0x"
      );
      console.log("✅ Gas estimate:", gasEstimate.toString());
      
      // PASO 5: Ejecutar la transacción
      console.log("\n🚀 PASO 4: Ejecutando createAccount");
      const tx = await registry.createAccount(
        TBA_IMPLEMENTATION,
        84532,
        NFT_CONTRACT,
        TOKEN_ID,
        0,
        "0x",
        {
          gasLimit: gasEstimate * 2n, // 2x safety margin
        }
      );
      
      console.log("📝 Transaction hash:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed!");
      console.log("📝 Block number:", receipt.blockNumber);
      console.log("📝 Gas used:", receipt.gasUsed.toString());
      
      // Calcular TBA address
      const tbaAddress = calculateTBAAddress(TOKEN_ID, NFT_CONTRACT, TBA_IMPLEMENTATION, ERC6551_REGISTRY);
      
      console.log("\n🎉 ¡TBA CREADO EXITOSAMENTE!");
      console.log("=========================");
      console.log("NFT Token ID:", TOKEN_ID);
      console.log("TBA Address:", tbaAddress);
      console.log("Transaction:", tx.hash);
      console.log("Explorer: https://sepolia.basescan.org/tx/" + tx.hash);
      
      return {
        success: true,
        tokenId: TOKEN_ID,
        tbaAddress: tbaAddress,
        txHash: tx.hash
      };
      
    } catch (gasError) {
      console.log("❌ Gas estimation failed:", gasError.message);
      
      // Mostrar información de debug
      console.log("\n🔍 DEBUG INFO:");
      console.log("Registry address:", ERC6551_REGISTRY);
      console.log("Implementation address:", TBA_IMPLEMENTATION);
      console.log("NFT Contract address:", NFT_CONTRACT);
      console.log("Token ID:", TOKEN_ID);
      console.log("Chain ID: 84532");
      console.log("Salt: 0");
      console.log("Init data: 0x");
      
      throw gasError;
    }
    
  } catch (error) {
    console.error("❌ Error testing registry:", error.message);
    throw error;
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
  testRegistryDirect()
    .then((result) => {
      console.log("\n🎯 RESULTADO:", result);
    })
    .catch((error) => {
      console.error("💥 Error:", error.message);
    });
}

module.exports = { testRegistryDirect };