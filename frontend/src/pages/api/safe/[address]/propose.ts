/**
 * API: Propose Safe Transaction
 * POST /api/safe/[address]/propose
 *
 * Accepts a pre-signed transaction from the frontend and submits it
 * to the Safe Transaction Service.
 *
 * The frontend is responsible for:
 * 1. Creating the transaction using Safe SDK
 * 2. Signing the transaction with the user's wallet
 * 3. Sending the signed transaction data to this endpoint
 *
 * This endpoint then:
 * 1. Validates the signer is an owner
 * 2. Verifies the signature
 * 3. Submits to the Safe Transaction Service
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import SafeApiKit from '@safe-global/api-kit';
import { getSafeInfo } from '../../../../competencias/lib/safeClient';

// Safe Transaction Service URL for Base Mainnet
const SAFE_TX_SERVICE_URL = 'https://safe-transaction-base.safe.global';
const CHAIN_ID = 8453n;

interface ProposeTransactionRequest {
  // The Safe transaction data (from Safe SDK createTransaction)
  safeTransactionData: {
    to: string;
    value: string;
    data: string;
    operation: number;
    safeTxGas: string;
    baseGas: string;
    gasPrice: string;
    gasToken: string;
    refundReceiver: string;
    nonce: number;
  };
  // The hash of the Safe transaction
  safeTxHash: string;
  // The address that signed the transaction
  senderAddress: string;
  // The signature from the sender
  senderSignature: string;
  // Optional: origin identifier
  origin?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address: safeAddress } = req.query;
  const {
    safeTransactionData,
    safeTxHash,
    senderAddress,
    senderSignature,
    origin = 'CryptoGift Competencias',
  } = req.body as ProposeTransactionRequest;

  // Validate Safe address
  if (!safeAddress || typeof safeAddress !== 'string') {
    return res.status(400).json({ error: 'Safe address is required' });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(safeAddress)) {
    return res.status(400).json({ error: 'Invalid Safe address format' });
  }

  // Validate transaction data
  if (!safeTransactionData) {
    return res.status(400).json({ error: 'Safe transaction data is required' });
  }
  if (!safeTransactionData.to || !/^0x[a-fA-F0-9]{40}$/.test(safeTransactionData.to)) {
    return res.status(400).json({ error: 'Invalid transaction "to" address' });
  }

  // Validate transaction hash
  if (!safeTxHash || typeof safeTxHash !== 'string') {
    return res.status(400).json({ error: 'Safe transaction hash is required' });
  }
  if (!/^0x[a-fA-F0-9]{64}$/.test(safeTxHash)) {
    return res.status(400).json({ error: 'Invalid transaction hash format' });
  }

  // Validate sender address
  if (!senderAddress || typeof senderAddress !== 'string') {
    return res.status(400).json({ error: 'Sender address is required' });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(senderAddress)) {
    return res.status(400).json({ error: 'Invalid sender address format' });
  }

  // Validate signature
  if (!senderSignature || typeof senderSignature !== 'string') {
    return res.status(400).json({ error: 'Signature is required' });
  }

  try {
    // Get Safe info to verify sender is an owner
    const safeInfoResult = await getSafeInfo(safeAddress);
    if (!safeInfoResult.success || !safeInfoResult.data) {
      return res.status(404).json({
        error: 'Safe not found',
        code: 'SAFE_NOT_FOUND',
      });
    }

    const safeInfo = safeInfoResult.data;
    const isOwner = safeInfo.owners.some(
      (owner) => owner.toLowerCase() === senderAddress.toLowerCase()
    );

    if (!isOwner) {
      return res.status(403).json({
        error: 'Sender is not an owner of this Safe',
        code: 'NOT_OWNER',
      });
    }

    // Initialize Safe API Kit
    const apiKit = new SafeApiKit({
      chainId: CHAIN_ID,
      txServiceUrl: SAFE_TX_SERVICE_URL,
    });

    // Submit the transaction to the Safe Transaction Service
    await apiKit.proposeTransaction({
      safeAddress,
      safeTransactionData,
      safeTxHash,
      senderAddress,
      senderSignature,
      origin,
    });

    // Get the submitted transaction to return details
    const submittedTx = await apiKit.getTransaction(safeTxHash);

    return res.status(201).json({
      success: true,
      data: {
        safeTxHash,
        safeAddress,
        to: safeTransactionData.to,
        value: safeTransactionData.value,
        nonce: safeTransactionData.nonce,
        proposedBy: senderAddress,
        confirmations: submittedTx.confirmations?.length || 1,
        confirmationsRequired: safeInfo.threshold,
        isReadyToExecute: (submittedTx.confirmations?.length || 1) >= safeInfo.threshold,
        message: 'Transaction proposed successfully',
      },
    });
  } catch (error) {
    console.error('Propose transaction API error:', error);

    // Handle specific Safe API errors
    const errorMessage = error instanceof Error ? error.message : 'Failed to propose transaction';

    if (errorMessage.includes('already exists')) {
      return res.status(409).json({
        error: 'A transaction with this hash already exists',
        code: 'TX_EXISTS',
      });
    }

    if (errorMessage.includes('Invalid signature')) {
      return res.status(400).json({
        error: 'Invalid signature',
        code: 'INVALID_SIGNATURE',
      });
    }

    if (errorMessage.includes('nonce')) {
      return res.status(400).json({
        error: 'Invalid nonce - transaction may conflict with existing pending transaction',
        code: 'INVALID_NONCE',
      });
    }

    return res.status(500).json({
      error: errorMessage,
      code: 'PROPOSE_ERROR',
    });
  }
}
