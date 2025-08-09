// BASESCAN-OPTIMIZED METADATA API ENDPOINT
// Specifically designed for block explorer compatibility
// Uses direct IPFS.io gateway and proper encoding for maximum compatibility

import { NextApiRequest, NextApiResponse } from 'next';
import { getNFTMetadata } from '../../../../lib/nftMetadataStore';

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

// BASESCAN FALLBACK GATEWAYS - Ordered by reliability for block explorers
const BASESCAN_IPFS_GATEWAYS = [
  'https://nftstorage.link/ipfs/',        // Primary - NFT.Storage
  'https://cloudflare-ipfs.com/ipfs/',    // Secondary - Cloudflare CDN  
  'https://ipfs.io/ipfs/'                 // Fallback - Most reliable
];

/**
 * BASESCAN-OPTIMIZED: Convert IPFS URLs with multiple gateway fallback
 * Tests gateways in order and uses the first working one
 */
async function convertToBaseScanCompatibleURL(ipfsUrl: string): Promise<string> {
  if (!ipfsUrl) return '';
  
  // Already HTTPS URL - optimize for BaseScan
  if (ipfsUrl.startsWith('https://')) {
    return optimizeForBlockExplorers(ipfsUrl);
  }
  if (ipfsUrl.startsWith('http://')) {
    return optimizeForBlockExplorers(ipfsUrl.replace('http://', 'https://'));
  }
  
  let cid = '';
  // IPFS URL format
  if (ipfsUrl.startsWith('ipfs://')) {
    cid = ipfsUrl.replace('ipfs://', '');
  } 
  // Handle bare CID
  else if (ipfsUrl.match(/^[a-zA-Z0-9]{46}$/)) {
    cid = ipfsUrl;
  }
  else {
    return ipfsUrl; // Return as-is if not IPFS
  }
  
  // Try gateways in order - return first working one
  for (let i = 0; i < BASESCAN_IPFS_GATEWAYS.length; i++) {
    const gatewayUrl = `${BASESCAN_IPFS_GATEWAYS[i]}${cid}`;
    
    try {
      // Quick HEAD request to test gateway
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
      
      const testResponse = await fetch(gatewayUrl, { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (testResponse.ok) {
        console.log(`✅ BASESCAN GATEWAY SUCCESS: ${BASESCAN_IPFS_GATEWAYS[i]} (attempt ${i + 1})`);
        return optimizeForBlockExplorers(gatewayUrl);
      }
    } catch (error) {
      console.log(`⚠️ BASESCAN GATEWAY FAILED: ${BASESCAN_IPFS_GATEWAYS[i]} - ${error.message}`);
      continue; // Try next gateway
    }
  }
  
  // All gateways failed - return first one anyway (client may still work)
  const fallbackUrl = `${BASESCAN_IPFS_GATEWAYS[0]}${cid}`;
  console.log(`🔄 BASESCAN ALL GATEWAYS FAILED: Using fallback ${fallbackUrl}`);
  return optimizeForBlockExplorers(fallbackUrl);
}

/**
 * CRITICAL OPTIMIZATION: Handle filenames with spaces for BaseScan
 * Strategy: Use single encoding but ensure it's properly formatted
 */
function optimizeForBlockExplorers(url: string): string {
  const lastSlashIndex = url.lastIndexOf('/');
  if (lastSlashIndex === -1) return url;
  
  const baseUrl = url.substring(0, lastSlashIndex + 1);
  const filename = url.substring(lastSlashIndex + 1);
  
  // BASESCAN STRATEGY: Single encode but handle existing encoding properly
  let finalFilename = filename;
  
  // If already encoded (contains %20), decode first then re-encode cleanly
  if (filename.includes('%20') || filename.includes('%')) {
    try {
      finalFilename = decodeURIComponent(filename);
    } catch (e) {
      // If decode fails, use original filename
      finalFilename = filename;
    }
  }
  
  // Now encode properly for BaseScan
  const encodedFilename = encodeURIComponent(finalFilename);
  
  return baseUrl + encodedFilename;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contractAddress, tokenId } = req.query;

  if (!contractAddress || !tokenId) {
    return res.status(400).json({ error: 'Missing contractAddress or tokenId' });
  }

  try {
    console.log(`🏗️ BASESCAN METADATA REQUEST: ${contractAddress}:${tokenId}`);
    console.log(`👀 User-Agent: ${req.headers['user-agent'] || 'Unknown'}`);

    // Get metadata from our storage
    const metadata = await getNFTMetadata(
      contractAddress as string, 
      tokenId as string
    );

    if (!metadata) {
      console.log(`❌ No metadata found for ${contractAddress}:${tokenId}`);
      return res.status(404).json({ error: 'Metadata not found' });
    }

    // Convert to BaseScan-optimized format (with gateway fallback)
    const baseScanMetadata: ERC721Metadata = {
      name: metadata.name || `CryptoGift NFT #${tokenId}`,
      description: metadata.description || 'A unique NFT-Wallet from the CryptoGift platform',
      
      // CRITICAL: Use BaseScan-optimized image URL with gateway fallback
      image: await convertToBaseScanCompatibleURL(metadata.image),
      
      // Standard ERC721 attributes array
      attributes: metadata.attributes || [],
      
      // External URL for viewing on our platform
      external_url: `https://cryptogift-wallets.vercel.app/nft/${contractAddress}/${tokenId}`,
    };

    // BASESCAN-SPECIFIC HEADERS: Optimized for block explorer crawlers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, User-Agent, Accept');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // Security headers that block explorers expect
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // ZOOM FIX: DENY was interfering with page viewport
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // PERFORMANCE: Aggressive caching for block explorers
    res.setHeader('Cache-Control', 'public, max-age=7200, s-maxage=7200, stale-while-revalidate=86400');
    res.setHeader('Vary', 'Accept-Encoding, User-Agent');
    
    // ETag for efficient caching
    const etag = `"basescan-nft-${contractAddress}-${tokenId}-v2"`;
    res.setHeader('ETag', etag);
    
    // BASESCAN COMPATIBILITY: Add OpenSea-style headers
    res.setHeader('X-NFT-Contract', contractAddress as string);
    res.setHeader('X-NFT-Token-ID', tokenId as string);

    console.log(`🔗 BASESCAN-OPTIMIZED IMAGE: ${baseScanMetadata.image}`);
    console.log(`✅ BASESCAN METADATA SERVED: ${contractAddress}:${tokenId}`);
    
    return res.status(200).json(baseScanMetadata);

  } catch (error) {
    console.error('❌ Error serving BaseScan metadata:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}