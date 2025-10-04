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
import { Redis } from '@upstash/redis';
import { normalizeCidPath } from '../../../utils/ipfs';

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
    
    // Initialize Upstash Redis client (same as nftMetadataFallback.ts)
    let redis: Redis | null = null;
    try {
      const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

      if (redisUrl && redisToken) {
        redis = new Redis({
          url: redisUrl,
          token: redisToken,
          enableAutoPipelining: false,
          retry: false,
        });
        console.log('✅ Connected to Upstash Redis for metadata update');
      } else {
        console.warn('⚠️ Upstash Redis not configured, metadata update will be skipped');
        return res.status(200).json({
          success: true,
          message: 'Redis not configured, metadata update skipped'
        });
      }
    } catch (redisInitError) {
      console.error('❌ Redis initialization failed:', redisInitError);
      return res.status(200).json({
        success: true,
        message: 'Redis unavailable, metadata update skipped'
      });
    }

    // Get existing metadata from Redis (if any)
    let existingMetadata: any = null;
    try {
      const storedData = await redis.hgetall(metadataKey);
      if (storedData && Object.keys(storedData).length > 0) {
        existingMetadata = storedData;
        console.log('📦 Found existing metadata in Upstash Redis:', {
          hasImage: !!existingMetadata?.image,
          hasImageUrl: !!existingMetadata?.image_url,
          name: existingMetadata?.name
        });
      }
    } catch (redisError) {
      console.warn('⚠️ Could not retrieve existing metadata:', redisError);
    }
    
    // CRITICAL FIX: Parse attributes if they come as string from Redis
    const existingAttributes = existingMetadata?.attributes
      ? (typeof existingMetadata.attributes === 'string'
          ? JSON.parse(existingMetadata.attributes)
          : existingMetadata.attributes)
      : [];

    console.log('📦 Existing attributes parsed:', {
      type: typeof existingMetadata?.attributes,
      count: Array.isArray(existingAttributes) ? existingAttributes.length : 0
    });

    // CRITICAL FIX #2: Don't accept placeholder images from frontend
    let finalImageUrl = imageUrl;
    if (!imageUrl || imageUrl.includes('placeholder') || imageUrl.startsWith('data:')) {
      console.log('⚠️ Frontend sent placeholder or no image, fetching fresh metadata from server...');

      // Get fresh metadata from server
      try {
        const { getNFTMetadataWithFallback } = await import('../../../lib/nftMetadataFallback');
        const { getPublicBaseUrl } = await import('../../../lib/publicBaseUrl');

        const freshResult = await getNFTMetadataWithFallback({
          contractAddress: contractAddress as string,
          tokenId: tokenId as string,
          publicBaseUrl: getPublicBaseUrl(req),
          timeout: 5000
        });

        if (freshResult.metadata?.image &&
            !freshResult.metadata.image.includes('placeholder') &&
            !freshResult.metadata.image.startsWith('data:')) {
          finalImageUrl = freshResult.metadata.image;
          console.log('✅ Got fresh image from server:', finalImageUrl.substring(0, 60) + '...');
        } else {
          console.log('⚠️ Server also has placeholder, keeping existing or using fallback');
          finalImageUrl = existingMetadata?.image || `ipfs://placeholder-${tokenId}`;
        }
      } catch (error) {
        console.error('❌ Failed to fetch fresh metadata:', error);
        finalImageUrl = existingMetadata?.image || `ipfs://placeholder-${tokenId}`;
      }
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
      image: finalImageUrl,
      // CRITICAL FIX: Use normalizeCidPath to handle ipfs://ipfs/... formats
      image_url: finalImageUrl ? (finalImageUrl.startsWith('ipfs://') ?
        `https://ipfs.io/ipfs/${normalizeCidPath(finalImageUrl.replace('ipfs://', ''))}` :
        finalImageUrl) : existingMetadata?.image_url,

      // Add or update attributes
      attributes: [
        ...existingAttributes.filter((attr: any) =>
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
    
    // Store updated metadata in Upstash Redis as hash (same as nftMetadataFallback.ts)
    const ttl = 30 * 24 * 60 * 60; // 30 days in seconds

    // CRITICAL FIX: Serialize objects/arrays before storing in Redis
    const serializedMetadata: Record<string, string> = {};
    Object.entries(updatedMetadata).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        serializedMetadata[key] = JSON.stringify(value);
      } else {
        serializedMetadata[key] = String(value);
      }
    });

    console.log('🔍 Serialized metadata for Redis:', {
      keys: Object.keys(serializedMetadata),
      attributesType: typeof serializedMetadata.attributes,
      attributesLength: serializedMetadata.attributes?.length
    });

    // Store as hash for compatibility with nftMetadataFallback.ts
    await redis!.hset(metadataKey, serializedMetadata);
    await redis!.expire(metadataKey, ttl);

    console.log('✅ Metadata updated in Upstash Redis successfully:', {
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

    // Store claim record as hash in Upstash Redis
    await redis!.hset(claimRecordKey, claimRecord);
    await redis!.expire(claimRecordKey, ttl);
    
    console.log('📝 Claim record stored:', {
      key: claimRecordKey,
      claimerAddress: claimerAddress.slice(0, 10) + '...'
    });

    // CRITICAL FIX: Track claim event in canonical analytics system
    try {
      const { processBlockchainEvent } = await import('../../../lib/analytics/canonicalEvents');
      const { getGiftIdFromTokenId } = await import('../../../lib/escrowUtils');

      // Get giftId for tracking
      const giftId = await getGiftIdFromTokenId(tokenId);

      if (giftId !== null) {
        await processBlockchainEvent(
          redis!,
          'GiftClaimed',
          transactionHash,
          0, // logIndex
          BigInt(Date.now()), // blockNumber
          Date.now(), // blockTimestamp
          {
            giftId: giftId.toString(),
            tokenId: tokenId,
            campaignId: `campaign_default`, // Will be enriched from gift:detail if available
            claimer: claimerAddress,
            metadata: {
              transactionHash,
              claimedAt: new Date().toISOString(),
              claimMethod: 'frontend_direct',
              metadataUpdated: true
            }
          },
          'realtime'
        );
        console.log('📊 CRITICAL FIX: Claim event tracked in canonical analytics system');
      } else {
        console.warn('⚠️ Could not resolve giftId from tokenId for analytics tracking');
      }
    } catch (analyticsError) {
      console.error('⚠️ Analytics tracking failed (non-critical):', analyticsError);
      // Don't fail the whole operation for analytics errors
    }

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