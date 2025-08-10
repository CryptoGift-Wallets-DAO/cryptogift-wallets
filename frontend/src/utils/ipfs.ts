/**
 * ROBUST IPFS UTILITIES - SINGLE SOURCE OF TRUTH
 * 
 * Implements the definitive solution for IPFS URL handling:
 * - Normalizes CID paths with proper segment encoding
 * - Handles orphaned % characters gracefully
 * - Robust gateway probing with HEAD + GET Range fallback
 * - Single encoding pass (no double-encoding)
 * - Preserves query params and fragments
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import { encodeAllPathSegmentsSafe } from './encodePathSafe';

/**
 * Normalizes IPFS CID path with proper segment encoding
 * Handles orphaned % characters and preserves query/fragments
 */
export function normalizeCidPath(cidPath: string): string {
  const qh = cidPath.search(/[?#]/);
  const path = qh === -1 ? cidPath : cidPath.slice(0, qh);
  const tail = qh === -1 ? '' : cidPath.slice(qh);
  
  return path.split('/').map(seg => {
    if (!seg) return '';
    
    // Handle orphaned % characters (not followed by 2 hex digits)
    let s = seg.replace(/%(?![0-9A-Fa-f]{2})/g, '%25');
    
    try { 
      return encodeURIComponent(decodeURIComponent(s)); 
    } catch { 
      return encodeURIComponent(s); 
    }
  }).join('/') + tail;
}

// Gateway priority: Cloudflare first (most reliable), NFT.Storage last
const GATEWAYS = [
  (p: string) => `https://cloudflare-ipfs.com/ipfs/${p}`,
  (p: string) => `https://ipfs.io/ipfs/${p}`,
  (p: string) => `https://gateway.pinata.cloud/ipfs/${p}`,
  (p: string) => `https://nftstorage.link/ipfs/${p}`, // last (as per your analysis)
];

/**
 * Converts IPFS URL to HTTPS with single encoding pass
 * Uses first gateway by default (fastest path)
 */
export function convertIPFSToHTTPS(ipfsUrl: string): string {
  const rest = ipfsUrl.startsWith('ipfs://') ? ipfsUrl.slice(7) : ipfsUrl;
  const cidPath = normalizeCidPath(rest); // single encode here
  return GATEWAYS[0](cidPath); // no re-encoding
}

/**
 * Robust gateway probing with HEAD + GET Range fallback
 * Handles gateways that block HEAD requests
 */
export async function pickGatewayUrl(ipfsUrlOrCidPath: string): Promise<string> {
  const rest = ipfsUrlOrCidPath.startsWith('ipfs://') ? ipfsUrlOrCidPath.slice(7) : ipfsUrlOrCidPath;
  const cidPath = normalizeCidPath(rest); // encode once here
  const candidates = GATEWAYS.map(f => f(cidPath)); // no re-encoding here
  
  for (const u of candidates) {
    try {
      // 1) HEAD request first (fastest)
      const h = await fetch(u, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(2000) // 2s timeout
      });
      if (h.ok) return u;
      
      // 2) GET Range fallback if HEAD is blocked by gateway
      const g = await fetch(u, { 
        method: 'GET', 
        headers: { Range: 'bytes=0-0' },
        signal: AbortSignal.timeout(2000)
      });
      if (g.ok || g.status === 206) return u;
      
    } catch {
      continue; // Try next gateway
    }
  }
  
  return candidates[0]; // Last resort fallback
}

/**
 * Legacy function for compatibility - uses new robust system
 * @deprecated Use convertIPFSToHTTPS or pickGatewayUrl directly
 */
export function convertIPFSToHTTPSWithRetry(ipfsUrl: string): Promise<string> {
  return Promise.resolve(convertIPFSToHTTPS(ipfsUrl));
}