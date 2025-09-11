#!/usr/bin/env node

/**
 * FIND MINTING SALT FOR TOKEN 187
 * Searches for the actual salt used during the minting transaction
 * This will reveal if there's a salt mismatch between mint and claim
 */

const { ethers } = require('ethers');

const TOKEN_ID = '187';
const PASSWORD = 'Rafael1996.C';
const CONTRACT_ADDRESS = '0x46175CfC233500DA803841DEef7f2816e7A129E0';
const CHAIN_ID = 84532;
const GIFT_ID = 216;
const EXPECTED_HASH = '0x218f56ec609c5cbe7e292678d105bf49e618e11f4c5cda7ef61e5f807b8e4ac0';
const RPC_URL = 'https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e';

console.log('🔍 FINDING MINTING SALT FOR TOKEN 187');
console.log('=====================================');

async function findMintingSalt() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    console.log('\n📋 STEP 1: Finding GiftRegisteredFromMint event for token 187...');
    
    // Search for GiftRegisteredFromMint events 
    const eventSignature = "GiftRegisteredFromMint(uint256,address,address,uint256,uint40,address,string,address)";
    const eventTopic = ethers.id(eventSignature);
    
    // Search recent blocks with RPC-safe chunking
    const currentBlock = await provider.getBlockNumber();
    const searchBlocks = 5000; // Search last 5k blocks  
    const fromBlock = currentBlock - searchBlocks;
    const maxChunkSize = 500; // RPC limit
    
    console.log(`🔍 Searching blocks ${fromBlock} to ${currentBlock} for token ${TOKEN_ID}...`);
    
    // Get all GiftRegisteredFromMint events in chunks
    const logs = [];
    for (let start = fromBlock; start <= currentBlock; start += maxChunkSize) {
      const end = Math.min(start + maxChunkSize - 1, currentBlock);
      
      try {
        const chunkLogs = await provider.getLogs({
          address: CONTRACT_ADDRESS,
          topics: [eventTopic],
          fromBlock: start,
          toBlock: end
        });
        logs.push(...chunkLogs);
        
        if (chunkLogs.length > 0) {
          console.log(`📦 Found ${chunkLogs.length} events in blocks ${start}-${end}`);
        }
      } catch (chunkError) {
        console.warn(`⚠️ Chunk ${start}-${end} failed:`, chunkError.message);
      }
    }
    
    console.log(`📦 Found ${logs.length} GiftRegisteredFromMint events`);
    
    // Parse events to find token 187
    let mintEvent = null;
    const abiCoder = new ethers.AbiCoder();
    
    for (const log of logs) {
      try {
        // Event structure: GiftRegisteredFromMint(uint256 indexed giftId, address indexed creator, address indexed nftContract, uint256 tokenId, uint40 expiresAt, address gate, string giftMessage, address registeredBy)
        const giftId = BigInt(log.topics[1]).toString();
        const creator = log.topics[2];
        const nftContract = log.topics[3];
        
        // Parse non-indexed data
        const decoded = abiCoder.decode(
          ['uint256', 'uint40', 'address', 'string', 'address'], // tokenId, expiresAt, gate, giftMessage, registeredBy
          log.data
        );
        
        const eventTokenId = decoded[0].toString();
        
        if (eventTokenId === TOKEN_ID) {
          mintEvent = {
            giftId,
            creator,
            nftContract,
            tokenId: eventTokenId,
            expiresAt: decoded[1],
            gate: decoded[2],
            giftMessage: decoded[3],
            registeredBy: decoded[4],
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber
          };
          
          console.log(`✅ FOUND MINT EVENT: Token ${TOKEN_ID} → Gift ${giftId}`);
          console.log(`   Transaction: ${log.transactionHash}`);
          console.log(`   Block: ${log.blockNumber}`);
          console.log(`   Creator: ${creator}`);
          console.log(`   Message: "${decoded[3]}"`);
          break;
        }
      } catch (decodeError) {
        // Skip malformed events
        continue;
      }
    }
    
    if (!mintEvent) {
      console.log('❌ Mint event not found for token 187');
      return;
    }
    
    console.log('\n📋 STEP 2: Analyzing mint transaction to find original salt...');
    
    // Get the transaction details
    const tx = await provider.getTransaction(mintEvent.transactionHash);
    const receipt = await provider.getTransactionReceipt(mintEvent.transactionHash);
    
    console.log(`🔗 Transaction Hash: ${mintEvent.transactionHash}`);
    console.log(`📝 Input Data Length: ${tx.data.length} bytes`);
    
    // Parse the transaction input to find the salt
    try {
      // The mint transaction likely called registerGiftMinted
      // Function signature: registerGiftMinted(uint256,address,address,string,bytes32,uint256,string,address)
      const functionSelector = tx.data.slice(0, 10);
      const inputData = tx.data.slice(10);
      
      console.log(`🎯 Function Selector: ${functionSelector}`);
      
      // Decode the function call
      const registerGiftMintedSignature = "registerGiftMinted(uint256,address,address,string,bytes32,uint256,string,address)";
      const functionHash = ethers.id(registerGiftMintedSignature).slice(0, 10);
      
      console.log(`Expected registerGiftMinted selector: ${functionHash}`);
      console.log(`Actual selector: ${functionSelector}`);
      console.log(`Selector match: ${functionSelector === functionHash ? '✅' : '❌'}`);
      
      if (functionSelector === functionHash) {
        console.log('\n🔓 DECODING MINT PARAMETERS:');
        
        const decoded = abiCoder.decode(
          ['uint256', 'address', 'address', 'string', 'bytes32', 'uint256', 'string', 'address'],
          inputData
        );
        
        const [tokenId, nftContract, creator, password, salt, timeframe, giftMessage, gate] = decoded;
        
        console.log(`   Token ID: ${tokenId.toString()}`);
        console.log(`   NFT Contract: ${nftContract}`);
        console.log(`   Creator: ${creator}`);
        console.log(`   Password: "${password}"`);
        console.log(`   Salt: ${salt}`);
        console.log(`   Timeframe: ${timeframe.toString()}`);
        console.log(`   Gift Message: "${giftMessage}"`);
        console.log(`   Gate: ${gate}`);
        
        console.log('\n🔐 TESTING WITH ORIGINAL MINT SALT:');
        console.log('==================================');
        
        // Test hash generation with the original salt from minting
        const testHash = ethers.solidityPackedKeccak256(
          ['string', 'bytes32', 'uint256', 'address', 'uint256'],
          [password, salt, BigInt(GIFT_ID), CONTRACT_ADDRESS, BigInt(CHAIN_ID)]
        );
        
        console.log(`   Original Password: "${password}"`);
        console.log(`   Test Password: "${PASSWORD}"`);
        console.log(`   Password Match: ${password === PASSWORD ? '✅' : '❌'}`);
        console.log(`   Original Salt: ${salt}`);
        console.log(`   Generated Hash: ${testHash}`);
        console.log(`   Expected Hash:  ${EXPECTED_HASH}`);
        console.log(`   Hash Match: ${testHash.toLowerCase() === EXPECTED_HASH.toLowerCase() ? '✅' : '❌'}`);
        
        if (testHash.toLowerCase() === EXPECTED_HASH.toLowerCase()) {
          console.log('\n🎉 SUCCESS! The original mint salt produces the correct hash.');
          console.log('❌ PROBLEM: Frontend is using a different salt than the one used during minting.');
          console.log('\n🔧 SOLUTION: The frontend needs to use the original mint salt:');
          console.log(`   Use this salt: ${salt}`);
          console.log(`   Instead of:    0x9a10007167c9dca883452c0aca65240e9db8a9a4cbc38574d2941200fab1dd51`);
        } else {
          console.log('\n❌ Even with original salt, hash does not match. Deeper issue exists.');
          
          // Analyze the differences
          const originalLower = testHash.toLowerCase();
          const expectedLower = EXPECTED_HASH.toLowerCase();
          
          console.log('\n🔍 CHARACTER-BY-CHARACTER ANALYSIS:');
          for (let i = 0; i < Math.min(originalLower.length, expectedLower.length); i++) {
            if (originalLower[i] !== expectedLower[i]) {
              console.log(`   Position ${i}: generated='${originalLower[i]}' vs expected='${expectedLower[i]}'`);
              break;
            }
          }
        }
        
      } else {
        console.log('❌ Transaction does not use registerGiftMinted function');
        console.log('This suggests a different minting flow was used.');
      }
      
    } catch (decodeError) {
      console.error('❌ Failed to decode transaction:', decodeError.message);
    }
    
  } catch (error) {
    console.error('💥 Investigation failed:', error);
  }
}

// Run investigation
findMintingSalt();