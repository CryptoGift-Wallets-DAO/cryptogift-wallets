/**
 * Safe EIP-712 Signing Utilities
 *
 * This module provides utilities for signing Safe transactions using EIP-712.
 * Used by the frontend to sign transactions without needing the full Safe SDK.
 *
 * Based on Safe contracts v1.3.0 EIP-712 domain and types.
 */

// Safe EIP-712 Domain for Base Mainnet
export const getSafeDomain = (safeAddress: string, chainId: number = 8453) => ({
  chainId,
  verifyingContract: safeAddress as `0x${string}`,
});

// Safe Transaction EIP-712 Types
export const SafeTxTypes = {
  SafeTx: [
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'data', type: 'bytes' },
    { name: 'operation', type: 'uint8' },
    { name: 'safeTxGas', type: 'uint256' },
    { name: 'baseGas', type: 'uint256' },
    { name: 'gasPrice', type: 'uint256' },
    { name: 'gasToken', type: 'address' },
    { name: 'refundReceiver', type: 'address' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

// Safe Transaction Data structure
export interface SafeTransactionData {
  to: string;
  value: string;
  data: string;
  operation: number; // 0 = CALL, 1 = DELEGATECALL
  safeTxGas: string;
  baseGas: string;
  gasPrice: string;
  gasToken: string;
  refundReceiver: string;
  nonce: number;
}

/**
 * Create default Safe transaction data with sensible defaults
 */
export function createSafeTransactionData(
  params: {
    to: string;
    value?: string;
    data?: string;
    operation?: number;
    nonce: number;
  }
): SafeTransactionData {
  return {
    to: params.to,
    value: params.value || '0',
    data: params.data || '0x',
    operation: params.operation || 0, // CALL
    safeTxGas: '0',
    baseGas: '0',
    gasPrice: '0',
    gasToken: '0x0000000000000000000000000000000000000000',
    refundReceiver: '0x0000000000000000000000000000000000000000',
    nonce: params.nonce,
  };
}

/**
 * Calculate the Safe transaction hash (safeTxHash)
 * This is the hash that owners sign to approve a transaction
 */
export function calculateSafeTxHash(
  safeAddress: string,
  tx: SafeTransactionData,
  chainId: number = 8453
): string {
  // Domain separator components
  const domainSeparatorTypeHash = '0x47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a79469218';

  // SafeTx type hash
  const safeTxTypeHash = '0xbb8310d486368db6bd6f849402fdd73ad53d316b5a4b2644ad6efe0f941286d8';

  // This is a simplified version - in production, use ethers or viem for proper hashing
  // The actual calculation involves keccak256 hashing of encoded data

  // For now, we'll let the backend calculate this and return it
  // The frontend just needs to sign whatever hash the backend provides

  return ''; // Placeholder - backend calculates this
}

/**
 * Get EIP-712 typed data for signing a Safe transaction
 * This can be passed directly to wallet.signTypedData()
 */
export function getSafeTypedData(
  safeAddress: string,
  tx: SafeTransactionData,
  chainId: number = 8453
) {
  return {
    domain: getSafeDomain(safeAddress, chainId),
    types: SafeTxTypes,
    primaryType: 'SafeTx' as const,
    message: {
      to: tx.to as `0x${string}`,
      value: BigInt(tx.value),
      data: tx.data as `0x${string}`,
      operation: tx.operation,
      safeTxGas: BigInt(tx.safeTxGas),
      baseGas: BigInt(tx.baseGas),
      gasPrice: BigInt(tx.gasPrice),
      gasToken: tx.gasToken as `0x${string}`,
      refundReceiver: tx.refundReceiver as `0x${string}`,
      nonce: BigInt(tx.nonce),
    },
  };
}

/**
 * Sign a Safe transaction using EIP-712
 * @param account - ThirdWeb account with signTypedData method
 * @param safeAddress - Address of the Safe
 * @param tx - Transaction data
 * @param chainId - Chain ID (default: Base Mainnet 8453)
 */
export async function signSafeTransaction(
  account: { signTypedData: (params: { domain: any; types: any; primaryType: string; message: any }) => Promise<string> },
  safeAddress: string,
  tx: SafeTransactionData,
  chainId: number = 8453
): Promise<string> {
  const typedData = getSafeTypedData(safeAddress, tx, chainId);

  const signature = await account.signTypedData({
    domain: typedData.domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: typedData.message,
  });

  return signature;
}

/**
 * Sign a safeTxHash directly (for confirming existing transactions)
 * This is simpler than signing the full transaction data
 */
export async function signSafeTxHash(
  account: { signMessage: (params: { message: string | { raw: `0x${string}` } }) => Promise<string> },
  safeTxHash: string
): Promise<string> {
  // Safe uses eth_sign format which prepends the Ethereum Signed Message prefix
  // But for Safe confirmations, we sign the raw hash
  const signature = await account.signMessage({
    message: { raw: safeTxHash as `0x${string}` }
  });

  // Safe signatures need to be in a specific format
  // The signature from signMessage is already in the correct format (r, s, v)
  // But Safe expects v to be adjusted: v + 4 for eth_sign

  // Parse the signature
  const r = signature.slice(0, 66);
  const s = '0x' + signature.slice(66, 130);
  const v = parseInt(signature.slice(130, 132), 16);

  // Adjust v for eth_sign (add 4)
  const adjustedV = (v + 4).toString(16).padStart(2, '0');

  return r + s.slice(2) + adjustedV;
}
