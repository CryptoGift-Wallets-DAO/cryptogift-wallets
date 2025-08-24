/**
 * VAPID Key Generation Utilities
 * Server-side only - DO NOT expose private key to client
 */

import crypto from 'crypto';

/**
 * Generate VAPID keys
 * Run this once and store securely
 */
export function generateVAPIDKeys(): { publicKey: string; privateKey: string } {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  
  const publicKey = ecdh.getPublicKey();
  const privateKey = ecdh.getPrivateKey();
  
  return {
    publicKey: urlBase64Encode(publicKey),
    privateKey: urlBase64Encode(privateKey),
  };
}

/**
 * URL-safe base64 encoding
 */
function urlBase64Encode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Get VAPID keys from environment
 * Server-side only
 */
export function getVAPIDKeys(): { publicKey: string; privateKey: string } | null {
  const publicKey = process.env.NEXT_PUBLIC_WEBPUSH_PUBLIC_KEY;
  const privateKey = process.env.WEBPUSH_PRIVATE_KEY;
  
  if (!publicKey || !privateKey) {
    console.error('[Push] VAPID keys not configured');
    return null;
  }
  
  return { publicKey, privateKey };
}

/**
 * Generate VAPID headers for web push
 * Server-side only
 */
export function generateVAPIDHeaders(
  endpoint: string,
  publicKey: string,
  privateKey: string,
  subject: string
): { Authorization: string; 'Crypto-Key': string } {
  const audience = new URL(endpoint).origin;
  const expiration = Math.floor(Date.now() / 1000) + (12 * 60 * 60); // 12 hours
  
  const header = {
    typ: 'JWT',
    alg: 'ES256',
  };
  
  const payload = {
    aud: audience,
    exp: expiration,
    sub: subject,
  };
  
  const jwt = signJWT(header, payload, privateKey);
  
  return {
    Authorization: `vapid t=${jwt}, k=${publicKey}`,
    'Crypto-Key': `p256ecdsa=${publicKey}`,
  };
}

/**
 * Simple JWT signing for VAPID
 */
function signJWT(
  header: any,
  payload: any,
  privateKey: string
): string {
  const encodedHeader = urlBase64Encode(Buffer.from(JSON.stringify(header)));
  const encodedPayload = urlBase64Encode(Buffer.from(JSON.stringify(payload)));
  
  const message = `${encodedHeader}.${encodedPayload}`;
  
  const sign = crypto.createSign('SHA256');
  sign.update(message);
  sign.end();
  
  const signature = sign.sign({
    key: Buffer.from(privateKey, 'base64'),
    format: 'der',
    type: 'sec1',
  });
  
  const encodedSignature = urlBase64Encode(signature);
  
  return `${message}.${encodedSignature}`;
}