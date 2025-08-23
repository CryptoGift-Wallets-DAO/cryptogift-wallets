/**
 * MEV Protection Configuration
 * Chain-aware settings for Flashbots Protect RPC
 * 
 * IMPORTANT: Base and Base Sepolia are NOT supported yet
 * Only Ethereum mainnet (1) and Sepolia (11155111) have Protect RPC
 */

export type MEVProtectMode = 'off' | 'auto' | 'fast';

export interface MEVConfig {
  mode: MEVProtectMode;
  supportedChains: number[];
  rpcEndpoints: Record<number, string>;
  metricsEnabled: boolean;
}

// Parse supported chains from env
const parseSupportedChains = (): number[] => {
  const chainsEnv = process.env.NEXT_PUBLIC_MEV_PROTECT_SUPPORTED_CHAINS;
  if (!chainsEnv) return [1, 11155111]; // Default: mainnet + sepolia
  
  try {
    const parsed = JSON.parse(chainsEnv);
    return Array.isArray(parsed) ? parsed : [1, 11155111];
  } catch {
    console.warn('Invalid MEV_PROTECT_SUPPORTED_CHAINS format, using defaults');
    return [1, 11155111];
  }
};

// Get MEV protection config
export const getMEVConfig = (): MEVConfig => {
  const mode = (process.env.NEXT_PUBLIC_MEV_PROTECT_MODE as MEVProtectMode) || 'off';
  const supportedChains = parseSupportedChains();
  
  const rpcEndpoints: Record<number, string> = {};
  
  // Only add endpoints for supported chains
  if (supportedChains.includes(1)) {
    rpcEndpoints[1] = process.env.NEXT_PUBLIC_MEV_PROTECT_RPC_MAINNET || 'https://rpc.flashbots.net';
  }
  
  if (supportedChains.includes(11155111)) {
    rpcEndpoints[11155111] = process.env.NEXT_PUBLIC_MEV_PROTECT_RPC_SEPOLIA || 'https://rpc-sepolia.flashbots.net';
  }
  
  return {
    mode,
    supportedChains,
    rpcEndpoints,
    metricsEnabled: process.env.NEXT_PUBLIC_MEV_METRICS_ENABLED === 'true'
  };
};

// Check if MEV protection is available for a chain
export const isMEVProtectionAvailable = (chainId: number): boolean => {
  const config = getMEVConfig();
  return config.mode !== 'off' && config.supportedChains.includes(chainId);
};

// Get RPC endpoint for a chain (with MEV protection if available)
export const getMEVProtectedRPC = (chainId: number): string | null => {
  const config = getMEVConfig();
  
  if (config.mode === 'off') return null;
  if (!config.supportedChains.includes(chainId)) return null;
  
  const baseEndpoint = config.rpcEndpoints[chainId];
  if (!baseEndpoint) return null;
  
  // Add /fast suffix if in fast mode and mainnet
  if (config.mode === 'fast' && chainId === 1) {
    return `${baseEndpoint}/fast`;
  }
  
  return baseEndpoint;
};

// Chain names for UI display
export const getChainName = (chainId: number): string => {
  switch (chainId) {
    case 1: return 'Ethereum';
    case 11155111: return 'Sepolia';
    case 8453: return 'Base';
    case 84532: return 'Base Sepolia';
    default: return `Chain ${chainId}`;
  }
};

// Get MEV protection status message
export const getMEVProtectionStatus = (chainId: number): {
  available: boolean;
  message: string;
  color: 'green' | 'yellow' | 'red';
} => {
  const config = getMEVConfig();
  
  if (config.mode === 'off') {
    return {
      available: false,
      message: 'MEV Protection disabled',
      color: 'yellow'
    };
  }
  
  if (!config.supportedChains.includes(chainId)) {
    const chainName = getChainName(chainId);
    return {
      available: false,
      message: `MEV Protection not available on ${chainName}`,
      color: 'red'
    };
  }
  
  return {
    available: true,
    message: `MEV Protection active (${config.mode} mode)`,
    color: 'green'
  };
};