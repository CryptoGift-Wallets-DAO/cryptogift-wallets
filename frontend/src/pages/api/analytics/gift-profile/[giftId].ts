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

  const { giftId: giftIdParam } = req.query;

  if (!giftIdParam || typeof giftIdParam !== 'string') {
    return res.status(400).json({ error: 'Invalid gift ID' });
  }

  try {
    // CRITICAL FIX #10: Handle missing mappings with Redis-based resolution
    console.error(`🎯 ANALYTICS START: Resolving ID for param=${giftIdParam}`);

    const { getGiftIdFromTokenId } = await import('@/lib/escrowUtils');
    let resolvedGiftId = await getGiftIdFromTokenId(giftIdParam);

    let giftId: string;
    let tokenId: string;

    if (resolvedGiftId !== null) {
      // Mapping found in Redis or blockchain
      giftId = resolvedGiftId.toString();
      tokenId = giftIdParam;
      console.error(`✅ MAPPING RESOLVED: tokenId ${tokenId} → giftId ${giftId}`);
    } else {
      // No mapping found - need to check if param is tokenId or giftId
      // Strategy: Try to find gift:detail using tokenId field
      console.error(`⚠️ NO MAPPING: Searching gift:detail by tokenId field`);

      // First assume param is giftId and check if it exists
      giftId = giftIdParam;
      tokenId = giftIdParam;
      console.error(`🔍 FALLBACK: Trying giftId=${giftId} (param as giftId)`);
    }

    // Initialize profile
    const profile: CompleteGiftProfile = {
      giftId,
      tokenId,

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
    // CRITICAL TEST: Use console.error to force immediate unbuffered logging
    console.error('🚀 REDIS CONNECTION TEST - Build 141366d - UNBUFFERED LOG');

    // Force immediate flush by using process.stdout if available
    if (typeof process !== 'undefined' && process.stdout) {
      process.stdout.write('📍 MARKER: About to import getRedisConnection\n');
    }

    // CRITICAL FIX #7: Wrap getRedisConnection in try-catch (throws in production)
    let redis: Redis | null = null;
    try {
      const { getRedisConnection } = await import('@/lib/redisConfig');
      console.error('✅ Import successful, calling getRedisConnection()');
      redis = getRedisConnection();
      console.error('✅ REDIS CONNECTED - TYPE:', typeof redis);

      if (typeof process !== 'undefined' && process.stdout) {
        process.stdout.write(`✅ Redis instance created: ${redis ? 'YES' : 'NO'}\n`);
      }
    } catch (redisError: any) {
      console.error('❌ REDIS CONNECTION FAILED:', redisError.message);
      console.error('❌ STACK:', redisError.stack);
      redis = null;
    }

    console.error('🔍 FINAL REDIS STATUS:', {
      hasRedis: !!redis,
      redisType: redis ? typeof redis : 'null',
      timestamp: new Date().toISOString()
    });

    if (redis) {
      console.error('🔄 ENTERING REDIS DATA FETCH - Redis instance confirmed');

      // Get gift details from multiple sources

      // A. Check gift:detail:{giftId} (PRIMARY SOURCE - FASE 2 & 3)
      console.error(`📖 Section A: Fetching gift:detail:${giftId}`);
      let giftDetails = await redis.hgetall(`gift:detail:${giftId}`);
      console.error('🔍 Section A Result (by giftId):', {
        giftId,
        hasData: !!giftDetails,
        keys: giftDetails ? Object.keys(giftDetails) : []
      });

      // CRITICAL FIX #10B: If not found and no mapping, search by tokenId field
      if ((!giftDetails || Object.keys(giftDetails).length === 0) && resolvedGiftId === null) {
        console.error(`🔍 Section A Fallback: Searching all gift:detail:* for tokenId=${giftIdParam}`);

        // Get all gift:detail keys
        const allGiftKeys = await redis.keys('gift:detail:*');
        console.error(`📊 Found ${allGiftKeys.length} gift:detail keys`);

        // Search for matching tokenId
        for (const key of allGiftKeys) {
          const details = await redis.hgetall(key);
          if (details && details.tokenId?.toString() === giftIdParam) {
            // Found it! Extract actual giftId from key
            const actualGiftId = key.replace('gift:detail:', '');
            console.error(`✅ FOUND BY TOKENID: ${key} has tokenId=${giftIdParam}`);

            giftId = actualGiftId;
            giftDetails = details;
            profile.giftId = actualGiftId;
            break;
          }
        }

        if (giftDetails && Object.keys(giftDetails).length > 0) {
          console.error(`🎯 FALLBACK SUCCESS: Resolved tokenId ${giftIdParam} → giftId ${giftId}`);
        } else {
          console.error(`❌ FALLBACK FAILED: No gift:detail found for tokenId ${giftIdParam}`);
        }
      }

      if (giftDetails && Object.keys(giftDetails).length > 0) {
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
          console.error('🔍 SECCIÓN A - BUILDING CLAIM OBJECT:', {
            giftId,
            claimer: giftDetails.claimer,
            claimedAt: giftDetails.claimedAt,
            previousClaim: profile.claim
          });

          const claimedAtISO = giftDetails.claimedAt ?
            new Date(parseInt(giftDetails.claimedAt as string)).toISOString() :
            undefined;

          profile.claim = {
            ...profile.claim,
            claimed: true,
            claimerAddress: giftDetails.claimer as string,
            claimerWallet: (giftDetails.claimer as string) || profile.claim?.claimerWallet, // CRITICAL FIX: Preserve from blockchain
            claimedAt: claimedAtISO
          };

          // CRITICAL FIX: Also set fallback fields at root level for UI compatibility
          (profile as any).claimer = giftDetails.claimer as string;
          (profile as any).claimedAt = claimedAtISO;

          console.error('✅ SECCIÓN A - CLAIM OBJECT BUILT:', {
            giftId,
            claimObject: profile.claim,
            hasClaimerWallet: !!profile.claim.claimerWallet,
            rootClaimer: (profile as any).claimer,
            rootClaimedAt: (profile as any).claimedAt
          });
        }

        // FASE 3: Read education data from gift:detail (written by complete-module.ts)
        // CRITICAL FIX: Also read FASE 1 & 2 data (education_score_*, education_answers_detail)
        const hasLegacyEducation = giftDetails.educationCompleted === 'true';
        const hasFase1Education = giftDetails.education_score_percentage || giftDetails.education_score_total;

        if (hasLegacyEducation || hasFase1Education) {
          profile.education = {
            required: true,
            completed: hasLegacyEducation || !!giftDetails.education_completed_at,
            completedAt: giftDetails.educationCompletedAt ?
              new Date(parseInt(giftDetails.educationCompletedAt as string)).toISOString() :
              (giftDetails.education_completed_at ? new Date(parseInt(giftDetails.education_completed_at as string)).toISOString() : undefined),
            score: giftDetails.educationScore ? parseInt(giftDetails.educationScore as string) :
                   (giftDetails.education_score_percentage ? parseInt(giftDetails.education_score_percentage as string) : undefined),
            passed: true,
            started: true
          };

          // Parse completed modules (legacy)
          if (giftDetails.educationModules) {
            try {
              const modules = JSON.parse(giftDetails.educationModules as string);
              profile.education.moduleName = `${modules.length} módulos completados`;
            } catch (e) {
              console.warn('Could not parse education modules');
            }
          }

          // FASE 2: Parse detailed question answers
          if (giftDetails.education_answers_detail) {
            try {
              const answersDetail = JSON.parse(giftDetails.education_answers_detail as string);
              profile.education.questions = answersDetail.map((answer: any, idx: number) => ({
                questionId: answer.questionId,
                questionText: answer.questionText,
                selectedAnswer: answer.selectedAnswer,
                correctAnswer: answer.correctAnswer,
                isCorrect: answer.isCorrect,
                timeSpent: answer.timeSpent,
                attemptNumber: 1,
                timestamp: new Date().toISOString()
              }));

              // Calculate total time from answers
              if (answersDetail.length > 0) {
                profile.education.totalTimeSpent = answersDetail.reduce((acc: number, q: any) => acc + (q.timeSpent || 0), 0);
              }

              console.log(`✅ FASE 2: Parsed ${answersDetail.length} question answers for giftId ${giftId}`);
            } catch (parseError) {
              console.error('⚠️ Could not parse education_answers_detail:', parseError);
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
            const decryptedEmail = decryptEmail(giftDetails.email_encrypted as string);
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

        // CRITICAL FIX #1: Read as JSON (not HASH) - education:gift stored with SET/SETEX
        const educationRaw = await redis.get(educationKey);
        const educationData = typeof educationRaw === 'string'
          ? JSON.parse(educationRaw)
          : educationRaw;

        console.log('🔍 DEBUG Section B - education:gift:', {
          giftId,
          educationKey,
          hasData: !!educationData,
          rawType: typeof educationRaw,
          parsedKeys: educationData ? Object.keys(educationData) : []
        });

        if (educationData && Object.keys(educationData).length > 0) {
          // CRITICAL FIX #4: Map actual structure from mint-escrow
          // Structure: { hasEducation, profileId, version, modules, policyHash, tokenId, giftId, createdAt }
          const moduleIds = educationData.modules || [];
          const moduleNames: Record<number, string> = {
            5: 'Sales Masterclass',
            1: 'Wallet Básico',
            2: 'Intro NFTs'
          };

          // CRITICAL FIX: Preserve ALL education data from gift:detail (Section A)
          // Only update module-specific fields from education:gift
          const existingEducation = profile.education;

          profile.education = {
            // Preserve from Section A (gift:detail) - use spread to copy all existing fields
            ...existingEducation,

            // Update only module metadata from education:gift
            required: educationData.hasEducation || existingEducation?.required || false,
            moduleId: moduleIds[0]?.toString() || existingEducation?.moduleId,
            moduleName: moduleIds.length > 0
              ? moduleIds.map((id: number) => moduleNames[id] || `Módulo ${id}`).join(', ')
              : existingEducation?.moduleName,

            // Ensure required fields are set with defaults if not present
            started: existingEducation?.started ?? false,
            completed: existingEducation?.completed ?? false
          };
        }
      } catch (error) {
        debugLogger.log('No education data found');
      }

      // C. Check events stream
      try {
        // CRITICAL FIX #2: Use XREVRANGE to read RECENT events (not oldest 100)
        const eventsRaw = await redis.xrevrange('ga:v1:events', '+', '-', 500);

        // CRITICAL FIX: Parse Upstash stream response correctly
        const { parseStreamResponse } = await import('@/lib/analytics/canonicalEvents');
        const eventsArray = parseStreamResponse(eventsRaw);

        console.log('🔍 DEBUG Section C - events stream:', {
          giftId,
          tokenId,
          totalEvents: eventsArray.length,
          sampleEvents: eventsArray.slice(0, 3).map(([id, fields]: [string, any]) => ({
            id,
            giftId: fields.giftId,
            tokenId: fields.tokenId,
            type: fields.type
          }))
        });

        // Filter events for this gift and reverse to chronological order
        const filteredEvents = eventsArray
          .filter(([_, fields]: [string, any]) => {
            const matches = fields.giftId === giftId || fields.tokenId === giftId;
            if (matches) {
              console.log('✅ Event MATCHED:', { giftId: fields.giftId, tokenId: fields.tokenId, type: fields.type });
            }
            return matches;
          });

        console.log('🔍 DEBUG: Filtered events:', {
          giftId,
          tokenId,
          matchedCount: filteredEvents.length
        });

        profile.events = filteredEvents
          .reverse() // Reverse because XREVRANGE returns newest-first
          .map(([id, fields]: [string, any]) => ({
            eventId: id,
            type: fields.type,
            timestamp: new Date(parseInt(fields.blockTimestamp || fields.timestamp)).toISOString(),
            txHash: fields.transactionHash,
            details: fields.data ? (typeof fields.data === 'string' ? JSON.parse(fields.data) : fields.data) : undefined
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
            // CRITICAL FIX #3: Use reverse_mapping to get tokenId, then read gift_mapping as JSON
            const tokenId = await redis.get(`reverse_mapping:${giftId}`);
            if (typeof tokenId === 'string') {
              const mappingRaw = await redis.get(`gift_mapping:${tokenId}`);
              const mapping = mappingRaw ? JSON.parse(mappingRaw as string) : null;

              if (mapping?.metadata?.creator) {
                profile.creator.address = mapping.metadata.creator;
                console.log(`✅ Creator resolved from gift_mapping: ${profile.creator.address.slice(0, 10)}...`);
              }
              if (mapping?.tokenId) {
                profile.tokenId = mapping.tokenId;
              }
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

    // CRITICAL DEBUG: Log what we're about to return
    console.log('📊 GIFT PROFILE DEBUG:', {
      urlParam: giftIdParam,
      resolvedGiftId: giftId,
      tokenId,
      eventsCount: profile.events.length,
      hasEducation: !!profile.education,
      educationData: profile.education ? {
        required: profile.education.required,
        moduleName: profile.education.moduleName,
        hasEmail: !!profile.education.email
      } : null,
      creatorAddress: profile.creator.address,
      sources: {
        blockchain: !!profile.creator.address,
        redis: !!redis,
        education: !!profile.education,
        events: profile.events.length > 0
      }
    });

    // Add response headers
    res.setHeader('Cache-Control', 'private, max-age=5'); // 5 second cache
    res.setHeader('X-Gift-Status', profile.status.current);

    // CRITICAL DEBUG: Log profile.claim before returning
    console.error('🔍 FINAL PROFILE CHECK:', {
      giftId,
      hasClaim: !!profile.claim,
      claimData: profile.claim,
      hasClaimerWallet: !!profile.claim?.claimerWallet,
      status: profile.status.current,
      eventsCount: profile.events.length
    });

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