/**
 * FIX API: Force repair mapping for token 68
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { readContract } from 'thirdweb';
import { 
  getEscrowContract,
  getGiftIdFromTokenId
} from '../../../lib/escrowUtils';
import { ESCROW_CONTRACT_ADDRESS } from '../../../lib/escrowABI';
import { storeGiftMapping } from '../../../lib/giftMappingStore';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST to fix mapping.' });
  }

  try {
    const targetTokenId = '68';
    
    console.log(`🔧 FIX: Attempting to repair mapping for token ${targetTokenId}`);
    
    // Step 1: Force search for token 68 in recent events
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL!);
    const eventSignature = "GiftRegisteredFromMint(uint256,address,address,uint256,uint40,address,string,address)";
    const eventTopic = ethers.id(eventSignature);
    
    // Search in the most recent blocks first (token 68 should be recent)
    const currentBlock = await provider.getBlockNumber();
    const maxRpcBlocks = 500;
    let foundMapping = null;
    
    // Search from recent to older blocks
    for (let searchBlocks = 1000; searchBlocks <= 20000; searchBlocks += 1000) {
      const searchStartBlock = Math.max(28915000, currentBlock - searchBlocks);
      
      console.log(`🔍 Searching blocks ${searchStartBlock} to ${currentBlock} (range: ${searchBlocks})`);
      
      // Query in safe chunks
      for (let fromBlock = searchStartBlock; fromBlock <= currentBlock; fromBlock += maxRpcBlocks) {
        const toBlock = Math.min(fromBlock + maxRpcBlocks - 1, currentBlock);
        
        try {
          const chunkLogs = await provider.getLogs({
            address: ESCROW_CONTRACT_ADDRESS,
            topics: [eventTopic],
            fromBlock: fromBlock,
            toBlock: toBlock
          });
          
          console.log(`📦 Chunk ${fromBlock}-${toBlock}: Found ${chunkLogs.length} events`);
          
          // Parse events in this chunk
          for (const log of chunkLogs) {
            try {
              const giftIdFromLog = BigInt(log.topics[1]).toString();
              
              const abiCoder = new ethers.AbiCoder();
              const decoded = abiCoder.decode(
                ['uint256', 'uint40', 'address', 'string', 'address'],
                log.data
              );
              const eventTokenId = decoded[0].toString();
              
              if (eventTokenId === targetTokenId) {
                foundMapping = {
                  tokenId: eventTokenId,
                  giftId: giftIdFromLog,
                  blockNumber: log.blockNumber,
                  transactionHash: log.transactionHash
                };
                console.log(`🎯 FOUND TOKEN 68! Details:`, foundMapping);
                break;
              }
            } catch (decodeError) {
              console.warn('Failed to decode event:', decodeError);
            }
          }
          
          if (foundMapping) break;
          
        } catch (error: any) {
          console.warn(`⚠️ Chunk ${fromBlock}-${toBlock} failed:`, error.message);
          continue;
        }
      }
      
      if (foundMapping) break;
    }
    
    if (!foundMapping) {
      return res.status(404).json({
        success: false,
        error: 'Token 68 mapping not found in blockchain events',
        searchedBlocks: currentBlock - 28915000
      });
    }
    
    // Step 2: Verify the gift exists in the contract
    let giftData = null;
    try {
      const escrowContract = getEscrowContract();
      giftData = await readContract({
        contract: escrowContract,
        method: "getGift",
        params: [BigInt(foundMapping.giftId)]
      });
      console.log(`✅ Verified gift exists in contract for giftId ${foundMapping.giftId}`);
    } catch (giftError) {
      return res.status(400).json({
        success: false,
        error: `Gift ID ${foundMapping.giftId} not found in contract`,
        foundMapping
      });
    }
    
    // Step 3: Force store the mapping in Redis/KV
    try {
      await storeGiftMapping(foundMapping.tokenId, parseInt(foundMapping.giftId));
      console.log(`✅ Stored mapping: tokenId ${foundMapping.tokenId} → giftId ${foundMapping.giftId}`);
    } catch (storeError) {
      console.error(`❌ Failed to store mapping:`, storeError);
      return res.status(500).json({
        success: false,
        error: 'Failed to store mapping in Redis',
        foundMapping,
        storeError: storeError.message
      });
    }
    
    // Step 4: Verify the mapping works now
    const verifyMapping = await getGiftIdFromTokenId(targetTokenId);
    
    return res.status(200).json({
      success: true,
      fixed: true,
      foundMapping,
      giftData: {
        creator: giftData[0],
        expirationTime: giftData[1].toString(),
        nftContract: giftData[2],
        tokenId: giftData[3].toString(),
        status: giftData[5]
      },
      verifyMapping,
      message: `Successfully repaired mapping for token ${targetTokenId}`
    });
    
  } catch (error: any) {
    console.error('❌ FIX ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}

