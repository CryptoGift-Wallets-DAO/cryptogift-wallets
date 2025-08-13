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
// 🔧 FASE 5A FIX: Added ThirdWeb gateway (missing from audit)
const GATEWAYS = [
  (p: string) => `https://cloudflare-ipfs.com/ipfs/${p}`,
  (p: string) => `https://ipfs.io/ipfs/${p}`,
  (p: string) => `https://gateway.thirdweb.com/ipfs/${p}`, // Added per audit
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
 * Extracts CID and path from HTTPS IPFS gateway URLs
 * 🔧 FASE 5A FIX: Handle already-formed HTTPS URLs per audit findings
 */
function extractCidFromHttpsUrl(httpsUrl: string): string | null {
  // Match pattern: https://domain.com/ipfs/CID/optional/path
  const match = httpsUrl.match(/\/ipfs\/([^\/\?#]+)(.*)$/);
  if (match) {
    const cid = match[1];
    const path = match[2] || '';
    return cid + path;
  }
  return null;
}

/**
 * Robust gateway probing with HEAD + GET Range fallback
 * Handles gateways that block HEAD requests
 * 🔧 FASE 5A FIX: Now handles HTTPS URLs, ipfs:// URLs, and raw CIDs
 */
export async function pickGatewayUrl(input: string): Promise<string> {
  // 🔧 CRITICAL FIX: Handle different input types per audit
  let cidPath: string;
  
  if (input.startsWith('ipfs://')) {
    // Standard ipfs:// URL
    cidPath = normalizeCidPath(input.slice(7));
  } else if (input.startsWith('https://') && input.includes('/ipfs/')) {
    // Already-formed HTTPS URL with /ipfs/ - extract CID
    const extracted = extractCidFromHttpsUrl(input);
    if (extracted) {
      cidPath = normalizeCidPath(extracted);
    } else {
      // If we can't extract CID, return original URL as-is
      console.warn(`⚠️ Could not extract CID from HTTPS URL, returning as-is: ${input}`);
      return input;
    }
  } else if (input.startsWith('https://') && !input.includes('/ipfs/')) {
    // Non-IPFS HTTPS URL - return as-is
    console.log(`ℹ️ Non-IPFS HTTPS URL, returning as-is: ${input}`);
    return input;
  } else {
    // Assume raw CID or CID/path
    cidPath = normalizeCidPath(input);
  }
  
  const candidates = GATEWAYS.map(f => f(cidPath));
  
  for (const u of candidates) {
    try {
      // 🔧 FASE 5A FIX: ThirdWeb gateway often blocks HEAD, use GET directly
      if (u.includes('gateway.thirdweb.com')) {
        console.log(`🔧 ThirdWeb gateway detected, using GET with Range directly: ${u}`);
        const g = await fetch(u, { 
          method: 'GET', 
          headers: { Range: 'bytes=0-1023' }, // Small range to test availability
          signal: AbortSignal.timeout(3000) // Slightly longer timeout for ThirdWeb
        });
        if (g.ok || g.status === 206) return u;
      } else {
        // Standard flow for other gateways
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
      }
      
    } catch {
      continue; // Try next gateway
    }
  }
  
  return candidates[0]; // Last resort fallback
}

