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
 * 🔧 FIX: Removes redundant ipfs/ prefixes from legacy formats
 */
export function normalizeCidPath(cidPath: string): string {
  // 🔧 FIX: Remove ALL redundant ipfs/ prefixes from legacy formats like ipfs://ipfs/...
  let cleanPath = cidPath;
  while (cleanPath.startsWith('ipfs/')) {
    cleanPath = cleanPath.slice(5);
    console.log('🔧 Removed redundant ipfs/ prefix from IPFS URI');
  }

  const qh = cleanPath.search(/[?#]/);
  const path = qh === -1 ? cleanPath : cleanPath.slice(0, qh);
  const tail = qh === -1 ? '' : cleanPath.slice(qh);

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
// 🔥 CRITICAL FIX: Reorder gateways - cloudflare-ipfs.com has DNS issues causing BaseScan display failures
const GATEWAYS = [
  (p: string) => `https://ipfs.io/ipfs/${p}`,                // Standard IPFS gateway - WORKS
  (p: string) => `https://gateway.thirdweb.com/ipfs/${p}`,   // ThirdWeb gateway
  (p: string) => `https://gateway.pinata.cloud/ipfs/${p}`,   // Pinata gateway
  (p: string) => `https://nftstorage.link/ipfs/${p}`,        // NFT.Storage gateway
  (p: string) => `https://cloudflare-ipfs.com/ipfs/${p}`,    // MOVED TO LAST - DNS issues
];

// 🔥 CRITICAL: Gateway performance tracking + LRU cache for CID→Gateway mapping
let gatewayStats = {
  successes: new Map<string, number>(),
  failures: new Map<string, number>(),
  lastUsed: new Map<string, number>()
};

// 🔥 CRITICAL FIX: LRU Cache por CID para evitar fan-out costoso en cada request
interface GatewayCacheEntry {
  url: string;
  gateway: string;
  timestamp: number;
  ttl: number; // TTL en milliseconds
}

const GATEWAY_CACHE_TTL = 20 * 60 * 1000; // 20 minutos
const MAX_CACHE_SIZE = 1000; // LRU limit
let gatewayCidCache = new Map<string, GatewayCacheEntry>();

/**
 * 🔥 CRITICAL: LRU Cache management - evict expired and maintain size limit
 */
function cleanupGatewayCache(): void {
  const now = Date.now();
  
  // Remove expired entries
  for (const [cid, entry] of gatewayCidCache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      gatewayCidCache.delete(cid);
    }
  }
  
  // LRU eviction if too large
  if (gatewayCidCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(gatewayCidCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp); // oldest first
    
    const toDelete = entries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.2)); // remove 20%
    for (const [cid] of toDelete) {
      gatewayCidCache.delete(cid);
    }
    console.log(`🧹 LRU CLEANUP: Evicted ${toDelete.length} old gateway cache entries`);
  }
}

/**
 * 🔥 CRITICAL: Get cached gateway for CID or null if expired/missing
 */
function getCachedGateway(cidPath: string): GatewayCacheEntry | null {
  const entry = gatewayCidCache.get(cidPath);
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    gatewayCidCache.delete(cidPath);
    return null;
  }
  
  // LRU: update timestamp when accessed
  entry.timestamp = now;
  gatewayCidCache.set(cidPath, entry);
  
  return entry;
}

/**
 * 🔥 CRITICAL: Cache working gateway for CID
 */
function cacheWorkingGateway(cidPath: string, url: string, gateway: string): void {
  cleanupGatewayCache(); // Cleanup before adding
  
  const entry: GatewayCacheEntry = {
    url,
    gateway,
    timestamp: Date.now(),
    ttl: GATEWAY_CACHE_TTL
  };
  
  gatewayCidCache.set(cidPath, entry);
  console.log(`💾 GATEWAY CACHE: Stored ${gateway} for CID ${cidPath.substring(0, 20)}... (TTL: ${GATEWAY_CACHE_TTL/60000}min)`);
}

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
 * 🔧 FIX: Handle double ipfs/ipfs/ in malformed URLs
 */
function extractCidFromHttpsUrl(httpsUrl: string): string | null {
  // 🔧 FIX: First clean up any double ipfs/ipfs/ patterns in the URL
  let cleanUrl = httpsUrl;
  while (cleanUrl.includes('/ipfs/ipfs/')) {
    cleanUrl = cleanUrl.replace('/ipfs/ipfs/', '/ipfs/');
    console.log('🔧 Fixed malformed HTTP IPFS URL with double ipfs/');
  }

  // Match pattern: https://domain.com/ipfs/CID/optional/path
  const match = cleanUrl.match(/\/ipfs\/([^\/\?#]+)(.*)$/);
  if (match) {
    let cid = match[1];
    const path = match[2] || '';

    // 🔧 Additional check: if CID itself starts with 'ipfs/', remove it
    if (cid.startsWith('ipfs/')) {
      cid = cid.slice(5);
      console.log('🔧 Removed ipfs/ prefix from CID in HTTPS URL');
    }

    return cid + path;
  }
  return null;
}

/**
 * 🔥 CANONICAL FORMAT: Get best working gateway for CID in real-time
 * Tests multiple gateways and returns the first one that works
 * Prioritizes reliability over speed for BaseScan compatibility
 */
export async function getBestGatewayForCid(input: string, timeoutMs: number = 8000): Promise<{ url: string; gateway: string } | null> {
  const cidPath = getCidPath(input);
  
  // 🔥 CRITICAL: Check cache first to avoid expensive fan-out
  const cachedGateway = getCachedGateway(cidPath);
  if (cachedGateway) {
    console.log(`⚡ CACHE HIT: Using cached gateway ${cachedGateway.gateway} for CID ${cidPath.substring(0, 20)}...`);
    return { url: cachedGateway.url, gateway: cachedGateway.gateway };
  }
  
  console.log(`🔍 CACHE MISS: Testing gateways for CID: ${cidPath.substring(0, 30)}...`);
  
  // Priority order: most reliable gateways first
  const priorityGateways = [
    { name: 'ipfs.io', fn: (p: string) => `https://ipfs.io/ipfs/${p}` },
    { name: 'cloudflare-ipfs', fn: (p: string) => `https://cloudflare-ipfs.com/ipfs/${p}` },
    { name: 'dweb.link', fn: (p: string) => `https://dweb.link/ipfs/${p}` },
    { name: 'nftstorage.link', fn: (p: string) => `https://nftstorage.link/ipfs/${p}` },
    { name: 'gateway.pinata', fn: (p: string) => `https://gateway.pinata.cloud/ipfs/${p}` },
    { name: 'gateway.thirdweb', fn: (p: string) => `https://gateway.thirdweb.com/ipfs/${p}` }
  ];
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    for (const gateway of priorityGateways) {
      const url = gateway.fn(cidPath);
      console.log(`🔍 Testing gateway: ${gateway.name}...`);
      
      try {
        const result = await testGatewayUrl(url, controller.signal);
        if (result.success) {
          console.log(`✅ BEST GATEWAY: ${gateway.name} works - using ${url.substring(0, 60)}...`);
          
          // 🔥 CRITICAL: Cache working gateway to avoid future fan-outs
          cacheWorkingGateway(cidPath, url, gateway.name);
          
          return { url, gateway: gateway.name };
        } else {
          console.log(`❌ Gateway ${gateway.name} failed: ${result.error}`);
        }
      } catch (error) {
        console.log(`❌ Gateway ${gateway.name} exception: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }
    
    console.log(`❌ BEST GATEWAY: All gateways failed for CID: ${cidPath.substring(0, 30)}...`);
    return null;
    
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 🔥 CANONICAL FORMAT: Multi-gateway validation with Promise.any + AbortController
 * Validates that content is accessible in at least N gateways before proceeding
 * No specific gateway requirements - just needs ≥N working gateways
 */
export async function validateMultiGatewayAccess(
  input: string, 
  minGateways: number = 1,  // REDUCED: Only require 1 gateway for upload
  timeoutMs: number = 15000, // INCREASED: More time for new CIDs to propagate on mobile
  retryOnFailure: boolean = true // NEW: Enable retry for initial uploads
): Promise<{ success: boolean; workingGateways: string[]; errors: string[]; gatewayDetails: Array<{name: string; url: string; success: boolean; error?: string}> }> {
  const cidPath = getCidPath(input);
  
  // Use the same priority gateways as getBestGatewayForCid for consistency
  const priorityGateways = [
    { name: 'ipfs.io', fn: (p: string) => `https://ipfs.io/ipfs/${p}` },
    { name: 'cloudflare-ipfs', fn: (p: string) => `https://cloudflare-ipfs.com/ipfs/${p}` },
    { name: 'dweb.link', fn: (p: string) => `https://dweb.link/ipfs/${p}` },
    { name: 'nftstorage.link', fn: (p: string) => `https://nftstorage.link/ipfs/${p}` },
    { name: 'gateway.pinata', fn: (p: string) => `https://gateway.pinata.cloud/ipfs/${p}` },
    { name: 'gateway.thirdweb', fn: (p: string) => `https://gateway.thirdweb.com/ipfs/${p}` }
  ];
  
  console.log(`🔍 CANONICAL: Multi-gateway validation - testing ${priorityGateways.length} gateways, need ≥${minGateways}`);
  
  // 🚀 RETRY LOGIC: For mobile/first-time uploads, implement progressive retry
  const maxAttempts = retryOnFailure ? 3 : 1;
  let lastAttemptError: string = '';
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔄 Attempt ${attempt}/${maxAttempts} - timeout: ${timeoutMs}ms`);
    
    const workingGateways: string[] = [];
    const errors: string[] = [];
    const gatewayDetails: Array<{name: string; url: string; success: boolean; error?: string}> = [];
    const controller = new AbortController();
    
    // Set timeout with progressive increase for retries
    const currentTimeout = timeoutMs * attempt; // Increase timeout on each retry
    const timeoutId = setTimeout(() => controller.abort(), currentTimeout);
    
    try {
      // 🔥 CANONICAL FORMAT: Promise.any with structured gateway testing
      const testPromises = priorityGateways.map(async (gateway, index) => {
        const url = gateway.fn(cidPath);
        const detail = { name: gateway.name, url, success: false, error: undefined as string | undefined };
        
        try {
          const result = await testGatewayUrl(url, controller.signal);
          if (result.success) {
            workingGateways.push(url);
            detail.success = true;
            console.log(`✅ Gateway ${gateway.name} working: ${url.substring(0, 60)}...`);
            
            // 🔥 EARLY EXIT: Cancel other requests once we have minimum required
            if (workingGateways.length >= minGateways) {
              console.log(`🚀 EARLY SUCCESS: Reached ${minGateways} working gateways, cancelling remaining`);
              controller.abort(); // Cancel remaining requests
            }
            
            return detail;
          } else {
            detail.error = result.error;
            errors.push(`${gateway.name}: ${result.error}`);
            console.log(`❌ Gateway ${gateway.name} failed: ${result.error}`);
            return detail;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          detail.error = errorMsg;
          errors.push(`${gateway.name}: ${errorMsg}`);
          console.log(`❌ Gateway ${gateway.name} exception: ${errorMsg}`);
          return detail;
        } finally {
          gatewayDetails.push(detail);
        }
      });
      
      // 🔥 CRITICAL FIX: Don't wait for all - check periodically for minimum threshold
      // This prevents "false OK" where Promise.any exits too early but we still need ≥minGateways
      let completedCount = 0;
      const results = await Promise.allSettled(testPromises.map(async (promise) => {
        const result = await promise;
        completedCount++;
        
        // Early success check: if we have enough working gateways, we can stop
        if (workingGateways.length >= minGateways) {
          console.log(`🎯 THRESHOLD REACHED: ${workingGateways.length}/${minGateways} gateways working, early resolution`);
        }
        
        return result;
      }));
      
      // Count final successful validations
      const successCount = workingGateways.length;
      const success = successCount >= minGateways;
      
      console.log(`🎯 CANONICAL: Multi-gateway validation result: ${successCount}/${priorityGateways.length} working (need ≥${minGateways})`);
      console.log(`📊 Gateway breakdown: ${gatewayDetails.map(d => `${d.name}=${d.success ? 'OK' : 'FAIL'}`).join(', ')}`);
      
      // 🔥 CRITICAL FIX: If successful, return immediately
      if (success) {
        console.log(`✅ SUCCESS on attempt ${attempt}/${maxAttempts}`);
        return {
          success,
          workingGateways,
          errors,
          gatewayDetails
        };
      }
      
      // 🔥 MOBILE FIX: If failed and more attempts remain, wait with exponential backoff
      if (attempt < maxAttempts) {
        const backoffDelay = Math.min(2000 * Math.pow(2, attempt - 1), 8000); // 2s, 4s, 8s max
        console.log(`⏳ Attempt ${attempt} failed. Waiting ${backoffDelay}ms before retry...`);
        console.log(`📱 MOBILE: IPFS needs time to propagate. This is normal for new uploads.`);
        
        // Store last error for final reporting
        lastAttemptError = errors.join('; ');
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
      
    } finally {
      clearTimeout(timeoutId);
    }
  }
  
  // 🔥 If we get here, all attempts failed
  console.log(`❌ ALL ${maxAttempts} ATTEMPTS FAILED. Last error: ${lastAttemptError}`);
  
  // Return the last attempt's results
  return {
    success: false,
    workingGateways: [],
    errors: [`All ${maxAttempts} attempts failed. ${lastAttemptError}`],
    gatewayDetails: []
  };
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

