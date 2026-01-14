/**
 * API: Competition Deposit
 * POST /api/competition/[id]/safe/deposit
 *
 * Records a deposit to the competition Safe
 * The actual transfer happens on-chain via user's wallet
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { getSafeBalance } from '../../../../../competencias/lib/safeClient';
import { getEventEmitter, emitParticipantJoined } from '../../../../../competencias/lib/eventSystem';

// Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface DepositRequest {
  depositorAddress: string;
  amount: string;
  txHash: string;
  token?: string; // Optional: token address for ERC20, undefined for ETH
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

  const { depositorAddress, amount, txHash, token } = req.body as DepositRequest;

  // Validate required fields
  if (!depositorAddress || !/^0x[a-fA-F0-9]{40}$/.test(depositorAddress)) {
    return res.status(400).json({ error: 'Valid depositor address is required' });
  }
  if (!amount || isNaN(parseFloat(amount))) {
    return res.status(400).json({ error: 'Valid amount is required' });
  }
  if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return res.status(400).json({ error: 'Valid transaction hash is required' });
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

    // Check competition status
    if (competition.status === 'resolved' || competition.status === 'cancelled') {
      return res.status(400).json({ error: 'Competition is no longer accepting deposits' });
    }

    // Verify the Safe balance increased (optional verification)
    const balanceResult = await getSafeBalance(competition.safeAddress);
    const currentBalance = balanceResult.success ? balanceResult.data?.ethBalance : '0';

    // Record the deposit
    const deposit = {
      id: `deposit-${Date.now()}-${depositorAddress.slice(-6)}`,
      competitionId,
      depositor: depositorAddress,
      amount,
      token: token || 'ETH',
      txHash,
      timestamp: new Date().toISOString(),
      verified: false, // Will be verified by background job
    };

    // Add to deposits list
    await redis.lpush(`competition:${competitionId}:deposits`, JSON.stringify(deposit));

    // Update participant entry
    const participantKey = `competition:${competitionId}:participant:${depositorAddress}`;
    const existingParticipant = await redis.get(participantKey);

    if (existingParticipant) {
      // Update existing participant
      const participant = typeof existingParticipant === 'string'
        ? JSON.parse(existingParticipant)
        : existingParticipant;

      participant.deposits = participant.deposits || [];
      participant.deposits.push(deposit);
      participant.totalDeposited = (
        parseFloat(participant.totalDeposited || '0') + parseFloat(amount)
      ).toString();

      await redis.set(participantKey, JSON.stringify(participant));
    } else {
      // Create new participant
      const newParticipant = {
        address: depositorAddress,
        joinedAt: new Date().toISOString(),
        deposits: [deposit],
        totalDeposited: amount,
        status: 'active',
      };

      await redis.set(participantKey, JSON.stringify(newParticipant));

      // Add to participants set
      await redis.sadd(`competition:${competitionId}:participants`, depositorAddress);

      // Update participant count
      competition.participants = competition.participants || { current: 0 };
      competition.participants.current += 1;
      await redis.set(`competition:${competitionId}`, JSON.stringify(competition));

      // Emit participant joined event
      try {
        emitParticipantJoined(
          competitionId,
          depositorAddress,
          parseFloat(amount)
        );
      } catch (eventError) {
        console.warn('Failed to emit event:', eventError);
      }
    }

    // Add transparency event
    const transparencyEvent = {
      type: 'deposit_received',
      timestamp: Date.now(),
      actor: depositorAddress,
      action: `Deposited ${amount} ${token || 'ETH'}`,
      details: {
        amount,
        token: token || 'ETH',
        txHash,
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
        deposit,
        message: 'Deposit recorded successfully',
        safeAddress: competition.safeAddress,
        currentSafeBalance: currentBalance,
        participantStatus: existingParticipant ? 'updated' : 'joined',
      },
    });
  } catch (error) {
    console.error('Deposit API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
