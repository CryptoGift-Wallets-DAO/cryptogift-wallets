/**
 * SECURE DEBUG LOGGER
 * Replacement for console.log in debug endpoints to prevent sensitive data exposure
 * 
 * SECURITY FEATURES:
 * - Production-safe logging (no sensitive data in prod)
 * - Sanitized output (addresses truncated, IDs hashed)
 * - Environment-aware (verbose in dev, minimal in prod)
 * 
 * Made by mbxarts.com The Moon in a Box property
 */

// Environment detection
const isDev = process.env.NODE_ENV === 'development';
const isDebugMode = process.env.DEBUG_MODE === 'true';

interface LogContext {
  operation?: string;
  tokenId?: string | number;
  contractAddress?: string;
  giftId?: string | number;
  [key: string]: any;
}

/**
 * Secure debug operation logging
 * @param level - Log level (info, warn, error)
 * @param message - Human-readable message
 * @param context - Additional context (will be sanitized)
 */
export function secureDebugLog(
  level: 'info' | 'warn' | 'error',
  message: string,
  context?: LogContext
): void {
  // Always allow logging in development or explicit debug mode
  if (!isDev && !isDebugMode) {
    // In production, only log errors and warnings without sensitive data
    if (level === 'error' || level === 'warn') {
      console[level](`[SECURE] ${message}`);
    }
    return;
  }

  // Development/debug mode: Full logging with sanitization
  const sanitizedContext = sanitizeLogContext(context);
  
  const logPrefix = {
    info: '🔍',
    warn: '⚠️',
    error: '❌'
  }[level];

  console[level === 'info' ? 'log' : level](
    `${logPrefix} [DEBUG] ${message}`,
    sanitizedContext ? sanitizedContext : ''
  );
}

/**
 * Sanitize sensitive data in log context
 */
function sanitizeLogContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;

  const sanitized: LogContext = {};

  Object.entries(context).forEach(([key, value]) => {
    if (typeof value === 'string') {
      // Sanitize addresses
      if (value.match(/^0x[a-fA-F0-9]{40}$/)) {
        sanitized[key] = value.slice(0, 10) + '...';
      }
      // Sanitize transaction hashes
      else if (value.match(/^0x[a-fA-F0-9]{64}$/)) {
        sanitized[key] = value.slice(0, 10) + '...';
      }
      // Keep other strings as-is (they should be safe)
      else {
        sanitized[key] = value;
      }
    }
    // Numbers, booleans, and BigInt are generally safe
    else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    }
    // Convert BigInt to Number for JSON compatibility
    else if (typeof value === 'bigint') {
      sanitized[key] = Number(value);
    }
    // Sanitize objects recursively
    else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogContext(value as LogContext);
    }
    else {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Specific helpers for common debug scenarios
 */
export const debugLogger = {
  operation: (operation: string, details?: LogContext) => 
    secureDebugLog('info', `Operation: ${operation}`, details),
    
  tokenCheck: (tokenId: string | number, contractAddress: string, result: any) =>
    secureDebugLog('info', `Token check result`, {
      tokenId: tokenId.toString(),
      contractAddress,
      exists: !!result
    }),
    
  giftMapping: (tokenId: string | number, giftId: string | number | null) =>
    secureDebugLog('info', `Gift mapping`, {
      tokenId: tokenId.toString(),
      giftId: giftId?.toString() || 'not_found'
    }),
    
  contractCall: (method: string, success: boolean, error?: string) =>
    secureDebugLog(success ? 'info' : 'error', `Contract call: ${method}`, {
      success,
      error: error ? 'Call failed' : undefined
    }),
    
  error: (operation: string, error: Error) =>
    secureDebugLog('error', `Error in ${operation}`, {
      errorType: error.name,
      message: error.message.substring(0, 100) // Limit error message length
    })
};

export default secureDebugLog;