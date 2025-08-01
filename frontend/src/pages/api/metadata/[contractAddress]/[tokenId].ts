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
 * Convert IPFS URLs to HTTPS gateway URLs for MetaMask compatibility
 */
function convertIPFSToHTTPS(ipfsUrl: string): string {
  if (!ipfsUrl) return '';
  
  // Already HTTPS URL
  if (ipfsUrl.startsWith('https://')) return ipfsUrl;
  if (ipfsUrl.startsWith('http://')) return ipfsUrl.replace('http://', 'https://');
  
  // IPFS URL format
  if (ipfsUrl.startsWith('ipfs://')) {
    const cid = ipfsUrl.replace('ipfs://', '');
    
    // Use multiple gateways in order of reliability for MetaMask
    const gateways = [
      `https://nftstorage.link/ipfs/${cid}`,
      `https://ipfs.io/ipfs/${cid}`,
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`
    ];
    
    // Return the most reliable gateway for MetaMask
    return gateways[0];
  }
  
  // Handle bare CID
  if (ipfsUrl.match(/^[a-zA-Z0-9]{46}$/)) {
    return `https://nftstorage.link/ipfs/${ipfsUrl}`;
  }
  
  return ipfsUrl;
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

    // Set proper CORS headers for MetaMask access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    // Cache for 1 hour to improve MetaMask performance
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');

    console.log(`✅ METAMASK METADATA SERVED: ${contractAddress}:${tokenId}`);
    
    return res.status(200).json(metamaskMetadata);

  } catch (error) {
    console.error('❌ Error serving MetaMask metadata:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}