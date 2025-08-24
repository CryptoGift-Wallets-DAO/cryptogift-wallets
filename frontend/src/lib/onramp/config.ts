/**
 * On-Ramp Configuration
 * Fiat to crypto purchase settings
 */

export const ONRAMP_CONFIG = {
  // Feature flag
  enabled: process.env.NEXT_PUBLIC_FEATURE_ONRAMP === 'on',
  
  // Provider
  provider: process.env.NEXT_PUBLIC_ONRAMP_PROVIDER || 'transak',
  
  // Transak configuration
  transak: {
    apiKey: process.env.NEXT_PUBLIC_TRANSAK_API_KEY || '',
    environment: process.env.NEXT_PUBLIC_TRANSAK_ENVIRONMENT || 'STAGING',
    widgetUrl: 'https://global.transak.com',
    
    // Default parameters
    defaultCrypto: 'USDC',
    defaultNetwork: 'base',
    defaultFiatCurrency: 'USD',
    defaultFiatAmount: 100,
    
    // Supported networks for Base
    networks: {
      base: {
        name: 'base',
        chainId: 8453,
        tokens: ['ETH', 'USDC'],
      },
      ethereum: {
        name: 'ethereum',
        chainId: 1,
        tokens: ['ETH', 'USDC', 'USDT'],
      },
    },
    
    // Widget customization
    themeColor: '3B82F6', // Blue
    hideMenu: true,
    isAutoFillUserData: true,
    disableWalletAddressForm: true,
  },
  
  // MoonPay configuration (alternative)
  moonpay: {
    apiKey: process.env.NEXT_PUBLIC_MOONPAY_API_KEY || '',
    environment: process.env.NEXT_PUBLIC_MOONPAY_ENVIRONMENT || 'sandbox',
    widgetUrl: process.env.NEXT_PUBLIC_MOONPAY_ENVIRONMENT === 'sandbox' 
      ? 'https://buy-sandbox.moonpay.com'
      : 'https://buy.moonpay.com',
    
    defaultCurrencyCode: 'usdc_base',
    baseCurrencyCode: 'usd',
    baseCurrencyAmount: '100',
    
    // Theme
    colorCode: '#3B82F6',
  },
  
  // Coinbase Pay configuration (alternative)
  coinbasePay: {
    appId: process.env.NEXT_PUBLIC_COINBASE_PAY_APP_ID || '',
    
    // Supported assets on Base
    assets: ['ETH', 'USDC'],
    defaultAsset: 'USDC',
    
    // Preset amounts
    presetAmounts: [50, 100, 250, 500],
  },
  
  // Amount limits (USD)
  limits: {
    min: parseFloat(process.env.NEXT_PUBLIC_ONRAMP_MIN_AMOUNT_USD || '20'),
    max: parseFloat(process.env.NEXT_PUBLIC_ONRAMP_MAX_AMOUNT_USD || '5000'),
  },
  
  // Supported countries (ISO codes)
  // Full list varies by provider
  supportedCountries: [
    'US', 'GB', 'EU', 'CA', 'AU', 'NZ', 'SG', 'HK', 'JP', 'KR',
    'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'IN', 'ID', 'MY', 'PH',
    'TH', 'VN', 'ZA', 'NG', 'KE', 'EG', 'AE', 'SA', 'IL', 'TR',
  ],
  
  // KYC requirements by amount (varies by provider)
  kycThresholds: {
    none: 0, // No KYC required
    basic: 150, // Email + phone
    intermediate: 1000, // + ID verification
    full: 5000, // + Proof of address
  },
  
  // Payment methods
  paymentMethods: {
    transak: ['card', 'bank_transfer', 'apple_pay', 'google_pay'],
    moonpay: ['credit_debit_card', 'bank_transfer', 'apple_pay', 'google_pay'],
    coinbase: ['debit_card', 'bank_account', 'paypal'],
  },
  
  // Telemetry events
  telemetry: {
    events: {
      WIDGET_OPEN: 'onramp.widget.open',
      WIDGET_CLOSE: 'onramp.widget.close',
      PURCHASE_START: 'onramp.purchase.start',
      PURCHASE_SUCCESS: 'onramp.purchase.success',
      PURCHASE_FAILURE: 'onramp.purchase.failure',
      KYC_START: 'onramp.kyc.start',
      KYC_SUCCESS: 'onramp.kyc.success',
      KYC_FAILURE: 'onramp.kyc.failure',
    },
  },
};

/**
 * Get widget URL with parameters
 */
export function getOnRampUrl(params: {
  address: string;
  amount?: number;
  crypto?: string;
  fiatCurrency?: string;
  network?: string;
}): string {
  const provider = ONRAMP_CONFIG.provider;
  
  if (provider === 'transak') {
    const config = ONRAMP_CONFIG.transak;
    const queryParams = new URLSearchParams({
      apiKey: config.apiKey,
      environment: config.environment,
      cryptoCurrencyCode: params.crypto || config.defaultCrypto,
      network: params.network || config.defaultNetwork,
      walletAddress: params.address,
      fiatCurrency: params.fiatCurrency || config.defaultFiatCurrency,
      defaultFiatAmount: (params.amount || config.defaultFiatAmount).toString(),
      themeColor: config.themeColor,
      hideMenu: config.hideMenu.toString(),
      isAutoFillUserData: config.isAutoFillUserData.toString(),
      disableWalletAddressForm: config.disableWalletAddressForm.toString(),
    });
    
    return `${config.widgetUrl}?${queryParams}`;
  }
  
  if (provider === 'moonpay') {
    const config = ONRAMP_CONFIG.moonpay;
    const queryParams = new URLSearchParams({
      apiKey: config.apiKey,
      currencyCode: params.crypto?.toLowerCase() === 'usdc' ? 'usdc_base' : 'eth_base',
      baseCurrencyCode: params.fiatCurrency?.toLowerCase() || config.baseCurrencyCode,
      baseCurrencyAmount: (params.amount || config.baseCurrencyAmount).toString(),
      walletAddress: params.address,
      colorCode: config.colorCode,
    });
    
    return `${config.widgetUrl}?${queryParams}`;
  }
  
  // Coinbase Pay uses SDK, return config
  return '';
}

/**
 * Check if country is supported
 */
export function isCountrySupported(countryCode: string): boolean {
  return ONRAMP_CONFIG.supportedCountries.includes(countryCode.toUpperCase());
}

/**
 * Get KYC level for amount
 */
export function getKYCLevel(amount: number): string {
  const thresholds = ONRAMP_CONFIG.kycThresholds;
  
  if (amount <= thresholds.basic) return 'none';
  if (amount <= thresholds.intermediate) return 'basic';
  if (amount <= thresholds.full) return 'intermediate';
  return 'full';
}

/**
 * Format KYC requirements
 */
export function formatKYCRequirements(level: string): string[] {
  switch (level) {
    case 'none':
      return ['No verification required'];
    case 'basic':
      return ['Email verification', 'Phone number verification'];
    case 'intermediate':
      return ['Email verification', 'Phone number', 'ID verification'];
    case 'full':
      return ['Email verification', 'Phone number', 'ID verification', 'Proof of address'];
    default:
      return [];
  }
}