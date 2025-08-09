// METAMASK-COMPATIBLE METADATA API ENDPOINT
// Serves ERC721 metadata in format that MetaMask can properly display
// Converts IPFS URLs to HTTPS gateways for image display

import { NextApiRequest, NextApiResponse } from 'next';
import { getNFTMetadata } from '../../../../lib/nftMetadataStore';
import { getPublicBaseUrl } from '../../../../lib/publicBaseUrl';
import { encodeAllPathSegmentsSafe } from '../../../../utils/encodePathSafe';

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
    return processImageURL(ipfsUrl);
  }
  if (ipfsUrl.startsWith('http://')) {
    return processImageURL(ipfsUrl.replace('http://', 'https://'));
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
  
  // R6 QA FIX: Try each gateway with proper exponential backoff
  for (let attempt = 0; attempt < IPFS_GATEWAYS.length; attempt++) {
    const gatewayUrl = `${IPFS_GATEWAYS[attempt]}${cid}`;
    const startTime = Date.now();
    
    try {
      console.log(`🔄 IPFS Gateway attempt ${attempt + 1}/${IPFS_GATEWAYS.length}: ${IPFS_GATEWAYS[attempt]}`);
      
      // Test gateway with HEAD request (faster than GET)
      const controller = new AbortController();
      const baseTimeout = 2000; // 2s base timeout
      const timeoutMs = baseTimeout * Math.pow(1.5, attempt); // Exponential: 2s, 3s, 4.5s
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const testResponse = await fetch(gatewayUrl, { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      if (testResponse.ok) {
        // R6 QA FIX: Comprehensive telemetry logging
        const telemetryData = {
          gateway: IPFS_GATEWAYS[attempt],
          attempt: attempt + 1,
          success: true,
          duration_ms: duration,
          cid: cid.slice(0, 12) + '...', // Privacy: partial CID
          timestamp: new Date().toISOString()
        };
        
        console.log(`✅ IPFS SUCCESS:`, JSON.stringify(telemetryData));
        return processImageURL(gatewayUrl);
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // R6 QA FIX: Detailed error telemetry
      const errorTelemetry = {
        gateway: IPFS_GATEWAYS[attempt],
        attempt: attempt + 1,
        success: false,
        duration_ms: duration,
        error_type: error.name,
        error_message: error.message.slice(0, 100), // Truncate long errors
        cid: cid.slice(0, 12) + '...',
        timestamp: new Date().toISOString()
      };
      
      console.log(`❌ IPFS FAILURE:`, JSON.stringify(errorTelemetry));
      
      // R6 QA FIX: True exponential backoff with delay *= 1.5
      if (attempt < IPFS_GATEWAYS.length - 1) {
        const backoffDelay = 1000 * Math.pow(1.5, attempt); // 1s, 1.5s, 2.25s
        console.log(`⏳ Exponential backoff: ${backoffDelay}ms before next attempt`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }
  
  // All gateways failed - return first gateway URL anyway (some clients may still work)
  console.log(`⚠️ All IPFS gateways failed, returning primary: ${IPFS_GATEWAYS[0]}${cid}`);
  return processImageURL(`${IPFS_GATEWAYS[0]}${cid}`);
}

/**
 * Legacy function for backwards compatibility - now uses retry system
 */
function convertIPFSToHTTPS(ipfsUrl: string): Promise<string> {
  return convertIPFSToHTTPSWithRetry(ipfsUrl);
}

/**
 * UNIVERSAL ENCODING: Always encode safely for all clients
 * Replaced conditional logic - all clients get properly encoded URLs
 */
function processImageURL(url: string): string {
  return encodeAllPathSegmentsSafe(url);
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

    // Get metadata from our storage with retry mechanism for timing issues
    let metadata = null;
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔄 Metadata attempt ${attempt}/${maxRetries} for token ${tokenId}`);
      
      metadata = await getNFTMetadata(
        contractAddress as string, 
        tokenId as string
      );
      
      if (metadata) {
        console.log(`✅ Metadata found on attempt ${attempt}`);
        break;
      }
      
      if (attempt < maxRetries) {
        console.log(`⏳ Metadata not ready, waiting ${retryDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    if (!metadata) {
      console.log(`❌ No metadata found for ${contractAddress}:${tokenId} after ${maxRetries} attempts`);
      return res.status(404).json({ error: 'Metadata not found after retries' });
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
    const rawImageUrl = await convertIPFSToHTTPS(metadata.image);
    
    // UNIVERSAL ENCODING: Always apply safe encoding for all clients
    const finalImageUrl = processImageURL(rawImageUrl);
    
    const metamaskMetadata: ERC721Metadata = {
      name: metadata.name || `CryptoGift NFT #${tokenId}`,
      description: metadata.description || 'A unique NFT-Wallet from the CryptoGift platform',
      
      // CRITICAL: Conditionally encoded image URL for universal compatibility
      image: finalImageUrl,
      
      // Standard ERC721 attributes array
      attributes: metadata.attributes || [],
      
      // Optional fields that MetaMask recognizes
      external_url: `${getPublicBaseUrl(req)}/nft/${contractAddress}/${tokenId}`,
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
    
    // UNIVERSAL CACHING: Optimized for both wallets and explorers  
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60');
    
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