// METAMASK-COMPATIBLE METADATA API ENDPOINT
// Serves ERC721 metadata in format that MetaMask can properly display
// Converts IPFS URLs to HTTPS gateways for image display

import { NextApiRequest, NextApiResponse } from 'next';
import { getNFTMetadata } from '../../../../lib/nftMetadataStore';
import { getPublicBaseUrl } from '../../../../lib/publicBaseUrl';
import { convertIPFSToHTTPS, pickGatewayUrl } from '../../../../utils/ipfs';

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

// Removed: Complex gateway retry logic replaced by unified ipfs.ts system

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CRITICAL: Support HEAD requests for crawler compatibility
  if (req.method === 'HEAD') {
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

    // UNIFIED IPFS: Single encoding pass with robust gateway selection
    const finalImageUrl = await pickGatewayUrl(metadata.image);
    
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