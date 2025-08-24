/**
 * Production Configuration & Feature Switches
 * Gradual rollout and shadow mode controls
 */

export interface ProductionConfig {
  // Environment
  environment: 'development' | 'staging' | 'production';
  isProduction: boolean;
  
  // Feature flags with gradual rollout
  features: {
    // Core features
    mevProtection: boolean;
    approvals: boolean;
    simPreview: boolean;
    walletManagement: boolean;
    txHistory: boolean;
    pwa: boolean;
    a11y: boolean;
    
    // Push notifications
    webPush: boolean;
    pushProtocol: boolean;
    pushProtocolProd: boolean; // Requires 50 PUSH stake
    
    // Account Abstraction
    erc20Paymaster: boolean;
    sessionKeys: boolean;
    recovery: boolean;
    
    // Bridges & On-ramp
    bridge: boolean;
    bridgeShadowMode: boolean; // Gradual rollout
    onramp: boolean;
    onrampProvider: 'transak' | 'moonpay' | 'coinbase';
  };
  
  // Shadow mode controls
  shadowMode: {
    enabled: boolean;
    features: string[]; // Features in shadow mode
    percentage: number; // Rollout percentage (0-100)
    userWhitelist: string[]; // Addresses to always enable
  };
  
  // Rate limiting
  rateLimits: {
    enabled: boolean;
    bypassToken?: string;
    configs: Record<string, {
      interval: number;
      maxRequests: number;
    }>;
  };
  
  // Security
  security: {
    cspEnforce: boolean; // false = Report-Only
    requireHttps: boolean;
    secretRotation: boolean;
    auditLogging: boolean;
  };
  
  // Monitoring
  monitoring: {
    sentry: boolean;
    analytics: boolean;
    performanceTracking: boolean;
    errorReporting: boolean;
  };
  
  // Maintenance
  maintenance: {
    enabled: boolean;
    message?: string;
    allowedIPs?: string[];
  };
}

/**
 * Get production configuration
 */
export function getProductionConfig(): ProductionConfig {
  const env = process.env.NODE_ENV || 'development';
  const isProduction = env === 'production';
  const isStaging = process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  
  return {
    environment: isProduction ? 'production' : isStaging ? 'staging' : 'development',
    isProduction,
    
    features: {
      // Core features (stable)
      mevProtection: process.env.NEXT_PUBLIC_MEV_PROTECT_MODE !== 'off',
      approvals: process.env.NEXT_PUBLIC_FEATURE_APPROVALS === 'on',
      simPreview: process.env.NEXT_PUBLIC_FEATURE_SIM_PREVIEW === 'on',
      walletManagement: process.env.NEXT_PUBLIC_FEATURE_WALLET_MANAGEMENT === 'on',
      txHistory: process.env.NEXT_PUBLIC_FEATURE_TX_HISTORY === 'on',
      pwa: process.env.NEXT_PUBLIC_FEATURE_PWA === 'on',
      a11y: process.env.NEXT_PUBLIC_FEATURE_A11Y === 'on',
      
      // Push notifications (staging → prod migration)
      webPush: process.env.NEXT_PUBLIC_FEATURE_WEBPUSH === 'on',
      pushProtocol: process.env.NEXT_PUBLIC_FEATURE_PUSH_PROTOCOL === 'on',
      pushProtocolProd: process.env.PUSH_ENV === 'prod',
      
      // Account Abstraction (gradual rollout)
      erc20Paymaster: process.env.NEXT_PUBLIC_FEATURE_ERC20_PAYMASTER === 'on',
      sessionKeys: process.env.NEXT_PUBLIC_FEATURE_SESSION_KEYS === 'on',
      recovery: process.env.NEXT_PUBLIC_FEATURE_RECOVERY === 'on',
      
      // Bridges & On-ramp (shadow → prod)
      bridge: process.env.NEXT_PUBLIC_FEATURE_BRIDGE === 'on',
      bridgeShadowMode: process.env.NEXT_PUBLIC_BRIDGE_SHADOW_MODE === 'true',
      onramp: process.env.NEXT_PUBLIC_FEATURE_ONRAMP === 'on',
      onrampProvider: (process.env.NEXT_PUBLIC_ONRAMP_PROVIDER || 'transak') as any,
    },
    
    shadowMode: {
      enabled: process.env.NEXT_PUBLIC_SHADOW_MODE === 'true',
      features: (process.env.NEXT_PUBLIC_SHADOW_FEATURES || '').split(',').filter(Boolean),
      percentage: parseInt(process.env.NEXT_PUBLIC_SHADOW_PERCENTAGE || '0', 10),
      userWhitelist: (process.env.NEXT_PUBLIC_SHADOW_WHITELIST || '').split(',').filter(Boolean),
    },
    
    rateLimits: {
      enabled: isProduction || process.env.RATE_LIMITS_ENABLED === 'true',
      bypassToken: process.env.RATE_LIMIT_BYPASS_TOKEN,
      configs: {
        api: {
          interval: 60000,
          maxRequests: isProduction ? 100 : 1000,
        },
        auth: {
          interval: 300000,
          maxRequests: isProduction ? 10 : 100,
        },
        bridge: {
          interval: 60000,
          maxRequests: isProduction ? 10 : 50,
        },
        onramp: {
          interval: 300000,
          maxRequests: isProduction ? 5 : 20,
        },
      },
    },
    
    security: {
      cspEnforce: isProduction && process.env.CSP_ENFORCE === 'true',
      requireHttps: isProduction,
      secretRotation: isProduction,
      auditLogging: isProduction || process.env.AUDIT_LOGGING === 'true',
    },
    
    monitoring: {
      sentry: isProduction && !!process.env.NEXT_PUBLIC_SENTRY_DSN,
      analytics: isProduction && !!process.env.NEXT_PUBLIC_ANALYTICS_ID,
      performanceTracking: isProduction,
      errorReporting: isProduction || isStaging,
    },
    
    maintenance: {
      enabled: process.env.MAINTENANCE_MODE === 'true',
      message: process.env.MAINTENANCE_MESSAGE,
      allowedIPs: (process.env.MAINTENANCE_ALLOWED_IPS || '').split(',').filter(Boolean),
    },
  };
}

/**
 * Check if feature is enabled for user
 */
export function isFeatureEnabled(
  feature: string,
  userAddress?: string
): boolean {
  const config = getProductionConfig();
  
  // Check maintenance mode
  if (config.maintenance.enabled) {
    // Check if user IP is allowed
    // This would need actual IP checking logic
    return false;
  }
  
  // Check if feature exists
  const featureEnabled = (config.features as any)[feature];
  if (!featureEnabled) return false;
  
  // Check shadow mode
  if (config.shadowMode.enabled && config.shadowMode.features.includes(feature)) {
    // Check whitelist
    if (userAddress && config.shadowMode.userWhitelist.includes(userAddress.toLowerCase())) {
      return true;
    }
    
    // Check percentage rollout
    if (userAddress) {
      const hash = hashAddress(userAddress);
      const percentage = (hash % 100) + 1;
      return percentage <= config.shadowMode.percentage;
    }
    
    return false;
  }
  
  return true;
}

/**
 * Simple hash function for address
 */
function hashAddress(address: string): number {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    const char = address.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get feature rollout percentage
 */
export function getFeatureRollout(feature: string): number {
  const config = getProductionConfig();
  
  if (config.shadowMode.enabled && config.shadowMode.features.includes(feature)) {
    return config.shadowMode.percentage;
  }
  
  return (config.features as any)[feature] ? 100 : 0;
}

/**
 * Production readiness checklist
 */
export function getProductionReadiness(): {
  ready: boolean;
  checks: Array<{
    name: string;
    status: boolean;
    required: boolean;
    message?: string;
  }>;
} {
  const config = getProductionConfig();
  
  const checks = [
    {
      name: 'Environment Variables',
      status: !!process.env.NEXT_PUBLIC_TW_CLIENT_ID && !!process.env.NEXT_PUBLIC_RPC_URL,
      required: true,
      message: 'Critical environment variables not set',
    },
    {
      name: 'CSP Headers',
      status: config.security.cspEnforce || !config.isProduction,
      required: true,
      message: 'CSP should be enforced in production',
    },
    {
      name: 'HTTPS Required',
      status: config.security.requireHttps || !config.isProduction,
      required: true,
      message: 'HTTPS is required in production',
    },
    {
      name: 'Rate Limiting',
      status: config.rateLimits.enabled,
      required: true,
      message: 'Rate limiting must be enabled',
    },
    {
      name: 'Shadow Mode Off',
      status: !config.features.bridgeShadowMode || !config.isProduction,
      required: false,
      message: 'Bridge shadow mode should be disabled for production',
    },
    {
      name: 'Monitoring',
      status: config.monitoring.sentry || !config.isProduction,
      required: false,
      message: 'Sentry monitoring recommended for production',
    },
    {
      name: 'Push Protocol',
      status: !config.features.pushProtocol || config.features.pushProtocolProd || !config.isProduction,
      required: false,
      message: 'Push Protocol requires production channel with 50 PUSH stake',
    },
    {
      name: 'Secrets Configured',
      status: !!process.env.JWT_SECRET && !!process.env.ADMIN_API_TOKEN,
      required: true,
      message: 'Security tokens not configured',
    },
  ];
  
  const ready = checks.filter(c => c.required).every(c => c.status);
  
  return { ready, checks };
}