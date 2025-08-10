#!/usr/bin/env node
/**
 * PILOT MIGRATION - CRITICAL TOKENS ONLY
 * 
 * Migrates only the most problematic tokens identified in analysis:
 * - Token 135: ipfs://ipfs://QmWL...jpg (double prefix + direct image)
 * - Token 136: ipfs://ipfs://Qmf7...jpeg (double prefix + direct image)
 * - Token 1: ipfs://QmAy...JPEG.jpg (direct image)
 * 
 * GOAL: Prove the solution works before mass migration
 */

import { createThirdwebClient } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import { readContract } from "thirdweb";
import dotenv from 'dotenv';

dotenv.config({ path: './frontend/.env.local' });

const THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_TW_CLIENT_ID;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY_DEPLOY;
const BASE_URL = 'https://cryptogift-wallets.vercel.app';

// CRITICAL TOKENS - Confirmed problematic from analysis
const PROBLEMATIC_TOKENS = [135, 136, 1];

console.log(`🎯 PILOT MIGRATION - CRITICAL TOKENS ONLY`);
console.log(`📋 Contract: ${CONTRACT_ADDRESS}`);
console.log(`🌐 Base URL: ${BASE_URL}`);
console.log(`🔧 Tokens to migrate: ${PROBLEMATIC_TOKENS.join(', ')}`);

if (!PRIVATE_KEY) {
  console.error('❌ CRITICAL: PRIVATE_KEY_DEPLOY not found in environment');
  process.exit(1);
}

const client = createThirdwebClient({ clientId: THIRDWEB_CLIENT_ID });
const contract = getContract({ 
  client, 
  chain: baseSepolia, 
  address: CONTRACT_ADDRESS 
});
const account = privateKeyToAccount({ client, privateKey: PRIVATE_KEY });

/**
 * Migrate specific token
 */
async function migrateToken(tokenId) {
  try {
    // 1. Check current tokenURI
    const currentURI = await readContract({
      contract,
      method: "function tokenURI(uint256) view returns (string)",
      params: [BigInt(tokenId)]
    });
    
    console.log(`\n🔍 Token ${tokenId}:`);
    console.log(`   Current: ${currentURI}`);
    
    // 2. Generate new URI
    const newURI = `${BASE_URL}/api/nft-metadata/${CONTRACT_ADDRESS}/${tokenId}`;
    console.log(`   New: ${newURI}`);
    
    // 3. Check if already migrated
    if (currentURI === newURI) {
      console.log(`✅ Token ${tokenId} already migrated!`);
      return { tokenId, status: 'already_migrated' };
    }
    
    // 4. Prepare transaction
    console.log(`🔄 Migrating token ${tokenId}...`);
    const transaction = prepareContractCall({
      contract,
      method: "function updateTokenURI(uint256 tokenId, string uri)",
      params: [BigInt(tokenId), newURI],
    });
    
    // 5. Send transaction
    const result = await sendTransaction({
      transaction,
      account
    });
    
    console.log(`✅ Migration successful!`);
    console.log(`   TX Hash: ${result.transactionHash}`);
    
    // 6. Wait for confirmation
    console.log(`⏳ Waiting 5s for confirmation...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 7. Verify the change
    const updatedURI = await readContract({
      contract,
      method: "function tokenURI(uint256) view returns (string)",
      params: [BigInt(tokenId)]
    });
    
    if (updatedURI === newURI) {
      console.log(`🎉 VERIFIED: Token ${tokenId} successfully migrated!`);
      return { tokenId, status: 'success', txHash: result.transactionHash };
    } else {
      console.log(`⚠️ WARNING: Verification failed for token ${tokenId}`);
      console.log(`   Expected: ${newURI}`);
      console.log(`   Got: ${updatedURI}`);
      return { tokenId, status: 'verification_failed', txHash: result.transactionHash };
    }
    
  } catch (error) {
    console.error(`❌ Failed to migrate token ${tokenId}:`, error.message);
    return { tokenId, status: 'failed', error: error.message };
  }
}

/**
 * Validate endpoint works
 */
async function validateEndpoint(tokenId) {
  try {
    const metadataURL = `${BASE_URL}/api/nft-metadata/${CONTRACT_ADDRESS}/${tokenId}`;
    
    console.log(`🧪 Testing endpoint: ${metadataURL}`);
    
    // Test GET
    const response = await fetch(metadataURL);
    if (!response.ok) {
      throw new Error(`GET failed: ${response.status}`);
    }
    
    const metadata = await response.json();
    if (!metadata.image) {
      throw new Error('Metadata missing image field');
    }
    
    console.log(`✅ Endpoint working: ${response.status}`);
    console.log(`✅ Image URL: ${metadata.image}`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Endpoint validation failed: ${error.message}`);
    return false;
  }
}

/**
 * Main pilot migration
 */
async function runPilotMigration() {
  try {
    console.log('🚀 Starting Pilot Migration...');
    
    const results = [];
    
    for (const tokenId of PROBLEMATIC_TOKENS) {
      console.log(`\n📦 Processing token ${tokenId}...`);
      
      // Validate endpoint first
      const endpointValid = await validateEndpoint(tokenId);
      if (!endpointValid) {
        console.log(`⚠️ Skipping token ${tokenId} - endpoint validation failed`);
        results.push({ tokenId, status: 'endpoint_failed' });
        continue;
      }
      
      // Migrate token
      const result = await migrateToken(tokenId);
      results.push(result);
      
      // Rate limiting between tokens
      if (tokenId !== PROBLEMATIC_TOKENS[PROBLEMATIC_TOKENS.length - 1]) {
        console.log(`⏳ Waiting 10s before next token...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    // Summary
    console.log('\n📊 PILOT MIGRATION SUMMARY:');
    console.log(`═══════════════════════════════════`);
    
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'failed');
    const alreadyMigrated = results.filter(r => r.status === 'already_migrated');
    const endpointFailed = results.filter(r => r.status === 'endpoint_failed');
    
    console.log(`✅ Successful: ${successful.length}`);
    console.log(`♻️ Already migrated: ${alreadyMigrated.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`🔌 Endpoint issues: ${endpointFailed.length}`);
    console.log(`📋 Total processed: ${results.length}`);
    
    if (successful.length > 0) {
      console.log('\n🎉 PILOT MIGRATION SUCCESSFUL!');
      console.log('📋 Successfully migrated tokens:');
      successful.forEach(r => {
        console.log(`   Token ${r.tokenId}: ${r.txHash}`);
      });
      
      console.log('\n🔍 VALIDATION STEPS:');
      console.log('1. Check BaseScan pages for migrated tokens:');
      successful.forEach(r => {
        console.log(`   https://sepolia.basescan.org/token/${CONTRACT_ADDRESS}?a=${r.tokenId}`);
      });
      
      console.log('\n2. Test metadata endpoints:');
      successful.forEach(r => {
        console.log(`   ${BASE_URL}/api/nft-metadata/${CONTRACT_ADDRESS}/${r.tokenId}`);
      });
      
      console.log('\n⏰ Allow 5-10 minutes for BaseScan cache to refresh');
      console.log('🚀 If successful, proceed with mass migration of remaining tokens');
    }
    
    if (failed.length > 0) {
      console.log('\n❌ FAILED MIGRATIONS:');
      failed.forEach(r => {
        console.log(`   Token ${r.tokenId}: ${r.error}`);
      });
    }
    
  } catch (error) {
    console.error('💥 PILOT MIGRATION FAILED:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPilotMigration().catch(console.error);
}

export { runPilotMigration };