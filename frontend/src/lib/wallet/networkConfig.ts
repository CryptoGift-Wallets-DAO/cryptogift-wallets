/**
 * Network Configuration for wallet_addEthereumChain
 * Production-ready network parameters
 */

export interface NetworkConfig {
  chainId: string; // Hex format
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  iconUrls?: string[];
}

// Production network configurations
export const NETWORK_CONFIGS: Record<number, NetworkConfig> = {
  // Base Mainnet
  8453: {
    chainId: '0x2105',
    chainName: 'Base',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
    iconUrls: ['https://github.com/base-org/brand-kit/blob/main/logo/symbol/Base_Symbol_Blue.svg'],
  },
  
  // Base Sepolia Testnet
  84532: {
    chainId: '0x14A34',
    chainName: 'Base Sepolia',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [
      process.env.NEXT_PUBLIC_RPC_URL || 'https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e',
      'https://sepolia.base.org',
    ],
    blockExplorerUrls: ['https://sepolia.basescan.org'],
    iconUrls: ['https://github.com/base-org/brand-kit/blob/main/logo/symbol/Base_Symbol_Blue.svg'],
  },
  
  // Ethereum Mainnet (for reference)
  1: {
    chainId: '0x1',
    chainName: 'Ethereum Mainnet',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://eth.llamarpc.com'],
    blockExplorerUrls: ['https://etherscan.io'],
  },
  
  // Sepolia Testnet
  11155111: {
    chainId: '0x0AA36A7',
    chainName: 'Sepolia',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://sepolia.gateway.tenderly.co'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
  },
};

/**
 * Get network configuration by chain ID
 */
export function getNetworkConfig(chainId: number): NetworkConfig | null {
  return NETWORK_CONFIGS[chainId] || null;
}

/**
 * Convert decimal chain ID to hex
 */
export function toHexChainId(chainId: number): string {
  return '0x' + chainId.toString(16).toUpperCase();
}

/**
 * Check if network is supported
 */
export function isNetworkSupported(chainId: number): boolean {
  return chainId in NETWORK_CONFIGS;
}

/**
 * Get all supported networks
 */
export function getSupportedNetworks(): NetworkConfig[] {
  return Object.values(NETWORK_CONFIGS);
}

/**
 * Check if wallet management is enabled
 */
export function isWalletManagementEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_WALLET_MANAGEMENT === 'on';
}

/**
 * Check if auto-switch is enabled
 */
export function isAutoSwitchEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTO_SWITCH_NETWORK === 'true';
}

/**
 * Check if mobile deeplinks are enabled
 */
export function isMobileDeeplinksEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_MOBILE_DEEPLINKS === 'true';
}