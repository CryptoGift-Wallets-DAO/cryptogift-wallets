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
    console.log(`📊 Request method: ${req.method}`);

    // Get metadata from our storage
    const metadata = await getNFTMetadata(
      contractAddress as string, 
      tokenId as string
    );

    if (!metadata) {
      console.log(`⚠️ No metadata found in Redis for ${contractAddress}:${tokenId}, attempting fallback...`);
      
      // CRITICAL FALLBACK: Generate basic metadata for existing tokens
      try {
        // Verify token exists on-chain before generating fallback
        const { ethers } = await import('ethers');
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
        const tokenContract = new ethers.Contract(contractAddress as string, [
          "function ownerOf(uint256 tokenId) view returns (address)",
          "function tokenURI(uint256 tokenId) view returns (string)"
        ], provider);
        
        // Check if token exists
        const owner = await tokenContract.ownerOf(BigInt(tokenId as string));
        if (!owner || owner === '0x0000000000000000000000000000000000000000') {
          throw new Error('Token does not exist');
        }
        
        console.log(`✅ Token ${contractAddress}:${tokenId} exists on-chain (owner: ${owner.slice(0, 10)}...)`);
        
        // Generate fallback metadata for existing but unmapped token
        const fallbackMetadata: ERC721Metadata = {
          name: `CryptoGift NFT #${tokenId}`,
          description: `A unique CryptoGift NFT created on the platform. This token was created before metadata mapping was implemented. Token ID: ${tokenId}, Contract: ${contractAddress}`,
          image: `data:image/svg+xml;base64,${Buffer.from(`
            <svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="400" height="400" fill="#1e293b"/>
              <text x="200" y="180" text-anchor="middle" fill="#f8fafc" font-family="Arial" font-size="24" font-weight="bold">
                CryptoGift NFT
              </text>
              <text x="200" y="220" text-anchor="middle" fill="#94a3b8" font-family="Arial" font-size="18">
                Token #${tokenId}
              </text>
              <text x="200" y="260" text-anchor="middle" fill="#64748b" font-family="Arial" font-size="14">
                Legacy Token
              </text>
            </svg>
          `).toString('base64')}`,
          attributes: [
            {
              trait_type: "Token ID",
              value: tokenId.toString()
            },
            {
              trait_type: "Status", 
              value: "Legacy Token"
            },
            {
              trait_type: "Platform",
              value: "CryptoGift Wallets"
            },
            {
              trait_type: "Migration Status",
              value: "Requires Metadata Update"
            }
          ],
          external_url: `${getPublicBaseUrl(req)}/nft/${contractAddress}/${tokenId}`,
        };

        console.log(`🔄 Generated fallback metadata for token ${contractAddress}:${tokenId}`);
        
        // Set cache headers to prevent permanent caching of fallback
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300'); // Short cache for fallback
        res.setHeader('X-Metadata-Source', 'fallback-generated');
        
        // Return fallback metadata
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        
        return res.status(200).json(fallbackMetadata);
        
      } catch (fallbackError) {
        console.error(`❌ Fallback failed for ${contractAddress}:${tokenId}:`, fallbackError.message);
        return res.status(404).json({ 
          error: 'Token not found', 
          details: 'No metadata available and token verification failed',
          fallbackError: fallbackError.message 
        });
      }
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