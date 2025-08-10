const { ethers } = require('ethers');
const RPC = 'https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e';
const CONTRACT = '0xE9F316159a0830114252a96a6B7CA6efD874650F';
const IDS = [136, 137, 135, 1];
const ABI = ['function tokenURI(uint256) view returns (string)'];

async function checkTokenURIs() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const contract = new ethers.Contract(CONTRACT, ABI, provider);
  
  console.log('🔍 VERIFICACIÓN ON-CHAIN - URLs EXACTAS:');
  console.log('═══════════════════════════════════════════');
  
  for (const id of IDS) {
    try {
      const tokenURI = await contract.tokenURI(BigInt(id));
      console.log(`Token ${id}: ${tokenURI}`);
      
      // Check for problematic patterns
      if (tokenURI.includes('/contract/')) {
        console.log(`  ❌ PROBLEMA: '/contract/' literal detectado`);
      }
      if (tokenURI.startsWith('ipfs://')) {
        console.log(`  ❌ PROBLEMA: apunta a IPFS directamente (no JSON)`);
      }
      if (!tokenURI.startsWith('http')) {
        console.log(`  ❌ PROBLEMA: no es HTTP válido`);
      }
      if (tokenURI.includes('/api/nft-metadata/')) {
        console.log(`  ✅ JSON endpoint detectado`);
      }
    } catch (error) {
      console.log(`Token ${id}: ERROR - ${error.message}`);
    }
  }
}

checkTokenURIs().catch(console.error);