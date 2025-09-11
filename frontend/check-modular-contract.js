// Verificar métodos disponibles en el contrato Modular NFT Collection
const { createThirdwebClient, getContract, readContract } = require("thirdweb");
const { baseSepolia } = require("thirdweb/chains");
const { privateKeyToAccount } = require("thirdweb/wallets");
const { ethers } = require("ethers");
require('dotenv').config({ path: '.env.local' });

async function checkModularContract() {
  console.log("🔍 VERIFICANDO CONTRATO MODULAR NFT COLLECTION");
  console.log("==============================================");
  
  try {
    // Configurar cliente
    const client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID,
      secretKey: process.env.TW_SECRET_KEY,
    });
    
    // Configurar cuenta
    const account = privateKeyToAccount({
      client,
      privateKey: process.env.PRIVATE_KEY_DEPLOY,
    });
    
    const CRYPTOGIFT_NFT_CONTRACT = "0xdF514FDC06D7f2cc51Db20aBF6d6F56582F796BE";
    
    console.log("📝 Contract address:", CRYPTOGIFT_NFT_CONTRACT);
    console.log("📝 Account:", account.address);
    
    // Verificar el contrato usando provider directo
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    
    // 1. Verificar que el contrato existe
    const code = await provider.getCode(CRYPTOGIFT_NFT_CONTRACT);
    console.log("✅ Contract exists:", code !== "0x");
    console.log("📏 Code length:", code.length, "bytes");
    
    // 2. Probar métodos comunes de ERC721
    const commonABI = [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function owner() view returns (address)",
      "function totalSupply() view returns (uint256)",
      "function mintTo(address to, string memory uri) public",
      "function mint(address to, string memory uri) public",
      "function safeMint(address to, string memory uri) public",
      "function supportsInterface(bytes4 interfaceId) view returns (bool)"
    ];
    
    const contract = new ethers.Contract(CRYPTOGIFT_NFT_CONTRACT, commonABI, provider);
    
    console.log("\n🔍 Probando métodos de lectura:");
    
    const readMethods = [
      { name: "name", args: [] },
      { name: "symbol", args: [] },
      { name: "totalSupply", args: [] },
      { name: "supportsInterface", args: ["0x80ac58cd"] } // ERC721
    ];
    
    for (const method of readMethods) {
      try {
        const result = await contract[method.name](...method.args);
        console.log(`✅ ${method.name}(): ${result}`);
      } catch (error) {
        console.log(`❌ ${method.name}(): ${error.message.split('\\n')[0]}`);
      }
    }
    
    // 3. Verificar ownership
    console.log("\n🔍 Verificando ownership:");
    try {
      const owner = await contract.owner();
      console.log("✅ Contract owner:", owner);
      console.log("✅ Your address:", account.address);
      console.log("✅ You are owner:", owner.toLowerCase() === account.address.toLowerCase());
    } catch (ownerError) {
      console.log("⚠️ Owner method not available:", ownerError.message.split('\\n')[0]);
    }
    
    // 4. Probar en ThirdWeb Dashboard
    console.log("\n📋 PARA VERIFICAR EN THIRDWEB DASHBOARD:");
    console.log("======================================");
    console.log("1. Ve a: https://thirdweb.com/dashboard");
    console.log("2. Busca tu contrato:", CRYPTOGIFT_NFT_CONTRACT);
    console.log("3. Ve a la tab 'Explorer'");
    console.log("4. Busca métodos disponibles para mint");
    console.log("5. Verifica que tú seas el owner");
    
    // 5. Sugerir próximos pasos
    console.log("\n📋 PRÓXIMOS PASOS:");
    console.log("=================");
    console.log("1. Verificar métodos disponibles en Dashboard");
    console.log("2. Probar mint manual en Dashboard");
    console.log("3. Si no funciona, deploy nuevo contrato NFT Collection clásico");
    
    return {
      contractExists: code !== "0x",
      contractAddress: CRYPTOGIFT_NFT_CONTRACT,
      codeLength: code.length
    };
    
  } catch (error) {
    console.error("❌ Error verificando contrato:", error.message);
    throw error;
  }
}

// Ejecutar
if (require.main === module) {
  checkModularContract()
    .then((result) => {
      console.log("\n🎯 VERIFICACIÓN COMPLETADA:", result);
    })
    .catch((error) => {
      console.error("💥 Error:", error.message);
    });
}

module.exports = { checkModularContract };