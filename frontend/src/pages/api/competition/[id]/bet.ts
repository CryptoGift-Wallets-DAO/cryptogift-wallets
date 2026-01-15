/**
 * API: Place Bet
 * POST /api/competition/[id]/bet
 *
 * Places a bet on a prediction market competition
 * REQUIERE AUTENTICACIÓN SIWE
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { v4 as uuidv4 } from 'uuid';
import { Competition, ManifoldBet, TransparencyEvent } from '../../../../competencias/types';
import {
  placeBet as manifoldPlaceBet,
  calculateShares,
  calculateNewProbability,
} from '../../../../competencias/lib/manifoldClient';
import { withAuth, getAuthenticatedAddress } from '../../../../competencias/lib/authMiddleware';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface BetRequest {
  outcome: 'YES' | 'NO';
  amount: number;
  txHash?: string;
  // NOTA: userAddress viene del token JWT autenticado
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Competition ID is required' });
  }

  try {
    // Obtener dirección autenticada del token JWT (seguro, no manipulable)
    const userAddress = getAuthenticatedAddress(req);

    const data = req.body as BetRequest;

    // Validate
    if (!data.outcome || !['YES', 'NO'].includes(data.outcome)) {
      return res.status(400).json({ error: 'Valid outcome (YES/NO) is required' });
    }
    if (!data.amount || data.amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Get competition
    const competitionData = await redis.get(`competition:${id}`);
    if (!competitionData) {
      return res.status(404).json({ error: 'Competition not found' });
    }

    const competition: Competition = typeof competitionData === 'string'
      ? JSON.parse(competitionData)
      : competitionData;

    // Validate competition
    if (competition.category !== 'prediction') {
      return res.status(400).json({ error: 'Competition is not a prediction market' });
    }
    if (competition.status !== 'active') {
      return res.status(400).json({ error: 'Competition is not active' });
    }
    if (!competition.market) {
      return res.status(400).json({ error: 'No market associated with this competition' });
    }

    // Calculate shares and new probability
    const pool = competition.market.pool || { yesPool: 100, noPool: 100 };
    const currentProb = competition.market.probability || 0.5;

    const shares = calculateShares(
      data.amount,
      data.outcome,
      { YES: pool.yesPool, NO: pool.noPool },
      currentProb
    );

    const newProbability = calculateNewProbability(
      data.amount,
      data.outcome,
      { YES: pool.yesPool, NO: pool.noPool },
      currentProb
    );

    // Create bet record
    const bet: ManifoldBet = {
      id: uuidv4(),
      marketId: competition.market.manifoldId || id,
      outcome: data.outcome,
      amount: data.amount,
      shares,
      probBefore: currentProb,
      probAfter: newProbability,
      createdTime: Date.now(),
      userId: userAddress,
    };

    // Place bet on Manifold if connected
    let manifoldBetId: string | undefined;
    if (competition.market.manifoldId) {
      try {
        const manifoldResult = await manifoldPlaceBet({
          contractId: competition.market.manifoldId,
          outcome: data.outcome,
          amount: data.amount,
        });

        if (manifoldResult.success && manifoldResult.data) {
          manifoldBetId = manifoldResult.data.id;
          bet.id = manifoldBetId;
        }
      } catch (manifoldError) {
        console.error('Manifold bet placement failed:', manifoldError);
        // Continue with local bet tracking
      }
    }

    // Update competition market state
    competition.market.probability = newProbability;
    competition.market.pool = {
      yesPool: data.outcome === 'YES' ? pool.yesPool + data.amount : pool.yesPool,
      noPool: data.outcome === 'NO' ? pool.noPool + data.amount : pool.noPool,
    };
    competition.market.totalVolume = (competition.market.totalVolume || 0) + data.amount;

    if (!competition.market.bets) {
      competition.market.bets = [];
    }
    competition.market.bets.push(bet);

    // Update prize pool
    if (!competition.prizePool) {
      competition.prizePool = { total: 0, currency: 'ETH', distribution: [], platformFee: 2.5 };
    }
    competition.prizePool.total = (competition.prizePool.total || 0) + data.amount;

    // Create transparency event
    const event: TransparencyEvent = {
      type: 'bet_placed',
      timestamp: Date.now(),
      actor: userAddress,
      action: `Bet ${data.amount} on ${data.outcome}`,
      details: {
        betId: bet.id,
        outcome: data.outcome,
        amount: data.amount,
        shares,
        probBefore: currentProb,
        probAfter: newProbability,
        manifoldBetId,
      },
      txHash: data.txHash,
      verified: !!data.txHash,
    };

    if (!competition.transparency) {
      competition.transparency = { events: [], publicData: true, auditLog: true };
    }
    competition.transparency.events.unshift(event);

    // Store updated competition
    await redis.set(`competition:${id}`, JSON.stringify(competition));

    // Store bet separately
    await redis.lpush(`competition:${id}:bets`, JSON.stringify(bet));

    // Store event
    await redis.lpush(`competition:${id}:events`, JSON.stringify(event));

    // Add to user's bets
    await redis.lpush(`user:${userAddress}:bets`, JSON.stringify({
      competitionId: id,
      ...bet,
    }));

    return res.status(200).json({
      success: true,
      data: {
        bet,
        newProbability,
        pool: competition.market.pool,
        totalVolume: competition.market.totalVolume,
      },
    });
  } catch (error) {
    console.error('Place bet error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to place bet',
    });
  }
}

// Exportar con middleware de autenticación
export default withAuth(handler);
