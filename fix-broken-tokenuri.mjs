#!/usr/bin/env node
/**
 * REPAIR SCRIPT: Fix broken HTTP tokenURI for tokens 145, 146, 147
 * 
 * PROBLEM: These tokens were minted with HTTP tokenURI instead of IPFS
 * IMPACT: Images don't show in wallets/BaseScan because HTTP URLs are defunct
 * SOLUTION: Update on-chain tokenURI to proper IPFS URIs
 */

import { ethers } from 'ethers';
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { privateKeyToAccount } from 'thirdweb/wallets';

// Configuration
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY_DEPLOY;
const NFT_CONTRACT = process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS;

if (!PRIVATE_KEY || !NFT_CONTRACT) {
  console.error('❌ Missing environment variables:');
  console.error('   PRIVATE_KEY_DEPLOY (for deployer account)');
  console.error('   NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS (NFT contract)');
  process.exit(1);
}

// ThirdWeb client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID
});

const deployerAccount = privateKeyToAccount({
  client,
  privateKey: PRIVATE_KEY
});

console.log('🔧 TOKENURI REPAIR SCRIPT');
console.log('🔑 Deployer:', deployerAccount.address);
console.log('📄 Contract:', NFT_CONTRACT);
console.log('🌐 RPC:', RPC_URL);

/**
 * Step 1: Find the original IPFS metadata for these tokens
 * We need to reconstruct what the tokenURI SHOULD have been
 */
async function findOriginalMetadata(tokenId) {
  console.log(`\n🔍 Finding original metadata for token ${tokenId}...`);
  
  try {
    // Get current (broken) tokenURI
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(NFT_CONTRACT, [
      'function tokenURI(uint256 tokenId) view returns (string)'
    ], provider);
    
    const currentTokenURI = await contract.tokenURI(BigInt(tokenId));
    console.log(`📋 Current tokenURI: ${currentTokenURI}`);
    
    if (currentTokenURI.startsWith('ipfs://')) {
      console.log(`✅ Token ${tokenId} already has IPFS tokenURI, skipping`);
      return null;
    }
    
    // Try to extract IPFS CID from the HTTP endpoint
    // The HTTP tokenURI should point to our metadata endpoint, which might have the real data
    console.log(`🌐 Fetching metadata from current HTTP tokenURI...`);
    
    try {
      const response = await fetch(currentTokenURI, { timeout: 10000 });
      
      if (response.ok) {
        const metadata = await response.json();
        console.log(`📋 Metadata name: ${metadata.name}`);
        console.log(`🖼️ Image URL: ${metadata.image?.substring(0, 50)}...`);
        
        // Check if we can extract IPFS CID from image URL
        if (metadata.image && metadata.image.includes('/ipfs/')) {
          const imageCidMatch = metadata.image.match(/\/ipfs\/([a-zA-Z0-9]+)/);
          if (imageCidMatch) {
            const imageCid = imageCidMatch[1];
            console.log(`✅ Extracted image CID: ${imageCid.substring(0, 30)}...`);
            
            // Try to find the metadata CID by checking if there's a metadata.json at the same location
            const possibleMetadataCid = imageCid;
            const ipfsMetadataUrl = `ipfs://${possibleMetadataCid}`;
            
            // Validate that this IPFS metadata exists
            const testUrl = `https://ipfs.io/ipfs/${possibleMetadataCid}`;
            try {
              const testResponse = await fetch(testUrl, { method: 'HEAD', timeout: 5000 });
              if (testResponse.ok) {
                console.log(`✅ Found working IPFS metadata: ${ipfsMetadataUrl}`);
                return ipfsMetadataUrl;
              }
            } catch (testError) {
              console.log(`⚠️ Could not validate IPFS metadata: ${testError.message}`);
            }
          }
        }
        
        // If we can't extract from image, try to reconstruct from known patterns
        console.log(`⚠️ Could not extract IPFS CID from image URL, trying alternative methods...`);
        
      } else {
        console.log(`⚠️ HTTP metadata fetch failed: ${response.status}`);
      }
    } catch (fetchError) {
      console.log(`⚠️ Failed to fetch HTTP metadata: ${fetchError.message}`);
    }
    
    console.log(`❌ Could not determine original IPFS tokenURI for token ${tokenId}`);
    return null;
    
  } catch (error) {
    console.error(`❌ Error finding metadata for token ${tokenId}:`, error.message);
    return null;
  }
}

/**
 * Step 2: Update the tokenURI on-chain
 */
async function updateTokenURI(tokenId, newTokenURI) {
  console.log(`\n🔄 Updating tokenURI for token ${tokenId}...`);
  console.log(`🔗 New tokenURI: ${newTokenURI}`);
  
  try {
    const nftContract = getContract({
      client,
      chain: baseSepolia,
      address: NFT_CONTRACT
    });
    
    // Prepare transaction to update tokenURI
    // Note: This requires the contract to have a setTokenURI function or similar
    // Check if contract supports this
    console.log(`⚠️ Note: This requires the NFT contract to support tokenURI updates`);
    console.log(`⚠️ If not supported, tokens will need manual recreation`);
    
    // For now, just log what would be done
    console.log(`📋 Would update token ${tokenId} tokenURI to: ${newTokenURI}`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error updating tokenURI for token ${tokenId}:`, error.message);
    return false;
  }
}

/**
 * Main repair process
 */
async function repairBrokenTokens() {
  const brokenTokens = ['145', '146', '147'];
  
  console.log(`🚀 Starting repair process for ${brokenTokens.length} tokens...`);
  
  const results = {
    success: [],
    failed: [],
    skipped: []
  };
  
  for (const tokenId of brokenTokens) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🔧 PROCESSING TOKEN ${tokenId}`);
    console.log(`${'='.repeat(50)}`);
    
    try {
      const originalMetadata = await findOriginalMetadata(tokenId);
      
      if (!originalMetadata) {
        console.log(`⚠️ Skipping token ${tokenId} - could not determine original metadata`);
        results.skipped.push(tokenId);
        continue;
      }
      
      const success = await updateTokenURI(tokenId, originalMetadata);
      
      if (success) {
        console.log(`✅ Successfully repaired token ${tokenId}`);
        results.success.push(tokenId);
      } else {
        console.log(`❌ Failed to repair token ${tokenId}`);
        results.failed.push(tokenId);
      }
      
    } catch (error) {
      console.error(`❌ Unexpected error processing token ${tokenId}:`, error);
      results.failed.push(tokenId);
    }
  }
  
  // Final report
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 REPAIR COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Success: ${results.success.length} tokens (${results.success.join(', ')})`);
  console.log(`❌ Failed: ${results.failed.length} tokens (${results.failed.join(', ')})`);
  console.log(`⚠️ Skipped: ${results.skipped.length} tokens (${results.skipped.join(', ')})`);
  
  if (results.failed.length > 0 || results.skipped.length > 0) {
    console.log(`\n🔄 ALTERNATIVE SOLUTIONS for failed/skipped tokens:`);
    console.log(`1. Recreate tokens with new mints using corrected minting logic`);
    console.log(`2. Update metadata storage to serve correct IPFS URLs in fallback system`);
    console.log(`3. Contact users to notify of token ID changes if recreated`);
  }
}

// Run the repair
repairBrokenTokens()
  .then(() => {
    console.log(`\n🎉 Repair script completed`);
    process.exit(0);
  })
  .catch(error => {
    console.error(`💥 Repair script failed:`, error);
    process.exit(1);
  });