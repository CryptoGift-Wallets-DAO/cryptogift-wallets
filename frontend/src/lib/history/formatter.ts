/**
 * Transaction Formatter
 * Utilities for formatting transaction data for display
 */

import { UnifiedTransaction, TransactionType, TransactionStatus } from './config';

/**
 * Format transaction for display
 */
export interface FormattedTransaction {
  hash: string;
  shortHash: string;
  type: string;
  typeLabel: string;
  status: TransactionStatus;
  statusLabel: string;
  statusColor: string;
  from: string;
  fromShort: string;
  to: string | null;
  toShort: string | null;
  value: string;
  formattedValue: string;
  tokenInfo?: {
    address: string;
    symbol?: string;
    amount?: string;
    formattedAmount?: string;
    tokenId?: string;
  };
  timestamp: number;
  formattedTime: string;
  relativeTime: string;
  gasUsed: string;
  formattedGas: string;
  explorerUrl?: string;
}

/**
 * Format hash for display
 */
export function formatHash(hash: string): string {
  if (!hash) return '';
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

/**
 * Format address for display
 */
export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format wei to ETH
 */
export function formatWei(wei: string, decimals: number = 18): string {
  if (!wei || wei === '0') return '0';
  
  const value = BigInt(wei);
  const divisor = BigInt(10 ** decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  
  // Format with up to 6 decimal places
  const fractionStr = fraction.toString().padStart(decimals, '0');
  const significantFraction = fractionStr.slice(0, 6).replace(/0+$/, '');
  
  if (significantFraction) {
    return `${whole}.${significantFraction}`;
  }
  
  return whole.toString();
}

/**
 * Format timestamp to relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  
  return new Date(timestamp * 1000).toLocaleDateString();
}

/**
 * Format timestamp to local time
 */
export function formatLocalTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

/**
 * Get transaction type label
 */
export function getTransactionTypeLabel(type: TransactionType): string {
  switch (type) {
    case TransactionType.NATIVE:
      return 'Transfer';
    case TransactionType.ERC20:
      return 'Token Transfer';
    case TransactionType.ERC721:
      return 'NFT Transfer';
    case TransactionType.ERC1155:
      return 'Multi-Token Transfer';
    case TransactionType.CONTRACT:
      return 'Contract Call';
    case TransactionType.INTERNAL:
      return 'Internal';
    default:
      return 'Transaction';
  }
}

/**
 * Get status color
 */
export function getStatusColor(status: TransactionStatus): string {
  switch (status) {
    case TransactionStatus.SUCCESS:
      return '#10b981'; // green
    case TransactionStatus.FAILED:
      return '#ef4444'; // red
    case TransactionStatus.PENDING:
      return '#f59e0b'; // yellow
    default:
      return '#6b7280'; // gray
  }
}

/**
 * Get explorer URL
 */
export function getExplorerUrl(hash: string, chainId: number): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io/tx/',
    11155111: 'https://sepolia.etherscan.io/tx/',
    8453: 'https://basescan.org/tx/',
    84532: 'https://sepolia.basescan.org/tx/',
  };
  
  const base = explorers[chainId];
  return base ? `${base}${hash}` : '';
}

/**
 * Format transaction for display
 */
export function formatTransaction(
  tx: UnifiedTransaction,
  chainId: number,
  nativeCurrency = 'ETH',
): FormattedTransaction {
  return {
    hash: tx.hash,
    shortHash: formatHash(tx.hash),
    type: tx.type,
    typeLabel: getTransactionTypeLabel(tx.type),
    status: tx.status,
    statusLabel: tx.status.charAt(0).toUpperCase() + tx.status.slice(1),
    statusColor: getStatusColor(tx.status),
    from: tx.from,
    fromShort: formatAddress(tx.from),
    to: tx.to,
    toShort: tx.to ? formatAddress(tx.to) : null,
    value: tx.value,
    formattedValue: `${formatWei(tx.value)} ${nativeCurrency}`,
    tokenInfo: tx.tokenAddress ? {
      address: tx.tokenAddress,
      symbol: tx.tokenSymbol,
      amount: tx.tokenAmount,
      formattedAmount: tx.tokenAmount && tx.tokenDecimals 
        ? `${formatWei(tx.tokenAmount, tx.tokenDecimals)} ${tx.tokenSymbol || 'tokens'}`
        : undefined,
      tokenId: tx.tokenId,
    } : undefined,
    timestamp: tx.timestamp,
    formattedTime: formatLocalTime(tx.timestamp),
    relativeTime: formatRelativeTime(tx.timestamp),
    gasUsed: tx.gasUsed,
    formattedGas: formatWei(tx.gasUsed),
    explorerUrl: getExplorerUrl(tx.hash, chainId),
  };
}

/**
 * Group transactions by date
 */
export function groupTransactionsByDate(
  transactions: FormattedTransaction[],
): Map<string, FormattedTransaction[]> {
  const groups = new Map<string, FormattedTransaction[]>();
  
  transactions.forEach(tx => {
    const date = new Date(tx.timestamp * 1000).toDateString();
    const group = groups.get(date) || [];
    group.push(tx);
    groups.set(date, group);
  });
  
  return groups;
}