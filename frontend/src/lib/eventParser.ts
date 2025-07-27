/**
 * GIFT ESCROW EVENT PARSER - SOLUCIÓN DEFINITIVA
 * Parse determinístico de eventos GiftRegisteredFromMint del receipt
 * Elimina condiciones de carrera en mapping tokenId → giftId
 */

import { ethers } from 'ethers';
import { ESCROW_ABI } from './escrowABI';
import type { GiftRegisteredFromMintEvent } from './escrowABI';

// ThirdWeb v5 compatible receipt interface
interface ThirdWebTransactionReceipt {
  logs: Array<{
    topics: string[];
    data: string;
    address?: string;
  }>;
  status: 'success' | 'reverted';
  transactionHash: string;
  blockNumber: number;
  gasUsed: bigint;
}

// Interface for parsed event result
export interface ParsedGiftEvent {
  success: true;
  giftId: number;
  tokenId: number;
  creator: string;
  nftContract: string;
  expiresAt: number;
  giftMessage: string;
  registeredBy: string;
}

export interface EventParseFailure {
  success: false;
  error: string;
  logsFound: number;
  contractAddress?: string;
}

export type EventParseResult = ParsedGiftEvent | EventParseFailure;

/**
 * FALLBACK: Get logs by block when receipt logs are empty/corrupt
 * Uses provider.getLogs to scan the specific block for our event
 */
async function fallbackGetLogsByBlock(
  transactionHash: string,
  blockNumber: number,
  expectedTokenId?: string | number,
  contractAddress?: string
): Promise<EventParseResult> {
  try {
    console.log(`🔍 FALLBACK: Scanning block ${blockNumber} for GiftRegisteredFromMint event...`);
    
    // Create provider for direct RPC access
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    
    // Create event filter for GiftRegisteredFromMint
    const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS;
    if (!escrowAddress) {
      return {
        success: false,
        error: 'ESCROW_CONTRACT_ADDRESS not configured for fallback',
        logsFound: 0
      };
    }
    
    const iface = new ethers.Interface(ESCROW_ABI);
    const eventFragment = iface.getEvent('GiftRegisteredFromMint');
    const eventTopic = iface.getEventTopic(eventFragment);
    
    console.log('🔍 FALLBACK: Event topic:', eventTopic);
    
    // Get logs for this specific block
    const logs = await provider.getLogs({
      address: escrowAddress,
      fromBlock: blockNumber,
      toBlock: blockNumber,
      topics: [eventTopic]
    });
    
    console.log(`📋 FALLBACK: Found ${logs.length} GiftRegisteredFromMint events in block ${blockNumber}`);
    
    // Parse each log to find our specific transaction
    for (const log of logs) {
      try {
        const parsed = iface.parseLog({
          topics: log.topics,
          data: log.data
        });
        
        if (!parsed || parsed.name !== 'GiftRegisteredFromMint') continue;
        
        // Check if this log belongs to our transaction
        if (log.transactionHash.toLowerCase() !== transactionHash.toLowerCase()) {
          console.log(`⚠️ FALLBACK: Skipping event from different tx: ${log.transactionHash}`);
          continue;
        }
        
        const args = parsed.args;
        const eventData: ParsedGiftEvent = {
          success: true,
          giftId: Number(args.giftId),
          tokenId: Number(args.tokenId),
          creator: args.creator,
          nftContract: args.nftContract,
          expiresAt: Number(args.expiresAt),
          giftMessage: args.giftMessage || '',
          registeredBy: args.registeredBy
        };
        
        // Apply same strict filters as main parser
        if (expectedTokenId !== undefined && eventData.tokenId !== Number(expectedTokenId)) {
          console.warn(`⚠️ FALLBACK FILTER: TokenId mismatch. Expected ${expectedTokenId}, got ${eventData.tokenId}`);
          continue;
        }
        
        if (contractAddress && eventData.nftContract.toLowerCase() !== contractAddress.toLowerCase()) {
          console.warn(`⚠️ FALLBACK FILTER: Contract mismatch. Expected ${contractAddress}, got ${eventData.nftContract}`);
          continue;
        }
        
        console.log('✅ FALLBACK SUCCESS: Found matching event in block logs');
        return eventData;
        
      } catch (parseError) {
        console.warn('⚠️ FALLBACK: Failed to parse log:', (parseError as Error).message);
        continue;
      }
    }
    
    return {
      success: false,
      error: `No matching GiftRegisteredFromMint event found in block ${blockNumber} for tx ${transactionHash}`,
      logsFound: logs.length
    };
    
  } catch (error) {
    console.error('❌ FALLBACK ERROR:', error);
    return {
      success: false,
      error: `Fallback getLogs failed: ${(error as Error).message}`,
      logsFound: 0
    };
  }
}

/**
 * Parse GiftRegisteredFromMint event from transaction receipt
 * DETERMINISTIC - returns exactly what happened on-chain
 */
export async function parseGiftRegisteredFromMintEvent(
  receipt: ThirdWebTransactionReceipt,
  expectedTokenId?: string | number,
  contractAddress?: string
): Promise<EventParseResult> {
  try {
    console.log('🔍 PARSING: Starting deterministic event parse...');
    console.log('📝 Receipt logs count:', receipt.logs?.length || 0);
    
    if (!receipt.logs || receipt.logs.length === 0) {
      return {
        success: false,
        error: 'No logs found in transaction receipt',
        logsFound: 0
      };
    }

    // Create ethers interface for parsing
    const iface = new ethers.Interface(ESCROW_ABI);
    
    // Search through all logs
    for (let i = 0; i < receipt.logs.length; i++) {
      const log = receipt.logs[i];
      
      try {
        // Parse log with ethers
        const parsed = iface.parseLog({
          topics: log.topics,
          data: log.data
        });
        
        if (!parsed) continue;
        
        console.log(`📋 Log ${i}: Parsed event '${parsed.name}'`);
        
        // STRICT FILTERING: Check if this is our target event with all validations
        if (parsed.name === 'GiftRegisteredFromMint') {
          const args = parsed.args;
          
          // FILTER 1: Event name ✅ (already checked)
          console.log(`📋 Log ${i}: Found GiftRegisteredFromMint event, applying strict filters...`);
          
          // FILTER 2: Contract address must match escrow contract
          if (log.address && log.address.toLowerCase() !== process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS?.toLowerCase()) {
            console.warn(`⚠️ FILTER REJECT: Wrong contract address. Expected ${process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS}, got ${log.address}`);
            continue;
          }
          
          const eventData: ParsedGiftEvent = {
            success: true,
            giftId: Number(args.giftId),
            tokenId: Number(args.tokenId), 
            creator: args.creator,
            nftContract: args.nftContract,
            expiresAt: Number(args.expiresAt),
            giftMessage: args.giftMessage || '',
            registeredBy: args.registeredBy
          };
          
          // FILTER 3: TokenId must match expected (if provided)
          if (expectedTokenId !== undefined) {
            const expectedNum = Number(expectedTokenId);
            if (eventData.tokenId !== expectedNum) {
              console.warn(`⚠️ FILTER REJECT: TokenId mismatch. Expected ${expectedNum}, got ${eventData.tokenId}`);
              continue;
            }
          }
          
          // FILTER 4: NFT contract must match expected (if provided)
          if (contractAddress && eventData.nftContract.toLowerCase() !== contractAddress.toLowerCase()) {
            console.warn(`⚠️ FILTER REJECT: NFT contract mismatch. Expected ${contractAddress}, got ${eventData.nftContract}`);
            continue;
          }
          
          // FILTER 5: Basic data validation
          if (eventData.giftId < 0 || eventData.tokenId < 0) {
            console.warn(`⚠️ FILTER REJECT: Invalid IDs. GiftId: ${eventData.giftId}, TokenId: ${eventData.tokenId}`);
            continue;
          }
          
          if (!ethers.isAddress(eventData.creator) || !ethers.isAddress(eventData.nftContract)) {
            console.warn(`⚠️ FILTER REJECT: Invalid addresses. Creator: ${eventData.creator}, NFT: ${eventData.nftContract}`);
            continue;
          }
          
          console.log('✅ STRICT FILTERS PASSED:', {
            giftId: eventData.giftId,
            tokenId: eventData.tokenId,
            creator: eventData.creator.slice(0, 10) + '...',
            nftContract: eventData.nftContract.slice(0, 10) + '...',
            logAddress: log.address?.slice(0, 10) + '...'
          });
          
          console.log('🎯 DETERMINISTIC RESULT: Event parsing successful with strict validation');
          return eventData;
        }
        
      } catch (parseError) {
        // Failed to parse this log - not necessarily an error
        console.log(`⚠️ Log ${i}: Failed to parse (likely different contract)`, (parseError as Error).message.slice(0, 50));
        continue;
      }
    }
    
    // FALLBACK: No matching event found in receipt, try getLogs by block
    console.log('⚠️ No event found in receipt, attempting fallback getLogs by block...');
    
    try {
      const fallbackResult = await fallbackGetLogsByBlock(
        receipt.transactionHash,
        receipt.blockNumber,
        expectedTokenId,
        contractAddress
      );
      
      if (fallbackResult.success) {
        console.log('✅ FALLBACK SUCCESS: Found event via getLogs');
        return fallbackResult;
      }
      
      console.log('❌ FALLBACK FAILED:', fallbackResult.error);
    } catch (fallbackError) {
      console.error('❌ FALLBACK ERROR:', fallbackError);
    }
    
    // Final failure
    return {
      success: false,
      error: 'GiftRegisteredFromMint event not found in receipt logs or block fallback',
      logsFound: receipt.logs.length,
      contractAddress
    };
    
  } catch (error) {
    console.error('❌ EVENT PARSE ERROR:', error);
    return {
      success: false,
      error: `Event parsing failed: ${(error as Error).message}`,
      logsFound: receipt.logs?.length || 0
    };
  }
}

/**
 * Retry logic for event parsing with exponential backoff
 * Handles RPC failures and temporary issues
 */
export async function parseGiftEventWithRetry(
  receipt: ThirdWebTransactionReceipt,
  expectedTokenId?: string | number,
  contractAddress?: string,
  maxRetries: number = 3
): Promise<EventParseResult> {
  let lastError: string = '';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔄 EVENT PARSE ATTEMPT ${attempt}/${maxRetries}`);
    
    try {
      const result = await parseGiftRegisteredFromMintEvent(receipt, expectedTokenId, contractAddress);
      
      if (result.success) {
        console.log(`✅ Event parsing successful on attempt ${attempt}`);
        return result;
      }
      
      lastError = result.success === false ? result.error : 'Unknown error';
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      lastError = (error as Error).message;
      console.error(`❌ Attempt ${attempt} failed:`, lastError);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  return {
    success: false,
    error: `All ${maxRetries} attempts failed. Last error: ${lastError}`,
    logsFound: 0
  };
}

/**
 * Validation helper - verify parsed event data makes sense
 */
export function validateParsedEvent(
  event: ParsedGiftEvent,
  expectedTokenId?: string | number,
  expectedCreator?: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Basic validation
  if (event.giftId < 0) {
    errors.push(`Invalid giftId: ${event.giftId}`);
  }
  
  if (event.tokenId < 0) {
    errors.push(`Invalid tokenId: ${event.tokenId}`);
  }
  
  if (!ethers.isAddress(event.creator)) {
    errors.push(`Invalid creator address: ${event.creator}`);
  }
  
  if (!ethers.isAddress(event.nftContract)) {
    errors.push(`Invalid nftContract address: ${event.nftContract}`);
  }
  
  if (event.expiresAt <= 0) {
    errors.push(`Invalid expiresAt: ${event.expiresAt}`);
  }
  
  // Expected values validation
  if (expectedTokenId !== undefined && event.tokenId !== Number(expectedTokenId)) {
    errors.push(`TokenId mismatch: expected ${expectedTokenId}, got ${event.tokenId}`);
  }
  
  if (expectedCreator && event.creator.toLowerCase() !== expectedCreator.toLowerCase()) {
    errors.push(`Creator mismatch: expected ${expectedCreator}, got ${event.creator}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}