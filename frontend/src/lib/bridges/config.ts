/**
 * Bridge Configuration
 * LI.FI aggregator settings and allowed routes
 */

export const BRIDGE_CONFIG = {
  // Feature flag
  enabled: process.env.NEXT_PUBLIC_FEATURE_BRIDGE === 'on',
  
  // Provider
  provider: process.env.NEXT_PUBLIC_BRIDGE_PROVIDER || 'lifi',
  
  // Shadow mode (track but don't execute)
  shadowMode: process.env.NEXT_PUBLIC_BRIDGE_SHADOW_MODE === 'true',
  
  // LI.FI API endpoint
  lifi: {
    apiUrl: 'https://li.quest/v1',
    apiKey: process.env.NEXT_PUBLIC_LIFI_API_KEY, // Optional for now
  },
  
  // Supported chains
  chains: {
    ethereum: {
      id: 1,
      name: 'Ethereum',
      nativeCurrency: 'ETH',
      rpcUrl: 'https://eth.llamarpc.com',
      explorerUrl: 'https://etherscan.io',
    },
    base: {
      id: 8453,
      name: 'Base',
      nativeCurrency: 'ETH',
      rpcUrl: 'https://mainnet.base.org',
      explorerUrl: 'https://basescan.org',
    },
    baseSepolia: {
      id: 84532,
      name: 'Base Sepolia',
      nativeCurrency: 'ETH',
      rpcUrl: 'https://sepolia.base.org',
      explorerUrl: 'https://sepolia.basescan.org',
    },
    sepolia: {
      id: 11155111,
      name: 'Sepolia',
      nativeCurrency: 'ETH',
      rpcUrl: 'https://rpc.sepolia.org',
      explorerUrl: 'https://sepolia.etherscan.io',
    },
  },
  
  // Allowed tokens for bridging
  allowedTokens: (process.env.NEXT_PUBLIC_BRIDGE_ALLOWED_TOKENS || 'ETH,USDC')
    .split(',')
    .map(t => t.trim()),
  
  // Token addresses per chain
  tokens: {
    // Ethereum Mainnet
    1: {
      ETH: '0x0000000000000000000000000000000000000000',
      USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    },
    // Base
    8453: {
      ETH: '0x0000000000000000000000000000000000000000',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    },
    // Base Sepolia
    84532: {
      ETH: '0x0000000000000000000000000000000000000000',
      USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    },
    // Sepolia
    11155111: {
      ETH: '0x0000000000000000000000000000000000000000',
      USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    },
  },
  
  // Slippage settings
  slippage: {
    max: parseInt(process.env.NEXT_PUBLIC_BRIDGE_MAX_SLIPPAGE_BPS || '100', 10), // basis points
    default: 50, // 0.5%
    auto: true, // Auto-calculate based on route
  },
  
  // Allowed bridge protocols (security)
  allowedProtocols: (process.env.NEXT_PUBLIC_BRIDGE_ALLOWED_PROTOCOLS || 'hop,stargate,across')
    .split(',')
    .map(p => p.trim()),
  
  // Amount limits (USD)
  limits: {
    min: parseFloat(process.env.NEXT_PUBLIC_BRIDGE_MIN_AMOUNT_USD || '10'),
    max: parseFloat(process.env.NEXT_PUBLIC_BRIDGE_MAX_AMOUNT_USD || '10000'),
  },
  
  // Route preferences
  routePreferences: {
    maxSteps: 3, // Maximum hops
    preferDirectRoute: true,
    allowExchanges: true, // Allow DEX swaps in route
    sort: 'CHEAPEST', // CHEAPEST | FASTEST | SAFEST
  },
  
  // Security settings
  security: {
    requireApproval: true, // Always show approval step
    checkAllowance: true, // Check token allowances
    estimateBeforeExecute: true, // Final gas estimation
    trackingEnabled: true, // Track all transactions
  },
  
  // Telemetry events
  telemetry: {
    events: {
      QUOTE_REQUEST: 'bridge.quote.request',
      QUOTE_SUCCESS: 'bridge.quote.success',
      QUOTE_FAILURE: 'bridge.quote.failure',
      ROUTE_SELECTED: 'bridge.route.selected',
      EXECUTION_START: 'bridge.execution.start',
      EXECUTION_SUCCESS: 'bridge.execution.success',
      EXECUTION_FAILURE: 'bridge.execution.failure',
      APPROVAL_REQUEST: 'bridge.approval.request',
      APPROVAL_SUCCESS: 'bridge.approval.success',
    },
  },
};

/**
 * Get chain configuration
 */
export function getChainConfig(chainId: number) {
  return Object.values(BRIDGE_CONFIG.chains).find(chain => chain.id === chainId);
}

/**
 * Get token address for chain
 */
export function getTokenAddress(chainId: number, symbol: string): string | null {
  const tokens = BRIDGE_CONFIG.tokens[chainId as keyof typeof BRIDGE_CONFIG.tokens];
  if (!tokens) return null;
  
  return tokens[symbol as keyof typeof tokens] || null;
}

/**
 * Check if token is allowed for bridging
 */
export function isTokenAllowed(symbol: string): boolean {
  return BRIDGE_CONFIG.allowedTokens.includes(symbol.toUpperCase());
}

/**
 * Check if protocol is allowed
 */
export function isProtocolAllowed(protocol: string): boolean {
  return BRIDGE_CONFIG.allowedProtocols.includes(protocol.toLowerCase());
}

/**
 * Calculate slippage amount
 */
export function calculateSlippage(amount: bigint, bps: number = BRIDGE_CONFIG.slippage.default): bigint {
  return (amount * BigInt(bps)) / 10000n;
}

/**
 * Format bridge error messages
 */
export function formatBridgeError(error: any): string {
  if (typeof error === 'string') return error;
  
  // LI.FI specific errors
  if (error?.message?.includes('Insufficient liquidity')) {
    return 'Not enough liquidity for this route. Try a smaller amount.';
  }
  if (error?.message?.includes('No routes found')) {
    return 'No bridge routes available for this pair.';
  }
  if (error?.message?.includes('Slippage too high')) {
    return 'Price impact too high. Try a smaller amount.';
  }
  
  return error?.message || 'Bridge operation failed';
}