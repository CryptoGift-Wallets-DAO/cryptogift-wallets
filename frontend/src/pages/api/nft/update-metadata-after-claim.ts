/**
 * UPDATE METADATA AFTER CLAIM API
 * Updates Redis metadata after successful frontend NFT claim
 * Fixes mobile claiming issue where NFTs show placeholders instead of real images
 * 
 * ROOT CAUSE: Frontend claims (used on mobile) weren't updating Redis metadata
 * SOLUTION: This endpoint updates Redis with real metadata after successful claim
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyJWT, extractTokenFromHeaders } from '../../../lib/siweAuth';
import { debugLogger } from '../../../lib/secureDebugLogger';
import { kv } from '@vercel/kv';

interface UpdateMetadataRequest {
  tokenId: string;
  contractAddress: string;
  claimerAddress: string;
  transactionHash: string;
  giftMessage?: string;
  imageUrl?: string;
}

interface UpdateMetadataResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// JWT Authentication middleware
function authenticate(req: NextApiRequest): { success: boolean; address?: string; error?: string } {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeaders(authHeader);
    
    if (!token) {
      return { 
        success: false, 
        error: 'Authentication required. Please provide a valid JWT token.' 
      };
    }
    
    const payload = verifyJWT(token);
    if (!payload) {
      return { 
        success: false, 
        error: 'Invalid or expired authentication token. Please sign in again.' 
      };
    }
    
    debugLogger.operation('Update metadata after claim - JWT authenticated', {
      address: payload.address.slice(0, 10) + '...',
      exp: new Date(payload.exp * 1000).toISOString()
    });
    
    return { 
      success: true, 
      address: payload.address 
    };
    
  } catch (error: any) {
    console.error('❌ JWT authentication error:', error);
    return { 
      success: false, 
      error: 'Authentication verification failed' 
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateMetadataResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }
  
  try {
    // Authenticate request using JWT
    const authResult = authenticate(req);
    if (!authResult.success) {
      return res.status(401).json({ 
        success: false,
        error: authResult.error || 'Unauthorized' 
      });
    }
    
    const authenticatedAddress = authResult.address!;
    console.log('🔐 Update metadata authenticated for address:', authenticatedAddress.slice(0, 10) + '...');
    
    // Parse and validate request body
    const {
      tokenId,
      contractAddress,
      claimerAddress,
      transactionHash,
      giftMessage,
      imageUrl
    }: UpdateMetadataRequest = req.body;
    
    // Validate required fields
    if (!tokenId || !contractAddress || !claimerAddress || !transactionHash) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: tokenId, contractAddress, claimerAddress, transactionHash' 
      });
    }
    
    // Verify that authenticated address matches the claimer address
    if (authenticatedAddress.toLowerCase() !== claimerAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only update metadata for your own claims'
      });
    }
    
    console.log('📱 MOBILE FIX: Updating metadata after frontend claim:', {
      tokenId,
      contractAddress: contractAddress.slice(0, 10) + '...',
      claimerAddress: claimerAddress.slice(0, 10) + '...',
      transactionHash: transactionHash.slice(0, 10) + '...',
      hasGiftMessage: !!giftMessage,
      hasImageUrl: !!imageUrl
    });
    
    debugLogger.operation('Updating Redis metadata after claim', {
      tokenId,
      contractAddress,
      claimerAddress: claimerAddress.slice(0, 10) + '...',
      transactionHash: transactionHash.slice(0, 10) + '...'
    });
    
    // Generate Redis key for this NFT's metadata
    const metadataKey = `nft_metadata:${contractAddress.toLowerCase()}:${tokenId}`;
    
    // Get existing metadata from Redis (if any)
    let existingMetadata: any = null;
    try {
      const storedData = await kv.get(metadataKey);
      if (storedData) {
        existingMetadata = typeof storedData === 'string' ? JSON.parse(storedData) : storedData;
        console.log('📦 Found existing metadata in Redis:', {
          hasImage: !!existingMetadata?.image,
          hasImageUrl: !!existingMetadata?.image_url,
          name: existingMetadata?.name
        });
      }
    } catch (redisError) {
      console.warn('⚠️ Could not retrieve existing metadata:', redisError);
    }
    
    // Prepare updated metadata
    const updatedMetadata = {
      // Use existing metadata as base, or create new structure
      ...(existingMetadata || {
        name: `CryptoGift NFT #${tokenId}`,
        description: giftMessage || 'Un regalo cripto único creado con amor',
        external_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cryptogift-wallets.vercel.app'}/gift/claim/${tokenId}`
      }),
      
      // Update with claim information
      image: imageUrl || existingMetadata?.image || `ipfs://placeholder-${tokenId}`,
      image_url: imageUrl ? (imageUrl.startsWith('ipfs://') ? 
        `https://ipfs.io/ipfs/${imageUrl.replace('ipfs://', '')}` : 
        imageUrl) : existingMetadata?.image_url,
      
      // Add or update attributes
      attributes: [
        ...(existingMetadata?.attributes || []).filter((attr: any) => 
          !['Claim Status', 'Claimed By', 'Claim Transaction', 'Claim Date'].includes(attr.trait_type)
        ),
        {
          trait_type: 'Claim Status',
          value: 'Claimed'
        },
        {
          trait_type: 'Claimed By',
          value: claimerAddress
        },
        {
          trait_type: 'Claim Transaction',
          value: transactionHash
        },
        {
          trait_type: 'Claim Date',
          value: new Date().toISOString()
        }
      ],
      
      // Update timestamps
      updatedAt: new Date().toISOString(),
      claimedAt: new Date().toISOString()
    };
    
    // Store updated metadata in Redis with 30-day TTL
    const ttl = 30 * 24 * 60 * 60; // 30 days in seconds
    await kv.setex(metadataKey, ttl, JSON.stringify(updatedMetadata));
    
    console.log('✅ Metadata updated in Redis successfully:', {
      key: metadataKey,
      ttl: `${ttl} seconds (30 days)`,
      hasImage: !!updatedMetadata.image && !updatedMetadata.image.includes('placeholder'),
      attributeCount: updatedMetadata.attributes.length
    });
    
    debugLogger.operation('Redis metadata updated successfully', {
      tokenId,
      key: metadataKey,
      hasRealImage: !!updatedMetadata.image && !updatedMetadata.image.includes('placeholder'),
      ttlDays: 30
    });
    
    // Also update a claim record for tracking
    const claimRecordKey = `nft_claim:${contractAddress.toLowerCase()}:${tokenId}`;
    const claimRecord = {
      tokenId,
      contractAddress,
      claimerAddress,
      transactionHash,
      claimedAt: new Date().toISOString(),
      giftMessage: giftMessage || null,
      imageUrl: imageUrl || null,
      metadataUpdated: true
    };
    
    await kv.setex(claimRecordKey, ttl, JSON.stringify(claimRecord));
    
    console.log('📝 Claim record stored:', {
      key: claimRecordKey,
      claimerAddress: claimerAddress.slice(0, 10) + '...'
    });
    
    return res.status(200).json({
      success: true,
      message: 'Metadata updated successfully after claim'
    });
    
  } catch (error: any) {
    console.error('💥 UPDATE METADATA AFTER CLAIM ERROR:', error);
    debugLogger.operation('Update metadata after claim error', {
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}