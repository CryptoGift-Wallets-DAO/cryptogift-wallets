/**
 * 🔗 API Integration Configuration
 *
 * Centralized configuration for cross-service communication between
 * Wallets (gifts.mbxarts.com) and DAO (mbxarts.com) services.
 *
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

// =============================================================================
// SERVICE URLS
// =============================================================================

export const SERVICES = {
  DAO: {
    name: 'CryptoGift DAO',
    url: process.env.NEXT_PUBLIC_DAO_API_URL || 'https://mbxarts.com',
    internalUrl: process.env.DAO_INTERNAL_URL || 'https://mbxarts.com',
  },
  WALLETS: {
    name: 'CryptoGift Wallets',
    url: process.env.NEXT_PUBLIC_WALLETS_API_URL || 'https://gifts.mbxarts.com',
    internalUrl: process.env.WALLETS_INTERNAL_URL || 'https://gifts.mbxarts.com',
  },
} as const;

// =============================================================================
// API VERSIONING
// =============================================================================

export const API_VERSION = 'v1';
export const API_BASE_PATH = `/api/${API_VERSION}`;

// =============================================================================
// TIMEOUTS
// =============================================================================

export const TIMEOUTS = {
  default: 10000,
  long: 30000,
  internal: 5000,
} as const;

// =============================================================================
// RETRY CONFIG
// =============================================================================

export const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getServiceUrl(service: keyof typeof SERVICES, internal = false): string {
  const config = SERVICES[service];
  return internal ? config.internalUrl : config.url;
}

export function buildApiUrl(
  service: keyof typeof SERVICES,
  path: string,
  internal = false
): string {
  const baseUrl = getServiceUrl(service, internal);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${API_BASE_PATH}${cleanPath}`;
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
