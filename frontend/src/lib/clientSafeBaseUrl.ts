/**
 * CLIENT-SAFE BASE URL HELPER - LOCALE-AGNOSTIC METADATA URLS
 *
 * CRITICAL: Ensures metadata URLs always point to the correct API endpoints
 * regardless of user locale (/en prefix) or current page context.
 *
 * PROBLEM SOLVED:
 * - When user is on /en/gift/claim/123, window.location.origin might be used
 *   incorrectly to construct /en/api/nft-metadata which returns 404
 * - API routes exist only at /api/* not /en/api/*
 * - This function ensures locale-agnostic URL construction
 */

/**
 * Get base URL safe for client-side metadata URL construction
 * Always returns the root domain without locale prefixes
 */
export function getClientSafeBaseUrl(): string {
  // Priority 1: Use explicit environment configuration (always preferred)
  const envUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (envUrl) {
    const finalUrl = envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
    return finalUrl;
  }

  // Priority 2: Browser detection with locale-safety
  if (typeof window !== 'undefined' && window.location?.origin) {
    // window.location.origin gives us the base domain without path
    // For https://domain.com/en/gift/claim/123 → returns https://domain.com
    // This is exactly what we want for API calls
    return window.location.origin;
  }

  // Priority 3: Fallback for SSR context
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Default fallback - should not happen in production
  return 'https://cryptogift-wallets.vercel.app';
}

/**
 * Construct metadata URL safe for all locale contexts
 * @param contractAddress - Contract address
 * @param tokenId - Token ID
 * @returns Complete metadata URL pointing to correct API endpoint
 */
export function getMetadataUrl(contractAddress: string, tokenId: string | number): string {
  const baseUrl = getClientSafeBaseUrl();
  return `${baseUrl}/api/nft-metadata/${contractAddress}/${tokenId}`;
}

/**
 * Construct standard metadata URL (for MetaMask compatibility)
 * @param contractAddress - Contract address
 * @param tokenId - Token ID
 * @returns Complete metadata URL pointing to MetaMask-compatible endpoint
 */
export function getStandardMetadataUrl(contractAddress: string, tokenId: string | number): string {
  const baseUrl = getClientSafeBaseUrl();
  return `${baseUrl}/api/metadata/${contractAddress}/${tokenId}`;
}