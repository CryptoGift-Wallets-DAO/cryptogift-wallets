/**
 * SECURE LOGGER UTILITY - ENHANCED SECURITY
 * Sistema de logging que automáticamente elimina información sensible
 * Previene exposición accidental de claves privadas, passwords, etc.
 * Cumple con estándares de seguridad empresarial
 */

// Patrones críticos de datos sensibles - NUNCA LOGEAR
const CRITICAL_SENSITIVE_PATTERNS = {
  // Claves privadas (64 hex chars)
  privateKey: /0x[a-fA-F0-9]{64}/g,
  privateKeyNoPrefix: /^[a-fA-F0-9]{64}$/g,
  
  // Mnemonics (12-24 words)
  mnemonic: /\b(?:[a-z]+\s+){11,23}[a-z]+\b/gi,
  
  // JWT tokens
  jwt: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g,
  
  // API keys patterns
  apiKey: /(?:api[_-]?key|apikey)[\s]*[=:]\s*["\']?([a-zA-Z0-9_\-]{20,})["\']?/gi,
  secretKey: /(?:secret[_-]?key|secretkey)[\s]*[=:]\s*["\']?([a-zA-Z0-9_\-]{20,})["\']?/gi,
  
  // Signatures
  signature: /0x[a-fA-F0-9]{130}/g, // Ethereum signatures
  
  // URLs with credentials
  urlCredentials: /(https?:\/\/)([^:]+):([^@]+)@([^\/]+)/g,
  
  // Environment variables
  envCredentials: /(PRIVATE_KEY|API_KEY|SECRET_KEY|PASSWORD|TOKEN|MNEMONIC)[\s]*=[\s]*[^\s\n]+/gi
};

// Patrones de campos sensibles en objetos
const SENSITIVE_FIELD_PATTERNS = [
  // Passwords y autenticación
  /password/i, /passwd/i, /pwd/i,
  /salt/i, /nonce/i,
  /secret/i, /credential/i,
  
  // Keys y tokens
  /key/i, /token/i, /auth/i,
  /signature/i, /sign/i,
  /private/i, /mnemonic/i, /seed/i,
  
  // Blockchain específico
  /paymaster/i, /bundler/i,
  /biconomy/i, /gasless/i,
  /bearer/i, /authorization/i,
  
  // Wallet y account data
  /account/i, /wallet/i,
  /phrase/i, /recovery/i
];

// Patrones para truncar (mantener parcialmente visible)
const TRUNCATION_PATTERNS = [
  // Direcciones Ethereum (40 hex chars)
  { 
    pattern: /0x[a-fA-F0-9]{40}/g, 
    replacement: (match: string) => `${match.substring(0, 6)}...${match.substring(36)}`,
    name: 'ethereum_address'
  },
  
  // Hashes de transacciones (64 hex chars con 0x)
  { 
    pattern: /0x[a-fA-F0-9]{64}/g, 
    replacement: (match: string) => `${match.substring(0, 10)}...${match.substring(60)}`,
    name: 'transaction_hash'
  },
  
  // Bearer tokens
  { 
    pattern: /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi, 
    replacement: () => 'Bearer [REDACTED]',
    name: 'bearer_token'
  },
  
  // Generic long hex strings
  { 
    pattern: /[a-fA-F0-9]{32,}/g, 
    replacement: (match: string) => match.length > 32 ? `${match.substring(0, 8)}...[${match.length}chars]` : match,
    name: 'hex_string'
  }
];

/**
 * Verificar si un campo es sensible basado en su nombre
 */
function isSensitiveField(key: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some(pattern => pattern.test(key));
}

/**
 * Sanitizar strings aplicando todos los filtros de seguridad
 */
function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;
  
  let sanitized = input;
  
  // Paso 1: Eliminar datos críticos completamente
  Object.entries(CRITICAL_SENSITIVE_PATTERNS).forEach(([name, pattern]) => {
    sanitized = sanitized.replace(pattern, `[${name.toUpperCase()}_REDACTED]`);
  });
  
  // Paso 2: Truncar datos que pueden mostrarse parcialmente
  TRUNCATION_PATTERNS.forEach(({ pattern, replacement, name }) => {
    sanitized = sanitized.replace(pattern, replacement);
  });
  
  // Paso 3: Truncar strings muy largos que pueden contener datos sensibles
  if (sanitized.length > 500) {
    return `[LONG_STRING_${sanitized.length}_CHARS_TRUNCATED]`;
  }
  
  return sanitized;
}

/**
 * Sanitizar objetos recursivamente con seguridad mejorada
 */
function sanitizeObject(obj: any, depth: number = 0, maxDepth: number = 5): any {
  // Prevenir recursión infinita
  if (depth > maxDepth) {
    return '[MAX_DEPTH_EXCEEDED]';
  }
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    // Limitar arrays grandes
    const maxItems = depth === 0 ? 20 : 10;
    const truncated = obj.slice(0, maxItems);
    const sanitizedArray = truncated.map(item => sanitizeObject(item, depth + 1, maxDepth));
    
    if (obj.length > maxItems) {
      sanitizedArray.push(`[...${obj.length - maxItems}_MORE_ITEMS]`);
    }
    
    return sanitizedArray;
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    let fieldCount = 0;
    const maxFields = depth === 0 ? 50 : 20;
    
    for (const [key, value] of Object.entries(obj)) {
      if (fieldCount >= maxFields) {
        sanitized['[TRUNCATED]'] = `${Object.keys(obj).length - maxFields} more fields`;
        break;
      }
      
      // Verificar si el campo es sensible
      if (isSensitiveField(key)) {
        sanitized[key] = '[REDACTED_SENSITIVE_FIELD]';
      } else {
        sanitized[key] = sanitizeObject(value, depth + 1, maxDepth);
      }
      
      fieldCount++;
    }
    
    return sanitized;
  }
  
  return '[UNKNOWN_TYPE]';
}

/**
 * Función principal de sanitización (backward compatibility)
 */
function sanitizeMessage(message: any): any {
  return sanitizeObject(message);
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
      .filter(key => !isSensitiveField(key))
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
 * FUNCIONES DE AUDITORÍA Y SEGURIDAD
 */

/**
 * Auditar un string en busca de datos sensibles no sanitizados
 */
export function auditLogSecurity(input: string): {
  isSecure: boolean;
  violations: Array<{
    type: string;
    pattern: string;
    position: number;
    severity: 'critical' | 'high' | 'medium';
  }>;
  recommendations: string[];
} {
  const violations: Array<{
    type: string;
    pattern: string;
    position: number;
    severity: 'critical' | 'high' | 'medium';
  }> = [];
  
  // Buscar patrones críticos
  Object.entries(CRITICAL_SENSITIVE_PATTERNS).forEach(([type, pattern]) => {
    let match;
    while ((match = pattern.exec(input)) !== null) {
      violations.push({
        type,
        pattern: match[0].substring(0, 20) + '...',
        position: match.index,
        severity: 'critical'
      });
    }
  });
  
  // Buscar patrones que requieren truncación
  TRUNCATION_PATTERNS.forEach(({ pattern, name }) => {
    let match;
    while ((match = pattern.exec(input)) !== null) {
      if (!match[0].includes('...')) {
        violations.push({
          type: name,
          pattern: match[0].substring(0, 20) + '...',
          position: match.index,
          severity: 'high'
        });
      }
    }
  });
  
  const recommendations: string[] = [];
  
  if (violations.some(v => v.severity === 'critical')) {
    recommendations.push('🚨 CRÍTICO: Se encontraron datos sensibles sin redactar. Usar sanitizeString() antes de logear.');
  }
  
  if (violations.some(v => v.severity === 'high')) {
    recommendations.push('⚠️ ALTO: Se encontraron direcciones/hashes sin truncar. Aplicar TRUNCATION_PATTERNS.');
  }
  
  if (input.length > 1000) {
    recommendations.push('📏 LARGO: String muy largo, considerar truncar para logs más legibles.');
  }
  
  return {
    isSecure: violations.length === 0,
    violations,
    recommendations
  };
}

/**
 * Logger de seguridad para eventos críticos del sistema
 */
export class SecurityAuditLogger {
  private context: string;
  
  constructor(context: string = 'SECURITY') {
    this.context = context;
  }
  
  /**
   * Log de evento de seguridad con timestamp y contexto
   */
  private securityLog(level: 'INFO' | 'WARN' | 'ERROR', event: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const sanitizedData = data ? sanitizeObject(data) : undefined;
    
    const logEntry = {
      timestamp,
      context: this.context,
      level,
      event,
      data: sanitizedData
    };
    
    if (level === 'ERROR') {
      console.error(`🔒 SECURITY [${level}]:`, logEntry);
    } else if (level === 'WARN') {
      console.warn(`🔒 SECURITY [${level}]:`, logEntry);
    } else {
      console.log(`🔒 SECURITY [${level}]:`, logEntry);
    }
  }
  
  /**
   * Log de intento de acceso
   */
  accessAttempt(userAddress: string, resource: string, success: boolean, reason?: string): void {
    this.securityLog(success ? 'INFO' : 'WARN', 'ACCESS_ATTEMPT', {
      userAddress: sanitizeString(userAddress),
      resource,
      success,
      reason
    });
  }
  
  /**
   * Log de operación sensible
   */
  sensitiveOperation(operation: string, userAddress: string, details?: any): void {
    this.securityLog('INFO', 'SENSITIVE_OPERATION', {
      operation,
      userAddress: sanitizeString(userAddress),
      details: details ? sanitizeObject(details) : undefined
    });
  }
  
  /**
   * Log de violación de seguridad detectada
   */
  securityViolation(violation: string, userAddress?: string, details?: any): void {
    this.securityLog('ERROR', 'SECURITY_VIOLATION', {
      violation,
      userAddress: userAddress ? sanitizeString(userAddress) : undefined,
      details: details ? sanitizeObject(details) : undefined
    });
  }
  
  /**
   * Log de validación de datos críticos
   */
  dataValidation(type: string, success: boolean, details?: any): void {
    this.securityLog(success ? 'INFO' : 'ERROR', 'DATA_VALIDATION', {
      type,
      success,
      details: details ? sanitizeObject(details) : undefined
    });
  }
}

/**
 * Instancia global de auditoría de seguridad
 */
export const securityAudit = new SecurityAuditLogger();

/**
 * Función de testing para verificar la sanitización
 */
export function testSecureLogging(): void {
  console.log('🧪 TESTING SECURE LOGGING SYSTEM...');
  
  const testCases = {
    privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    address: '0x1234567890123456789012345678901234567890',
    password: 'mySecretPassword123',
    jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    apiKey: 'sk-1234567890abcdef1234567890abcdef',
    normalText: 'This is safe to log',
    nestedData: {
      publicInfo: 'Safe data',
      privateKey: '0xsecret123456789',
      userAddress: '0x1234567890123456789012345678901234567890'
    }
  };
  
  console.log('📋 Original data:', testCases);
  console.log('🔒 Sanitized data:', sanitizeObject(testCases));
  
  // Test audit function
  const testString = JSON.stringify(testCases);
  const audit = auditLogSecurity(testString);
  console.log('🔍 Security audit results:', audit);
  
  // Test security logger
  securityAudit.accessAttempt('0x1234567890123456789012345678901234567890', 'mint-escrow', true);
  securityAudit.securityViolation('Potential data leak in logs', '0x1234567890123456789012345678901234567890');
  
  console.log('✅ Secure logging test completed');
}

/**
 * Logger mejorado con métodos especializados
 */
export class SecureLogger {
  private context: string;
  private isProduction: boolean;
  
  constructor(context: string = 'DEFAULT') {
    this.context = context;
    this.isProduction = process.env.NODE_ENV === 'production';
  }
  
  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [${this.context}]`;
    
    if (data) {
      const sanitizedData = sanitizeObject(data);
      return `${prefix} ${sanitizeString(message)} ${JSON.stringify(sanitizedData, null, 2)}`;
    }
    
    return `${prefix} ${sanitizeString(message)}`;
  }
  
  info(message: string, data?: any): void {
    const sanitizedMessage = this.formatMessage('INFO', message, data);
    console.log(sanitizedMessage);
  }
  
  warn(message: string, data?: any): void {
    const sanitizedMessage = this.formatMessage('WARN', message, data);
    console.warn(sanitizedMessage);
  }
  
  error(message: string, data?: any): void {
    const sanitizedMessage = this.formatMessage('ERROR', message, data);
    console.error(sanitizedMessage);
  }
  
  debug(message: string, data?: any): void {
    if (!this.isProduction) {
      const sanitizedMessage = this.formatMessage('DEBUG', message, data);
      console.debug(sanitizedMessage);
    }
  }
  
  /**
   * Log específico para transacciones blockchain con auditoría
   */
  transaction(operation: string, status: 'start' | 'success' | 'error', data: any): void {
    const sanitizedData = sanitizeObject(data);
    const message = `TRANSACTION ${operation.toUpperCase()} ${status.toUpperCase()}`;
    
    // Auditoría automática para transacciones
    if (data && typeof data === 'object') {
      const audit = auditLogSecurity(JSON.stringify(data));
      if (!audit.isSecure) {
        securityAudit.securityViolation('Unsanitized data in transaction log', data.userAddress, {
          violations: audit.violations.length,
          operation
        });
      }
    }
    
    if (status === 'error') {
      this.error(message, sanitizedData);
    } else {
      this.info(message, sanitizedData);
    }
  }
  
  /**
   * Log específico para validaciones críticas
   */
  validation(type: string, success: boolean, data?: any): void {
    const sanitizedData = data ? sanitizeObject(data) : undefined;
    const message = `VALIDATION ${type.toUpperCase()} ${success ? 'PASS' : 'FAIL'}`;
    
    securityAudit.dataValidation(type, success, data);
    
    if (success) {
      this.info(message, sanitizedData);
    } else {
      this.error(message, sanitizedData);
    }
  }
}

/**
 * Instancias especializadas por contexto
 */
export const blockchainSecureLogger = new SecureLogger('BLOCKCHAIN');
export const authSecureLogger = new SecureLogger('AUTH');
export const apiSecureLogger = new SecureLogger('API');
export const validationSecureLogger = new SecureLogger('VALIDATION');

/**
 * Default export for convenience
 */
export default secureLogger;