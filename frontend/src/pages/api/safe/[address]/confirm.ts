/**
 * API: Confirm Safe Transaction
 * POST /api/safe/[address]/confirm
 *
 * Adds a signature to an existing pending transaction
 * The signature is verified and submitted to the Safe Transaction Service
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import SafeApiKit from '@safe-global/api-kit';
import { getTransaction, getSafeInfo } from '../../../../competencias/lib/safeClient';

// Safe Transaction Service URL for Base Mainnet
const SAFE_TX_SERVICE_URL = 'https://safe-transaction-base.safe.global';
const CHAIN_ID = 8453n;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;
  const { safeTxHash, signature, signerAddress } = req.body;

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

  // Validate signature
  if (!signature || typeof signature !== 'string') {
    return res.status(400).json({ error: 'Signature is required' });
  }

  // Validate signer address
  if (!signerAddress || typeof signerAddress !== 'string') {
    return res.status(400).json({ error: 'Signer address is required' });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(signerAddress)) {
    return res.status(400).json({ error: 'Invalid signer address format' });
  }

  try {
    // Get Safe info to verify signer is an owner
    const safeInfoResult = await getSafeInfo(address);
    if (!safeInfoResult.success || !safeInfoResult.data) {
      return res.status(404).json({
        error: 'Safe not found',
        code: 'SAFE_NOT_FOUND',
      });
    }

    const safeInfo = safeInfoResult.data;
    const isOwner = safeInfo.owners.some(
      (owner) => owner.toLowerCase() === signerAddress.toLowerCase()
    );

    if (!isOwner) {
      return res.status(403).json({
        error: 'Signer is not an owner of this Safe',
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

    // Check if already signed by this address
    const alreadySigned = tx.confirmations.some(
      (conf) => conf.owner.toLowerCase() === signerAddress.toLowerCase()
    );
    if (alreadySigned) {
      return res.status(400).json({
        error: 'Transaction already signed by this owner',
        code: 'ALREADY_SIGNED',
      });
    }

    // Initialize Safe API Kit
    const apiKit = new SafeApiKit({
      chainId: CHAIN_ID,
      txServiceUrl: SAFE_TX_SERVICE_URL,
    });

    // Submit the signature to the Safe Transaction Service
    await apiKit.confirmTransaction(safeTxHash, signature);

    // Get updated transaction to return new confirmation count
    const updatedTxResult = await getTransaction(safeTxHash);
    const updatedTx = updatedTxResult.success ? updatedTxResult.data : tx;

    const confirmationsCount = updatedTx?.confirmations.length || tx.confirmations.length + 1;
    const isReadyToExecute = confirmationsCount >= tx.confirmationsRequired;

    return res.status(200).json({
      success: true,
      data: {
        safeTxHash,
        confirmations: confirmationsCount,
        confirmationsRequired: tx.confirmationsRequired,
        isReadyToExecute,
        message: isReadyToExecute
          ? 'Transaction now has enough signatures and can be executed'
          : `Signature added. Need ${tx.confirmationsRequired - confirmationsCount} more signature(s)`,
      },
    });
  } catch (error) {
    console.error('Confirm transaction API error:', error);

    // Handle specific Safe API errors
    const errorMessage = error instanceof Error ? error.message : 'Failed to confirm transaction';

    if (errorMessage.includes('Invalid signature')) {
      return res.status(400).json({
        error: 'Invalid signature',
        code: 'INVALID_SIGNATURE',
      });
    }

    return res.status(500).json({
      error: errorMessage,
      code: 'CONFIRM_ERROR',
    });
  }
}
