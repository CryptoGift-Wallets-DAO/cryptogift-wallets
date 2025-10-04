/**
 * GIFT PROFILE API - COMPLETE TRACKING FOR INDIVIDUAL GIFTS
 *
 * Returns EVERYTHING about a specific gift:
 * - Creation details
 * - Viewing history
 * - Education progress and scores
 * - Claim information
 * - Wallet addresses
 * - Email (hashed for privacy)
 * - Question-by-question results
 * - Time spent on each step
 * - Complete transaction history
 *
 * THIS IS THE REAL TRACKING YOU REQUESTED
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { debugLogger } from '@/lib/secureDebugLogger';
import { createThirdwebClient, getContract, readContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { validateRedisForCriticalOps } from '@/lib/redisConfig';

const NFT_CONTRACT = "0xeFCba1D72B8f053d93BA44b7b15a1BeED515C89b";
const ESCROW_CONTRACT = "0x46175CfC233500DA803841DEef7f2816e7A129E0";

interface CompleteGiftProfile {
  // Core Identity
  giftId: string;
  tokenId: string;
  campaignId?: string;

  // Creation Info
  creator: {
    address: string;
    referrer?: string;
    createdAt: string;
    blockNumber?: string;
    txHash?: string;
    gasUsed?: string;
  };

  // Current Status
  status: {
    current: string;
    isInEscrow: boolean;
    isExpired: boolean;
    expiresAt?: string;
  };

  // Viewing History
  viewingHistory: Array<{
    timestamp: string;
    viewerAddress?: string;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
  }>;

  // Education Tracking
  education?: {
    required: boolean;
    moduleId?: string;
    moduleName?: string;

    // Email tracking (hashed)
    email?: string;
    emailHash?: string;

    // Progress
    started: boolean;
    startedAt?: string;
    completed: boolean;
    completedAt?: string;

    // Results
    score?: number;
    passed?: boolean;
    totalTimeSpent?: number; // seconds

    // Question-by-question breakdown
    questions?: Array<{
      questionId: string;
      questionText: string;
      selectedAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
      timeSpent: number; // seconds
      attemptNumber: number;
      timestamp: string;
    }>;

    // Additional metrics
    videoWatched?: boolean;
    videoWatchTime?: number;
    resourcesViewed?: string[];
  };

  // Claim Information
  claim?: {
    claimed: boolean;
    claimedAt?: string;
    claimerAddress?: string;
    claimerWallet?: string; // Full wallet address
    blockNumber?: string;
    txHash?: string;
    gasUsed?: string;

    // Password validation
    passwordAttempts?: number;
    passwordValidatedAt?: string;
  };

  // Value & Rewards
  value: {
    amount?: number;
    currency?: string;
    usdValue?: number;
    tokenAmount?: string;
    tokenSymbol?: string;
  };

  // Metadata
  metadata: {
    imageUrl?: string;
    imageCid?: string;
    description?: string;
    hasPassword: boolean;
    tbaAddress?: string; // Token Bound Account
    escrowAddress?: string;
  };

  // Complete Event History
  events: Array<{
    eventId: string;
    type: string;
    timestamp: string;
    txHash?: string;
    details?: any;
  }>;

  // Analytics Summary
  analytics: {
    totalViews: number;
    uniqueViewers: number;
    conversionRate: number;
    timeToClaimMinutes?: number;
    educationCompletionRate?: number;
    avgEducationScore?: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { giftId } = req.query;

  if (!giftId || typeof giftId !== 'string') {
    return res.status(400).json({ error: 'Invalid gift ID' });
  }

  try {
    debugLogger.operation('Fetching complete gift profile', { giftId });

    // Initialize profile
    const profile: CompleteGiftProfile = {
      giftId,
      tokenId: giftId,

      creator: {
        address: 'unknown',
        createdAt: new Date().toISOString()
      },

      status: {
        current: 'unknown',
        isInEscrow: false,
        isExpired: false
      },

      viewingHistory: [],

      value: {},

      metadata: {
        hasPassword: false
      },

      events: [],

      analytics: {
        totalViews: 0,
        uniqueViewers: 0,
        conversionRate: 0
      }
    };

    // 1. Check blockchain for current owner
    try {
      const client = createThirdwebClient({
        clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID || "",
      });

      const nftContract = getContract({
        client,
        chain: baseSepolia,
        address: NFT_CONTRACT,
      });

      // Get current owner
      const owner = await readContract({
        contract: nftContract,
        method: "function ownerOf(uint256) view returns (address)",
        params: [BigInt(giftId)]
      });

      if (owner) {
        profile.status.isInEscrow = owner.toLowerCase() === ESCROW_CONTRACT.toLowerCase();

        if (profile.status.isInEscrow) {
          profile.status.current = 'created';
          profile.creator.address = ESCROW_CONTRACT;
        } else {
          profile.status.current = 'claimed';
          profile.claim = {
            claimed: true,
            claimerAddress: owner,
            claimerWallet: owner
          };
        }
      }
    } catch (error) {
      debugLogger.log('Could not fetch blockchain data', { giftId, error });
    }

    // 2. Check Redis for detailed tracking data
    const redis = validateRedisForCriticalOps('Gift profile');

    if (redis) {
      // Get gift details from multiple sources

      // A. Check gift:detail:{giftId} (PRIMARY SOURCE - FASE 2 & 3)
      const giftDetails = await redis.hgetall(`gift:detail:${giftId}`);
      if (giftDetails) {
        profile.creator.address = (giftDetails.creator as string) || (giftDetails.referrer as string) || profile.creator.address;
        profile.creator.createdAt = giftDetails.createdAt ?
          new Date(parseInt(giftDetails.createdAt as string)).toISOString() :
          profile.creator.createdAt;
        profile.campaignId = giftDetails.campaignId as string || 'default';
        profile.status.current = giftDetails.status as string || profile.status.current;

        if (giftDetails.value) {
          profile.value.amount = parseFloat(giftDetails.value as string);
        }

        if (giftDetails.claimer) {
          profile.claim = {
            ...profile.claim,
            claimed: true,
            claimerAddress: giftDetails.claimer as string,
            claimerWallet: (giftDetails.claimer as string) || profile.claim?.claimerWallet, // CRITICAL FIX: Preserve from blockchain
            claimedAt: giftDetails.claimedAt ?
              new Date(parseInt(giftDetails.claimedAt as string)).toISOString() :
              undefined
          };
        }

        // FASE 3: Read education data from gift:detail (written by complete-module.ts)
        if (giftDetails.educationCompleted === 'true') {
          profile.education = {
            required: true,
            completed: true,
            completedAt: giftDetails.educationCompletedAt ?
              new Date(parseInt(giftDetails.educationCompletedAt as string)).toISOString() :
              undefined,
            score: giftDetails.educationScore ? parseInt(giftDetails.educationScore as string) : undefined,
            passed: true,
            started: true
          };

          // Parse completed modules
          if (giftDetails.educationModules) {
            try {
              const modules = JSON.parse(giftDetails.educationModules as string);
              profile.education.moduleName = `${modules.length} módulos completados`;
            } catch (e) {
              console.warn('Could not parse education modules');
            }
          }
        }

        // CRITICAL FIX: Decrypt email from gift:detail (FASE 1)
        if (giftDetails.email_encrypted && giftDetails.email_hmac) {
          if (!profile.education) {
            profile.education = {
              required: false,
              started: false,
              completed: false
            };
          }
          profile.education.emailHash = giftDetails.email_hmac as string;

          // Decrypt email for analytics display
          try {
            const { decryptEmail } = await import('@/lib/piiEncryption');
            const decryptedEmail = decryptEmail(
              giftDetails.email_encrypted as string,
              giftDetails.email_hmac as string
            );
            if (decryptedEmail) {
              profile.education.email = decryptedEmail;
              console.log('📧 Email descifrado exitosamente para analytics');
            }
          } catch (decryptError) {
            console.warn('⚠️ Could not decrypt email:', decryptError);
            // Keep emailHash for reference
          }
        }
      }

      // B. Check education tracking
      try {
        const educationKey = `education:gift:${giftId}`;
        const educationData = await redis.hgetall(educationKey);

        if (educationData && Object.keys(educationData).length > 0) {
          profile.education = {
            required: true,
            moduleId: educationData.moduleId as string,
            moduleName: educationData.moduleName as string || 'Sales Masterclass',

            email: educationData.email as string,
            emailHash: educationData.emailHash as string,

            started: !!educationData.startedAt,
            startedAt: educationData.startedAt ?
              new Date(parseInt(educationData.startedAt as string)).toISOString() :
              undefined,

            completed: educationData.completed === 'true',
            completedAt: educationData.completedAt ?
              new Date(parseInt(educationData.completedAt as string)).toISOString() :
              undefined,

            score: educationData.score ? parseInt(educationData.score as string) : undefined,
            passed: educationData.passed === 'true',
            totalTimeSpent: educationData.totalTimeSpent ?
              parseInt(educationData.totalTimeSpent as string) :
              undefined
          };

          // Parse questions detail if available
          if (educationData.questionsDetail) {
            try {
              profile.education.questions = JSON.parse(educationData.questionsDetail as string);
            } catch (e) {
              debugLogger.log('Could not parse questions detail');
            }
          }
        }
      } catch (error) {
        debugLogger.log('No education data found');
      }

      // C. Check events stream
      try {
        const eventsRaw = await redis.xrange('ga:v1:events', '-', '+', 100);
        const events = (eventsRaw as unknown) as any[];

        // Filter events for this gift
        profile.events = events
          .filter(([_, fields]: [string, any]) =>
            fields.giftId === giftId || fields.tokenId === giftId
          )
          .map(([id, fields]: [string, any]) => ({
            eventId: id,
            type: fields.type,
            timestamp: new Date(parseInt(fields.blockTimestamp || fields.timestamp)).toISOString(),
            txHash: fields.transactionHash,
            details: fields.data ? JSON.parse(fields.data) : undefined
          }));

        // Update analytics from events
        profile.analytics.totalViews = profile.events.filter(e => e.type === 'GiftViewed').length;

        // CRITICAL FIX: Extract creator info from GiftCreated event
        const createEvent = profile.events.find(e => e.type === 'GiftCreated');
        if (createEvent) {
          profile.creator.txHash = createEvent.txHash;
          profile.creator.createdAt = createEvent.timestamp; // Update with actual blockchain timestamp
          if (createEvent.details?.creator) {
            profile.creator.address = createEvent.details.creator;
          }
        }

        // FALLBACK: If creator still unknown, try to get from gift_mapping
        if (profile.creator.address === 'unknown') {
          try {
            const mappingData = await redis.hgetall(`gift_mapping:${giftId}`);
            if (mappingData && mappingData.creator) {
              profile.creator.address = mappingData.creator as string;
              console.log(`✅ Creator resolved from gift_mapping: ${profile.creator.address.slice(0, 10)}...`);
            }
          } catch (e) {
            // Keep as unknown if mapping not found
          }
        }

        // CRITICAL FIX: Extract claim info from GiftClaimed event with claimerWallet
        const claimEvent = profile.events.find(e => e.type === 'GiftClaimed');
        if (claimEvent) {
          profile.claim = {
            ...profile.claim,
            claimed: true,
            claimedAt: claimEvent.timestamp,
            txHash: claimEvent.txHash
          };
          if (claimEvent.details?.claimer) {
            profile.claim.claimerAddress = claimEvent.details.claimer;
            profile.claim.claimerWallet = claimEvent.details.claimer; // CRITICAL FIX: Also set claimerWallet
          }
        }
      } catch (error) {
        debugLogger.log('No events found');
      }

      // D. Check viewing history
      try {
        const viewKey = `gift:views:${giftId}`;
        const views = await redis.lrange(viewKey, 0, -1);

        if (views && views.length > 0) {
          profile.viewingHistory = views.map(v => {
            try {
              return JSON.parse(v as string);
            } catch {
              return { timestamp: new Date().toISOString() };
            }
          });

          profile.analytics.totalViews = Math.max(
            profile.analytics.totalViews,
            profile.viewingHistory.length
          );
        }
      } catch (error) {
        debugLogger.log('No viewing history found');
      }
    }

    // Calculate analytics
    profile.analytics.conversionRate = profile.claim?.claimed ? 100 : 0;

    if (profile.creator.createdAt && profile.claim?.claimedAt) {
      const created = new Date(profile.creator.createdAt).getTime();
      const claimed = new Date(profile.claim.claimedAt).getTime();
      profile.analytics.timeToClaimMinutes = Math.round((claimed - created) / 60000);
    }

    if (profile.education) {
      profile.analytics.educationCompletionRate = profile.education.completed ? 100 :
        profile.education.started ? 50 : 0;
      profile.analytics.avgEducationScore = profile.education.score;
    }

    // Add response headers
    res.setHeader('Cache-Control', 'private, max-age=5'); // 5 second cache
    res.setHeader('X-Gift-Status', profile.status.current);

    return res.status(200).json({
      success: true,
      profile,
      sources: {
        blockchain: !!profile.creator.address,
        redis: !!redis,
        education: !!profile.education,
        events: profile.events.length > 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Gift profile error:', error);
    debugLogger.error('Gift profile failed', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch gift profile',
      message: error.message || 'Unknown error'
    });
  }
}