#!/usr/bin/env node

/**
 * LIVE TEST: Token 186 con contraseña real "Rafael1996.C"
 */

const { ethers } = require('ethers');

const testData = {
  tokenId: '186',
  password: 'Rafael1996.C', // Contraseña real proporcionada
  salt: ethers.hexlify(ethers.randomBytes(32)), // Salt aleatorio como hace el frontend
  deviceId: 'debug_test_' + Date.now()
};

console.log('🧪 TESTING TOKEN 186 WITH REAL PASSWORD');
console.log('======================================');
console.log(`Token ID: ${testData.tokenId}`);
console.log(`Password: ${testData.password}`);
console.log(`Salt: ${testData.salt}`);

async function testRealPassword() {
  try {
    console.log('\n🚀 Sending request to production API...');
    
    const response = await fetch('http://localhost:3000/api/pre-claim/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log(`📡 Response: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log('📄 Response Data:');
    console.log(JSON.stringify(data, null, 2));

    if (response.ok && data.valid) {
      console.log('\n✅ SUCCESS! Password validation worked!');
    } else {
      console.log('\n❌ FAILED - Check the enhanced logs for detailed analysis');
      console.log('The new debug logging should show exactly why the hash mismatch occurred');
    }

  } catch (error) {
    console.error('\n💥 Request failed:', error);
  }
}

// También probar hash generation local
function testLocalHashGeneration() {
  console.log('\n🔐 LOCAL HASH GENERATION TEST:');
  console.log('==============================');
  
  // Parámetros que usa el backend
  const CONTRACT_ADDRESS = '0x46175CfC233500DA803841DEef7f2816e7A129E0';
  const CHAIN_ID = 84532;
  
  // Test con diferentes giftId candidates
  const giftIdCandidates = [186, 187, 185, 200, 150]; // Posibles giftId values
  
  giftIdCandidates.forEach(giftId => {
    try {
      const hash = ethers.solidityPackedKeccak256(
        ['string', 'bytes32', 'uint256', 'address', 'uint256'],
        [testData.password, testData.salt, BigInt(giftId), CONTRACT_ADDRESS, BigInt(CHAIN_ID)]
      );
      
      console.log(`GiftId ${giftId}: ${hash.slice(0, 20)}...${hash.slice(-10)}`);
    } catch (error) {
      console.error(`Error with giftId ${giftId}:`, error.message);
    }
  });
}

// Run tests
testLocalHashGeneration();
testRealPassword();