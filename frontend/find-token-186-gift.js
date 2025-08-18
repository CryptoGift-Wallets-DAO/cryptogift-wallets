#!/usr/bin/env node

/**
 * SYSTEMATIC SEARCH: Find which gift contains token 186
 * This will reveal the correct giftId mapping for token 186
 */

const { ethers } = require('ethers');

const CONTRACT_ADDRESS = '0x46175CfC233500DA803841DEef7f2816e7A129E0';
const RPC_URL = 'https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e';
const TARGET_TOKEN = '186';

async function findGiftForToken186() {
  console.log('🔍 SYSTEMATIC SEARCH: Find gift containing token 186');
  console.log('====================================================');
  
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const abiCoder = new ethers.AbiCoder();
    
    // Get total gift count
    const giftCounterResponse = await provider.call({
      to: CONTRACT_ADDRESS,
      data: '0x' + ethers.keccak256(ethers.toUtf8Bytes('giftCounter()')).slice(2, 10)
    });
    
    const giftCounter = parseInt(giftCounterResponse, 16);
    console.log(`📊 Total gifts in contract: ${giftCounter}`);
    
    // Search through all gifts (in reverse order, recent first)
    console.log('\n🔍 Searching for token 186...');
    
    let found = false;
    let checkedCount = 0;
    const maxToCheck = Math.min(50, giftCounter); // Check last 50 gifts
    
    for (let giftId = giftCounter; giftId > giftCounter - maxToCheck; giftId--) {
      try {
        // Get gift data
        const giftDataResponse = await provider.call({
          to: CONTRACT_ADDRESS,
          data: ethers.concat([
            '0x' + ethers.keccak256(ethers.toUtf8Bytes('getGift(uint256)')).slice(2, 10),
            ethers.zeroPadValue(ethers.toBeHex(BigInt(giftId)), 32)
          ])
        });
        
        if (giftDataResponse && giftDataResponse !== '0x') {
          const decoded = abiCoder.decode(
            ['address', 'uint256', 'address', 'uint256', 'bytes32', 'uint8'],
            giftDataResponse
          );
          
          const tokenId = decoded[3].toString();
          const creator = decoded[0];
          const passwordHash = decoded[4];
          const status = decoded[5];
          
          checkedCount++;
          
          // Show progress every 10 gifts
          if (checkedCount % 10 === 0) {
            console.log(`  📋 Checked ${checkedCount} gifts... (current: gift ${giftId} → token ${tokenId})`);
          }
          
          // Check if this is our target token
          if (tokenId === TARGET_TOKEN) {
            console.log('\n🎯 *** FOUND TOKEN 186! ***');
            console.log('==========================');
            console.log(`✅ Token 186 is in Gift ID: ${giftId}`);
            console.log(`✅ Creator: ${creator}`);
            console.log(`✅ Expected Password Hash: ${passwordHash}`);
            console.log(`✅ Status: ${status} (0=Active, 1=Claimed, 2=Returned)`);
            
            found = true;
            
            // Now test with the correct giftId
            console.log('\n🔐 TESTING WITH CORRECT GIFT ID:');
            console.log('================================');
            
            const testPassword = 'Rafael1996.C';
            const testSalt = '0x3ffdb36b929c31ececac4277c83cd9eed739ff4eb4ba622b1d869dfd3e70bea6';
            const contractAddress = '0x46175CfC233500DA803841DEef7f2816e7A129E0';
            const chainId = 84532;
            
            const generatedHash = ethers.solidityPackedKeccak256(
              ['string', 'bytes32', 'uint256', 'address', 'uint256'],
              [testPassword, testSalt, BigInt(giftId), contractAddress, BigInt(chainId)]
            );
            
            console.log(`Generated with giftId ${giftId}: ${generatedHash}`);
            console.log(`Expected from contract:        ${passwordHash}`);
            console.log(`🎯 Match: ${generatedHash.toLowerCase() === passwordHash.toLowerCase()}`);
            
            if (generatedHash.toLowerCase() === passwordHash.toLowerCase()) {
              console.log('\n🎉 PERFECT! This explains the hash mismatch!');
              console.log(`🎯 SOLUTION: Token 186 maps to giftId ${giftId}, not ${TARGET_TOKEN}`);
            } else {
              console.log('\n❌ Still no match. The issue might be:');
              console.log('   1. Different salt used during creation');
              console.log('   2. Different password used');
              console.log('   3. Different contract parameters');
            }
            
            break;
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.warn(`  ⚠️ Error checking gift ${giftId}: ${error.message.substring(0, 50)}...`);
      }
    }
    
    if (!found) {
      console.log('\n❌ TOKEN 186 NOT FOUND in last 50 gifts!');
      console.log('This suggests:');
      console.log(`   1. Token 186 is in gift ID < ${giftCounter - maxToCheck}`);
      console.log('   2. Token 186 was never registered as an escrow gift');
      console.log('   3. Token 186 uses a different contract or system');
      
      console.log('\n📋 Recent gifts found:');
      // Show some examples of recent token mappings
      for (let giftId = giftCounter; giftId > giftCounter - 10; giftId--) {
        try {
          const giftDataResponse = await provider.call({
            to: CONTRACT_ADDRESS,
            data: ethers.concat([
              '0x' + ethers.keccak256(ethers.toUtf8Bytes('getGift(uint256)')).slice(2, 10),
              ethers.zeroPadValue(ethers.toBeHex(BigInt(giftId)), 32)
            ])
          });
          
          if (giftDataResponse && giftDataResponse !== '0x') {
            const decoded = abiCoder.decode(
              ['address', 'uint256', 'address', 'uint256', 'bytes32', 'uint8'],
              giftDataResponse
            );
            
            console.log(`   Gift ${giftId} → Token ${decoded[3].toString()}`);
          }
        } catch (error) {
          // Skip failed reads
        }
      }
    }
    
    console.log(`\n📊 Search complete. Checked ${checkedCount} gifts.`);
    
  } catch (error) {
    console.error('💥 Search failed:', error);
  }
}

// Run the search
findGiftForToken186();