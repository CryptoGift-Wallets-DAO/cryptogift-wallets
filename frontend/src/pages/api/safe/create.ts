/**
 * API: Create New Safe
 * POST /api/safe/create
 *
 * Creates a new Gnosis Safe for competition fund custody
 * Returns the predicted Safe address before deployment
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { predictSafeAddress } from '../../../competencias/lib/safeClient';

interface CreateSafeRequest {
  owners: string[];
  threshold: number;
  saltNonce?: string;
  competitionId?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { owners, threshold, saltNonce, competitionId } = req.body as CreateSafeRequest;

  // Validate owners
  if (!owners || !Array.isArray(owners) || owners.length === 0) {
    return res.status(400).json({ error: 'At least one owner is required' });
  }

  // Validate all owner addresses
  for (const owner of owners) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(owner)) {
      return res.status(400).json({ error: `Invalid owner address: ${owner}` });
    }
  }

  // Validate threshold
  if (typeof threshold !== 'number' || threshold < 1 || threshold > owners.length) {
    return res.status(400).json({
      error: `Threshold must be between 1 and ${owners.length}`,
    });
  }

  try {
    // Generate a unique salt nonce if not provided
    const finalSaltNonce = saltNonce || `${Date.now()}-${competitionId || 'competition'}`;

    // Predict the Safe address (counterfactual deployment)
    const predictedAddress = await predictSafeAddress({
      owners,
      threshold,
      saltNonce: finalSaltNonce,
    });

    return res.status(200).json({
      success: true,
      data: {
        predictedAddress,
        owners,
        threshold,
        saltNonce: finalSaltNonce,
        chainId: 8453, // Base Mainnet
        instructions: {
          message: 'Safe address predicted. Deploy by sending first transaction.',
          steps: [
            '1. Users can send funds to this address before deployment',
            '2. First owner to propose a transaction will trigger deployment',
            '3. Use Safe SDK on frontend with user wallet to deploy',
          ],
        },
        deploymentInfo: {
          network: 'Base Mainnet',
          singleton: '0xfb1bffC9d739B8D520DaF37dF666da4C687191EA', // SafeL2 v1.3.0
          proxyFactory: '0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC', // ProxyFactory v1.3.0
        },
      },
    });
  } catch (error) {
    console.error('Create Safe API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to predict Safe address',
    });
  }
}
