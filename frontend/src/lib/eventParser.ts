/**
 * GIFT ESCROW EVENT PARSER - SOLUCIÓN DEFINITIVA
 * Parse determinístico de eventos GiftRegisteredFromMint del receipt
 * Elimina condiciones de carrera en mapping tokenId → giftId
 */

import { ethers } from 'ethers';
import { TransactionReceipt } from 'thirdweb';
import { ESCROW_ABI } from './escrowABI';
import type { GiftRegisteredFromMintEvent } from './escrowABI';

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
 * Parse GiftRegisteredFromMint event from transaction receipt
 * DETERMINISTIC - returns exactly what happened on-chain
 */
export async function parseGiftRegisteredFromMintEvent(
  receipt: TransactionReceipt,
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
        
        // Check if this is our target event
        if (parsed.name === 'GiftRegisteredFromMint') {
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
          
          console.log('✅ FOUND GiftRegisteredFromMint:', {
            giftId: eventData.giftId,
            tokenId: eventData.tokenId,
            creator: eventData.creator.slice(0, 10) + '...',
            nftContract: eventData.nftContract.slice(0, 10) + '...'
          });
          
          // Validate against expected tokenId if provided
          if (expectedTokenId !== undefined) {
            const expectedNum = Number(expectedTokenId);
            if (eventData.tokenId !== expectedNum) {
              console.warn(`⚠️ TokenId mismatch: expected ${expectedNum}, got ${eventData.tokenId}`);
              // Continue searching for the correct event
              continue;
            }
          }
          
          // Validate contract address if provided
          if (contractAddress && eventData.nftContract.toLowerCase() !== contractAddress.toLowerCase()) {
            console.warn(`⚠️ Contract mismatch: expected ${contractAddress}, got ${eventData.nftContract}`);
            continue;
          }
          
          console.log('🎯 DETERMINISTIC RESULT: Event parsing successful');
          return eventData;
        }
        
      } catch (parseError) {
        // Failed to parse this log - not necessarily an error
        console.log(`⚠️ Log ${i}: Failed to parse (likely different contract)`, (parseError as Error).message.slice(0, 50));
        continue;
      }
    }
    
    // No matching event found
    return {
      success: false,
      error: 'GiftRegisteredFromMint event not found in transaction logs',
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
  receipt: TransactionReceipt,
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
      
      lastError = result.error;
      
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