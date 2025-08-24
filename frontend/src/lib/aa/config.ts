/**
 * Account Abstraction Configuration
 * ERC-4337 with Pimlico for Base & Base Sepolia
 */

// Chain IDs
export const CHAIN_IDS = {
  BASE: 8453,
  BASE_SEPOLIA: 84532,
} as const;

// AA Configuration
export const AA_CONFIG = {
  // Feature flags
  enabled: process.env.NEXT_PUBLIC_FEATURE_AA === 'on',
  erc20PaymasterEnabled: process.env.NEXT_PUBLIC_FEATURE_ERC20_PAYMASTER === 'on',
  sessionKeysEnabled: process.env.NEXT_PUBLIC_FEATURE_SESSION_KEYS === 'on',
  recoveryEnabled: process.env.NEXT_PUBLIC_FEATURE_RECOVERY === 'on',
  
  // Pimlico configuration
  pimlico: {
    // API endpoints (v2 for ERC-4337)
    apiUrl: {
      [CHAIN_IDS.BASE]: 'https://api.pimlico.io/v2/base',
      [CHAIN_IDS.BASE_SEPOLIA]: 'https://api.pimlico.io/v2/base-sepolia',
    },
    
    // Bundler RPC endpoints
    bundlerUrl: {
      [CHAIN_IDS.BASE]: `https://api.pimlico.io/v2/base/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`,
      [CHAIN_IDS.BASE_SEPOLIA]: `https://api.pimlico.io/v2/base-sepolia/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`,
    },
    
    // API key
    apiKey: process.env.NEXT_PUBLIC_PIMLICO_API_KEY || '',
  },
  
  // ERC-20 Paymaster configuration
  paymaster: {
    // Supported tokens for gas payment
    supportedTokens: {
      [CHAIN_IDS.BASE]: [
        {
          symbol: 'USDC',
          address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
          decimals: 6,
          icon: '💵',
        },
        {
          symbol: 'USDT',
          address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', // USDT on Base
          decimals: 6,
          icon: '💴',
        },
      ],
      [CHAIN_IDS.BASE_SEPOLIA]: [
        {
          symbol: 'USDC',
          address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
          decimals: 6,
          icon: '💵',
        },
      ],
    },
    
    // Daily limits per account (in USD)
    dailyLimitUSD: 100,
    
    // Per-transaction limit (in USD)
    transactionLimitUSD: 10,
    
    // Allowed function selectors (for security)
    allowedSelectors: [
      '0xa9059cbb', // transfer(address,uint256)
      '0x095ea7b3', // approve(address,uint256)
      '0x23b872dd', // transferFrom(address,address,uint256)
      '0x42842e0e', // safeTransferFrom(address,address,uint256)
    ],
    
    // Rate limiting
    rateLimit: {
      maxRequestsPerHour: 60,
      maxRequestsPerDay: 500,
    },
  },
  
  // Entry point addresses (same for all EVM chains)
  entryPoint: {
    v06: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789', // v0.6
    v07: '0x0000000071727De22E5E9d8BAf0edAc6f37da032', // v0.7
  },
  
  // Smart account implementation
  implementation: {
    // SimpleAccount factory (for demo/testing)
    simpleAccountFactory: {
      [CHAIN_IDS.BASE]: '0x9406cc6185a346906296840746125a0e44976454',
      [CHAIN_IDS.BASE_SEPOLIA]: '0x9406cc6185a346906296840746125a0e44976454',
    },
    
    // Safe factory (for production)
    safeFactory: {
      [CHAIN_IDS.BASE]: '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67',
      [CHAIN_IDS.BASE_SEPOLIA]: '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67',
    },
  },
  
  // Session key configuration
  sessionKeys: {
    // Maximum session duration (seconds)
    maxDuration: 86400, // 24 hours
    
    // Default permissions
    defaultPermissions: {
      // Value limit per transaction (ETH)
      valueLimit: '0.1',
      
      // Gas limit per transaction
      gasLimit: 500000,
      
      // Allowed contracts (empty = all)
      allowedContracts: [],
      
      // Allowed functions (empty = all)
      allowedFunctions: [],
    },
  },
  
  // Recovery configuration
  recovery: {
    // Minimum guardians required
    minGuardians: 2,
    
    // Recovery delay (seconds)
    recoveryDelay: 86400, // 24 hours
    
    // Passkey support (when available)
    passkeysEnabled: false, // Will enable when Base supports P256
  },
};

/**
 * Get AA configuration for current chain
 */
export function getAAConfig(chainId: number) {
  // Check feature flags
  const erc20PaymasterEnabled = process.env.NEXT_PUBLIC_FEATURE_ERC20_PAYMASTER === 'on';
  const sessionKeysEnabled = process.env.NEXT_PUBLIC_FEATURE_SESSION_KEYS === 'on';
  const recoveryEnabled = process.env.NEXT_PUBLIC_FEATURE_RECOVERY === 'on';
  
  return {
    ...AA_CONFIG,
    currentChain: chainId,
    bundlerUrl: AA_CONFIG.pimlico.bundlerUrl[chainId as keyof typeof AA_CONFIG.pimlico.bundlerUrl],
    paymasterTokens: AA_CONFIG.paymaster.supportedTokens[chainId as keyof typeof AA_CONFIG.paymaster.supportedTokens] || [],
    simpleAccountFactory: AA_CONFIG.implementation.simpleAccountFactory[chainId as keyof typeof AA_CONFIG.implementation.simpleAccountFactory],
    safeFactory: AA_CONFIG.implementation.safeFactory[chainId as keyof typeof AA_CONFIG.implementation.safeFactory],
    // Feature flags
    erc20PaymasterEnabled,
    sessionKeysEnabled,
    recoveryEnabled,
  };
}

/**
 * Check if AA is supported on chain
 */
export function isAASupportedOnChain(chainId: number): boolean {
  return chainId === CHAIN_IDS.BASE || chainId === CHAIN_IDS.BASE_SEPOLIA;
}

/**
 * Get entry point address for version
 */
export function getEntryPointAddress(version: 'v06' | 'v07' = 'v07'): string {
  return AA_CONFIG.entryPoint[version];
}

/**
 * Check if function selector is allowed for paymaster
 */
export function isSelectorAllowed(selector: string): boolean {
  return AA_CONFIG.paymaster.allowedSelectors.includes(selector.toLowerCase());
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const remainder = amount % divisor;
  
  if (remainder === 0n) {
    return whole.toString();
  }
  
  const decimal = remainder.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole}.${decimal}`;
}