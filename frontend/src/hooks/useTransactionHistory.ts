/**
 * React Hook for Transaction History
 * Provides easy integration with components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useActiveWalletChain, useActiveAccount } from 'thirdweb/react';
import { TransactionScanner } from '@/lib/history/scanner';
import { formatTransaction, type FormattedTransaction } from '@/lib/history/formatter';
import { getHistoryConfig, isTransactionHistoryEnabled } from '@/lib/history/config';

// Temporary toast
const toast = {
  error: (msg: string) => console.error('❌', msg),
  info: (msg: string) => console.info('ℹ️', msg),
};

interface TransactionHistoryState {
  isEnabled: boolean;
  isLoading: boolean;
  transactions: FormattedTransaction[];
  error: string | null;
  hasMore: boolean;
  currentBlock: number;
  oldestBlock: number;
}

export function useTransactionHistory() {
  const chain = useActiveWalletChain();
  const account = useActiveAccount();
  const chainId = chain?.id;
  const address = account?.address;
  
  const [state, setState] = useState<TransactionHistoryState>({
    isEnabled: isTransactionHistoryEnabled(),
    isLoading: false,
    transactions: [],
    error: null,
    hasMore: true,
    currentBlock: 0,
    oldestBlock: 0,
  });
  
  const scannerRef = useRef<TransactionScanner | null>(null);
  const loadingRef = useRef(false);
  
  // Initialize scanner
  useEffect(() => {
    if (!scannerRef.current) {
      scannerRef.current = new TransactionScanner();
    }
  }, []);
  
  /**
   * Load transactions
   */
  const loadTransactions = useCallback(async (
    reset = false,
  ) => {
    if (!state.isEnabled || !address || !chainId) {
      return;
    }
    
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const config = getHistoryConfig();
      const scanner = scannerRef.current;
      if (!scanner) throw new Error('Scanner not initialized');
      
      // Calculate block range
      let toBlock = state.currentBlock;
      let fromBlock = state.oldestBlock;
      
      if (reset || toBlock === 0) {
        // Start from current block
        toBlock = undefined as any; // Will use current
        fromBlock = undefined as any; // Will calculate
      } else {
        // Load older transactions
        toBlock = state.oldestBlock - 1;
        fromBlock = Math.max(0, toBlock - config.maxBlockRange);
      }
      
      // Get transactions
      const rawTxs = await scanner.getTransactions(
        address,
        chainId,
        fromBlock,
        toBlock,
      );
      
      // Format transactions
      const formatted = rawTxs.map(tx => 
        formatTransaction(tx, chainId, chain?.nativeCurrency?.symbol || 'ETH')
      );
      
      // Update state
      setState(prev => ({
        ...prev,
        isLoading: false,
        transactions: reset ? formatted : [...prev.transactions, ...formatted],
        currentBlock: toBlock || prev.currentBlock,
        oldestBlock: fromBlock || prev.oldestBlock,
        hasMore: formatted.length === config.pageSize,
      }));
      
      if (formatted.length === 0 && !reset) {
        toast.info('No more transactions found');
      }
    } catch (error: any) {
      console.error('Failed to load transactions:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to load transactions',
      }));
      toast.error(error.message || 'Failed to load transactions');
    } finally {
      loadingRef.current = false;
    }
  }, [state.isEnabled, address, chainId, chain, state.currentBlock, state.oldestBlock]);
  
  /**
   * Refresh transactions
   */
  const refresh = useCallback(async () => {
    // Clear cache
    scannerRef.current?.clearCache();
    
    // Reset state
    setState(prev => ({
      ...prev,
      transactions: [],
      currentBlock: 0,
      oldestBlock: 0,
      hasMore: true,
    }));
    
    // Load fresh
    await loadTransactions(true);
  }, [loadTransactions]);
  
  /**
   * Load more (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!state.hasMore || state.isLoading) return;
    await loadTransactions(false);
  }, [state.hasMore, state.isLoading, loadTransactions]);
  
  /**
   * Auto-load on account/chain change
   */
  useEffect(() => {
    if (address && chainId && state.isEnabled) {
      refresh();
    }
  }, [address, chainId, state.isEnabled]);
  
  /**
   * Filter transactions
   */
  const filterTransactions = useCallback((
    filter: {
      type?: string;
      status?: string;
      direction?: 'sent' | 'received' | 'all';
    },
  ): FormattedTransaction[] => {
    let filtered = [...state.transactions];
    
    // Filter by type
    if (filter.type) {
      filtered = filtered.filter(tx => tx.type === filter.type);
    }
    
    // Filter by status
    if (filter.status) {
      filtered = filtered.filter(tx => tx.status === filter.status);
    }
    
    // Filter by direction
    if (filter.direction && filter.direction !== 'all' && address) {
      const addr = address.toLowerCase();
      if (filter.direction === 'sent') {
        filtered = filtered.filter(tx => tx.from.toLowerCase() === addr);
      } else if (filter.direction === 'received') {
        filtered = filtered.filter(tx => tx.to?.toLowerCase() === addr);
      }
    }
    
    return filtered;
  }, [state.transactions, address]);
  
  /**
   * Export transactions
   */
  const exportTransactions = useCallback((format: 'json' | 'csv') => {
    if (state.transactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }
    
    let content: string;
    let mimeType: string;
    let filename: string;
    
    if (format === 'json') {
      content = JSON.stringify(state.transactions, null, 2);
      mimeType = 'application/json';
      filename = `transactions-${chainId}-${Date.now()}.json`;
    } else {
      // CSV format
      const headers = ['Date', 'Type', 'Status', 'From', 'To', 'Value', 'Hash'];
      const rows = state.transactions.map(tx => [
        tx.formattedTime,
        tx.typeLabel,
        tx.statusLabel,
        tx.fromShort,
        tx.toShort || '',
        tx.formattedValue,
        tx.shortHash,
      ]);
      
      content = [headers, ...rows].map(row => row.join(',')).join('\n');
      mimeType = 'text/csv';
      filename = `transactions-${chainId}-${Date.now()}.csv`;
    }
    
    // Create download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.info(`Exported ${state.transactions.length} transactions`);
  }, [state.transactions, chainId]);
  
  return {
    // State
    ...state,
    
    // Actions
    refresh,
    loadMore,
    filterTransactions,
    exportTransactions,
    
    // Info
    address,
    chainId,
    chainName: chain?.name,
  };
}