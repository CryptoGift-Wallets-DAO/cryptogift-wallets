/**
 * Wallet Manager Service
 * Handles wallet_addEthereumChain and wallet_watchAsset with mobile support
 */

import { getNetworkConfig, type NetworkConfig } from './networkConfig';
import { getAssetConfig, isNFTAsset, type AssetConfig } from './assetConfig';

// Error codes from MetaMask docs
export const WALLET_ERROR_CODES = {
  USER_REJECTED: 4001,
  UNAUTHORIZED: 4100,
  UNSUPPORTED_METHOD: 4200,
  DISCONNECTED: 4900,
  CHAIN_DISCONNECTED: 4901,
  UNRECOGNIZED_CHAIN: 4902,
  ALREADY_PENDING: -32002,
} as const;

export interface WalletManagerResult {
  success: boolean;
  error?: string;
  errorCode?: number;
  txHash?: string;
}

export class WalletManager {
  private ethereum: any;
  private pendingRequests = new Set<string>();
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.ethereum = (window as any).ethereum;
    }
  }
  
  /**
   * Check if wallet is available
   */
  isWalletAvailable(): boolean {
    return !!this.ethereum;
  }
  
  /**
   * Check if running on mobile
   */
  isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  }
  
  /**
   * Check if MetaMask Mobile
   */
  isMetaMaskMobile(): boolean {
    if (!this.ethereum) return false;
    return this.ethereum.isMetaMask && this.isMobile();
  }
  
  /**
   * Add a network to wallet
   */
  async addNetwork(chainId: number): Promise<WalletManagerResult> {
    if (!this.isWalletAvailable()) {
      return {
        success: false,
        error: 'No wallet detected. Please install MetaMask or another Web3 wallet.',
      };
    }
    
    const config = getNetworkConfig(chainId);
    if (!config) {
      return {
        success: false,
        error: `Network configuration not found for chain ID ${chainId}`,
      };
    }
    
    // Check if request is already pending
    const requestKey = `addChain-${chainId}`;
    if (this.pendingRequests.has(requestKey)) {
      return {
        success: false,
        error: 'Request already pending. Please check your wallet.',
        errorCode: WALLET_ERROR_CODES.ALREADY_PENDING,
      };
    }
    
    this.pendingRequests.add(requestKey);
    
    try {
      // First try to switch to the network
      try {
        await this.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: config.chainId }],
        });
        
        return { success: true };
      } catch (switchError: any) {
        // If chain doesn't exist, add it
        if (switchError.code === WALLET_ERROR_CODES.UNRECOGNIZED_CHAIN) {
          await this.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [config],
          });
          
          return { success: true };
        }
        
        throw switchError;
      }
    } catch (error: any) {
      console.error('Failed to add network:', error);
      
      return {
        success: false,
        error: this.getErrorMessage(error),
        errorCode: error.code,
      };
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  }
  
  /**
   * Add an asset to wallet
   */
  async addAsset(assetKey: string): Promise<WalletManagerResult> {
    if (!this.isWalletAvailable()) {
      return {
        success: false,
        error: 'No wallet detected. Please install MetaMask or another Web3 wallet.',
      };
    }
    
    const config = getAssetConfig(assetKey);
    if (!config) {
      return {
        success: false,
        error: `Asset configuration not found for ${assetKey}`,
      };
    }
    
    // Check NFT support
    if (isNFTAsset(config)) {
      if (this.isMobile()) {
        return {
          success: false,
          error: 'NFT addition is not supported on mobile wallets. Please use the desktop extension.',
        };
      }
      
      // NFT support is experimental even on desktop
      console.warn('NFT watchAsset is experimental and may not work on all wallets');
    }
    
    // Check if request is already pending
    const requestKey = `watchAsset-${config.options.address}`;
    if (this.pendingRequests.has(requestKey)) {
      return {
        success: false,
        error: 'Request already pending. Please check your wallet.',
        errorCode: WALLET_ERROR_CODES.ALREADY_PENDING,
      };
    }
    
    this.pendingRequests.add(requestKey);
    
    try {
      const result = await this.ethereum.request({
        method: 'wallet_watchAsset',
        params: config as any,
      });
      
      if (result) {
        return { success: true };
      } else {
        return {
          success: false,
          error: 'Asset addition was rejected',
        };
      }
    } catch (error: any) {
      console.error('Failed to add asset:', error);
      
      return {
        success: false,
        error: this.getErrorMessage(error),
        errorCode: error.code,
      };
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  }
  
  /**
   * Get current chain ID
   */
  async getCurrentChainId(): Promise<number | null> {
    if (!this.isWalletAvailable()) return null;
    
    try {
      const chainIdHex = await this.ethereum.request({ method: 'eth_chainId' });
      return parseInt(chainIdHex, 16);
    } catch (error) {
      console.error('Failed to get chain ID:', error);
      return null;
    }
  }
  
  /**
   * Switch to a specific network
   */
  async switchNetwork(chainId: number): Promise<WalletManagerResult> {
    if (!this.isWalletAvailable()) {
      return {
        success: false,
        error: 'No wallet detected',
      };
    }
    
    const config = getNetworkConfig(chainId);
    if (!config) {
      return {
        success: false,
        error: `Network configuration not found for chain ID ${chainId}`,
      };
    }
    
    try {
      await this.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: config.chainId }],
      });
      
      return { success: true };
    } catch (error: any) {
      // If network doesn't exist, try to add it
      if (error.code === WALLET_ERROR_CODES.UNRECOGNIZED_CHAIN) {
        return this.addNetwork(chainId);
      }
      
      return {
        success: false,
        error: this.getErrorMessage(error),
        errorCode: error.code,
      };
    }
  }
  
  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: any): string {
    if (!error) return 'Unknown error occurred';
    
    switch (error.code) {
      case WALLET_ERROR_CODES.USER_REJECTED:
        return 'Request was rejected by user';
      case WALLET_ERROR_CODES.UNAUTHORIZED:
        return 'Unauthorized request';
      case WALLET_ERROR_CODES.UNSUPPORTED_METHOD:
        return 'Method not supported by wallet';
      case WALLET_ERROR_CODES.DISCONNECTED:
        return 'Wallet is disconnected';
      case WALLET_ERROR_CODES.CHAIN_DISCONNECTED:
        return 'Chain is disconnected';
      case WALLET_ERROR_CODES.UNRECOGNIZED_CHAIN:
        return 'Chain not recognized by wallet';
      case WALLET_ERROR_CODES.ALREADY_PENDING:
        return 'Request already pending. Please check your wallet.';
      default:
        return error.message || 'Transaction failed';
    }
  }
  
  /**
   * Create mobile deep link for MetaMask
   */
  createMetaMaskDeepLink(dappUrl: string): string {
    const baseUrl = 'https://metamask.app.link/dapp/';
    return `${baseUrl}${encodeURIComponent(dappUrl)}`;
  }
  
  /**
   * Open wallet on mobile
   */
  openMobileWallet(): void {
    if (!this.isMobile()) return;
    
    const currentUrl = window.location.href;
    const deepLink = this.createMetaMaskDeepLink(currentUrl);
    
    window.location.href = deepLink;
  }
}

// Singleton instance
let walletManager: WalletManager | null = null;

/**
 * Get wallet manager instance
 */
export function getWalletManager(): WalletManager {
  if (!walletManager) {
    walletManager = new WalletManager();
  }
  return walletManager;
}

/**
 * Quick helpers
 */
export async function addBaseNetwork(): Promise<WalletManagerResult> {
  return getWalletManager().addNetwork(8453);
}

export async function addBaseSepoliaNetwork(): Promise<WalletManagerResult> {
  return getWalletManager().addNetwork(84532);
}

export async function addUSDCToken(): Promise<WalletManagerResult> {
  return getWalletManager().addAsset('USDC_BASE_SEPOLIA');
}