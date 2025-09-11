/**
 * DEBUG: Check Token ID 0 metadata on contract 0x54314166B36E3Cc66cFb36265D99697f4F733231
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createThirdwebClient, getContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { readContract } from 'thirdweb';
import { withDebugAuth } from '../../../lib/debugAuth';

// Initialize ThirdWeb client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!
});

const NFT_CONTRACT_ADDRESS = '0x54314166B36E3Cc66cFb36265D99697f4F733231';

const nftContract = getContract({
  client,
  chain: baseSepolia,
  address: NFT_CONTRACT_ADDRESS
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 CHECKING TOKEN ID 0 METADATA...');
    
    // 1. Check if token exists
    const owner = await readContract({
      contract: nftContract,
      method: "function ownerOf(uint256 tokenId) view returns (address)",
      params: [BigInt(0)]
    });
    
    console.log('✅ Token ID 0 owner:', owner);
    
    // 2. Get tokenURI
    const tokenURI = await readContract({
      contract: nftContract,
      method: "function tokenURI(uint256 tokenId) view returns (string)",
      params: [BigInt(0)]
    });
    
    console.log('✅ Token ID 0 tokenURI:', tokenURI);
    
    // 3. Try to fetch metadata from IPFS
    let metadata = null;
    let metadataError = null;
    
    if (tokenURI) {
      try {
        // Convert IPFS URI to HTTP gateway
        const httpUrl = tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/');
        const response = await fetch(httpUrl);
        
        if (response.ok) {
          metadata = await response.json();
          console.log('✅ Metadata fetched successfully');
        } else {
          metadataError = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (error: any) {
        metadataError = error.message;
      }
    }
    
    // 4. Check contract functions available
    const contractFunctions = [];
    
    try {
      // Try to call updateTokenURI to see if it exists
      await readContract({
        contract: nftContract,
        method: "function updateTokenURI(uint256 tokenId, string memory uri) external",
        params: [BigInt(0), 'test']
      });
      contractFunctions.push('updateTokenURI - EXISTS');
    } catch (error: any) {
      if (error.message.includes('function does not exist') || error.message.includes('execution reverted')) {
        contractFunctions.push('updateTokenURI - NOT AVAILABLE');
      } else {
        contractFunctions.push('updateTokenURI - ERROR: ' + error.message);
      }
    }
    
    return res.status(200).json({
      success: true,
      contractAddress: NFT_CONTRACT_ADDRESS,
      tokenId: 0,
      owner: owner as string,
      tokenURI: tokenURI as string,
      metadata,
      metadataError,
      contractFunctions,
      analysis: {
        tokenExists: !!owner,
        hasTokenURI: !!tokenURI,
        metadataAccessible: !!metadata,
        updateTokenURIAvailable: contractFunctions.some(f => f.includes('EXISTS'))
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error checking Token ID 0:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      contractAddress: NFT_CONTRACT_ADDRESS
    });
  }
}

// Export with debug authentication
export default withDebugAuth(handler);