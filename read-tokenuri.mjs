import { ethers } from "ethers";

const rpc = "https://sepolia.base.org";
const contract = "0xE9F316159a0830114252a96a6B7CA6efD874650F";
const ids = [135, 136];

const ABI = [
  "function tokenURI(uint256) view returns (string)",
  "event MetadataUpdate(uint256 indexed _tokenId)" // si aplica ERC-4906
];

(async () => {
  console.log('🔍 READING ON-CHAIN tokenURI VALUES...');
  console.log('===========================================');
  
  try {
    const provider = new ethers.JsonRpcProvider(rpc);
    const c = new ethers.Contract(contract, ABI, provider);
    
    for (const id of ids) {
      try {
        const uri = await c.tokenURI(id);
        console.log(`✅ tokenId=${id} tokenURI=${uri}`);
      } catch (error) {
        console.log(`❌ tokenId=${id} ERROR: ${error.message}`);
      }
    }
  } catch (error) {
    console.log(`❌ CONTRACT CONNECTION ERROR: ${error.message}`);
  }
})();