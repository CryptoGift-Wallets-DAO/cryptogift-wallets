#!/usr/bin/env node

/**
 * MANUAL DECODE MINT TRANSACTION FOR TOKEN 187
 * The transaction was found but automatic decoding failed
 * Let's manually extract the salt and password
 */

const { ethers } = require('ethers');

const TX_HASH = '0x25f96da56735d8f99ab050707535d00845f2b659195b2abe84d218a86d659532';
const TOKEN_ID = '187';
const PASSWORD = 'Rafael1996.C';
const GIFT_ID = 216;
const CONTRACT_ADDRESS = '0x46175CfC233500DA803841DEef7f2816e7A129E0';
const CHAIN_ID = 84532;
const EXPECTED_HASH = '0x218f56ec609c5cbe7e292678d105bf49e618e11f4c5cda7ef61e5f807b8e4ac0';

console.log('🔍 MANUAL DECODE MINT TRANSACTION');
console.log('=================================');

async function decodeMintTransaction() {
  try {
    const provider = new ethers.JsonRpcProvider('https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e');
    
    // Get the transaction
    const tx = await provider.getTransaction(TX_HASH);
    
    console.log(`📋 Transaction: ${TX_HASH}`);
    console.log(`📝 Input Data: ${tx.data}`);
    console.log(`📏 Data Length: ${tx.data.length} characters`);
    
    // Remove function selector (first 10 characters including 0x)
    const selector = tx.data.slice(0, 10);
    const inputData = tx.data.slice(10);
    
    console.log(`🎯 Function Selector: ${selector}`);
    console.log(`📊 Input Data (hex): ${inputData}`);
    
    // Manual parsing approach
    console.log('\n🔧 MANUAL PARSING:');
    console.log('==================');
    
    try {
      // Try different decoding approaches
      const rawData = '0x' + inputData;
      
      // Approach 1: Direct ABI decoding with explicit types
      console.log('\n1️⃣ APPROACH 1: Standard ABI decode');
      try {
        const abiCoder = new ethers.AbiCoder();
        const decoded1 = abiCoder.decode(
          ['uint256', 'address', 'address', 'string', 'bytes32', 'uint256', 'string', 'address'],
          rawData
        );
        
        console.log('✅ Decode successful:');
        console.log(`   Token ID: ${decoded1[0].toString()}`);
        console.log(`   NFT Contract: ${decoded1[1]}`);
        console.log(`   Creator: ${decoded1[2]}`);
        console.log(`   Password: "${decoded1[3]}"`);
        console.log(`   Salt: ${decoded1[4]}`);
        console.log(`   Timeframe: ${decoded1[5].toString()}`);
        console.log(`   Gift Message: "${decoded1[6]}"`);
        console.log(`   Gate: ${decoded1[7]}`);
        
        // Test hash with this data
        const testHash = ethers.solidityPackedKeccak256(
          ['string', 'bytes32', 'uint256', 'address', 'uint256'],
          [decoded1[3], decoded1[4], BigInt(GIFT_ID), CONTRACT_ADDRESS, BigInt(CHAIN_ID)]
        );
        
        console.log('\n🔐 HASH TEST WITH DECODED DATA:');
        console.log(`   Password from TX: "${decoded1[3]}"`);
        console.log(`   Salt from TX: ${decoded1[4]}`);
        console.log(`   Generated Hash: ${testHash}`);
        console.log(`   Expected Hash:  ${EXPECTED_HASH}`);
        console.log(`   Match: ${testHash.toLowerCase() === EXPECTED_HASH.toLowerCase() ? '✅' : '❌'}`);
        
        if (testHash.toLowerCase() === EXPECTED_HASH.toLowerCase()) {
          console.log('\n🎉 SUCCESS! Found the correct salt and password from mint transaction.');
          console.log('\n📋 SOLUTION SUMMARY:');
          console.log(`   ✅ Original mint password: "${decoded1[3]}"`);
          console.log(`   ✅ Original mint salt: ${decoded1[4]}`);
          console.log(`   ❌ Frontend claiming salt: 0x9a10007167c9dca883452c0aca65240e9db8a9a4cbc38574d2941200fab1dd51`);
          console.log('\n🔧 FIX REQUIRED:');
          console.log('   The frontend must use the ORIGINAL MINT SALT, not generate a new one during claim.');
          console.log('   This indicates a fundamental architectural issue in the salt management system.');
        }
        
        return;
        
      } catch (error1) {
        console.log('❌ Approach 1 failed:', error1.message);
      }
      
      // Approach 2: Try without explicit types first
      console.log('\n2️⃣ APPROACH 2: Manual hex parsing');
      
      // Parse hex data manually in 32-byte chunks
      const chunks = [];
      for (let i = 0; i < inputData.length; i += 64) {
        chunks.push(inputData.slice(i, i + 64));
      }
      
      console.log(`📊 Parsed ${chunks.length} 32-byte chunks:`);
      chunks.forEach((chunk, index) => {
        console.log(`   Chunk ${index}: 0x${chunk}`);
      });
      
      // Look for the salt pattern in chunks
      console.log('\n🔍 Looking for salt pattern...');
      
      // Salt should be a 32-byte value (64 hex chars)
      // Password should be a string
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (chunk.length === 64 && !chunk.match(/^0+$/)) { // Not all zeros
          console.log(`   Potential salt at chunk ${i}: 0x${chunk}`);
          
          // Test this as salt
          const testSalt = '0x' + chunk;
          const testHash = ethers.solidityPackedKeccak256(
            ['string', 'bytes32', 'uint256', 'address', 'uint256'],
            [PASSWORD, testSalt, BigInt(GIFT_ID), CONTRACT_ADDRESS, BigInt(CHAIN_ID)]
          );
          
          console.log(`   Test hash: ${testHash.slice(0, 20)}...`);
          console.log(`   Expected:  ${EXPECTED_HASH.slice(0, 20)}...`);
          
          if (testHash.toLowerCase() === EXPECTED_HASH.toLowerCase()) {
            console.log('🎯 FOUND CORRECT SALT!');
            console.log(`   Salt: ${testSalt}`);
            console.log(`   Hash matches: ✅`);
            
            console.log('\n📋 SOLUTION CONFIRMED:');
            console.log(`   ✅ Correct mint salt: ${testSalt}`);
            console.log(`   ❌ Frontend claim salt: 0x9a10007167c9dca883452c0aca65240e9db8a9a4cbc38574d2941200fab1dd51`);
            console.log('\n🔧 ARCHITECTURAL FIX NEEDED:');
            console.log('   1. Store salt in gift metadata during mint');
            console.log('   2. Retrieve salt from metadata during claim');
            console.log('   3. Never generate new salt during claim process');
            return;
          }
        }
      }
      
    } catch (parseError) {
      console.error('❌ Manual parsing failed:', parseError.message);
    }
    
    // Approach 3: Direct BaseScan API check
    console.log('\n3️⃣ APPROACH 3: BaseScan API lookup');
    console.log('This would require API key, skipping for now...');
    
  } catch (error) {
    console.error('💥 Transaction decoding failed:', error);
  }
}

decodeMintTransaction();