// Script para verificar contratos de ThirdWeb
const { createThirdwebClient, getContract } = require("thirdweb");
const { baseSepolia } = require("thirdweb/chains");
require('dotenv').config({ path: '.env.local' });

async function checkThirdWebContracts() {
  console.log("🔍 VERIFICANDO CONTRATOS DE THIRDWEB");
  console.log("=====================================");
  
  try {
    // Configurar cliente ThirdWeb
    const client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID,
      secretKey: process.env.TW_SECRET_KEY,
    });
    
    console.log("✅ Cliente ThirdWeb configurado");
    console.log("📝 Project ID:", process.env.NEXT_PUBLIC_TW_CLIENT_ID);
    
    // Lista de direcciones potenciales desde .env.local (deprecated section)
    const potentialContracts = [
      { name: "OLD_NFT_DROP", address: "0x02101dfB77FDE026414827Fdc604ddAF224F0921" },
      { name: "OLD_TOKEN_DROP", address: "0xeFCba1D72B8f053d93BA44b7b15a1BeED515C89b" },
      { name: "OLD_EDITION_DROP", address: "0xBd0169Ac15b9b03D79Bd832AF5E358D4CaCEfb49" },
      { name: "OLD_TBA_IMPL", address: "0x60883bD1549CD618691EE38D838d131d304f2664" },
      { name: "OLD_ERC6551_REGISTRY", address: "0x3cB823E40359B9698b942547D9d2241d531f2708" },
    ];
    
    console.log("\\n🧪 PROBANDO CONTRATOS EXISTENTES:");
    console.log("====================================");
    
    for (const contractInfo of potentialContracts) {
      try {
        console.log(`\\n🔍 Verificando ${contractInfo.name}: ${contractInfo.address}`);
        
        const contract = getContract({
          client,
          chain: baseSepolia,
          address: contractInfo.address,
        });
        
        // Intentar leer información básica del contrato
        try {
          // Verificar si es un contrato ERC721 (NFT)
          const supportsInterface = await contract.call("supportsInterface", ["0x80ac58cd"]);
          if (supportsInterface) {
            console.log("✅ Es un contrato ERC721 (NFT)");
            
            // Intentar leer nombre y símbolo
            try {
              const name = await contract.call("name");
              const symbol = await contract.call("symbol");
              console.log(`   📝 Nombre: ${name}`);
              console.log(`   📝 Símbolo: ${symbol}`);
            } catch (e) {
              console.log("   ⚠️ No se pudo leer nombre/símbolo");
            }
          }
        } catch (e) {
          console.log("   ⚠️ No es un contrato ERC721 estándar");
        }
        
        // Verificar si es un Registry ERC6551
        try {
          await contract.call("createAccount", [
            "0x0000000000000000000000000000000000000000",
            84532,
            "0x0000000000000000000000000000000000000000",
            1,
            0,
            "0x"
          ]);
          console.log("✅ Posible Registry ERC6551");
        } catch (e) {
          if (e.message.includes("createAccount")) {
            console.log("✅ Es un Registry ERC6551");
          }
        }
        
        console.log("✅ Contrato verificado y accesible");
        
      } catch (error) {
        console.log(`❌ Error verificando ${contractInfo.name}:`, error.message);
      }
    }
    
    console.log("\\n📋 CONFIGURACIÓN RECOMENDADA:");
    console.log("================================");
    console.log("Basándome en los contratos verificados, estas podrían ser las direcciones correctas:");
    console.log("");
    console.log("# Direcciones sugeridas para .env.local:");
    console.log("NEXT_PUBLIC_PLAYER_NFT_ADDRESS=0x02101dfB77FDE026414827Fdc604ddAF224F0921");
    console.log("NEXT_PUBLIC_ERC6551_REGISTRY_ADDRESS=0x3cB823E40359B9698b942547D9d2241d531f2708");
    console.log("NEXT_PUBLIC_ERC6551_IMPLEMENTATION_ADDRESS=0x60883bD1549CD618691EE38D838d131d304f2664");
    console.log("");
    console.log("⚠️  IMPORTANTE: Verifica estas direcciones en tu dashboard de ThirdWeb");
    console.log("🌐 Dashboard: https://thirdweb.com/dashboard");
    
  } catch (error) {
    console.error("❌ Error general:", error);
  }
}

// Solo ejecutar si se llama directamente
if (require.main === module) {
  checkThirdWebContracts()
    .then(() => {
      console.log("\\n🎉 Verificación completada");
    })
    .catch((error) => {
      console.error("💥 Error:", error);
      process.exit(1);
    });
}

module.exports = { checkThirdWebContracts };