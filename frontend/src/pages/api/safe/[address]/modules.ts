/**
 * API: Safe Modules
 * GET /api/safe/[address]/modules
 *
 * Returns the list of enabled modules on a Gnosis Safe
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSafeInfo } from '../../../../competencias/lib/safeClient';

// Known module types and their contracts on Base Mainnet
const KNOWN_MODULES: Record<string, { type: string; name: string }> = {
  // Zodiac modules - if deployed
  '0x0000000000000000000000000000000000000000': { type: 'unknown', name: 'Unknown Module' },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;

  // Validate Safe address
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Safe address is required' });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid address format' });
  }

  try {
    // Get Safe info which includes modules
    const safeInfoResult = await getSafeInfo(address);

    if (!safeInfoResult.success || !safeInfoResult.data) {
      return res.status(404).json({
        error: 'Safe not found',
        code: 'SAFE_NOT_FOUND',
      });
    }

    const safeInfo = safeInfoResult.data;
    const moduleAddresses = safeInfo.modules || [];

    // Map module addresses to module info
    const modules = moduleAddresses.map((moduleAddress) => {
      const knownModule = KNOWN_MODULES[moduleAddress.toLowerCase()];
      return {
        address: moduleAddress,
        type: knownModule?.type || 'custom',
        name: knownModule?.name || 'Custom Module',
        enabled: true,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        safeAddress: address,
        modules,
        totalModules: modules.length,
        guard: safeInfo.guard || null,
      },
    });
  } catch (error) {
    console.error('Modules API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch modules',
      code: 'MODULES_ERROR',
    });
  }
}
