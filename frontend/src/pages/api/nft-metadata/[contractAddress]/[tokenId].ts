// BASESCAN-OPTIMIZED METADATA API ENDPOINT
// Specifically designed for block explorer compatibility
// Uses direct IPFS.io gateway and proper encoding for maximum compatibility

import { NextApiRequest, NextApiResponse } from 'next';
import { getNFTMetadata } from '../../../../lib/nftMetadataStore';
import { getPublicBaseUrl } from '../../../../lib/publicBaseUrl';
import { pickGatewayUrl } from '../../../../utils/ipfs';
import { getNFTMetadataWithFallback } from '../../../../lib/nftMetadataFallback';
import { convertIPFSToHTTPS } from '../../../../utils/ipfs';

interface ERC721Metadata {
  name: string;
  description: string;
  image: string;
  image_url?: string; // HTTPS version for wallet compatibility
  animation_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  external_url?: string;
  background_color?: string;
}

// Removed: Complex gateway logic replaced by unified ipfs.ts system

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
    console.log(`🏗️ BASESCAN METADATA REQUEST: ${contractAddress}:${tokenId}`);

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
    
    console.log(`📊 Metadata resolved via ${fallbackResult.source} for ${contractAddress}:${tokenId} (${processingTime}ms)`);
    
    // METADATA PROCESSING: Use result from comprehensive fallback system
    
    // 🔥 NEW: Support dual image formats (IPFS + HTTPS) for maximum compatibility
    // CRITICAL: Prevent HTTP→IPFS recursion by detecting self-calls
    const currentHost = req.headers.host || 'localhost';
    const selfCallPattern = new RegExp(`${currentHost.replace('.', '\\.')}/api/(nft-)?metadata/`);
    
    let ipfsImageUrl = fallbackResult.metadata.image;
    let httpsImageUrl = fallbackResult.metadata.image;
    let recursionDetected = false;
    
    // Ensure we have both IPFS and HTTPS formats
    if (fallbackResult.metadata.image && fallbackResult.metadata.image.startsWith('ipfs://')) {
      // Already have IPFS format, convert to HTTPS
      ipfsImageUrl = fallbackResult.metadata.image;
      httpsImageUrl = convertIPFSToHTTPS(fallbackResult.metadata.image);
      console.log(`🔄 Converted IPFS to HTTPS: ${httpsImageUrl.substring(0, 50)}...`);
    } else if (fallbackResult.metadata.image && fallbackResult.metadata.image.startsWith('https://')) {
      // Check for self-call recursion first
      if (selfCallPattern.test(fallbackResult.metadata.image)) {
        console.log('🚨 SELF-CALL DETECTED in image URL - preventing recursion');
        recursionDetected = true;
        // Force fallback to default IPFS format
        ipfsImageUrl = fallbackResult.metadata.image; // Keep original for debugging
        httpsImageUrl = convertIPFSToHTTPS('ipfs://QmDefaultImage'); // Fallback
      } else {
        // Already have HTTPS format, keep it
        httpsImageUrl = fallbackResult.metadata.image;
        ipfsImageUrl = fallbackResult.metadata.image; // Keep for compatibility
        console.log(`🔗 Using existing HTTPS image: ${httpsImageUrl.substring(0, 50)}...`);
      }
    }
    
    const baseScanMetadata: ERC721Metadata = {
      name: fallbackResult.metadata.name,
      description: fallbackResult.metadata.description,
      
      // 🔥 NEW: Dual image format for maximum compatibility
      image: ipfsImageUrl,        // IPFS format - preferred by modern systems
      image_url: httpsImageUrl,   // HTTPS format - fallback for older wallets
      
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
    if (fallbackResult.gatewayUsed) {
      res.setHeader('X-Gateway-Used', fallbackResult.gatewayUsed);
    }
    
    // ETAG based on source and content
    const etag = `"nft-${contractAddress}-${tokenId}-${fallbackResult.source}"`;
    res.setHeader('ETag', etag);

    console.log(`🖼️ DUAL IMAGE URLs:`, {
      ipfs: baseScanMetadata.image?.substring(0, 50) + '...',
      https: baseScanMetadata.image_url?.substring(0, 50) + '...'
    });
    console.log(`✅ METADATA SERVED via ${fallbackResult.source}: ${contractAddress}:${tokenId} (${processingTime}ms)`);
    
    // Additional logging for recursion prevention
    if (recursionDetected) {
      console.log('🚨 RECURSION PREVENTION: Self-call detected and resolved');
    }
    
    return res.status(200).json(baseScanMetadata);

  } catch (error) {
    console.error('❌ Error serving BaseScan metadata:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}