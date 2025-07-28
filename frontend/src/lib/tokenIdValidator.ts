/**
 * TOKEN ID VALIDATOR - COMPREHENSIVE VALIDATION
 * Ensures tokenId integrity throughout the mint/escrow process
 * Prevents tokenId=0 from reaching contract state
 */

import { ethers } from 'ethers';

export interface TokenIdValidationResult {
  success: boolean;
  tokenId?: string;
  error?: string;
  source: 'transfer_event' | 'mint_receipt' | 'user_input' | 'contract_state';
  rawValue?: any;
}

/**
 * Extract and validate tokenId from Transfer event log
 * Transfer event: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
 */
export function extractTokenIdFromTransferEvent(
  transferLog: { topics: readonly string[] | string[]; data: string; address?: string }
): TokenIdValidationResult {
  try {
    console.log('🔍 TOKEN ID EXTRACTION: Starting from Transfer event...');
    console.log('📋 Transfer log topics:', transferLog.topics.map(t => t.slice(0, 10) + '...'));
    
    // Validate Transfer event structure
    if (!transferLog.topics || transferLog.topics.length < 4) {
      return {
        success: false,
        error: `Invalid Transfer event structure. Expected 4 topics, got ${transferLog.topics?.length || 0}`,
        source: 'transfer_event',
        rawValue: transferLog.topics
      };
    }
    
    // topics[0] = Transfer event signature
    // topics[1] = from address (indexed)
    // topics[2] = to address (indexed)  
    // topics[3] = tokenId (indexed)
    
    const rawTokenId = transferLog.topics[3];
    console.log('📋 Raw tokenId from topics[3]:', rawTokenId);
    
    // Validate raw format
    if (!rawTokenId || typeof rawTokenId !== 'string') {
      return {
        success: false,
        error: `Invalid tokenId format in Transfer event. Got: ${typeof rawTokenId}`,
        source: 'transfer_event',
        rawValue: rawTokenId
      };
    }
    
    if (!rawTokenId.startsWith('0x')) {
      return {
        success: false,
        error: `TokenId must be hex string. Got: ${rawTokenId}`,
        source: 'transfer_event',
        rawValue: rawTokenId
      };
    }
    
    // Convert hex to BigInt
    let tokenIdBigInt: bigint;
    try {
      tokenIdBigInt = BigInt(rawTokenId);
    } catch (bigintError) {
      return {
        success: false,
        error: `Failed to convert tokenId to BigInt: ${(bigintError as Error).message}`,
        source: 'transfer_event',
        rawValue: rawTokenId
      };
    }
    
    console.log('🔢 TokenId BigInt:', tokenIdBigInt.toString());
    
    // CRITICAL: Validate tokenId is not 0
    if (tokenIdBigInt === BigInt(0)) {
      console.error('❌ CRITICAL: TokenId is 0! This will break the mapping system!');
      return {
        success: false,
        error: 'CRITICAL: TokenId cannot be 0 - this breaks the mapping system and indicates a mint failure',
        source: 'transfer_event',
        rawValue: rawTokenId
      };
    }
    
    // Validate tokenId is positive
    if (tokenIdBigInt < BigInt(0)) {
      return {
        success: false,
        error: `TokenId cannot be negative. Got: ${tokenIdBigInt.toString()}`,
        source: 'transfer_event',
        rawValue: rawTokenId
      };
    }
    
    // Validate reasonable range (NFT tokenIds shouldn't be astronomically large)
    const MAX_REASONABLE_TOKEN_ID = BigInt('0xffffffffffffffff'); // 2^64 - 1
    if (tokenIdBigInt > MAX_REASONABLE_TOKEN_ID) {
      console.warn('⚠️ WARNING: TokenId is unusually large, possible data corruption');
      return {
        success: false,
        error: `TokenId is unreasonably large: ${tokenIdBigInt.toString()}`,
        source: 'transfer_event',
        rawValue: rawTokenId
      };
    }
    
    const tokenIdString = tokenIdBigInt.toString();
    
    console.log('✅ TOKEN ID VALIDATION SUCCESS:', {
      tokenId: tokenIdString,
      hex: rawTokenId,
      source: 'transfer_event'
    });
    
    return {
      success: true,
      tokenId: tokenIdString,
      source: 'transfer_event',
      rawValue: rawTokenId
    };
    
  } catch (error) {
    console.error('❌ TOKEN ID EXTRACTION ERROR:', error);
    return {
      success: false,
      error: `TokenId extraction failed: ${(error as Error).message}`,
      source: 'transfer_event',
      rawValue: transferLog
    };
  }
}

/**
 * Validate tokenId from any source (user input, contract, etc.)
 */
export function validateTokenId(
  tokenId: any,
  source: TokenIdValidationResult['source'] = 'user_input'
): TokenIdValidationResult {
  try {
    console.log(`🔍 TOKEN ID VALIDATION: Validating from ${source}...`);
    console.log('📋 Input tokenId:', tokenId, typeof tokenId);
    
    // Handle null/undefined
    if (tokenId === null || tokenId === undefined) {
      return {
        success: false,
        error: 'TokenId is null or undefined',
        source,
        rawValue: tokenId
      };
    }
    
    // Convert to string if needed
    let tokenIdStr: string;
    
    if (typeof tokenId === 'string') {
      tokenIdStr = tokenId;
    } else if (typeof tokenId === 'number') {
      if (!Number.isInteger(tokenId)) {
        return {
          success: false,
          error: `TokenId must be integer. Got: ${tokenId}`,
          source,
          rawValue: tokenId
        };
      }
      tokenIdStr = tokenId.toString();
    } else if (typeof tokenId === 'bigint') {
      tokenIdStr = tokenId.toString();
    } else {
      return {
        success: false,
        error: `Invalid tokenId type. Expected string/number/bigint, got: ${typeof tokenId}`,
        source,
        rawValue: tokenId
      };
    }
    
    // Parse as number for validation
    const tokenIdNum = parseInt(tokenIdStr, 10);
    
    if (isNaN(tokenIdNum)) {
      return {
        success: false,
        error: `TokenId is not a valid number: ${tokenIdStr}`,
        source,
        rawValue: tokenId
      };
    }
    
    // CRITICAL: Check for tokenId = 0
    if (tokenIdNum === 0) {
      console.error('❌ CRITICAL: TokenId is 0! This breaks the mapping system!');
      return {
        success: false,
        error: 'CRITICAL: TokenId cannot be 0 - this breaks the mapping system',
        source,
        rawValue: tokenId
      };
    }
    
    // Check for negative
    if (tokenIdNum < 0) {
      return {
        success: false,
        error: `TokenId cannot be negative: ${tokenIdNum}`,
        source,
        rawValue: tokenId
      };
    }
    
    // Check reasonable range
    if (tokenIdNum > Number.MAX_SAFE_INTEGER) {
      return {
        success: false,
        error: `TokenId exceeds safe integer range: ${tokenIdNum}`,
        source,
        rawValue: tokenId
      };
    }
    
    console.log('✅ TOKEN ID VALIDATION SUCCESS:', {
      tokenId: tokenIdStr,
      numeric: tokenIdNum,
      source
    });
    
    return {
      success: true,
      tokenId: tokenIdStr,
      source,
      rawValue: tokenId
    };
    
  } catch (error) {
    console.error('❌ TOKEN ID VALIDATION ERROR:', error);
    return {
      success: false,
      error: `TokenId validation failed: ${(error as Error).message}`,
      source,
      rawValue: tokenId
    };
  }
}

/**
 * Diagnose tokenId=0 issue by checking multiple sources
 */
export async function diagnoseTokenIdZeroIssue(
  mintReceiptLogs: any[],
  nftContractAddress: string
): Promise<{
  diagnosis: string;
  findings: Array<{
    source: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
    data?: any;
  }>;
}> {
  const findings: Array<{
    source: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
    data?: any;
  }> = [];
  
  console.log('🔍 DIAGNOSING: TokenId=0 issue...');
  
  // 1. Check for Transfer events in receipt
  const transferEvents = mintReceiptLogs.filter(log => 
    log.topics && 
    log.topics[0] === ethers.id('Transfer(address,address,uint256)') &&
    log.address?.toLowerCase() === nftContractAddress.toLowerCase()
  );
  
  if (transferEvents.length === 0) {
    findings.push({
      source: 'transfer_events',
      status: 'error',
      message: 'No Transfer events found in mint receipt - mint may have failed'
    });
  } else {
    findings.push({
      source: 'transfer_events',
      status: 'ok',
      message: `Found ${transferEvents.length} Transfer events`
    });
    
    // Check each Transfer event
    transferEvents.forEach((transferLog, index) => {
      const validation = extractTokenIdFromTransferEvent(transferLog);
      
      if (!validation.success) {
        findings.push({
          source: `transfer_event_${index}`,
          status: 'error',
          message: validation.error || 'Transfer event validation failed',
          data: validation.rawValue
        });
      } else {
        findings.push({
          source: `transfer_event_${index}`,
          status: 'ok',
          message: `Valid tokenId: ${validation.tokenId}`,
          data: { tokenId: validation.tokenId }
        });
      }
    });
  }
  
  // 2. Check for mint-related events
  const mintEvents = mintReceiptLogs.filter(log =>
    log.topics && 
    (log.topics[0] === ethers.id('Transfer(address,address,uint256)') ||
     log.topics[0].includes('Mint') ||
     log.topics[0].includes('mint'))
  );
  
  findings.push({
    source: 'mint_events',
    status: mintEvents.length > 0 ? 'ok' : 'warning',
    message: `Found ${mintEvents.length} mint-related events`,
    data: { eventCount: mintEvents.length }
  });
  
  // 3. Generate diagnosis
  const errorCount = findings.filter(f => f.status === 'error').length;
  const warningCount = findings.filter(f => f.status === 'warning').length;
  
  let diagnosis: string;
  
  if (errorCount > 0) {
    diagnosis = `CRITICAL: ${errorCount} errors found. Most likely cause: Mint transaction failed or Transfer event is malformed. TokenId=0 indicates the NFT was not properly minted.`;
  } else if (warningCount > 0) {
    diagnosis = `WARNING: ${warningCount} warnings found. Mint may have partial issues but tokenId should be valid.`;
  } else {
    diagnosis = 'No issues detected. TokenId=0 problem may be in downstream processing.';
  }
  
  console.log('📋 DIAGNOSIS COMPLETE:', diagnosis);
  
  return {
    diagnosis,
    findings
  };
}

/**
 * Enhanced error for tokenId=0 cases with diagnostic info
 */
export class TokenIdZeroError extends Error {
  public readonly source: string;
  public readonly rawValue: any;
  public readonly diagnostic?: any;
  
  constructor(
    message: string, 
    source: string, 
    rawValue: any, 
    diagnostic?: any
  ) {
    super(message);
    this.name = 'TokenIdZeroError';
    this.source = source;
    this.rawValue = rawValue;
    this.diagnostic = diagnostic;
  }
}

/**
 * Fail-fast validation for tokenId before contract calls
 */
export function assertValidTokenId(tokenId: any, context: string = 'unknown'): string {
  const validation = validateTokenId(tokenId, 'contract_state');
  
  if (!validation.success) {
    console.error(`❌ ASSERT FAILED: Invalid tokenId in ${context}:`, validation.error);
    throw new TokenIdZeroError(
      `Invalid tokenId in ${context}: ${validation.error}`,
      validation.source,
      validation.rawValue
    );
  }
  
  return validation.tokenId!;
}