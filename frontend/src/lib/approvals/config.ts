/**
 * Approvals/Allowances Configuration
 * Chain-aware configuration for token approval management
 */

export interface ApprovalsConfig {
  enabled: boolean;
  maxBlockRange: number;
  confirmations: number;
  cacheTTL: number;
  realtime: boolean;
  knownSpenders: {
    permit2: string;
    zeroXAllowance: string;
    [key: string]: string;
  };
}

// Known protocol contracts with labels
export const KNOWN_SPENDERS: Record<string, { label: string; risk: 'low' | 'medium' | 'high' | 'trusted' }> = {
  // Uniswap Permit2 - Widely used and trusted
  '0x000000000022d473030f116ddee9f6b43ac78ba3': {
    label: 'Uniswap Permit2',
    risk: 'trusted',
  },
  // 0x Protocol contracts
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff': {
    label: '0x Exchange Proxy',
    risk: 'trusted',
  },
  '0xf91bb752490473b8342a3e964e855b9f9a2a668e': {
    label: '0x Allowance Holder',
    risk: 'trusted',
  },
  // OpenSea Seaport
  '0x00000000000000adc04c56bf30ac9d3c0aaf14dc': {
    label: 'OpenSea Seaport',
    risk: 'trusted',
  },
  '0x1e0049783f008a0085193e00003d00cd54003c71': {
    label: 'OpenSea Conduit',
    risk: 'trusted',
  },
  // Blur marketplace
  '0x000000000000ad05ccc4f10045630fb830b95127': {
    label: 'Blur Marketplace',
    risk: 'trusted',
  },
  // 1inch Router
  '0x1111111254eeb25477b68fb85ed929f73a960582': {
    label: '1inch Router v5',
    risk: 'trusted',
  },
  // Curve Router
  '0x99a58482bd75cbab83b27ec03ca68ff489b5788f': {
    label: 'Curve Router',
    risk: 'trusted',
  },
};

// Chain-specific configurations
export const CHAIN_CONFIGS: Record<number, {
  startBlock?: number;
  rpcLimits: {
    maxBlockRange: number;
    maxLogs: number;
  };
}> = {
  // Ethereum Mainnet
  1: {
    startBlock: 17000000, // Recent block for faster initial scan
    rpcLimits: {
      maxBlockRange: 2000,
      maxLogs: 10000,
    },
  },
  // Sepolia Testnet
  11155111: {
    startBlock: 4000000,
    rpcLimits: {
      maxBlockRange: 5000,
      maxLogs: 10000,
    },
  },
  // Base Mainnet
  8453: {
    startBlock: 10000000,
    rpcLimits: {
      maxBlockRange: 10000,
      maxLogs: 10000,
    },
  },
  // Base Sepolia
  84532: {
    startBlock: 5000000,
    rpcLimits: {
      maxBlockRange: 10000,
      maxLogs: 10000,
    },
  },
};

/**
 * Get approvals configuration from environment
 */
export function getApprovalsConfig(): ApprovalsConfig {
  if (typeof window === 'undefined') {
    return getDefaultConfig();
  }

  const enabled = process.env.NEXT_PUBLIC_FEATURE_APPROVALS === 'on';
  
  return {
    enabled,
    maxBlockRange: parseInt(process.env.NEXT_PUBLIC_APPROVALS_MAX_BLOCK_RANGE || '5000'),
    confirmations: parseInt(process.env.NEXT_PUBLIC_APPROVALS_CONFIRMATIONS || '12'),
    cacheTTL: parseInt(process.env.NEXT_PUBLIC_APPROVALS_CACHE_TTL || '300'),
    realtime: process.env.NEXT_PUBLIC_APPROVALS_REALTIME === 'true',
    knownSpenders: {
      permit2: process.env.NEXT_PUBLIC_PERMIT2_ADDRESS || '0x000000000022D473030F116dDEE9F6B43aC78BA3',
      zeroXAllowance: process.env.NEXT_PUBLIC_0X_ALLOWANCE_HOLDER || '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
    },
  };
}

/**
 * Get default configuration
 */
function getDefaultConfig(): ApprovalsConfig {
  return {
    enabled: false,
    maxBlockRange: 5000,
    confirmations: 12,
    cacheTTL: 300,
    realtime: false,
    knownSpenders: {
      permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
      zeroXAllowance: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
    },
  };
}

/**
 * Check if approvals feature is enabled
 */
export function isApprovalsEnabled(): boolean {
  return getApprovalsConfig().enabled;
}

/**
 * Get chain-specific configuration
 */
export function getChainConfig(chainId: number) {
  return CHAIN_CONFIGS[chainId] || {
    rpcLimits: {
      maxBlockRange: 5000,
      maxLogs: 10000,
    },
  };
}

/**
 * Identify and label a spender address
 */
export function identifySpender(address: string): {
  label: string;
  risk: 'low' | 'medium' | 'high' | 'trusted' | 'unknown';
  isKnown: boolean;
} {
  const normalized = address.toLowerCase();
  const spender = KNOWN_SPENDERS[normalized];
  
  if (spender) {
    return {
      label: spender.label,
      risk: spender.risk,
      isKnown: true,
    };
  }
  
  return {
    label: 'Unknown Contract',
    risk: 'unknown',
    isKnown: false,
  };
}

/**
 * Calculate risk level based on allowance amount
 */
export function calculateRisk(
  allowance: bigint,
  totalSupply: bigint,
  spenderRisk: 'low' | 'medium' | 'high' | 'trusted' | 'unknown'
): 'low' | 'medium' | 'high' | 'critical' {
  // Max uint256 = infinite allowance = always high risk
  const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
  
  if (allowance === MAX_UINT256) {
    return spenderRisk === 'trusted' ? 'high' : 'critical';
  }
  
  // If spender is unknown, increase risk level
  if (spenderRisk === 'unknown') {
    if (allowance > totalSupply / BigInt(2)) return 'critical';
    if (allowance > totalSupply / BigInt(10)) return 'high';
    return 'medium';
  }
  
  // Trusted spenders have lower risk
  if (spenderRisk === 'trusted') {
    if (allowance === MAX_UINT256) return 'high';
    if (allowance > totalSupply / BigInt(2)) return 'medium';
    return 'low';
  }
  
  // Regular risk calculation
  if (allowance > totalSupply / BigInt(2)) return 'high';
  if (allowance > totalSupply / BigInt(10)) return 'medium';
  return 'low';
}