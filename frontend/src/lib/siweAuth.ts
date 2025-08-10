/**
 * SIWE (Sign-In With Ethereum) Authentication System
 * Secure wallet-based authentication for Web3 applications
 * Follows EIP-4361 standards for 2025
 */

import { ethers } from 'ethers';
import { createHmac } from 'crypto';

// Challenge configuration
export const CHALLENGE_EXPIRY = 10 * 60 * 1000; // 10 minutes
export const JWT_EXPIRY = 2 * 60 * 60; // 2 hours in seconds

// Dynamic domain detection for SIWE to avoid "suspicious request" warnings
export function getSiweDomain(): string {
  // In browser, use current hostname to avoid domain mismatch warnings
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  
  // Server-side fallback - fail fast if not configured
  const domain = process.env.NEXT_PUBLIC_DOMAIN || process.env.VERCEL_URL;
  if (!domain) {
    console.error('❌ SIWE: NEXT_PUBLIC_DOMAIN or VERCEL_URL required');
    return 'localhost'; // Development fallback only
  }
  return domain;
}

export const SIWE_DOMAIN = getSiweDomain();

// Types
export interface SiweChallenge {
  nonce: string;
  timestamp: number;
  address: string;
  issuedAt: string; // ISO string from the SIWE message
  domain: string;
  chainId: number;
}

export interface SiweMessage {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
}

export interface AuthToken {
  address: string;
  iat: number;
  exp: number;
  nonce: string;
}

/**
 * Generate a cryptographically secure nonce
 */
export function generateNonce(): string {
  return ethers.hexlify(ethers.randomBytes(16));
}

/**
 * Create SIWE message following EIP-4361 standard
 */
export function createSiweMessage(
  address: string,
  nonce: string,
  chainId: number = 84532 // Base Sepolia (default)
): SiweMessage {
  const now = new Date();
  const domain = getSiweDomain();
  
  // Use protocol based on environment
  const protocol = domain.includes('localhost') ? 'http' : 'https';
  
  return {
    domain,
    address: ethers.getAddress(address), // Normalize address
    statement: "Sign in to CryptoGift Wallets to create and claim NFT gifts securely.",
    uri: `${protocol}://${domain}`,
    version: "1",
    chainId,
    nonce,
    issuedAt: now.toISOString()
  };
}

/**
 * Format SIWE message for signing (strict EIP-4361 compliance)
 */
export function formatSiweMessage(message: SiweMessage): string {
  // EIP-4361 requires exact formatting - no deviation allowed
  const formattedMessage = `${message.domain} wants you to sign in with your Ethereum account:
${message.address}

${message.statement}

URI: ${message.uri}
Version: ${message.version}
Chain ID: ${message.chainId}
Nonce: ${message.nonce}
Issued At: ${message.issuedAt}`;
  
  console.log('📝 SIWE message formatted:', {
    domain: message.domain,
    address: message.address.slice(0, 10) + '...',
    chainId: message.chainId,
    nonce: message.nonce.slice(0, 10) + '...',
    messageLength: formattedMessage.length
  });
  
  return formattedMessage;
}

/**
 * Verify SIWE signature
 */
export function verifySiweSignature(
  message: SiweMessage,
  signature: string
): boolean {
  try {
    const formattedMessage = formatSiweMessage(message);
    
    console.log('🔍 Verifying SIWE signature:', {
      messageLength: formattedMessage.length,
      signatureLength: signature.length,
      expectedAddress: message.address.slice(0, 10) + '...',
      chainId: message.chainId
    });
    
    // Clean up signature format - some wallets add extra characters
    let cleanSignature = signature.trim();
    if (!cleanSignature.startsWith('0x')) {
      cleanSignature = '0x' + cleanSignature;
    }
    
    const recoveredAddress = ethers.verifyMessage(formattedMessage, cleanSignature);
    
    console.log('🔍 Signature verification result:', {
      recoveredAddress: recoveredAddress.slice(0, 10) + '...',
      expectedAddress: message.address.slice(0, 10) + '...',
      match: recoveredAddress.toLowerCase() === message.address.toLowerCase()
    });
    
    return recoveredAddress.toLowerCase() === message.address.toLowerCase();
  } catch (error) {
    console.error('❌ SIWE signature verification failed:', error);
    console.error('Message that was supposed to be signed:', formatSiweMessage(message));
    return false;
  }
}

/**
 * Generate simple JWT-like token for authenticated user (using native crypto)
 */
export function generateJWT(address: string, nonce: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('SECURITY CRITICAL: JWT_SECRET is required and must be configured separately from API_ACCESS_TOKEN');
  }

  const payload: AuthToken = {
    address: ethers.getAddress(address), // Normalize address
    nonce,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY
  };

  // Create simple JWT structure: header.payload.signature
  const header = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'HS256' })).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const signature = createHmac('sha256', secret)
    .update(`${header}.${payloadB64}`)
    .digest('base64url');

  return `${header}.${payloadB64}.${signature}`;
}

/**
 * Verify and decode JWT token
 */
export function verifyJWT(token: string): AuthToken | null {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('SECURITY CRITICAL: JWT_SECRET is required and must be configured separately from API_ACCESS_TOKEN');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [header, payload, signature] = parts;
    
    // Verify signature
    const expectedSignature = createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');
      
    if (signature !== expectedSignature) {
      return null;
    }

    // Decode payload
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString()) as AuthToken;
    
    // Additional validation
    if (!decoded.address || !decoded.nonce) {
      return null;
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Extract JWT token from request headers
 */
export function extractTokenFromHeaders(authHeader?: string): string | null {
  if (!authHeader) return null;
  
  // Support both "Bearer TOKEN" and just "TOKEN" formats
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return authHeader;
}

/**
 * Rate limiting key generator for wallet addresses
 */
export function getRateLimitKey(address: string, operation: string): string {
  return `rate_limit:${address.toLowerCase()}:${operation}`;
}

/**
 * Validate Ethereum address format
 */
export function isValidEthereumAddress(address: string): boolean {
  try {
    ethers.getAddress(address);
    return true;
  } catch {
    return false;
  }
}