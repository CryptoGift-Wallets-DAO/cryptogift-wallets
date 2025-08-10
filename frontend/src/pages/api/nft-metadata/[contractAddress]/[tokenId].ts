// BASESCAN-OPTIMIZED METADATA API ENDPOINT
// Specifically designed for block explorer compatibility
// Uses direct IPFS.io gateway and proper encoding for maximum compatibility

import { NextApiRequest, NextApiResponse } from 'next';
import { getNFTMetadata } from '../../../../lib/nftMetadataStore';
import { getPublicBaseUrl } from '../../../../lib/publicBaseUrl';
import { pickGatewayUrl } from '../../../../utils/ipfs';

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

// Removed: Complex gateway logic replaced by unified ipfs.ts system

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CRITICAL: Support HEAD requests for crawler compatibility
  if (req.method !== 'GET' && req.method !== 'HEAD') {
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

    // UNIFIED IPFS: Single encoding pass with robust gateway selection  
    const baseScanMetadata: ERC721Metadata = {
      name: metadata.name || `CryptoGift NFT #${tokenId}`,
      description: metadata.description || 'A unique NFT-Wallet from the CryptoGift platform',
      
      // CRITICAL: Single encoding pass for ALL clients (wallets + explorers)
      image: await pickGatewayUrl(metadata.image),
      
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
    
    // Handle HEAD request - return headers only (no body)
    if (req.method === 'HEAD') {
      return res.status(200).end();
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