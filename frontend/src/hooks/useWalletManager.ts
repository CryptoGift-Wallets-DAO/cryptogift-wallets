/**
 * React Hook for Wallet Network & Asset Management
 * Provides easy integration with components
 */

import { useState, useEffect, useCallback } from 'react';
import { useActiveWalletChain } from 'thirdweb/react';
import { 
  getWalletManager,
  type WalletManagerResult,
  WALLET_ERROR_CODES,
} from '@/lib/wallet/walletManager';
import { 
  getNetworkConfig,
  isWalletManagementEnabled,
  isAutoSwitchEnabled,
} from '@/lib/wallet/networkConfig';
import { getAssetConfig, getAvailableAssets } from '@/lib/wallet/assetConfig';

// Temporary toast
const toast = {
  success: (msg: string) => console.log('✅', msg),
  error: (msg: string) => console.error('❌', msg),
  warning: (msg: string) => console.warn('⚠️', msg),
  info: (msg: string) => console.info('ℹ️', msg),
};

interface WalletManagerState {
  isEnabled: boolean;
  currentChainId: number | null;
  isCorrectNetwork: boolean;
  isMobile: boolean;
  isMetaMaskMobile: boolean;
  pendingNetwork: number | null;
  pendingAsset: string | null;
  error: string | null;
}

export function useWalletManager(requiredChainId?: number) {
  const chain = useActiveWalletChain();
  const activeChainId = chain?.id;
  
  const [state, setState] = useState<WalletManagerState>({
    isEnabled: isWalletManagementEnabled(),
    currentChainId: activeChainId || null,
    isCorrectNetwork: !requiredChainId || activeChainId === requiredChainId,
    isMobile: false,
    isMetaMaskMobile: false,
    pendingNetwork: null,
    pendingAsset: null,
    error: null,
  });
  
  const manager = getWalletManager();
  
  // Update state when chain changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      currentChainId: activeChainId || null,
      isCorrectNetwork: !requiredChainId || activeChainId === requiredChainId,
    }));
  }, [activeChainId, requiredChainId]);
  
  // Check if mobile on mount
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isMobile: manager.isMobile(),
      isMetaMaskMobile: manager.isMetaMaskMobile(),
    }));
  }, [manager]);
  
  // Auto-switch network if enabled
  useEffect(() => {
    if (
      isAutoSwitchEnabled() &&
      requiredChainId &&
      activeChainId &&
      activeChainId !== requiredChainId &&
      !state.pendingNetwork
    ) {
      switchToRequiredNetwork();
    }
  }, [activeChainId, requiredChainId, state.pendingNetwork]);
  
  /**
   * Add a network to wallet
   */
  const addNetwork = useCallback(async (chainId: number): Promise<WalletManagerResult> => {
    setState(prev => ({ ...prev, pendingNetwork: chainId, error: null }));
    
    const result = await manager.addNetwork(chainId);
    
    if (result.success) {
      toast.success(`Network added successfully`);
    } else {
      toast.error(result.error || 'Failed to add network');
      setState(prev => ({ ...prev, error: result.error || null }));
    }
    
    setState(prev => ({ ...prev, pendingNetwork: null }));
    return result;
  }, [manager]);
  
  /**
   * Add an asset to wallet
   */
  const addAsset = useCallback(async (assetKey: string): Promise<WalletManagerResult> => {
    setState(prev => ({ ...prev, pendingAsset: assetKey, error: null }));
    
    const result = await manager.addAsset(assetKey);
    
    if (result.success) {
      const config = getAssetConfig(assetKey);
      toast.success(`${config?.options.symbol || 'Asset'} added to wallet`);
    } else {
      toast.error(result.error || 'Failed to add asset');
      setState(prev => ({ ...prev, error: result.error || null }));
    }
    
    setState(prev => ({ ...prev, pendingAsset: null }));
    return result;
  }, [manager]);
  
  /**
   * Switch to a specific network
   */
  const switchNetwork = useCallback(async (chainId: number): Promise<WalletManagerResult> => {
    setState(prev => ({ ...prev, pendingNetwork: chainId, error: null }));
    
    const result = await manager.switchNetwork(chainId);
    
    if (result.success) {
      toast.success('Network switched successfully');
    } else if (result.errorCode !== WALLET_ERROR_CODES.USER_REJECTED) {
      toast.error(result.error || 'Failed to switch network');
      setState(prev => ({ ...prev, error: result.error || null }));
    }
    
    setState(prev => ({ ...prev, pendingNetwork: null }));
    return result;
  }, [manager]);
  
  /**
   * Switch to required network
   */
  const switchToRequiredNetwork = useCallback(async () => {
    if (!requiredChainId) return;
    
    const result = await switchNetwork(requiredChainId);
    return result;
  }, [requiredChainId, switchNetwork]);
  
  /**
   * Add Base mainnet
   */
  const addBaseMainnet = useCallback(async () => {
    return addNetwork(8453);
  }, [addNetwork]);
  
  /**
   * Add Base Sepolia testnet
   */
  const addBaseSepolia = useCallback(async () => {
    return addNetwork(84532);
  }, [addNetwork]);
  
  /**
   * Add USDC token
   */
  const addUSDC = useCallback(async () => {
    return addAsset('USDC_BASE_SEPOLIA');
  }, [addAsset]);
  
  /**
   * Add Player token
   */
  const addPlayerToken = useCallback(async () => {
    return addAsset('PLAYER_TOKEN');
  }, [addAsset]);
  
  /**
   * Open mobile wallet
   */
  const openMobileWallet = useCallback(() => {
    manager.openMobileWallet();
  }, [manager]);
  
  /**
   * Get network info
   */
  const getNetworkInfo = useCallback((chainId: number) => {
    return getNetworkConfig(chainId);
  }, []);
  
  /**
   * Get available assets
   */
  const getAssets = useCallback(() => {
    return getAvailableAssets();
  }, []);
  
  return {
    // State
    ...state,
    
    // Actions
    addNetwork,
    addAsset,
    switchNetwork,
    switchToRequiredNetwork,
    
    // Quick actions
    addBaseMainnet,
    addBaseSepolia,
    addUSDC,
    addPlayerToken,
    
    // Mobile
    openMobileWallet,
    
    // Info
    getNetworkInfo,
    getAssets,
  };
}