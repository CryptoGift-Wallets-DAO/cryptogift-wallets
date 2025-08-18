#!/usr/bin/env node

/**
 * DIAGNOSTIC SCRIPT: Token 186 Password Validation Deep Analysis
 * Finds the exact cause of hash mismatch using comprehensive testing
 */

const { ethers } = require('ethers');

const TOKEN_ID = '186';
const REAL_PASSWORD = 'Rafael1996.C';
const CONTRACT_ADDRESS = '0x46175CfC233500DA803841DEef7f2816e7A129E0';
const CHAIN_ID = 84532;

console.log('🔬 COMPREHENSIVE PASSWORD HASH DIAGNOSTIC');
console.log('=========================================');
console.log(`🎯 Target: Token ${TOKEN_ID} with password "${REAL_PASSWORD}"`);

async function testAllScenarios() {
  console.log('\n📋 PHASE 1: Salt Generation Analysis');
  console.log('------------------------------------');
  
  // Generate multiple salts to test consistency
  const salts = [];
  for (let i = 0; i < 5; i++) {
    const salt = ethers.hexlify(ethers.randomBytes(32));
    salts.push(salt);
    console.log(`Salt ${i + 1}: ${salt}`);
  }
  
  console.log('\n🎯 PHASE 2: GiftId Mapping Analysis');
  console.log('-----------------------------------');
  
  // Test with most probable giftId candidates based on token patterns
  const giftIdCandidates = [
    parseInt(TOKEN_ID),     // 186 - Same as tokenId
    parseInt(TOKEN_ID) + 1, // 187 - +1 offset
    parseInt(TOKEN_ID) - 1, // 185 - -1 offset  
    150, 160, 170, 180, 190, 200 // Common range values
  ];
  
  console.log('Testing giftId candidates:', giftIdCandidates);
  
  console.log('\n🔐 PHASE 3: Hash Generation Matrix');
  console.log('----------------------------------');
  
  // Create hash matrix for all combinations
  const hashMatrix = [];
  
  salts.forEach((salt, saltIndex) => {
    giftIdCandidates.forEach(giftId => {
      try {
        const hash = ethers.solidityPackedKeccak256(
          ['string', 'bytes32', 'uint256', 'address', 'uint256'],
          [REAL_PASSWORD, salt, BigInt(giftId), CONTRACT_ADDRESS, BigInt(CHAIN_ID)]
        );
        
        hashMatrix.push({
          saltIndex: saltIndex + 1,
          salt: salt.slice(0, 10) + '...',
          giftId,
          hash: hash.slice(0, 20) + '...' + hash.slice(-10),
          fullHash: hash
        });
        
        console.log(`Salt${saltIndex + 1} + GiftId${giftId}: ${hash.slice(0, 20)}...${hash.slice(-10)}`);
      } catch (error) {
        console.error(`❌ Error with Salt${saltIndex + 1} + GiftId${giftId}:`, error.message);
      }
    });
  });
  
  console.log('\n📡 PHASE 4: Production API Test');
  console.log('--------------------------------');
  
  // Test with production API using first salt
  const testSalt = salts[0];
  
  const apiTestData = {
    tokenId: TOKEN_ID,
    password: REAL_PASSWORD,
    salt: testSalt,
    deviceId: 'diagnostic_' + Date.now()
  };
  
  console.log('API Test Parameters:');
  console.log(`  Token: ${apiTestData.tokenId}`);
  console.log(`  Password: ${apiTestData.password.substring(0, 3)}***${apiTestData.password.substring(apiTestData.password.length - 2)}`);
  console.log(`  Salt: ${apiTestData.salt.substring(0, 10)}...`);
  
  try {
    console.log('\n🚀 Sending diagnostic request...');
    
    const response = await fetch('https://cryptogift-wallets.vercel.app/api/pre-claim/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiTestData)
    });

    console.log(`📡 Response: ${response.status} ${response.statusText}`);
    
    const responseData = await response.json();
    console.log('📄 Response:', JSON.stringify(responseData, null, 2));
    
    console.log('\n🔍 PHASE 5: Hash Comparison Analysis');
    console.log('------------------------------------');
    
    if (!responseData.valid && responseData.error === 'Invalid password') {
      console.log('✅ Password validation executed (no BigInt error)');
      console.log('🔍 The hash mismatch is now being logged in production with our enhanced debug logging');
      console.log('');
      console.log('📊 DIAGNOSTIC SUMMARY:');
      console.log('======================');
      console.log('❌ Issue: Password hash does not match expected value in smart contract');
      console.log('🎯 Next Steps:');
      console.log('   1. Check production logs for detailed hash comparison');
      console.log('   2. Verify the correct giftId mapping for token 186');
      console.log('   3. Compare our generated hashes with the contract\'s expected hash');
      console.log('');
      console.log('🔬 Generated Hashes for Token 186:');
      
      // Show the specific hashes we generated for this salt
      giftIdCandidates.forEach(giftId => {
        try {
          const hash = ethers.solidityPackedKeccak256(
            ['string', 'bytes32', 'uint256', 'address', 'uint256'],
            [REAL_PASSWORD, testSalt, BigInt(giftId), CONTRACT_ADDRESS, BigInt(CHAIN_ID)]
          );
          console.log(`   GiftId ${giftId}: ${hash}`);
        } catch (error) {
          console.log(`   GiftId ${giftId}: ERROR - ${error.message}`);
        }
      });
      
      console.log('');
      console.log('💡 HYPOTHESIS:');
      console.log('   The most likely cause is giftId mapping issue.');
      console.log('   Token 186 might map to a different giftId than we\'re testing.');
      console.log('   The production logs should now show the exact giftId and expected hash.');
      
    } else if (responseData.valid) {
      console.log('🎉 SUCCESS! Password validation worked!');
      console.log('✅ The hash matched successfully');
    } else {
      console.log('❓ Unexpected response:');
      console.log(JSON.stringify(responseData, null, 2));
    }
    
  } catch (error) {
    console.error('💥 API Request failed:', error.message);
  }
  
  console.log('\n🏁 DIAGNOSTIC COMPLETE');
  console.log('======================');
  console.log('📝 Summary of findings should now be visible in production logs');
  console.log('🔗 Check: https://cryptogift-wallets.vercel.app/debug for detailed analysis');
}

// Run the comprehensive diagnostic
testAllScenarios().catch(console.error);