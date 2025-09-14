/**
 * Security Middleware
 * CSP and security headers for production
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Environment check
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Intl middleware using centralized routing config
const intlMiddleware = createIntlMiddleware(routing);

// CSP Report endpoint
const CSP_REPORT_URI = '/api/security/csp-report';

/**
 * Generate Content Security Policy
 */
function generateCSP(): string {
  // Base directives
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for Next.js
      "'unsafe-eval'", // Required for development
      'https://*.thirdweb.com',
      'https://global.transak.com',
      'https://buy.moonpay.com',
      'https://buy-sandbox.moonpay.com',
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for styled components
      'https://fonts.googleapis.com',
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https://*.thirdweb.com',
      'https://ipfs.io',
      'https://*.ipfs.io',
      'https://*.ipfs.dweb.link',
      'https://gateway.pinata.cloud',
      'https://nftstorage.link',
      'https://*.nftstorage.link',
      'https://arweave.net',
      'https://*.arweave.net',
      // Mux video thumbnails
      'https://image.mux.com',
      'https://*.mux.com',
    ],
    'connect-src': [
      "'self'",
      // RPCs
      'https://*.alchemy.com',
      'https://*.infura.io',
      'https://mainnet.base.org',
      'https://sepolia.base.org',
      'https://eth.llamarpc.com',
      'https://rpc.sepolia.org',
      // APIs
      'https://*.thirdweb.com',
      'https://li.quest',
      'https://api.socket.tech',
      'https://global.transak.com',
      'https://api.moonpay.com',
      'https://api-sandbox.moonpay.com',
      'wss://*.walletconnect.com',
      'wss://*.walletconnect.org',
      // IPFS
      'https://ipfs.io',
      'https://*.ipfs.io',
      'https://*.ipfs.dweb.link',
      'https://gateway.pinata.cloud',
      'https://nftstorage.link',
      // Push Protocol
      'https://backend.epns.io',
      'https://backend-staging.epns.io',
      // Pimlico
      'https://api.pimlico.io',
      // Upstash Redis
      'https://*.upstash.io',
      // Analytics
      'https://api2.amplitude.com',
      'https://*.amplitude.com',
      'https://sr-client-cfg.amplitude.com',
      'https://api.amplitude.com',
      'https://us.i.posthog.com',
      'https://*.posthog.com',
      'https://app.posthog.com',
      'https://*.sentry.io',
      'https://plausible.io',
      // 0x API
      'https://base.api.0x.org',
      'https://api.0x.org',
      // Base Sepolia Explorer
      'https://base-sepolia.blockscout.com',
      'https://sepolia.basescan.org',
      // Mux video streaming
      'https://stream.mux.com',
      'https://*.mux.com',
      'https://*.edgemv.mux.com',
    ],
    'frame-src': [
      "'self'",
      'https://global.transak.com',
      'https://buy.moonpay.com',
      'https://buy-sandbox.moonpay.com',
      'https://pay.coinbase.com',
      'https://verify.walletconnect.com',
      'https://verify.walletconnect.org',
      'https://li.quest',
      'https://jumper.exchange',
    ],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'media-src': [
      "'self'",
      // Mux video streaming
      'https://stream.mux.com',
      'https://*.mux.com',
      'https://*.edgemv.mux.com',
      'blob:',
    ],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
  };
  
  // Remove unsafe-eval in production
  if (isProduction) {
    directives['script-src'] = directives['script-src'].filter(
      src => src !== "'unsafe-eval'"
    );
    
    // Add report URI
    directives['report-uri'] = [CSP_REPORT_URI];
  }
  
  // Build CSP string
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

/**
 * Security headers configuration
 */
function getSecurityHeaders(): HeadersInit {
  const csp = generateCSP();
  
  const headers: HeadersInit = {
    // CSP - Start with Report-Only in production
    'Content-Security-Policy-Report-Only': csp,
    
    // Security headers
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions Policy
    'Permissions-Policy': [
      'camera=(self)',
      'microphone=()',
      'geolocation=()',
      'payment=(self https://global.transak.com https://buy.moonpay.com)',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
    ].join(', '),
    
    // HSTS (only in production)
    ...(isProduction && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    }),
    
    // COOP/COEP - Adjusted for Coinbase Wallet SDK compatibility
    // Don't set to 'same-origin' as it breaks Coinbase Smart Wallet
    // See: https://www.smartwallet.dev/guides/tips/popup-tips#cross-origin-opener-policy
    'Cross-Origin-Opener-Policy': 'unsafe-none',
    'Cross-Origin-Embedder-Policy': 'unsafe-none',
  };
  
  return headers;
}

export function middleware(request: NextRequest) {
  
  // Skip middleware for API routes, static files, Pages Router routes, and App Router routes without i18n
  if (
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.startsWith('/static/') ||
    // Pages Router routes
    request.nextUrl.pathname.startsWith('/gift/') ||
    request.nextUrl.pathname === '/admin/migration' ||
    request.nextUrl.pathname === '/404' ||
    // App Router routes that don't need i18n
    request.nextUrl.pathname === '/authenticated' ||
    request.nextUrl.pathname === '/debug' ||
    request.nextUrl.pathname === '/sentry-example-page' ||
    request.nextUrl.pathname.startsWith('/admin/cache') ||
    request.nextUrl.pathname.startsWith('/token/') ||
    request.nextUrl.pathname.startsWith('/wallet/') ||
    // Marketing pages (should have their own handling or be moved to [locale])
    request.nextUrl.pathname === '/about' ||
    request.nextUrl.pathname === '/careers' ||
    request.nextUrl.pathname === '/explore' ||
    request.nextUrl.pathname === '/gallery' ||
    request.nextUrl.pathname === '/privacy' ||
    request.nextUrl.pathname === '/terms' ||
    // Static files
    request.nextUrl.pathname.includes('.')
  ) {
    // For API routes, add CORS headers
    const response = NextResponse.next();
    if (request.nextUrl.pathname.startsWith('/api/')) {
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    return response;
  }
  
  
  // Handle internationalization for other routes
  const intlResponse = intlMiddleware(request);
  if (intlResponse) {
    return intlResponse;
  }
  
  // Create response
  const response = NextResponse.next();
  
  // In development, skip most security headers to avoid issues
  if (isDevelopment) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('X-Frame-Options', 'SAMEORIGIN'); // Allow same-origin framing
    return response;
  }
  
  // Apply security headers only in production
  const securityHeaders = getSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value as string);
  });
  
  // Add CSP nonce for inline scripts (if needed)
  // const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  // response.headers.set('X-CSP-Nonce', nonce);
  
  return response;
}

export const config = {
  matcher: [
    // Minimal matcher - all stubs now exist in [locale] structure
    '/((?!api|_next|_vercel|.*\\..*).*)' 
  ],
};