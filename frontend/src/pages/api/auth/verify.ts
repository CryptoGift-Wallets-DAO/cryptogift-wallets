/**
 * SIWE Signature Verification Endpoint
 * Verifies wallet signatures and generates JWT tokens
 * POST /api/auth/verify
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { 
  createSiweMessage, 
  verifySiweSignature, 
  generateJWT,
  isValidEthereumAddress,
  formatSiweMessage
} from '../../../lib/siweAuth';
import { getChallenge, removeChallenge } from '../../../lib/challengeStorage';
import { checkRateLimit } from '../../../lib/rateLimiting';

interface VerifyRequest {
  address: string;
  signature: string;
  nonce: string;
  chainId?: number;
  domain?: string;
}

interface VerifyResponse {
  success: boolean;
  token?: string;
  address?: string;
  expiresAt?: number;
  error?: string;
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerifyResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    console.log('🔐 SIWE Verification Request:', {
      method: req.method,
      timestamp: new Date().toISOString(),
      origin: req.headers.origin
    });

    // Check critical environment variables
    if (!process.env.JWT_SECRET) {
      console.error('❌ CRITICAL: JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: JWT_SECRET missing'
      });
    }

    // Parse and validate request
    const { address, signature, nonce, chainId = 84532, domain }: VerifyRequest = req.body;
    
    console.log('🔗 Verify API using Chain ID:', chainId, '(from client wallet)');
    
    // Use provided domain (from client) or determine from request headers
    const requestDomain = domain || req.headers.host || 'cryptogift-wallets.vercel.app';

    if (!address || !signature || !nonce) {
      return res.status(400).json({
        success: false,
        error: 'Address, signature, and nonce are required'
      });
    }

    if (!isValidEthereumAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }

    // Rate limiting check per address (Redis persistent)
    const rateLimit = await checkRateLimit(address);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.`,
        rateLimit: {
          remaining: rateLimit.remaining,
          resetTime: rateLimit.resetTime
        }
      });
    }

    console.log('✅ Rate limit check passed for verification:', address.slice(0, 10) + '...');

    // Retrieve challenge
    const challenge = await getChallenge(nonce);
    if (!challenge) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired challenge. Please request a new challenge.'
      });
    }

    console.log('✅ Challenge retrieved:', {
      nonce: nonce.slice(0, 10) + '...',
      storedAddress: challenge.address.slice(0, 10) + '...',
      providedAddress: address.slice(0, 10) + '...',
      age: Math.floor((Date.now() - challenge.timestamp) / 1000) + 's'
    });

    // Verify addresses match
    if (challenge.address.toLowerCase() !== address.toLowerCase()) {
      await removeChallenge(nonce); // Clean up invalid challenge
      return res.status(400).json({
        success: false,
        error: 'Address mismatch. Challenge was issued for a different address.'
      });
    }

    // Recreate the SIWE message that should have been signed (must match challenge exactly)
    const siweMessage = {
      domain: challenge.domain || requestDomain, // Use domain from challenge if available
      address: ethers.getAddress(challenge.address),
      statement: "Sign in to CryptoGift Wallets to create and claim NFT gifts securely.",
      uri: `https://${challenge.domain || requestDomain}`,
      version: "1",
      chainId: challenge.chainId || chainId, // Use chainId from challenge if available
      nonce,
      issuedAt: challenge.issuedAt || new Date(challenge.timestamp).toISOString() // Use exact issuedAt from challenge
    };
    
    console.log('🔍 Verifying signature with:', {
      messageAddress: siweMessage.address.slice(0, 10) + '...',
      providedAddress: address.slice(0, 10) + '...',
      chainId: siweMessage.chainId,
      domain: siweMessage.domain,
      issuedAt: siweMessage.issuedAt,
      nonce: nonce.slice(0, 10) + '...'
    });
    
    const messageToVerify = formatSiweMessage(siweMessage);
    console.log('🗋 Message that will be verified:');
    console.log(messageToVerify);
    console.log('🗋 Raw message comparison:');
    console.log('Expected message length:', messageToVerify.length);
    console.log('Signature length:', signature.length);
    console.log('Challenge domain:', challenge.domain);
    console.log('Request domain:', requestDomain);
    console.log('Message issuedAt:', siweMessage.issuedAt);
    console.log('Challenge issuedAt:', challenge.issuedAt);

    // Verify signature
    const isValidSignature = verifySiweSignature(siweMessage, signature);
    if (!isValidSignature) {
      console.error('❌ Signature verification failed for:', {
        address: address.slice(0, 10) + '...',
        expectedAddress: siweMessage.address.slice(0, 10) + '...',
        chainId,
        signatureLength: signature.length
      });
      
      await removeChallenge(nonce); // Clean up failed challenge
      return res.status(400).json({
        success: false,
        error: 'Invalid signature. Please sign the message with your wallet.'
      });
    }

    console.log('✅ SIWE signature verified successfully:', {
      address: address.slice(0, 10) + '...',
      nonce: nonce.slice(0, 10) + '...',
      chainId
    });

    // Generate JWT token
    const token = generateJWT(challenge.address, nonce);
    const expiresAt = Math.floor(Date.now() / 1000) + (2 * 60 * 60); // 2 hours

    // Clean up used challenge
    await removeChallenge(nonce);

    console.log('🎟️ JWT token generated:', {
      address: challenge.address.slice(0, 10) + '...',
      expiresAt: new Date(expiresAt * 1000).toISOString(),
      tokenPreview: token.slice(0, 20) + '...'
    });

    // Return success response with token
    return res.status(200).json({
      success: true,
      token,
      address: challenge.address,
      expiresAt,
      rateLimit: {
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime
      }
    });

  } catch (error: any) {
    console.error('❌ SIWE Verification failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Signature verification failed'
    });
  }
}