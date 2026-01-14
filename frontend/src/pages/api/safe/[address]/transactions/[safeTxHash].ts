/**
 * API: Single Safe Transaction
 * GET /api/safe/[address]/transactions/[safeTxHash] - Get transaction details
 * POST /api/safe/[address]/transactions/[safeTxHash] - Add signature to transaction
 *
 * Handles individual transaction operations
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getTransaction } from '../../../../../competencias/lib/safeClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { address, safeTxHash } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Safe address is required' });
  }
  if (!safeTxHash || typeof safeTxHash !== 'string') {
    return res.status(400).json({ error: 'Safe transaction hash is required' });
  }

  // Validate address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid address format' });
  }

  // Validate safeTxHash format (should be 66 characters: 0x + 64 hex chars)
  if (!/^0x[a-fA-F0-9]{64}$/.test(safeTxHash)) {
    return res.status(400).json({ error: 'Invalid transaction hash format' });
  }

  if (req.method === 'GET') {
    return handleGetTransaction(req, res, safeTxHash);
  } else if (req.method === 'POST') {
    return handleAddSignature(req, res, address, safeTxHash);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET: Get transaction details
 */
async function handleGetTransaction(
  req: NextApiRequest,
  res: NextApiResponse,
  safeTxHash: string
) {
  try {
    const result = await getTransaction(safeTxHash);

    if (!result.success) {
      const errorObj = typeof result.error === 'string'
        ? { message: result.error, code: 'UNKNOWN_ERROR' }
        : result.error;
      return res.status(404).json({
        error: errorObj?.message || 'Transaction not found',
        code: errorObj?.code,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        transaction: result.data,
      },
    });
  } catch (error) {
    console.error('Get transaction API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * POST: Add signature to a pending transaction
 * This is informational - actual signing happens on frontend
 */
async function handleAddSignature(
  req: NextApiRequest,
  res: NextApiResponse,
  safeAddress: string,
  safeTxHash: string
) {
  const { signerAddress } = req.body;

  if (!signerAddress || typeof signerAddress !== 'string') {
    return res.status(400).json({ error: 'Signer address is required' });
  }

  // Validate signer address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(signerAddress)) {
    return res.status(400).json({ error: 'Invalid signer address format' });
  }

  try {
    // Get the transaction to verify it exists and check current state
    const txResult = await getTransaction(safeTxHash);

    if (!txResult.success || !txResult.data) {
      return res.status(404).json({
        error: 'Transaction not found',
      });
    }

    const tx = txResult.data;

    // Check if already executed
    if (tx.isExecuted) {
      return res.status(400).json({
        error: 'Transaction has already been executed',
      });
    }

    // Check if already signed by this address
    const alreadySigned = tx.confirmations.some(
      (conf) => conf.owner.toLowerCase() === signerAddress.toLowerCase()
    );

    if (alreadySigned) {
      return res.status(400).json({
        error: 'Transaction already signed by this address',
      });
    }

    // Return instructions for frontend signing
    return res.status(200).json({
      success: true,
      data: {
        message: 'Sign this transaction using Safe SDK on frontend',
        safeTxHash,
        safeAddress,
        transaction: {
          to: tx.to,
          value: tx.value,
          data: tx.data,
          operation: tx.operation,
          nonce: tx.nonce,
        },
        currentConfirmations: tx.confirmations.length,
        confirmationsRequired: tx.confirmationsRequired,
        remainingSignatures: tx.confirmationsRequired - tx.confirmations.length,
      },
    });
  } catch (error) {
    console.error('Add signature API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
