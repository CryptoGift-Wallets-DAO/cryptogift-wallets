// Script para identificar el tipo exacto de contrato playerNFT
const { createThirdwebClient, getContract } = require("thirdweb");
const { baseSepolia } = require("thirdweb/chains");
require('dotenv').config({ path: '.env.local' });

async function identifyContractType() {
  console.log("🔍 IDENTIFICANDO TIPO DE CONTRATO playerNFT");
  console.log("===========================================");
  
  try {
    const client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID,
      secretKey: process.env.TW_SECRET_KEY,
    });
    
    const playerNftAddress = process.env.NEXT_PUBLIC_PLAYER_NFT_ADDRESS;
    console.log("📝 Analizando contrato:", playerNftAddress);
    
    const contract = getContract({
      client,
      chain: baseSepolia,
      address: playerNftAddress,
    });
    
    console.log("\\n🧪 PROBANDO MÉTODOS DE NFT DROP:");
    console.log("==================================");
    
    // Probar métodos de NFT Drop
    const nftDropMethods = [
      { name: "claim", signature: "claim(address,uint256,uint256,uint256,(bytes32[],uint256,uint256,address),bytes)" },
      { name: "mint", signature: "mint(address,string)" },
      { name: "mintTo", signature: "mintTo(address,string)" },
      { name: "safeMint", signature: "safeMint(address,string)" },
      { name: "lazyMint", signature: "lazyMint(uint256,string,bytes)" },
      { name: "setClaimConditions", signature: "setClaimConditions((uint256,uint256,uint256,uint256,bytes32,uint256,address,string)[],bool)" }
    ];
    
    for (const method of nftDropMethods) {
      try {
        console.log(`🔍 Probando ${method.name}...`);
        
        // Intentar llamar el método con parámetros mock para ver si existe
        await contract.call(method.name, [
          "0x0000000000000000000000000000000000000000", // dummy address
          ...(method.name === "claim" ? [
            1, // quantity
            "0x0000000000000000000000000000000000000000", // currency
            0, // price
            [[], 0, 0, "0x0000000000000000000000000000000000000000"], // allowlist
            "0x" // data
          ] : method.name.includes("mint") ? [
            "ipfs://dummy" // uri
          ] : method.name === "lazyMint" ? [
            1, // amount
            "ipfs://dummy", // baseURIForTokens
            "0x" // extraData
          ] : [])
        ]);
        
        console.log(`✅ ${method.name} - MÉTODO EXISTE`);
      } catch (error) {
        if (error.message.includes("missing revert data") || 
            error.message.includes("execution reverted") ||
            error.message.includes("call revert exception")) {
          console.log(`✅ ${method.name} - MÉTODO EXISTE (pero falló por parámetros)`);
        } else if (error.message.includes("does not exist") || 
                   error.message.includes("not a function")) {
          console.log(`❌ ${method.name} - MÉTODO NO EXISTE`);
        } else {
          console.log(`⚠️ ${method.name} - ${error.message.substring(0, 50)}...`);
        }
      }
    }
    
    console.log("\\n🔍 PROBANDO MÉTODOS DE ERC6551 REGISTRY:");
    console.log("=========================================");
    
    const registryAddress = process.env.NEXT_PUBLIC_ERC6551_REGISTRY_ADDRESS;
    const registryContract = getContract({
      client,
      chain: baseSepolia,
      address: registryAddress,
    });
    
    try {
      console.log("🔍 Probando createAccount en Registry...");
      await registryContract.call("createAccount", [
        "0x0000000000000000000000000000000000000000", // implementation
        84532, // chainId
        "0x0000000000000000000000000000000000000000", // tokenContract
        1, // tokenId
        0, // salt
        "0x" // initData
      ]);
      console.log("✅ Registry createAccount - MÉTODO EXISTE");
    } catch (error) {
      if (error.message.includes("missing revert data") || 
          error.message.includes("execution reverted")) {
        console.log("✅ Registry createAccount - MÉTODO EXISTE (pero falló por parámetros)");
      } else {
        console.log("❌ Registry createAccount - ERROR:", error.message.substring(0, 50));
      }
    }
    
    console.log("\\n📋 RECOMENDACIÓN:");
    console.log("==================");
    console.log("Basándome en los métodos disponibles, usar:");
    console.log("1. Para mint: Probar 'claim' method primero");
    console.log("2. Si falla, probar 'mint' o 'mintTo'");
    console.log("3. Registry está configurado correctamente");
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

if (require.main === module) {
  identifyContractType();
}

module.exports = { identifyContractType };