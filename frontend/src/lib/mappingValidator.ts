/**
 * MAPPING VALIDATION - POST-STORE VERIFICATION
 * Valida que el mapping almacenado es correcto consultando el contrato
 * Fail-fast si hay inconsistencias
 */

import { readContract } from 'thirdweb';
import { getEscrowContract } from './escrowUtils';
import type { EscrowGift } from './escrowABI';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  contractData?: {
    giftId: number;
    creator: string;
    tokenId: number;
    nftContract: string;
    status: number;
  };
  storedMapping?: {
    tokenId: number;
    giftId: number;
  };
}

/**
 * Validate stored mapping against on-chain contract data with retry
 * CRITICAL: Ensures mapping integrity before proceeding
 */
export async function validateStoredMapping(
  tokenId: string | number,
  giftId: string | number,
  expectedCreator?: string,
  expectedNftContract?: string,
  maxRetries: number = 3
): Promise<ValidationResult> {
  const tokenIdNum = Number(tokenId);
  const giftIdNum = Number(giftId);
  
  console.log(`🔍 VALIDATING: tokenId ${tokenIdNum} → giftId ${giftIdNum}`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 VALIDATION ATTEMPT ${attempt}/${maxRetries}`);
      
      const result = await performValidation(tokenIdNum, giftIdNum, expectedCreator, expectedNftContract);
      
      if (result.valid) {
        console.log(`✅ Validation successful on attempt ${attempt}`);
        return result;
      }
      
      // If it's a tokenId mismatch and we have retries left, wait and try again
      if (result.error?.includes('TokenId mismatch') && attempt < maxRetries) {
        const delay = Math.min(attempt * 2000, 8000); // 2s, 4s, 6s, 8s max - exponential backoff
        console.log(`⏳ TokenId mismatch on attempt ${attempt}, waiting ${delay}ms for blockchain state to propagate...`);
        console.log(`🔍 Current contract state: tokenId ${result.contractData?.tokenId || 'unknown'}, expected: ${tokenIdNum}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ Validation attempt ${attempt} failed:`, (error as Error).message);
      
      if (attempt < maxRetries) {
        const delay = Math.min(attempt * 2000, 8000); // Consistent exponential backoff
        console.log(`⏳ Retrying in ${delay}ms due to error...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return {
        valid: false,
        error: `All ${maxRetries} validation attempts failed. Last error: ${(error as Error).message}`
      };
    }
  }
  
  return {
    valid: false,
    error: `Validation failed after ${maxRetries} attempts`
  };
}

/**
 * Perform a single validation attempt
 */
async function performValidation(
  tokenIdNum: number,
  giftIdNum: number,
  expectedCreator?: string,
  expectedNftContract?: string
): Promise<ValidationResult> {
  try {
    
    // Get gift data from contract
    const giftData = await readContract({
      contract: getEscrowContract(),
      method: "getGift",
      params: [BigInt(giftIdNum)]
    });
    
    // CRITICAL DEBUG: Log raw contract response
    console.log('🔍 RAW CONTRACT RESPONSE for giftId', giftIdNum, ':', {
      raw: giftData,
      creator: giftData[0],
      expirationTime: giftData[1],
      nftContract: giftData[2],
      tokenId: giftData[3],
      // SECURITY C1 FIX: Removed password hash fragments from logs
      passwordHashPresent: !!giftData[4],
      status: giftData[5]
    });
    
    // Parse contract response: [creator, expirationTime, nftContract, tokenId, passwordHash, status]
    const contractData = {
      giftId: giftIdNum,
      creator: giftData[0] as string,
      tokenId: Number(giftData[3]),
      nftContract: giftData[2] as string,
      status: Number(giftData[5])
    };
    
    const storedMapping = {
      tokenId: tokenIdNum,
      giftId: giftIdNum
    };
    
    console.log('📊 CONTRACT DATA:', {
      contractTokenId: contractData.tokenId,
      storedTokenId: tokenIdNum,
      creator: contractData.creator.slice(0, 10) + '...',
      status: contractData.status
    });
    
    // CRITICAL VALIDATION: TokenId must match
    if (contractData.tokenId !== tokenIdNum) {
      console.error('❌ VALIDATION FAILED: TokenId mismatch detected!');
      console.error('📊 MISMATCH DETAILS:', {
        expectedTokenId: tokenIdNum,
        contractTokenId: contractData.tokenId,
        giftId: giftIdNum,
        contractStatus: contractData.status,
        contractCreator: contractData.creator.slice(0, 10) + '...',
        possibleCauses: [
          'Contract registerGiftMinted failed to set tokenId correctly',
          'Wrong giftId used in mapping',
          'Contract state corruption',
          'Race condition in gift creation'
        ]
      });
      
      return {
        valid: false,
        error: `TokenId mismatch: contract has ${contractData.tokenId}, mapping expects ${tokenIdNum}. This suggests registerGiftMinted failed to store tokenId correctly.`,
        contractData,
        storedMapping
      };
    }
    
    // Validate creator if provided
    if (expectedCreator && contractData.creator.toLowerCase() !== expectedCreator.toLowerCase()) {
      return {
        valid: false,
        error: `Creator mismatch: contract has ${contractData.creator}, expected ${expectedCreator}`,
        contractData,
        storedMapping
      };
    }
    
    // Validate NFT contract if provided
    if (expectedNftContract && contractData.nftContract.toLowerCase() !== expectedNftContract.toLowerCase()) {
      return {
        valid: false,
        error: `NFT contract mismatch: contract has ${contractData.nftContract}, expected ${expectedNftContract}`,
        contractData,
        storedMapping
      };
    }
    
    // Validate gift status (should be active = 0)
    if (contractData.status !== 0) {
      return {
        valid: false,
        error: `Gift status invalid: expected 0 (active), got ${contractData.status}`,
        contractData,
        storedMapping
      };
    }
    
    console.log('✅ VALIDATION SUCCESS: Mapping is correct');
    return {
      valid: true,
      contractData,
      storedMapping
    };
    
  } catch (error) {
    console.error('❌ VALIDATION ERROR:', error);
    return {
      valid: false,
      error: `Validation failed: ${(error as Error).message}`,
      storedMapping: {
        tokenId: tokenIdNum,
        giftId: giftIdNum
      }
    };
  }
}

/**
 * Validate mapping with retry logic
 * Handles temporary RPC failures
 */
export async function validateMappingWithRetry(
  tokenId: string | number,
  giftId: string | number,
  expectedCreator?: string,
  expectedNftContract?: string,
  maxRetries: number = 3
): Promise<ValidationResult> {
  let lastError: string = '';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔄 VALIDATION ATTEMPT ${attempt}/${maxRetries}`);
    
    try {
      const result = await validateStoredMapping(tokenId, giftId, expectedCreator, expectedNftContract);
      
      if (result.valid) {
        console.log(`✅ Validation successful on attempt ${attempt}`);
        return result;
      }
      
      // If validation failed due to data mismatch (not RPC error), don't retry
      if (!result.error?.includes('failed:') && !result.error?.includes('timeout')) {
        console.log('❌ Validation failed due to data mismatch - not retrying');
        return result;
      }
      
      lastError = result.error || 'Unknown validation error';
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      lastError = (error as Error).message;
      console.error(`❌ Validation attempt ${attempt} failed:`, lastError);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  return {
    valid: false,
    error: `All ${maxRetries} validation attempts failed. Last error: ${lastError}`,
    storedMapping: {
      tokenId: Number(tokenId),
      giftId: Number(giftId)
    }
  };
}

/**
 * Emergency fallback: if validation fails, attempt to find correct giftId
 * Last resort for recovery scenarios
 */
export async function findCorrectGiftId(
  tokenId: string | number,
  nftContract: string,
  maxGiftId?: number
): Promise<{ found: boolean; giftId?: number; error?: string }> {
  try {
    const tokenIdNum = Number(tokenId);
    console.log(`🔍 EMERGENCY SEARCH: Looking for correct giftId for tokenId ${tokenIdNum}`);
    
    // Get current gift counter to limit search
    const giftCounter = await readContract({
      contract: getEscrowContract(),
      method: "giftCounter",
      params: []
    });
    
    const searchLimit = maxGiftId || Number(giftCounter);
    console.log(`🔍 Searching through giftIds 0 to ${searchLimit - 1}`);
    
    // Search through recent gifts (backwards for efficiency)
    for (let giftId = searchLimit - 1; giftId >= 0; giftId--) {
      try {
        const giftData = await readContract({
          contract: getEscrowContract(),
          method: "getGift",
          params: [BigInt(giftId)]
        });
        
        const contractTokenId = Number(giftData[3]);
        const contractNftContract = giftData[2] as string;
        
        if (contractTokenId === tokenIdNum && 
            contractNftContract.toLowerCase() === nftContract.toLowerCase()) {
          console.log(`✅ FOUND: tokenId ${tokenIdNum} maps to giftId ${giftId}`);
          return {
            found: true,
            giftId
          };
        }
        
      } catch (giftError) {
        // Gift doesn't exist or error reading it - continue search
        continue;
      }
    }
    
    return {
      found: false,
      error: `No matching gift found for tokenId ${tokenIdNum}`
    };
    
  } catch (error) {
    console.error('❌ EMERGENCY SEARCH ERROR:', error);
    return {
      found: false,
      error: `Emergency search failed: ${(error as Error).message}`
    };
  }
}