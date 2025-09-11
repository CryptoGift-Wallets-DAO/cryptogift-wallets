#!/usr/bin/env node

/**
 * LIVE TEST: Token 187 Password Validation Analysis
 * Using the enhanced debugging to identify the exact issue
 */

const { ethers } = require('ethers');

const TOKEN_ID = '187';
const PASSWORD = 'Rafael1996.C';
const RPC_URL = 'https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e';
const CONTRACT_ADDRESS = '0x46175CfC233500DA803841DEef7f2816e7A129E0';

console.log('🔍 INVESTIGATING TOKEN 187');
console.log('===========================');
console.log(`Token: ${TOKEN_ID}`);
console.log(`Password: ${PASSWORD}`);

async function investigateToken187() {
  try {
    // Step 1: Find which gift contains token 187
    console.log('\n📋 STEP 1: Finding gift for token 187...');
    
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const abiCoder = new ethers.AbiCoder();
    
    // Get gift counter
    const giftCounterData = await provider.call({
      to: CONTRACT_ADDRESS,
      data: '0x' + ethers.keccak256(ethers.toUtf8Bytes('giftCounter()')).slice(2, 10)
    });
    
    const giftCounter = parseInt(giftCounterData, 16);
    console.log(`Total gifts: ${giftCounter}`);
    
    // Search for token 187 (start from most recent)
    let foundGiftId = null;
    let expectedHash = null;
    
    for (let giftId = giftCounter; giftId >= Math.max(1, giftCounter - 20); giftId--) {
      try {
        const giftData = await provider.call({
          to: CONTRACT_ADDRESS,
          data: ethers.concat([
            '0x' + ethers.keccak256(ethers.toUtf8Bytes('getGift(uint256)')).slice(2, 10),
            ethers.zeroPadValue(ethers.toBeHex(BigInt(giftId)), 32)
          ])
        });
        
        if (giftData && giftData !== '0x') {
          const decoded = abiCoder.decode(
            ['address', 'uint256', 'address', 'uint256', 'bytes32', 'uint8'],
            giftData
          );
          
          const tokenId = decoded[3].toString();
          
          if (tokenId === TOKEN_ID) {
            foundGiftId = giftId;
            expectedHash = decoded[4];
            console.log(`✅ FOUND: Token ${TOKEN_ID} is in Gift ${giftId}`);
            console.log(`Expected hash: ${expectedHash}`);
            break;
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`Error checking gift ${giftId}: ${error.message.substring(0, 50)}...`);
      }
    }
    
    if (!foundGiftId) {
      console.log('❌ Token 187 not found in recent gifts');
      return;
    }
    
    // Step 2: Test hash generation with different scenarios
    console.log('\n🔐 STEP 2: Testing hash generation scenarios...');
    
    // Use the salt from the frontend log
    const frontendSalt = '0x9a10007167c9dca883452c0aca65240e9db8a9a4cbc38574d2941200fab1dd51';
    
    console.log(`Using frontend salt: ${frontendSalt}`);
    console.log(`Using correct giftId: ${foundGiftId}`);
    
    const scenarios = [
      { giftId: foundGiftId, desc: 'Correct giftId from contract' },
      { giftId: 187, desc: 'Assumed giftId = tokenId' },
      { giftId: 186, desc: 'Previous token giftId' },
      { giftId: foundGiftId + 1, desc: 'Next giftId' },
      { giftId: foundGiftId - 1, desc: 'Previous giftId' }
    ];
    
    scenarios.forEach(scenario => {
      try {
        const hash = ethers.solidityPackedKeccak256(
          ['string', 'bytes32', 'uint256', 'address', 'uint256'],
          [PASSWORD, frontendSalt, BigInt(scenario.giftId), CONTRACT_ADDRESS, BigInt(84532)]
        );
        
        const matches = hash.toLowerCase() === expectedHash.toLowerCase();
        const matchIcon = matches ? '🎯' : '❌';
        const positions = matches ? 'PERFECT MATCH!' : getFirstDifference(hash, expectedHash);
        
        console.log(`${matchIcon} GiftId ${scenario.giftId} (${scenario.desc})`);
        console.log(`   Generated: ${hash.slice(0, 20)}...`);
        console.log(`   Expected:  ${expectedHash.slice(0, 20)}...`);
        console.log(`   Result: ${positions}`);
        console.log('');
        
        if (matches) {
          console.log('🎉 SOLUTION FOUND!');
          console.log(`✅ Token ${TOKEN_ID} should use giftId ${scenario.giftId} for hashing`);
        }
        
      } catch (error) {
        console.error(`❌ Error testing giftId ${scenario.giftId}: ${error.message}`);
      }
    });
    
    // Step 3: Test with production API
    console.log('\n🚀 STEP 3: Testing with production API...');
    
    const testData = {
      tokenId: TOKEN_ID,
      password: PASSWORD,
      salt: frontendSalt,
      deviceId: 'debug_investigation_' + Date.now()
    };
    
    try {
      const response = await fetch('https://cryptogift-wallets.vercel.app/api/pre-claim/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });
      
      const data = await response.json();
      
      console.log('📡 API Response:');
      console.log(`Status: ${response.status}`);
      console.log(`Valid: ${data.valid}`);
      console.log(`Error: ${data.error}`);
      
      if (!data.valid) {
        console.log('\n🔍 The enhanced debugging should now show in production logs:');
        console.log('   1. Salt reception logging');
        console.log('   2. Hash generation parameters');
        console.log('   3. Systematic gift search results');
        console.log('   4. Character-by-character hash comparison');
      }
      
    } catch (error) {
      console.error('❌ API test failed:', error.message);
    }
    
  } catch (error) {
    console.error('💥 Investigation failed:', error);
  }
}

function getFirstDifference(hash1, hash2) {
  const h1 = hash1.toLowerCase();
  const h2 = hash2.toLowerCase();
  
  for (let i = 0; i < Math.min(h1.length, h2.length); i++) {
    if (h1[i] !== h2[i]) {
      return `Differ at position ${i}: '${h1[i]}' vs '${h2[i]}'`;
    }
  }
  return 'Same length but different';
}

// Run investigation
investigateToken187();