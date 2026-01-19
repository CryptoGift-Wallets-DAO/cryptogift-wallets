/**
 * API: Create Competition
 * POST /api/competition/create
 *
 * Creates a new competition with Gnosis Safe and optional Manifold market
 * REQUIERE AUTENTICACIÓN SIWE
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { v4 as uuidv4 } from 'uuid';
import {
  Competition,
  CompetitionCategory,
  ResolutionMethod,
} from '../../../competencias/types';
import { predictSafeAddress } from '../../../competencias/lib/safeClient';
import { createBinaryMarket, createMultipleChoiceMarket } from '../../../competencias/lib/manifoldClient';
import { withAuth, getAuthenticatedAddress } from '../../../competencias/lib/authMiddleware';
import { SAFE_CONTRACTS } from '../../../competencias/lib/safeClient';

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

  // NOTA: creatorAddress viene del token JWT autenticado, no del body
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Obtener dirección autenticada del token JWT (seguro, no manipulable)
    const creatorAddress = getAuthenticatedAddress(req);

    const data = req.body as CreateCompetitionRequest;

    // Validate required fields
    if (!data.title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!data.category) {
      return res.status(400).json({ error: 'Category is required' });
    }
    // creatorAddress ya no viene del body - viene del JWT autenticado
    if (!data.resolutionMethod) {
      return res.status(400).json({ error: 'Resolution method is required' });
    }

    // Generate competition ID
    const competitionId = uuidv4();

    // Create initial competition object
    // Using Record type to allow flexible structure during creation
    const competition: Record<string, unknown> = {
      id: competitionId,
      title: data.title,
      description: data.description || '',
      category: data.category,
      status: STATUS.PENDING, // Pending = accepting participants
      creator: {
        address: creatorAddress,
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

    // Predict Gnosis Safe address for fund custody
    // The Safe will be deployed by the frontend using the user's wallet
    let safeAddress: string | undefined;
    let safeDeploymentInfo: {
      predictedAddress: string;
      owners: string[];
      threshold: number;
      saltNonce: string;
      deployed: boolean;
    } | undefined;

    // Determine Safe owners: creator + judges
    const safeOwners = data.safeOwners && data.safeOwners.length > 0
      ? data.safeOwners
      : [creatorAddress, ...(data.judges || [])].filter((addr): addr is string => !!addr);

    if (safeOwners.length > 0) {
      try {
        // Default threshold: majority of owners, minimum 1
        const safeThreshold = data.safeThreshold || Math.max(1, Math.ceil(safeOwners.length / 2));

        // Generate unique salt nonce - must be numeric for BigInt conversion
        // Use timestamp + random number to ensure uniqueness
        const saltNonce = `${Date.now()}${Math.floor(Math.random() * 1000000)}`;

        // Predict Safe address (counterfactual deployment)
        safeAddress = await predictSafeAddress({
          owners: safeOwners,
          threshold: safeThreshold,
          saltNonce,
        });

        competition.safeAddress = safeAddress;

        // Store deployment info for frontend to use
        safeDeploymentInfo = {
          predictedAddress: safeAddress,
          owners: safeOwners,
          threshold: safeThreshold,
          saltNonce,
          deployed: false, // Will be set to true after frontend deploys
        };

        // Store Safe info in custody field
        competition.custody = {
          safeAddress,
          owners: safeOwners,
          threshold: safeThreshold,
          deployed: false,
          predictedAt: new Date().toISOString(),
          saltNonce,
        };
      } catch (safeError) {
        console.error('Safe address prediction failed:', safeError);
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
    const transparency = competition.transparency as { events: unknown[] };
    transparency.events = [{
      type: 'competition_created',
      timestamp: Date.now(),
      actor: creatorAddress,
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
    await redis.sadd(`user:${creatorAddress}:competitions`, competitionId);

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
        safeDeploymentInfo: safeDeploymentInfo ? {
          ...safeDeploymentInfo,
          chainId: 8453, // Base Mainnet
          contracts: {
            singleton: SAFE_CONTRACTS.SAFE_L2_SINGLETON,
            proxyFactory: SAFE_CONTRACTS.SAFE_PROXY_FACTORY,
            fallbackHandler: SAFE_CONTRACTS.FALLBACK_HANDLER,
          },
          instructions: {
            message: 'Deploy the Safe using the Safe SDK on the frontend with the user\'s wallet',
            steps: [
              '1. Initialize Safe with predictedSafe configuration using saltNonce',
              '2. Call createSafeDeploymentTransaction()',
              '3. Send the deployment transaction with user\'s wallet',
              '4. Call POST /api/safe/deploy to confirm deployment',
            ],
          },
        } : null,
        marketId: (competition.market as { manifoldId?: string } | undefined)?.manifoldId,
      },
    });
  } catch (error) {
    console.error('Competition creation error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create competition',
    });
  }
}

// Exportar con middleware de autenticación
export default withAuth(handler);
