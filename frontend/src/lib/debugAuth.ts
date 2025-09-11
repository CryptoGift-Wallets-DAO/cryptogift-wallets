/**
 * DEBUG AUTHENTICATION HELPER
 * Protects debug endpoints from unauthorized access in production
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface DebugAuthResult {
  authorized: boolean;
  message?: string;
}

/**
 * Authenticate debug endpoint access
 * In development: always allow
 * In production: 
 *   - GET requests: require admin token (sensitive data)
 *   - POST requests: allow if from same origin (logging operations)
 */
export function authenticateDebugEndpoint(req: NextApiRequest): DebugAuthResult {
  // Always allow in development environment
  if (process.env.NODE_ENV === 'development') {
    return { authorized: true };
  }

  // In production, check if debug endpoints are enabled
  const debugEnabled = process.env.ENABLE_DEBUG_ENDPOINTS === 'true';
  
  if (!debugEnabled) {
    return { 
      authorized: false, 
      message: 'Debug endpoints are disabled in production. Set ENABLE_DEBUG_ENDPOINTS=true to enable.' 
    };
  }

  // 🔥 CRITICAL FIX: Allow POST requests for logging from frontend without token
  if (req.method === 'POST') {
    // Check if request is from same origin (frontend logging)
    const origin = req.headers.origin || req.headers.referer;
    const isFromOwnDomain = origin && (
      origin.includes('cryptogift-wallets.vercel.app') ||
      origin.includes('localhost')
    );
    
    if (isFromOwnDomain) {
      return { authorized: true, message: 'Frontend logging allowed' };
    }
  }

  // For GET requests and external origins, require admin token
  const adminToken = process.env.ADMIN_API_TOKEN;
  const providedToken = req.headers['x-admin-token'] || 
                       req.headers['authorization']?.replace('Bearer ', '') ||
                       req.body?.adminToken ||
                       req.query?.token;

  if (!adminToken) {
    return { 
      authorized: false, 
      message: 'ADMIN_API_TOKEN not configured - cannot authenticate debug access' 
    };
  }

  if (providedToken !== adminToken) {
    return { 
      authorized: false, 
      message: 'Invalid or missing admin token for debug endpoint access' 
    };
  }

  return { authorized: true };
}

/**
 * Middleware wrapper for debug endpoints
 */
export function withDebugAuth(handler: (req: NextApiRequest, res: NextApiResponse) => void | Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const authResult = authenticateDebugEndpoint(req);
    
    if (!authResult.authorized) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: authResult.message
      });
    }

    // Add debug context headers
    res.setHeader('X-Debug-Mode', 'enabled');
    res.setHeader('X-Environment', process.env.NODE_ENV || 'unknown');
    
    return handler(req, res);
  };
}