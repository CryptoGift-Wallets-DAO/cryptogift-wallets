#!/usr/bin/env node

/**
 * CRITICAL AUDIT: Find the real giftId for token 186
 * This will reveal the exact giftId that token 186 maps to
 */

const { ethers } = require('ethers');

const CONTRACT_ADDRESS = '0x46175CfC233500DA803841DEef7f2816e7A129E0';
const TOKEN_ID = '186';
const RPC_URL = 'https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e';

async function findGiftIdForToken186() {
  console.log('🔍 CRITICAL AUDIT: Finding real giftId for token 186');
  console.log('==================================================');
  
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Event signature for GiftRegisteredFromMint
    const eventSignature = "GiftRegisteredFromMint(uint256,address,address,uint256,uint40,address,string,address)";
    const eventTopic = ethers.id(eventSignature);
    
    console.log('🔍 Event signature:', eventSignature);
    console.log('🔍 Event topic:', eventTopic);
    
    // Search in recent blocks first
    const currentBlock = await provider.getBlockNumber();
    const searchFromBlock = Math.max(28915000, currentBlock - 100000); // Search last 100k blocks
    
    console.log(`📦 Searching blocks ${searchFromBlock} to ${currentBlock}...`);
    
    // Query events in chunks
    const maxBlocksPerQuery = 2000;
    let allLogs = [];
    
    for (let fromBlock = searchFromBlock; fromBlock <= currentBlock; fromBlock += maxBlocksPerQuery) {
      const toBlock = Math.min(fromBlock + maxBlocksPerQuery - 1, currentBlock);
      
      try {
        console.log(`  📋 Querying blocks ${fromBlock} to ${toBlock}...`);
        
        const logs = await provider.getLogs({
          address: CONTRACT_ADDRESS,
          topics: [eventTopic],
          fromBlock: fromBlock,
          toBlock: toBlock
        });
        
        console.log(`  📋 Found ${logs.length} events in this chunk`);
        allLogs.push(...logs);
        
        if (logs.length > 0) {
          console.log(`  ✅ Total events found so far: ${allLogs.length}`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.warn(`  ⚠️ Error querying blocks ${fromBlock}-${toBlock}:`, error.message);
      }
    }
    
    console.log(`\n📊 TOTAL EVENTS FOUND: ${allLogs.length}`);
    
    if (allLogs.length === 0) {
      console.log('❌ No events found! This suggests:');
      console.log('   1. Contract address is wrong');
      console.log('   2. Search range is wrong');
      console.log('   3. Event signature is wrong');
      return;
    }
    
    // Parse all events and look for token 186
    console.log('\n🔍 Parsing events to find token 186...');
    
    const abiCoder = new ethers.AbiCoder();
    let token186Found = false;
    
    for (let i = 0; i < allLogs.length; i++) {
      const log = allLogs[i];
      
      try {
        // Parse indexed parameters (topics)
        const giftId = BigInt(log.topics[1]).toString();
        const creator = ethers.getAddress('0x' + log.topics[2].slice(26)); // Remove padding
        const nftContract = ethers.getAddress('0x' + log.topics[3].slice(26)); // Remove padding
        
        // Parse non-indexed parameters (data)
        const decoded = abiCoder.decode(
          ['uint256', 'uint40', 'address', 'string', 'address'],
          log.data
        );
        
        const tokenId = decoded[0].toString();
        const expiresAt = decoded[1].toString();
        const gate = decoded[2];
        const giftMessage = decoded[3];
        const registeredBy = decoded[4];
        
        // Show first few events as examples
        if (i < 5) {
          console.log(`\nEvent ${i + 1}:`);
          console.log(`  GiftId: ${giftId}`);
          console.log(`  Creator: ${creator.slice(0, 10)}...`);
          console.log(`  NFT Contract: ${nftContract.slice(0, 10)}...`);
          console.log(`  Token ID: ${tokenId}`);
          console.log(`  Gift Message: "${giftMessage.substring(0, 30)}${giftMessage.length > 30 ? '...' : ''}"`);
        }
        
        // Check if this is token 186
        if (tokenId === TOKEN_ID) {
          console.log('\n🎯 *** FOUND TOKEN 186! ***');
          console.log('========================');
          console.log(`✅ Token ID: ${tokenId}`);
          console.log(`✅ Maps to Gift ID: ${giftId}`);
          console.log(`✅ Creator: ${creator}`);
          console.log(`✅ NFT Contract: ${nftContract}`);
          console.log(`✅ Gift Message: "${giftMessage}"`);
          console.log(`✅ Block: ${log.blockNumber}`);
          console.log(`✅ Transaction: ${log.transactionHash}`);
          
          token186Found = true;
          
          // Now get the gift data from the contract
          console.log('\n🔗 Fetching gift data from contract...');
          
          const giftData = await provider.call({
            to: CONTRACT_ADDRESS,
            data: ethers.concat([
              '0x' + ethers.keccak256(ethers.toUtf8Bytes('getGift(uint256)')).slice(2, 10),
              ethers.zeroPadValue(ethers.toBeHex(BigInt(giftId)), 32)
            ])
          });
          
          if (giftData !== '0x') {
            console.log('✅ Gift data found in contract');
            console.log(`   Raw data: ${giftData.slice(0, 50)}...`);
            
            // Decode the gift data
            const decodedGift = abiCoder.decode(
              ['address', 'uint256', 'address', 'uint256', 'bytes32', 'uint8'],
              giftData
            );
            
            console.log('\n📋 CONTRACT GIFT DATA:');
            console.log(`   Creator: ${decodedGift[0]}`);
            console.log(`   Expiration Time: ${decodedGift[1].toString()}`);
            console.log(`   NFT Contract: ${decodedGift[2]}`);
            console.log(`   Token ID: ${decodedGift[3].toString()}`);
            console.log(`   Password Hash: ${decodedGift[4]}`);
            console.log(`   Status: ${decodedGift[5]}`);
            
            console.log('\n💡 THIS IS THE EXPECTED PASSWORD HASH!');
            console.log(`Expected: ${decodedGift[4]}`);
            
          } else {
            console.log('❌ Gift data not found in contract');
          }
          
          break;
        }
        
      } catch (parseError) {
        if (i < 3) { // Only log first few parse errors
          console.warn(`⚠️ Failed to parse event ${i + 1}:`, parseError.message);
        }
      }
    }
    
    if (!token186Found) {
      console.log('\n❌ TOKEN 186 NOT FOUND!');
      console.log('This suggests:');
      console.log('   1. Token 186 was never minted as an escrow gift');
      console.log('   2. Token 186 was minted in different blocks outside our search range');
      console.log('   3. The event signature or parsing is incorrect');
      
      // Show some examples of what we did find
      console.log('\n📋 Examples of tokens found:');
      const abiCoder = new ethers.AbiCoder();
      for (let i = 0; i < Math.min(10, allLogs.length); i++) {
        try {
          const decoded = abiCoder.decode(
            ['uint256', 'uint40', 'address', 'string', 'address'],
            allLogs[i].data
          );
          const tokenId = decoded[0].toString();
          const giftId = BigInt(allLogs[i].topics[1]).toString();
          console.log(`   Token ${tokenId} → Gift ${giftId}`);
        } catch (error) {
          // Skip failed parses
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Search failed:', error);
  }
}

// Run the search
findGiftIdForToken186();