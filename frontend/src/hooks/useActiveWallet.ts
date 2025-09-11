"use client";

import { useState, useEffect, useCallback } from 'react';
import { useActiveAccount } from 'thirdweb/react';

export interface TBAWallet {
  id: string;
  name: string;
  nftContract: string;
  tokenId: string;
  tbaAddress: string;
  image: string;
  isActive: boolean;
}

export function useActiveWallet() {
  const account = useActiveAccount();
  const [tbaWallet, setTbaWallet] = useState<TBAWallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSync, setLastSync] = useState<number | null>(null);

  // Load active TBA wallet from localStorage
  useEffect(() => {
    if (account?.address) {
      loadActiveTBAWallet();
    } else {
      setTbaWallet(null);
      setIsLoading(false);
    }
  }, [account]);

  const syncWithBackend = useCallback(async (address: string) => {
    try {
      setSyncStatus('syncing');
      
      // Ping backend to mark wallet as active
      const response = await fetch('/api/wallet/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          chainId: 84532, // Base Sepolia default
          syncBalances: false, // Quick sync without heavy balance calls
          syncTransactions: false,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSyncStatus('success');
          setLastSync(Date.now());
          console.log('[useActiveWallet] Backend sync successful:', data);
        } else {
          setSyncStatus('error');
          console.warn('[useActiveWallet] Backend sync failed:', data);
        }
      } else {
        setSyncStatus('error');
        console.warn('[useActiveWallet] Backend sync HTTP error:', response.status);
      }
    } catch (error) {
      setSyncStatus('error');
      console.error('[useActiveWallet] Backend sync error:', error);
    }
  }, []);

  // Periodic sync with backend (every 5 minutes)
  useEffect(() => {
    if (!account?.address) return;
    
    const interval = setInterval(() => {
      if (syncStatus !== 'syncing') {
        syncWithBackend(account.address);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [account?.address, syncStatus, syncWithBackend]);

  const loadActiveTBAWallet = async () => {
    try {
      setIsLoading(true);
      
      // Try to load from localStorage first
      const savedWalletId = localStorage.getItem('activeTBAWalletId');
      const savedWalletData = localStorage.getItem('activeTBAWalletData');
      
      if (savedWalletId && savedWalletData) {
        const walletData = JSON.parse(savedWalletData);
        setTbaWallet(walletData);
      }
      
      // Sync with backend if we have an active account
      if (account?.address) {
        await syncWithBackend(account.address);
      }
      
    } catch (error) {
      console.error('Error loading active TBA wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setActiveTBAWallet = async (wallet: TBAWallet | null) => {
    setTbaWallet(wallet);
    
    if (wallet) {
      localStorage.setItem('activeTBAWalletId', wallet.id);
      localStorage.setItem('activeTBAWalletData', JSON.stringify(wallet));
      // Sync TBA wallet activation with backend
      await syncWithBackend(wallet.tbaAddress);
    } else {
      localStorage.removeItem('activeTBAWalletId');
      localStorage.removeItem('activeTBAWalletData');
    }
  };

  const hasActiveTBAWallet = () => {
    return tbaWallet !== null;
  };

  const getWalletDisplayName = () => {
    if (tbaWallet) {
      return tbaWallet.name;
    }
    if (account?.address) {
      return `${account.address.slice(0, 6)}...${account.address.slice(-4)}`;
    }
    return 'No Wallet';
  };

  const getWalletType = (): 'EOA' | 'TBA' | 'NONE' => {
    if (tbaWallet) return 'TBA';
    if (account?.address) return 'EOA';
    return 'NONE';
  };

  return {
    // Current connected wallet (EOA)
    account,
    
    // Active TBA wallet (if any)
    tbaWallet,
    setActiveTBAWallet,
    hasActiveTBAWallet,
    
    // Helpers
    getWalletDisplayName,
    getWalletType,
    isLoading,
    
    // Backend sync status
    syncStatus,
    lastSync,
    syncWithBackend: useCallback((address?: string) => {
      const targetAddress = address || account?.address;
      if (targetAddress) {
        return syncWithBackend(targetAddress);
      }
      return Promise.resolve();
    }, [account?.address, syncWithBackend]),
    
    // For switching between wallets
    currentWalletAddress: tbaWallet?.tbaAddress || account?.address || null,
    currentWalletType: getWalletType(),
  };
}