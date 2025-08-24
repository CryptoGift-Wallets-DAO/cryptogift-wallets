/**
 * BICONOMY V2 - ROBUST GAS-PAID FALLBACK IMPLEMENTATION
 * Ensures all transactions work even when gasless fails
 * Priority: Gasless → Gas-paid fallback
 */

import { createWalletClient, http, parseEther } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import type { Account, Chain, Transport, WalletClient } from "viem";

// Biconomy configuration for Base Sepolia - SERVER-SIDE ONLY
export const biconomyConfig = {
  chainId: 84532, // Base Sepolia
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org',
  
  // MEE CONFIGURATION - SERVER ONLY (NEVER EXPOSE TO CLIENT)
  meeApiKey: process.env.BICONOMY_MEE_API_KEY,
  projectId: process.env.BICONOMY_PROJECT_ID,
  
  // LEGACY PAYMASTER FALLBACK - SERVER ONLY
  paymasterApiKey: process.env.BICONOMY_PAYMASTER_API_KEY,
  bundlerUrl: process.env.BICONOMY_BUNDLER_URL,
  paymasterUrl: process.env.BICONOMY_PAYMASTER_URL,
  
  // Gas-paid fallback configuration
  enableGasPaidFallback: true,
  maxGaslessRetries: 2,
  gaslessTimeout: 30000, // 30 seconds
};

interface TransactionRequest {
  to: string;
  data: string | (() => Promise<string>);
  value?: string;
  gas?: bigint;
  gasPrice?: bigint;
}

interface TransactionResult {
  transactionHash: string;
  receipt: any;
  isGasless: boolean;
  fallbackReason?: string;
}

interface SmartAccountWithFallback {
  type: 'smart' | 'fallback';
  getAccountAddress: () => Promise<string>;
  buildUserOp?: (transactions: any[]) => Promise<any>;
  sendUserOp?: (userOp: any) => Promise<any>;
  wallet: WalletClient<Transport, Chain, Account>;
  address: string;
}

/**
 * Create a wallet client for gas-paid transactions
 */
export function createGasPaidWallet(privateKey: string): WalletClient<Transport, Chain, Account> {
  const formattedPrivateKey = privateKey.startsWith('0x') 
    ? privateKey as `0x${string}`
    : `0x${privateKey}` as `0x${string}`;
    
  const account = privateKeyToAccount(formattedPrivateKey);
  
  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(biconomyConfig.rpcUrl),
  });
  
  return client as WalletClient<Transport, Chain, Account>;
}

/**
 * Try to import Biconomy SDK dynamically
 */
async function tryImportBiconomy() {
  try {
    // Try dynamic import - will fail if not installed
    const biconomyModule = await import('@biconomy/account');
    return biconomyModule;
  } catch (error) {
    console.log('⚠️ Biconomy SDK not installed - using gas-paid fallback only');
    return null;
  }
}

/**
 * Create Biconomy Smart Account with fallback
 */
export async function createBiconomySmartAccountWithFallback(privateKey: string) {
  const wallet = createGasPaidWallet(privateKey);
  
  // Try to create Biconomy smart account if SDK is available
  const biconomySdk = await tryImportBiconomy();
  
  if (biconomySdk && validateBiconomyConfig()) {
    try {
      console.log('🚀 Attempting to create Biconomy Smart Account...');
      
      const { createSmartAccountClient } = biconomySdk;
      
      // PRIORITY: Try MEE configuration first (SPONSORED)
      let config;
      if (biconomyConfig.meeApiKey && biconomyConfig.projectId) {
        console.log('✅ Using MEE configuration for SPONSORED transactions');
        config = {
          signer: wallet as any,
          chainId: biconomyConfig.chainId,
          bundlerUrl: `https://bundler.biconomy.io/api/v3/${biconomyConfig.chainId}/${biconomyConfig.meeApiKey}`,
          paymasterUrl: `https://paymaster.biconomy.io/api/v2/${biconomyConfig.chainId}/${biconomyConfig.meeApiKey}`,
        };
      } else if (biconomyConfig.paymasterApiKey) {
        console.log('✅ Using legacy Paymaster configuration');
        config = {
          signer: wallet as any,
          chainId: biconomyConfig.chainId,
          bundlerUrl: biconomyConfig.bundlerUrl,
          biconomyPaymasterApiKey: biconomyConfig.paymasterApiKey,
        };
      }
      
      if (config) {
        const smartAccount = await createSmartAccountClient(config);
        const address = await smartAccount.getAccountAddress();
        console.log('✅ Smart Account created:', address);
        
        return {
          type: 'biconomy' as const,
          smartAccount,
          wallet,
          address,
        };
      }
    } catch (error) {
      console.error('⚠️ Failed to create Biconomy Smart Account:', error);
      console.log('🔄 Falling back to gas-paid wallet...');
    }
  }
  
  // Return gas-paid wallet as fallback
  return {
    type: 'gas-paid' as const,
    smartAccount: null,
    wallet,
    address: wallet.account.address,
  };
}

/**
 * Send transaction with automatic gasless → gas-paid fallback
 */
export async function sendTransactionWithFallback(
  account: SmartAccountWithFallback,
  transaction: TransactionRequest
): Promise<TransactionResult> {
  console.log('📤 Sending transaction with fallback support...');
  
  // Resolve transaction data if it's a function
  let transactionData = "0x";
  if (transaction.data) {
    if (typeof transaction.data === 'function') {
      console.log("🔧 Resolving async data function...");
      transactionData = await transaction.data();
    } else {
      transactionData = transaction.data;
    }
  }
  
  const normalizedTx = {
    to: transaction.to as `0x${string}`,
    data: transactionData as `0x${string}`,
    value: transaction.value ? BigInt(transaction.value) : BigInt(0),
  };
  
  // STEP 1: Try gasless if available
  if (account.type === 'biconomy' && account.smartAccount) {
    try {
      console.log('🎯 Attempting gasless transaction...');
      
      const userOp = await account.smartAccount.buildUserOp([normalizedTx]);
      const userOpResponse = await account.smartAccount.sendUserOp(userOp);
      
      // Race between timeout and transaction
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gasless transaction timeout')), biconomyConfig.gaslessTimeout)
      );
      
      const receipt = await Promise.race([
        userOpResponse.wait(),
        timeoutPromise
      ]) as any;
      
      const txHash = receipt?.receipt?.transactionHash || receipt?.receipt?.hash || receipt?.userOpHash;
      
      console.log('✅ Gasless transaction successful:', txHash);
      
      return {
        transactionHash: txHash,
        receipt: receipt?.receipt || receipt,
        isGasless: true,
      };
    } catch (gaslessError) {
      console.error('⚠️ Gasless transaction failed:', gaslessError);
      console.log('🔄 Attempting gas-paid fallback...');
      
      // Continue to gas-paid fallback
      return sendGasPaidTransaction(account.wallet, normalizedTx, gaslessError.message);
    }
  }
  
  // STEP 2: Direct gas-paid transaction
  return sendGasPaidTransaction(account.wallet, normalizedTx, 'No gasless available');
}

/**
 * Send gas-paid transaction
 */
async function sendGasPaidTransaction(
  wallet: WalletClient<Transport, Chain, Account>,
  transaction: {
    to: `0x${string}`;
    data: `0x${string}`;
    value: bigint;
  },
  fallbackReason: string
): Promise<TransactionResult> {
  console.log('💰 Sending gas-paid transaction...');
  console.log('📍 Fallback reason:', fallbackReason);
  
  try {
    // Estimate gas using request method
    const gasEstimate = await wallet.request({
      method: 'eth_estimateGas',
      params: [{
        from: wallet.account!.address,
        to: transaction.to,
        data: transaction.data,
        value: transaction.value?.toString(),
      }],
    }) as bigint;
    
    console.log('⛽ Gas estimate:', gasEstimate.toString());
    
    // Send transaction using the account
    const hash = await wallet.sendTransaction({
      account: wallet.account!,
      to: transaction.to as `0x${string}`,
      data: transaction.data as `0x${string}`,
      value: transaction.value,
      gas: gasEstimate * BigInt(120) / BigInt(100), // 20% buffer
    });
    
    console.log('📮 Transaction sent:', hash);
    
    // Wait for confirmation using publicClient
    const { createPublicClient } = await import('viem');
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(biconomyConfig.rpcUrl),
    });
    
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
    });
    
    console.log('✅ Gas-paid transaction confirmed:', {
      hash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      status: receipt.status,
    });
    
    return {
      transactionHash: receipt.transactionHash,
      receipt: {
        transactionHash: receipt.transactionHash,
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed,
        status: receipt.status === 'success' ? 'success' : 'reverted',
        logs: receipt.logs,
      },
      isGasless: false,
      fallbackReason,
    };
  } catch (error) {
    console.error('❌ Gas-paid transaction failed:', error);
    throw new Error(`Transaction failed: ${error.message}`);
  }
}

/**
 * Check if Biconomy configuration is complete
 */
export function validateBiconomyConfig(): boolean {
  const meeApiKey = process.env.BICONOMY_MEE_API_KEY;
  const projectId = process.env.BICONOMY_PROJECT_ID;
  const paymasterKey = process.env.BICONOMY_PAYMASTER_API_KEY;
  
  // Log configuration status without exposing sensitive data
  console.log('🔍 BICONOMY CONFIG VALIDATION:', {
    meeApiKey: meeApiKey ? 'CONFIGURED' : 'MISSING',
    projectId: projectId ? 'CONFIGURED' : 'MISSING',
    paymasterKey: paymasterKey ? 'CONFIGURED' : 'MISSING',
    gasPaidFallback: 'ALWAYS AVAILABLE ✅',
  });
  
  // Return true if any Biconomy config is available
  return !!(meeApiKey && projectId) || !!paymasterKey;
}

/**
 * Quick check if gasless is potentially available
 */
export function isGaslessAvailable(): boolean {
  // Always return false for now until Biconomy SDK is properly installed
  // This ensures gas-paid is always used as primary method
  return false;
}

/**
 * Get transaction method that will be used
 */
export function getTransactionMethod(): 'gasless' | 'gas-paid' {
  if (isGaslessAvailable()) {
    return 'gasless';
  }
  return 'gas-paid';
}

// Export types for TypeScript
export type SmartAccountWithFallback = Awaited<ReturnType<typeof createBiconomySmartAccountWithFallback>>;