#!/usr/bin/env node

/**
 * HASH GENERATION DIAGNOSIS
 * Deep analysis of why hash generation fails for token 187
 * Using multiple approaches to identify the exact issue
 */

const { ethers } = require('ethers');

const TOKEN_ID = '187';
const PASSWORD = 'Rafael1996.C';
const FRONTEND_SALT = '0x9a10007167c9dca883452c0aca65240e9db8a9a4cbc38574d2941200fab1dd51';
const GIFT_ID = 216; // From contract lookup
const CONTRACT_ADDRESS = '0x46175CfC233500DA803841DEef7f2816e7A129E0';
const CHAIN_ID = 84532;
const EXPECTED_HASH = '0x218f56ec609c5cbe7e292678d105bf49e618e11f4c5cda7ef61e5f807b8e4ac0';

console.log('🔍 HASH GENERATION DIAGNOSIS');
console.log('============================');

async function diagnoseHashGeneration() {
  console.log('\n📋 INPUT PARAMETERS:');
  console.log(`  • Password: "${PASSWORD}" (length: ${PASSWORD.length})`);
  console.log(`  • Salt: ${FRONTEND_SALT} (length: ${FRONTEND_SALT.length})`);
  console.log(`  • GiftId: ${GIFT_ID} (type: ${typeof GIFT_ID})`);
  console.log(`  • Contract: ${CONTRACT_ADDRESS} (length: ${CONTRACT_ADDRESS.length})`);
  console.log(`  • ChainId: ${CHAIN_ID} (type: ${typeof CHAIN_ID})`);
  console.log(`  • Expected Hash: ${EXPECTED_HASH}`);
  
  console.log('\n🔐 TESTING DIFFERENT HASH APPROACHES:');
  console.log('=====================================');
  
  // Approach 1: Exact replica of escrowUtils.ts
  try {
    const hash1 = ethers.solidityPackedKeccak256(
      ['string', 'bytes32', 'uint256', 'address', 'uint256'],
      [PASSWORD, FRONTEND_SALT, BigInt(GIFT_ID), CONTRACT_ADDRESS, BigInt(CHAIN_ID)]
    );
    
    console.log('\n1️⃣ APPROACH 1 - Exact escrowUtils replica:');
    console.log(`   Generated: ${hash1}`);
    console.log(`   Expected:  ${EXPECTED_HASH}`);
    console.log(`   Match: ${hash1.toLowerCase() === EXPECTED_HASH.toLowerCase() ? '✅' : '❌'}`);
    
    if (hash1.toLowerCase() !== EXPECTED_HASH.toLowerCase()) {
      analyzeHashDifferences(hash1, EXPECTED_HASH);
    }
  } catch (error) {
    console.error('❌ Approach 1 failed:', error.message);
  }
  
  // Approach 2: Different salt formats
  console.log('\n2️⃣ APPROACH 2 - Salt format variations:');
  
  const saltVariations = [
    { name: 'Original salt', salt: FRONTEND_SALT },
    { name: 'Salt without 0x', salt: FRONTEND_SALT.slice(2) },
    { name: 'Salt as bytes', salt: ethers.getBytes(FRONTEND_SALT) },
    { name: 'Salt as hex string', salt: FRONTEND_SALT.toLowerCase() },
    { name: 'Salt as hex string (upper)', salt: FRONTEND_SALT.toUpperCase() }
  ];
  
  saltVariations.forEach(variation => {
    try {
      const hash = ethers.solidityPackedKeccak256(
        ['string', 'bytes32', 'uint256', 'address', 'uint256'],
        [PASSWORD, variation.salt, BigInt(GIFT_ID), CONTRACT_ADDRESS, BigInt(CHAIN_ID)]
      );
      
      console.log(`   ${variation.name}: ${hash.slice(0, 10)}... ${hash.toLowerCase() === EXPECTED_HASH.toLowerCase() ? '✅' : '❌'}`);
      
      if (hash.toLowerCase() === EXPECTED_HASH.toLowerCase()) {
        console.log('🎯 FOUND WORKING SALT FORMAT:', variation.name);
        console.log('   Salt value:', variation.salt);
      }
    } catch (error) {
      console.log(`   ${variation.name}: ERROR - ${error.message}`);
    }
  });
  
  // Approach 3: Different parameter types
  console.log('\n3️⃣ APPROACH 3 - Parameter type variations:');
  
  const typeVariations = [
    { name: 'String giftId', giftId: GIFT_ID.toString() },
    { name: 'Number giftId', giftId: GIFT_ID },
    { name: 'BigInt giftId', giftId: BigInt(GIFT_ID) },
    { name: 'String chainId', chainId: CHAIN_ID.toString() },
    { name: 'Number chainId', chainId: CHAIN_ID },
    { name: 'BigInt chainId', chainId: BigInt(CHAIN_ID) }
  ];
  
  for (const variation of typeVariations) {
    try {
      const giftIdValue = variation.giftId !== undefined ? variation.giftId : BigInt(GIFT_ID);
      const chainIdValue = variation.chainId !== undefined ? variation.chainId : BigInt(CHAIN_ID);
      
      const hash = ethers.solidityPackedKeccak256(
        ['string', 'bytes32', 'uint256', 'address', 'uint256'],
        [PASSWORD, FRONTEND_SALT, giftIdValue, CONTRACT_ADDRESS, chainIdValue]
      );
      
      console.log(`   ${variation.name}: ${hash.slice(0, 10)}... ${hash.toLowerCase() === EXPECTED_HASH.toLowerCase() ? '✅' : '❌'}`);
      
      if (hash.toLowerCase() === EXPECTED_HASH.toLowerCase()) {
        console.log('🎯 FOUND WORKING TYPE COMBINATION:', variation.name);
      }
    } catch (error) {
      console.log(`   ${variation.name}: ERROR - ${error.message}`);
    }
  }
  
  // Approach 4: Direct contract call simulation
  console.log('\n4️⃣ APPROACH 4 - Raw contract simulation:');
  
  try {
    // Simulate what the contract actually does
    const abiCoder = new ethers.AbiCoder();
    
    // Test various encoding approaches
    const encodings = [
      {
        name: 'abi.encodePacked simulation',
        data: ethers.concat([
          ethers.toUtf8Bytes(PASSWORD),
          FRONTEND_SALT,
          ethers.zeroPadValue(ethers.toBeHex(BigInt(GIFT_ID)), 32),
          ethers.getAddress(CONTRACT_ADDRESS).toLowerCase(),
          ethers.zeroPadValue(ethers.toBeHex(BigInt(CHAIN_ID)), 32)
        ])
      }
    ];
    
    encodings.forEach(encoding => {
      const hash = ethers.keccak256(encoding.data);
      console.log(`   ${encoding.name}: ${hash.slice(0, 10)}... ${hash.toLowerCase() === EXPECTED_HASH.toLowerCase() ? '✅' : '❌'}`);
      
      if (hash.toLowerCase() === EXPECTED_HASH.toLowerCase()) {
        console.log('🎯 FOUND WORKING ENCODING:', encoding.name);
      }
    });
    
  } catch (error) {
    console.error('❌ Contract simulation failed:', error.message);
  }
  
  // Approach 5: Check if the expected hash is wrong
  console.log('\n5️⃣ APPROACH 5 - Verify contract stored hash:');
  
  try {
    const provider = new ethers.JsonRpcProvider('https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e');
    
    // Read gift data again to confirm expected hash
    const giftData = await provider.call({
      to: CONTRACT_ADDRESS,
      data: ethers.concat([
        '0x' + ethers.keccak256(ethers.toUtf8Bytes('getGift(uint256)')).slice(2, 10),
        ethers.zeroPadValue(ethers.toBeHex(BigInt(GIFT_ID)), 32)
      ])
    });
    
    if (giftData && giftData !== '0x') {
      const abiCoder = new ethers.AbiCoder();
      const decoded = abiCoder.decode(
        ['address', 'uint256', 'address', 'uint256', 'bytes32', 'uint8'],
        giftData
      );
      
      const contractStoredHash = decoded[4];
      console.log(`   Contract stored hash: ${contractStoredHash}`);
      console.log(`   Matches expected: ${contractStoredHash.toLowerCase() === EXPECTED_HASH.toLowerCase() ? '✅' : '❌'}`);
      
      if (contractStoredHash.toLowerCase() !== EXPECTED_HASH.toLowerCase()) {
        console.log('⚠️  MISMATCH: The expected hash from our lookup may be wrong!');
        console.log(`   We expected: ${EXPECTED_HASH}`);
        console.log(`   Contract has: ${contractStoredHash}`);
      }
    }
  } catch (error) {
    console.error('❌ Contract verification failed:', error.message);
  }
}

function analyzeHashDifferences(generated, expected) {
  console.log('\n🔍 DETAILED HASH COMPARISON:');
  
  const gen = generated.toLowerCase();
  const exp = expected.toLowerCase();
  
  console.log(`   Generated: ${gen}`);
  console.log(`   Expected:  ${exp}`);
  
  let differences = 0;
  let firstDiff = -1;
  
  for (let i = 0; i < Math.min(gen.length, exp.length); i++) {
    if (gen[i] !== exp[i]) {
      if (firstDiff === -1) firstDiff = i;
      differences++;
    }
  }
  
  console.log(`   Total differences: ${differences}`);
  if (firstDiff !== -1) {
    console.log(`   First difference at position ${firstDiff}: '${gen[firstDiff]}' vs '${exp[firstDiff]}'`);
    
    // Show context around first difference
    const start = Math.max(0, firstDiff - 5);
    const end = Math.min(gen.length, firstDiff + 6);
    console.log(`   Context: ...${gen.slice(start, end)}... (generated)`);
    console.log(`   Context: ...${exp.slice(start, end)}... (expected)`);
  }
}

// Run diagnosis
diagnoseHashGeneration();