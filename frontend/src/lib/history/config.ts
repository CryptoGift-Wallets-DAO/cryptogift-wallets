/**
 * Transaction History Configuration
 * Settings for consolidated on-chain transaction history
 */

/**
 * History configuration
 */
export interface HistoryConfig {
  enabled: boolean;
  maxBlockRange: number;
  pageSize: number;
  cacheEnabled: boolean;
  cacheTTL: number; // seconds
  includeInternal: boolean;
  includeTokenTransfers: boolean;
  includeNFTTransfers: boolean;
}

/**
 * Get history configuration from environment
 */
export function getHistoryConfig(): HistoryConfig {
  return {
    enabled: process.env.NEXT_PUBLIC_FEATURE_TX_HISTORY === 'on',
    maxBlockRange: parseInt(process.env.NEXT_PUBLIC_TX_HISTORY_MAX_BLOCKS || '10000'),
    pageSize: parseInt(process.env.NEXT_PUBLIC_TX_HISTORY_PAGE_SIZE || '20'),
    cacheEnabled: process.env.NEXT_PUBLIC_TX_HISTORY_CACHE !== 'off',
    cacheTTL: parseInt(process.env.NEXT_PUBLIC_TX_HISTORY_CACHE_TTL || '300'),
    includeInternal: process.env.NEXT_PUBLIC_TX_HISTORY_INTERNAL === 'on',
    includeTokenTransfers: process.env.NEXT_PUBLIC_TX_HISTORY_TOKENS !== 'off',
    includeNFTTransfers: process.env.NEXT_PUBLIC_TX_HISTORY_NFTS !== 'off',
  };
}

/**
 * Check if transaction history is enabled
 */
export function isTransactionHistoryEnabled(): boolean {
  return getHistoryConfig().enabled;
}

/**
 * Transaction types
 */
export enum TransactionType {
  NATIVE = 'native',
  ERC20 = 'erc20',
  ERC721 = 'erc721',
  ERC1155 = 'erc1155',
  CONTRACT = 'contract',
  INTERNAL = 'internal',
}

/**
 * Transaction status
 */
export enum TransactionStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
}

/**
 * Unified transaction interface
 */
export interface UnifiedTransaction {
  hash: string;
  type: TransactionType;
  status: TransactionStatus;
  from: string;
  to: string | null;
  value: string;
  tokenAddress?: string;
  tokenId?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  tokenAmount?: string;
  blockNumber: number;
  timestamp: number;
  gasUsed: string;
  gasPrice: string;
  nonce: number;
  input: string;
  methodId?: string;
  error?: string;
}