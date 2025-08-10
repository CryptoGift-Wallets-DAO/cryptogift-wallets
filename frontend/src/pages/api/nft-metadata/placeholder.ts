import { NextApiRequest, NextApiResponse } from 'next';

/**
 * PLACEHOLDER METADATA ENDPOINT
 * 
 * This endpoint handles metadata requests before the tokenURI is updated with the real tokenId.
 * Returns a temporary placeholder that indicates the NFT is being processed.
 * 
 * This solves the race condition where:
 * 1. NFT is minted with placeholder tokenURI
 * 2. tokenId is extracted from transaction
 * 3. tokenURI is updated with correct endpoint
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Support both HEAD and GET requests for crawler compatibility
  if (req.method === 'HEAD') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // Don't cache placeholder
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return placeholder metadata
  const placeholderMetadata = {
    name: "CryptoGift NFT (Processing...)",
    description: "This NFT is being processed. Please refresh in a few moments.",
    image: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMjAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjM3M2Q0IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiPgogIDx0c3Bhbj5Qcm9jZXNzaW5nLi4uPC90c3Bhbj4KPC90ZXh0Pgo8L3N2Zz4=", // Simple "Processing..." SVG
    attributes: [
      {
        trait_type: "Status",
        value: "Processing"
      },
      {
        trait_type: "Platform", 
        value: "CryptoGift Wallets"
      }
    ],
    external_url: process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "http://localhost:3000"
  };

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // Don't cache placeholder
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  return res.status(200).json(placeholderMetadata);
}