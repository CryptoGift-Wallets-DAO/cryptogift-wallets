#!/usr/bin/env node

/**
 * FASE 5: Backfill Token 150 with Correct IPFS CIDs
 * 
 * This script:
 * 1. Reads token 150's on-chain tokenURI
 * 2. Extracts metadata CID and image CID 
 * 3. Stores them in Redis for proper fallback functionality
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

const { ethers } = require('ethers');
const { Redis } = require('@upstash/redis');

// Environment variables
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org';
const NFT_CONTRACT = process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS;
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!NFT_CONTRACT || !REDIS_URL || !REDIS_TOKEN) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN');
  process.exit(1);
}

const TOKEN_ID = '150';

async function backfillToken150() {
  console.log(`🔧 FASE 5: Backfilling token ${TOKEN_ID} with correct IPFS CIDs`);
  
  try {
    // Connect to blockchain
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const nftContract = new ethers.Contract(NFT_CONTRACT, [
      "function tokenURI(uint256 tokenId) view returns (string)"
    ], provider);
    
    // Get on-chain tokenURI
    console.log(`🔍 Reading on-chain tokenURI for token ${TOKEN_ID}...`);
    const tokenURI = await nftContract.tokenURI(BigInt(TOKEN_ID));
    console.log(`📋 TokenURI: ${tokenURI}`);
    
    // Handle case where tokenURI is HTTP (our own endpoint) - need to find original IPFS
    let metadataIpfsCid = '';
    let originalMetadataUri = '';
    
    if (tokenURI.startsWith('ipfs://')) {
      metadataIpfsCid = tokenURI.replace('ipfs://', '');
      originalMetadataUri = tokenURI;
      console.log(`✅ Metadata CID extracted from IPFS tokenURI: ${metadataIpfsCid}`);
    } else if (tokenURI.includes('/api/nft-metadata/') || tokenURI.includes('/api/metadata/')) {
      console.log(`⚠️ TokenURI points to our own endpoint - this is the exact problem we're fixing!`);
      console.log(`🔍 Analyzing transaction logs to find original IPFS metadataUri...`);
      
      // Find the mint transaction to extract original metadataUri
      const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
      
      // Search for Transfer events (this is expensive, so we limit the range)
      const currentBlock = await provider.getBlockNumber();
      const searchFromBlock = Math.max(0, currentBlock - 10000); // Smaller range to avoid RPC issues
      
      console.log(`🔍 Searching Transfer events from block ${searchFromBlock} to ${currentBlock}`);
      
      const filter = {
        address: NFT_CONTRACT,
        topics: [
          transferEventSignature,
          '0x0000000000000000000000000000000000000000000000000000000000000000', // from: zero address (mint)
          null, // to: any address
          ethers.zeroPadValue(`0x${BigInt(TOKEN_ID).toString(16)}`, 32) // tokenId
        ],
        fromBlock: searchFromBlock,
        toBlock: currentBlock
      };
      
      const logs = await provider.getLogs(filter);
      console.log(`📋 Found ${logs.length} Transfer events for token ${TOKEN_ID}`);
      
      if (logs.length === 0) {
        throw new Error(`No mint Transfer event found for token ${TOKEN_ID}`);
      }
      
      // Get the mint transaction
      const mintLog = logs[0];
      console.log(`🔍 Mint transaction hash: ${mintLog.transactionHash}`);
      
      const tx = await provider.getTransaction(mintLog.transactionHash);
      if (!tx) {
        throw new Error(`Transaction not found: ${mintLog.transactionHash}`);
      }
      
      console.log(`📋 Transaction data length: ${tx.data.length}`);
      
      // Try to decode the transaction data to extract metadataUri
      const mintToSelector = '0x449a52f8'; // mintTo(address,string)
      
      if (!tx.data.startsWith(mintToSelector)) {
        throw new Error(`Transaction does not use mintTo function, data starts with: ${tx.data.substring(0, 10)}`);
      }
      
      try {
        // Decode the function call
        const iface = new ethers.Interface([
          'function mintTo(address to, string memory tokenURI)'
        ]);
        const decoded = iface.decodeFunctionData('mintTo', tx.data);
        originalMetadataUri = decoded[1]; // second parameter is tokenURI
        
        console.log(`🎯 FOUND original metadataUri from transaction: ${originalMetadataUri}`);
        
        // Extract CID from original IPFS URI
        if (originalMetadataUri.startsWith('ipfs://')) {
          metadataIpfsCid = originalMetadataUri.replace('ipfs://', '');
          console.log(`✅ Metadata CID extracted from transaction: ${metadataIpfsCid}`);
        } else {
          throw new Error(`Original metadataUri is not IPFS: ${originalMetadataUri}`);
        }
      } catch (decodeError) {
        throw new Error(`Failed to decode transaction data: ${decodeError.message}`);
      }
    } else {
      throw new Error(`Unknown tokenURI format: ${tokenURI}`);
    }
    
    // Fetch metadata JSON to get image CID
    console.log(`🌐 Fetching metadata JSON from IPFS...`);
    const metadataResponse = await fetch(`https://ipfs.io/ipfs/${metadataIpfsCid}`);
    
    if (!metadataResponse.ok) {
      throw new Error(`Failed to fetch metadata: ${metadataResponse.status}`);
    }
    
    const metadataJson = await metadataResponse.json();
    console.log(`📋 Metadata JSON:`, {
      name: metadataJson.name,
      description: metadataJson.description?.substring(0, 50) + '...',
      image: metadataJson.image
    });
    
    // Extract image CID
    let imageIpfsCid = '';
    if (metadataJson.image && metadataJson.image.startsWith('ipfs://')) {
      imageIpfsCid = metadataJson.image.replace('ipfs://', '');
      console.log(`✅ Image CID extracted: ${imageIpfsCid}`);
    } else {
      throw new Error(`Image is not IPFS: ${metadataJson.image}`);
    }
    
    // Connect to Redis
    console.log(`💾 Connecting to Redis...`);
    const redis = new Redis({
      url: REDIS_URL,
      token: REDIS_TOKEN,
      enableAutoPipelining: false,
      retry: false,
    });
    
    // Prepare Redis data (compatible with nftMetadataStore format)
    const redisKey = `nft_metadata:${NFT_CONTRACT.toLowerCase()}:${TOKEN_ID}`;
    const redisData = {
      contractAddress: NFT_CONTRACT.toLowerCase(),
      tokenId: TOKEN_ID,
      name: metadataJson.name,
      description: metadataJson.description,
      image: metadataJson.image, // Keep original IPFS URL - will be normalized by pickGatewayUrl
      imageIpfsCid: imageIpfsCid,
      metadataIpfsCid: metadataIpfsCid,
      attributes: JSON.stringify(metadataJson.attributes || []),
      createdAt: new Date().toISOString(),
      uniqueCreationId: `backfill_150_${Date.now()}`,
      source: 'backfill-script'
    };
    
    console.log(`💾 Storing in Redis with key: ${redisKey}`);
    console.log(`🔑 CIDs being stored:`, {
      metadataIpfsCid: metadataIpfsCid.substring(0, 20) + '...',
      imageIpfsCid: imageIpfsCid.substring(0, 20) + '...'
    });
    
    // Store in Redis
    const result = await redis.hset(redisKey, redisData);
    console.log(`✅ Redis hset result:`, result);
    
    // Set expiration (24 hours)
    await redis.expire(redisKey, 86400);
    console.log(`⏰ Set expiration: 24 hours`);
    
    // Verify storage
    const verification = await redis.hgetall(redisKey);
    console.log(`🔍 Verification - stored data keys:`, Object.keys(verification));
    console.log(`🔍 Verification - metadata CID:`, verification.metadataIpfsCid?.substring(0, 20) + '...');
    console.log(`🔍 Verification - image CID:`, verification.imageIpfsCid?.substring(0, 20) + '...');
    
    console.log(`🎉 FASE 5 COMPLETE: Token ${TOKEN_ID} backfilled successfully!`);
    console.log(`📊 Summary:`, {
      tokenId: TOKEN_ID,
      contract: NFT_CONTRACT,
      metadataIpfsCid: metadataIpfsCid.substring(0, 30) + '...',
      imageIpfsCid: imageIpfsCid.substring(0, 30) + '...',
      redisKey: redisKey
    });
    
  } catch (error) {
    console.error(`❌ FASE 5 FAILED:`, error.message);
    process.exit(1);
  }
}

backfillToken150();