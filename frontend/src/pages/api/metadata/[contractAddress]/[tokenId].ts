// METAMASK-COMPATIBLE METADATA API ENDPOINT
// Serves ERC721 metadata in format that MetaMask can properly display
// Converts IPFS URLs to HTTPS gateways for image display

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

// R6: IPFS Gateway retry system with exponential backoff + telemetry
const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',    // Primary - best mobile compatibility
  'https://cloudflare-ipfs.com/ipfs/',    // Secondary - fast CDN
  'https://ipfs.io/ipfs/'                 // Fallback - most reliable
];

/**
 * R6: Advanced IPFS URL conversion with retry logic and telemetry
 * Implements exponential backoff across 3 gateways with performance tracking
 */
async function convertIPFSToHTTPSWithRetry(ipfsUrl: string, retryCount = 0): Promise<string> {
  if (!ipfsUrl) return '';
  
  // Already HTTPS URL - no retry needed
  if (ipfsUrl.startsWith('https://')) {
    return encodeImageURL(ipfsUrl);
  }
  if (ipfsUrl.startsWith('http://')) {
    return encodeImageURL(ipfsUrl.replace('http://', 'https://'));
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
  
  // Try each gateway with exponential backoff
  for (let attempt = 0; attempt < IPFS_GATEWAYS.length; attempt++) {
    const gatewayUrl = `${IPFS_GATEWAYS[attempt]}${cid}`;
    
    try {
      console.log(`🔄 IPFS Gateway attempt ${attempt + 1}/${IPFS_GATEWAYS.length}: ${IPFS_GATEWAYS[attempt]}`);
      
      // Test gateway with HEAD request (faster than GET)
      const testResponse = await fetch(gatewayUrl, { 
        method: 'HEAD', 
        timeout: 5000 + (attempt * 2000) // Exponential timeout: 5s, 7s, 9s
      });
      
      if (testResponse.ok) {
        // R6: Telemetry logging with gtag
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'ipfs_retry', {
            gateway: IPFS_GATEWAYS[attempt],
            attempt: attempt + 1,
            success: true,
            cid: cid.slice(0, 12) + '...' // Privacy: only log partial CID
          });
        }
        
        console.log(`✅ IPFS Gateway success: ${IPFS_GATEWAYS[attempt]} (attempt ${attempt + 1})`);
        return encodeImageURL(gatewayUrl);
      }
      
    } catch (error) {
      console.log(`❌ IPFS Gateway ${attempt + 1} failed: ${error.message}`);
      
      // R6: Log failed attempts
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'ipfs_retry', {
          gateway: IPFS_GATEWAYS[attempt],
          attempt: attempt + 1,
          success: false,
          error: error.message.slice(0, 50), // Truncate error message
          cid: cid.slice(0, 12) + '...'
        });
      }
      
      // Exponential backoff delay before next attempt
      if (attempt < IPFS_GATEWAYS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  // All gateways failed - return first gateway URL anyway (some clients may still work)
  console.log(`⚠️ All IPFS gateways failed, returning primary: ${IPFS_GATEWAYS[0]}${cid}`);
  return encodeImageURL(`${IPFS_GATEWAYS[0]}${cid}`);
}

/**
 * Legacy function for backwards compatibility - now uses retry system
 */
function convertIPFSToHTTPS(ipfsUrl: string): Promise<string> {
  return convertIPFSToHTTPSWithRetry(ipfsUrl);
}

/**
 * EMERGENCY FIX: DON'T DOUBLE-ENCODE - MetaMask broken by over-encoding
 * Just return original URL - ipfs.io handles spaces fine automatically
 */
function encodeImageURL(url: string): string {
  // CRITICAL REVERT: Don't encode anything - ipfs.io works with spaces
  // The original URLs work fine with MetaMask AND BaseScan can handle them
  return url;
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
    console.log(`🎨 METAMASK METADATA REQUEST: ${contractAddress}:${tokenId}`);
    
    // CRITICAL DEBUG: Enhanced logging for 7-day NFT investigation
    console.log(`🔍 USER-AGENT: ${req.headers['user-agent'] || 'Not provided'}`);
    console.log(`🔍 REFERRER: ${req.headers.referer || 'Not provided'}`);

    // Get metadata from our storage
    const metadata = await getNFTMetadata(
      contractAddress as string, 
      tokenId as string
    );

    if (!metadata) {
      console.log(`❌ No metadata found for ${contractAddress}:${tokenId}`);
      return res.status(404).json({ error: 'Metadata not found' });
    }

    // CRITICAL DEBUG: Log metadata attributes to identify 7-day differences
    console.log(`🔍 METADATA ATTRIBUTES for ${tokenId}:`, JSON.stringify(metadata.attributes, null, 2));
    
    // Check if this is a 7-day NFT specifically
    const isSevenDayNFT = metadata.attributes?.some(attr => 
      attr.trait_type === 'Timeframe' && attr.value === 'SEVEN_DAYS'
    );
    
    if (isSevenDayNFT) {
      console.log(`🚨 SEVEN-DAY NFT DETECTED: ${tokenId} - Enhanced debugging enabled`);
      console.log(`🔍 Original image URL: ${metadata.image}`);
    }

    // R6: Convert to MetaMask-compatible format with retry system
    const metamaskMetadata: ERC721Metadata = {
      name: metadata.name || `CryptoGift NFT #${tokenId}`,
      description: metadata.description || 'A unique NFT-Wallet from the CryptoGift platform',
      
      // R6: CRITICAL - Convert IPFS to HTTPS with retry logic and telemetry
      image: await convertIPFSToHTTPS(metadata.image),
      
      // Standard ERC721 attributes array
      attributes: metadata.attributes || [],
      
      // Optional fields that MetaMask recognizes
      external_url: `https://cryptogift-wallets.vercel.app/nft/${contractAddress}/${tokenId}`,
    };
    
    if (isSevenDayNFT) {
      console.log(`🦊 SEVEN-DAY METAMASK CONVERSION: ${metamaskMetadata.image}`);
      console.log(`📋 SEVEN-DAY ATTRIBUTES: ${JSON.stringify(metamaskMetadata.attributes, null, 2)}`);
    }

    // Add extra debugging for MetaMask compatibility
    console.log(`🖼️ METAMASK IMAGE URL: ${metamaskMetadata.image}`);
    console.log(`📋 METAMASK ATTRIBUTES: ${JSON.stringify(metamaskMetadata.attributes, null, 2)}`);

    // Enhanced headers for BOTH MetaMask AND BaseScan compatibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, User-Agent');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // BASESCAN OPTIMIZATION: Add headers that block explorers expect
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src https: data:;");
    
    // METAMASK SPECIFIC FIX: Different caching strategy for 7-day NFTs
    if (isSevenDayNFT) {
      console.log(`🦊 SEVEN-DAY CACHE FIX: Applying MetaMask-specific headers`);
      // More aggressive cache-busting for 7-day NFTs
      res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=1800, must-revalidate');
      res.setHeader('Last-Modified', new Date().toUTCString());
      // Force MetaMask to refresh
      res.setHeader('X-MetaMask-Refresh', 'true');
    } else {
      // Standard caching for other timeframes
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
    }
    
    res.setHeader('Vary', 'Accept-Encoding');
    
    // BASESCAN HINT: Add ETag for better caching
    const etag = isSevenDayNFT 
      ? `"nft-7day-${contractAddress}-${tokenId}-${Date.now()}"` 
      : `"nft-${contractAddress}-${tokenId}"`;
    res.setHeader('ETag', etag);

    // BASESCAN LOGGING: Enhanced debugging for block explorer compatibility
    console.log(`✅ METADATA SERVED FOR: ${contractAddress}:${tokenId}`);
    console.log(`🔗 OPTIMIZED IMAGE URL: ${metamaskMetadata.image}`);
    console.log(`📊 USER-AGENT: ${req.headers['user-agent'] || 'Not provided'}`);
    
    return res.status(200).json(metamaskMetadata);

  } catch (error) {
    console.error('❌ Error serving MetaMask metadata:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}