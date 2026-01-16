/**
 * API: Prepare Safe Transaction
 * POST /api/safe/[address]/prepare-transaction
 *
 * Prepares a Safe transaction and returns the safeTxHash for signing.
 * This is step 1 of the propose flow:
 * 1. Frontend calls this endpoint with transaction data
 * 2. Backend calculates safeTxHash and returns it
 * 3. Frontend signs the safeTxHash with user's wallet
 * 4. Frontend calls /propose with the signature
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import Safe from '@safe-global/protocol-kit';
import { getSafeInfo } from '../../../../competencias/lib/safeClient';
import { withAuth, getAuthenticatedAddress } from '../../../../competencias/lib/authMiddleware';

// Base Mainnet configuration
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org';
const CHAIN_ID = 8453;

interface PrepareTransactionRequest {
  to: string;
  value?: string;
  data?: string;
  operation?: number; // 0 = CALL, 1 = DELEGATECALL
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address: safeAddress } = req.query;
  const { to, value = '0', data = '0x', operation = 0 } = req.body as PrepareTransactionRequest;

  // Validate Safe address
  if (!safeAddress || typeof safeAddress !== 'string') {
    return res.status(400).json({ error: 'Safe address is required' });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(safeAddress)) {
    return res.status(400).json({ error: 'Invalid Safe address format' });
  }

  // Validate to address
  if (!to || typeof to !== 'string') {
    return res.status(400).json({ error: 'Transaction "to" address is required' });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(to)) {
    return res.status(400).json({ error: 'Invalid "to" address format' });
  }

  // Get authenticated user
  const userAddress = getAuthenticatedAddress(req);

  try {
    // Get Safe info to verify user is an owner and get nonce
    const safeInfoResult = await getSafeInfo(safeAddress);
    if (!safeInfoResult.success || !safeInfoResult.data) {
      return res.status(404).json({
        error: 'Safe not found',
        code: 'SAFE_NOT_FOUND',
      });
    }

    const safeInfo = safeInfoResult.data;
    const isOwner = safeInfo.owners.some(
      (owner) => owner.toLowerCase() === userAddress.toLowerCase()
    );

    if (!isOwner) {
      return res.status(403).json({
        error: 'You are not an owner of this Safe',
        code: 'NOT_OWNER',
      });
    }

    // Initialize Safe Protocol Kit (read-only, no signer needed for hash calculation)
    const protocolKit = await Safe.init({
      provider: RPC_URL,
      safeAddress,
    });

    // Create the transaction
    const safeTransaction = await protocolKit.createTransaction({
      transactions: [{
        to,
        value,
        data,
        operation,
      }],
    });

    // Get the transaction hash
    const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);

    // Return the data needed for signing
    return res.status(200).json({
      success: true,
      data: {
        safeTxHash,
        safeAddress,
        safeTransactionData: safeTransaction.data,
        chainId: CHAIN_ID,
        nonce: safeInfo.nonce,
        threshold: safeInfo.threshold,
        message: 'Sign this safeTxHash to propose the transaction',
        instructions: [
          '1. Sign the safeTxHash using eth_sign or signMessage with raw hash',
          '2. Adjust signature v value: v + 4 (for eth_sign compatibility)',
          '3. Call POST /api/safe/[address]/propose with the signature',
        ],
      },
    });
  } catch (error) {
    console.error('Prepare transaction API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to prepare transaction',
      code: 'PREPARE_ERROR',
    });
  }
}

// Export with authentication middleware
export default withAuth(handler);
