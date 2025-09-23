// BASESCAN-OPTIMIZED METADATA API ENDPOINT
// Specifically designed for block explorer compatibility
// Uses direct IPFS.io gateway and proper encoding for maximum compatibility

import { NextApiRequest, NextApiResponse } from 'next';
import { getNFTMetadata } from '../../../../lib/nftMetadataStore';
import { getPublicBaseUrl } from '../../../../lib/publicBaseUrl';
import { pickGatewayUrl, getBestGatewayForCid, normalizeCidPath } from '../../../../utils/ipfs';
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
    
    // 🔥 CANONICAL FORMAT: Always serve image=ipfs:// + image_url=HTTPS (best gateway)
    
    let canonicalImageIpfs = fallbackResult.metadata.image;
    let dynamicImageHttps = fallbackResult.metadata.image;
    
    // Handle different input formats and normalize to canonical format
    if (fallbackResult.metadata.image && fallbackResult.metadata.image.startsWith('ipfs://')) {
      // Perfect - already canonical IPFS format
      canonicalImageIpfs = fallbackResult.metadata.image;
      console.log(`✅ CANONICAL: Image already in ipfs:// format`);
      
      // Get best working gateway for image_url in real-time
      console.log(`🎯 CANONICAL: Finding best gateway for image_url...`);
      const bestGateway = await getBestGatewayForCid(fallbackResult.metadata.image, 4000);
      if (bestGateway) {
        dynamicImageHttps = bestGateway.url;
        console.log(`✅ CANONICAL: Using ${bestGateway.gateway} gateway: ${dynamicImageHttps.substring(0, 60)}...`);
      } else {
        console.log(`⚠️ CANONICAL: No working gateway, using placeholder`);
        // Use absolute placeholder URL instead of 503
        const placeholderUrl = `${productionBaseUrl}/images/nft-placeholder.png`;
        dynamicImageHttps = placeholderUrl;
        console.log('📦 Using placeholder image:', placeholderUrl);
      }
      
    } else if (fallbackResult.metadata.image && fallbackResult.metadata.image.startsWith('https://')) {
      console.log(`🔄 CANONICAL: Converting HTTPS to ipfs:// format`);
      
      // Try to extract CID from HTTPS URL
      const httpsUrl = fallbackResult.metadata.image;
      const ipfsMatch = httpsUrl.match(/\/ipfs\/([^\/\?#]+)/);
      
      if (ipfsMatch) {
        // CRITICAL FIX: Normalize CID path to handle double ipfs/ patterns
        const rawCidPath = httpsUrl.split('/ipfs/')[1];
        const cidPath = normalizeCidPath(rawCidPath);
        canonicalImageIpfs = `ipfs://${cidPath}`;
        console.log(`✅ CANONICAL: Extracted and normalized CID: ${canonicalImageIpfs}`);
        
        // Verify and get best gateway
        const bestGateway = await getBestGatewayForCid(canonicalImageIpfs, 4000);
        if (bestGateway) {
          dynamicImageHttps = bestGateway.url;
          console.log(`✅ CANONICAL: Using ${bestGateway.gateway} gateway: ${dynamicImageHttps.substring(0, 60)}...`);
        } else {
          console.log(`⚠️ CANONICAL: No working gateway, using placeholder`);
          const placeholderUrl = `${productionBaseUrl}/images/nft-placeholder.png`;
          dynamicImageHttps = placeholderUrl;
          console.log('📦 Using placeholder image:', placeholderUrl);
        }
      } else {
        console.log(`❌ CANONICAL: Cannot extract CID, using placeholder`);
        const placeholderUrl = `${productionBaseUrl}/images/nft-placeholder.png`;
        canonicalImageIpfs = httpsUrl; // Keep original
        dynamicImageHttps = placeholderUrl;
        console.log('📦 Using placeholder for invalid format');
      }
    } else if (fallbackResult.metadata.image && fallbackResult.metadata.image.startsWith('data:image/')) {
      // 🔥 COMPATIBILITY FIX: Support data:image URIs for legacy placeholder tokens
      console.log(`🔄 LEGACY COMPATIBILITY: data:image URI detected for legacy token`);
      canonicalImageIpfs = fallbackResult.metadata.image; // Keep original data:image
      dynamicImageHttps = fallbackResult.metadata.image;  // Same for image_url
      console.log(`✅ LEGACY: Using data:image URI for token ${tokenId}`);
    } else {
      console.log(`❌ CANONICAL: Invalid image format, using placeholder`);
      const placeholderUrl = `${productionBaseUrl}/images/nft-placeholder.png`;
      canonicalImageIpfs = fallbackResult.metadata.image || placeholderUrl;
      dynamicImageHttps = placeholderUrl;
      console.log('📦 Using placeholder for invalid image format');
    }
    
    // 🔥 MAINNET-READY: Always use HTTPS ipfs.io for image field (Etherscan convention)
    // Extract CID from canonicalImageIpfs and always use ipfs.io
    let mainnetImageHttps = dynamicImageHttps; // fallback
    if (canonicalImageIpfs && canonicalImageIpfs.startsWith('ipfs://')) {
      // CRITICAL FIX: Use normalizeCidPath to handle ipfs://ipfs/... formats
      const rawCid = canonicalImageIpfs.replace('ipfs://', '');
      const imageCid = normalizeCidPath(rawCid);
      mainnetImageHttps = `https://ipfs.io/ipfs/${imageCid}`;
    } else if (canonicalImageIpfs && canonicalImageIpfs.startsWith('data:image/')) {
      // Keep data URIs as-is for legacy tokens
      mainnetImageHttps = canonicalImageIpfs;
    }
    
    const canonicalMetadata: any = {
      name: fallbackResult.metadata.name,
      description: fallbackResult.metadata.description,
      
      // 🔥 MAINNET CANONICAL FORMAT:
      image: mainnetImageHttps,        // ALWAYS HTTPS ipfs.io for mainnet explorers
      image_ipfs: canonicalImageIpfs,  // IPFS native for wallets that prefer it
      image_url: mainnetImageHttps,    // HTTPS ipfs.io (consistent with image)
      
      // Copy all attributes and other fields
      attributes: fallbackResult.metadata.attributes || [],
      animation_url: fallbackResult.metadata.animation_url,
      background_color: fallbackResult.metadata.background_color,
      
      // Override external_url to ensure consistency with production domain
      external_url: `${productionBaseUrl}/nft/${contractAddress}/${tokenId}`,
    };

    // 🔥 CRITICAL: Headers for public JSON with proper CORS and short TTL
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // 🔥 CRITICAL: Short TTL for successful responses (60s max) to enable cache refresh
    if (fallbackResult.source === 'placeholder') {
      console.log('🚫 Placeholder detected - using no-store to prevent cache poisoning');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('X-Served-Placeholder', 'true');
    } else {
      // 🔥 SHORT TTL: Allow quick refresh for gateway changes
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=30');
      console.log('✅ CANONICAL: Set short TTL (60s) for metadata to allow gateway refresh');
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

    console.log(`🖼️ CANONICAL FORMAT:`, {
      image: canonicalMetadata.image?.substring(0, 50) + '...',
      image_url: canonicalMetadata.image_url?.substring(0, 50) + '...'
    });
    console.log(`✅ CANONICAL SUCCESS: ${contractAddress}:${tokenId} served via ${fallbackResult.source} (${processingTime}ms)`);
    
    return res.status(200).json(canonicalMetadata);

  } catch (error) {
    console.error('❌ Error serving BaseScan metadata:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}