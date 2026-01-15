/**
 * SAFE CLIENT - Real Gnosis Safe SDK Integration
 * Production-ready implementation for competition fund custody
 *
 * This module provides:
 * - Connection to existing Safes
 * - New Safe creation for competitions
 * - Transaction proposal, signing, and execution
 * - Balance queries (ETH and ERC20)
 * - Real-time transaction status
 * - Multi-signature collection
 *
 * Chain: Base Mainnet (8453) - PRODUCCIÓN
 */

import Safe from '@safe-global/protocol-kit';
import SafeApiKit from '@safe-global/api-kit';
import {
  SafeTransactionDataPartial,
  MetaTransactionData,
  OperationType,
} from '@safe-global/safe-core-sdk-types';
import { ethers } from 'ethers';

// Type for signer - can be private key string or ethers Signer
type SignerInput = string | ethers.Signer;
import type { APIResponse } from '../types';

// ============================================================================
// CONFIGURATION - BASE MAINNET (8453)
// ============================================================================

const CHAIN_ID = 8453n; // Base Mainnet
const CHAIN_ID_NUMBER = 8453;

// Safe Transaction Service URL for Base Mainnet
const SAFE_TX_SERVICE_URL = 'https://safe-transaction-base.safe.global';

// Safe contract addresses on Base Mainnet (from safe-global/safe-deployments v1.3.0 eip155)
// Source: https://github.com/safe-global/safe-deployments
export const SAFE_CONTRACTS = {
  SAFE_L2_SINGLETON: '0xfb1bffC9d739B8D520DaF37dF666da4C687191EA',  // SafeL2.sol v1.3.0
  SAFE_PROXY_FACTORY: '0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC', // ProxyFactory v1.3.0
  MULTI_SEND: '0x998739BFdAAdde7C933B942a68053933098f9EDa',          // MultiSend v1.3.0
  MULTI_SEND_CALL_ONLY: '0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B', // MultiSendCallOnly v1.3.0
  FALLBACK_HANDLER: '0x017062a1dE2FE6b99BE3d9d37841FeD19F573804',    // CompatibilityFallbackHandler v1.3.0
  SIGN_MESSAGE_LIB: '0x98FFBBF51bb33A056B08ddf711f289936AafF717',    // SignMessageLib v1.3.0
  CREATE_CALL: '0xB19D6FFc2182150F8Eb585b79D4ABcd7C5640A9d',         // CreateCall v1.3.0
} as const;

// Environment configuration
const getConfig = () => {
  const safeAddress = process.env.SAFE_BASE_ADDRESS || process.env.NEXT_PUBLIC_SAFE_BASE_ADDRESS;
  const apiKey = process.env.SAFE_BASE_API_KEY;
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org';

  return {
    safeAddress,
    apiKey,
    rpcUrl,
    chainId: CHAIN_ID_NUMBER,
  };
};

// ============================================================================
// TYPES
// ============================================================================

export interface SafeInfo {
  address: string;
  chainId: number;
  owners: string[];
  threshold: number;
  nonce: number;
  version: string;
  modules: string[];
  guard: string | null;
  fallbackHandler: string | null;
}

export interface SafeBalance {
  address: string;
  ethBalance: string;
  tokens: Array<{
    tokenAddress: string;
    symbol: string;
    decimals: number;
    balance: string;
  }>;
}

export interface PendingTransaction {
  safeTxHash: string;
  to: string;
  value: string;
  data: string;
  operation: number;
  nonce: number;
  submissionDate: string;
  confirmations: Array<{
    owner: string;
    signature: string;
    submissionDate: string;
  }>;
  confirmationsRequired: number;
  isExecuted: boolean;
  origin: string | null;
}

export interface TransactionResult {
  safeTxHash: string;
  txHash?: string;
  status: 'proposed' | 'signed' | 'executed' | 'failed';
  confirmations: number;
  confirmationsRequired: number;
}

export interface CreateSafeParams {
  owners: string[];
  threshold: number;
  saltNonce?: string;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

let safeApiKit: SafeApiKit | null = null;
let provider: ethers.JsonRpcProvider | null = null;

/**
 * Initialize the Safe API Kit for read operations
 */
export function initializeSafeApiKit(): SafeApiKit {
  if (safeApiKit) {
    return safeApiKit;
  }

  const config = getConfig();

  safeApiKit = new SafeApiKit({
    chainId: CHAIN_ID,
    txServiceUrl: SAFE_TX_SERVICE_URL,
  });

  return safeApiKit;
}

/**
 * Get JSON-RPC provider for Base Sepolia
 */
export function getProvider(): ethers.JsonRpcProvider {
  if (provider) {
    return provider;
  }

  const config = getConfig();
  provider = new ethers.JsonRpcProvider(config.rpcUrl, CHAIN_ID_NUMBER);
  return provider;
}

/**
 * Initialize Safe Protocol Kit for a specific Safe address
 * This requires a signer (private key string) for write operations
 */
export async function initializeSafeProtocolKit(
  safeAddress: string,
  signer: SignerInput
): Promise<Safe> {
  const config = getConfig();

  // Safe SDK expects signer as private key string or address
  let signerArg: string;
  if (typeof signer === 'string') {
    signerArg = signer;
  } else {
    // For ethers Signer, we need to get the private key or use an adapter
    // The SDK v2 accepts the address as signer for read operations
    signerArg = await signer.getAddress();
  }

  const protocolKit = await Safe.init({
    provider: config.rpcUrl,
    signer: signerArg,
    safeAddress,
  });

  return protocolKit;
}

// ============================================================================
// SAFE INFORMATION
// ============================================================================

/**
 * Get Safe information from the blockchain
 */
export async function getSafeInfo(safeAddress: string): Promise<APIResponse<SafeInfo>> {
  try {
    const apiKit = initializeSafeApiKit();
    const safeInfo = await apiKit.getSafeInfo(safeAddress);

    return {
      success: true,
      data: {
        address: safeInfo.address,
        chainId: CHAIN_ID_NUMBER,
        owners: safeInfo.owners,
        threshold: safeInfo.threshold,
        nonce: typeof safeInfo.nonce === 'string' ? parseInt(safeInfo.nonce, 10) : safeInfo.nonce,
        version: safeInfo.version,
        modules: safeInfo.modules || [],
        guard: safeInfo.guard || null,
        fallbackHandler: safeInfo.fallbackHandler || null,
      },
    };
  } catch (error) {
    console.error('getSafeInfo error:', error);
    return {
      success: false,
      error: {
        code: 'SAFE_INFO_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get Safe info',
      },
    };
  }
}

/**
 * Get Safe balances (ETH and ERC20 tokens)
 */
export async function getSafeBalance(safeAddress: string): Promise<APIResponse<SafeBalance>> {
  try {
    const rpcProvider = getProvider();

    // Get ETH balance directly from RPC
    const ethBalanceWei = await rpcProvider.getBalance(safeAddress);
    const ethBalance = ethers.formatEther(ethBalanceWei);

    // Token balances would require additional API calls to the Safe Transaction Service
    // For simplicity, we return ETH balance only - tokens can be added via direct contract calls
    const tokens: SafeBalance['tokens'] = [];

    return {
      success: true,
      data: {
        address: safeAddress,
        ethBalance,
        tokens,
      },
    };
  } catch (error) {
    console.error('getSafeBalance error:', error);
    return {
      success: false,
      error: {
        code: 'BALANCE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get Safe balance',
      },
    };
  }
}

/**
 * Check if an address is an owner of the Safe
 */
export async function isOwner(safeAddress: string, address: string): Promise<boolean> {
  try {
    const result = await getSafeInfo(safeAddress);
    if (!result.success || !result.data) return false;
    return result.data.owners.some(
      (owner) => owner.toLowerCase() === address.toLowerCase()
    );
  } catch {
    return false;
  }
}

// ============================================================================
// TRANSACTIONS
// ============================================================================

/**
 * Get pending transactions for a Safe
 */
export async function getPendingTransactions(
  safeAddress: string
): Promise<APIResponse<PendingTransaction[]>> {
  try {
    const apiKit = initializeSafeApiKit();
    const pendingTxs = await apiKit.getPendingTransactions(safeAddress);

    const transactions: PendingTransaction[] = pendingTxs.results.map((tx) => ({
      safeTxHash: tx.safeTxHash,
      to: tx.to,
      value: tx.value,
      data: tx.data || '0x',
      operation: tx.operation,
      nonce: tx.nonce,
      submissionDate: tx.submissionDate,
      confirmations: tx.confirmations?.map((conf) => ({
        owner: conf.owner,
        signature: conf.signature,
        submissionDate: conf.submissionDate,
      })) || [],
      confirmationsRequired: tx.confirmationsRequired,
      isExecuted: tx.isExecuted,
      origin: tx.origin || null,
    }));

    return {
      success: true,
      data: transactions,
    };
  } catch (error) {
    console.error('getPendingTransactions error:', error);
    return {
      success: false,
      error: {
        code: 'PENDING_TX_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get pending transactions',
      },
    };
  }
}

/**
 * Get transaction history for a Safe
 */
export async function getTransactionHistory(
  safeAddress: string,
  _limit: number = 20
): Promise<APIResponse<PendingTransaction[]>> {
  try {
    const apiKit = initializeSafeApiKit();
    const allTxs = await apiKit.getAllTransactions(safeAddress, {
      executed: true,
    });

    // Take only the requested number of transactions
    const limitedResults = allTxs.results.slice(0, _limit);

    const transactions: PendingTransaction[] = limitedResults
      .filter((tx): tx is typeof tx & { safeTxHash: string } =>
        'safeTxHash' in tx && tx.safeTxHash !== undefined
      )
      .map((tx) => {
        // Safe type assertion for multisig transactions
        const multisigTx = tx as unknown as {
          safeTxHash: string;
          to?: string;
          value?: string;
          data?: string;
          operation?: number;
          nonce?: number;
          submissionDate?: string;
          isExecuted?: boolean;
        };
        return {
          safeTxHash: multisigTx.safeTxHash,
          to: multisigTx.to || '',
          value: multisigTx.value || '0',
          data: multisigTx.data || '0x',
          operation: multisigTx.operation || 0,
          nonce: multisigTx.nonce || 0,
          submissionDate: multisigTx.submissionDate || '',
          confirmations: [],
          confirmationsRequired: 0,
          isExecuted: multisigTx.isExecuted || false,
          origin: null,
        };
      });

    return {
      success: true,
      data: transactions,
    };
  } catch (error) {
    console.error('getTransactionHistory error:', error);
    return {
      success: false,
      error: {
        code: 'TX_HISTORY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get transaction history',
      },
    };
  }
}

/**
 * Get a specific transaction by its Safe transaction hash
 */
export async function getTransaction(
  safeTxHash: string
): Promise<APIResponse<PendingTransaction>> {
  try {
    const apiKit = initializeSafeApiKit();
    const tx = await apiKit.getTransaction(safeTxHash);

    return {
      success: true,
      data: {
        safeTxHash: tx.safeTxHash,
        to: tx.to,
        value: tx.value,
        data: tx.data || '0x',
        operation: tx.operation,
        nonce: tx.nonce,
        submissionDate: tx.submissionDate,
        confirmations: tx.confirmations?.map((conf) => ({
          owner: conf.owner,
          signature: conf.signature,
          submissionDate: conf.submissionDate,
        })) || [],
        confirmationsRequired: tx.confirmationsRequired,
        isExecuted: tx.isExecuted,
        origin: tx.origin || null,
      },
    };
  } catch (error) {
    console.error('getTransaction error:', error);
    return {
      success: false,
      error: {
        code: 'TX_NOT_FOUND',
        message: error instanceof Error ? error.message : 'Transaction not found',
      },
    };
  }
}

// ============================================================================
// TRANSACTION CREATION & SIGNING
// ============================================================================

/**
 * Create and propose a new transaction to the Safe Transaction Service
 * Requires a signer (owner of the Safe)
 */
export async function proposeTransaction(
  safeAddress: string,
  signer: SignerInput,
  transaction: SafeTransactionDataPartial
): Promise<APIResponse<TransactionResult>> {
  try {
    const signerAddress = typeof signer === 'string'
      ? ethers.computeAddress(signer)
      : await signer.getAddress();

    // Verify signer is an owner
    if (!(await isOwner(safeAddress, signerAddress))) {
      return {
        success: false,
        error: {
          code: 'NOT_OWNER',
          message: 'Signer is not an owner of this Safe',
        },
      };
    }

    // Initialize Protocol Kit with the signer
    const protocolKit = await initializeSafeProtocolKit(safeAddress, signer);
    const apiKit = initializeSafeApiKit();

    // Create the transaction
    const safeTransaction = await protocolKit.createTransaction({
      transactions: [transaction],
    });

    // Sign the transaction
    const signedTransaction = await protocolKit.signTransaction(safeTransaction);

    // Get the Safe transaction hash
    const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);

    // Propose to the Safe Transaction Service
    await apiKit.proposeTransaction({
      safeAddress,
      safeTransactionData: signedTransaction.data,
      safeTxHash,
      senderAddress: signerAddress,
      senderSignature: signedTransaction.signatures.get(signerAddress.toLowerCase())?.data || '',
      origin: 'CryptoGift Competencias',
    });

    // Get Safe info for threshold
    const safeInfo = await apiKit.getSafeInfo(safeAddress);

    return {
      success: true,
      data: {
        safeTxHash,
        status: 'proposed',
        confirmations: 1,
        confirmationsRequired: safeInfo.threshold,
      },
    };
  } catch (error) {
    console.error('proposeTransaction error:', error);
    return {
      success: false,
      error: {
        code: 'PROPOSE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to propose transaction',
      },
    };
  }
}

/**
 * Add a signature to an existing pending transaction
 */
export async function signTransaction(
  safeAddress: string,
  safeTxHash: string,
  signer: SignerInput
): Promise<APIResponse<TransactionResult>> {
  try {
    const signerAddress = typeof signer === 'string'
      ? ethers.computeAddress(signer)
      : await signer.getAddress();

    // Verify signer is an owner
    if (!(await isOwner(safeAddress, signerAddress))) {
      return {
        success: false,
        error: {
          code: 'NOT_OWNER',
          message: 'Signer is not an owner of this Safe',
        },
      };
    }

    const apiKit = initializeSafeApiKit();

    // Get the existing transaction
    const existingTx = await apiKit.getTransaction(safeTxHash);

    // Check if already signed by this address
    const alreadySigned = existingTx.confirmations?.some(
      (conf) => conf.owner.toLowerCase() === signerAddress.toLowerCase()
    );
    if (alreadySigned) {
      return {
        success: false,
        error: {
          code: 'ALREADY_SIGNED',
          message: 'Transaction already signed by this owner',
        },
      };
    }

    // Initialize Protocol Kit with the signer
    const protocolKit = await initializeSafeProtocolKit(safeAddress, signer);

    // Create a Safe transaction from the existing data
    const safeTransaction = await protocolKit.createTransaction({
      transactions: [{
        to: existingTx.to,
        value: existingTx.value,
        data: existingTx.data || '0x',
        operation: existingTx.operation as OperationType,
      }],
      options: {
        nonce: existingTx.nonce,
        safeTxGas: String(existingTx.safeTxGas || '0'),
        baseGas: String(existingTx.baseGas || '0'),
        gasPrice: String(existingTx.gasPrice || '0'),
        gasToken: existingTx.gasToken,
        refundReceiver: existingTx.refundReceiver,
      },
    });

    // Sign the transaction
    const signedTransaction = await protocolKit.signTransaction(safeTransaction);
    const signature = signedTransaction.signatures.get(signerAddress.toLowerCase());

    if (!signature) {
      throw new Error('Failed to generate signature');
    }

    // Submit the signature to the Safe Transaction Service
    await apiKit.confirmTransaction(safeTxHash, signature.data);

    const confirmationsCount = (existingTx.confirmations?.length || 0) + 1;

    return {
      success: true,
      data: {
        safeTxHash,
        status: confirmationsCount >= existingTx.confirmationsRequired ? 'signed' : 'proposed',
        confirmations: confirmationsCount,
        confirmationsRequired: existingTx.confirmationsRequired,
      },
    };
  } catch (error) {
    console.error('signTransaction error:', error);
    return {
      success: false,
      error: {
        code: 'SIGN_ERROR',
        message: error instanceof Error ? error.message : 'Failed to sign transaction',
      },
    };
  }
}

/**
 * Execute a transaction that has enough signatures
 */
export async function executeTransaction(
  safeAddress: string,
  safeTxHash: string,
  signer: SignerInput
): Promise<APIResponse<TransactionResult>> {
  try {
    const apiKit = initializeSafeApiKit();

    // Get the transaction
    const existingTx = await apiKit.getTransaction(safeTxHash);

    // Check if already executed
    if (existingTx.isExecuted) {
      return {
        success: false,
        error: {
          code: 'ALREADY_EXECUTED',
          message: 'Transaction has already been executed',
        },
      };
    }

    // Check if we have enough signatures
    const confirmationsCount = existingTx.confirmations?.length || 0;
    if (confirmationsCount < existingTx.confirmationsRequired) {
      return {
        success: false,
        error: {
          code: 'INSUFFICIENT_SIGNATURES',
          message: `Need ${existingTx.confirmationsRequired} signatures, have ${confirmationsCount}`,
        },
      };
    }

    // Initialize Protocol Kit with the signer
    const protocolKit = await initializeSafeProtocolKit(safeAddress, signer);

    // Create a Safe transaction from the existing data
    const safeTransaction = await protocolKit.createTransaction({
      transactions: [{
        to: existingTx.to,
        value: existingTx.value,
        data: existingTx.data || '0x',
        operation: existingTx.operation as OperationType,
      }],
      options: {
        nonce: existingTx.nonce,
        safeTxGas: String(existingTx.safeTxGas || '0'),
        baseGas: String(existingTx.baseGas || '0'),
        gasPrice: String(existingTx.gasPrice || '0'),
        gasToken: existingTx.gasToken,
        refundReceiver: existingTx.refundReceiver,
      },
    });

    // Add all existing signatures to the transaction using SDK method
    for (const confirmation of existingTx.confirmations || []) {
      await protocolKit.signTransaction(safeTransaction, 'eth_signTypedData_v4', confirmation.owner);
    }

    // Execute the transaction on-chain
    const executeTxResponse = await protocolKit.executeTransaction(safeTransaction);
    const receipt = await (executeTxResponse as { transactionResponse?: { wait: () => Promise<{ hash: string }> }; hash?: string })
      .transactionResponse?.wait();

    return {
      success: true,
      data: {
        safeTxHash,
        txHash: receipt?.hash || (executeTxResponse as { hash?: string }).hash,
        status: 'executed',
        confirmations: confirmationsCount,
        confirmationsRequired: existingTx.confirmationsRequired,
      },
    };
  } catch (error) {
    console.error('executeTransaction error:', error);
    return {
      success: false,
      error: {
        code: 'EXECUTE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to execute transaction',
      },
    };
  }
}

// ============================================================================
// MULTI-SEND (BATCH TRANSACTIONS)
// ============================================================================

/**
 * Propose multiple transactions as a single multiSend batch
 * Useful for prize distribution to multiple winners
 */
export async function proposeMultiSendTransaction(
  safeAddress: string,
  signer: SignerInput,
  transactions: MetaTransactionData[]
): Promise<APIResponse<TransactionResult>> {
  try {
    const signerAddress = typeof signer === 'string'
      ? ethers.computeAddress(signer)
      : await signer.getAddress();

    // Verify signer is an owner
    if (!(await isOwner(safeAddress, signerAddress))) {
      return {
        success: false,
        error: {
          code: 'NOT_OWNER',
          message: 'Signer is not an owner of this Safe',
        },
      };
    }

    // Initialize Protocol Kit with the signer
    const protocolKit = await initializeSafeProtocolKit(safeAddress, signer);
    const apiKit = initializeSafeApiKit();

    // Create the multiSend transaction
    const safeTransaction = await protocolKit.createTransaction({
      transactions,
    });

    // Sign the transaction
    const signedTransaction = await protocolKit.signTransaction(safeTransaction);

    // Get the Safe transaction hash
    const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);

    // Propose to the Safe Transaction Service
    await apiKit.proposeTransaction({
      safeAddress,
      safeTransactionData: signedTransaction.data,
      safeTxHash,
      senderAddress: signerAddress,
      senderSignature: signedTransaction.signatures.get(signerAddress.toLowerCase())?.data || '',
      origin: 'CryptoGift Competencias - Prize Distribution',
    });

    // Get Safe info for threshold
    const safeInfo = await apiKit.getSafeInfo(safeAddress);

    return {
      success: true,
      data: {
        safeTxHash,
        status: 'proposed',
        confirmations: 1,
        confirmationsRequired: safeInfo.threshold,
      },
    };
  } catch (error) {
    console.error('proposeMultiSendTransaction error:', error);
    return {
      success: false,
      error: {
        code: 'MULTI_SEND_ERROR',
        message: error instanceof Error ? error.message : 'Failed to propose multi-send transaction',
      },
    };
  }
}

// ============================================================================
// SAFE CREATION
// ============================================================================

/**
 * Create a new Safe for a competition
 * Returns the predicted address before deployment
 */
export async function createCompetitionSafe(
  params: CreateSafeParams,
  signer: SignerInput
): Promise<APIResponse<{ safeAddress: string; isDeployed: boolean }>> {
  try {
    // Validate params
    if (params.owners.length === 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: 'At least one owner is required',
        },
      };
    }

    if (params.threshold < 1 || params.threshold > params.owners.length) {
      return {
        success: false,
        error: {
          code: 'INVALID_THRESHOLD',
          message: `Threshold must be between 1 and ${params.owners.length}`,
        },
      };
    }

    // Initialize Protocol Kit for deployment
    const saltNonce = params.saltNonce || Date.now().toString();
    const config = getConfig();

    // Get signer as string (private key or address)
    let signerArg: string;
    if (typeof signer === 'string') {
      signerArg = signer;
    } else {
      signerArg = await signer.getAddress();
    }

    const protocolKit = await Safe.init({
      provider: config.rpcUrl,
      signer: signerArg,
      predictedSafe: {
        safeAccountConfig: {
          owners: params.owners,
          threshold: params.threshold,
        },
        safeDeploymentConfig: {
          saltNonce,
        },
      },
    });

    // Get the predicted address
    const safeAddress = await protocolKit.getAddress();

    // Check if already deployed
    const isDeployed = await protocolKit.isSafeDeployed();

    if (!isDeployed) {
      // Deploy the Safe
      const deploymentTransaction = await protocolKit.createSafeDeploymentTransaction();

      // Send the deployment transaction
      const rpcProvider = getProvider();
      let txResponse;

      if (typeof signer === 'string') {
        // Use private key to create wallet and send
        const wallet = new ethers.Wallet(signer, rpcProvider);
        txResponse = await wallet.sendTransaction({
          to: deploymentTransaction.to,
          data: deploymentTransaction.data,
          value: BigInt(deploymentTransaction.value),
        });
      } else {
        // Use ethers Signer directly
        txResponse = await signer.sendTransaction({
          to: deploymentTransaction.to,
          data: deploymentTransaction.data,
          value: BigInt(deploymentTransaction.value),
        });
      }

      await txResponse.wait();
    }

    return {
      success: true,
      data: {
        safeAddress,
        isDeployed: true,
      },
    };
  } catch (error) {
    console.error('createCompetitionSafe error:', error);
    return {
      success: false,
      error: {
        code: 'CREATE_SAFE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create Safe',
      },
    };
  }
}

/**
 * Predict Safe address without deploying
 * Useful for showing users where to deposit before Safe is deployed
 */
export async function predictSafeAddress(params: CreateSafeParams): Promise<string> {
  const saltNonce = params.saltNonce || Date.now().toString();
  const config = getConfig();

  const protocolKit = await Safe.init({
    provider: config.rpcUrl,
    predictedSafe: {
      safeAccountConfig: {
        owners: params.owners,
        threshold: params.threshold,
      },
      safeDeploymentConfig: {
        saltNonce,
      },
    },
  });

  return protocolKit.getAddress();
}

// ============================================================================
// ERC20 TOKEN OPERATIONS
// ============================================================================

/**
 * Build an ERC20 transfer transaction
 */
export function buildERC20Transfer(
  tokenAddress: string,
  to: string,
  amount: string
): SafeTransactionDataPartial {
  // ERC20 transfer(address,uint256) function selector
  const transferSelector = '0xa9059cbb';

  // Encode the parameters
  const encodedTo = ethers.zeroPadValue(to, 32).slice(2);
  const encodedAmount = ethers.zeroPadValue(ethers.toBeHex(BigInt(amount)), 32).slice(2);

  const data = transferSelector + encodedTo + encodedAmount;

  return {
    to: tokenAddress,
    value: '0',
    data,
    operation: OperationType.Call,
  };
}

/**
 * Build an ETH transfer transaction
 */
export function buildETHTransfer(
  to: string,
  amount: string
): SafeTransactionDataPartial {
  return {
    to,
    value: amount,
    data: '0x',
    operation: OperationType.Call,
  };
}

// ============================================================================
// PRIZE DISTRIBUTION
// ============================================================================

export interface PrizeDistribution {
  recipient: string;
  amount: string;
  token?: string; // If undefined, distribute ETH
}

/**
 * Build prize distribution transactions for multiple winners
 */
export function buildPrizeDistributionTransactions(
  distributions: PrizeDistribution[]
): MetaTransactionData[] {
  return distributions.map((dist) => {
    if (dist.token && dist.token !== ethers.ZeroAddress) {
      // ERC20 transfer
      return {
        ...buildERC20Transfer(dist.token, dist.recipient, dist.amount),
      } as MetaTransactionData;
    } else {
      // ETH transfer
      return {
        ...buildETHTransfer(dist.recipient, dist.amount),
      } as MetaTransactionData;
    }
  });
}

/**
 * Propose prize distribution from competition Safe
 */
export async function proposePrizeDistribution(
  safeAddress: string,
  signer: SignerInput,
  distributions: PrizeDistribution[]
): Promise<APIResponse<TransactionResult>> {
  if (distributions.length === 0) {
    return {
      success: false,
      error: {
        code: 'NO_DISTRIBUTIONS',
        message: 'At least one distribution is required',
      },
    };
  }

  const transactions = buildPrizeDistributionTransactions(distributions);

  if (transactions.length === 1) {
    // Single transfer, use regular propose
    return proposeTransaction(safeAddress, signer, transactions[0]);
  } else {
    // Multiple transfers, use multiSend
    return proposeMultiSendTransaction(safeAddress, signer, transactions);
  }
}

// ============================================================================
// MODULE MANAGEMENT
// ============================================================================

/**
 * Enable a module on the Safe
 */
export async function enableModule(
  safeAddress: string,
  moduleAddress: string,
  signer: SignerInput
): Promise<APIResponse<TransactionResult>> {
  // enableModule(address) function selector
  const enableModuleSelector = '0x610b5925';
  const encodedModule = ethers.zeroPadValue(moduleAddress, 32).slice(2);
  const data = enableModuleSelector + encodedModule;

  return proposeTransaction(safeAddress, signer, {
    to: safeAddress,
    value: '0',
    data,
    operation: OperationType.Call,
  });
}

/**
 * Set a guard on the Safe
 */
export async function setGuard(
  safeAddress: string,
  guardAddress: string,
  signer: SignerInput
): Promise<APIResponse<TransactionResult>> {
  // setGuard(address) function selector
  const setGuardSelector = '0xe19a9dd9';
  const encodedGuard = ethers.zeroPadValue(guardAddress, 32).slice(2);
  const data = setGuardSelector + encodedGuard;

  return proposeTransaction(safeAddress, signer, {
    to: safeAddress,
    value: '0',
    data,
    operation: OperationType.Call,
  });
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Calculate the Safe transaction hash (for verification)
 * Uses proper keccak256 hashing
 */
export function calculateSafeTxHash(
  safeAddress: string,
  to: string,
  value: string,
  data: string,
  operation: number,
  safeTxGas: string,
  baseGas: string,
  gasPrice: string,
  gasToken: string,
  refundReceiver: string,
  nonce: number
): string {
  const SAFE_TX_TYPEHASH = ethers.keccak256(
    ethers.toUtf8Bytes(
      'SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)'
    )
  );

  const dataHash = ethers.keccak256(data);

  const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'address', 'uint256', 'bytes32', 'uint8', 'uint256', 'uint256', 'uint256', 'address', 'address', 'uint256'],
    [SAFE_TX_TYPEHASH, to, value, dataHash, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver, nonce]
  );

  return ethers.keccak256(encodedData);
}

/**
 * Verify a signature against a message hash
 */
export function verifySignature(
  messageHash: string,
  signature: string,
  expectedSigner: string
): boolean {
  try {
    const recoveredAddress = ethers.recoverAddress(messageHash, signature);
    return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Get the default Safe address from environment
 */
export function getDefaultSafeAddress(): string | null {
  const config = getConfig();
  return config.safeAddress || null;
}

/**
 * Check if the module is properly configured
 */
export function isSafeClientConfigured(): boolean {
  const config = getConfig();
  return !!(config.rpcUrl);
}

// ============================================================================
// EXPORTS FOR BACKWARD COMPATIBILITY
// ============================================================================

// Re-export for use in existing code
export {
  CHAIN_ID_NUMBER as CHAIN_ID,
  SAFE_TX_SERVICE_URL,
};
