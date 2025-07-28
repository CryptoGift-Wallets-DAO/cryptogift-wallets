/**
 * ERROR HANDLER - ENHANCED FAIL-FAST & ROBUST ERROR MANAGEMENT
 * Sistema unificado con categorización, fail-fast patterns y recovery automático
 */

import { securityAudit, blockchainSecureLogger } from './secureLogger';

// Error types for better error handling (enhanced)
export enum ErrorType {
  // Critical errors - application must fail
  CRITICAL_SYSTEM = 'critical_system',
  CRITICAL_SECURITY = 'critical_security',
  CRITICAL_DATA = 'critical_data',
  
  // Blockchain errors - auto retry
  BLOCKCHAIN_RPC = 'blockchain_rpc',
  BLOCKCHAIN_CONTRACT = 'blockchain_contract', 
  BLOCKCHAIN_TRANSACTION = 'blockchain_transaction',
  
  // Network errors - retry with backoff
  NETWORK = 'network',
  EXTERNAL_SERVICE = 'external_service',
  
  // User errors - show friendly message
  VALIDATION = 'validation',
  USER_INPUT = 'user_input',
  USER_AUTH = 'user_auth',
  
  // System errors
  RATE_LIMIT = 'rate_limit',
  API_KEY = 'api_key',
  CONTRACT = 'contract',
  CONFIGURATION = 'configuration',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  FATAL = 'FATAL',     // Application cannot continue
  HIGH = 'HIGH',       // Critical functionality affected
  MEDIUM = 'MEDIUM',   // Partial functionality affected
  LOW = 'LOW',         // Minor functionality affected
  INFO = 'INFO'        // Informational only
}

export interface AppError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  code?: string;
  details?: any;
  context: {
    operation: string;
    userAddress?: string;
    tokenId?: string;
    transactionHash?: string;
    timestamp: string;
    environment: string;
  };
  recoveryActions: string[];
  shouldRetry: boolean;
  maxRetries: number;
  retryDelay: number;
}

export class CryptoGiftError extends Error {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  userMessage: string;
  code?: string;
  details?: any;
  context: AppError['context'];
  recoveryActions: string[];
  shouldRetry: boolean;
  maxRetries: number;
  retryDelay: number;

  constructor(
    type: ErrorType, 
    message: string, 
    options?: {
      severity?: ErrorSeverity;
      code?: string;
      details?: any;
      userMessage?: string;
      context?: Partial<AppError['context']>;
      originalError?: Error;
    }
  ) {
    super(message);
    this.name = 'CryptoGiftError';
    this.id = this.generateErrorId();
    this.type = type;
    this.severity = options?.severity || this.getDefaultSeverity(type);
    this.code = options?.code;
    this.details = options?.details;
    this.userMessage = options?.userMessage || this.getDefaultUserMessage(type);
    
    this.context = {
      operation: options?.context?.operation || 'unknown',
      userAddress: options?.context?.userAddress,
      tokenId: options?.context?.tokenId,
      transactionHash: options?.context?.transactionHash,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown'
    };
    
    this.recoveryActions = this.getRecoveryActions(type);
    this.shouldRetry = this.getShouldRetry(type);
    this.maxRetries = this.getMaxRetries(type);
    this.retryDelay = this.getRetryDelay(type);
    
    // Preserve stack trace from original error
    if (options?.originalError && options.originalError.stack) {
      this.stack = options.originalError.stack;
    }
  }

  private generateErrorId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `ERR_${timestamp}_${random}`.toUpperCase();
  }

  private getDefaultSeverity(type: ErrorType): ErrorSeverity {
    const severityMap: Record<ErrorType, ErrorSeverity> = {
      [ErrorType.CRITICAL_SYSTEM]: ErrorSeverity.FATAL,
      [ErrorType.CRITICAL_SECURITY]: ErrorSeverity.FATAL,
      [ErrorType.CRITICAL_DATA]: ErrorSeverity.HIGH,
      [ErrorType.BLOCKCHAIN_RPC]: ErrorSeverity.HIGH,
      [ErrorType.BLOCKCHAIN_CONTRACT]: ErrorSeverity.HIGH,
      [ErrorType.BLOCKCHAIN_TRANSACTION]: ErrorSeverity.MEDIUM,
      [ErrorType.NETWORK]: ErrorSeverity.MEDIUM,
      [ErrorType.EXTERNAL_SERVICE]: ErrorSeverity.MEDIUM,
      [ErrorType.VALIDATION]: ErrorSeverity.LOW,
      [ErrorType.USER_INPUT]: ErrorSeverity.LOW,
      [ErrorType.USER_AUTH]: ErrorSeverity.MEDIUM,
      [ErrorType.RATE_LIMIT]: ErrorSeverity.LOW,
      [ErrorType.API_KEY]: ErrorSeverity.HIGH,
      [ErrorType.CONTRACT]: ErrorSeverity.HIGH,
      [ErrorType.CONFIGURATION]: ErrorSeverity.HIGH,
      [ErrorType.UNKNOWN]: ErrorSeverity.MEDIUM
    };
    
    return severityMap[type] || ErrorSeverity.MEDIUM;
  }

  private getDefaultUserMessage(type: ErrorType): string {
    const messageMap: Record<ErrorType, string> = {
      [ErrorType.CRITICAL_SYSTEM]: 'Sistema experimentando problemas críticos. Contacte soporte inmediatamente.',
      [ErrorType.CRITICAL_SECURITY]: 'Error de seguridad detectado. Operación cancelada por protección.',
      [ErrorType.CRITICAL_DATA]: 'Error crítico en validación de datos. Verifique la información.',
      [ErrorType.BLOCKCHAIN_RPC]: 'Problemas de conectividad con blockchain. Reintentando automáticamente...',
      [ErrorType.BLOCKCHAIN_CONTRACT]: 'Error en contrato inteligente. Verifique los parámetros y balance.',
      [ErrorType.BLOCKCHAIN_TRANSACTION]: 'Transacción falló. Revise balance y configuración de gas.',
      [ErrorType.NETWORK]: 'Problema de conectividad. Verifique su conexión a internet.',
      [ErrorType.EXTERNAL_SERVICE]: 'Servicio externo no disponible temporalmente. Reintente más tarde.',
      [ErrorType.VALIDATION]: 'Datos ingresados no válidos. Verifique la información.',
      [ErrorType.USER_INPUT]: 'Entrada de usuario no válida. Corrija los datos ingresados.',
      [ErrorType.USER_AUTH]: 'Error de autenticación. Inicie sesión nuevamente.',
      [ErrorType.RATE_LIMIT]: 'Demasiadas solicitudes. Espere un momento antes de reintentar.',
      [ErrorType.API_KEY]: 'Servicio temporalmente no disponible. Reintente más tarde.',
      [ErrorType.CONTRACT]: 'Transacción blockchain falló. Verifique balance y parámetros.',
      [ErrorType.CONFIGURATION]: 'Error de configuración del sistema. Contacte administrador.',
      [ErrorType.UNKNOWN]: 'Error inesperado. Contacte soporte si el problema persiste.'
    };
    
    return messageMap[type] || 'Error inesperado. Contacte soporte si persiste.';
  }

  private getRecoveryActions(type: ErrorType): string[] {
    const actionsMap: Record<ErrorType, string[]> = {
      [ErrorType.CRITICAL_SYSTEM]: ['Reiniciar aplicación', 'Contactar soporte técnico urgente'],
      [ErrorType.CRITICAL_SECURITY]: ['Cerrar sesión inmediatamente', 'Reportar incidente de seguridad'],
      [ErrorType.CRITICAL_DATA]: ['Validar datos de entrada', 'Revisar formato requerido'],
      [ErrorType.BLOCKCHAIN_RPC]: ['Reintentar automáticamente', 'Verificar conectividad'],
      [ErrorType.BLOCKCHAIN_CONTRACT]: ['Verificar balance', 'Revisar parámetros de transacción'],
      [ErrorType.BLOCKCHAIN_TRANSACTION]: ['Verificar balance de gas', 'Ajustar límite de gas'],
      [ErrorType.NETWORK]: ['Verificar conexión a internet', 'Reintentar operación'],
      [ErrorType.EXTERNAL_SERVICE]: ['Esperar y reintentar', 'Usar funcionalidad alternativa'],
      [ErrorType.VALIDATION]: ['Corregir datos ingresados', 'Consultar formato requerido'],
      [ErrorType.USER_INPUT]: ['Revisar información ingresada', 'Verificar formato'],
      [ErrorType.USER_AUTH]: ['Iniciar sesión nuevamente', 'Verificar credenciales'],
      [ErrorType.RATE_LIMIT]: ['Esperar antes de reintentar', 'Reducir frecuencia de solicitudes'],
      [ErrorType.API_KEY]: ['Esperar y reintentar', 'Verificar configuración'],
      [ErrorType.CONTRACT]: ['Verificar balance', 'Revisar estado del contrato'],
      [ErrorType.CONFIGURATION]: ['Verificar configuración', 'Contactar administrador'],
      [ErrorType.UNKNOWN]: ['Reintentar operación', 'Contactar soporte técnico']
    };
    
    return actionsMap[type] || ['Reintentar operación', 'Contactar soporte'];
  }

  private getShouldRetry(type: ErrorType): boolean {
    const retryableTypes = [
      ErrorType.BLOCKCHAIN_RPC,
      ErrorType.NETWORK,
      ErrorType.EXTERNAL_SERVICE,
      ErrorType.RATE_LIMIT
    ];
    
    return retryableTypes.includes(type);
  }

  private getMaxRetries(type: ErrorType): number {
    const retriesMap: Partial<Record<ErrorType, number>> = {
      [ErrorType.BLOCKCHAIN_RPC]: 3,
      [ErrorType.BLOCKCHAIN_CONTRACT]: 2,
      [ErrorType.BLOCKCHAIN_TRANSACTION]: 1,
      [ErrorType.NETWORK]: 3,
      [ErrorType.EXTERNAL_SERVICE]: 2,
      [ErrorType.RATE_LIMIT]: 5
    };
    
    return retriesMap[type] || 0;
  }

  private getRetryDelay(type: ErrorType): number {
    const delayMap: Partial<Record<ErrorType, number>> = {
      [ErrorType.BLOCKCHAIN_RPC]: 2000,
      [ErrorType.BLOCKCHAIN_CONTRACT]: 1000,
      [ErrorType.BLOCKCHAIN_TRANSACTION]: 3000,
      [ErrorType.NETWORK]: 1000,
      [ErrorType.EXTERNAL_SERVICE]: 1500,
      [ErrorType.RATE_LIMIT]: 5000
    };
    
    return delayMap[type] || 1000;
  }

  /**
   * Handle the error with appropriate action based on severity
   */
  handle(): void {
    // Log error securely
    blockchainSecureLogger.error('STRUCTURED ERROR', {
      errorId: this.id,
      type: this.type,
      severity: this.severity,
      message: this.message,
      context: this.context
    });

    // Security audit for critical errors
    if (this.severity === ErrorSeverity.FATAL || this.type.includes('CRITICAL')) {
      securityAudit.securityViolation(
        `${this.severity} error: ${this.message}`,
        this.context.userAddress,
        {
          errorId: this.id,
          type: this.type,
          operation: this.context.operation
        }
      );
    }

    // Fail-fast for fatal errors
    if (this.severity === ErrorSeverity.FATAL) {
      console.error(`🚨 FATAL ERROR (${this.id}): ${this.message}`);
      
      if (process.env.NODE_ENV === 'development') {
        console.error('💥 Full error details:', this.toJSON());
      }
      
      throw new Error(`FATAL: ${this.userMessage} (Error ID: ${this.id})`);
    }
  }

  toJSON(): AppError {
    return {
      id: this.id,
      type: this.type,
      severity: this.severity,
      message: this.message,
      userMessage: this.userMessage,
      code: this.code,
      details: this.details,
      context: this.context,
      recoveryActions: this.recoveryActions,
      shouldRetry: this.shouldRetry,
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay
    };
  }
}

// Error parsing utilities
export function parseApiError(error: any): CryptoGiftError {
  // Handle fetch errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return new CryptoGiftError(ErrorType.NETWORK, 'Network request failed', {
      details: error.message,
    });
  }

  // Handle API response errors
  if (error.status) {
    switch (error.status) {
      case 429:
        return new CryptoGiftError(ErrorType.RATE_LIMIT, 'Rate limit exceeded', {
          code: '429',
          details: error,
        });
      case 401:
      case 403:
        return new CryptoGiftError(ErrorType.API_KEY, 'Authentication failed', {
          code: error.status.toString(),
          details: error,
        });
      case 400:
        return new CryptoGiftError(ErrorType.VALIDATION, 'Invalid request', {
          code: '400',
          details: error,
        });
      case 500:
      case 502:
      case 503:
        return new CryptoGiftError(ErrorType.NETWORK, 'Service temporarily unavailable', {
          code: error.status.toString(),
          details: error,
        });
    }
  }

  // Handle contract errors
  if (error.message?.includes('revert') || error.message?.includes('execution reverted')) {
    return new CryptoGiftError(ErrorType.CONTRACT, 'Transaction failed', {
      details: error.message,
      userMessage: 'Transaction failed. Please check your balance and try again.',
    });
  }

  // Handle wallet connection errors
  if (error.message?.includes('User rejected') || error.message?.includes('user rejected')) {
    return new CryptoGiftError(ErrorType.VALIDATION, 'User rejected transaction', {
      details: error.message,
      userMessage: 'Transaction was cancelled.',
    });
  }

  // Default to unknown error
  return new CryptoGiftError(ErrorType.UNKNOWN, error.message || 'Unknown error', {
    details: error,
  });
}

// Retry mechanism for network errors
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (i === maxRetries) {
        throw lastError;
      }

      // Only retry on network errors
      const parsedError = parseApiError(error);
      if (parsedError.type !== ErrorType.NETWORK) {
        throw lastError;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
    }
  }

  throw lastError!;
}

// Structured JSON logging function
export function logError(error: Error | CryptoGiftError, context?: string): void {
  const logEntry = {
    level: "ERROR",
    message: error.message,
    context: context || "unknown",
    timestamp: new Date().toISOString(),
    errorType: error instanceof CryptoGiftError ? error.type : "native_error",
    code: error instanceof CryptoGiftError ? error.code : undefined,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    userId: "anonymized", // Never log real user data
    sessionId: typeof window !== 'undefined' ? window.crypto?.randomUUID?.()?.slice(0, 8) : undefined,
  };

  // Structured JSON output for monitoring systems
  console.error(JSON.stringify(logEntry));

  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Example: sendToLoggingService(logEntry);
  }
}

// Success logging with same structure
export function logSuccess(message: string, context?: string, metadata?: any): void {
  const logEntry = {
    level: "INFO",
    message,
    context: context || "success",
    timestamp: new Date().toISOString(),
    metadata: metadata || {},
    userId: "anonymized",
  };

  console.log(JSON.stringify(logEntry));
}

// Toast notification helpers
export interface ToastOptions {
  duration?: number;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export function showErrorToast(error: Error | CryptoGiftError, options?: ToastOptions): void {
  const message = error instanceof CryptoGiftError 
    ? error.userMessage || error.message 
    : error.message;

  // This would integrate with your toast library
  // Example with react-hot-toast:
  // toast.error(message, { duration: options?.duration || 5000 });
  
  console.error('Toast:', message);
}

export function showSuccessToast(message: string, options?: ToastOptions): void {
  // Example with react-hot-toast:
  // toast.success(message, { duration: options?.duration || 3000 });
  
  console.log('Success:', message);
}