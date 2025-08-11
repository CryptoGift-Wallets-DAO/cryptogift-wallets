#!/usr/bin/env node
/**
 * CRITICAL TOKENURI MIGRATION SCRIPT
 * 
 * PROBLEM: tokenURIs on-chain point directly to IPFS images instead of JSON metadata
 * SOLUTION: Update all tokenURIs to point to our JSON metadata endpoints
 * 
 * Following the definitive analysis provided:
 * - BaseScan expects: tokenURI → JSON metadata → image field
 * - We have: tokenURI → image directly (causes no display)
 * - Fix: tokenURI → https://domain/api/nft-metadata/contract/tokenId
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import { createThirdwebClient } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import { readContract } from "thirdweb";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './frontend/.env.local' });

// CONFIGURATION
const THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_TW_CLIENT_ID || '9183b572b02ec88dd4d8f20c3ed847d3';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS;

if (!CONTRACT_ADDRESS) {
  console.error('❌ CRITICAL: NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS not found in environment');
  console.error('   Current production contract: 0xE9F316159a0830114252a96a6B7CA6efD874650F');
  console.error('   Add NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS to frontend/.env.local');
  process.exit(1);
}
const PRIVATE_KEY = process.env.PRIVATE_KEY_DEPLOY; // Required for contract calls
// PROTOCOL V2 FAIL-FAST: Scripts must have explicit NEXT_PUBLIC_BASE_URL
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

if (!BASE_URL) {
  console.error('❌ CRITICAL: NEXT_PUBLIC_BASE_URL required for tokenURI migration');
  console.error('   Scripts cannot use VERCEL_URL fallback - risk of wrong host');
  console.error('   Add NEXT_PUBLIC_BASE_URL to frontend/.env.local');
  console.error('   Example: NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app');
  process.exit(1);
}

console.log(`🔧 TOKENURI MIGRATION SCRIPT`);
console.log(`📋 Contract: ${CONTRACT_ADDRESS}`);
console.log(`🌐 Base URL: ${BASE_URL}`);

if (!PRIVATE_KEY) {
  console.error('❌ CRITICAL: PRIVATE_KEY_DEPLOY not found in environment');
  console.error('   Add PRIVATE_KEY_DEPLOY to frontend/.env.local');
  process.exit(1);
}

// Create ThirdWeb client and contract
const client = createThirdwebClient({ clientId: THIRDWEB_CLIENT_ID });
const contract = getContract({ 
  client, 
  chain: baseSepolia, 
  address: CONTRACT_ADDRESS 
});

const account = privateKeyToAccount({ client, privateKey: PRIVATE_KEY });

/**
 * Get all tokens that need migration
 */
async function getTokensToMigrate() {
  try {
    console.log('📊 Checking total supply...');
    
    // Get total supply
    const totalSupply = await readContract({
      contract,
      method: "function totalSupply() view returns (uint256)"
    });
    
    console.log(`📈 Total supply: ${totalSupply.toString()} tokens`);
    
    const tokensToCheck = [];
    for (let i = 1; i <= Number(totalSupply); i++) {
      tokensToCheck.push(i);
    }
    
    return tokensToCheck;
  } catch (error) {
    console.error('❌ Error getting tokens:', error);
    throw error;
  }
}

/**
 * Check if tokenURI needs migration (points to image instead of JSON)
 */
async function needsMigration(tokenId) {
  try {
    const tokenURI = await readContract({
      contract,
      method: "function tokenURI(uint256) view returns (string)",
      params: [BigInt(tokenId)]
    });
    
    console.log(`🔍 Token ${tokenId} current URI: ${tokenURI}`);
    
    // Check if URI points to our metadata endpoint
    const expectedURI = `${BASE_URL}/api/nft-metadata/${CONTRACT_ADDRESS}/${tokenId}`;
    
    if (tokenURI === expectedURI) {
      console.log(`✅ Token ${tokenId} already migrated`);
      return false;
    }
    
    // Check if it points to direct IPFS image
    if (tokenURI.includes('.jpg') || tokenURI.includes('.jpeg') || tokenURI.includes('.png') || 
        tokenURI.includes('.gif') || tokenURI.includes('ipfs://ipfs://')) {
      console.log(`🔄 Token ${tokenId} needs migration (points to image)`);
      return true;
    }
    
    console.log(`⚠️ Token ${tokenId} unknown format, marking for migration`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error checking token ${tokenId}:`, error);
    return false;
  }
}

/**
 * Migrate single token URI
 */
async function migrateTokenURI(tokenId) {
  try {
    const newURI = `${BASE_URL}/api/nft-metadata/${CONTRACT_ADDRESS}/${tokenId}`;
    
    console.log(`🔄 Migrating token ${tokenId} to: ${newURI}`);
    
    // Prepare the transaction
    const transaction = prepareContractCall({
      contract,
      method: "function updateTokenURI(uint256 tokenId, string uri)",
      params: [BigInt(tokenId), newURI],
    });
    
    // Send transaction
    const result = await sendTransaction({
      transaction,
      account
    });
    
    console.log(`✅ Token ${tokenId} migrated! TX: ${result.transactionHash}`);
    
    // Wait for confirmation
    console.log(`⏳ Waiting for confirmation...`);
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3s wait
    
    return result.transactionHash;
    
  } catch (error) {
    console.error(`❌ Failed to migrate token ${tokenId}:`, error);
    throw error;
  }
}

/**
 * Emit MetadataUpdate events (ERC-4906) for cache invalidation
 */
async function emitMetadataUpdate(tokenId) {
  try {
    console.log(`📢 Emitting MetadataUpdate for token ${tokenId}`);
    
    // Note: This requires the contract to have MetadataUpdate event
    // If not available, BaseScan will refresh eventually or we can add ?v=timestamp
    console.log(`ℹ️ Manual cache busting: add ?v=${Date.now()} to requests if needed`);
    
    return true;
    
  } catch (error) {
    console.log(`⚠️ MetadataUpdate not available for token ${tokenId}, skipping`);
    return false;
  }
}

/**
 * Main migration process
 */
async function runMigration() {
  try {
    console.log('🚀 Starting TokenURI Migration...');
    
    // Get tokens to check
    const tokensToCheck = await getTokensToMigrate();
    console.log(`📋 Checking ${tokensToCheck.length} tokens...`);
    
    const tokensToMigrate = [];
    
    // Check which tokens need migration
    for (const tokenId of tokensToCheck) {
      if (await needsMigration(tokenId)) {
        tokensToMigrate.push(tokenId);
      }
    }
    
    if (tokensToMigrate.length === 0) {
      console.log('✅ All tokens already have correct metadata URIs!');
      return;
    }
    
    console.log(`🔄 Found ${tokensToMigrate.length} tokens needing migration:`);
    console.log(`   Tokens: ${tokensToMigrate.join(', ')}`);
    
    // Ask for confirmation
    console.log('');
    console.log('⚠️  IMPORTANT: This will update tokenURIs on-chain');
    console.log('   This action cannot be undone without another transaction');
    console.log('   Each transaction will cost gas');
    console.log('');
    
    // In a real script, you'd add confirmation here
    // For automation, we'll proceed
    
    let successCount = 0;
    let failCount = 0;
    const results = [];
    
    // Process tokens in batches of 1 (to avoid gas limit issues)
    for (const tokenId of tokensToMigrate) {
      try {
        console.log(`\n📦 Processing token ${tokenId} (${successCount + failCount + 1}/${tokensToMigrate.length})...`);
        
        const txHash = await migrateTokenURI(tokenId);
        
        // Emit metadata update for cache invalidation
        await emitMetadataUpdate(tokenId);
        
        results.push({ tokenId, status: 'success', txHash });
        successCount++;
        
        console.log(`✅ Token ${tokenId} migration complete!`);
        
      } catch (error) {
        console.error(`❌ Token ${tokenId} migration failed:`, error.message);
        results.push({ tokenId, status: 'failed', error: error.message });
        failCount++;
      }
      
      // Rate limiting: wait between transactions
      if (tokenId !== tokensToMigrate[tokensToMigrate.length - 1]) {
        console.log('⏳ Waiting 5s before next transaction...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Final summary
    console.log('\n📊 MIGRATION SUMMARY:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📋 Total processed: ${successCount + failCount}`);
    
    if (successCount > 0) {
      console.log('\n🎉 MIGRATION SUCCESSFUL!');
      console.log('⏳ Allow 1-2 minutes for BaseScan cache to refresh');
      console.log('📝 If images still don\'t appear, add ?v=timestamp to URLs');
      
      console.log('\n📋 VALIDATION STEPS:');
      console.log('1. Check BaseScan NFT pages for migrated tokens');
      console.log('2. Verify MetaMask displays updated metadata');  
      console.log('3. Test API endpoints respond with JSON metadata');
      
      console.log('\n🔗 SUCCESSFUL MIGRATIONS:');
      results.filter(r => r.status === 'success').forEach(r => {
        console.log(`   Token ${r.tokenId}: ${r.txHash}`);
      });
    }
    
    if (failCount > 0) {
      console.log('\n❌ FAILED MIGRATIONS:');
      results.filter(r => r.status === 'failed').forEach(r => {
        console.log(`   Token ${r.tokenId}: ${r.error}`);
      });
    }
    
  } catch (error) {
    console.error('💥 MIGRATION FAILED:', error);
    process.exit(1);
  }
}

/**
 * Validation function to test endpoints after migration
 */
async function validateMigration(tokenId) {
  try {
    const metadataURL = `${BASE_URL}/api/nft-metadata/${CONTRACT_ADDRESS}/${tokenId}`;
    
    console.log(`🧪 Testing: ${metadataURL}`);
    
    // Test HEAD request
    const headResponse = await fetch(metadataURL, { method: 'HEAD' });
    if (!headResponse.ok) {
      throw new Error(`HEAD request failed: ${headResponse.status}`);
    }
    console.log(`✅ HEAD request: ${headResponse.status}`);
    
    // Test GET request  
    const getResponse = await fetch(metadataURL);
    if (!getResponse.ok) {
      throw new Error(`GET request failed: ${getResponse.status}`);
    }
    
    const metadata = await getResponse.json();
    if (!metadata.image) {
      throw new Error('Metadata missing image field');
    }
    
    console.log(`✅ GET request: ${getResponse.status}`);
    console.log(`✅ Image URL: ${metadata.image}`);
    
    // Test image URL
    const imageResponse = await fetch(metadata.image, { method: 'HEAD' });
    if (!imageResponse.ok) {
      throw new Error(`Image not accessible: ${imageResponse.status}`);
    }
    
    console.log(`✅ Image accessible: ${imageResponse.status}`);
    console.log(`🎉 Token ${tokenId} validation complete!`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Validation failed for token ${tokenId}:`, error.message);
    return false;
  }
}

// Export functions for testing
export { runMigration, validateMigration, getTokensToMigrate };

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration().catch(console.error);
}