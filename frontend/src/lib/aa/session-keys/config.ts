/**
 * Session Keys Configuration
 * Temporary permissions for AA operations
 */

export interface SessionPolicy {
  // Unique session ID
  sessionId: string;
  
  // Session owner (smart account)
  account: string;
  
  // Ephemeral key address
  sessionKey: string;
  
  // Allowed function selectors
  allowedSelectors: string[];
  
  // Allowed contracts (empty = all)
  allowedContracts: string[];
  
  // Spender allowlist (for approvals)
  spenderAllowlist: string[];
  
  // Value limits
  maxValue: bigint; // Per transaction in wei
  maxGas: bigint; // Gas limit per tx
  dailyLimit: bigint; // Daily spending limit
  
  // Time constraints
  expiresAt: number; // Unix timestamp
  validAfter: number; // Not valid before
  
  // Chain constraints
  chainId: number;
  
  // Nonce management
  nonceScope: string; // Unique scope to prevent replay
  usedNonces: string[]; // Track used nonces
  
  // Metadata
  name: string; // Human-readable name
  description?: string;
  createdAt: number;
  lastUsedAt?: number;
  useCount: number;
}

export const SESSION_CONFIG = {
  // Feature flag
  enabled: process.env.NEXT_PUBLIC_FEATURE_SESSION_KEYS === 'on',
  
  // Maximum session duration (hours)
  maxTTLHours: parseInt(process.env.SESSION_MAX_TTL_HOURS || '24'),
  
  // Maximum value per transaction (USD)
  maxValueUSD: parseInt(process.env.SESSION_MAX_VALUE_USD || '25'),
  
  // Default allowed selectors
  defaultSelectors: (process.env.SESSION_ALLOWED_SELECTORS || 'transfer,approve,claim').split(',').map(s => {
    // Map function names to selectors
    const selectorMap: Record<string, string> = {
      'transfer': '0xa9059cbb', // transfer(address,uint256)
      'approve': '0x095ea7b3', // approve(address,uint256)
      'claim': '0x4e71d92d', // claim()
      'swap': '0x38ed1739', // swapExactTokensForTokens
      'mint': '0x40c10f19', // mint(address,uint256)
    };
    return selectorMap[s] || s;
  }),
  
  // Preset policies for common operations
  presets: {
    claim: {
      name: 'Gift Claim Session',
      description: 'Auto-claim gifts without re-signing',
      allowedSelectors: ['0x4e71d92d'], // claim()
      maxValue: 0n, // Claims are usually free
      maxGas: 500000n,
      dailyLimit: parseEther('0'), // No value transfers
      duration: 4, // 4 hours
    },
    
    microPayments: {
      name: 'Micro Payments',
      description: 'Small transfers and approvals',
      allowedSelectors: [
        '0xa9059cbb', // transfer
        '0x095ea7b3', // approve
      ],
      maxValue: parseEther('0.01'), // 0.01 ETH
      maxGas: 200000n,
      dailyLimit: parseEther('0.1'), // 0.1 ETH daily
      duration: 24, // 24 hours
    },
    
    swap: {
      name: 'Swap Session',
      description: 'Execute swaps up to limit',
      allowedSelectors: [
        '0x38ed1739', // swapExactTokensForTokens
        '0x095ea7b3', // approve (for swap)
      ],
      maxValue: parseEther('0.05'), // 0.05 ETH
      maxGas: 500000n,
      dailyLimit: parseEther('0.2'), // 0.2 ETH daily
      duration: 12, // 12 hours
    },
    
    gaming: {
      name: 'Gaming Session',
      description: 'In-game transactions',
      allowedSelectors: [
        '0x40c10f19', // mint
        '0xa9059cbb', // transfer
        '0x23b872dd', // transferFrom
      ],
      maxValue: parseEther('0.001'), // 0.001 ETH
      maxGas: 300000n,
      dailyLimit: parseEther('0.01'), // 0.01 ETH daily
      duration: 8, // 8 hours
    },
  },
  
  // Security settings
  security: {
    // Require confirmation for high-value sessions
    confirmationThresholdUSD: 10,
    
    // Auto-revoke inactive sessions after X hours
    inactivityTimeout: 72, // 3 days
    
    // Maximum concurrent sessions
    maxConcurrentSessions: 5,
    
    // Blocked contracts (security risk)
    blockedContracts: [
      // Add known malicious contracts
    ],
    
    // Require 2FA for session creation (future)
    require2FA: false,
  },
  
  // Storage settings
  storage: {
    // Where to store session policies
    backend: 'local' as 'local' | 'ipfs' | 'contract',
    
    // Encryption for sensitive data
    encryptPolicies: true,
  },
};

/**
 * Helper to parse ether amount
 */
function parseEther(amount: string): bigint {
  const [whole, decimal = ''] = amount.split('.');
  const decimals = decimal.padEnd(18, '0').slice(0, 18);
  return BigInt(whole + decimals);
}

/**
 * Get session preset by name
 */
export function getSessionPreset(name: keyof typeof SESSION_CONFIG.presets) {
  return SESSION_CONFIG.presets[name];
}

/**
 * Validate session policy
 */
export function validateSessionPolicy(policy: Partial<SessionPolicy>): string[] {
  const errors: string[] = [];
  
  if (!policy.sessionKey) {
    errors.push('Session key is required');
  }
  
  if (!policy.allowedSelectors || policy.allowedSelectors.length === 0) {
    errors.push('At least one allowed function is required');
  }
  
  if (!policy.expiresAt || policy.expiresAt <= Date.now()) {
    errors.push('Session must have a future expiration');
  }
  
  const maxDuration = SESSION_CONFIG.maxTTLHours * 3600 * 1000;
  if (policy.expiresAt && policy.expiresAt > Date.now() + maxDuration) {
    errors.push(`Session duration exceeds maximum of ${SESSION_CONFIG.maxTTLHours} hours`);
  }
  
  if (policy.maxValue && policy.maxValue > parseEther('1')) {
    errors.push('Per-transaction value exceeds safety limit');
  }
  
  return errors;
}

/**
 * Check if session is expired
 */
export function isSessionExpired(session: SessionPolicy): boolean {
  return Date.now() > session.expiresAt;
}

/**
 * Check if session is valid for operation
 */
export function isOperationAllowed(
  session: SessionPolicy,
  operation: {
    to: string;
    value: bigint;
    data: string;
    chainId: number;
  }
): { allowed: boolean; reason?: string } {
  // Check expiration
  if (isSessionExpired(session)) {
    return { allowed: false, reason: 'Session expired' };
  }
  
  // Check chain
  if (session.chainId !== operation.chainId) {
    return { allowed: false, reason: 'Wrong chain' };
  }
  
  // Check value limit
  if (operation.value > session.maxValue) {
    return { allowed: false, reason: 'Value exceeds limit' };
  }
  
  // Check contract allowlist
  if (session.allowedContracts.length > 0 && !session.allowedContracts.includes(operation.to)) {
    return { allowed: false, reason: 'Contract not allowed' };
  }
  
  // Check function selector
  if (operation.data.length >= 10) {
    const selector = operation.data.slice(0, 10);
    if (!session.allowedSelectors.includes(selector)) {
      return { allowed: false, reason: 'Function not allowed' };
    }
  }
  
  return { allowed: true };
}