/**
 * DEBUG API: Check specifically what's happening with gift token 68
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { createThirdwebClient, getContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { readContract } from 'thirdweb';
import { 
  getEscrowContract,
  getGiftIdFromTokenId
} from '../../../lib/escrowUtils';
import { ESCROW_CONTRACT_ADDRESS } from '../../../lib/escrowABI';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const targetTokenId = '68';
    
    console.log(`🔍 DEBUG: Investigating token ID ${targetTokenId}`);
    
    // Step 1: Try direct mapping
    const giftId = await getGiftIdFromTokenId(targetTokenId);
    console.log(`📍 Mapping result: tokenId ${targetTokenId} → giftId ${giftId}`);
    
    // Step 2: Query events manually for token 74
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL!);
    
    const eventSignature = "GiftRegisteredFromMint(uint256,address,address,uint256,uint40,address,string,address)";
    const eventTopic = ethers.id(eventSignature);
    
    // Search recent blocks for events with RPC-safe chunking
    const currentBlock = await provider.getBlockNumber();
    const maxRpcBlocks = 500; // Safe RPC limit
    const searchRange = 10000; // Reasonable range for token 68
    const searchStartBlock = Math.max(28915000, currentBlock - searchRange);
    
    console.log(`🔍 Searching events from block ${searchStartBlock} to ${currentBlock}`);
    
    // Query in safe chunks
    const allLogs: any[] = [];
    for (let fromBlock = searchStartBlock; fromBlock <= currentBlock; fromBlock += maxRpcBlocks) {
      const toBlock = Math.min(fromBlock + maxRpcBlocks - 1, currentBlock);
      
      try {
        const chunkLogs = await provider.getLogs({
          address: ESCROW_CONTRACT_ADDRESS,
          topics: [eventTopic],
          fromBlock: fromBlock,
          toBlock: toBlock
        });
        allLogs.push(...chunkLogs);
        console.log(`📦 Chunk ${fromBlock}-${toBlock}: Found ${chunkLogs.length} events`);
      } catch (error: any) {
        console.warn(`⚠️ Chunk ${fromBlock}-${toBlock} failed:`, error.message);
        continue;
      }
    }
    
    const logs = allLogs;
    
    console.log(`📦 Found ${logs.length} total events`);
    
    // Parse all events and look for token 68
    const mappings: Array<{tokenId: string, giftId: string, blockNumber: number}> = [];
    
    for (const log of logs) {
      try {
        const giftIdFromLog = BigInt(log.topics[1]).toString();
        
        const abiCoder = new ethers.AbiCoder();
        const decoded = abiCoder.decode(
          ['uint256', 'uint40', 'address', 'string', 'address'],
          log.data
        );
        const eventTokenId = decoded[0].toString();
        
        mappings.push({
          tokenId: eventTokenId,
          giftId: giftIdFromLog,
          blockNumber: log.blockNumber
        });
        
        if (eventTokenId === targetTokenId) {
          console.log(`🎯 FOUND TOKEN 68! giftId: ${giftIdFromLog}, block: ${log.blockNumber}`);
        }
      } catch (decodeError) {
        console.warn('Failed to decode event:', decodeError);
      }
    }
    
    // Find token 68 specifically
    const token68Mapping = mappings.find(m => m.tokenId === targetTokenId);
    
    // Step 3: If found, try to get gift data directly
    let giftData = null;
    if (token68Mapping) {
      try {
        const escrowContract = getEscrowContract();
        giftData = await readContract({
          contract: escrowContract,
          method: "getGift",
          params: [BigInt(token68Mapping.giftId)]
        });
        console.log(`✅ Gift data for giftId ${token68Mapping.giftId}:`, giftData);
      } catch (giftError) {
        console.error(`❌ Failed to get gift data for giftId ${token68Mapping.giftId}:`, giftError);
      }
    }
    
    // Step 4: Also check surrounding tokens
    const surroundingTokens = ['66', '67', '68', '69', '70'];
    const surroundingMappings = mappings.filter(m => 
      surroundingTokens.includes(m.tokenId)
    ).sort((a, b) => parseInt(a.tokenId) - parseInt(b.tokenId));
    
    // Step 5: Check Redis/KV storage directly
    let redisStatus = 'Unknown';
    try {
      const { getGiftIdFromMapping } = await import('../../../lib/giftMappingStore');
      const redisGiftId = await getGiftIdFromMapping(targetTokenId);
      redisStatus = redisGiftId !== null ? `Found: ${redisGiftId}` : 'Not found';
    } catch (redisError) {
      redisStatus = `Error: ${redisError.message}`;
    }
    
    return res.status(200).json({
      success: true,
      debug: {
        targetTokenId,
        mappingResult: giftId,
        token68Found: !!token68Mapping,
        token68Mapping,
        giftData,
        totalEventsFound: logs.length,
        surroundingMappings,
        searchRange: `${searchStartBlock} - ${currentBlock}`,
        redisStatus,
        allMappings: mappings.slice(-10) // Last 10 mappings for reference
      }
    });
    
  } catch (error: any) {
    console.error('❌ DEBUG ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}