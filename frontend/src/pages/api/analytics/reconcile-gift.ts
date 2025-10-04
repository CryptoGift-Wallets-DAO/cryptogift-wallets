/**
 * RECONCILIATION ENDPOINT - Backfill missing gifts in Redis
 * Reads blockchain data and creates Redis entries for gifts that were minted
 * before analytics fixes were deployed
 *
 * Usage: POST /api/analytics/reconcile-gift
 * Body: { tokenId: "310" }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { ethers } from 'ethers';
import { processBlockchainEvent } from '../../../lib/analytics/canonicalEvents';
import { storeGiftMapping } from '../../../lib/giftMappingStore';

const ESCROW_CONTRACT = "0x46175CfC233500DA803841DEef7f2816e7A129E0";
const NFT_CONTRACT = "0xeFCba1D72B8f053d93BA44b7b15a1BeED515C89b";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tokenId } = req.body;

  if (!tokenId) {
    return res.status(400).json({ error: 'tokenId required' });
  }

  try {
    // Check Redis
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return res.status(500).json({ error: 'Redis not configured' });
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    });

    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL!);
    const escrowContract = new ethers.Contract(
      ESCROW_CONTRACT,
      [
        'event GiftRegistered(uint256 indexed giftId, uint256 indexed tokenId, address indexed creator, address nftContract, uint256 expirationTime, bytes32 passwordHash)',
        'function getGift(uint256 giftId) view returns (address creator, uint256 tokenId, address nftContract, uint256 expirationTime, bytes32 passwordHash, bool claimed, address claimer)',
        'function ownerOf(uint256) view returns (address)'
      ],
      provider
    );

    // Search for GiftRegistered event with this tokenId
    console.log(`🔍 Searching blockchain for tokenId ${tokenId}...`);

    const filter = escrowContract.filters.GiftRegistered(null, tokenId);
    const events = await escrowContract.queryFilter(filter, -10000); // Last ~10k blocks

    if (events.length === 0) {
      return res.status(404).json({
        error: 'Gift not found on blockchain',
        tokenId,
        suggestion: 'This tokenId may not exist or was not registered in escrow'
      });
    }

    const event = events[0];
    const giftId = event.args?.giftId?.toString();
    const creator = event.args?.creator;
    const expirationTime = event.args?.expirationTime?.toString();
    const blockNumber = event.blockNumber;
    const txHash = event.transactionHash;

    console.log(`✅ Found gift on blockchain: giftId=${giftId}, creator=${creator}`);

    // Get block timestamp
    const block = await provider.getBlock(blockNumber);
    const blockTimestamp = block?.timestamp || Math.floor(Date.now() / 1000);

    // Check if gift was claimed
    const giftData = await escrowContract.getGift(giftId);
    const isClaimed = giftData.claimed;
    const claimer = giftData.claimer;

    console.log(`Gift status: claimed=${isClaimed}, claimer=${claimer}`);

    // 1. Create mapping
    await storeGiftMapping(
      giftId,
      tokenId,
      NFT_CONTRACT,
      84532, // Base Sepolia
      {
        creator,
        expirationTime,
        registeredAt: blockTimestamp
      }
    );
    console.log(`✅ Mapping created: gift_mapping:${tokenId}`);

    // 2. Process GiftCreated event
    await processBlockchainEvent(
      redis,
      'GiftCreated',
      txHash,
      0,
      BigInt(blockNumber),
      blockTimestamp * 1000,
      {
        giftId: giftId,
        tokenId: tokenId,
        campaignId: `campaign_${creator.slice(0, 8)}`,
        creator: creator,
        amount: '0',
        metadata: {
          reconciled: true,
          expirationTime
        }
      },
      'reconciliation'
    );
    console.log(`✅ GiftCreated event processed`);

    // 3. If claimed, process GiftClaimed event
    let claimProcessed = false;
    if (isClaimed && claimer !== ethers.ZeroAddress) {
      await processBlockchainEvent(
        redis,
        'GiftClaimed',
        `claim_reconciled_${giftId}`,
        0,
        BigInt(blockNumber),
        blockTimestamp * 1000,
        {
          giftId: giftId,
          tokenId: tokenId,
          campaignId: `campaign_${creator.slice(0, 8)}`,
          claimer: claimer,
          creator: creator,
          metadata: {
            reconciled: true
          }
        },
        'reconciliation'
      );
      claimProcessed = true;
      console.log(`✅ GiftClaimed event processed`);
    }

    return res.status(200).json({
      success: true,
      message: 'Gift reconciled successfully',
      data: {
        giftId,
        tokenId,
        creator,
        claimed: isClaimed,
        claimer: isClaimed ? claimer : null,
        blockNumber,
        transactionHash: txHash,
        eventsProcessed: {
          created: true,
          claimed: claimProcessed
        }
      }
    });

  } catch (error: any) {
    console.error('Reconciliation error:', error);
    return res.status(500).json({
      error: 'Reconciliation failed',
      message: error.message,
      stack: error.stack
    });
  }
}
