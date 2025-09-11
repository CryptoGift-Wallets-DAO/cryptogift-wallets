/**
 * GAS-PAID TRANSACTIONS - UNIFIED FUNCTIONS
 * Consolida todas las operaciones gas-paid en funciones reutilizables
 * Elimina duplicación de código y centraliza configuración
 */

import { createThirdwebClient, prepareContractCall } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { sendTransaction, waitForReceipt } from 'thirdweb/transaction';
import { ethers } from 'ethers';
import { 
  checkRateLimit,
  validateTransactionAttempt,
  registerTransactionAttempt,
  markTransactionCompleted,
  markTransactionFailed,
  verifyGaslessTransaction
} from './gaslessValidation';

// Types
export interface GasPaidTransactionConfig {
  userAddress: string;
  operationType: 'mint' | 'claim' | 'transfer' | 'return';
  operationId: string; // e.g., "mint_escrow_123", "claim_456"
  description: string;
  maxRetries?: number;
  gasLimit?: bigint;
}

export interface GasPaidTransactionResult {
  success: boolean;
  transactionHash?: string;
  receipt?: any;
  nonce?: string;
  error?: string;
  gasUsed?: bigint;
  blockNumber?: bigint;
}

export interface TransactionOptions {
  value?: bigint;
  gasLimit?: bigint;
  gasPrice?: bigint;
}

/**
 * Initialize ThirdWeb client (singleton)
 */
let _client: any = null;

function getThirdWebClient() {
  if (!_client) {
    if (!process.env.NEXT_PUBLIC_TW_CLIENT_ID) {
      throw new Error('NEXT_PUBLIC_TW_CLIENT_ID not configured');
    }
    
    _client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID
    });
    
    console.log('✅ ThirdWeb client initialized');
  }
  
  return _client;
}

/**
 * Get deployer account (singleton)
 */
let _deployerAccount: any = null;

function getDeployerAccount() {
  if (!_deployerAccount) {
    if (!process.env.PRIVATE_KEY_DEPLOY) {
      throw new Error('PRIVATE_KEY_DEPLOY not configured');
    }
    
    const client = getThirdWebClient();
    
    _deployerAccount = privateKeyToAccount({
      client,
      privateKey: process.env.PRIVATE_KEY_DEPLOY
    });
    
    console.log('✅ Deployer account initialized:', _deployerAccount.address.slice(0, 10) + '...');
  }
  
  return _deployerAccount;
}

/**
 * Enhanced rate limiting and validation for gas-paid transactions
 */
async function validateGasPaidTransaction(
  config: GasPaidTransactionConfig,
  additionalData?: any
): Promise<{
  valid: boolean;
  nonce?: string;
  reason?: string;
  rateLimit?: any;
}> {
  try {
    console.log(`🔍 VALIDATION: Starting for ${config.operationType} operation...`);
    
    // Step 1: Rate limiting check
    const rateLimit = checkRateLimit(config.userAddress);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      return {
        valid: false,
        reason: `Rate limit exceeded. Try again in ${resetTimeSeconds} seconds.`,
        rateLimit
      };
    }
    
    console.log('✅ Rate limit check passed. Remaining:', rateLimit.remaining);
    
    // Step 2: Anti-double transaction validation
    const validation = await validateTransactionAttempt(
      config.userAddress,
      config.operationId,
      0,
      additionalData || {}
    );
    
    if (!validation.valid) {
      return {
        valid: false,
        reason: validation.reason || 'Transaction validation failed',
        rateLimit
      };
    }
    
    console.log('✅ Anti-double transaction validation passed. Nonce:', validation.nonce.slice(0, 10) + '...');
    
    return {
      valid: true,
      nonce: validation.nonce,
      rateLimit
    };
    
  } catch (error) {
    console.error('❌ Gas-paid transaction validation error:', error);
    return {
      valid: false,
      reason: `Validation failed: ${(error as Error).message}`
    };
  }
}

/**
 * Execute gas-paid transaction with full error handling and retry logic
 */
export async function executeGasPaidTransaction(
  transaction: any, // ThirdWeb prepared contract call
  config: GasPaidTransactionConfig,
  options: TransactionOptions = {}
): Promise<GasPaidTransactionResult> {
  let transactionNonce = '';
  
  try {
    console.log(`🚀 GAS-PAID TRANSACTION: Starting ${config.operationType} operation`);
    console.log('📋 Config:', {
      userAddress: config.userAddress.slice(0, 10) + '...',
      operationType: config.operationType,
      operationId: config.operationId,
      description: config.description
    });
    
    // Step 1: Validate transaction attempt
    const validation = await validateGasPaidTransaction(config);
    
    if (!validation.valid) {
      return {
        success: false,
        error: validation.reason || 'Transaction validation failed'
      };
    }
    
    transactionNonce = validation.nonce!;
    
    // Step 2: Register transaction attempt
    await registerTransactionAttempt(
      config.userAddress,
      transactionNonce,
      config.operationId,
      0,
      { operationType: config.operationType, description: config.description }
    );
    
    // Step 3: Get appropriate account based on operation type
    let executingAccount: any;
    const client = getThirdWebClient();
    
    if (config.operationType === 'claim') {
      // CRITICAL FIX: Claims must use user account because claimGift() transfers NFT to msg.sender
      // If we use deployer account, NFT goes to deployer instead of user
      throw new Error('CRITICAL: Claims cannot use gas-paid server-side execution. Claims must be executed from frontend using user wallet to ensure NFT goes to correct recipient.');
    } else {
      // For minting, transfers, etc., deployer account is appropriate
      executingAccount = getDeployerAccount();
      console.log('🔑 Using deployer account for gas-paid transaction:', executingAccount.address.slice(0, 10) + '...');
    }
    
    // Step 4: Execute transaction with retry logic
    const maxRetries = config.maxRetries || 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📝 ATTEMPT ${attempt}/${maxRetries}: Executing ${config.operationType} transaction...`);
        
        // Send transaction
        const result = await sendTransaction({
          transaction,
          account: executingAccount,
          ...options
        });
        
        console.log('✅ Transaction sent, waiting for receipt...', result.transactionHash.slice(0, 10) + '...');
        
        // Wait for receipt
        const receipt = await waitForReceipt({
          client,
          chain: baseSepolia,
          transactionHash: result.transactionHash
        });
        
        // Verify transaction succeeded
        if (receipt.status !== 'success') {
          throw new Error(`Transaction failed with status: ${receipt.status}`);
        }
        
        console.log('✅ Gas-paid transaction successful:', {
          txHash: result.transactionHash.slice(0, 10) + '...',
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          attempt
        });
        
        // Step 5: Optional verification (for critical operations)
        // Note: 'claim' operations are blocked above, so only verify mint, transfer, return
        if (config.operationType === 'mint') {
          try {
            const verification = await verifyGaslessTransaction(
              result.transactionHash,
              config.userAddress,
              config.operationId.split('_').pop() || '0' // Extract tokenId if present
            );
            
            if (!verification.verified) {
              console.warn('⚠️ Transaction verification failed but transaction succeeded:', verification.error);
            }
          } catch (verifyError) {
            console.warn('⚠️ Transaction verification error (non-critical):', verifyError);
          }
        }
        
        // Step 6: Mark transaction as completed
        await markTransactionCompleted(transactionNonce, result.transactionHash);
        
        console.log('🎉 Gas-paid transaction completed successfully');
        
        return {
          success: true,
          transactionHash: result.transactionHash,
          receipt,
          nonce: transactionNonce,
          gasUsed: receipt.gasUsed,
          blockNumber: receipt.blockNumber
        };
        
      } catch (attemptError) {
        lastError = attemptError as Error;
        console.error(`❌ ATTEMPT ${attempt}/${maxRetries} FAILED:`, lastError.message);
        
        // Don't retry on certain errors
        if (lastError.message.includes('insufficient funds') || 
            lastError.message.includes('nonce too low') ||
            lastError.message.includes('invalid') ||
            lastError.message.includes('revert')) {
          console.error('🚫 NON-RETRYABLE ERROR: Not retrying');
          break;
        }
        
        // Exponential backoff for retryable errors
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`⏳ RETRY DELAY: Waiting ${delay}ms before attempt ${attempt + 1}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All attempts failed
    throw lastError || new Error('All transaction attempts failed');
    
  } catch (error: any) {
    console.error(`❌ Gas-paid ${config.operationType} transaction failed:`, error);
    
    // Mark transaction as failed if nonce was generated
    if (transactionNonce) {
      await markTransactionFailed(transactionNonce, error.message);
    }
    
    return {
      success: false,
      error: `${config.operationType} transaction failed: ${error.message}`,
      nonce: transactionNonce
    };
  }
}

/**
 * Specific helpers for common operations
 */

/**
 * Execute mint transaction with gas-paid flow
 */
export async function executeMintTransaction(
  mintTransaction: any,
  userAddress: string,
  tokenId?: string,
  additionalData?: any
): Promise<GasPaidTransactionResult> {
  const config: GasPaidTransactionConfig = {
    userAddress,
    operationType: 'mint',
    operationId: `mint_${tokenId || Date.now()}`,
    description: `Mint NFT ${tokenId ? `token ${tokenId}` : 'new token'}`,
    maxRetries: 3
  };
  
  return executeGasPaidTransaction(mintTransaction, config);
}

/**
 * Execute claim transaction with gas-paid flow
 */
export async function executeClaimTransaction(
  claimTransaction: any,
  userAddress: string,
  tokenId: string,
  password?: string
): Promise<GasPaidTransactionResult> {
  const config: GasPaidTransactionConfig = {
    userAddress,
    operationType: 'claim',
    operationId: `claim_${tokenId}`,
    description: `Claim escrow gift for token ${tokenId}`,
    maxRetries: 2 // Claims are more sensitive
  };
  
  // Pass additional data for validation
  const additionalData = password ? { tokenId, password } : { tokenId };
  
  // Execute with validation data
  const validation = await validateGasPaidTransaction(config, additionalData);
  
  if (!validation.valid) {
    return {
      success: false,
      error: validation.reason || 'Transaction validation failed'
    };
  }
  
  // Register and execute
  await registerTransactionAttempt(
    config.userAddress,
    validation.nonce!,
    config.operationId,
    0,
    additionalData
  );
  
  return executeGasPaidTransaction(claimTransaction, config);
}

/**
 * Execute transfer transaction with gas-paid flow
 */
export async function executeTransferTransaction(
  transferTransaction: any,
  userAddress: string,
  tokenId: string,
  recipientAddress: string
): Promise<GasPaidTransactionResult> {
  const config: GasPaidTransactionConfig = {
    userAddress,
    operationType: 'transfer',
    operationId: `transfer_${tokenId}`,
    description: `Transfer token ${tokenId} to ${recipientAddress.slice(0, 10)}...`,
    maxRetries: 2
  };
  
  return executeGasPaidTransaction(transferTransaction, config);
}

/**
 * Execute return expired gift transaction
 */
export async function executeReturnTransaction(
  returnTransaction: any,
  userAddress: string,
  giftId: string
): Promise<GasPaidTransactionResult> {
  const config: GasPaidTransactionConfig = {
    userAddress,
    operationType: 'return',
    operationId: `return_${giftId}`,
    description: `Return expired gift ${giftId}`,
    maxRetries: 2
  };
  
  return executeGasPaidTransaction(returnTransaction, config);
}

/**
 * Get gas estimation for transaction
 */
export async function estimateGasPaidTransaction(
  transaction: any
): Promise<{
  gasLimit: bigint;
  gasPrice: bigint;
  estimatedCost: bigint;
  error?: string;
}> {
  try {
    const deployerAccount = getDeployerAccount();
    
    // This would need to be implemented based on ThirdWeb's gas estimation
    // For now, return reasonable defaults with environment variable support
    const defaultGasLimit = process.env.NEXT_PUBLIC_DEFAULT_GAS_LIMIT || "500000";
    const defaultGasPrice = process.env.NEXT_PUBLIC_DEFAULT_GAS_PRICE || "20000000000"; // 20 gwei
    
    const gasLimit = BigInt(defaultGasLimit);
    const gasPrice = BigInt(defaultGasPrice);
    const estimatedCost = gasLimit * gasPrice;
    
    console.log('⛽ Gas estimation:', {
      gasLimit: gasLimit.toString(),
      gasPrice: gasPrice.toString(),
      estimatedCost: ethers.formatEther(estimatedCost) + ' ETH'
    });
    
    return {
      gasLimit,
      gasPrice,
      estimatedCost
    };
    
  } catch (error) {
    console.error('❌ Gas estimation failed:', error);
    const fallbackGasLimit = process.env.NEXT_PUBLIC_DEFAULT_GAS_LIMIT || "500000";
    const fallbackGasPrice = process.env.NEXT_PUBLIC_DEFAULT_GAS_PRICE || "20000000000";
    const fallbackEstimatedCost = process.env.NEXT_PUBLIC_FALLBACK_ESTIMATED_COST || "10000000000000000"; // 0.01 ETH
    
    return {
      gasLimit: BigInt(fallbackGasLimit),
      gasPrice: BigInt(fallbackGasPrice),
      estimatedCost: BigInt(fallbackEstimatedCost),
      error: (error as Error).message
    };
  }
}

/**
 * Batch execute multiple gas-paid transactions
 */
export async function executeBatchGasPaidTransactions(
  transactions: Array<{
    transaction: any;
    config: GasPaidTransactionConfig;
    options?: TransactionOptions;
  }>
): Promise<GasPaidTransactionResult[]> {
  console.log(`🔄 BATCH EXECUTION: Starting ${transactions.length} gas-paid transactions`);
  
  const results: GasPaidTransactionResult[] = [];
  
  // Execute sequentially to avoid nonce conflicts
  for (let i = 0; i < transactions.length; i++) {
    const { transaction, config, options } = transactions[i];
    
    console.log(`📋 BATCH ${i + 1}/${transactions.length}: ${config.operationType} - ${config.description}`);
    
    const result = await executeGasPaidTransaction(transaction, config, options);
    results.push(result);
    
    // If one fails, decide whether to continue or stop
    if (!result.success) {
      console.error(`❌ BATCH ${i + 1} FAILED: ${result.error}`);
      
      // For critical operations, stop on first failure
      if (config.operationType === 'claim' || config.operationType === 'mint') {
        console.error('🚨 CRITICAL OPERATION FAILED: Stopping batch execution');
        break;
      }
    }
    
    // Small delay between transactions
    if (i < transactions.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ BATCH EXECUTION COMPLETE: ${successCount}/${transactions.length} successful`);
  
  return results;
}

/**
 * Utility: Create standard transaction config
 */
export function createTransactionConfig(
  userAddress: string,
  operationType: GasPaidTransactionConfig['operationType'],
  identifier: string,
  description?: string
): GasPaidTransactionConfig {
  return {
    userAddress,
    operationType,
    operationId: `${operationType}_${identifier}`,
    description: description || `${operationType} operation for ${identifier}`,
    maxRetries: operationType === 'claim' || operationType === 'mint' ? 3 : 2
  };
}