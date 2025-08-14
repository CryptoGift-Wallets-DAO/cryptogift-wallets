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

// Gateway priority: Balanced selection without bias
// 🔥 NEW: Optimized gateway order with round-robin capability
const GATEWAYS = [
  (p: string) => `https://cloudflare-ipfs.com/ipfs/${p}`,    // Fast, reliable
  (p: string) => `https://ipfs.io/ipfs/${p}`,                // Standard IPFS gateway
  (p: string) => `https://gateway.thirdweb.com/ipfs/${p}`,   // ThirdWeb gateway
  (p: string) => `https://gateway.pinata.cloud/ipfs/${p}`,   // Pinata gateway
  (p: string) => `https://nftstorage.link/ipfs/${p}`,        // NFT.Storage gateway
];

// 🔥 NEW: Gateway performance tracking for bias removal
let gatewayStats = {
  successes: new Map<string, number>(),
  failures: new Map<string, number>(),
  lastUsed: new Map<string, number>()
};

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
 * Multi-gateway validation with Promise.any + AbortController
 * Validates that content is accessible in at least N gateways before proceeding
 * 🔥 NEW: Implements Promise.any pattern with configurable minimum gateway requirement
 */
export async function validateMultiGatewayAccess(
  input: string, 
  minGateways: number = 2,
  timeoutMs: number = 4000
): Promise<{ success: boolean; workingGateways: string[]; errors: string[] }> {
  const cidPath = getCidPath(input);
  const candidates = GATEWAYS.map(f => f(cidPath));
  
  console.log(`🔍 Multi-gateway validation: Testing ${candidates.length} gateways, need ≥${minGateways}`);
  
  const workingGateways: string[] = [];
  const errors: string[] = [];
  const controller = new AbortController();
  
  // Set global timeout
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    // 🔥 CRITICAL FIX: Use Promise.any pattern with early cancellation
    // Create individual promises that can be cancelled when we reach minimum threshold
    const testPromises = candidates.map(async (url, index) => {
      try {
        const result = await testGatewayUrl(url, controller.signal);
        if (result.success) {
          workingGateways.push(url);
          console.log(`✅ Gateway ${index + 1}/${candidates.length} working: ${url}`);
          
          // 🔥 EARLY EXIT: Cancel other requests once we have minimum required
          if (workingGateways.length >= minGateways) {
            console.log(`🚀 EARLY SUCCESS: Reached ${minGateways} working gateways, cancelling remaining`);
            controller.abort(); // Cancel remaining requests
          }
          
          return { success: true, url, index };
        } else {
          errors.push(`Gateway ${index + 1}: ${result.error}`);
          return { success: false, url, index, error: result.error };
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Gateway ${index + 1}: ${errorMsg}`);
        return { success: false, url, index, error: errorMsg };
      }
    });
    
    // 🔥 NEW: Use Promise.allSettled but with early exit capability
    // Wait for all to complete OR until we get minimum required successes
    const results = await Promise.allSettled(testPromises);
    
    // Count final successful validations
    const successCount = workingGateways.length;
    const success = successCount >= minGateways;
    
    console.log(`🎯 Multi-gateway validation result: ${successCount}/${candidates.length} working (need ≥${minGateways})`);
    
    return {
      success,
      workingGateways,
      errors
    };
    
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Test individual gateway URL accessibility
 */
async function testGatewayUrl(url: string, signal: AbortSignal): Promise<{ success: boolean; error?: string }> {
  try {
    if (url.includes('gateway.thirdweb.com')) {
      // ThirdWeb gateway: Use GET with Range
      const response = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-1023' },
        signal
      });
      return { success: response.ok || response.status === 206 };
    } else {
      // Other gateways: Try HEAD first, then GET Range fallback
      try {
        const headResponse = await fetch(url, { method: 'HEAD', signal });
        if (headResponse.ok) {
          return { success: true };
        }
      } catch {
        // HEAD failed, try GET Range
      }
      
      const getResponse = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
        signal
      });
      return { success: getResponse.ok || getResponse.status === 206 };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Extract normalized CID path from various input formats
 */
function getCidPath(input: string): string {
  if (input.startsWith('ipfs://')) {
    return normalizeCidPath(input.slice(7));
  } else if (input.startsWith('https://') && input.includes('/ipfs/')) {
    const extracted = extractCidFromHttpsUrl(input);
    return extracted ? normalizeCidPath(extracted) : input;
  } else {
    return normalizeCidPath(input);
  }
}

/**
 * Optimized gateway selection with bias removal and performance tracking
 * 🔥 NEW: Smart gateway selection based on performance rather than order
 */
function getOptimizedGatewayOrder(cidPath: string): string[] {
  const candidates = GATEWAYS.map(f => f(cidPath));
  
  // 🔥 NEW: Sort by success rate and recency, not fixed order
  return candidates.sort((a, b) => {
    const aHost = new URL(a).hostname;
    const bHost = new URL(b).hostname;
    
    const aSuccesses = gatewayStats.successes.get(aHost) || 0;
    const bSuccesses = gatewayStats.successes.get(bHost) || 0;
    const aFailures = gatewayStats.failures.get(aHost) || 0;
    const bFailures = gatewayStats.failures.get(bHost) || 0;
    
    const aSuccessRate = aSuccesses + aFailures > 0 ? aSuccesses / (aSuccesses + aFailures) : 0.5;
    const bSuccessRate = bSuccesses + bFailures > 0 ? bSuccesses / (bSuccesses + bFailures) : 0.5;
    
    // Prefer higher success rate, but add some randomness to prevent bias
    const aScore = aSuccessRate + (Math.random() * 0.1); // 10% randomness
    const bScore = bSuccessRate + (Math.random() * 0.1);
    
    return bScore - aScore; // Higher scores first
  });
}

/**
 * Track gateway performance for bias removal
 */
function updateGatewayStats(url: string, success: boolean): void {
  const hostname = new URL(url).hostname;
  
  if (success) {
    gatewayStats.successes.set(hostname, (gatewayStats.successes.get(hostname) || 0) + 1);
  } else {
    gatewayStats.failures.set(hostname, (gatewayStats.failures.get(hostname) || 0) + 1);
  }
  
  gatewayStats.lastUsed.set(hostname, Date.now());
}

/**
 * Robust gateway probing with HEAD + GET Range fallback
 * 🔥 NEW: Bias-free selection with performance-based ordering
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
  
  // 🔥 NEW: Use optimized gateway order instead of fixed bias
  const candidates = getOptimizedGatewayOrder(cidPath);
  
  for (const u of candidates) {
    try {
      // 🔥 NEW: Unified approach - use GET directly for all gateways to eliminate bias
      console.log(`🔍 Testing gateway: ${new URL(u).hostname}`);
      
      const response = await fetch(u, { 
        method: 'GET', 
        headers: { Range: 'bytes=0-1023' }, // Small range test for all gateways
        signal: AbortSignal.timeout(3000) // Consistent timeout
      });
      
      if (response.ok || response.status === 206) {
        updateGatewayStats(u, true);
        console.log(`✅ Gateway success: ${new URL(u).hostname}`);
        return u;
      }
      
      updateGatewayStats(u, false);
      
    } catch (error) {
      updateGatewayStats(u, false);
      console.log(`⚠️ Gateway failed: ${new URL(u).hostname}`);
      continue; // Try next gateway
    }
  }
  
  // Last resort: return first candidate (maintains compatibility)
  console.log('⚠️ All gateways failed, using first candidate as fallback');
  return candidates[0];
}

