/**
 * API: Place Bet
 * POST /api/competition/[id]/bet
 *
 * Places a bet on a prediction market competition
 * REQUIERE AUTENTICACIÓN SIWE
 *
 * Uses atomic Redis operations to prevent race conditions:
 * - Ensures probability calculations are based on current state
 * - Prevents pool manipulation from concurrent bets
 * - Maintains accurate total volume
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { ManifoldBet, TransparencyEvent } from '../../../../competencias/types';
import {
  placeBet as manifoldPlaceBet,
} from '../../../../competencias/lib/manifoldClient';
import { withAuth, getAuthenticatedAddress } from '../../../../competencias/lib/authMiddleware';
import { atomicPlaceBet } from '../../../../competencias/lib/atomicOperations';
import { emitBetPlaced } from '../../../../competencias/lib/eventSystem';

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

    // Validate input
    if (!data.outcome || !['YES', 'NO'].includes(data.outcome)) {
      return res.status(400).json({ error: 'Valid outcome (YES/NO) is required' });
    }
    if (!data.amount || data.amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Create bet template (shares and probabilities will be calculated atomically)
    const betId = uuidv4();
    const bet: Omit<ManifoldBet, 'shares' | 'probBefore' | 'probAfter'> = {
      id: betId,
      marketId: id, // Will be updated if competition has manifoldId
      outcome: data.outcome,
      amount: data.amount,
      createdTime: Date.now(),
      userId: userAddress,
    };

    // Create transparency event template
    const event: Omit<TransparencyEvent, 'details'> & { details: Record<string, unknown> } = {
      type: 'bet_placed',
      timestamp: Date.now(),
      actor: userAddress,
      action: `Bet ${data.amount} on ${data.outcome}`,
      details: {
        betId,
        outcome: data.outcome,
        amount: data.amount,
        // shares, probBefore, probAfter will be added by atomic operation
      },
      txHash: data.txHash,
      verified: !!data.txHash,
    };

    // Execute atomic bet operation
    // This prevents race conditions by:
    // 1. Reading current market state
    // 2. Calculating shares and new probability atomically
    // 3. Updating pool, volume, and storing bet in one transaction
    const result = await atomicPlaceBet(
      id,
      userAddress,
      bet,
      event,
      data.outcome,
      data.amount
    );

    if (!result.success) {
      // Map error codes to HTTP status codes
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        NOT_PREDICTION: 400,
        NOT_ACTIVE: 400,
        NO_MARKET: 400,
        SCRIPT_ERROR: 500,
      };

      const status = statusMap[result.code || ''] || 400;
      return res.status(status).json({
        error: result.error,
        code: result.code,
      });
    }

    // Try to place bet on Manifold if connected (async, non-blocking for local state)
    // This is a best-effort sync - the atomic operation already recorded the bet locally
    if (result.data) {
      // Fire-and-forget Manifold sync
      syncWithManifold(id, data.outcome, data.amount, result.data.bet.id).catch(err => {
        console.warn('Manifold sync failed (non-critical):', err);
      });

      // Emit SSE event for real-time updates
      emitBetPlaced(
        id,
        userAddress,
        data.outcome,
        data.amount,
        result.data.bet.shares || 0,
        result.data.newProbability || 0.5
      );
    }

    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Place bet error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to place bet',
    });
  }
}

/**
 * Sync bet with Manifold Markets (best-effort, non-blocking)
 * This runs after the local bet is already recorded atomically
 */
async function syncWithManifold(
  competitionId: string,
  outcome: 'YES' | 'NO',
  amount: number,
  localBetId: string
): Promise<void> {
  // Get competition to check for manifoldId
  const { getRedisConnection } = await import('../../../../lib/redisConfig');
  const redis = getRedisConnection();
  const compData = await redis.get(`competition:${competitionId}`);

  if (!compData) return;

  const competition = typeof compData === 'string' ? JSON.parse(compData) : compData;

  if (!competition.market?.manifoldId) return;

  try {
    const manifoldResult = await manifoldPlaceBet({
      marketId: competition.market.manifoldId,
      outcome,
      amount,
    });

    if (manifoldResult.success && manifoldResult.data) {
      // Update the bet with Manifold ID (non-critical update)
      const bets = await redis.lrange(`competition:${competitionId}:bets`, 0, 50);
      for (let i = 0; i < bets.length; i++) {
        const bet = typeof bets[i] === 'string' ? JSON.parse(bets[i]) : bets[i];
        if (bet.id === localBetId) {
          bet.manifoldBetId = manifoldResult.data.id;
          await redis.lset(`competition:${competitionId}:bets`, i, JSON.stringify(bet));
          break;
        }
      }
    }
  } catch (error) {
    console.error('Manifold sync error:', error);
    // Non-critical - local bet is already recorded
  }
}

// Exportar con middleware de autenticación
export default withAuth(handler);
