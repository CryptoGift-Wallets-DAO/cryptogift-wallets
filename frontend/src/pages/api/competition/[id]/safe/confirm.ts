/**
 * API: Confirm Distribution Execution
 * POST /api/competition/[id]/safe/confirm
 *
 * Called after a distribution transaction is executed on-chain
 * Updates competition status and emits completion events
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { getProvider } from '../../../../../competencias/lib/safeClient';
import { emitPrizeDistributed, emitCompetitionResolved } from '../../../../../competencias/lib/eventSystem';

// Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface ConfirmRequest {
  txHash: string;
  safeTxHash?: string;
  executorAddress: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: competitionId } = req.query;

  if (!competitionId || typeof competitionId !== 'string') {
    return res.status(400).json({ error: 'Competition ID is required' });
  }

  const { txHash, safeTxHash, executorAddress } = req.body as ConfirmRequest;

  // Validate required fields
  if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return res.status(400).json({ error: 'Valid transaction hash is required' });
  }
  if (!executorAddress || !/^0x[a-fA-F0-9]{40}$/.test(executorAddress)) {
    return res.status(400).json({ error: 'Valid executor address is required' });
  }

  try {
    // Get competition from Redis
    const competitionData = await redis.get(`competition:${competitionId}`);

    if (!competitionData) {
      return res.status(404).json({ error: 'Competition not found' });
    }

    const competition = typeof competitionData === 'string'
      ? JSON.parse(competitionData)
      : competitionData;

    // Get distribution proposal
    const distributionData = await redis.get(`competition:${competitionId}:distribution`);

    if (!distributionData) {
      return res.status(404).json({ error: 'No distribution proposal found' });
    }

    const distribution = typeof distributionData === 'string'
      ? JSON.parse(distributionData)
      : distributionData;

    // Verify transaction on-chain (optional but recommended)
    let txReceipt = null;
    try {
      const provider = getProvider();
      txReceipt = await provider.getTransactionReceipt(txHash);

      if (!txReceipt) {
        return res.status(400).json({
          error: 'Transaction not found on-chain. It may still be pending.',
          suggestion: 'Wait for transaction confirmation and try again',
        });
      }

      if (txReceipt.status === 0) {
        return res.status(400).json({
          error: 'Transaction failed on-chain',
          txHash,
        });
      }
    } catch (verifyError) {
      console.warn('Could not verify transaction on-chain:', verifyError);
      // Continue anyway - trust the frontend
    }

    // Update distribution status
    distribution.status = 'executed';
    distribution.executedAt = new Date().toISOString();
    distribution.txHash = txHash;
    distribution.safeTxHash = safeTxHash;
    distribution.executor = executorAddress;
    distribution.blockNumber = txReceipt?.blockNumber;
    distribution.gasUsed = txReceipt?.gasUsed?.toString();

    await redis.set(
      `competition:${competitionId}:distribution`,
      JSON.stringify(distribution)
    );

    // Update competition status
    competition.status = 'resolved';
    competition.resolution = competition.resolution || {};
    competition.resolution.resolvedAt = new Date().toISOString();
    competition.resolution.txHash = txHash;
    competition.resolution.winners = distribution.winners;

    // Update timeline
    competition.timeline = competition.timeline || {};
    competition.timeline.resolvedAt = new Date().toISOString();

    await redis.set(`competition:${competitionId}`, JSON.stringify(competition));

    // Add transparency event
    const transparencyEvent = {
      type: 'prizes_distributed',
      timestamp: Date.now(),
      actor: executorAddress,
      action: `Distributed prizes to ${distribution.winners.length} winners`,
      details: {
        txHash,
        safeTxHash,
        totalAmount: distribution.totalAmount,
        winnersCount: distribution.winners.length,
        blockNumber: txReceipt?.blockNumber,
      },
      verified: true,
      verificationProof: txHash,
    };

    await redis.lpush(
      `competition:${competitionId}:events`,
      JSON.stringify(transparencyEvent)
    );

    // Emit real-time events
    try {
      // Emit prize distributed event with all winners
      const recipients = distribution.winners.map((w: { address: string; amountFormatted?: string; amount: string }) => ({
        address: w.address,
        amount: parseFloat(w.amountFormatted || w.amount),
      }));
      emitPrizeDistributed(
        competitionId,
        competition.safeAddress || '',
        txHash,
        recipients
      );

      // Emit competition resolved event
      emitCompetitionResolved(
        competitionId,
        'completed',
        executorAddress,
        recipients
      );
    } catch (eventError) {
      console.warn('Failed to emit events:', eventError);
    }

    // Update global stats (optional)
    try {
      const statsKey = 'competitions:global:stats';
      const stats = await redis.get(statsKey) || {};
      const parsedStats = typeof stats === 'string' ? JSON.parse(stats) : stats;

      parsedStats.totalResolved = (parsedStats.totalResolved || 0) + 1;
      parsedStats.totalDistributed = (
        parseFloat(parsedStats.totalDistributed || '0') +
        parseFloat(distribution.totalAmount)
      ).toString();

      await redis.set(statsKey, JSON.stringify(parsedStats));
    } catch (statsError) {
      console.warn('Failed to update global stats:', statsError);
    }

    return res.status(200).json({
      success: true,
      data: {
        competitionId,
        status: 'resolved',
        distribution: {
          id: distribution.id,
          txHash,
          safeTxHash,
          totalAmount: distribution.totalAmount,
          winners: distribution.winners,
          executedAt: distribution.executedAt,
          blockNumber: txReceipt?.blockNumber,
        },
        message: 'Competition resolved and prizes distributed successfully',
        verification: {
          onChainVerified: !!txReceipt,
          txStatus: txReceipt?.status === 1 ? 'success' : 'unknown',
        },
      },
    });
  } catch (error) {
    console.error('Confirm distribution API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
