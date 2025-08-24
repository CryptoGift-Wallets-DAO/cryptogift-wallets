/**
 * Push Protocol Configuration
 * Staging channel setup for gasless opt-in
 */

export const PUSH_CONFIG = {
  // Feature flag
  enabled: process.env.NEXT_PUBLIC_FEATURE_PUSH_PROTOCOL === 'on',
  
  // Environment: 'staging' or 'prod'
  env: (process.env.PUSH_ENV || 'staging') as 'staging' | 'prod',
  
  // Channel configuration
  channel: {
    alias: process.env.PUSH_CHANNEL_ALIAS || 'cryptogift-staging',
    name: 'CryptoGift Staging',
    description: 'Enterprise TBA wallet notifications - Staging Channel',
    url: 'https://cryptogift-wallets.vercel.app',
    icon: 'https://cryptogift-wallets.vercel.app/icons/icon-192x192.png',
  },
  
  // API endpoints based on environment
  api: {
    staging: 'https://backend-staging.epns.io/apis',
    prod: 'https://backend.epns.io/apis',
  },
  
  // Push Protocol dApp URLs
  dapp: {
    staging: 'https://staging.push.org',
    prod: 'https://app.push.org',
  },
  
  // Notification categories
  categories: {
    transaction: {
      name: 'Transactions',
      description: 'Receive, send, and swap notifications',
      icon: '💰',
    },
    security: {
      name: 'Security Alerts',
      description: 'Important security updates',
      icon: '🔒',
    },
    claim: {
      name: 'Gift Claims',
      description: 'New gifts and reminders',
      icon: '🎁',
    },
    system: {
      name: 'System Updates',
      description: 'App updates and maintenance',
      icon: '📢',
    },
  },
  
  // Chain configuration (Base Sepolia for staging)
  chain: {
    staging: {
      id: 11155111, // Sepolia (Push staging uses Sepolia)
      name: 'Sepolia',
    },
    prod: {
      id: 1, // Ethereum mainnet
      name: 'Ethereum',
    },
  },
};

/**
 * Get Push Protocol configuration
 */
export function getPushProtocolConfig() {
  const env = PUSH_CONFIG.env;
  return {
    ...PUSH_CONFIG,
    apiUrl: PUSH_CONFIG.api[env],
    dappUrl: PUSH_CONFIG.dapp[env],
    chainId: PUSH_CONFIG.chain[env].id,
    chainName: PUSH_CONFIG.chain[env].name,
  };
}

/**
 * Check if Push Protocol is enabled
 */
export function isPushProtocolEnabled(): boolean {
  return PUSH_CONFIG.enabled;
}

/**
 * Get channel address based on environment
 * In production, this will be the actual deployed channel address
 */
export function getChannelAddress(): string {
  // Staging channel address (mock for now, will be created via UI)
  if (PUSH_CONFIG.env === 'staging') {
    return '0xD8634C39BBFd4033c0d3289C4515275102423681'; // Example staging channel
  }
  
  // Production channel address (to be created with 50 PUSH stake)
  return '0x0000000000000000000000000000000000000000'; // Placeholder
}

/**
 * Format notification for Push Protocol
 */
export interface PushNotification {
  title: string;
  body: string;
  cta: string; // Call to action URL
  img?: string; // Optional image
  type: 1 | 3 | 4; // 1: Broadcast, 3: Targeted, 4: Subset
  recipients?: string | string[]; // For targeted/subset
}

/**
 * Push Protocol notification types
 */
export const NOTIFICATION_TYPE = {
  BROADCAST: 1, // To all subscribers
  TARGETED: 3, // To specific addresses
  SUBSET: 4, // To a subset of subscribers
} as const;