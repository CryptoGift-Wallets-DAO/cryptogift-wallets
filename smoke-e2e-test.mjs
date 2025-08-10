import { ethers } from "ethers";

const BASE_SEPOLIA_RPC = "https://sepolia.base.org";
const CONTRACT = "0xE9F316159a0830114252a96a6B7CA6efD874650F";
const TOKEN_IDS = [135, 136];

const ABI = ["function tokenURI(uint256) view returns (string)"];

async function testImageURL(url, tokenId) {
  console.log(`\n🔍 Testing image for token ${tokenId}:`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      timeout: 10000
    });
    
    console.log(`   ✅ Status: ${response.status} ${response.statusText}`);
    console.log(`   ✅ Content-Type: ${response.headers.get('content-type')}`);
    console.log(`   ✅ Content-Length: ${response.headers.get('content-length')}`);
    
    return {
      success: true,
      status: response.status,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length')
    };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function testTokenURI(uri, tokenId) {
  console.log(`\n🔍 Testing tokenURI for token ${tokenId}:`);
  console.log(`   URI: ${uri}`);
  
  try {
    const response = await fetch(uri, { timeout: 10000 });
    
    if (!response.ok) {
      console.log(`   ❌ Status: ${response.status} ${response.statusText}`);
      return { success: false, status: response.status };
    }
    
    const contentType = response.headers.get('content-type');
    console.log(`   ✅ Status: 200 OK`);
    console.log(`   ✅ Content-Type: ${contentType}`);
    
    if (!contentType?.includes('application/json')) {
      console.log(`   ⚠️ Warning: Expected application/json, got ${contentType}`);
    }
    
    const metadata = await response.json();
    console.log(`   ✅ JSON parsed successfully`);
    console.log(`   ✅ Name: ${metadata.name}`);
    console.log(`   ✅ Image: ${metadata.image}`);
    
    // Check for encoding issues
    const imageUrl = metadata.image;
    if (imageUrl.includes(' ')) {
      console.log(`   ❌ CRITICAL: Image URL contains raw spaces!`);
    }
    if (imageUrl.includes('%2520')) {
      console.log(`   ❌ CRITICAL: Image URL has double encoding (%2520)!`);
    }
    
    return {
      success: true,
      status: 200,
      contentType,
      metadata,
      imageUrl
    };
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

(async () => {
  console.log('🚀 SMOKE E2E TEST - NFT Metadata & Images');
  console.log('========================================');
  
  try {
    const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
    const contract = new ethers.Contract(CONTRACT, ABI, provider);
    
    for (const tokenId of TOKEN_IDS) {
      console.log(`\n📋 TESTING TOKEN ID ${tokenId}`);
      console.log('='.repeat(40));
      
      // Step 1: Read on-chain tokenURI
      let onChainURI;
      try {
        onChainURI = await contract.tokenURI(tokenId);
        console.log(`✅ On-chain tokenURI: ${onChainURI}`);
      } catch (error) {
        console.log(`❌ Failed to read tokenURI: ${error.message}`);
        continue;
      }
      
      // Step 2: Test if it's IPFS and convert to HTTP endpoint
      let httpEndpoint;
      if (onChainURI.startsWith('ipfs://')) {
        httpEndpoint = `https://cryptogift-wallets.vercel.app/api/nft-metadata/${CONTRACT}/${tokenId}`;
        console.log(`🔄 Converting IPFS to HTTP endpoint: ${httpEndpoint}`);
      } else {
        httpEndpoint = onChainURI;
      }
      
      // Step 3: Test HTTP endpoint
      const uriTest = await testTokenURI(httpEndpoint, tokenId);
      if (!uriTest.success) {
        console.log(`❌ Skipping image test due to metadata failure`);
        continue;
      }
      
      // Step 4: Test image URL
      const imageTest = await testImageURL(uriTest.imageUrl, tokenId);
      
      // Step 5: Summary
      console.log(`\n📊 SUMMARY FOR TOKEN ${tokenId}:`);
      console.log(`   Metadata: ${uriTest.success ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   Image: ${imageTest.success ? '✅ PASS' : '❌ FAIL'}`);
      
      if (!uriTest.success || !imageTest.success) {
        console.log(`   🚨 TOKEN ${tokenId} HAS ISSUES`);
      } else {
        console.log(`   🎉 TOKEN ${tokenId} FULLY FUNCTIONAL`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
  }
})();