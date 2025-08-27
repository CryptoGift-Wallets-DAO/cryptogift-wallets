/**
 * CONTRACT EVENT PARSER - ABI-COMPLIANT EVENT PROCESSING
 * Real implementation for parseGiftLog and related event parsing
 * Step 4 - Surgical Repair 2025-08-25
 */

import { readContract } from 'thirdweb';
import { decodeEventLog } from 'viem';
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
  address: ESCROW_CONTRACT_ADDRESS_V2 as `0x${string}`,
} as const;

/**
 * Parse GiftCreated event log - REAL ABI IMPLEMENTATION using viem
 * @param log - Raw transaction log  
 * @returns Parsed GiftCreated event data
 */
export function parseGiftCreatedLog(log: any): GiftCreatedEvent | null {
  try {
    // Use viem's decodeEventLog with real ABI
    const decodedLog = decodeEventLog({
      abi: ESCROW_ABI_V2,
      eventName: 'GiftCreated',
      topics: log.topics,
      data: log.data
    });

    // Map to our interface
    return {
      giftId: decodedLog.args.giftId,
      creator: decodedLog.args.creator,
      nftContract: decodedLog.args.nftContract,
      tokenId: decodedLog.args.tokenId,
      expiresAt: BigInt(decodedLog.args.expiresAt || 0),
      gate: decodedLog.args.gate,
      giftMessage: decodedLog.args.giftMessage
    };
  } catch (error) {
    console.error('Error parsing GiftCreated log with viem:', error);
    return null;
  }
}

/**
 * Parse GiftClaimed event log - REAL ABI IMPLEMENTATION using viem
 */
export function parseGiftClaimedLog(log: any): GiftClaimedEvent | null {
  try {
    // Use viem's decodeEventLog with real ABI
    const decodedLog = decodeEventLog({
      abi: ESCROW_ABI_V2,
      eventName: 'GiftClaimed',
      topics: log.topics,
      data: log.data
    });

    // Map to our interface  
    return {
      giftId: decodedLog.args.giftId,
      claimer: decodedLog.args.claimer,
      recipient: decodedLog.args.recipient,
      gate: decodedLog.args.gate,
      gateReason: decodedLog.args.gateReason
    };
  } catch (error) {
    console.error('Error parsing GiftClaimed log with viem:', error);
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
      expiresAt: BigInt(giftData[3]),
      status: giftData[4],
      // attempts: giftData[5], // REMOVED: Not in EscrowGift interface
      // cooldownUntil: giftData[6], // REMOVED: Not in EscrowGift interface
      // gate: giftData[7], // REMOVED: Not in EscrowGift interface
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