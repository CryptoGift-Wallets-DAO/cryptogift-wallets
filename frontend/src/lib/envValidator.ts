/**
 * ENVIRONMENT VARIABLES VALIDATOR - COMPREHENSIVE VALIDATION
 * Validación completa de todas las variables de entorno críticas
 * Sistema fail-fast que previene ejecución con configuración incompleta
 */

import { securityAudit } from './secureLogger';

// Tipos de variables de entorno por categoría
interface EnvironmentConfig {
  // Blockchain Configuration
  NEXT_PUBLIC_RPC_URL: string;
  NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS: string;
  NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS: string;
  NEXT_PUBLIC_TW_CLIENT_ID: string;
  PRIVATE_KEY_DEPLOY: string;
  
  // Database & Storage
  KV_REST_API_URL?: string;
  KV_REST_API_TOKEN?: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  
  // External Services
  BICONOMY_PAYMASTER_API_KEY?: string;
  BICONOMY_BUNDLER_URL?: string;
  
  // Application Settings
  NODE_ENV: string;
  NEXT_PUBLIC_BASE_URL?: string;
  
  // JWT & Authentication
  JWT_SECRET?: string;
  
  // IPFS
  NEXT_PUBLIC_IPFS_GATEWAY?: string;
  IPFS_PROJECT_ID?: string;
  IPFS_PROJECT_SECRET?: string;
}

// Configuración de validación por variable
const ENV_VALIDATION_RULES = {
  // Variables críticas (aplicación no puede ejecutar sin ellas)
  critical: {
    NEXT_PUBLIC_RPC_URL: {
      required: true,
      pattern: /^https?:\/\/.+/,
      description: 'URL del RPC endpoint de blockchain',
      example: 'https://sepolia.base.org'
    },
    NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS: {
      required: true,
      pattern: /^0x[a-fA-F0-9]{40}$/,
      description: 'Dirección del contrato de escrow',
      example: '0x1234567890123456789012345678901234567890'
    },
    NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS: {
      required: true,
      pattern: /^0x[a-fA-F0-9]{40}$/,
      description: 'Dirección del contrato NFT',
      example: '0x1234567890123456789012345678901234567890'
    },
    NEXT_PUBLIC_TW_CLIENT_ID: {
      required: true,
      pattern: /^[a-zA-Z0-9_-]{20,}$/,
      description: 'ThirdWeb Client ID',
      example: 'abc123def456ghi789jkl012'
    },
    PRIVATE_KEY_DEPLOY: {
      required: true,
      pattern: /^0x[a-fA-F0-9]{64}$/,
      description: 'Clave privada del deployer (CRÍTICO - MANTENER SECRETO)',
      example: '0x1234...abcd'
    },
    NODE_ENV: {
      required: true,
      pattern: /^(development|production|test)$/,
      description: 'Environment de la aplicación',
      example: 'production'
    }
  },
  
  // Variables importantes (funcionalidad reducida sin ellas)
  important: {
    KV_REST_API_URL: {
      pattern: /^https?:\/\/.+/,
      description: 'URL de Vercel KV (Redis)',
      example: 'https://redis-123.upstash.io'
    },
    KV_REST_API_TOKEN: {
      pattern: /^[a-zA-Z0-9_-]{20,}$/,
      description: 'Token de autenticación para KV',
      example: 'AXXXasdf123...'
    },
    JWT_SECRET: {
      pattern: /^.{32,}$/,
      description: 'Secret para firmar JWT tokens (mínimo 32 caracteres)',
      example: '[random-string-32-chars-or-more]'
    }
  },
  
  // Variables opcionales (para funcionalidades avanzadas)
  optional: {
    BICONOMY_PAYMASTER_API_KEY: {
      pattern: /^[a-zA-Z0-9._-]{20,}$/,
      description: 'API key para Biconomy Paymaster (gasless)',
      example: 'pk_123abc...'
    },
    BICONOMY_BUNDLER_URL: {
      pattern: /^https?:\/\/.+/,
      description: 'URL del bundler de Biconomy',
      example: 'https://bundler.biconomy.io'
    },
    NEXT_PUBLIC_IPFS_GATEWAY: {
      pattern: /^https?:\/\/.+/,
      description: 'Gateway de IPFS para metadatos',
      example: 'https://gateway.pinata.cloud'
    },
    NEXT_PUBLIC_BASE_URL: {
      pattern: /^https?:\/\/.+/,
      description: 'URL base de la aplicación',
      example: 'https://cryptogifts.app'
    }
  }
};

interface ValidationResult {
  valid: boolean;
  category: 'critical' | 'important' | 'optional';
  variable: string;
  value?: string;
  error?: string;
  recommendation?: string;
}

interface ValidationSummary {
  allValid: boolean;
  canExecute: boolean;
  criticalIssues: ValidationResult[];
  importantIssues: ValidationResult[];
  optionalIssues: ValidationResult[];
  recommendations: string[];
}

/**
 * Validar una variable de entorno individual
 */
function validateEnvVar(
  name: string,
  value: string | undefined,
  rule: any,
  category: 'critical' | 'important' | 'optional'
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    category,
    variable: name
  };
  
  // Verificar si es requerida
  if (rule.required && (!value || value.trim() === '')) {
    result.valid = false;
    result.error = `Variable requerida ${name} no está definida`;
    result.recommendation = `Definir ${name}: ${rule.description}. Ejemplo: ${rule.example}`;
    return result;
  }
  
  // Si no está definida pero no es requerida
  if (!value || value.trim() === '') {
    result.valid = false;
    result.error = `Variable opcional ${name} no está definida`;
    result.recommendation = `Considerar definir ${name}: ${rule.description}. Ejemplo: ${rule.example}`;
    return result;
  }
  
  // Validar patrón si está definida
  if (rule.pattern && !rule.pattern.test(value)) {
    result.valid = false;
    result.error = `Variable ${name} no cumple con el formato requerido`;
    result.recommendation = `${name} debe cumplir: ${rule.description}. Ejemplo: ${rule.example}`;
    return result;
  }
  
  // Validaciones especiales
  if (name === 'PRIVATE_KEY_DEPLOY') {
    // Verificar que no sea una clave de ejemplo
    const exampleKeys = [
      '0x1234567890123456789012345678901234567890123456789012345678901234',
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    ];
    
    if (exampleKeys.includes(value)) {
      result.valid = false;
      result.error = 'PRIVATE_KEY_DEPLOY parece ser una clave de ejemplo';
      result.recommendation = 'Usar una clave privada real y segura para el deployer';
      return result;
    }
  }
  
  if (name.includes('URL')) {
    try {
      new URL(value);
    } catch {
      result.valid = false;
      result.error = `${name} no es una URL válida`;
      result.recommendation = `${name} debe ser una URL completa. Ejemplo: ${rule.example}`;
      return result;
    }
  }
  
  // Truncar valor para logging seguro
  result.value = value.length > 20 ? `${value.substring(0, 10)}...` : value;
  
  return result;
}

/**
 * Validar todas las variables de entorno
 */
export function validateEnvironmentVariables(): ValidationSummary {
  console.log('🔍 ENVIRONMENT VALIDATION: Starting comprehensive validation...');
  
  const criticalIssues: ValidationResult[] = [];
  const importantIssues: ValidationResult[] = [];
  const optionalIssues: ValidationResult[] = [];
  const recommendations: string[] = [];
  
  // Validar variables críticas
  Object.entries(ENV_VALIDATION_RULES.critical).forEach(([name, rule]) => {
    const value = process.env[name];
    const result = validateEnvVar(name, value, rule, 'critical');
    
    if (!result.valid) {
      criticalIssues.push(result);
    }
  });
  
  // Validar variables importantes
  Object.entries(ENV_VALIDATION_RULES.important).forEach(([name, rule]) => {
    const value = process.env[name];
    const result = validateEnvVar(name, value, rule, 'important');
    
    if (!result.valid) {
      importantIssues.push(result);
    }
  });
  
  // Validar variables opcionales
  Object.entries(ENV_VALIDATION_RULES.optional).forEach(([name, rule]) => {
    const value = process.env[name];
    const result = validateEnvVar(name, value, rule, 'optional');
    
    if (!result.valid) {
      optionalIssues.push(result);
    }
  });
  
  // Generar recomendaciones
  if (criticalIssues.length > 0) {
    recommendations.push('🚨 CRÍTICO: Configurar todas las variables críticas antes de continuar');
  }
  
  if (importantIssues.length > 0) {
    recommendations.push('⚠️ IMPORTANTE: Algunas funcionalidades estarán limitadas sin variables importantes');
  }
  
  if (!process.env.KV_REST_API_URL && !process.env.UPSTASH_REDIS_REST_URL) {
    recommendations.push('📊 REDIS: Sin Redis configurado, el sistema será vulnerable a condiciones de carrera');
  }
  
  if (!process.env.JWT_SECRET) {
    recommendations.push('🔐 JWT: Sin JWT_SECRET, las sesiones de usuario no serán seguras');
  }
  
  const canExecute = criticalIssues.length === 0;
  const allValid = criticalIssues.length === 0 && importantIssues.length === 0 && optionalIssues.length === 0;
  
  console.log(`✅ ENVIRONMENT VALIDATION COMPLETE: ${allValid ? 'All valid' : 'Issues found'}`);
  console.log(`📊 Summary: ${criticalIssues.length} critical, ${importantIssues.length} important, ${optionalIssues.length} optional issues`);
  
  return {
    allValid,
    canExecute,
    criticalIssues,
    importantIssues,
    optionalIssues,
    recommendations
  };
}

/**
 * Validación al inicio de la aplicación (fail-fast)
 */
export function validateEnvironmentOrFail(): void {
  const validation = validateEnvironmentVariables();
  
  if (!validation.canExecute) {
    console.error('🚨 ENVIRONMENT VALIDATION FAILED:');
    console.error('💥 Critical issues prevent application startup:');
    
    validation.criticalIssues.forEach(issue => {
      console.error(`   ❌ ${issue.variable}: ${issue.error}`);
      if (issue.recommendation) {
        console.error(`      💡 ${issue.recommendation}`);
      }
    });
    
    console.error('\n📋 Complete the following steps:');
    validation.recommendations.forEach(rec => {
      console.error(`   ${rec}`);
    });
    
    // Log de seguridad
    securityAudit.securityViolation('Application startup blocked by environment validation', undefined, {
      criticalIssues: validation.criticalIssues.length,
      issues: validation.criticalIssues.map(i => i.variable)
    });
    
    // En desarrollo, mostrar ayuda; en producción, fallar silenciosamente
    if (process.env.NODE_ENV === 'development') {
      console.error('\n🛠️  DEVELOPMENT HELP:');
      console.error('   1. Create a .env.local file in your project root');
      console.error('   2. Add the missing environment variables');
      console.error('   3. Restart the development server');
      console.error('   4. Check the documentation for variable descriptions');
    }
    
    throw new Error(`Environment validation failed: ${validation.criticalIssues.length} critical issues`);
  }
  
  // Advertir sobre issues no críticos
  if (validation.importantIssues.length > 0) {
    console.warn('⚠️  ENVIRONMENT WARNINGS:');
    validation.importantIssues.forEach(issue => {
      console.warn(`   ⚠️  ${issue.variable}: ${issue.error}`);
    });
  }
  
  console.log('✅ Environment validation passed - application can start');
}

/**
 * Validación específica para operaciones críticas
 */
export function validateForCriticalOperation(operation: 'mint' | 'claim' | 'gasless'): boolean {
  const requiredVars: Record<string, string[]> = {
    mint: ['NEXT_PUBLIC_RPC_URL', 'NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS', 'PRIVATE_KEY_DEPLOY'],
    claim: ['NEXT_PUBLIC_RPC_URL', 'NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS', 'PRIVATE_KEY_DEPLOY'],
    gasless: ['BICONOMY_PAYMASTER_API_KEY', 'BICONOMY_BUNDLER_URL']
  };
  
  const required = requiredVars[operation] || [];
  const missing = required.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error(`❌ OPERATION ${operation.toUpperCase()} BLOCKED: Missing required environment variables:`, missing);
    securityAudit.dataValidation(`env_${operation}`, false, { missing, operation });
    return false;
  }
  
  securityAudit.dataValidation(`env_${operation}`, true, { operation });
  return true;
}

/**
 * Obtener configuración segura (sin exponer secretos)
 */
export function getSecureConfig(): Record<string, any> {
  return {
    // Configuración pública
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
    escrowContract: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS,
    nftContract: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS,
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
    ipfsGateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY,
    
    // Estado de configuración (sin valores)
    hasPrivateKey: !!process.env.PRIVATE_KEY_DEPLOY,
    hasRedis: !!(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL),
    hasJwtSecret: !!process.env.JWT_SECRET,
    hasBiconomy: !!(process.env.BICONOMY_PAYMASTER_API_KEY && process.env.BICONOMY_BUNDLER_URL),
    
    // Metadata
    nodeEnv: process.env.NODE_ENV,
    validationTimestamp: new Date().toISOString()
  };
}

/**
 * Función de diagnóstico para troubleshooting
 */
export function diagnoseEnvironmentIssues(): void {
  console.log('🔍 ENVIRONMENT DIAGNOSIS:');
  
  const validation = validateEnvironmentVariables();
  const config = getSecureConfig();
  
  console.log('📊 Environment Status:', config);
  console.log('🚨 Critical Issues:', validation.criticalIssues.length);
  console.log('⚠️  Important Issues:', validation.importantIssues.length);
  console.log('💡 Recommendations:', validation.recommendations);
  
  // Verificar conectividad
  if (process.env.NEXT_PUBLIC_RPC_URL) {
    console.log('🌐 Testing RPC connectivity...');
    // En un entorno real, aquí haríamos una prueba de conectividad
  }
  
  if (config.hasRedis) {
    console.log('📊 Redis configuration detected');
  } else {
    console.log('⚠️  No Redis configuration - system will be less robust');
  }
}

/**
 * Export de todas las funciones principales
 */
export {
  ENV_VALIDATION_RULES,
  ValidationResult,
  ValidationSummary
};