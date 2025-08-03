/**
 * DEBUG API: Check specifically what's happening with gift token 74
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
    const targetTokenId = '74';
    
    console.log(`🔍 DEBUG: Investigating token ID ${targetTokenId}`);
    
    // Step 1: Try direct mapping
    const giftId = await getGiftIdFromTokenId(targetTokenId);
    console.log(`📍 Mapping result: tokenId ${targetTokenId} → giftId ${giftId}`);
    
    // Step 2: Query events manually for token 74
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL!);
    
    const eventSignature = "GiftRegisteredFromMint(uint256,address,address,uint256,uint40,address,string,address)";
    const eventTopic = ethers.id(eventSignature);
    
    // Search recent blocks for events
    const currentBlock = await provider.getBlockNumber();
    const searchRange = 50000; // Increased search range
    const searchStartBlock = Math.max(28915000, currentBlock - searchRange);
    
    console.log(`🔍 Searching events from block ${searchStartBlock} to ${currentBlock}`);
    
    const logs = await provider.getLogs({
      address: ESCROW_CONTRACT_ADDRESS,
      topics: [eventTopic],
      fromBlock: searchStartBlock,
      toBlock: currentBlock
    });
    
    console.log(`📦 Found ${logs.length} total events`);
    
    // Parse all events and look for token 74
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
          console.log(`🎯 FOUND TOKEN 74! giftId: ${giftIdFromLog}, block: ${log.blockNumber}`);
        }
      } catch (decodeError) {
        console.warn('Failed to decode event:', decodeError);
      }
    }
    
    // Find token 74 specifically
    const token74Mapping = mappings.find(m => m.tokenId === targetTokenId);
    
    // Step 3: If found, try to get gift data directly
    let giftData = null;
    if (token74Mapping) {
      try {
        const escrowContract = getEscrowContract();
        giftData = await readContract({
          contract: escrowContract,
          method: "getGift",
          params: [BigInt(token74Mapping.giftId)]
        });
        console.log(`✅ Gift data for giftId ${token74Mapping.giftId}:`, giftData);
      } catch (giftError) {
        console.error(`❌ Failed to get gift data for giftId ${token74Mapping.giftId}:`, giftError);
      }
    }
    
    // Step 4: Also check surrounding tokens
    const surroundingTokens = ['72', '73', '74', '75', '76'];
    const surroundingMappings = mappings.filter(m => 
      surroundingTokens.includes(m.tokenId)
    ).sort((a, b) => parseInt(a.tokenId) - parseInt(b.tokenId));
    
    return res.status(200).json({
      success: true,
      debug: {
        targetTokenId,
        mappingResult: giftId,
        token74Found: !!token74Mapping,
        token74Mapping,
        giftData,
        totalEventsFound: logs.length,
        surroundingMappings,
        searchRange: `${searchStartBlock} - ${currentBlock}`,
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