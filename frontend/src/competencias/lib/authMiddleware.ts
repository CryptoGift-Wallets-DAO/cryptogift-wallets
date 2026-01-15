/**
 * Authentication Middleware for Competition APIs
 * Reutiliza el sistema SIWE existente (siweAuth.ts)
 *
 * USO:
 * ```typescript
 * import { withAuth, getAuthenticatedAddress } from '../../../competencias/lib/authMiddleware';
 *
 * async function handler(req: NextApiRequest, res: NextApiResponse) {
 *   const address = getAuthenticatedAddress(req);
 *   // address está garantizado como válido
 * }
 *
 * export default withAuth(handler);
 * ```
 */

import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { verifyJWT, extractTokenFromHeaders, AuthToken } from '../../lib/siweAuth';

// Extend NextApiRequest to include authenticated user
declare module 'next' {
  interface NextApiRequest {
    auth?: AuthToken;
  }
}

/**
 * Higher-order function that wraps an API handler with authentication
 * Returns 401 if no valid JWT token is present
 */
export function withAuth(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeaders(authHeader);

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NO_TOKEN',
        message: 'Please sign in with your wallet to access this resource'
      });
    }

    // Verify JWT token using existing siweAuth.ts
    const authData = verifyJWT(token);

    if (!authData) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
        message: 'Your session has expired. Please sign in again.'
      });
    }

    // Attach authenticated user to request
    req.auth = authData;

    // Log authenticated request (without sensitive data)
    console.log('🔐 Authenticated request:', {
      address: authData.address.slice(0, 10) + '...',
      endpoint: req.url,
      method: req.method,
      exp: new Date(authData.exp * 1000).toISOString()
    });

    // Call the actual handler
    return handler(req, res);
  };
}

/**
 * Helper to get authenticated address from request
 * Only call this inside a handler wrapped with withAuth()
 * @throws Error if called without authentication
 */
export function getAuthenticatedAddress(req: NextApiRequest): string {
  if (!req.auth?.address) {
    throw new Error('getAuthenticatedAddress called without authentication. Wrap handler with withAuth()');
  }
  return req.auth.address;
}

/**
 * Helper to get full auth data from request
 */
export function getAuthData(req: NextApiRequest): AuthToken | undefined {
  return req.auth;
}

/**
 * Verify that the authenticated user matches a specific address
 * Useful for owner-only operations
 */
export function verifyAddressMatch(req: NextApiRequest, expectedAddress: string): boolean {
  const authenticatedAddress = req.auth?.address;
  if (!authenticatedAddress) return false;

  return authenticatedAddress.toLowerCase() === expectedAddress.toLowerCase();
}

/**
 * Middleware that allows both authenticated and unauthenticated requests
 * Sets req.auth if token is valid, but doesn't block if missing
 */
export function withOptionalAuth(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Try to extract and verify token
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeaders(authHeader);

    if (token) {
      const authData = verifyJWT(token);
      if (authData) {
        req.auth = authData;
        console.log('🔐 Optional auth: User authenticated:', authData.address.slice(0, 10) + '...');
      }
    }

    // Call handler regardless of auth status
    return handler(req, res);
  };
}
