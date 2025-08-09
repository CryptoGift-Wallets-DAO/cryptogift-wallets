// BASESCAN-OPTIMIZED METADATA API ENDPOINT
// Specifically designed for block explorer compatibility
// Uses direct IPFS.io gateway and proper encoding for maximum compatibility

import { NextApiRequest, NextApiResponse } from 'next';
import { getNFTMetadata } from '../../../../lib/nftMetadataStore';
import { encodeAllPathSegmentsSafe } from '../../../../utils/encodePathSafe';
import { getPublicBaseUrl } from '../../../../lib/publicBaseUrl';

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
 * UNIVERSAL URL CONVERSION: Always encode paths safely
 * Resolves IPFS URLs to HTTPS gateways with proper encoding for ALL clients
 * No User-Agent conditionals - wallets and explorers both get encoded URLs
 */
async function convertToUniversalURL(ipfsUrl: string): Promise<string> {
  if (!ipfsUrl) return '';
  
  // Already HTTPS URL - ensure safe encoding
  if (ipfsUrl.startsWith('https://')) {
    return encodeAllPathSegmentsSafe(ipfsUrl);
  }
  if (ipfsUrl.startsWith('http://')) {
    const httpsUrl = ipfsUrl.replace('http://', 'https://');
    return encodeAllPathSegmentsSafe(httpsUrl);
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
        return encodeAllPathSegmentsSafe(gatewayUrl);
      }
    } catch (error) {
      console.log(`⚠️ BASESCAN GATEWAY FAILED: ${BASESCAN_IPFS_GATEWAYS[i]} - ${error.message}`);
      continue; // Try next gateway
    }
  }
  
  // All gateways failed - return first one anyway (client may still work)
  const fallbackUrl = `${BASESCAN_IPFS_GATEWAYS[0]}${cid}`;
  console.log(`🔄 BASESCAN ALL GATEWAYS FAILED: Using fallback ${fallbackUrl}`);
  return encodeAllPathSegmentsSafe(fallbackUrl);
}

// REMOVED: optimizeForBlockExplorers function - replaced with encodeAllPathSegmentsSafe for universal compatibility

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
      
      // CRITICAL: Always use safe encoding for ALL clients (wallets + explorers)
      image: await convertToUniversalURL(metadata.image),
      
      // Standard ERC721 attributes array
      attributes: metadata.attributes || [],
      
      // External URL for viewing on our platform
      external_url: `${getPublicBaseUrl(req)}/nft/${contractAddress}/${tokenId}`,
    };

    // UNIVERSAL HEADERS: Optimized for both wallets and explorers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // OPTIMIZED CACHING: Fast refresh with edge performance
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60');
    
    // SECURITY HEADERS
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    // METADATA HINTS
    const etag = `"nft-${contractAddress}-${tokenId}"`;
    res.setHeader('ETag', etag);

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