/**
 * API: Competition Prize Distribution
 * POST /api/competition/[id]/safe/distribute
 *
 * Prepares prize distribution transactions for a resolved competition
 * Returns transaction data for frontend execution via Safe SDK
 * REQUIERE AUTENTICACIÓN SIWE
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { ethers } from 'ethers';
import {
  getSafeInfo,
  getSafeBalance,
  buildPrizeDistributionTransactions,
  type PrizeDistribution,
} from '../../../../../competencias/lib/safeClient';
import { emitPrizeDistributed } from '../../../../../competencias/lib/eventSystem';
import { withAuth, getAuthenticatedAddress } from '../../../../../competencias/lib/authMiddleware';

// Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface DistributeRequest {
  winners: Array<{
    address: string;
    amount: string;
    position: number;
    token?: string;
  }>;
  resolution?: {
    method: string;
    proof?: string;
    timestamp?: number;
  };
  // NOTA: proposerAddress viene del token JWT autenticado
}

async function handler(
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

  // Obtener dirección autenticada del token JWT (seguro, no manipulable)
  const proposerAddress = getAuthenticatedAddress(req);

  const { winners, resolution } = req.body as DistributeRequest;

  // Validate required fields
  if (!winners || !Array.isArray(winners) || winners.length === 0) {
    return res.status(400).json({ error: 'At least one winner is required' });
  }
  // proposerAddress ya viene validado del JWT

  // Validate winners
  for (const winner of winners) {
    if (!winner.address || !/^0x[a-fA-F0-9]{40}$/.test(winner.address)) {
      return res.status(400).json({ error: `Invalid winner address: ${winner.address}` });
    }
    if (!winner.amount || isNaN(parseFloat(winner.amount))) {
      return res.status(400).json({ error: `Invalid amount for winner ${winner.address}` });
    }
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

    // Check if competition has a Safe address
    if (!competition.safeAddress) {
      return res.status(400).json({ error: 'Competition does not have a Safe configured' });
    }

    const safeAddress = competition.safeAddress;

    // Verify proposer is an owner of the Safe
    const safeInfoResult = await getSafeInfo(safeAddress);
    if (!safeInfoResult.success || !safeInfoResult.data) {
      return res.status(500).json({ error: 'Failed to fetch Safe info' });
    }

    const safeInfo = safeInfoResult.data;
    const isOwner = safeInfo.owners.some(
      (owner) => owner.toLowerCase() === proposerAddress.toLowerCase()
    );

    if (!isOwner) {
      return res.status(403).json({ error: 'Proposer is not an owner of the Safe' });
    }

    // Get Safe balance to verify sufficient funds
    const balanceResult = await getSafeBalance(safeAddress);
    if (!balanceResult.success || !balanceResult.data) {
      return res.status(500).json({ error: 'Failed to fetch Safe balance' });
    }

    const safeBalanceWei = ethers.parseEther(balanceResult.data.ethBalance);
    const totalDistributionWei = winners.reduce(
      (sum, w) => sum + BigInt(w.amount),
      0n
    );

    if (safeBalanceWei < totalDistributionWei) {
      return res.status(400).json({
        error: 'Insufficient Safe balance for distribution',
        required: ethers.formatEther(totalDistributionWei),
        available: balanceResult.data.ethBalance,
      });
    }

    // Verify all winners are participants (optional but recommended)
    const participantsSet = await redis.smembers(`competition:${competitionId}:participants`);
    const nonParticipants = winners.filter(
      (w) => !participantsSet.some(
        (p) => p.toLowerCase() === w.address.toLowerCase()
      )
    );

    if (nonParticipants.length > 0) {
      // Warning but not blocking - some competitions might allow external winners
      console.warn(
        `Distribution includes non-participants: ${nonParticipants.map((w) => w.address).join(', ')}`
      );
    }

    // Build distribution transactions
    const distributions: PrizeDistribution[] = winners.map((w) => ({
      recipient: w.address,
      amount: w.amount,
      token: w.token,
    }));

    const transactions = buildPrizeDistributionTransactions(distributions);

    // Calculate platform fee (if applicable)
    const platformFeePercent = competition.prizePool?.platformFee || 2.5;
    const platformFeeAmount = (totalDistributionWei * BigInt(Math.floor(platformFeePercent * 100))) / 10000n;

    // Record the distribution proposal
    const distributionProposal = {
      id: `dist-${Date.now()}`,
      competitionId,
      proposer: proposerAddress,
      winners: winners.map((w) => ({
        ...w,
        amountFormatted: ethers.formatEther(BigInt(w.amount)),
      })),
      totalAmount: ethers.formatEther(totalDistributionWei),
      platformFee: ethers.formatEther(platformFeeAmount),
      resolution: resolution || {
        method: 'manual',
        timestamp: Date.now(),
      },
      status: 'proposed',
      createdAt: new Date().toISOString(),
    };

    // Store proposal in Redis
    await redis.set(
      `competition:${competitionId}:distribution`,
      JSON.stringify(distributionProposal)
    );

    // Add transparency event
    const transparencyEvent = {
      type: 'distribution_proposed',
      timestamp: Date.now(),
      actor: proposerAddress,
      action: `Proposed prize distribution for ${winners.length} winners`,
      details: {
        totalAmount: ethers.formatEther(totalDistributionWei),
        winnersCount: winners.length,
        positions: winners.map((w) => w.position),
      },
      verified: false,
    };

    await redis.lpush(
      `competition:${competitionId}:events`,
      JSON.stringify(transparencyEvent)
    );

    return res.status(200).json({
      success: true,
      data: {
        distributionId: distributionProposal.id,
        safeAddress,
        transactions: transactions.map((tx, index) => ({
          index,
          to: tx.to,
          value: tx.value,
          data: tx.data,
          operation: tx.operation,
          recipient: winners[index].address,
          amount: ethers.formatEther(BigInt(winners[index].amount)),
        })),
        totalTransactions: transactions.length,
        totalDistribution: ethers.formatEther(totalDistributionWei),
        safeInfo: {
          threshold: safeInfo.threshold,
          owners: safeInfo.owners,
          currentBalance: balanceResult.data.ethBalance,
        },
        instructions: {
          steps: [
            '1. Use Safe SDK to propose multiSend transaction on frontend',
            '2. First proposer signs automatically',
            `3. Collect ${safeInfo.threshold} total signatures from owners`,
            '4. Execute transaction when threshold reached',
            '5. Call POST /api/competition/[id]/safe/distribute/confirm with txHash',
          ],
          multiSendAddress: '0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526',
          note: 'Use proposeMultiSendTransaction() from safeClient.ts',
        },
      },
    });
  } catch (error) {
    console.error('Distribute API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

// Exportar con middleware de autenticación
export default withAuth(handler);
