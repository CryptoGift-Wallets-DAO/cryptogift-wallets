// Script para crear nuevo contrato NFT usando ThirdWeb SDK
const { createThirdwebClient, getContract, deployContract } = require("thirdweb");
const { baseSepolia } = require("thirdweb/chains");
const { privateKeyToAccount } = require("thirdweb/wallets");

async function deployNewNFTContract() {
  console.log("🚀 Desplegando nuevo contrato NFT...");
  
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
    
    // Parámetros del contrato NFT Collection
    const contractMetadata = {
      name: "CryptoGift NFT-Wallets",
      symbol: "CGNFT",
      description: "NFTs únicos con wallets integradas ERC-6551 para regalos crypto",
      image: "https://ipfs.io/ipfs/bafkreid5283bf31e9e50dfcb42b3eb821c722441b4b2ed3efb3f1ef08c6dd54",
      external_link: "https://cryptogift-wallets.vercel.app",
      seller_fee_basis_points: 0, // 0% royalties
      fee_recipient: account.address,
    };
    
    console.log("📄 Contract metadata:", contractMetadata);
    
    // Desplegar contrato NFT Collection
    const contractAddress = await deployContract({
      client,
      chain: baseSepolia,
      account,
      type: "nft-collection",
      params: {
        name: contractMetadata.name,
        symbol: contractMetadata.symbol,
        contractURI: "", // Se establecerá después
      },
    });
    
    console.log("✅ Nuevo contrato NFT desplegado:", contractAddress);
    console.log("🔗 Base Sepolia Explorer:", `https://sepolia.basescan.org/address/${contractAddress}`);
    console.log("🌐 ThirdWeb Dashboard:", `https://thirdweb.com/base-sepolia/${contractAddress}`);
    
    return contractAddress;
    
  } catch (error) {
    console.error("❌ Error desplegando contrato:", error);
    throw error;
  }
}

// Solo ejecutar si se llama directamente
if (require.main === module) {
  require('dotenv').config({ path: '.env.local' });
  deployNewNFTContract()
    .then((address) => {
      console.log(`\n🎉 ¡Contrato desplegado exitosamente!`);
      console.log(`📝 Nuevo NFT_DROP_ADDRESS: ${address}`);
      console.log(`\n📋 Actualizar en .env.local:`);
      console.log(`NEXT_PUBLIC_NFT_DROP_ADDRESS=${address}`);
    })
    .catch((error) => {
      console.error("💥 Despliegue falló:", error);
      process.exit(1);
    });
}

module.exports = { deployNewNFTContract };