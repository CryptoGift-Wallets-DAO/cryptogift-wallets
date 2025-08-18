#!/usr/bin/env node

/**
 * DECODE GIFT 186 DATA - CRITICAL DISCOVERY
 * This will reveal the exact password hash expected by the contract
 */

const { ethers } = require('ethers');

// Raw response from contract call
const rawData = "0x000000000000000000000000c655bf2bd9afa997c757bef290a9bb6ca41c5de600000000000000000000000000000000000000000000000000000000689d4f64000000000000000000000000e9f316159a0830114252a96a6b7ca6efd874650f000000000000000000000000000000000000000000000000000000000000009dc25b2cc92679e9447247b3f54435cfae62637b8d1884515bcf54bb34c8fe67f30000000000000000000000000000000000000000000000000000000000000001";

console.log('🔍 DECODING GIFT 186 - CRITICAL DISCOVERY');
console.log('========================================');

try {
  const abiCoder = new ethers.AbiCoder();
  
  // Decode according to gift structure: (address creator, uint256 expirationTime, address nftContract, uint256 tokenId, bytes32 passwordHash, uint8 status)
  const decoded = abiCoder.decode(
    ['address', 'uint256', 'address', 'uint256', 'bytes32', 'uint8'],
    rawData
  );
  
  console.log('📋 GIFT 186 DATA:');
  console.log('=================');
  console.log(`✅ Creator: ${decoded[0]}`);
  console.log(`✅ Expiration Time: ${decoded[1].toString()} (${new Date(Number(decoded[1]) * 1000).toISOString()})`);
  console.log(`✅ NFT Contract: ${decoded[2]}`);
  console.log(`✅ Token ID: ${decoded[3].toString()}`);
  console.log(`✅ Password Hash: ${decoded[4]}`);
  console.log(`✅ Status: ${decoded[5]} (0=Active, 1=Claimed, 2=Returned)`);
  
  console.log('\n🎯 CRITICAL FINDING:');
  console.log('====================');
  console.log(`Token ${decoded[3]} in gift 186 has expected password hash:`);
  console.log(`${decoded[4]}`);
  
  // Check if this token matches our target
  if (decoded[3].toString() === '186') {
    console.log('\n✅ PERFECT MATCH! Token 186 → Gift 186');
    console.log('This means the giftId mapping is simple: tokenId = giftId');
  } else {
    console.log(`\n❌ TOKEN MISMATCH! Gift 186 contains token ${decoded[3]}, not token 186`);
    console.log('We need to find which gift contains token 186');
  }
  
  // Now test hash generation with our parameters
  console.log('\n🔐 TESTING HASH GENERATION:');
  console.log('===========================');
  
  const testPassword = 'Rafael1996.C';
  const testSalt = '0x3ffdb36b929c31ececac4277c83cd9eed739ff4eb4ba622b1d869dfd3e70bea6'; // From our diagnostic
  const giftId = 186; // Assuming tokenId = giftId
  const contractAddress = '0x46175CfC233500DA803841DEef7f2816e7A129E0';
  const chainId = 84532;
  
  const generatedHash = ethers.solidityPackedKeccak256(
    ['string', 'bytes32', 'uint256', 'address', 'uint256'],
    [testPassword, testSalt, BigInt(giftId), contractAddress, BigInt(chainId)]
  );
  
  console.log(`Generated hash: ${generatedHash}`);
  console.log(`Expected hash:  ${decoded[4]}`);
  console.log(`Match: ${generatedHash.toLowerCase() === decoded[4].toLowerCase()}`);
  
  if (generatedHash.toLowerCase() !== decoded[4].toLowerCase()) {
    console.log('\n🔍 HASH MISMATCH - POSSIBLE CAUSES:');
    console.log('===================================');
    console.log('1. Different salt used during gift creation');
    console.log('2. Different password used during gift creation'); 
    console.log('3. Different giftId (tokenId ≠ giftId)');
    console.log('4. Different contract address');
    console.log('5. Different chainId');
    
    console.log('\n🧪 Testing different giftId values...');
    
    // Test different giftId candidates
    const giftIdCandidates = [186, 187, 185, 184, 183, 182, 181, 180];
    
    for (const testGiftId of giftIdCandidates) {
      const testHash = ethers.solidityPackedKeccak256(
        ['string', 'bytes32', 'uint256', 'address', 'uint256'],
        [testPassword, testSalt, BigInt(testGiftId), contractAddress, BigInt(chainId)]
      );
      
      if (testHash.toLowerCase() === decoded[4].toLowerCase()) {
        console.log(`🎯 MATCH FOUND! Token 186 maps to giftId ${testGiftId}`);
        break;
      } else {
        console.log(`   GiftId ${testGiftId}: ${testHash.slice(0, 10)}... (no match)`);
      }
    }
  } else {
    console.log('\n🎉 PERFECT MATCH! Password validation should work.');
  }
  
} catch (error) {
  console.error('❌ Decode failed:', error);
}

console.log('\n📊 NEXT STEPS:');
console.log('==============');
console.log('1. If token 186 is in gift 186: mapping works correctly');
console.log('2. If token 186 is in different gift: need to find correct mapping');
console.log('3. Compare generated hash with expected hash to identify discrepancy');