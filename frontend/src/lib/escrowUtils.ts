/**
 * CRYPTOGIFT ESCROW UTILITIES
 * Comprehensive utility functions for escrow gift management
 */

import { ethers } from 'ethers';
import { createThirdwebClient, getContract, prepareContractCall, readContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { ESCROW_ABI, ESCROW_CONTRACT_ADDRESS, type EscrowGift } from './escrowABI';

// Initialize ThirdWeb client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!
});

/**
 * Password and Salt Management
 */
export function generateSalt(): `0x${string}` {
  return ethers.hexlify(ethers.randomBytes(32)) as `0x${string}`;
}

export function generatePasswordHash(password: string, salt: string): `0x${string}` {
  return ethers.keccak256(ethers.toUtf8Bytes(password + salt)) as `0x${string}`;
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  if (password.length > 50) {
    return { valid: false, message: 'Password must be less than 50 characters' };
  }
  return { valid: true };
}

/**
 * Timeframe Management
 */
export const TIMEFRAME_OPTIONS = {
  FIFTEEN_MINUTES: 0,
  SEVEN_DAYS: 1,
  FIFTEEN_DAYS: 2,
  THIRTY_DAYS: 3
} as const;

export type TimeframeOption = keyof typeof TIMEFRAME_OPTIONS;

export const TIMEFRAME_LABELS: Record<TimeframeOption, string> = {
  FIFTEEN_MINUTES: '15 Minutes (Testing)',
  SEVEN_DAYS: '7 Days',
  FIFTEEN_DAYS: '15 Days',
  THIRTY_DAYS: '30 Days'
};

export const TIMEFRAME_DESCRIPTIONS: Record<TimeframeOption, string> = {
  FIFTEEN_MINUTES: 'Perfect for testing the escrow system quickly',
  SEVEN_DAYS: 'Standard gift timeframe for most occasions',
  FIFTEEN_DAYS: 'Extended timeframe for special gifts',
  THIRTY_DAYS: 'Maximum timeframe for important occasions'
};

/**
 * Contract Interaction Helpers
 */
export function getEscrowContract() {
  if (!ESCROW_CONTRACT_ADDRESS) {
    throw new Error('Escrow contract address not configured');
  }
  
  return getContract({
    client,
    chain: baseSepolia,
    address: ESCROW_CONTRACT_ADDRESS,
    abi: ESCROW_ABI
  });
}

/**
 * ThirdWeb v5 Return Type Information
 * 
 * ✅ CONFIRMED BEHAVIOR IN THIRDWEB v5:
 * Contract functions that return tuples are automatically converted to structured objects
 * with named properties based on the ABI component names.
 * 
 * EXAMPLES:
 * - getGift() returns: { creator: "0x...", expirationTime: 123n, nftContract: "0x...", ... }
 * - canClaimGift() returns: [true, 86400n] (tuple format)
 * 
 * This provides excellent developer experience as you can access properties by name
 * rather than array indices. No additional parsing helpers are needed.
 * 
 * USAGE PATTERN:
 * ```typescript
 * const giftData = await readContract({ contract, method: "getGift", params: [tokenId] });
 * const gift: EscrowGift = {
 *   creator: giftData.creator,
 *   expirationTime: giftData.expirationTime,
 *   // ... etc
 * };
 * ```
 */

export function prepareCreateGiftCall(
  tokenId: string | number,
  nftContract: string,
  password: string,
  salt: string,
  timeframeDays: number,
  giftMessage: string,
  gate: string = '0x0000000000000000000000000000000000000000'
) {
  const contract = getEscrowContract();
  
  return prepareContractCall({
    contract,
    method: "createGift",
    params: [
      BigInt(tokenId),
      nftContract,
      password,           // ← FIX: Password as string, not hash
      salt as `0x${string}`,  // ← FIX: Type assertion for salt parameter
      BigInt(timeframeDays),
      giftMessage,
      gate                // ← FIX: Add gate parameter (defaults to zero address)
    ]
  });
}

export function prepareRegisterGiftMintedCall(
  tokenId: string | number,
  nftContract: string,
  password: string,
  salt: string,
  timeframeDays: number,
  giftMessage: string,
  gate: string = '0x0000000000000000000000000000000000000000'
) {
  const contract = getEscrowContract();
  
  return prepareContractCall({
    contract,
    method: "registerGiftMinted",
    params: [
      BigInt(tokenId),
      nftContract,
      password,
      salt as `0x${string}`,
      BigInt(timeframeDays),
      giftMessage,
      gate
    ]
  });
}

export function prepareClaimGiftCall(
  tokenId: string | number,
  password: string,
  salt: string,
  gateData: string = '0x'
) {
  const contract = getEscrowContract();
  
  return prepareContractCall({
    contract,
    method: "claimGift",
    params: [
      BigInt(tokenId),
      password,
      salt as `0x${string}`,  // ← FIX: Type assertion for salt parameter
      gateData as `0x${string}`  // ← FIX: Type assertion for gateData parameter
    ]
  });
}

export function prepareClaimGiftForCall(
  tokenId: string | number,
  password: string,
  salt: string,
  recipient: string
) {
  const contract = getEscrowContract();
  
  return prepareContractCall({
    contract,
    method: "claimGiftFor",
    params: [
      BigInt(tokenId),
      password,
      salt,
      recipient
    ]
  });
}

export function prepareReturnExpiredGiftCall(tokenId: string | number) {
  const contract = getEscrowContract();
  
  return prepareContractCall({
    contract,
    method: "returnExpiredGift",
    params: [BigInt(tokenId)]
  });
}

/**
 * Gift Status and Timing Functions
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Expired';
  
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const remainingSeconds = seconds % 60;
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}

export function isGiftExpired(expirationTime: bigint): boolean {
  const currentTime = Math.floor(Date.now() / 1000);
  return Number(expirationTime) <= currentTime;
}

export function getGiftStatus(gift: EscrowGift): 'active' | 'expired' | 'claimed' | 'returned' {
  // Status from contract: 0=Active, 1=Claimed, 2=Returned
  if (gift.status === 1) return 'claimed';
  if (gift.status === 2) return 'returned';
  
  // Check if expired
  if (isGiftExpired(gift.expirationTime)) return 'expired';
  
  return 'active';
}

export function getGiftStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'text-green-600';
    case 'expired': return 'text-orange-600';
    case 'claimed': return 'text-blue-600';
    case 'returned': return 'text-gray-600';
    default: return 'text-gray-400';
  }
}

export function getGiftStatusBadgeColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'expired': return 'bg-orange-100 text-orange-800';
    case 'claimed': return 'bg-blue-100 text-blue-800';
    case 'returned': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-400';
  }
}

/**
 * Gift Link Generation
 */
export function generateGiftLink(tokenId: string | number, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/gift/claim/${tokenId}`;
}

export function generateGiftShareMessage(tokenId: string | number, giftMessage?: string): string {
  const link = generateGiftLink(tokenId);
  const message = giftMessage ? `"${giftMessage}"` : 'a special gift';
  
  return `🎁 You've received ${message}! Click here to claim it: ${link}`;
}

/**
 * Error Handling
 */
export function parseEscrowError(error: any): string {
  const errorMessage = error?.message || error?.reason || String(error);
  
  // Common escrow errors
  if (errorMessage.includes('Gift already claimed')) {
    return 'This gift has already been claimed.';
  }
  if (errorMessage.includes('Gift expired')) {
    return 'This gift has expired and cannot be claimed.';
  }
  if (errorMessage.includes('Invalid password')) {
    return 'The password is incorrect. Please check and try again.';
  }
  if (errorMessage.includes('Gift not found')) {
    return 'This gift does not exist or has been removed.';
  }
  if (errorMessage.includes('Only creator can return')) {
    return 'Only the gift creator can return this gift.';
  }
  if (errorMessage.includes('Gift not expired')) {
    return 'This gift has not expired yet and cannot be returned.';
  }
  
  // Generic fallback
  return errorMessage.slice(0, 100) + (errorMessage.length > 100 ? '...' : '');
}

/**
 * Validation Functions
 */
export function validateGiftMessage(message: string): { valid: boolean; message?: string } {
  if (message.length > 200) {
    return { valid: false, message: 'Gift message must be less than 200 characters' };
  }
  return { valid: true };
}

/**
 * Robust sanitization for gift messages to prevent XSS
 * Implements comprehensive HTML/script filtering beyond basic character replacement
 */
export function sanitizeGiftMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return '';
  }

  let sanitized = message;

  // 1. Remove all HTML/XML tags completely
  sanitized = sanitized.replace(/<[^>]*>/gi, '');
  
  // 2. Remove script-like patterns
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/vbscript:/gi, '');
  sanitized = sanitized.replace(/onload/gi, '');
  sanitized = sanitized.replace(/onerror/gi, '');
  sanitized = sanitized.replace(/onclick/gi, '');
  sanitized = sanitized.replace(/onmouse/gi, '');
  sanitized = sanitized.replace(/onfocus/gi, '');
  sanitized = sanitized.replace(/onblur/gi, '');
  sanitized = sanitized.replace(/onchange/gi, '');
  sanitized = sanitized.replace(/onsubmit/gi, '');
  
  // 3. Remove data URIs and blob URLs
  sanitized = sanitized.replace(/data:[^;]*;base64,/gi, '');
  sanitized = sanitized.replace(/blob:/gi, '');
  
  // 4. Remove potentially dangerous characters and encode HTML entities
  sanitized = sanitized.replace(/[<>\"'&]/g, (match) => {
    const entities: { [key: string]: string } = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '&': '&amp;'
    };
    return entities[match] || match;
  });
  
  // 5. Remove null bytes and control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // 6. Limit consecutive whitespace
  sanitized = sanitized.replace(/\s{4,}/g, '   '); // Max 3 consecutive spaces
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
  
  // 7. Trim and normalize whitespace
  sanitized = sanitized.trim();
  
  // 8. Final validation - ensure it's still under length limit
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 197) + '...';
  }
  
  return sanitized;
}

export function validateTokenId(tokenId: string): { valid: boolean; message?: string } {
  const id = parseInt(tokenId);
  if (isNaN(id) || id <= 0) {
    return { valid: false, message: 'Invalid token ID' };
  }
  return { valid: true };
}

export function validateAddress(address: string): { valid: boolean; message?: string } {
  try {
    ethers.getAddress(address);
    return { valid: true };
  } catch {
    return { valid: false, message: 'Invalid Ethereum address' };
  }
}

/**
 * Contract Constants Cache
 */
let timeConstantsCache: Record<string, number> | null = null;

export async function getTimeConstants(): Promise<Record<string, number>> {
  if (timeConstantsCache) return timeConstantsCache;
  
  try {
    const contract = getEscrowContract();
    
    const [fifteenMin, sevenDays, fifteenDays, thirtyDays] = await Promise.all([
      readContract({
        contract,
        method: "FIFTEEN_MINUTES",
        params: []
      }),
      readContract({
        contract,
        method: "SEVEN_DAYS",
        params: []
      }),
      readContract({
        contract,
        method: "FIFTEEN_DAYS",
        params: []
      }),
      readContract({
        contract,
        method: "THIRTY_DAYS",
        params: []
      })
    ]);
    
    timeConstantsCache = {
      FIFTEEN_MINUTES: Number(fifteenMin),
      SEVEN_DAYS: Number(sevenDays),
      FIFTEEN_DAYS: Number(fifteenDays),
      THIRTY_DAYS: Number(thirtyDays)
    };
    
    return timeConstantsCache;
  } catch (error) {
    console.error('Failed to get time constants:', error);
    // Fallback to known values
    return {
      FIFTEEN_MINUTES: 900,    // 15 minutes
      SEVEN_DAYS: 604800,      // 7 days
      FIFTEEN_DAYS: 1296000,   // 15 days
      THIRTY_DAYS: 2592000     // 30 days
    };
  }
}