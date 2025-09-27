/**
 * HISTORICAL DATA IMPORT API
 * Imports existing gifts from blockchain events into analytics system
 *
 * This allows tracking of previously created gifts that weren't tracked
 * when they were originally created
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createThirdwebClient, getContract, readContract, prepareEvent } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { ethers } from 'ethers';
import { recordGiftEvent, initializeCampaign } from '../../../lib/giftAnalytics';
import { verifyJWT, extractTokenFromHeaders } from '../../../lib/siweAuth';
import { debugLogger } from '../../../lib/secureDebugLogger';

// Initialize ThirdWeb client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!
});

// Escrow contract ABI events
const GIFT_CREATED_EVENT = {
  type: 'event',
  name: 'GiftMinted',
  inputs: [
    { name: 'giftId', type: 'uint256', indexed: true },
    { name: 'creator', type: 'address', indexed: true },
    { name: 'nftContract', type: 'address', indexed: false },
    { name: 'tokenId', type: 'uint256', indexed: false },
    { name: 'expirationTime', type: 'uint256', indexed: false }
  ]
} as const;

const GIFT_CLAIMED_EVENT = {
  type: 'event',
  name: 'GiftClaimed',
  inputs: [
    { name: 'giftId', type: 'uint256', indexed: true },
    { name: 'claimer', type: 'address', indexed: true },
    { name: 'tokenId', type: 'uint256', indexed: false }
  ]
} as const;

interface ImportRequest {
  walletAddress?: string; // Optional: filter by creator wallet
  limit?: number; // Number of recent events to import (default: 10)
  fromBlock?: number; // Optional: start block
  toBlock?: number | 'latest'; // Optional: end block or 'latest'
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {
    // Optional authentication (recommended for production)
    let authenticatedAddress: string | null = null;
    try {
      const authHeader = req.headers.authorization;
      const token = extractTokenFromHeaders(authHeader);

      if (token) {
        const payload = verifyJWT(token);
        if (payload) {
          authenticatedAddress = payload.address;
          console.log('📊 Historical import authenticated:', authenticatedAddress.slice(0, 10) + '...');
        }
      }
    } catch (authError) {
      // Authentication is optional for this endpoint
    }

    const {
      walletAddress,
      limit = 10,
      fromBlock,
      toBlock = 'latest'
    }: ImportRequest = req.body;

    console.log('📊 Starting historical data import:', {
      walletAddress: walletAddress || 'all',
      limit,
      fromBlock: fromBlock || 'auto',
      toBlock
    });

    // Get escrow contract
    const escrowContract = getContract({
      client,
      chain: baseSepolia,
      address: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS!
    });

    // Calculate block range (last 1000 blocks if not specified)
    const currentBlock = typeof toBlock === 'string' && toBlock === 'latest' ?
      await getLatestBlockNumber() : Number(toBlock);
    const startBlock = fromBlock || Math.max(0, currentBlock - 1000);

    console.log('📊 Fetching events from blocks:', { startBlock, currentBlock });

    // For now, we'll use a simpler approach to get recent gifts
    // ThirdWeb v5 event reading requires different approach
    const mintedEvents: any[] = [];

    // Read recent gifts directly from contract state
    try {
      // Get gift counter to know how many gifts exist
      const giftCounter = await readContract({
        contract: escrowContract,
        method: 'function giftCounter() view returns (uint256)',
        params: []
      });

      const totalGifts = Number(giftCounter);
      const startGiftId = Math.max(1, totalGifts - limit + 1);

      // Read each gift's data
      for (let giftId = startGiftId; giftId <= totalGifts; giftId++) {
        try {
          const gift = await readContract({
            contract: escrowContract,
            method: 'function getGift(uint256) view returns (address, bytes32, uint256, uint256, uint256, uint8, address, uint256)',
            params: [BigInt(giftId)]
          });

          // Parse gift data
          if (gift && gift[0] !== '0x0000000000000000000000000000000000000000') {
            mintedEvents.push({
              args: {
                giftId: BigInt(giftId),
                creator: gift[0],
                tokenId: gift[3]
              },
              transactionHash: `historical-${giftId}`,
              blockNumber: currentBlock - (totalGifts - giftId), // Approximate
              logIndex: 0
            });
          }
        } catch (err) {
          console.log(`Skipping gift ${giftId}:`, err);
        }
      }
    } catch (error) {
      console.error('Error reading gifts from contract:', error);
    }

    console.log(`📊 Found ${mintedEvents.length} GiftMinted events`);

    // Check which gifts are claimed by their status
    const claimedEvents: any[] = [];

    for (const mintEvent of mintedEvents) {
      try {
        const gift = await readContract({
          contract: escrowContract,
          method: 'function getGift(uint256) view returns (address, bytes32, uint256, uint256, uint256, uint8, address, uint256)',
          params: [mintEvent.args.giftId]
        });

        // Status 2 = claimed
        if (gift && gift[5] === 2) {
          claimedEvents.push({
            args: {
              giftId: mintEvent.args.giftId,
              claimer: gift[6], // claimer address
              tokenId: gift[3]
            },
            transactionHash: `historical-claim-${mintEvent.args.giftId}`,
            blockNumber: mintEvent.blockNumber + 100, // Approximate
            logIndex: 0
          });
        }
      } catch (err) {
        // Gift might not be claimed
      }
    }

    console.log(`📊 Found ${claimedEvents.length} GiftClaimed events`);

    // Filter by wallet if specified
    let filteredMintedEvents = mintedEvents;
    if (walletAddress) {
      filteredMintedEvents = mintedEvents.filter(
        (event: any) => event.args.creator.toLowerCase() === walletAddress.toLowerCase()
      );
      console.log(`📊 Filtered to ${filteredMintedEvents.length} events for wallet ${walletAddress}`);
    }

    // Limit number of events
    const eventsToImport = filteredMintedEvents.slice(-limit);

    // Import statistics
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const campaigns = new Set<string>();

    // Process each minted gift
    for (const event of eventsToImport) {
      try {
        const giftId = event.args.giftId.toString();
        const tokenId = event.args.tokenId.toString();
        const creator = event.args.creator;
        const campaignId = `campaign_${creator.slice(0, 8)}`;

        campaigns.add(campaignId);

        // Record gift created event
        const eventId = `${event.transactionHash}-${event.logIndex || 0}`;
        const created = await recordGiftEvent({
          eventId,
          type: 'created',
          campaignId,
          giftId,
          tokenId,
          referrer: creator,
          timestamp: Date.now() - (1000 * 60 * 60 * 24), // Set to 24h ago for historical
          txHash: event.transactionHash,
          metadata: {
            blockNumber: Number(event.blockNumber),
            historical: true,
            importedAt: new Date().toISOString()
          }
        });

        if (created) {
          // Check if this gift was claimed
          const claimEvent = claimedEvents.find(
            claim => claim.args.giftId.toString() === giftId
          );

          if (claimEvent) {
            // Record claim event
            const claimEventId = `${claimEvent.transactionHash}-${claimEvent.logIndex || 0}`;
            await recordGiftEvent({
              eventId: claimEventId,
              type: 'claimed',
              campaignId,
              giftId,
              tokenId,
              claimer: claimEvent.args.claimer,
              timestamp: Date.now() - (1000 * 60 * 60 * 12), // Set to 12h ago
              txHash: claimEvent.transactionHash,
              metadata: {
                blockNumber: Number(claimEvent.blockNumber),
                historical: true
              }
            });

            console.log(`✅ Imported gift ${giftId} (created + claimed)`);
          } else {
            console.log(`✅ Imported gift ${giftId} (created only)`);
          }

          imported++;
        } else {
          console.log(`⏭️ Skipped gift ${giftId} (already imported)`);
          skipped++;
        }
      } catch (error) {
        console.error(`❌ Error importing event:`, error);
        errors++;
      }
    }

    // Initialize campaigns
    for (const campaignId of campaigns) {
      try {
        const creator = campaignId.replace('campaign_', '0x');
        await initializeCampaign(
          campaignId,
          `Historical Campaign ${campaignId.slice(-8)}`,
          creator
        );
      } catch (error) {
        console.error(`Failed to initialize campaign ${campaignId}:`, error);
      }
    }

    // Log import summary
    debugLogger.operation('Historical data import completed', {
      imported,
      skipped,
      errors,
      campaigns: campaigns.size,
      requestedBy: authenticatedAddress
    });

    return res.status(200).json({
      success: true,
      message: 'Historical data import completed',
      summary: {
        eventsFound: filteredMintedEvents.length,
        eventsProcessed: eventsToImport.length,
        imported,
        skipped,
        errors,
        campaignsCreated: campaigns.size
      },
      details: {
        blockRange: { from: startBlock, to: currentBlock },
        walletFilter: walletAddress || 'none',
        limit
      }
    });

  } catch (error: any) {
    console.error('📊 Historical import error:', error);

    return res.status(500).json({
      error: 'Failed to import historical data',
      message: error.message || 'Unknown error'
    });
  }
}

// Helper to get latest block number
async function getLatestBlockNumber(): Promise<number> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const blockNumber = await provider.getBlockNumber();
    return blockNumber;
  } catch (error) {
    console.error('Failed to get latest block:', error);
    return 0;
  }
}