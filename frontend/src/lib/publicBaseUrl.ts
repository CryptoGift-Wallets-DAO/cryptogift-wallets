import type { NextApiRequest } from 'next';

/**
 * UNIVERSAL BASE URL HELPER
 * Constructs the public-facing base URL for tokenURI generation and links
 * Supports: production, preview, custom domains, and local development
 */
export function getPublicBaseUrl(req?: NextApiRequest): string {
  // Priority 1: Explicit environment configuration
  const envUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL;
  if (envUrl) {
    return envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
  }
  
  // Priority 2: Runtime detection from request headers (API context)
  if (req?.headers?.host) {
    const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
    return `${protocol}://${req.headers.host}`;
  }
  
  // Priority 3: Browser runtime detection (client context)
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  
  // Priority 4: Local development fallback
  return 'http://localhost:3000';
}