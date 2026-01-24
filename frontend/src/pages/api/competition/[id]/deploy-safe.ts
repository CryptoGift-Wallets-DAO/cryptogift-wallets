/**
 * API: Deploy Competition Safe
 * POST /api/competition/[id]/deploy-safe
 *
 * Confirms that a Safe has been deployed for a competition
 * and updates the competition state accordingly.
 *
 * This endpoint should be called by the frontend after successfully
 * deploying the Safe using the Safe SDK with the user's wallet.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { getSafeInfo } from '../../../../competencias/lib/safeClient';
import { withAuth, getAuthenticatedAddress } from '../../../../competencias/lib/authMiddleware';
import { ethers } from 'ethers';

// Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Base Mainnet RPC
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org';
const CHAIN_ID = 8453;

interface DeploySafeRequest {
  safeAddress: string;
  deploymentTxHash?: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: competitionId } = req.query;
  const { safeAddress, deploymentTxHash } = req.body as DeploySafeRequest;

  // Validate competition ID
  if (!competitionId || typeof competitionId !== 'string') {
    return res.status(400).json({ error: 'Competition ID is required' });
  }

  // Validate Safe address
  if (!safeAddress || typeof safeAddress !== 'string') {
    return res.status(400).json({ error: 'Safe address is required' });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(safeAddress)) {
    return res.status(400).json({ error: 'Invalid Safe address format' });
  }

  // Get authenticated user
  const userAddress = getAuthenticatedAddress(req);

  try {
    // Get competition from Redis
    const competitionKey = `competition:${competitionId}`;
    const competitionData = await redis.get(competitionKey);

    if (!competitionData) {
      return res.status(404).json({
        error: 'Competition not found',
        code: 'NOT_FOUND',
      });
    }

    const competition = typeof competitionData === 'string'
      ? JSON.parse(competitionData)
      : competitionData;

    // Verify the caller is the creator or an owner
    const isCreator = competition.creator?.address?.toLowerCase() === userAddress.toLowerCase();
    const isOwner = competition.custody?.owners?.some(
      (owner: string) => owner.toLowerCase() === userAddress.toLowerCase()
    );

    if (!isCreator && !isOwner) {
      return res.status(403).json({
        error: 'Only the creator or an owner can confirm Safe deployment',
        code: 'FORBIDDEN',
      });
    }

    // Verify the predicted Safe address matches
    if (competition.custody?.safeAddress !== safeAddress && competition.safeAddress !== safeAddress) {
      return res.status(400).json({
        error: 'Safe address does not match the predicted address',
        code: 'ADDRESS_MISMATCH',
        expected: competition.custody?.safeAddress || competition.safeAddress,
        received: safeAddress,
      });
    }

    // Check if Safe is already marked as deployed
    if (competition.custody?.deployed === true) {
      return res.status(400).json({
        error: 'Safe is already marked as deployed',
        code: 'ALREADY_DEPLOYED',
      });
    }

    // Verify the Safe exists on-chain
    const safeInfoResult = await getSafeInfo(safeAddress);

    if (!safeInfoResult.success || !safeInfoResult.data) {
      // Check directly on-chain if Transaction Service hasn't indexed yet
      const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
      const code = await provider.getCode(safeAddress);

      if (code === '0x') {
        return res.status(400).json({
          error: 'Safe not deployed yet. Please complete the deployment transaction.',
          code: 'NOT_DEPLOYED',
          safeAddress,
        });
      }

      // Safe exists but not indexed - this is acceptable for new deployments
      // Continue with confirmation
    }

    // Verify owners match if Safe info available
    if (safeInfoResult.success && safeInfoResult.data) {
      const safeInfo = safeInfoResult.data;
      const expectedOwners = competition.custody?.owners || [];

      if (expectedOwners.length > 0) {
        const normalizedExpected = expectedOwners.map((o: string) => o.toLowerCase()).sort();
        const normalizedActual = safeInfo.owners.map((o) => o.toLowerCase()).sort();

        if (JSON.stringify(normalizedExpected) !== JSON.stringify(normalizedActual)) {
          return res.status(400).json({
            error: 'Safe owners do not match the expected configuration',
            code: 'OWNER_MISMATCH',
            expected: expectedOwners,
            actual: safeInfo.owners,
          });
        }
      }
    }

    // Update competition with deployment confirmation
    competition.custody = {
      ...competition.custody,
      safeAddress,
      deployed: true,
      deployedAt: new Date().toISOString(),
      deploymentTxHash: deploymentTxHash || null,
      confirmedBy: userAddress,
    };

    // Update status from draft to pending if needed
    if (competition.status === 'draft') {
      competition.status = 'pending';
    }

    // Add transparency event
    if (!competition.transparency) {
      competition.transparency = { events: [] };
    }
    competition.transparency.events.push({
      type: 'safe_deployed',
      timestamp: Date.now(),
      actor: userAddress,
      action: 'Safe deployed and confirmed',
      details: {
        safeAddress,
        threshold: competition.custody?.threshold,
        owners: competition.custody?.owners,
        deploymentTxHash,
      },
      verified: true,
    });

    // Save updated competition
    await redis.set(competitionKey, JSON.stringify(competition));

    // Create index for Safe -> Competition lookup
    await redis.set(`safe:${safeAddress}:competition`, competitionId);

    // Store Safe info for quick access
    await redis.set(
      `safe:${safeAddress}:info`,
      JSON.stringify({
        address: safeAddress,
        chainId: CHAIN_ID,
        owners: competition.custody?.owners || [],
        threshold: competition.custody?.threshold || 1,
        deployed: true,
        deployedAt: new Date().toISOString(),
        deploymentTxHash: deploymentTxHash || null,
        competitionId,
      }),
      { ex: 86400 * 90 } // 90 days TTL
    );

    return res.status(200).json({
      success: true,
      data: {
        competitionId,
        safeAddress,
        isDeployed: true,
        chainId: CHAIN_ID,
        custody: competition.custody,
        status: competition.status,
        message: 'Safe deployment confirmed successfully. Competition is now ready for participants.',
      },
    });
  } catch (error) {
    console.error('Deploy Safe API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to confirm Safe deployment',
      code: 'DEPLOY_ERROR',
    });
  }
}

// Export with authentication middleware
export default withAuth(handler);
