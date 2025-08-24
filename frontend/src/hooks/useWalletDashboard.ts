/**
 * Unified hook for Wallet Dashboard functionality
 * Ensures all components work correctly together
 */

import { useState, useEffect, useCallback } from 'react';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import { useWalletManager } from './useWalletManager';
import { useMEVProtection } from './useMEVProtection';
import { useApprovals } from './useApprovals';

export interface WalletDashboardState {
  isReady: boolean;
  isConnected: boolean;
  account: any;
  chainId: number;
  error: string | null;
  features: {
    mevProtection: boolean;
    approvals: boolean;
    networkManager: boolean;
    transactionHistory: boolean;
    swaps: boolean;
    gasless: boolean;
  };
}

export function useWalletDashboard() {
  const account = useActiveAccount();
  const chain = useActiveWalletChain();
  
  const [state, setState] = useState<WalletDashboardState>({
    isReady: false,
    isConnected: false,
    account: null,
    chainId: 84532,
    error: null,
    features: {
      mevProtection: false,
      approvals: false,
      networkManager: false,
      transactionHistory: false,
      swaps: false,
      gasless: false,
    }
  });

  // Feature hooks
  const walletManager = useWalletManager(84532);
  const mevProtection = useMEVProtection();
  const approvals = useApprovals();

  useEffect(() => {
    // Check connection
    const isConnected = !!account?.address;
    const chainId = chain?.id || 84532;

    // Verify features
    const features = {
      mevProtection: mevProtection.isAvailable,
      approvals: approvals.isEnabled,
      networkManager: walletManager.isEnabled,
      transactionHistory: true, // Always available
      swaps: chainId === 84532 || chainId === 8453, // Base networks only
      gasless: !!process.env.NEXT_PUBLIC_BICONOMY_MEE_API_KEY,
    };

    setState({
      isReady: true,
      isConnected,
      account,
      chainId,
      error: null,
      features
    });
  }, [account, chain, mevProtection.isAvailable, approvals.isEnabled, walletManager.isEnabled]);

  // Helper functions
  const switchNetwork = useCallback(async (targetChainId: number) => {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet detected');
      }

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
      
      return { success: true };
    } catch (error: any) {
      console.error('Network switch failed:', error);
      
      // If chain doesn't exist, try to add it
      if (error.code === 4902) {
        if (targetChainId === 84532) {
          // Add Base Sepolia
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x14a34',
              chainName: 'Base Sepolia',
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://sepolia.base.org'],
              blockExplorerUrls: ['https://sepolia.basescan.org'],
            }],
          });
          return { success: true };
        }
      }
      
      return { 
        success: false, 
        error: error.message || 'Failed to switch network' 
      };
    }
  }, []);

  const addToken = useCallback(async (tokenAddress: string, symbol: string, decimals: number) => {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet detected');
      }

      const wasAdded = await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: tokenAddress,
            symbol: symbol,
            decimals: decimals,
          },
        } as any,
      });

      return { success: wasAdded };
    } catch (error: any) {
      console.error('Add token failed:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to add token' 
      };
    }
  }, []);

  const checkFeatureStatus = useCallback(() => {
    const statusReport = {
      connection: state.isConnected ? '✅ Connected' : '❌ Not connected',
      network: state.chainId === 84532 ? '✅ Base Sepolia' : `⚠️ Wrong network (${state.chainId})`,
      mevProtection: state.features.mevProtection ? '✅ Available' : '⚠️ Not available on this network',
      approvals: state.features.approvals ? '✅ Enabled' : '❌ Disabled',
      networkManager: state.features.networkManager ? '✅ Enabled' : '❌ Disabled',
      transactionHistory: '✅ Available',
      swaps: state.features.swaps ? '✅ Available' : '❌ Not available on this network',
      gasless: state.features.gasless ? '✅ Configured' : '❌ Not configured',
    };

    console.log('🔍 Wallet Dashboard Status:');
    Object.entries(statusReport).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

    return statusReport;
  }, [state]);

  return {
    ...state,
    walletManager,
    mevProtection,
    approvals,
    switchNetwork,
    addToken,
    checkFeatureStatus,
  };
}