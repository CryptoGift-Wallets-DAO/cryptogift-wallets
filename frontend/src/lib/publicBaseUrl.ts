import type { NextApiRequest } from 'next';

/**
 * UNIVERSAL BASE URL HELPER - FAIL-SAFE FOR TOKENURI GENERATION
 * CRITICAL: Prevents localhost tokenURIs that break external wallet display
 * Constructs public-facing base URL for tokenURI generation and links
 */
export function getPublicBaseUrl(req?: NextApiRequest): string {
  // Priority 1: Explicit environment configuration
  const envUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL;
  if (envUrl) {
    const finalUrl = envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
    console.log('✅ PUBLIC BASE URL resolved from env:', finalUrl);
    return finalUrl;
  }
  
  // Priority 2: Runtime detection from request headers (API context)
  if (req?.headers?.host) {
    const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
    const runtimeUrl = `${protocol}://${req.headers.host}`;
    
    // CRITICAL: Prevent localhost URLs in tokenURIs (breaks external access)
    if (runtimeUrl.includes('localhost') || runtimeUrl.includes('127.0.0.1')) {
      console.error('🚨 CRITICAL: Detected localhost URL in tokenURI generation context!');
      console.error('   This would create PERMANENTLY BROKEN tokenURIs for wallets/BaseScan');
      console.error('   Runtime URL detected:', runtimeUrl);
      throw new Error('CRITICAL: Cannot use localhost URL for tokenURI generation. Set NEXT_PUBLIC_BASE_URL in environment to your production URL.');
    }
    
    console.log('✅ PUBLIC BASE URL resolved from request:', runtimeUrl);
    return runtimeUrl;
  }
  
  // Priority 3: Browser runtime detection (client context - NON-TOKENURI)
  if (typeof window !== 'undefined' && window.location?.origin) {
    const browserUrl = window.location.origin;
    
    // Allow localhost in browser context (client-only usage)
    if (!browserUrl.includes('localhost')) {
      console.log('✅ PUBLIC BASE URL resolved from browser:', browserUrl);
    }
    return browserUrl;
  }
  
  // Priority 4: FAIL-FAST - ALWAYS for tokenURI generation
  console.error('🚨 CRITICAL ERROR: No public base URL available for tokenURI generation!');
  console.error('   This would create broken tokenURIs that wallets cannot access.');
  console.error('   SOLUTION: Set NEXT_PUBLIC_BASE_URL to your production URL in environment variables');
  console.error('   Current environment:', {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_URL: process.env.VERCEL_URL ? 'SET' : 'MISSING',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL ? 'SET' : 'MISSING'
  });
  
  throw new Error('CRITICAL: No public base URL available for tokenURI generation. Set NEXT_PUBLIC_BASE_URL to your production URL in Vercel environment variables.');
}