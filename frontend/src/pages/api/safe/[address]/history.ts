/**
 * API: Safe History
 * GET /api/safe/[address]/history
 *
 * Returns the complete transaction history for a Gnosis Safe
 * Including executed transactions, module transactions, and settings changes
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import SafeApiKit from '@safe-global/api-kit';
import { getSafeInfo } from '../../../../competencias/lib/safeClient';

// Safe Transaction Service URL for Base Mainnet
const SAFE_TX_SERVICE_URL = 'https://safe-transaction-base.safe.global';
const CHAIN_ID = 8453n;

interface HistoryEntry {
  type: 'transaction' | 'module' | 'owner_change' | 'threshold_change' | 'creation';
  timestamp: string;
  transactionHash?: string;
  safeTxHash?: string;
  details: Record<string, unknown>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;
  const limit = parseInt(req.query.limit as string || '50', 10);

  // Validate Safe address
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Safe address is required' });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid address format' });
  }

  // Validate limit
  if (limit < 1 || limit > 100) {
    return res.status(400).json({ error: 'Limit must be between 1 and 100' });
  }

  try {
    // First verify the Safe exists
    const safeInfoResult = await getSafeInfo(address);
    if (!safeInfoResult.success || !safeInfoResult.data) {
      return res.status(404).json({
        error: 'Safe not found',
        code: 'SAFE_NOT_FOUND',
      });
    }

    // Initialize Safe API Kit
    const apiKit = new SafeApiKit({
      chainId: CHAIN_ID,
      txServiceUrl: SAFE_TX_SERVICE_URL,
    });

    // Get all transactions (this includes executed, module transactions, etc.)
    const allTxs = await apiKit.getAllTransactions(address, {
      executed: true,
    });

    const history: HistoryEntry[] = [];

    // Process transactions
    for (const tx of allTxs.results.slice(0, limit)) {
      // Determine transaction type based on available data
      if ('safeTxHash' in tx && tx.safeTxHash) {
        // Multisig transaction
        const multisigTx = tx as {
          safeTxHash: string;
          to?: string;
          value?: string;
          data?: string;
          executionDate?: string;
          submissionDate?: string;
          transactionHash?: string;
          isExecuted?: boolean;
        };

        history.push({
          type: 'transaction',
          timestamp: multisigTx.executionDate || multisigTx.submissionDate || '',
          transactionHash: multisigTx.transactionHash || undefined,
          safeTxHash: multisigTx.safeTxHash,
          details: {
            to: multisigTx.to,
            value: multisigTx.value,
            dataSize: multisigTx.data ? (multisigTx.data.length - 2) / 2 : 0, // bytes
            isExecuted: multisigTx.isExecuted,
          },
        });
      } else if ('txType' in tx) {
        // Module transaction or other type
        const typedTx = tx as {
          txType?: string;
          executionDate?: string;
          transactionHash?: string;
          module?: string;
          to?: string;
          value?: string;
        };

        if (typedTx.txType === 'MODULE_TRANSACTION') {
          history.push({
            type: 'module',
            timestamp: typedTx.executionDate || '',
            transactionHash: typedTx.transactionHash || undefined,
            details: {
              module: typedTx.module,
              to: typedTx.to,
              value: typedTx.value,
            },
          });
        }
      }
    }

    // Sort by timestamp descending (most recent first)
    history.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });

    return res.status(200).json({
      success: true,
      data: {
        safeAddress: address,
        history,
        totalCount: history.length,
        limit,
      },
    });
  } catch (error) {
    console.error('History API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch history',
      code: 'HISTORY_ERROR',
    });
  }
}
