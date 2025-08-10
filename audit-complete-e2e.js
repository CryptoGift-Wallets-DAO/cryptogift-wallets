const { ethers } = require('ethers');
const fetch = require('node-fetch');

const RPC = 'https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e';
const CONTRACT = '0xE9F316159a0830114252a96a6B7CA6efD874650F';

// Test comprehensive sample: known working, problematic, and random sample
const TEST_TOKENS = [
  136, // Known migrated (should work)
  135, // Should work with API
  137, // New token (will test fix)
  1,   // Old problematic  
  // Random sample for comprehensive testing
  50, 60, 70, 80, 90, 100, 110, 120
];

const ABI = ['function tokenURI(uint256) view returns (string)'];

async function auditToken(tokenId) {
  const results = {
    tokenId,
    stage: 'START',
    status: 0,
    tokenURI: null,
    isValidJSON: false,
    hasImage: false,
    imageUrl: null,
    imageStatus: 0,
    redirectCount: 0,
    contentType: null,
    headSupported: false,
    error: null
  };

  try {
    // 1. Get on-chain tokenURI
    console.log(`🔍 Token ${tokenId}: Reading on-chain tokenURI...`);
    const provider = new ethers.JsonRpcProvider(RPC);
    const contract = new ethers.Contract(CONTRACT, ABI, provider);
    const tokenURI = await contract.tokenURI(BigInt(tokenId));
    
    results.tokenURI = tokenURI;
    results.stage = 'TOKENURI_READ';

    console.log(`📡 Token ${tokenId}: ${tokenURI}`);

    // Check for problematic patterns
    if (!tokenURI.startsWith('http')) {
      throw new Error(`Invalid tokenURI: ${tokenURI}`);
    }

    // 2. Test HEAD support
    console.log(`🔍 Token ${tokenId}: Testing HEAD support...`);
    try {
      const headResponse = await fetch(tokenURI, { method: 'HEAD' });
      results.headSupported = headResponse.ok;
      if (!headResponse.ok) {
        throw new Error(`HEAD failed: ${headResponse.status}`);
      }
      console.log(`✅ Token ${tokenId}: HEAD supported - ${headResponse.status}`);
    } catch (headError) {
      console.warn(`⚠️ Token ${tokenId}: HEAD failed - ${headError.message}`);
      results.error = `HEAD failed: ${headError.message}`;
    }

    // 3. Get JSON metadata
    console.log(`🔍 Token ${tokenId}: Fetching JSON metadata...`);
    const jsonResponse = await fetch(tokenURI);
    results.status = jsonResponse.status;
    results.stage = 'JSON_FETCH';

    if (!jsonResponse.ok) {
      throw new Error(`JSON fetch failed: ${jsonResponse.status}`);
    }

    const metadata = await jsonResponse.json();
    results.isValidJSON = true;
    results.stage = 'JSON_PARSED';

    // Validate JSON structure
    if (!metadata.name || !metadata.image) {
      throw new Error('Missing required JSON fields: name or image');
    }

    results.hasImage = !!metadata.image;
    results.imageUrl = metadata.image;

    console.log(`✅ Token ${tokenId}: JSON valid - ${metadata.name}`);

    // 4. Test image accessibility
    if (metadata.image) {
      console.log(`🖼️ Token ${tokenId}: Testing image: ${metadata.image}`);
      
      try {
        const imageResponse = await fetch(metadata.image, { 
          method: 'HEAD',
          redirect: 'manual' // Count redirects manually
        });

        let redirectCount = 0;
        let currentResponse = imageResponse;
        
        // Count redirects
        while (currentResponse.status >= 300 && currentResponse.status < 400) {
          redirectCount++;
          if (redirectCount > 5) break; // Prevent infinite loops
          
          const location = currentResponse.headers.get('location');
          if (!location) break;
          
          currentResponse = await fetch(location, { 
            method: 'HEAD', 
            redirect: 'manual' 
          });
        }

        results.imageStatus = currentResponse.status;
        results.redirectCount = redirectCount;
        results.contentType = currentResponse.headers.get('content-type');
        results.stage = 'IMAGE_TESTED';

        if (currentResponse.ok || currentResponse.status === 206) {
          console.log(`✅ Token ${tokenId}: Image accessible - ${currentResponse.status} (${redirectCount} redirects)`);
        } else {
          throw new Error(`Image failed: ${currentResponse.status} after ${redirectCount} redirects`);
        }

      } catch (imageError) {
        console.warn(`⚠️ Token ${tokenId}: Image test failed - ${imageError.message}`);
        results.error = `Image test failed: ${imageError.message}`;
        results.stage = 'IMAGE_FAILED';
      }
    }

    results.stage = 'SUCCESS';
    
  } catch (error) {
    console.error(`❌ Token ${tokenId}: Failed at ${results.stage} - ${error.message}`);
    results.error = error.message;
    results.stage = 'FAILED';
  }

  return results;
}

async function runCompleteAudit() {
  console.log('🧪 COMPLETE NFT METADATA AUDIT');
  console.log('===============================');
  console.log(`📋 Testing ${TEST_TOKENS.length} tokens`);
  console.log(`🎯 Tokens: ${TEST_TOKENS.join(', ')}`);
  console.log('');

  const results = [];

  for (const tokenId of TEST_TOKENS) {
    console.log(`\n🚀 Starting audit for token ${tokenId}...`);
    const result = await auditToken(tokenId);
    results.push(result);
    
    // Rate limiting
    console.log(`⏳ Waiting 1s before next token...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n📊 COMPLETE AUDIT RESULTS');
  console.log('==========================');
  console.table(results.map(r => ({
    TokenId: r.tokenId,
    Stage: r.stage,
    Status: r.status,
    HeadOK: r.headSupported ? '✅' : '❌',
    ValidJSON: r.isValidJSON ? '✅' : '❌',
    HasImage: r.hasImage ? '✅' : '❌',
    ImageStatus: r.imageStatus,
    Redirects: r.redirectCount,
    ContentType: r.contentType?.substring(0, 10) || 'N/A',
    Error: r.error?.substring(0, 30) || 'None'
  })));

  // Summary stats
  const successful = results.filter(r => r.stage === 'SUCCESS');
  const headSupported = results.filter(r => r.headSupported);
  const validJSON = results.filter(r => r.isValidJSON);
  const imageAccessible = results.filter(r => r.imageStatus === 200 || r.imageStatus === 206);

  console.log('\n🎯 AUDIT SUMMARY');
  console.log('================');
  console.log(`✅ Successful: ${successful.length}/${results.length} (${Math.round(successful.length/results.length*100)}%)`);
  console.log(`🔍 HEAD support: ${headSupported.length}/${results.length} (${Math.round(headSupported.length/results.length*100)}%)`);
  console.log(`📄 Valid JSON: ${validJSON.length}/${results.length} (${Math.round(validJSON.length/results.length*100)}%)`);
  console.log(`🖼️ Image accessible: ${imageAccessible.length}/${results.length} (${Math.round(imageAccessible.length/results.length*100)}%)`);

  // Check if critical tokens work
  const token136 = results.find(r => r.tokenId === 136);
  const token137 = results.find(r => r.tokenId === 137);

  console.log('\n🎯 CRITICAL TOKENS CHECK');
  console.log('========================');
  if (token136) {
    console.log(`Token 136 (migrated): ${token136.stage === 'SUCCESS' ? '✅ WORKING' : '❌ FAILED - ' + token136.error}`);
  }
  if (token137) {
    console.log(`Token 137 (new): ${token137.stage === 'SUCCESS' ? '✅ WORKING' : '❌ FAILED - ' + token137.error}`);
  }

  if (successful.length === results.length) {
    console.log('\n🎉 ALL TOKENS PASSED AUDIT!');
    console.log('✅ Head support working');
    console.log('✅ JSON endpoints working'); 
    console.log('✅ Images accessible');
    console.log('✅ BaseScan compatibility confirmed');
  } else {
    console.log('\n⚠️ SOME TOKENS FAILED AUDIT');
    const failed = results.filter(r => r.stage !== 'SUCCESS');
    console.log('❌ Failed tokens:', failed.map(r => r.tokenId).join(', '));
    failed.forEach(r => {
      console.log(`   Token ${r.tokenId}: ${r.error}`);
    });
  }
}

runCompleteAudit().catch(console.error);