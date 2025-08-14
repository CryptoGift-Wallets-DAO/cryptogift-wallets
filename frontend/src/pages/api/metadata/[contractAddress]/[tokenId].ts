// 🔥 CRITICAL FIX ERROR #6: DIRECT METADATA ENDPOINT - NO MORE 308 REDIRECTS
// Eliminates unnecessary latency for wallets and block explorers
// Identical functionality to /api/nft-metadata but served directly

import { NextApiRequest, NextApiResponse } from 'next';
import { getNFTMetadata } from '../../../../lib/nftMetadataStore';
import { getPublicBaseUrl } from '../../../../lib/publicBaseUrl';
import { pickGatewayUrl } from '../../../../utils/ipfs';
import { getNFTMetadataWithFallback } from '../../../../lib/nftMetadataFallback';

interface ERC721Metadata {
  name: string;
  description: string;
  image: string;
  animation_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  external_url?: string;
  background_color?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // OPTIMIZATION: Handle HEAD requests early (before expensive operations)
  if (req.method === 'HEAD') {
    // Set headers for HEAD and return immediately
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contractAddress, tokenId } = req.query;

  if (!contractAddress || !tokenId) {
    return res.status(400).json({ error: 'Missing contractAddress or tokenId' });
  }

  const startTime = Date.now();
  
  try {
    console.log(`🏗️ DIRECT METADATA REQUEST (NO REDIRECT): ${contractAddress}:${tokenId}`);

    // ENHANCED: Use comprehensive fallback system with forced production URL for external_url
    const publicBaseUrl = getPublicBaseUrl(req);
    const productionBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || publicBaseUrl;
    
    const fallbackResult = await getNFTMetadataWithFallback({
      contractAddress: contractAddress as string,
      tokenId: tokenId as string,
      publicBaseUrl: productionBaseUrl, // Force production URL for consistent external_url
      timeout: 4500 // 4.5s timeout as specified
    });

    const processingTime = Date.now() - startTime;
    
    console.log(`📊 Direct metadata resolved via ${fallbackResult.source} for ${contractAddress}:${tokenId} (${processingTime}ms) - NO REDIRECT`);
    
    // METADATA PROCESSING: Use result from comprehensive fallback system
    
    // 🔧 FASE 5E FIX: Ensure image is ALWAYS HTTPS (never ipfs://) for wallets/explorers
    let normalizedImageUrl = fallbackResult.metadata.image;
    if (normalizedImageUrl && normalizedImageUrl.startsWith('ipfs://')) {
      console.log(`🔄 Normalizing ipfs:// image URL to HTTPS for wallet compatibility`);
      const { pickGatewayUrl } = await import('../../../../utils/ipfs');
      normalizedImageUrl = await pickGatewayUrl(normalizedImageUrl);
      console.log(`🔗 Image normalized: ${normalizedImageUrl.substring(0, 50)}...`);
    }
    
    const directMetadata: ERC721Metadata = {
      name: fallbackResult.metadata.name,
      description: fallbackResult.metadata.description,
      
      // 🔧 FASE 5E: Image URL guaranteed to be HTTPS for universal compatibility
      image: normalizedImageUrl,
      
      // Copy all attributes and other fields
      attributes: fallbackResult.metadata.attributes || [],
      animation_url: fallbackResult.metadata.animation_url,
      background_color: fallbackResult.metadata.background_color,
      
      // Override external_url to ensure consistency with production domain
      external_url: `${productionBaseUrl}/nft/${contractAddress}/${tokenId}`,
    };

    // UNIVERSAL HEADERS: Optimized for both wallets and explorers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // 🔧 FASE 5F FIX: Prevent cache poisoning for placeholders
    if (fallbackResult.source === 'placeholder') {
      console.log('🚫 Placeholder detected - using no-store to prevent cache poisoning');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('X-Served-Placeholder', 'true'); // Debugging header
    } else {
      // Normal caching for real metadata
      const cacheMaxAge = fallbackResult.source === 'redis' ? 300 : 60;
      const sMaxAge = 300;
      res.setHeader('Cache-Control', `public, max-age=${cacheMaxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=60`);
    }
    
    // SECURITY HEADERS
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    // METADATA SOURCE TRACKING
    res.setHeader('X-Metadata-Source', fallbackResult.source);
    res.setHeader('X-Metadata-Cached', fallbackResult.cached.toString());
    res.setHeader('X-Processing-Time', `${processingTime}ms`);
    res.setHeader('X-Redirect-Eliminated', 'true'); // Track redirect elimination success
    if (fallbackResult.gatewayUsed) {
      res.setHeader('X-Gateway-Used', fallbackResult.gatewayUsed);
    }
    
    // ETAG based on source and content
    const etag = `"nft-${contractAddress}-${tokenId}-${fallbackResult.source}"`;
    res.setHeader('ETag', etag);

    console.log(`🔗 IMAGE URL: ${directMetadata.image}`);
    console.log(`✅ DIRECT METADATA SERVED via ${fallbackResult.source}: ${contractAddress}:${tokenId} (${processingTime}ms) - REDIRECT ELIMINATED`);
    
    return res.status(200).json(directMetadata);

  } catch (error) {
    console.error('❌ Error serving direct metadata:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}