// METAMASK-COMPATIBLE METADATA API ENDPOINT
// Serves ERC721 metadata in format that MetaMask can properly display
// Converts IPFS URLs to HTTPS gateways for image display

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
    
    // CRITICAL DEBUG: Enhanced logging for metadata investigation
    console.log(`🔍 REQUEST METHOD: ${req.method}`);
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
      console.log(`⚠️ No metadata found in Redis for ${contractAddress}:${tokenId} after ${maxRetries} attempts, attempting fallback...`);
      
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
        
        console.log(`✅ Token ${contractAddress}:${tokenId} exists on-chain (owner: ${owner.slice(0, 10)}...), generating fallback`);
        
        // Generate fallback metadata (use same structure as the other endpoint)
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

        console.log(`🔄 Generated fallback metadata for token ${contractAddress}:${tokenId} (metadata endpoint)`);
        
        // Set cache headers to prevent permanent caching of fallback
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300'); // Short cache for fallback
        res.setHeader('X-Metadata-Source', 'fallback-generated-metadata-endpoint');
        
        // STANDARD HEADERS: Enhanced for MetaMask compatibility
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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
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
    console.log(`⏰ TIMESTAMP: ${new Date().toISOString()}`);
    
    return res.status(200).json(metamaskMetadata);

  } catch (error) {
    console.error('❌ Error serving MetaMask metadata:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}