/**
 * API: Create Competition
 * POST /api/competition/create
 *
 * Creates a new competition with Gnosis Safe and optional Manifold market
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { v4 as uuidv4 } from 'uuid';
import {
  Competition,
  CompetitionCategory,
  ResolutionMethod,
} from '../../../competencias/types';
import { createCompetitionSafe } from '../../../competencias/lib/safeIntegration';
import { createBinaryMarket, createMultipleChoiceMarket } from '../../../competencias/lib/manifoldClient';

// Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Competition status enum
const STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  ACTIVE: 'active',
} as const;

interface CreateCompetitionRequest {
  // Basic info
  title: string;
  description?: string;
  category: CompetitionCategory;

  // Prize configuration
  currency: string;
  initialPrize?: number;
  entryFee?: number;

  // Timeline
  startsAt?: string;
  endsAt?: string;
  resolutionDeadline?: string;

  // Participants
  maxParticipants?: number;
  minParticipants?: number;

  // Arbitration
  resolutionMethod: ResolutionMethod;
  judges?: string[];
  votingThreshold?: number;
  disputePeriod?: number;

  // Prediction market (for prediction category)
  createMarket?: boolean;
  marketQuestion?: string;
  marketCloseTime?: string;
  initialLiquidity?: number;
  marketOutcomes?: string[]; // For multiple choice

  // Safe configuration
  safeOwners?: string[];
  safeThreshold?: number;

  // Creator
  creatorAddress: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body as CreateCompetitionRequest;

    // Validate required fields
    if (!data.title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!data.category) {
      return res.status(400).json({ error: 'Category is required' });
    }
    if (!data.creatorAddress) {
      return res.status(400).json({ error: 'Creator address is required' });
    }
    if (!data.resolutionMethod) {
      return res.status(400).json({ error: 'Resolution method is required' });
    }

    // Generate competition ID
    const competitionId = uuidv4();

    // Create initial competition object
    const competition: Partial<Competition> = {
      id: competitionId,
      title: data.title,
      description: data.description || '',
      category: data.category,
      status: STATUS.DRAFT,
      creator: {
        address: data.creatorAddress,
        createdAt: new Date().toISOString(),
      },
      prizePool: {
        total: data.initialPrize || 0,
        currency: data.currency || 'ETH',
        distribution: [],
        platformFee: 2.5, // 2.5% platform fee
      },
      timeline: {
        createdAt: new Date().toISOString(),
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        resolutionDeadline: data.resolutionDeadline,
      },
      participants: {
        current: 0,
        maxParticipants: data.maxParticipants,
        minParticipants: data.minParticipants || 2,
        entries: [],
      },
      arbitration: {
        method: data.resolutionMethod,
        judges: (data.judges || []).map(address => ({
          address,
          role: 'arbiter' as const,
          weight: 1,
        })),
        votingThreshold: data.votingThreshold || 66,
        disputePeriod: data.disputePeriod || 86400, // 24 hours default
        votes: [],
      },
      rules: {
        entryFee: data.entryFee || 0,
        customRules: [],
      },
      transparency: {
        events: [],
        publicData: true,
        auditLog: true,
      },
    };

    // Create Gnosis Safe for fund custody (if not a draft)
    let safeAddress: string | undefined;
    if (data.safeOwners && data.safeOwners.length > 0) {
      try {
        const safeResult = await createCompetitionSafe(competition, {
          sendTransaction: async () => {
            // In real implementation, this would send the transaction
            // For now, we'll create a pending Safe
            return { hash: `0x${competitionId.replace(/-/g, '')}` };
          },
        });

        if (safeResult.success && safeResult.data) {
          safeAddress = safeResult.data.address;
          competition.safeAddress = safeAddress;
        }
      } catch (safeError) {
        console.error('Safe creation failed:', safeError);
        // Continue without Safe - can be created later
      }
    }

    // Create Manifold market for prediction competitions
    if (data.category === 'prediction' && data.createMarket) {
      try {
        const marketParams = {
          question: data.marketQuestion || data.title,
          closeTime: data.marketCloseTime
            ? new Date(data.marketCloseTime).getTime()
            : Date.now() + 7 * 24 * 60 * 60 * 1000, // Default: 7 days
          description: data.description,
          initialProb: 50,
        };

        let marketResult;
        if (data.marketOutcomes && data.marketOutcomes.length > 2) {
          // Multiple choice market
          marketResult = await createMultipleChoiceMarket({
            ...marketParams,
            answers: data.marketOutcomes,
          });
        } else {
          // Binary market
          marketResult = await createBinaryMarket(marketParams);
        }

        if (marketResult.success && marketResult.data) {
          competition.market = {
            manifoldId: marketResult.data.id,
            probability: 0.5,
            pool: {
              yesPool: data.initialLiquidity || 100,
              noPool: data.initialLiquidity || 100,
            },
            totalVolume: 0,
            bets: [],
          };
        }
      } catch (marketError) {
        console.error('Market creation failed:', marketError);
        // Continue without market - can be created later
      }
    }

    // Add creation event to transparency log
    competition.transparency!.events = [{
      type: 'competition_created',
      timestamp: Date.now(),
      actor: data.creatorAddress,
      action: 'Competition created',
      details: {
        category: data.category,
        resolutionMethod: data.resolutionMethod,
        hasSafe: !!safeAddress,
        hasMarket: !!competition.market,
      },
      verified: true,
    }];

    // Store in Redis
    await redis.set(`competition:${competitionId}`, JSON.stringify(competition));

    // Add to category index
    await redis.sadd(`competitions:${data.category}`, competitionId);

    // Add to creator's competitions
    await redis.sadd(`user:${data.creatorAddress}:competitions`, competitionId);

    // Add to all competitions list
    await redis.zadd('competitions:all', {
      score: Date.now(),
      member: competitionId,
    });

    return res.status(201).json({
      success: true,
      data: {
        competition,
        id: competitionId,
        safeAddress,
        marketId: competition.market?.manifoldId,
      },
    });
  } catch (error) {
    console.error('Competition creation error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create competition',
    });
  }
}
