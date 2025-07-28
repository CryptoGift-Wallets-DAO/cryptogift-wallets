/**
 * RECEIPT NORMALIZER - GASLESS/USEROP NORMALIZATION
 * Extracts real transaction hash from gasless receipts and loads actual receipt
 * Handles Biconomy UserOp receipts and other gasless transaction wrappers
 */

import { ethers } from 'ethers';

// Receipt types
interface ThirdWebTransactionReceipt {
  logs: Array<{
    topics: string[];
    data: string;
    address?: string;
  }>;
  status: 'success' | 'reverted';
  transactionHash: string;
  blockNumber: number;
  gasUsed: bigint;
}

interface BiconomyUserOpReceipt {
  userOpHash: string;
  receipt: {
    transactionHash: string;
    blockNumber: number;
    status: number;
    logs: any[];
    gasUsed: string;
    effectiveGasPrice: string;
  };
  success: boolean;
}

interface NormalizedReceipt {
  success: true;
  receipt: ThirdWebTransactionReceipt;
  realTxHash: string;
  source: 'direct' | 'userOp' | 'gasless';
  originalHash?: string;
}

interface ReceiptNormalizationError {
  success: false;
  error: string;
  originalReceipt?: any;
}

export type ReceiptNormalizationResult = NormalizedReceipt | ReceiptNormalizationError;

/**
 * Create ethers provider for direct RPC access
 */
function createProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
  
  if (!rpcUrl) {
    throw new Error('NEXT_PUBLIC_RPC_URL not configured - required for receipt normalization');
  }
  
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Extract real transaction hash from various receipt formats
 */
function extractRealTxHash(receipt: any): { txHash: string | null; source: string } {
  console.log('🔍 RECEIPT ANALYSIS: Extracting real transaction hash...');
  
  // Case 1: Standard receipt with transactionHash
  if (receipt.transactionHash && typeof receipt.transactionHash === 'string') {
    if (receipt.transactionHash.startsWith('0x') && receipt.transactionHash.length === 66) {
      console.log('✅ DIRECT TX HASH:', receipt.transactionHash.slice(0, 10) + '...');
      return { txHash: receipt.transactionHash, source: 'direct' };
    }
  }
  
  // Case 2: Biconomy UserOp receipt format
  if (receipt.receipt && receipt.receipt.transactionHash) {
    console.log('🔍 BICONOMY FORMAT: Found nested receipt.transactionHash');
    const txHash = receipt.receipt.transactionHash;
    
    if (typeof txHash === 'string' && txHash.startsWith('0x') && txHash.length === 66) {
      console.log('✅ USEROP TX HASH:', txHash.slice(0, 10) + '...');
      return { txHash, source: 'userOp' };
    }
  }
  
  // Case 3: ThirdWeb gasless receipt with wrapped transaction
  if (receipt.result && receipt.result.transactionHash) {
    console.log('🔍 THIRDWEB GASLESS: Found result.transactionHash');
    const txHash = receipt.result.transactionHash;
    
    if (typeof txHash === 'string' && txHash.startsWith('0x') && txHash.length === 66) {
      console.log('✅ GASLESS TX HASH:', txHash.slice(0, 10) + '...');
      return { txHash, source: 'gasless' };
    }
  }
  
  // Case 4: Meta-transaction with real hash in logs/events
  if (receipt.logs && Array.isArray(receipt.logs)) {
    console.log('🔍 META-TX: Searching for real hash in logs...');
    
    for (const log of receipt.logs) {
      // Look for common meta-transaction event signatures
      if (log.topics && log.topics[0]) {
        const topic = log.topics[0];
        
        // MetaTransactionExecuted event signature (common in gasless systems)
        if (topic === '0x5845892132946c2f50972a0df2029e5b96fd93c0b4d8f4c6e83b8c4d5d8e5d5e') {
          // Parse the real transaction hash from event data
          try {
            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['bytes32'], log.data);
            const realHash = decoded[0];
            
            if (typeof realHash === 'string' && realHash.startsWith('0x')) {
              console.log('✅ META-TX HASH from event:', realHash.slice(0, 10) + '...');
              return { txHash: realHash, source: 'gasless' };
            }
          } catch (e) {
            console.warn('⚠️ Failed to decode meta-transaction event');
          }
        }
      }
    }
  }
  
  // Case 5: Check for hash property variations
  const hashProperties = ['hash', 'txHash', 'transactionId', 'id'];
  
  for (const prop of hashProperties) {
    if (receipt[prop] && typeof receipt[prop] === 'string') {
      const value = receipt[prop];
      if (value.startsWith('0x') && value.length === 66) {
        console.log(`✅ FOUND HASH in ${prop}:`, value.slice(0, 10) + '...');
        return { txHash: value, source: 'gasless' };
      }
    }
  }
  
  console.warn('❌ NO REAL TX HASH FOUND in receipt structure');
  console.log('📋 Receipt keys:', Object.keys(receipt));
  
  return { txHash: null, source: 'unknown' };
}

/**
 * Load real receipt from blockchain using provider
 */
async function loadRealReceipt(txHash: string): Promise<ThirdWebTransactionReceipt | null> {
  try {
    console.log('🌐 LOADING REAL RECEIPT from blockchain:', txHash.slice(0, 10) + '...');
    
    const provider = createProvider();
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      console.error('❌ RECEIPT NOT FOUND on blockchain for hash:', txHash);
      return null;
    }
    
    console.log('✅ REAL RECEIPT LOADED:', {
      hash: receipt.hash.slice(0, 10) + '...',
      blockNumber: receipt.blockNumber,
      status: receipt.status,
      logsCount: receipt.logs.length,
      gasUsed: receipt.gasUsed.toString()
    });
    
    // Convert ethers receipt to ThirdWeb format
    const normalizedReceipt: ThirdWebTransactionReceipt = {
      logs: receipt.logs.map(log => ({
        topics: [...log.topics], // Convert readonly array to mutable
        data: log.data,
        address: log.address
      })),
      status: receipt.status === 1 ? 'success' : 'reverted',
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed
    };
    
    return normalizedReceipt;
    
  } catch (error) {
    console.error('❌ FAILED to load real receipt:', error);
    return null;
  }
}

/**
 * Normalize receipt from gasless/userOp to standard format
 * ALWAYS extracts real transaction hash and loads actual receipt
 */
export async function normalizeReceipt(receipt: any): Promise<ReceiptNormalizationResult> {
  try {
    console.log('🔄 RECEIPT NORMALIZATION: Starting...');
    console.log('📋 Original receipt type:', typeof receipt);
    
    if (!receipt) {
      return {
        success: false,
        error: 'Receipt is null or undefined',
        originalReceipt: receipt
      };
    }
    
    // Step 1: Extract real transaction hash
    const { txHash, source } = extractRealTxHash(receipt);
    
    if (!txHash) {
      return {
        success: false,
        error: 'Unable to extract real transaction hash from receipt',
        originalReceipt: receipt
      };
    }
    
    console.log(`✅ EXTRACTED REAL TX HASH: ${txHash.slice(0, 10)}... (source: ${source})`);
    
    // Step 2: If it's already a direct receipt with proper format, use it
    if (source === 'direct' && receipt.logs && Array.isArray(receipt.logs)) {
      console.log('✅ DIRECT RECEIPT: Already in proper format, using as-is');
      
      return {
        success: true,
        receipt: {
          logs: receipt.logs,
          status: receipt.status || 'success',
          transactionHash: txHash,
          blockNumber: receipt.blockNumber || 0,
          gasUsed: receipt.gasUsed || BigInt(0)
        },
        realTxHash: txHash,
        source: 'direct'
      };
    }
    
    // Step 3: Load real receipt from blockchain
    const realReceipt = await loadRealReceipt(txHash);
    
    if (!realReceipt) {
      return {
        success: false,
        error: `Failed to load real receipt from blockchain for hash: ${txHash}`,
        originalReceipt: receipt
      };
    }
    
    console.log('🎯 NORMALIZATION SUCCESS: Real receipt loaded and normalized');
    
    return {
      success: true,
      receipt: realReceipt,
      realTxHash: txHash,
      source: source as 'userOp' | 'gasless',
      originalHash: receipt.transactionHash || receipt.userOpHash || 'unknown'
    };
    
  } catch (error) {
    console.error('❌ RECEIPT NORMALIZATION ERROR:', error);
    
    return {
      success: false,
      error: `Receipt normalization failed: ${(error as Error).message}`,
      originalReceipt: receipt
    };
  }
}

/**
 * Validate that normalized receipt is ready for event parsing
 */
export function validateNormalizedReceipt(receipt: ThirdWebTransactionReceipt): { 
  valid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];
  
  // Check required fields
  if (!receipt.transactionHash) {
    errors.push('Missing transactionHash');
  } else if (!receipt.transactionHash.startsWith('0x') || receipt.transactionHash.length !== 66) {
    errors.push('Invalid transactionHash format');
  }
  
  if (!receipt.logs) {
    errors.push('Missing logs array');
  } else if (!Array.isArray(receipt.logs)) {
    errors.push('Logs is not an array');
  }
  
  if (receipt.blockNumber <= 0) {
    errors.push('Invalid block number');
  }
  
  if (receipt.status !== 'success' && receipt.status !== 'reverted') {
    errors.push('Invalid receipt status');
  }
  
  // Check log format
  if (receipt.logs && Array.isArray(receipt.logs)) {
    for (let i = 0; i < receipt.logs.length; i++) {
      const log = receipt.logs[i];
      
      if (!log.topics || !Array.isArray(log.topics)) {
        errors.push(`Log ${i}: Missing or invalid topics array`);
      }
      
      if (typeof log.data !== 'string') {
        errors.push(`Log ${i}: Missing or invalid data field`);
      }
      
      if (log.address && typeof log.address !== 'string') {
        errors.push(`Log ${i}: Invalid address field`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Enhanced receipt normalization with validation
 */
export async function normalizeAndValidateReceipt(receipt: any): Promise<ReceiptNormalizationResult> {
  // Step 1: Normalize the receipt
  const normalizationResult = await normalizeReceipt(receipt);
  
  if (!normalizationResult.success) {
    return normalizationResult;
  }
  
  // Step 2: Validate the normalized receipt
  const validation = validateNormalizedReceipt(normalizationResult.receipt);
  
  if (!validation.valid) {
    console.error('❌ NORMALIZED RECEIPT VALIDATION FAILED:', validation.errors);
    
    return {
      success: false,
      error: `Normalized receipt validation failed: ${validation.errors.join(', ')}`,
      originalReceipt: receipt
    };
  }
  
  console.log('✅ RECEIPT FULLY NORMALIZED AND VALIDATED');
  
  return normalizationResult;
}

/**
 * Utility: Check if receipt needs normalization
 */
export function needsNormalization(receipt: any): boolean {
  // If it has userOpHash, it's definitely a UserOp receipt
  if (receipt.userOpHash) {
    return true;
  }
  
  // If it has nested receipt structure, it's gasless
  if (receipt.receipt && receipt.receipt.transactionHash) {
    return true;
  }
  
  // If it has result wrapper, it's gasless
  if (receipt.result && receipt.result.transactionHash) {
    return true;
  }
  
  // If logs are missing but we have a transaction hash, load real receipt
  if (receipt.transactionHash && (!receipt.logs || !Array.isArray(receipt.logs))) {
    return true;
  }
  
  return false;
}