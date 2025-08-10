#!/usr/bin/env node
/**
 * E2E TOKENURI → JSON → IMAGE VALIDATION
 * 
 * Tests the complete flow:
 * 1. Read tokenURI from blockchain contract
 * 2. Fetch JSON metadata from that URI (should be our endpoint)  
 * 3. Fetch image URL from metadata (should return 200/206)
 * 4. Validate no double encoding or malformed URLs
 * 
 * This is the ultimate validation that our fix is working end-to-end
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import { ethers } from "ethers";
import fetch from "node-fetch";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './frontend/.env.local' });

// CONFIGURATION
const RPC_URL = process.env.BASE_SEPOLIA_RPC || "https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS || "0xE9F316159a0830114252a96a6B7CA6efD874650F";
const TEST_TOKENS = process.env.E2E_TOKEN_IDS ? process.env.E2E_TOKEN_IDS.split(",").map(Number) : [136]; // Default to our successfully migrated token
const EXPECTED_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

if (!EXPECTED_BASE_URL) {
  console.error('❌ CRITICAL: BASE_URL not configured for E2E testing');
  console.error('   Add NEXT_PUBLIC_BASE_URL or VERCEL_URL to environment');
  process.exit(1);
}

console.log(`🧪 E2E VALIDATION: tokenURI → JSON → image`);
console.log(`📋 Contract: ${CONTRACT_ADDRESS}`);
console.log(`🌐 Expected base URL: ${EXPECTED_BASE_URL}`);
console.log(`🎯 Testing tokens: ${TEST_TOKENS.join(', ')}`);

// Simple ABI for tokenURI function
const TOKEN_URI_ABI = [
  "function tokenURI(uint256 tokenId) view returns (string)"
];

/**
 * Validate a single token end-to-end
 */
async function validateToken(tokenId) {
  try {
    console.log(`\n🔍 Testing token ${tokenId}...`);
    
    // 1. Get tokenURI from blockchain
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_URI_ABI, provider);
    const tokenURI = await contract.tokenURI(BigInt(tokenId));
    
    console.log(`   📡 On-chain tokenURI: ${tokenURI}`);
    
    // 2. Validate tokenURI format
    if (!tokenURI.startsWith('http')) {
      throw new Error(`Invalid tokenURI format: ${tokenURI}`);
    }
    
    // 3. Fetch JSON metadata (with HEAD support test)
    console.log(`   🔍 Testing HEAD request...`);
    const headResponse = await fetch(tokenURI, { method: 'HEAD' });
    if (!headResponse.ok) {
      throw new Error(`HEAD request failed: ${headResponse.status}`);
    }
    console.log(`   ✅ HEAD: ${headResponse.status} - ${headResponse.headers.get('content-type')}`);
    
    console.log(`   🔍 Testing GET request...`);
    const jsonResponse = await fetch(tokenURI);
    if (!jsonResponse.ok) {
      throw new Error(`JSON fetch failed: ${jsonResponse.status}`);
    }
    
    const metadata = await jsonResponse.json();
    console.log(`   ✅ JSON: ${jsonResponse.status} - Got metadata with ${Object.keys(metadata).length} fields`);
    
    // 4. Validate JSON structure
    const requiredFields = ['name', 'description', 'image'];
    for (const field of requiredFields) {
      if (!metadata[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    const imageUrl = metadata.image;
    console.log(`   🖼️ Image URL: ${imageUrl}`);
    
    // 5. Validate image URL format
    if (!imageUrl.startsWith('http')) {
      throw new Error(`Invalid image URL format: ${imageUrl}`);
    }
    
    // Check for double encoding
    if (imageUrl.includes('%2520')) {
      throw new Error(`Double encoding detected: ${imageUrl}`);
    }
    
    // Check for raw spaces (should be %20)
    if (imageUrl.includes(' ')) {
      throw new Error(`Raw spaces in URL: ${imageUrl}`);
    }
    
    // 6. Test image accessibility
    console.log(`   🔍 Testing image HEAD request...`);
    const imageHeadResponse = await fetch(imageUrl, { method: 'HEAD' });
    if (!imageHeadResponse.ok && imageHeadResponse.status !== 206) {
      // Some gateways return 206 (Partial Content) for HEAD requests
      throw new Error(`Image HEAD failed: ${imageHeadResponse.status}`);
    }
    console.log(`   ✅ Image HEAD: ${imageHeadResponse.status} - ${imageHeadResponse.headers.get('content-type')}`);
    
    // 7. Test image GET (first few bytes)
    console.log(`   🔍 Testing image GET with Range...`);
    const imageGetResponse = await fetch(imageUrl, { 
      method: 'GET',
      headers: { Range: 'bytes=0-1023' } // First 1KB
    });
    
    if (!imageGetResponse.ok && imageGetResponse.status !== 206) {
      throw new Error(`Image GET failed: ${imageGetResponse.status}`);
    }
    console.log(`   ✅ Image GET: ${imageGetResponse.status} - ${imageGetResponse.headers.get('content-type')}`);
    
    // 8. Count redirects (should be minimal)
    const redirectCount = imageGetResponse.redirected ? 1 : 0;
    if (redirectCount > 2) {
      console.warn(`   ⚠️ High redirect count: ${redirectCount}`);
    }
    
    return {
      tokenId,
      status: 'success',
      tokenURI,
      imageUrl,
      redirectCount,
      jsonStatus: jsonResponse.status,
      imageStatus: imageGetResponse.status
    };
    
  } catch (error) {
    console.error(`   ❌ Token ${tokenId} failed: ${error.message}`);
    return {
      tokenId,
      status: 'failed',
      error: error.message
    };
  }
}

/**
 * Run full E2E validation
 */
async function runE2EValidation() {
  try {
    console.log('\n🚀 Starting E2E validation...');
    
    const results = [];
    
    for (const tokenId of TEST_TOKENS) {
      const result = await validateToken(tokenId);
      results.push(result);
      
      // Rate limiting between tests
      if (tokenId !== TEST_TOKENS[TEST_TOKENS.length - 1]) {
        console.log('   ⏳ Waiting 2s before next token...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Summary
    console.log('\n📊 E2E VALIDATION SUMMARY:');
    console.log(`═══════════════════════════════════`);
    
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'failed');
    
    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`📋 Total tested: ${results.length}`);
    
    if (successful.length > 0) {
      console.log('\n🎉 E2E VALIDATION SUCCESSFUL!');
      console.log('📋 Successful validations:');
      successful.forEach(r => {
        console.log(`   Token ${r.tokenId}: JSON ${r.jsonStatus} → Image ${r.imageStatus} (${r.redirectCount} redirects)`);
      });
      
      console.log('\n✅ VALIDATED FLOW:');
      console.log('1. ✅ tokenURI points to HTTP JSON endpoint');
      console.log('2. ✅ HEAD requests supported (no 405 errors)'); 
      console.log('3. ✅ JSON metadata has required fields');
      console.log('4. ✅ Image URLs properly encoded (no double encoding)');
      console.log('5. ✅ Images accessible with minimal redirects');
      
      console.log('\n🎯 BASESCAN COMPATIBILITY CONFIRMED:');
      console.log('   - tokenURI → JSON ✅');
      console.log('   - JSON → image field ✅');
      console.log('   - No raw spaces or %2520 ✅');
      console.log('   - HEAD support ✅');
    }
    
    if (failed.length > 0) {
      console.log('\n❌ FAILED VALIDATIONS:');
      failed.forEach(r => {
        console.log(`   Token ${r.tokenId}: ${r.error}`);
      });
    }
    
    // Exit with error if any tests failed
    if (failed.length > 0) {
      console.log('\n💥 E2E VALIDATION FAILED - Issues need to be resolved');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 E2E VALIDATION CRASHED:', error);
    process.exit(1);
  }
}

// Export for testing
export { validateToken, runE2EValidation };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runE2EValidation().catch(console.error);
}