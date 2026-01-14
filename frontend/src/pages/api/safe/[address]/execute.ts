/**
 * API: Execute Safe Transaction
 * POST /api/safe/[address]/execute
 *
 * Provides information for executing a transaction that has enough signatures
 * Actual execution happens on the frontend with user's wallet
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getTransaction, getSafeInfo } from '../../../../competencias/lib/safeClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;
  const { safeTxHash } = req.body;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Safe address is required' });
  }
  if (!safeTxHash || typeof safeTxHash !== 'string') {
    return res.status(400).json({ error: 'Safe transaction hash is required' });
  }

  // Validate formats
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid address format' });
  }
  if (!/^0x[a-fA-F0-9]{64}$/.test(safeTxHash)) {
    return res.status(400).json({ error: 'Invalid transaction hash format' });
  }

  try {
    // Get the transaction
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
        txHash: 'Check transaction service for execution hash',
      });
    }

    // Check if we have enough signatures
    const confirmationsCount = tx.confirmations.length;
    if (confirmationsCount < tx.confirmationsRequired) {
      return res.status(400).json({
        error: `Insufficient signatures. Need ${tx.confirmationsRequired}, have ${confirmationsCount}`,
        currentConfirmations: confirmationsCount,
        confirmationsRequired: tx.confirmationsRequired,
      });
    }

    // Get Safe info for additional context
    const safeInfoResult = await getSafeInfo(address);

    // Return execution data for frontend
    return res.status(200).json({
      success: true,
      data: {
        message: 'Transaction ready for execution',
        safeTxHash,
        safeAddress: address,
        transaction: {
          to: tx.to,
          value: tx.value,
          data: tx.data,
          operation: tx.operation,
          nonce: tx.nonce,
        },
        signatures: tx.confirmations.map((conf) => ({
          signer: conf.owner,
          signature: conf.signature,
        })),
        confirmations: confirmationsCount,
        confirmationsRequired: tx.confirmationsRequired,
        safeInfo: safeInfoResult.success ? safeInfoResult.data : null,
        instructions: 'Use Safe SDK executeTransaction() on frontend with user wallet',
      },
    });
  } catch (error) {
    console.error('Execute API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
