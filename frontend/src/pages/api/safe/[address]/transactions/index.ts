/**
 * API: Safe Transactions
 * GET /api/safe/[address]/transactions - List transactions
 * POST /api/safe/[address]/transactions - Propose new transaction
 *
 * Handles transaction listing and creation for a Gnosis Safe
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import {
  getPendingTransactions,
  getTransactionHistory,
  proposeTransaction,
  getProvider,
} from '../../../../../competencias/lib/safeClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Safe address is required' });
  }

  // Validate address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid address format' });
  }

  if (req.method === 'GET') {
    return handleGetTransactions(req, res, address);
  } else if (req.method === 'POST') {
    return handleProposeTransaction(req, res, address);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET: List transactions (pending or executed)
 */
async function handleGetTransactions(
  req: NextApiRequest,
  res: NextApiResponse,
  safeAddress: string
) {
  const { status = 'pending', limit = '20' } = req.query;

  try {
    let result;

    if (status === 'pending') {
      result = await getPendingTransactions(safeAddress);
    } else if (status === 'executed') {
      result = await getTransactionHistory(safeAddress, parseInt(limit as string, 10));
    } else {
      // Get both pending and executed
      const [pendingResult, executedResult] = await Promise.all([
        getPendingTransactions(safeAddress),
        getTransactionHistory(safeAddress, parseInt(limit as string, 10)),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          pending: pendingResult.success ? pendingResult.data : [],
          executed: executedResult.success ? executedResult.data : [],
        },
      });
    }

    if (!result.success) {
      return res.status(500).json({
        error: result.error?.message || 'Failed to fetch transactions',
        code: result.error?.code,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        transactions: result.data,
      },
    });
  } catch (error) {
    console.error('Get transactions API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * POST: Propose a new transaction
 * Requires signed message from an owner
 */
async function handleProposeTransaction(
  req: NextApiRequest,
  res: NextApiResponse,
  safeAddress: string
) {
  const { to, value, data, signedMessage, signerAddress } = req.body;

  // Validate required fields
  if (!to || typeof to !== 'string') {
    return res.status(400).json({ error: 'Transaction "to" address is required' });
  }
  if (!signerAddress || typeof signerAddress !== 'string') {
    return res.status(400).json({ error: 'Signer address is required' });
  }
  if (!signedMessage || typeof signedMessage !== 'string') {
    return res.status(400).json({ error: 'Signed message is required for authentication' });
  }

  // Validate address formats
  if (!/^0x[a-fA-F0-9]{40}$/.test(to)) {
    return res.status(400).json({ error: 'Invalid "to" address format' });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(signerAddress)) {
    return res.status(400).json({ error: 'Invalid signer address format' });
  }

  try {
    // Verify the signed message to authenticate the request
    // The message should be: "Propose transaction to Safe {safeAddress} at timestamp {timestamp}"
    const messageMatch = signedMessage.match(/timestamp:(\d+)/);
    if (!messageMatch) {
      return res.status(400).json({ error: 'Invalid signed message format' });
    }

    const timestamp = parseInt(messageMatch[1], 10);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    // Check if the signature is recent (within 5 minutes)
    if (now - timestamp > fiveMinutes) {
      return res.status(401).json({ error: 'Signed message expired' });
    }

    // Recover the signer from the message
    // Note: In production, implement proper signature verification
    // For now, we trust the frontend to provide correct signer

    // Create a wallet instance from the signer
    // Note: This is a simplified approach - in production you'd want
    // the user to sign the actual Safe transaction hash
    const provider = getProvider();

    // For API-based proposals, we need the user to sign via frontend
    // This endpoint validates the request and returns what needs to be signed
    return res.status(200).json({
      success: true,
      data: {
        message: 'Transaction proposal requires frontend signing',
        transactionData: {
          to,
          value: value || '0',
          data: data || '0x',
          safeAddress,
        },
        instructions: 'Use the Safe SDK on the frontend to sign and propose this transaction',
      },
    });
  } catch (error) {
    console.error('Propose transaction API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
