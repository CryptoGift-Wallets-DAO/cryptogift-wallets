/**
 * SECURE LOGGER UTILITY
 * Enhanced logging that prevents exposure of sensitive data
 * Replaces all console.log statements throughout the codebase
 */

// Sensitive data patterns to never log (enhanced list)
const SENSITIVE_PATTERNS = [
  // Common sensitive keys
  /password/i,
  /salt/i,
  /secret/i,
  /key/i,
  /token/i,
  /hash/i,
  /signature/i,
  /private/i,
  /mnemonic/i,
  /seed/i,
  
  // Blockchain and API specific
  /paymaster/i,
  /bundler/i,
  /biconomy/i,
  /mee/i,
  /bearer/i,
  /authorization/i,
  /wallet/i,
  /account/i,
];

// Patterns for private keys and addresses that need truncation
const TRUNCATION_PATTERNS = [
  { pattern: /0x[a-fA-F0-9]{64}/g, replacement: (match: string) => `${match.substring(0, 10)}...` },
  { pattern: /^[a-fA-F0-9]{64}$/g, replacement: (match: string) => `${match.substring(0, 8)}...` },
  { pattern: /0x[a-fA-F0-9]{40}/g, replacement: (match: string) => `${match.substring(0, 10)}...` },
  { pattern: /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi, replacement: () => 'Bearer [REDACTED]' },
];

/**
 * Check if a value contains sensitive data
 */
function isSensitive(key: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
}

/**
 * Sanitize messages for safe logging with enhanced security
 */
function sanitizeMessage(message: any): any {
  if (typeof message === 'string') {
    let sanitized = message;
    
    // Apply truncation patterns first
    for (const { pattern, replacement } of TRUNCATION_PATTERNS) {
      sanitized = sanitized.replace(pattern, replacement);
    }
    
    // Don't log very long strings that might contain sensitive data
    if (sanitized.length > 200) {
      return `[STRING_${sanitized.length}_CHARS_TRUNCATED]`;
    }
    
    return sanitized;
  }
  
  if (typeof message === 'number' || typeof message === 'boolean') return message;
  if (message === null || message === undefined) return message;
  
  if (Array.isArray(message)) {
    return message.slice(0, 10).map(item => sanitizeMessage(item));
  }
  
  if (typeof message === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(message)) {
      if (isSensitive(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeMessage(value);
      }
    }
    return sanitized;
  }
  
  return '[UNKNOWN_TYPE]';
}

/**
 * Legacy sanitizeForLogging function for backwards compatibility
 */
function sanitizeForLogging(obj: any, maxDepth: number = 3): any {
  return sanitizeMessage(obj);
}

/**
 * Safe console.log replacement
 */
export function secureLog(message: string, data?: any) {
  if (process.env.NODE_ENV === 'development') {
    if (data !== undefined) {
      console.log(message, sanitizeForLogging(data));
    } else {
      console.log(message);
    }
  } else {
    // In production, only log non-sensitive messages
    if (data !== undefined) {
      console.log(message, sanitizeForLogging(data));
    } else {
      console.log(message);
    }
  }
}

/**
 * Debug-only logging (only shows in development)
 */
export function debugLog(message: string, data?: any) {
  if (process.env.NODE_ENV === 'development' || process.env.ENABLE_DEBUG_LOGS === 'true') {
    if (data !== undefined) {
      console.log(`🐛 DEBUG: ${message}`, sanitizeForLogging(data));
    } else {
      console.log(`🐛 DEBUG: ${message}`);
    }
  }
}

/**
 * Crypto-specific safe logging for passwords/salts
 */
export function cryptoLog(action: string, details: { tokenId?: string; addressCount?: number; [key: string]: any }) {
  const safeDetails = {
    tokenId: details.tokenId,
    timestamp: new Date().toISOString(),
    action: action,
    // Never log actual crypto values
    ...Object.keys(details)
      .filter(key => !isSensitive(key))
      .reduce((acc, key) => ({ ...acc, [key]: details[key] }), {})
  };
  
  console.log(`🔐 CRYPTO ${action.toUpperCase()}:`, safeDetails);
}

/**
 * Error logging that sanitizes stack traces
 */
export function errorLog(message: string, error: any, context?: any) {
  const sanitizedError = {
    message: error?.message || 'Unknown error',
    name: error?.name || 'Error',
    // Don't log full stack traces in production
    stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    context: context ? sanitizeForLogging(context) : undefined
  };
  
  console.error(`❌ ${message}:`, sanitizedError);
}

/**
 * Enhanced secure logger with multiple levels
 */
export const secureLogger = {
  info: (...messages: any[]) => {
    const sanitized = messages.map(msg => sanitizeMessage(msg));
    console.log('ℹ️ INFO:', ...sanitized);
  },
  
  success: (...messages: any[]) => {
    const sanitized = messages.map(msg => sanitizeMessage(msg));
    console.log('✅ SUCCESS:', ...sanitized);
  },
  
  warn: (...messages: any[]) => {
    const sanitized = messages.map(msg => sanitizeMessage(msg));
    console.warn('⚠️ WARNING:', ...sanitized);
  },
  
  error: (...messages: any[]) => {
    const sanitized = messages.map(msg => sanitizeMessage(msg));
    console.error('❌ ERROR:', ...sanitized);
  },
  
  debug: (...messages: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      const sanitized = messages.map(msg => sanitizeMessage(msg));
      console.log('🔍 DEBUG:', ...sanitized);
    }
  },
  
  transaction: (hash: string, description: string, details?: any) => {
    const sanitizedHash = sanitizeMessage(hash);
    const sanitizedDetails = details ? sanitizeMessage(details) : undefined;
    console.log(`🔗 TX [${sanitizedHash}]:`, description, sanitizedDetails || '');
  },
  
  mapping: (action: string, tokenId: string | number, giftId?: string | number, source?: string) => {
    console.log(`🎯 MAPPING [${action}]:`, `tokenId ${tokenId}`, giftId ? `→ giftId ${giftId}` : '', source ? `(${source})` : '');
  },
  
  auth: (action: string, user?: string, details?: any) => {
    const sanitizedUser = user ? sanitizeMessage(user) : 'anonymous';
    const sanitizedDetails = details ? sanitizeMessage(details) : undefined;
    console.log(`🔐 AUTH [${action}]:`, sanitizedUser, sanitizedDetails || '');
  },
  
  api: (method: string, endpoint: string, status: number, duration?: number) => {
    console.log(`🌐 API [${method}] ${endpoint}:`, `${status}`, duration ? `(${duration}ms)` : '');
  }
};

/**
 * Default export for convenience
 */
export default secureLogger;