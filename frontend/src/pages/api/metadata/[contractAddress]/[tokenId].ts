// ENDPOINT REDIRECT: /api/metadata → /api/nft-metadata (308 Permanent Redirect)
// PROTOCOL V2 TYPE B: Endpoint unification - /api/nft-metadata is now canonical
// This endpoint redirects to the unified canonical endpoint with full Redis fallback system

import { NextApiRequest, NextApiResponse } from 'next';
import { getPublicBaseUrl } from '../../../../lib/publicBaseUrl';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { contractAddress, tokenId } = req.query;

  if (!contractAddress || !tokenId) {
    return res.status(400).json({ error: 'Missing contractAddress or tokenId' });
  }

  // ENDPOINT UNIFICATION: Redirect to canonical /api/nft-metadata endpoint
  const publicBaseUrl = getPublicBaseUrl(req);
  const canonicalUrl = `${publicBaseUrl}/api/nft-metadata/${contractAddress}/${tokenId}`;
  
  console.log(`🔄 ENDPOINT REDIRECT: ${req.url} → ${canonicalUrl}`);
  
  // Preserve query parameters if any
  const queryString = new URL(req.url!, `http://localhost`).search;
  const redirectUrl = canonicalUrl + queryString;
  
  // 308 Permanent Redirect preserves method (GET/HEAD) and body
  res.setHeader('Location', redirectUrl);
  res.setHeader('X-Redirect-Reason', 'endpoint-unification');
  res.setHeader('X-Canonical-Endpoint', '/api/nft-metadata');
  
  // Cache redirect to reduce server load
  res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h cache for redirect
  
  console.log(`📍 Redirecting to canonical endpoint: ${redirectUrl}`);
  return res.status(308).end();
}