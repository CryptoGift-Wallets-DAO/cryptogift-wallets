"use client";

import { createThirdwebClient } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';

// Mobile-optimized RPC endpoints with fallbacks
const MOBILE_RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_RPC_URL || 'https://base-sepolia.g.alchemy.com/v2/demo', // Primary Alchemy
  'https://sepolia.base.org',       // Base official
  'https://base-sepolia.blockpi.network/v1/rpc/public', // BlockPI public
  'https://base-sepolia.publicnode.com', // PublicNode
  'https://endpoints.omniatech.io/v1/base/sepolia/public' // Omnia
];

// Mobile detection utility
export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (window.innerWidth <= 768);
};

// Detect mobile wallet specifically
export const isMobileWallet = () => {
  if (typeof window === 'undefined') return false;
  return /MetaMask|TrustWallet|Coinbase|Rainbow|WalletConnect/i.test(navigator.userAgent);
};

// Enhanced RPC error detection with transaction-sent prevention
export const isRpcError = (error: any): boolean => {
  if (!error) return false;
  
  // Extract error code and message
  const errorCode = error.code || error.error?.code;
  const errorMessage = error.message?.toLowerCase() || error.toString().toLowerCase();
  
  // 🚨 CRITICAL: Transaction already sent indicators - DO NOT RETRY
  const transactionSentIndicators = [
    'transaction already exists',
    'already known',
    'already pending',
    'nonce already used',
    'transaction with same hash',
    'duplicate transaction',
    'already in mempool',
    'txn-mempool-conflict',
    'known transaction'
  ];
  
  if (transactionSentIndicators.some(indicator => errorMessage.includes(indicator))) {
    console.log(`🚨 Transaction already sent, preventing double execution: ${errorMessage.slice(0, 100)}`);
    return false; // Don't retry - transaction is already in mempool
  }
  
  // RPC-specific error codes (JSON-RPC specification)
  const rpcErrorCodes = [
    -32700, // Parse error
    -32600, // Invalid Request
    -32601, // Method not found
    -32602, // Invalid params
    -32603, // Internal error
    -32000, // Server error (custom range start)
    -32005, // Limit exceeded
    -32010  // Transaction pool full
  ];
  
  // If we have a specific RPC error code, it's definitely RPC-related
  if (errorCode && rpcErrorCodes.includes(errorCode)) {
    console.log(`🔍 RPC error detected by code: ${errorCode}`);
    return true;
  }
  
  // User error codes that should NOT trigger RPC fallback
  const userErrorCodes = [
    4001,  // User rejected request
    4100,  // Unauthorized
    4200,  // Unsupported method
    4900,  // Disconnected
    -32602 // Invalid params (user input issue)
  ];
  
  if (errorCode && userErrorCodes.includes(errorCode)) {
    console.log(`⚠️ User error detected, not RPC issue: ${errorCode}`);
    return false;
  }
  
  // Gas-related errors should not trigger RPC fallback
  const gasErrorIndicators = [
    'insufficient funds',
    'gas required exceeds allowance',
    'out of gas',
    'gas limit',
    'nonce too low',
    'replacement transaction underpriced'
  ];
  
  if (gasErrorIndicators.some(indicator => errorMessage.includes(indicator))) {
    console.log(`⛽ Gas/user error detected, not RPC issue: ${errorMessage.slice(0, 100)}`);
    return false;
  }
  
  // 🔄 Safe RPC retry indicators (connection issues only)
  const safeRetryIndicators = [
    'internal json-rpc error',
    'rpc error',
    'connection refused',
    'fetch failed',
    'etimedout',
    'bad gateway',
    'service unavailable',
    'too many requests',
    'rate limited',
    'node error',
    'provider error'
  ];
  
  const isSafeRetry = safeRetryIndicators.some(indicator => errorMessage.includes(indicator));
  
  // 🚫 Dangerous retry indicators (could indicate transaction was processed)
  const dangerousRetryIndicators = [
    'timeout',
    'network error',
    'execution reverted' // This could mean transaction was tried
  ];
  
  const isDangerousRetry = dangerousRetryIndicators.some(indicator => errorMessage.includes(indicator));
  
  if (isDangerousRetry) {
    console.log(`⚠️ Potentially dangerous retry scenario: ${errorMessage.slice(0, 100)}`);
    console.log(`🔍 Proceeding with caution - this could indicate transaction was processed`);
    return false; // Conservative approach - don't retry dangerous scenarios
  }
  
  if (isSafeRetry) {
    console.log(`📡 Safe RPC retry detected: ${errorMessage.slice(0, 100)}`);
  }
  
  return isSafeRetry;
};

// Create mobile-optimized ThirdWeb client
export const getMobileOptimizedClient = (fallbackIndex: number = 0) => {
  const rpcUrl = MOBILE_RPC_ENDPOINTS[fallbackIndex] || MOBILE_RPC_ENDPOINTS[0];
  
  console.log(`📱 Creating mobile-optimized client with RPC ${fallbackIndex + 1}:`, rpcUrl);
  
  return createThirdwebClient({
    clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
    secretKey: undefined, // Frontend client
  });
};

// Create mobile-optimized chain config
export const getMobileOptimizedChain = (fallbackIndex: number = 0) => {
  const rpcUrl = MOBILE_RPC_ENDPOINTS[fallbackIndex] || MOBILE_RPC_ENDPOINTS[0];
  
  return {
    ...baseSepolia,
    rpc: rpcUrl,
  };
};

// Get mobile-specific headers
export const getMobileHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache',
  };

  if (isMobileWallet()) {
    headers['X-Mobile-Wallet'] = 'true';
    headers['X-Request-Source'] = 'mobile-dapp';
    headers['User-Agent'] = 'CryptoGift-Mobile/1.0';
  }

  return headers;
};

// RPC endpoint metrics tracking
let rpcEndpointMetrics: Record<string, { success: number; failures: number; lastUsed: number }> = {};

// Track RPC endpoint performance
const trackRpcEndpoint = (endpoint: string, success: boolean) => {
  if (!rpcEndpointMetrics[endpoint]) {
    rpcEndpointMetrics[endpoint] = { success: 0, failures: 0, lastUsed: 0 };
  }
  
  const metrics = rpcEndpointMetrics[endpoint];
  metrics.lastUsed = Date.now();
  
  if (success) {
    metrics.success++;
    console.log(`📊 RPC endpoint ${endpoint} success (${metrics.success}s/${metrics.failures}f)`);
  } else {
    metrics.failures++;
    console.log(`📊 RPC endpoint ${endpoint} failed (${metrics.success}s/${metrics.failures}f)`);
  }
};

// Get RPC metrics for monitoring
export const getRpcMetrics = () => rpcEndpointMetrics;

// Enhanced retry logic with metrics and jitter
export const executeWithMobileRetry = async <T>(
  operation: (client: any, chain: any, attempt: number) => Promise<T>,
  maxRetries: number = 3
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const endpoint = MOBILE_RPC_ENDPOINTS[attempt] || MOBILE_RPC_ENDPOINTS[0];
    
    try {
      console.log(`📱 Mobile operation attempt ${attempt + 1}/${maxRetries} using: ${endpoint}`);
      
      const client = getMobileOptimizedClient(attempt);
      const chain = getMobileOptimizedChain(attempt);
      
      // Add exponential backoff with jitter for retries
      if (attempt > 0) {
        const baseDelay = 1000 * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 500; // Random 0-500ms jitter
        const delay = Math.min(baseDelay + jitter, 5000); // Max 5s delay
        console.log(`📱 Waiting ${Math.round(delay)}ms before retry (base: ${baseDelay}ms + jitter: ${Math.round(jitter)}ms)`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const result = await operation(client, chain, attempt);
      
      // Track successful endpoint usage
      trackRpcEndpoint(endpoint, true);
      
      if (attempt > 0) {
        console.log(`📱 Mobile operation succeeded on attempt ${attempt + 1} with endpoint: ${endpoint}`);
      }
      
      return result;
      
    } catch (error: any) {
      console.warn(`📱 Mobile operation attempt ${attempt + 1} failed with endpoint ${endpoint}:`, error.message);
      lastError = error;
      
      // Track failed endpoint usage
      trackRpcEndpoint(endpoint, false);
      
      // Enhanced error classification
      if (!isRpcError(error)) {
        console.log(`📱 Non-RPC error detected (code: ${error.code}), stopping retries:`, error.message?.slice(0, 100));
        throw error;
      }
      
      // If we're on the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        console.error(`📱 All mobile retry attempts exhausted. Final error from ${endpoint}:`, error.message);
        
        // Log metrics summary for debugging
        console.log('📊 Final RPC metrics:', Object.entries(rpcEndpointMetrics).map(([url, metrics]) => ({
          url,
          successRate: metrics.success / (metrics.success + metrics.failures) * 100
        })));
        
        throw error;
      }
    }
  }
  
  throw lastError;
};

// Wrapper for sendTransaction with mobile fallbacks
export const sendTransactionMobile = async (transaction: any, account: any) => {
  return executeWithMobileRetry(async (client, chain, attempt) => {
    console.log(`📱 Sending transaction (attempt ${attempt + 1}) via RPC:`, chain.rpc);
    
    // Import dynamically to avoid SSR issues
    const { sendTransaction } = await import('thirdweb');
    
    return sendTransaction({
      transaction: {
        ...transaction,
        chain: chain,
      },
      account,
    });
  });
};

// Wrapper for waitForReceipt with mobile fallbacks
export const waitForReceiptMobile = async (transactionHash: string) => {
  return executeWithMobileRetry(async (client, chain, attempt) => {
    console.log(`📱 Waiting for receipt (attempt ${attempt + 1}) via RPC:`, chain.rpc);
    
    // Import dynamically to avoid SSR issues
    const { waitForReceipt } = await import('thirdweb');
    
    return waitForReceipt({
      client,
      chain,
      transactionHash: transactionHash as `0x${string}`,
    });
  });
};

// Wrapper for contract calls with mobile fallbacks
export const executeContractCallMobile = async (contractCall: () => Promise<any>) => {
  return executeWithMobileRetry(async (client, chain, attempt) => {
    console.log(`📱 Executing contract call (attempt ${attempt + 1}) via RPC:`, chain.rpc);
    
    return contractCall();
  });
};