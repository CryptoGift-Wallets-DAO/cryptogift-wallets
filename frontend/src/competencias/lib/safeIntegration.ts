/**
 * GNOSIS SAFE INTEGRATION
 * Multi-signature wallet management for competition funds
 *
 * This module provides a high-level API for Safe operations.
 * It delegates to safeClient.ts for actual SDK integration.
 *
 * Safe Architecture:
 * - Owners: Addresses that can sign transactions
 * - Threshold: Minimum signatures required (N-of-M)
 * - Modules: Extensions that add functionality (Delay, Roles, etc.)
 * - Guards: Pre/post transaction checks
 *
 * For competitions, we use:
 * - Competition Guard: Validates prize distributions
 * - Delay Module: Time-locked withdrawals
 * - Roles Module: Role-based permissions for judges
 */

import { ethers } from 'ethers';
import type {
  SafeConfig,
  SafeTransaction,
  SafeSignature,
  SafeModule,
  SafeGuard,
  APIResponse,
  Competition,
  Judge
} from '../types';
import { getCreatorAddress, getParticipantsList } from '../types';

// Import real Safe SDK functions
import {
  getSafeInfo as getSafeInfoReal,
  getSafeBalance,
  getPendingTransactions as getPendingTransactionsReal,
  proposeTransaction as proposeTransactionReal,
  signTransaction as signTransactionReal,
  executeTransaction as executeTransactionReal,
  proposePrizeDistribution,
  createCompetitionSafe as createCompetitionSafeReal,
  predictSafeAddress as predictSafeAddressReal,
  enableModule as enableModuleReal,
  setGuard as setGuardReal,
  buildETHTransfer,
  buildERC20Transfer,
  SAFE_CONTRACTS,
  type PrizeDistribution,
  type SafeInfo,
  type TransactionResult,
} from './safeClient';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Base Sepolia addresses - using real addresses from Safe SDK
export const SAFE_ADDRESSES = {
  // Safe contracts (from @safe-global deployments)
  SAFE_SINGLETON: SAFE_CONTRACTS.SAFE_SINGLETON,
  SAFE_PROXY_FACTORY: SAFE_CONTRACTS.SAFE_PROXY_FACTORY,
  FALLBACK_HANDLER: SAFE_CONTRACTS.FALLBACK_HANDLER,
  MULTI_SEND: SAFE_CONTRACTS.MULTI_SEND,
  MULTI_SEND_CALL_ONLY: SAFE_CONTRACTS.MULTI_SEND_CALL_ONLY,

  // Zodiac modules - to be deployed per competition
  DELAY_MODIFIER: '0x0000000000000000000000000000000000000000',
  ROLES_MODIFIER: '0x0000000000000000000000000000000000000000',

  // Our custom contracts - to be deployed
  COMPETITION_GUARD: '0x0000000000000000000000000000000000000000'
};

export const CHAIN_ID = 84532; // Base Sepolia

// ============================================================================
// SAFE CREATION
// ============================================================================

/**
 * Generate Safe deployment data
 * This creates the initialization data for a new Safe
 */
export function generateSafeDeploymentData(params: {
  owners: string[];
  threshold: number;
  fallbackHandler?: string;
}): {
  to: string;
  data: string;
  salt: string;
} {
  const { owners, threshold } = params;

  // Generate unique salt
  const salt = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.padEnd(66, '0');

  // Use Safe factory for deployment
  return {
    to: SAFE_ADDRESSES.SAFE_PROXY_FACTORY,
    data: encodeCreateProxyWithNonce(owners, threshold, salt),
    salt,
  };
}

/**
 * Predict the address of a Safe before deployment
 */
export async function predictSafeAddress(params: {
  owners: string[];
  threshold: number;
  saltNonce?: string;
}): Promise<string> {
  return predictSafeAddressReal({
    owners: params.owners,
    threshold: params.threshold,
    saltNonce: params.saltNonce,
  });
}

/**
 * Create a new Safe for a competition
 */
export async function createCompetitionSafe(
  competition: Partial<Competition>,
  signer: {
    sendTransaction?: (tx: { to: string; data: string; value?: string }) => Promise<{ hash: string }>;
    signTransaction?: (tx: SafeTransaction) => Promise<string>;
  }
): Promise<APIResponse<SafeConfig>> {
  // Get owners and threshold from competition
  const creator = getCreatorAddress(competition.creator);
  const judges = competition.resolution?.judges || competition.arbitration?.judges || [];

  const owners = [
    creator,
    ...judges.map((j: Judge) => j.address)
  ].filter((addr): addr is string => !!addr);

  // Default threshold: majority of owners
  const threshold = Math.ceil(owners.length / 2);

  if (owners.length === 0) {
    return {
      success: false,
      error: {
        code: 'NO_OWNERS',
        message: 'At least one owner (creator) is required',
      },
    };
  }

  // If we have a real signer with sendTransaction, use the SDK
  if (signer.sendTransaction) {
    try {
      // Create an ethers signer wrapper
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
        CHAIN_ID
      );

      // Use predicted address for now (actual deployment happens on first tx)
      const predictedAddress = await predictSafeAddressReal({
        owners,
        threshold,
        saltNonce: competition.id,
      });

      return {
        success: true,
        data: {
          address: predictedAddress,
          chainId: CHAIN_ID,
          owners,
          threshold,
          modules: [],
          guards: [],
          nonce: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_SAFE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create Safe',
        },
      };
    }
  }

  // Fallback: return predicted address
  const predictedAddress = await predictSafeAddressReal({
    owners,
    threshold,
    saltNonce: competition.id || Date.now().toString(),
  });

  return {
    success: true,
    data: {
      address: predictedAddress,
      chainId: CHAIN_ID,
      owners,
      threshold,
      modules: [],
      guards: [],
      nonce: 0,
    },
  };
}

// ============================================================================
// TRANSACTION BUILDING
// ============================================================================

/**
 * Build transactions for prize distribution
 * Supports multiple recipients with ETH or ERC20 tokens
 */
export function buildPrizeDistributionTx(params: {
  recipients: Array<{ address: string; amount: string; token?: string }>;
}): SafeTransaction[] {
  return params.recipients.map((recipient) => {
    if (recipient.token && recipient.token !== ethers.ZeroAddress) {
      // ERC20 transfer
      const txData = buildERC20Transfer(recipient.token, recipient.address, recipient.amount);
      return {
        to: recipient.token,
        value: '0',
        data: txData.data,
        operation: 0,
        safeTxGas: '0',
        baseGas: '0',
        gasPrice: '0',
        gasToken: ethers.ZeroAddress,
        refundReceiver: ethers.ZeroAddress,
        nonce: 0,
      };
    } else {
      // ETH transfer
      const txData = buildETHTransfer(recipient.address, recipient.amount);
      return {
        to: recipient.address,
        value: recipient.amount,
        data: '0x',
        operation: 0,
        safeTxGas: '0',
        baseGas: '0',
        gasPrice: '0',
        gasToken: ethers.ZeroAddress,
        refundReceiver: ethers.ZeroAddress,
        nonce: 0,
      };
    }
  });
}

/**
 * Build a multiSend transaction for batching multiple operations
 */
export function buildMultiSendTx(transactions: SafeTransaction[]): SafeTransaction {
  // Encode all transactions for multiSend
  const encodedTransactions = transactions.map((tx) => {
    const operation = (tx.operation || 0).toString(16).padStart(2, '0');
    const to = tx.to.slice(2).toLowerCase().padStart(40, '0');
    const value = BigInt(tx.value || '0').toString(16).padStart(64, '0');
    const data = tx.data.slice(2);
    const dataLength = (data.length / 2).toString(16).padStart(64, '0');
    return `${operation}${to}${value}${dataLength}${data}`;
  }).join('');

  // multiSend(bytes transactions) selector
  const multiSendData = `0x8d80ff0a` +
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes'],
      [`0x${encodedTransactions}`]
    ).slice(2);

  return {
    to: SAFE_ADDRESSES.MULTI_SEND,
    value: '0',
    data: multiSendData,
    operation: 1, // DelegateCall for multiSend
    safeTxGas: '0',
    baseGas: '0',
    gasPrice: '0',
    gasToken: ethers.ZeroAddress,
    refundReceiver: ethers.ZeroAddress,
    nonce: 0,
  };
}

// ============================================================================
// SIGNATURE MANAGEMENT
// ============================================================================

/**
 * Calculate Safe transaction hash using proper keccak256
 */
export function calculateSafeTxHash(
  safeAddress: string,
  tx: SafeTransaction,
  chainId: number
): string {
  // EIP-712 domain separator
  const DOMAIN_SEPARATOR_TYPEHASH = ethers.keccak256(
    ethers.toUtf8Bytes('EIP712Domain(uint256 chainId,address verifyingContract)')
  );

  const domainSeparator = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'uint256', 'address'],
      [DOMAIN_SEPARATOR_TYPEHASH, chainId, safeAddress]
    )
  );

  // Safe transaction typehash
  const SAFE_TX_TYPEHASH = ethers.keccak256(
    ethers.toUtf8Bytes(
      'SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)'
    )
  );

  const dataHash = ethers.keccak256(tx.data);

  const safeTxHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'address', 'uint256', 'bytes32', 'uint8', 'uint256', 'uint256', 'uint256', 'address', 'address', 'uint256'],
      [
        SAFE_TX_TYPEHASH,
        tx.to,
        tx.value,
        dataHash,
        tx.operation,
        tx.safeTxGas,
        tx.baseGas,
        tx.gasPrice,
        tx.gasToken,
        tx.refundReceiver,
        tx.nonce
      ]
    )
  );

  // Final EIP-712 hash
  return ethers.keccak256(
    ethers.solidityPacked(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      ['0x19', '0x01', domainSeparator, safeTxHash]
    )
  );
}

/**
 * Collect signatures from multiple owners
 */
export async function collectSignatures(
  safeAddress: string,
  tx: SafeTransaction,
  signers: Array<{ address: string; sign: (hash: string) => Promise<string> }>
): Promise<SafeSignature[]> {
  const txHash = calculateSafeTxHash(safeAddress, tx, CHAIN_ID);
  const signatures: SafeSignature[] = [];

  for (const signer of signers) {
    try {
      const signature = await signer.sign(txHash);
      signatures.push({
        signer: signer.address,
        signature,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(`Failed to get signature from ${signer.address}:`, error);
    }
  }

  return signatures;
}

/**
 * Verify a signature using ecrecover
 */
export function verifySignature(
  safeAddress: string,
  tx: SafeTransaction,
  signature: SafeSignature,
  chainId: number
): boolean {
  try {
    const txHash = calculateSafeTxHash(safeAddress, tx, chainId);
    const recoveredAddress = ethers.recoverAddress(txHash, signature.signature);
    return recoveredAddress.toLowerCase() === signature.signer.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Check if we have enough signatures to execute
 */
export function hasEnoughSignatures(
  signatures: SafeSignature[],
  threshold: number
): boolean {
  const uniqueSigners = new Set(signatures.map(s => s.signer.toLowerCase()));
  return uniqueSigners.size >= threshold;
}

// ============================================================================
// MODULE MANAGEMENT
// ============================================================================

/**
 * Enable a module on a Safe
 */
export function buildEnableModuleTx(moduleAddress: string): SafeTransaction {
  const data = `0x610b5925${moduleAddress.slice(2).padStart(64, '0')}`;

  return {
    to: '{{SAFE_ADDRESS}}', // Will be replaced with actual Safe address
    value: '0',
    data,
    operation: 0,
    safeTxGas: '0',
    baseGas: '0',
    gasPrice: '0',
    gasToken: ethers.ZeroAddress,
    refundReceiver: ethers.ZeroAddress,
    nonce: 0,
  };
}

/**
 * Setup Delay Module for time-locked withdrawals
 */
export function buildDelayModuleSetup(params: {
  cooldown: number;
  expiration: number;
}): SafeModule {
  return {
    type: 'delay',
    address: SAFE_ADDRESSES.DELAY_MODIFIER,
    config: {
      cooldown: params.cooldown,
      expiration: params.expiration,
    },
  };
}

/**
 * Setup Roles Module for judge permissions
 */
export function buildRolesModuleSetup(judges: Judge[]): SafeModule {
  const roles: Record<string, string[]> = {
    'PRIMARY_JUDGE': judges.filter(j => j.role === 'primary').map(j => j.address),
    'BACKUP_JUDGE': judges.filter(j => j.role === 'backup').map(j => j.address),
    'APPEAL_JUDGE': judges.filter(j => j.role === 'appeal').map(j => j.address),
  };

  return {
    type: 'roles',
    address: SAFE_ADDRESSES.ROLES_MODIFIER,
    config: { roles },
  };
}

// ============================================================================
// GUARD MANAGEMENT
// ============================================================================

/**
 * Setup Competition Guard for validating distributions
 */
export function buildCompetitionGuard(competition: Competition): SafeGuard {
  const participantsList = getParticipantsList(competition.participants);

  return {
    type: 'competition',
    address: SAFE_ADDRESSES.COMPETITION_GUARD,
    config: {
      competitionId: competition.id,
      prizePool: competition.prizePool,
      allowedRecipients: participantsList.map(p => p.address),
      maxWithdrawal: competition.prizePool,
    },
  };
}

/**
 * Build transaction to set guard
 */
export function buildSetGuardTx(guardAddress: string): SafeTransaction {
  const data = `0xe19a9dd9${guardAddress.slice(2).padStart(64, '0')}`;

  return {
    to: '{{SAFE_ADDRESS}}',
    value: '0',
    data,
    operation: 0,
    safeTxGas: '0',
    baseGas: '0',
    gasPrice: '0',
    gasToken: ethers.ZeroAddress,
    refundReceiver: ethers.ZeroAddress,
    nonce: 0,
  };
}

// ============================================================================
// SAFE API INTEGRATION
// ============================================================================

const SAFE_API_BASE = 'https://safe-transaction-base-sepolia.safe.global/api/v1';

/**
 * Get Safe info from Safe Transaction Service
 */
export async function getSafeInfo(safeAddress: string): Promise<APIResponse<SafeConfig>> {
  const result = await getSafeInfoReal(safeAddress);

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error,
    };
  }

  return {
    success: true,
    data: {
      address: result.data.address,
      chainId: result.data.chainId,
      owners: result.data.owners,
      threshold: result.data.threshold,
      modules: (result.data.modules || []).map((addr: string) => ({
        type: 'custom' as const,
        address: addr,
        config: {},
      })),
      guards: result.data.guard ? [{ type: 'custom' as const, address: result.data.guard, config: {} }] : [],
      nonce: result.data.nonce,
    },
  };
}

/**
 * Get pending transactions for a Safe
 */
export async function getPendingTransactions(
  safeAddress: string
): Promise<APIResponse<SafeTransaction[]>> {
  const result = await getPendingTransactionsReal(safeAddress);

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error,
    };
  }

  return {
    success: true,
    data: result.data.map((tx) => ({
      to: tx.to,
      value: tx.value,
      data: tx.data,
      operation: tx.operation as 0 | 1,
      safeTxGas: '0',
      baseGas: '0',
      gasPrice: '0',
      gasToken: ethers.ZeroAddress,
      refundReceiver: ethers.ZeroAddress,
      nonce: tx.nonce,
    })),
  };
}

/**
 * Propose a transaction to the Safe Transaction Service
 */
export async function proposeTransaction(
  safeAddress: string,
  tx: SafeTransaction,
  signature: SafeSignature,
  sender: string
): Promise<APIResponse<{ safeTxHash: string }>> {
  const safeTxHash = calculateSafeTxHash(safeAddress, tx, CHAIN_ID);

  try {
    const response = await fetch(
      `${SAFE_API_BASE}/safes/${safeAddress}/multisig-transactions/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...tx,
          contractTransactionHash: safeTxHash,
          sender,
          signature: signature.signature,
          origin: 'CryptoGift Competencias',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return {
      success: true,
      data: { safeTxHash },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'PROPOSE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to propose transaction',
      },
    };
  }
}

/**
 * Add a signature to an existing transaction
 */
export async function addSignature(
  safeAddress: string,
  safeTxHash: string,
  signature: SafeSignature
): Promise<APIResponse<{ success: boolean }>> {
  try {
    const response = await fetch(
      `${SAFE_API_BASE}/safes/${safeAddress}/multisig-transactions/${safeTxHash}/confirmations/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: signature.signature,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return {
      success: true,
      data: { success: true },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'SIGNATURE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to add signature',
      },
    };
  }
}

// ============================================================================
// COMPETITION-SPECIFIC HELPERS
// ============================================================================

/**
 * Create a complete Safe setup for a competition
 */
export async function setupCompetitionSafe(
  competition: Competition,
  signer: { signTransaction: (tx: SafeTransaction) => Promise<string> }
): Promise<APIResponse<{
  safeAddress: string;
  modules: SafeModule[];
  guard: SafeGuard;
}>> {
  // Create the Safe
  const safeResult = await createCompetitionSafe(competition, signer);
  if (!safeResult.success || !safeResult.data) {
    return { success: false, error: safeResult.error };
  }

  const safeConfig = safeResult.data;

  // Setup modules based on competition type
  const modules: SafeModule[] = [];

  // Add delay module for dispute period
  if (competition.resolution.disputePeriod > 0) {
    modules.push(buildDelayModuleSetup({
      cooldown: competition.resolution.disputePeriod,
      expiration: competition.resolution.disputePeriod * 2,
    }));
  }

  // Add roles module for judges
  if (competition.resolution.judges.length > 1) {
    modules.push(buildRolesModuleSetup(competition.resolution.judges));
  }

  // Setup competition guard
  const guard = buildCompetitionGuard(competition);

  return {
    success: true,
    data: {
      safeAddress: safeConfig.address,
      modules,
      guard,
    },
  };
}

/**
 * Execute prize distribution from competition Safe
 */
export async function distributePrizes(
  safeAddress: string,
  winners: Array<{ address: string; amount: string }>,
  signatures: SafeSignature[],
  signer?: ethers.Signer
): Promise<APIResponse<{ txHash: string }>> {
  // Build distribution transaction
  const distributionTxs = buildPrizeDistributionTx({
    recipients: winners,
  });

  // If multiple winners, use multiSend
  const tx = distributionTxs.length > 1
    ? buildMultiSendTx(distributionTxs)
    : distributionTxs[0];

  // Verify we have enough signatures
  const safeInfo = await getSafeInfo(safeAddress);
  if (!safeInfo.success || !safeInfo.data) {
    return { success: false, error: safeInfo.error };
  }

  if (!hasEnoughSignatures(signatures, safeInfo.data.threshold)) {
    return {
      success: false,
      error: {
        code: 'INSUFFICIENT_SIGNATURES',
        message: `Need ${safeInfo.data.threshold} signatures, have ${signatures.length}`,
      },
    };
  }

  // If we have a signer, execute via SDK
  if (signer) {
    const safeTxHash = calculateSafeTxHash(safeAddress, tx, CHAIN_ID);
    const executeResult = await executeTransactionReal(safeAddress, safeTxHash, signer);

    if (!executeResult.success || !executeResult.data) {
      return {
        success: false,
        error: executeResult.error,
      };
    }

    return {
      success: true,
      data: {
        txHash: executeResult.data.txHash || executeResult.data.safeTxHash,
      },
    };
  }

  // Return transaction data for frontend execution
  // Note: Transaction is pending execution on the frontend
  // Return calculated safeTxHash as pending txHash for tracking
  const pendingSafeTxHash = calculateSafeTxHash(safeAddress, tx, CHAIN_ID);
  return {
    success: true,
    data: {
      txHash: `pending:${pendingSafeTxHash}`,
    },
  };
}

// ============================================================================
// HELPER ENCODING FUNCTIONS
// ============================================================================

function encodeCreateProxyWithNonce(
  owners: string[],
  threshold: number,
  salt: string
): string {
  // Encode setup call
  const setupData = ethers.AbiCoder.defaultAbiCoder().encode(
    ['address[]', 'uint256', 'address', 'bytes', 'address', 'address', 'uint256', 'address'],
    [
      owners,
      threshold,
      ethers.ZeroAddress,
      '0x',
      SAFE_ADDRESSES.FALLBACK_HANDLER,
      ethers.ZeroAddress,
      0,
      ethers.ZeroAddress,
    ]
  );

  // setup(address[],uint256,address,bytes,address,address,uint256,address)
  const setupSelector = '0xb63e800d';
  const fullSetupData = setupSelector + setupData.slice(2);

  // createProxyWithNonce(address,bytes,uint256)
  const createProxySelector = '0x1688f0b9';
  const saltNonce = BigInt(salt).toString();

  const createProxyData = ethers.AbiCoder.defaultAbiCoder().encode(
    ['address', 'bytes', 'uint256'],
    [SAFE_ADDRESSES.SAFE_SINGLETON, fullSetupData, saltNonce]
  );

  return createProxySelector + createProxyData.slice(2);
}
