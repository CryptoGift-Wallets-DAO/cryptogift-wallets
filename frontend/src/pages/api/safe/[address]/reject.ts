/**
 * API: Reject Safe Transaction
 * POST /api/safe/[address]/reject
 *
 * Creates a rejection transaction with the same nonce as the original
 * This allows the Safe to skip a pending transaction
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
  const { safeTxHash, rejectorAddress, signature } = req.body;

  // Validate Safe address
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Safe address is required' });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid Safe address format' });
  }

  // Validate transaction hash
  if (!safeTxHash || typeof safeTxHash !== 'string') {
    return res.status(400).json({ error: 'Safe transaction hash is required' });
  }
  if (!/^0x[a-fA-F0-9]{64}$/.test(safeTxHash)) {
    return res.status(400).json({ error: 'Invalid transaction hash format' });
  }

  // Validate rejector address
  if (!rejectorAddress || typeof rejectorAddress !== 'string') {
    return res.status(400).json({ error: 'Rejector address is required' });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(rejectorAddress)) {
    return res.status(400).json({ error: 'Invalid rejector address format' });
  }

  try {
    // Get Safe info to verify rejector is an owner
    const safeInfoResult = await getSafeInfo(address);
    if (!safeInfoResult.success || !safeInfoResult.data) {
      return res.status(404).json({
        error: 'Safe not found',
        code: 'SAFE_NOT_FOUND',
      });
    }

    const safeInfo = safeInfoResult.data;
    const isOwner = safeInfo.owners.some(
      (owner) => owner.toLowerCase() === rejectorAddress.toLowerCase()
    );

    if (!isOwner) {
      return res.status(403).json({
        error: 'Rejector is not an owner of this Safe',
        code: 'NOT_OWNER',
      });
    }

    // Get the existing transaction
    const txResult = await getTransaction(safeTxHash);
    if (!txResult.success || !txResult.data) {
      return res.status(404).json({
        error: 'Transaction not found',
        code: 'TX_NOT_FOUND',
      });
    }

    const tx = txResult.data;

    // Check if already executed
    if (tx.isExecuted) {
      return res.status(400).json({
        error: 'Transaction has already been executed',
        code: 'ALREADY_EXECUTED',
      });
    }

    // To reject a transaction, the frontend needs to:
    // 1. Create a new transaction with the same nonce
    // 2. Send 0 ETH to the Safe address itself
    // 3. Collect signatures and execute it before the original
    //
    // This endpoint returns the rejection transaction parameters
    // The actual signing and proposal happens on the frontend

    const rejectionTxData = {
      to: address, // Send to Safe itself
      value: '0',
      data: '0x', // Empty data
      operation: 0, // CALL
      nonce: tx.nonce,
    };

    return res.status(200).json({
      success: true,
      data: {
        originalTxHash: safeTxHash,
        rejectionTransaction: rejectionTxData,
        message: 'Use this data to create and sign a rejection transaction on the frontend',
        instructions: [
          '1. Create a Safe transaction with the provided data using the same nonce',
          '2. Sign it with the Safe SDK',
          '3. Propose it to the Safe Transaction Service',
          '4. Collect enough signatures (threshold)',
          '5. Execute the rejection transaction before the original',
        ],
        safeInfo: {
          threshold: safeInfo.threshold,
          nonce: tx.nonce,
        },
      },
    });
  } catch (error) {
    console.error('Reject transaction API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to prepare rejection',
      code: 'REJECT_ERROR',
    });
  }
}
