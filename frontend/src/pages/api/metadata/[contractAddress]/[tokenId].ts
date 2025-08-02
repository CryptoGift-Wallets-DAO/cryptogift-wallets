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

/**
 * Convert IPFS URLs to HTTPS gateway URLs compatible with both MetaMask AND BaseScan
 */
function convertIPFSToHTTPS(ipfsUrl: string): string {
  if (!ipfsUrl) return '';
  
  // Already HTTPS URL
  if (ipfsUrl.startsWith('https://')) {
    // BASESCAN FIX: Handle URLs with spaces by URL encoding ONLY the filename
    return encodeImageURL(ipfsUrl);
  }
  if (ipfsUrl.startsWith('http://')) {
    return encodeImageURL(ipfsUrl.replace('http://', 'https://'));
  }
  
  // IPFS URL format
  if (ipfsUrl.startsWith('ipfs://')) {
    const cid = ipfsUrl.replace('ipfs://', '');
    
    // BASESCAN OPTIMIZATION: Use gateway with better compatibility
    // ipfs.io has the most reliable redirect handling for block explorers
    const baseUrl = `https://ipfs.io/ipfs/${cid}`;
    return encodeImageURL(baseUrl);
  }
  
  // Handle bare CID
  if (ipfsUrl.match(/^[a-zA-Z0-9]{46}$/)) {
    return encodeImageURL(`https://ipfs.io/ipfs/${ipfsUrl}`);
  }
  
  return ipfsUrl;
}

/**
 * BASESCAN COMPATIBILITY: Properly encode image URLs for block explorer crawlers
 */
function encodeImageURL(url: string): string {
  // Split URL into base and filename
  const lastSlashIndex = url.lastIndexOf('/');
  if (lastSlashIndex === -1) return url;
  
  const baseUrl = url.substring(0, lastSlashIndex + 1);
  const filename = url.substring(lastSlashIndex + 1);
  
  // CRITICAL FIX: Encode filename but preserve path structure
  // This fixes BaseScan's issue with spaces in filenames
  const encodedFilename = encodeURIComponent(filename);
  
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
    console.log(`🎨 METAMASK METADATA REQUEST: ${contractAddress}:${tokenId}`);

    // Get metadata from our storage
    const metadata = await getNFTMetadata(
      contractAddress as string, 
      tokenId as string
    );

    if (!metadata) {
      console.log(`❌ No metadata found for ${contractAddress}:${tokenId}`);
      return res.status(404).json({ error: 'Metadata not found' });
    }

    // Convert to MetaMask-compatible format
    const metamaskMetadata: ERC721Metadata = {
      name: metadata.name || `CryptoGift NFT #${tokenId}`,
      description: metadata.description || 'A unique NFT-Wallet from the CryptoGift platform',
      
      // CRITICAL: Convert IPFS to HTTPS for MetaMask compatibility
      image: convertIPFSToHTTPS(metadata.image),
      
      // Standard ERC721 attributes array
      attributes: metadata.attributes || [],
      
      // Optional fields that MetaMask recognizes
      external_url: `https://cryptogift-wallets.vercel.app/nft/${contractAddress}/${tokenId}`,
    };

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
    
    // PERFORMANCE: Optimized caching for both MetaMask and block explorers
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Vary', 'Accept-Encoding');
    
    // BASESCAN HINT: Add ETag for better caching
    const etag = `"nft-${contractAddress}-${tokenId}"`;
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