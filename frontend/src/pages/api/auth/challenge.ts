/**
 * SIWE Challenge Generation Endpoint
 * Generates secure challenges for wallet-based authentication
 * POST /api/auth/challenge
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { 
  generateNonce, 
  createSiweMessage, 
  formatSiweMessage,
  isValidEthereumAddress,
  SIWE_DOMAIN 
} from '../../../lib/siweAuth';
import { storeChallenge } from '../../../lib/challengeStorage';
import { checkRateLimit } from '../../../lib/rateLimiting';

interface ChallengeRequest {
  address: string;
  chainId?: number;
  domain?: string;
}

interface ChallengeResponse {
  success: boolean;
  nonce?: string;
  message?: string;
  domain?: string;
  error?: string;
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChallengeResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    console.log('🎯 SIWE Challenge Request:', {
      method: req.method,
      timestamp: new Date().toISOString(),
      origin: req.headers.origin
    });

    // Parse and validate request  
    const { address, chainId = 84532, domain }: ChallengeRequest = req.body;
    
    console.log('🔗 Challenge API using Chain ID:', chainId, '(from client wallet)');
    
    // Use provided domain (from client) or determine from request headers  
    const requestDomain = domain || req.headers.host;
    if (!requestDomain) {
      console.error('❌ SIWE: No domain available from request or headers');
      return res.status(400).json({ 
        success: false, 
        error: 'Domain required for SIWE challenge generation' 
      });
    }

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
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

    console.log('✅ Rate limit check passed for address:', address.slice(0, 10) + '...');

    // Generate secure nonce
    const nonce = generateNonce();

    // Create SIWE message with dynamic domain to avoid "suspicious request" warnings
    const siweMessage = {
      domain: requestDomain,
      address: ethers.getAddress(address),
      statement: "Sign in to CryptoGift Wallets to create and claim NFT gifts securely.",
      uri: `https://${requestDomain}`,
      version: "1",
      chainId,
      nonce,
      issuedAt: new Date().toISOString()
    };
    const formattedMessage = formatSiweMessage(siweMessage);

    // Store challenge securely with all necessary data for verification
    const challenge = {
      nonce,
      timestamp: Date.now(),
      address: siweMessage.address, // Use normalized address
      issuedAt: siweMessage.issuedAt, // Exact timestamp from message
      domain: requestDomain,
      chainId
    };

    await storeChallenge(nonce, challenge);

    console.log('🎯 SIWE Challenge generated:', {
      address: address.slice(0, 10) + '...',
      nonce: nonce.slice(0, 10) + '...',
      chainId,
      domain: requestDomain
    });

    // Return challenge to client
    return res.status(200).json({
      success: true,
      nonce,
      message: formattedMessage,
      domain: requestDomain,
      rateLimit: {
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime
      }
    });

  } catch (error: any) {
    console.error('❌ SIWE Challenge generation failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Challenge generation failed'
    });
  }
}