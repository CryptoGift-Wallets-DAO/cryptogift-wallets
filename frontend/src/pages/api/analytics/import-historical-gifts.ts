/**
 * IMPORT HISTORICAL GIFTS API
 * Imports existing 300+ gifts from blockchain into analytics system
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { BaseSepoliaTestnet } from "@thirdweb-dev/chains";
import { recordGiftEvent, initializeCampaign } from '../../../lib/giftAnalytics';

// Contract addresses from Base Sepolia
const NFT_CONTRACT = "0xeFCba1D72B8f053d93BA44b7b15a1BeED515C89b";
const ESCROW_CONTRACT = "0x46175CfC233500DA803841DEef7f2816e7A129E0";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { limit = 50, startTokenId = 1, onlyRecent = true } = req.body;

    console.log('📚 Starting historical gift import...', { limit, startTokenId });

    // Initialize ThirdWeb SDK
    const sdk = new ThirdwebSDK(BaseSepoliaTestnet, {
      clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID,
    });

    const nftContract = await sdk.getContract(NFT_CONTRACT);
    const escrowContract = await sdk.getContract(ESCROW_CONTRACT);

    const importedGifts: any[] = [];
    const errors: any[] = [];

    // Get recent token events
    const events = await nftContract.events.getAllEvents({
      fromBlock: onlyRecent ? -1000 : 0, // Last 1000 blocks if onlyRecent
      toBlock: "latest"
    });

    console.log(`📊 Found ${events.length} blockchain events`);

    // Process Transfer events to find mints and claims
    for (const event of events.slice(0, limit)) {
      try {
        if (event.eventName === 'Transfer') {
          const { from, to, tokenId } = event.data;
          const tokenIdStr = tokenId.toString();

          // Skip if not in range
          if (parseInt(tokenIdStr) < startTokenId) continue;

          const blockTimestamp = (event as any).timestamp || Date.now();
          const txHash = event.transaction.transactionHash;

          // Determine campaign ID based on owner or default
          const campaignId = `campaign_${to.slice(0, 10)}`;

          // Initialize campaign if needed
          try {
            await initializeCampaign(
              campaignId,
              `Historical Campaign ${to.slice(0, 10)}...`,
              to
            );
          } catch (e) {
            // Campaign might already exist
          }

          if (from === '0x0000000000000000000000000000000000000000') {
            // This is a mint (creation)
            await recordGiftEvent({
              eventId: `historical_mint_${txHash}_${tokenIdStr}`,
              type: 'created',
              campaignId,
              giftId: tokenIdStr,
              tokenId: tokenIdStr,
              referrer: to,
              value: 0, // Unknown value for historical
              timestamp: blockTimestamp,
              txHash,
              metadata: {
                source: 'historical_import',
                creator: to,
                importedAt: new Date().toISOString()
              }
            });

            importedGifts.push({
              tokenId: tokenIdStr,
              type: 'created',
              campaignId,
              txHash,
              timestamp: new Date(blockTimestamp).toISOString()
            });

          } else if (to !== ESCROW_CONTRACT && from !== ESCROW_CONTRACT) {
            // This might be a claim (transfer between addresses)
            await recordGiftEvent({
              eventId: `historical_claim_${txHash}_${tokenIdStr}`,
              type: 'claimed',
              campaignId,
              giftId: tokenIdStr,
              tokenId: tokenIdStr,
              claimer: to,
              timestamp: blockTimestamp,
              txHash,
              metadata: {
                source: 'historical_import',
                claimerAddress: to,
                previousOwner: from,
                importedAt: new Date().toISOString(),
                // Historical claims - education data unknown
                educationCompleted: true, // Assume completed if claimed
                educationScore: 100, // Default assumption
                totalTimeToClaimMinutes: 0 // Unknown
              }
            });

            importedGifts.push({
              tokenId: tokenIdStr,
              type: 'claimed',
              campaignId,
              txHash,
              claimer: to,
              timestamp: new Date(blockTimestamp).toISOString()
            });
          }
        }

      } catch (eventError: any) {
        errors.push({
          event: event.eventName,
          tokenId: event.data?.tokenId?.toString(),
          error: eventError.message
        });
        console.error('Error processing event:', eventError);
      }
    }

    // Generate summary statistics
    const summary = {
      totalProcessed: importedGifts.length,
      byType: {
        created: importedGifts.filter(g => g.type === 'created').length,
        claimed: importedGifts.filter(g => g.type === 'claimed').length
      },
      campaigns: [...new Set(importedGifts.map(g => g.campaignId))].length,
      errors: errors.length
    };

    return res.status(200).json({
      success: true,
      message: `Historical import completed: ${summary.totalProcessed} gifts imported`,
      summary,
      importedGifts: importedGifts.slice(0, 20), // Show first 20 as sample
      errors: errors.slice(0, 10), // Show first 10 errors
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Historical import error:', error);
    return res.status(500).json({
      success: false,
      error: 'Historical import failed',
      message: error.message || 'Unknown error'
    });
  }
}