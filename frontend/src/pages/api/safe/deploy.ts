/**
 * API: Deploy Safe
 * POST /api/safe/deploy
 *
 * Verifies that a Safe has been deployed at the predicted address
 * and updates the database with deployment confirmation
 *
 * Note: Actual deployment happens on the frontend using the Safe SDK
 * with the user's wallet. This endpoint confirms the deployment and
 * links the Safe to the competition.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { ethers } from 'ethers';
import { getSafeInfo } from '../../../competencias/lib/safeClient';

// Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Base Mainnet RPC
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org';
const CHAIN_ID = 8453;

interface DeployRequest {
  safeAddress: string;
  competitionId?: string;
  deploymentTxHash?: string;
  owners: string[];
  threshold: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { safeAddress, competitionId, deploymentTxHash, owners, threshold } = req.body as DeployRequest;

  // Validate Safe address
  if (!safeAddress || typeof safeAddress !== 'string') {
    return res.status(400).json({ error: 'Safe address is required' });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(safeAddress)) {
    return res.status(400).json({ error: 'Invalid Safe address format' });
  }

  // Validate owners if provided
  if (owners) {
    if (!Array.isArray(owners) || owners.length === 0) {
      return res.status(400).json({ error: 'Owners must be a non-empty array' });
    }
    for (const owner of owners) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(owner)) {
        return res.status(400).json({ error: `Invalid owner address: ${owner}` });
      }
    }
  }

  try {
    // Verify the Safe exists on-chain by calling getSafeInfo
    // This will fail if the Safe hasn't been deployed
    const safeInfoResult = await getSafeInfo(safeAddress);

    if (!safeInfoResult.success || !safeInfoResult.data) {
      // Safe not found on Transaction Service, check directly on-chain
      const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
      const code = await provider.getCode(safeAddress);

      if (code === '0x') {
        return res.status(400).json({
          error: 'Safe not deployed yet',
          code: 'NOT_DEPLOYED',
          message: 'The Safe has not been deployed at this address. Please complete the deployment transaction.',
          safeAddress,
        });
      }

      // Safe exists but not indexed yet in Transaction Service
      // This is normal for newly deployed Safes
      return res.status(200).json({
        success: true,
        data: {
          safeAddress,
          isDeployed: true,
          isIndexed: false,
          message: 'Safe deployed but not yet indexed by Transaction Service. This may take a few minutes.',
          chainId: CHAIN_ID,
        },
      });
    }

    const safeInfo = safeInfoResult.data;

    // Verify owners if provided
    if (owners && owners.length > 0) {
      const normalizedExpected = owners.map((o) => o.toLowerCase()).sort();
      const normalizedActual = safeInfo.owners.map((o) => o.toLowerCase()).sort();

      if (JSON.stringify(normalizedExpected) !== JSON.stringify(normalizedActual)) {
        return res.status(400).json({
          error: 'Owner mismatch',
          code: 'OWNER_MISMATCH',
          expected: owners,
          actual: safeInfo.owners,
        });
      }
    }

    // Verify threshold if provided
    if (threshold !== undefined && safeInfo.threshold !== threshold) {
      return res.status(400).json({
        error: 'Threshold mismatch',
        code: 'THRESHOLD_MISMATCH',
        expected: threshold,
        actual: safeInfo.threshold,
      });
    }

    // If competition ID provided, link the Safe to the competition
    if (competitionId) {
      const competitionKey = `competition:${competitionId}`;
      const competitionData = await redis.get(competitionKey);

      if (competitionData) {
        const competition = typeof competitionData === 'string'
          ? JSON.parse(competitionData)
          : competitionData;

        // Update competition with Safe address
        competition.safeAddress = safeAddress;
        competition.custody = {
          safeAddress,
          owners: safeInfo.owners,
          threshold: safeInfo.threshold,
          deployed: true,
          deployedAt: new Date().toISOString(),
          deploymentTxHash: deploymentTxHash || null,
        };

        // Update status if it was pending
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
          actor: 'system',
          action: 'Safe deployed and linked to competition',
          details: {
            safeAddress,
            threshold: safeInfo.threshold,
            owners: safeInfo.owners,
            deploymentTxHash,
          },
          verified: true,
        });

        // Save updated competition
        await redis.set(competitionKey, JSON.stringify(competition));

        // Add to Safe index
        await redis.set(`safe:${safeAddress}:competition`, competitionId);
      }
    }

    // Store Safe info in Redis for quick access
    await redis.set(
      `safe:${safeAddress}:info`,
      JSON.stringify({
        address: safeAddress,
        chainId: CHAIN_ID,
        owners: safeInfo.owners,
        threshold: safeInfo.threshold,
        deployed: true,
        deployedAt: new Date().toISOString(),
        deploymentTxHash: deploymentTxHash || null,
        competitionId: competitionId || null,
      }),
      { ex: 86400 * 90 } // 90 days TTL
    );

    return res.status(200).json({
      success: true,
      data: {
        safeAddress,
        isDeployed: true,
        isIndexed: true,
        chainId: CHAIN_ID,
        safeInfo: {
          owners: safeInfo.owners,
          threshold: safeInfo.threshold,
          nonce: safeInfo.nonce,
          version: safeInfo.version,
          modules: safeInfo.modules,
          guard: safeInfo.guard,
        },
        competitionId: competitionId || null,
        message: 'Safe deployment confirmed and linked successfully',
      },
    });
  } catch (error) {
    console.error('Deploy verification API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to verify deployment',
      code: 'DEPLOY_ERROR',
    });
  }
}
