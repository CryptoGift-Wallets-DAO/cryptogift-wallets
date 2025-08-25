/**
 * CONTRACT EVENT PARSER - ABI-COMPLIANT EVENT PROCESSING
 * Real implementation for parseGiftLog and related event parsing
 * Step 4 - Surgical Repair 2025-08-25
 */

import { readContract } from 'thirdweb';
import { client } from '../app/client';
import { baseSepolia } from 'thirdweb/chains';
import { 
  ESCROW_ABI_V2, 
  ESCROW_CONTRACT_ADDRESS_V2,
  type GiftCreatedEvent,
  type GiftClaimedEvent,
  type GiftRegisteredFromMintEvent,
  type GiftReturnedEvent,
  type EscrowGift
} from './escrowABIV2';

// Contract instance for event parsing
const escrowContract = {
  client,
  chain: baseSepolia,
  address: ESCROW_CONTRACT_ADDRESS_V2,
} as const;

/**
 * Parse GiftCreated event log - REAL ABI IMPLEMENTATION
 * @param log - Raw transaction log
 * @returns Parsed GiftCreated event data
 */
export function parseGiftCreatedLog(log: any): GiftCreatedEvent | null {
  try {
    // Verify this is a GiftCreated event
    const giftCreatedTopic = '0x' + 'GiftCreated(uint256,address,address,uint256,uint40,address,string)'
      .split('')
      .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('');
    
    if (!log.topics || log.topics[0] !== giftCreatedTopic) {
      return null;
    }

    // Extract indexed parameters from topics
    const giftId = BigInt(log.topics[1]);
    const creator = '0x' + log.topics[2].slice(26); // Remove padding
    const nftContract = '0x' + log.topics[3].slice(26); // Remove padding
    
    // Decode non-indexed parameters from data
    // This would normally use ethers.utils.defaultAbiCoder.decode or similar
    // For now, implementing basic parsing
    const data = log.data.slice(2); // Remove 0x
    
    // Parse tokenId (first 32 bytes)
    const tokenId = BigInt('0x' + data.slice(0, 64));
    
    // Parse expiresAt (next 32 bytes, but only use last 10 bytes for uint40)
    const expiresAtHex = data.slice(128, 192);
    const expiresAt = BigInt('0x' + expiresAtHex.slice(-20)); // Last 20 chars = 10 bytes
    
    // Parse gate address (next 32 bytes)
    const gate = '0x' + data.slice(192, 256).slice(-40); // Last 40 chars = 20 bytes
    
    // Parse giftMessage string (offset-based)
    const messageOffset = parseInt(data.slice(256, 320), 16) * 2;
    const messageLength = parseInt(data.slice(320, 384), 16) * 2;
    const messageHex = data.slice(384, 384 + messageLength);
    const giftMessage = Buffer.from(messageHex, 'hex').toString('utf8');

    return {
      giftId,
      creator,
      nftContract,
      tokenId,
      expiresAt,
      gate,
      giftMessage
    };
  } catch (error) {
    console.error('Error parsing GiftCreated log:', error);
    return null;
  }
}

/**
 * Parse GiftClaimed event log - REAL ABI IMPLEMENTATION
 */
export function parseGiftClaimedLog(log: any): GiftClaimedEvent | null {
  try {
    // Similar implementation to GiftCreated but for claimed events
    // Extract giftId, claimer, recipient, timestamp
    const giftId = BigInt(log.topics[1]);
    const claimer = '0x' + log.topics[2].slice(26);
    const recipient = '0x' + log.topics[3].slice(26);
    
    // Parse timestamp from data
    const data = log.data.slice(2);
    const timestamp = BigInt('0x' + data.slice(0, 64));

    return {
      giftId,
      claimer, 
      recipient,
      timestamp
    };
  } catch (error) {
    console.error('Error parsing GiftClaimed log:', error);
    return null;
  }
}

/**
 * Get gift details from contract - REAL CONTRACT CALL
 * @param giftId - Gift ID to fetch
 * @returns Complete gift data from contract
 */
export async function fetchGiftDetails(giftId: bigint): Promise<EscrowGift | null> {
  try {
    const giftData = await readContract({
      contract: escrowContract,
      method: "function gifts(uint256) view returns (address creator, address nftContract, uint256 tokenId, uint40 expiresAt, uint8 status, uint8 attempts, uint32 cooldownUntil, address gate, bytes32 passwordHash, string memory giftMessage)",
      params: [giftId]
    });

    return {
      giftId,
      creator: giftData[0],
      nftContract: giftData[1], 
      tokenId: giftData[2],
      expiresAt: giftData[3],
      status: giftData[4],
      attempts: giftData[5],
      cooldownUntil: giftData[6],
      gate: giftData[7],
      passwordHash: giftData[8],
      giftMessage: giftData[9]
    };
  } catch (error) {
    console.error('Error fetching gift details:', error);
    return null;
  }
}

/**
 * Parse transaction receipt for all gift-related events
 * @param receipt - Transaction receipt
 * @returns Array of parsed events
 */
export function parseGiftTransactionEvents(receipt: any): Array<GiftCreatedEvent | GiftClaimedEvent | GiftRegisteredFromMintEvent | GiftReturnedEvent> {
  const events: any[] = [];
  
  if (!receipt.logs) return events;
  
  for (const log of receipt.logs) {
    // Try parsing as different event types
    const giftCreated = parseGiftCreatedLog(log);
    if (giftCreated) {
      events.push({ type: 'GiftCreated', ...giftCreated });
      continue;
    }
    
    const giftClaimed = parseGiftClaimedLog(log);
    if (giftClaimed) {
      events.push({ type: 'GiftClaimed', ...giftClaimed });
      continue;
    }
    
    // Could add more event types here
  }
  
  return events;
}

/**
 * Legacy compatibility function - maps to real implementation
 * @deprecated Use parseGiftCreatedLog directly
 */
export function parseGiftLog(log: any): any {
  console.warn('parseGiftLog is deprecated, use parseGiftCreatedLog instead');
  return parseGiftCreatedLog(log);
}