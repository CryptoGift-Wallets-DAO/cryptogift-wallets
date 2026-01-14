/**
 * API: Safe Info
 * GET /api/safe/[address]
 *
 * Returns information about a Gnosis Safe including owners, threshold, modules, and guards
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSafeInfo, getSafeBalance } from '../../../../competencias/lib/safeClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Safe address is required' });
  }

  // Validate address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid address format' });
  }

  try {
    // Fetch Safe info and balance in parallel
    const [infoResult, balanceResult] = await Promise.all([
      getSafeInfo(address),
      getSafeBalance(address),
    ]);

    if (!infoResult.success) {
      const errorObj = typeof infoResult.error === 'string'
        ? { message: infoResult.error, code: 'UNKNOWN_ERROR' }
        : infoResult.error;
      return res.status(404).json({
        error: errorObj?.message || 'Safe not found',
        code: errorObj?.code,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        safe: {
          ...infoResult.data,
          balance: balanceResult.success ? balanceResult.data : null,
        },
      },
    });
  } catch (error) {
    console.error('Safe info API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
