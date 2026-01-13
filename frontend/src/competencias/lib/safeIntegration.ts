/**
 * GNOSIS SAFE INTEGRATION
 * Multi-signature wallet management for competition funds
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

// ============================================================================
// CONFIGURATION
// ============================================================================

// Base Sepolia addresses
const SAFE_ADDRESSES = {
  // Safe contracts
  SAFE_SINGLETON: '0x41675C099F32341bf84BFc5382aF534df5C7461a',
  SAFE_PROXY_FACTORY: '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67',
  FALLBACK_HANDLER: '0x2f870a80647BbC554F3a0EBD093f11B4d2a7492A',
  MULTI_SEND: '0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526',
  MULTI_SEND_CALL_ONLY: '0x9641d764fc13c8B624c04430C7356C1C7C8102e2',

  // Zodiac modules
  DELAY_MODIFIER: '0x0000000000000000000000000000000000000000',  // To be deployed
  ROLES_MODIFIER: '0x0000000000000000000000000000000000000000',  // To be deployed

  // Our custom contracts
  COMPETITION_GUARD: '0x0000000000000000000000000000000000000000'  // To be deployed
};

const CHAIN_ID = 84532;  // Base Sepolia

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
  const { owners, threshold, fallbackHandler } = params;

  // Safe setup function signature
  const setupAbi = [
    'function setup(',
    '  address[] calldata _owners,',
    '  uint256 _threshold,',
    '  address to,',
    '  bytes calldata data,',
    '  address fallbackHandler,',
    '  address paymentToken,',
    '  uint256 payment,',
    '  address payable paymentReceiver',
    ')'
  ].join('');

  // Encode setup call
  // Note: In production, use ethers.js or viem to encode this properly
  const setupData = encodeSetupCall({
    owners,
    threshold,
    to: '0x0000000000000000000000000000000000000000',
    data: '0x',
    fallbackHandler: fallbackHandler || SAFE_ADDRESSES.FALLBACK_HANDLER,
    paymentToken: '0x0000000000000000000000000000000000000000',
    payment: 0,
    paymentReceiver: '0x0000000000000000000000000000000000000000'
  });

  // Generate unique salt
  const salt = generateSalt();

  return {
    to: SAFE_ADDRESSES.SAFE_PROXY_FACTORY,
    data: encodeCreateProxyCall(SAFE_ADDRESSES.SAFE_SINGLETON, setupData, salt),
    salt
  };
}

/**
 * Calculate Safe address before deployment (CREATE2)
 */
export function predictSafeAddress(
  setupData: string,
  salt: string
): string {
  // CREATE2 address calculation
  // address = keccak256(0xff + factory + salt + keccak256(initCode))[12:]
  // This is a simplified version - use actual library in production
  return `0x${generateHash(`${SAFE_ADDRESSES.SAFE_PROXY_FACTORY}${salt}${setupData}`).slice(-40)}`;
}

/**
 * Create a Safe for a competition
 */
export async function createCompetitionSafe(
  competition: Partial<Competition>,
  signer: { signTransaction: (tx: SafeTransaction) => Promise<string> }
): Promise<APIResponse<SafeConfig>> {
  // Determine owners based on resolution method
  const owners: string[] = [];

  // Always include the competition creator
  if (competition.creator) {
    owners.push(getCreatorAddress(competition.creator));
  }

  // Add judges as owners for multisig resolution
  if (competition.resolution?.judges) {
    for (const judge of competition.resolution.judges) {
      if (!owners.includes(judge.address)) {
        owners.push(judge.address);
      }
    }
  }

  // Calculate threshold
  const threshold = competition.resolution?.requiredSignatures || Math.ceil(owners.length / 2);

  // Generate deployment data
  const deploymentData = generateSafeDeploymentData({
    owners,
    threshold
  });

  // Predict the Safe address
  const predictedAddress = predictSafeAddress(deploymentData.data, deploymentData.salt);

  try {
    // In production, this would actually send the transaction
    // For now, return the config
    const safeConfig: SafeConfig = {
      address: predictedAddress,
      chainId: CHAIN_ID,
      owners,
      threshold,
      modules: [],
      guards: [],
      nonce: 0
    };

    return {
      success: true,
      data: safeConfig,
      meta: {
        timestamp: Date.now(),
        requestId: deploymentData.salt
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'SAFE_CREATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create Safe',
        details: error
      }
    };
  }
}

// ============================================================================
// TRANSACTION BUILDING
// ============================================================================

/**
 * Build a Safe transaction for prize distribution
 */
export function buildPrizeDistributionTx(params: {
  recipients: Array<{ address: string; amount: string }>;
  token?: string;  // ETH if not specified
}): SafeTransaction[] {
  const transactions: SafeTransaction[] = [];

  for (const recipient of params.recipients) {
    if (params.token && params.token !== 'ETH') {
      // ERC20 transfer
      transactions.push({
        to: params.token,
        value: '0',
        data: encodeERC20Transfer(recipient.address, recipient.amount),
        operation: 0,
        safeTxGas: '0',
        baseGas: '0',
        gasPrice: '0',
        gasToken: '0x0000000000000000000000000000000000000000',
        refundReceiver: '0x0000000000000000000000000000000000000000',
        nonce: 0
      });
    } else {
      // Native ETH transfer
      transactions.push({
        to: recipient.address,
        value: recipient.amount,
        data: '0x',
        operation: 0,
        safeTxGas: '0',
        baseGas: '0',
        gasPrice: '0',
        gasToken: '0x0000000000000000000000000000000000000000',
        refundReceiver: '0x0000000000000000000000000000000000000000',
        nonce: 0
      });
    }
  }

  return transactions;
}

/**
 * Build a multi-send transaction (batch multiple calls)
 */
export function buildMultiSendTx(
  transactions: SafeTransaction[]
): SafeTransaction {
  const encodedTransactions = transactions.map(tx =>
    encodeMultiSendTransaction(tx)
  ).join('');

  return {
    to: SAFE_ADDRESSES.MULTI_SEND,
    value: '0',
    data: encodeMultiSend(encodedTransactions),
    operation: 1,  // DelegateCall for MultiSend
    safeTxGas: '0',
    baseGas: '0',
    gasPrice: '0',
    gasToken: '0x0000000000000000000000000000000000000000',
    refundReceiver: '0x0000000000000000000000000000000000000000',
    nonce: 0
  };
}

// ============================================================================
// SIGNATURE MANAGEMENT
// ============================================================================

/**
 * Calculate Safe transaction hash
 */
export function calculateSafeTxHash(
  safeAddress: string,
  tx: SafeTransaction,
  chainId: number
): string {
  const domainSeparator = calculateDomainSeparator(safeAddress, chainId);
  const safeTxHash = calculateSafeTxStructHash(tx);

  // EIP-712 hash
  return generateHash(`0x1901${domainSeparator}${safeTxHash}`);
}

/**
 * Collect signatures from judges
 */
export function collectSignatures(
  signatures: SafeSignature[]
): string {
  // Sort signatures by signer address (required by Safe)
  const sorted = [...signatures].sort((a, b) =>
    a.signer.toLowerCase().localeCompare(b.signer.toLowerCase())
  );

  // Concatenate signatures
  return sorted.map(s => s.signature).join('');
}

/**
 * Verify a signature
 */
export function verifySignature(
  safeAddress: string,
  tx: SafeTransaction,
  signature: SafeSignature,
  chainId: number
): boolean {
  const txHash = calculateSafeTxHash(safeAddress, tx, chainId);
  // In production, use ecrecover to verify
  // This is a placeholder
  return signature.signature.length === 130;  // 65 bytes hex
}

/**
 * Check if we have enough signatures
 */
export function hasEnoughSignatures(
  signatures: SafeSignature[],
  threshold: number
): boolean {
  // Get unique signers
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
  return {
    to: '{{SAFE_ADDRESS}}',  // Will be replaced with actual Safe address
    value: '0',
    data: encodeEnableModule(moduleAddress),
    operation: 0,
    safeTxGas: '0',
    baseGas: '0',
    gasPrice: '0',
    gasToken: '0x0000000000000000000000000000000000000000',
    refundReceiver: '0x0000000000000000000000000000000000000000',
    nonce: 0
  };
}

/**
 * Setup Delay Module for time-locked withdrawals
 */
export function buildDelayModuleSetup(params: {
  cooldown: number;  // Seconds before execution allowed
  expiration: number;  // Seconds until transaction expires
}): SafeModule {
  return {
    type: 'delay',
    address: SAFE_ADDRESSES.DELAY_MODIFIER,
    config: {
      cooldown: params.cooldown,
      expiration: params.expiration
    }
  };
}

/**
 * Setup Roles Module for judge permissions
 */
export function buildRolesModuleSetup(
  judges: Judge[]
): SafeModule {
  const roles: Record<string, string[]> = {
    'PRIMARY_JUDGE': judges.filter(j => j.role === 'primary').map(j => j.address),
    'BACKUP_JUDGE': judges.filter(j => j.role === 'backup').map(j => j.address),
    'APPEAL_JUDGE': judges.filter(j => j.role === 'appeal').map(j => j.address)
  };

  return {
    type: 'roles',
    address: SAFE_ADDRESSES.ROLES_MODIFIER,
    config: {
      roles
    }
  };
}

// ============================================================================
// GUARD MANAGEMENT
// ============================================================================

/**
 * Setup Competition Guard for validating distributions
 */
export function buildCompetitionGuard(
  competition: Competition
): SafeGuard {
  const participantsList = getParticipantsList(competition.participants);
  return {
    type: 'competition',
    address: SAFE_ADDRESSES.COMPETITION_GUARD,
    config: {
      competitionId: competition.id,
      prizePool: competition.prizePool,
      allowedRecipients: participantsList.map(p => p.address),
      maxWithdrawal: competition.prizePool
    }
  };
}

/**
 * Build transaction to set guard
 */
export function buildSetGuardTx(guardAddress: string): SafeTransaction {
  return {
    to: '{{SAFE_ADDRESS}}',
    value: '0',
    data: encodeSetGuard(guardAddress),
    operation: 0,
    safeTxGas: '0',
    baseGas: '0',
    gasPrice: '0',
    gasToken: '0x0000000000000000000000000000000000000000',
    refundReceiver: '0x0000000000000000000000000000000000000000',
    nonce: 0
  };
}

// ============================================================================
// HELPER ENCODING FUNCTIONS
// ============================================================================

// Note: These are placeholder implementations
// In production, use ethers.js, viem, or the Safe SDK

function encodeSetupCall(params: {
  owners: string[];
  threshold: number;
  to: string;
  data: string;
  fallbackHandler: string;
  paymentToken: string;
  payment: number;
  paymentReceiver: string;
}): string {
  // Placeholder - use actual ABI encoding in production
  return `0xb63e800d${JSON.stringify(params)}`;
}

function encodeCreateProxyCall(
  singleton: string,
  setupData: string,
  salt: string
): string {
  // createProxyWithNonce(address singleton, bytes initializer, uint256 saltNonce)
  return `0x1688f0b9${singleton}${setupData}${salt}`;
}

function encodeERC20Transfer(to: string, amount: string): string {
  // transfer(address,uint256)
  return `0xa9059cbb${to.slice(2).padStart(64, '0')}${BigInt(amount).toString(16).padStart(64, '0')}`;
}

function encodeMultiSendTransaction(tx: SafeTransaction): string {
  // Encode single transaction for multiSend
  const operation = tx.operation.toString(16).padStart(2, '0');
  const to = tx.to.slice(2).padStart(40, '0');
  const value = BigInt(tx.value).toString(16).padStart(64, '0');
  const dataLength = ((tx.data.length - 2) / 2).toString(16).padStart(64, '0');
  const data = tx.data.slice(2);

  return `${operation}${to}${value}${dataLength}${data}`;
}

function encodeMultiSend(encodedTransactions: string): string {
  // multiSend(bytes transactions)
  return `0x8d80ff0a${encodedTransactions}`;
}

function encodeEnableModule(moduleAddress: string): string {
  // enableModule(address module)
  return `0x610b5925${moduleAddress.slice(2).padStart(64, '0')}`;
}

function encodeSetGuard(guardAddress: string): string {
  // setGuard(address guard)
  return `0xe19a9dd9${guardAddress.slice(2).padStart(64, '0')}`;
}

function calculateDomainSeparator(safeAddress: string, chainId: number): string {
  // EIP-712 domain separator
  // Placeholder implementation
  return generateHash(`${safeAddress}${chainId}`);
}

function calculateSafeTxStructHash(tx: SafeTransaction): string {
  // Safe transaction struct hash
  // Placeholder implementation
  return generateHash(JSON.stringify(tx));
}

function generateSalt(): string {
  return `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.padEnd(66, '0');
}

function generateHash(input: string): string {
  // Placeholder - use keccak256 in production
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
}

// ============================================================================
// SAFE API INTEGRATION
// ============================================================================

const SAFE_API_BASE = 'https://safe-transaction-base-sepolia.safe.global/api/v1';

/**
 * Get Safe info from Safe Transaction Service
 */
export async function getSafeInfo(
  safeAddress: string
): Promise<APIResponse<SafeConfig>> {
  try {
    const response = await fetch(`${SAFE_API_BASE}/safes/${safeAddress}/`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        address: data.address,
        chainId: CHAIN_ID,
        owners: data.owners,
        threshold: data.threshold,
        modules: data.modules || [],
        guards: data.guard ? [{ type: 'custom', address: data.guard, config: {} }] : [],
        nonce: data.nonce
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'SAFE_API_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch Safe info'
      }
    };
  }
}

/**
 * Get pending transactions for a Safe
 */
export async function getPendingTransactions(
  safeAddress: string
): Promise<APIResponse<SafeTransaction[]>> {
  try {
    const response = await fetch(
      `${SAFE_API_BASE}/safes/${safeAddress}/multisig-transactions/?executed=false`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      data: data.results.map((tx: Record<string, unknown>) => ({
        to: tx.to,
        value: tx.value,
        data: tx.data || '0x',
        operation: tx.operation,
        safeTxGas: tx.safeTxGas,
        baseGas: tx.baseGas,
        gasPrice: tx.gasPrice,
        gasToken: tx.gasToken,
        refundReceiver: tx.refundReceiver,
        nonce: tx.nonce
      }))
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'SAFE_API_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch transactions'
      }
    };
  }
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...tx,
          contractTransactionHash: safeTxHash,
          sender,
          signature: signature.signature,
          origin: 'CryptoGift Competencias'
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return {
      success: true,
      data: { safeTxHash }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'PROPOSE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to propose transaction'
      }
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          signature: signature.signature
        })
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return {
      success: true,
      data: { success: true }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'SIGNATURE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to add signature'
      }
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
  // 1. Create the Safe
  const safeResult = await createCompetitionSafe(competition, signer);
  if (!safeResult.success || !safeResult.data) {
    return { success: false, error: safeResult.error };
  }

  const safeConfig = safeResult.data;

  // 2. Setup modules based on competition type
  const modules: SafeModule[] = [];

  // Add delay module for dispute period
  if (competition.resolution.disputePeriod > 0) {
    modules.push(buildDelayModuleSetup({
      cooldown: competition.resolution.disputePeriod,
      expiration: competition.resolution.disputePeriod * 2
    }));
  }

  // Add roles module for judges
  if (competition.resolution.judges.length > 1) {
    modules.push(buildRolesModuleSetup(competition.resolution.judges));
  }

  // 3. Setup competition guard
  const guard = buildCompetitionGuard(competition);

  return {
    success: true,
    data: {
      safeAddress: safeConfig.address,
      modules,
      guard
    }
  };
}

/**
 * Execute prize distribution from competition Safe
 */
export async function distributePrizes(
  safeAddress: string,
  winners: Array<{ address: string; amount: string }>,
  signatures: SafeSignature[]
): Promise<APIResponse<{ txHash: string }>> {
  // Build distribution transaction
  const distributionTxs = buildPrizeDistributionTx({
    recipients: winners
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
        message: `Need ${safeInfo.data.threshold} signatures, have ${signatures.length}`
      }
    };
  }

  // In production, this would execute the transaction
  return {
    success: true,
    data: {
      txHash: '0x' + 'pending'.padEnd(64, '0')
    }
  };
}
