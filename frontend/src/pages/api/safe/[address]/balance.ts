/**
 * API: Safe Balance
 * GET /api/safe/[address]/balance
 *
 * Returns ETH and ERC20 token balances for a Safe
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSafeBalance } from '../../../../competencias/lib/safeClient';

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
    const result = await getSafeBalance(address);

    if (!result.success) {
      const errorObj = typeof result.error === 'string'
        ? { message: result.error, code: 'UNKNOWN_ERROR' }
        : result.error;
      return res.status(500).json({
        error: errorObj?.message || 'Failed to fetch balance',
        code: errorObj?.code,
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Safe balance API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
