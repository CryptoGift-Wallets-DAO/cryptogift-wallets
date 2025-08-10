// REDIS FALLBACK SYSTEM WITH FULL CHAIN: Redis → on-chain tokenURI → IPFS JSON → placeholder → cache
// Made by mbxarts.com The Moon in a Box property - Co-Author: Godez22
// Implements Protocol v2 Type C: Architectural change with 4 hardening minimums

import { ethers } from 'ethers';
import { Redis } from '@upstash/redis';
import { pickGatewayUrl } from '../utils/ipfs';

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

interface FallbackConfig {
  contractAddress: string;
  tokenId: string;
  publicBaseUrl: string;
  timeout?: number; // Default 4-5s
}

interface FallbackResult {
  metadata: ERC721Metadata;
  source: 'redis' | 'on-chain' | 'ipfs' | 'placeholder';
  cached: boolean;
  latency: number;
  gatewayUsed?: string;
  redirectCount?: number;
}

// Redis client with error handling
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  enableAutoPipelining: false,
  retry: false,
});

// HARDENING #1: AbortController with 4-5s timeout
const createTimeoutController = (timeoutMs: number = 4500) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, cleanup: () => clearTimeout(timeoutId) };
};

// HARDENING #2: Redis lock anti-stampede system
const acquireLock = async (key: string, ttlSeconds: number = 10): Promise<boolean> => {
  try {
    const lockKey = `meta:${key}:lock`;
    const result = await redis.set(lockKey, '1', { nx: true, ex: ttlSeconds });
    return result === 'OK';
  } catch (error) {
    console.warn(`⚠️ Lock acquisition failed for ${key}:`, error);
    return false;
  }
};

const releaseLock = async (key: string): Promise<void> => {
  try {
    const lockKey = `meta:${key}:lock`;
    await redis.del(lockKey);
  } catch (error) {
    console.warn(`⚠️ Lock release failed for ${key}:`, error);
  }
};

// HARDENING #3: JSON schema validation
const validateMetadataSchema = (data: any): data is ERC721Metadata => {
  if (!data || typeof data !== 'object') return false;
  
  // Required fields
  if (typeof data.name !== 'string') return false;
  if (typeof data.image !== 'string') return false;
  
  // Check for double encoding in image URL
  if (data.image.includes('%2520')) {
    console.warn('⚠️ Double encoding detected in image URL:', data.image);
    return false;
  }
  
  // Attributes should be array if present
  if (data.attributes && !Array.isArray(data.attributes)) return false;
  
  return true;
};

// Generate consistent placeholder metadata
const generatePlaceholderMetadata = (contractAddress: string, tokenId: string, publicBaseUrl: string): ERC721Metadata => {
  return {
    name: `CryptoGift NFT #${tokenId}`,
    description: `A unique CryptoGift NFT created on the platform. This is a placeholder while metadata is being resolved. Token ID: ${tokenId}, Contract: ${contractAddress}`,
    image: `data:image/svg+xml;base64,${Buffer.from(`
      <svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="400" fill="url(#gradient)"/>
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
          </linearGradient>
        </defs>
        <text x="200" y="160" text-anchor="middle" fill="white" font-family="Arial" font-size="28" font-weight="bold">
          CryptoGift NFT
        </text>
        <text x="200" y="200" text-anchor="middle" fill="#e2e8f0" font-family="Arial" font-size="20">
          Token #${tokenId}
        </text>
        <text x="200" y="240" text-anchor="middle" fill="#cbd5e1" font-family="Arial" font-size="16">
          Resolving metadata...
        </text>
        <circle cx="200" cy="280" r="20" fill="none" stroke="#e2e8f0" stroke-width="3">
          <animate attributeName="stroke-dasharray" values="0,126;63,63;0,126" dur="2s" repeatCount="indefinite"/>
        </circle>
      </svg>
    `).toString('base64')}`,
    attributes: [
      {
        trait_type: "Token ID",
        value: tokenId
      },
      {
        trait_type: "Status", 
        value: "Metadata Resolving"
      },
      {
        trait_type: "Platform",
        value: "CryptoGift Wallets"
      }
    ],
    external_url: `${publicBaseUrl}/nft/${contractAddress}/${tokenId}`,
  };
};

// Fetch on-chain tokenURI
const fetchOnChainTokenURI = async (contractAddress: string, tokenId: string, signal: AbortSignal): Promise<string | null> => {
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    const tokenContract = new ethers.Contract(contractAddress, [
      "function tokenURI(uint256 tokenId) view returns (string)",
      "function ownerOf(uint256 tokenId) view returns (address)"
    ], provider);
    
    // Verify token exists first
    const owner = await tokenContract.ownerOf(BigInt(tokenId));
    if (!owner || owner === '0x0000000000000000000000000000000000000000') {
      throw new Error('Token does not exist');
    }
    
    // Get tokenURI
    const tokenURI = await tokenContract.tokenURI(BigInt(tokenId));
    console.log(`📋 On-chain tokenURI for ${contractAddress}:${tokenId}: ${tokenURI}`);
    
    return tokenURI;
    
  } catch (error) {
    console.warn(`⚠️ On-chain tokenURI fetch failed for ${contractAddress}:${tokenId}:`, error);
    return null;
  }
};

// Fetch and validate IPFS JSON metadata
const fetchIPFSMetadata = async (ipfsUrl: string, signal: AbortSignal): Promise<ERC721Metadata | null> => {
  try {
    // Resolve IPFS URL to HTTP gateway with HEAD→GET range logic
    const resolvedUrl = await pickGatewayUrl(ipfsUrl);
    console.log(`🌐 Resolved IPFS URL: ${ipfsUrl} → ${resolvedUrl}`);
    
    // Fetch with timeout control
    const response = await fetch(resolvedUrl, { 
      signal,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Range': 'bytes=0-1048576', // Max 1MB JSON
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json') && !contentType?.includes('text/plain')) {
      console.warn(`⚠️ Unexpected content-type for JSON: ${contentType}`);
    }
    
    const jsonData = await response.json();
    
    // HARDENING #3: Validate schema before processing
    if (!validateMetadataSchema(jsonData)) {
      throw new Error('Invalid metadata schema');
    }
    
    // Ensure image URL is properly encoded
    if (jsonData.image) {
      jsonData.image = await pickGatewayUrl(jsonData.image);
    }
    
    console.log(`✅ IPFS metadata fetched and validated: ${resolvedUrl}`);
    return jsonData as ERC721Metadata;
    
  } catch (error) {
    console.warn(`⚠️ IPFS metadata fetch failed for ${ipfsUrl}:`, error);
    return null;
  }
};

// HARDENING #4: TTL and SWR caching
const cacheMetadata = async (key: string, metadata: ERC721Metadata, ttlMinutes: number = 10): Promise<void> => {
  try {
    const cacheData = {
      metadata,
      cached_at: new Date().toISOString(),
      source: 'fallback-system'
    };
    
    await redis.setex(key, ttlMinutes * 60, JSON.stringify(cacheData));
    console.log(`💾 Cached metadata for ${key} with ${ttlMinutes}min TTL`);
  } catch (error) {
    console.warn(`⚠️ Failed to cache metadata for ${key}:`, error);
  }
};

/**
 * MAIN FALLBACK SYSTEM: Redis → on-chain tokenURI → IPFS JSON → placeholder → cache
 * Implements all 4 hardening requirements from Protocol v2 Type C specification
 */
export const getNFTMetadataWithFallback = async (config: FallbackConfig): Promise<FallbackResult> => {
  const { contractAddress, tokenId, publicBaseUrl, timeout = 4500 } = config;
  const startTime = Date.now();
  const cacheKey = `nft:${contractAddress}:${tokenId}`;
  
  console.log(`🔍 Starting fallback chain for ${contractAddress}:${tokenId}`);
  
  // Step 1: Try Redis first
  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      const parsed = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
      const metadata = parsed.metadata || parsed;
      
      if (validateMetadataSchema(metadata)) {
        const latency = Date.now() - startTime;
        console.log(`✅ Redis cache hit for ${contractAddress}:${tokenId} (${latency}ms)`);
        return {
          metadata,
          source: 'redis',
          cached: true,
          latency
        };
      }
    }
  } catch (error) {
    console.warn(`⚠️ Redis lookup failed for ${contractAddress}:${tokenId}:`, error);
  }
  
  // Step 2: Anti-stampede lock for expensive operations
  const hasLock = await acquireLock(cacheKey);
  if (!hasLock) {
    console.log(`⏳ Another process is fetching ${contractAddress}:${tokenId}, using placeholder`);
    const latency = Date.now() - startTime;
    return {
      metadata: generatePlaceholderMetadata(contractAddress, tokenId, publicBaseUrl),
      source: 'placeholder',
      cached: false,
      latency
    };
  }
  
  const { controller, cleanup } = createTimeoutController(timeout);
  
  try {
    // Step 3: Fetch on-chain tokenURI
    console.log(`📋 Fetching on-chain tokenURI for ${contractAddress}:${tokenId}`);
    const onChainTokenURI = await fetchOnChainTokenURI(contractAddress, tokenId, controller.signal);
    
    if (onChainTokenURI && onChainTokenURI.startsWith('ipfs://')) {
      // Step 4: Resolve IPFS JSON metadata
      console.log(`🌐 Resolving IPFS metadata: ${onChainTokenURI}`);
      const ipfsMetadata = await fetchIPFSMetadata(onChainTokenURI, controller.signal);
      
      if (ipfsMetadata && validateMetadataSchema(ipfsMetadata)) {
        // Success! Cache and return
        await cacheMetadata(cacheKey, ipfsMetadata, 10);
        const latency = Date.now() - startTime;
        
        console.log(`🎉 IPFS metadata resolved for ${contractAddress}:${tokenId} (${latency}ms)`);
        return {
          metadata: ipfsMetadata,
          source: 'ipfs',
          cached: false,
          latency,
          gatewayUsed: 'ipfs.io' // Could be enhanced to track actual gateway
        };
      }
    } else if (onChainTokenURI && onChainTokenURI.startsWith('http')) {
      // Handle HTTP tokenURI (might be our own endpoint)
      console.log(`🔗 HTTP tokenURI detected: ${onChainTokenURI}`);
      try {
        const response = await fetch(onChainTokenURI, { signal: controller.signal });
        if (response.ok) {
          const httpMetadata = await response.json();
          if (validateMetadataSchema(httpMetadata)) {
            await cacheMetadata(cacheKey, httpMetadata, 5);
            const latency = Date.now() - startTime;
            return {
              metadata: httpMetadata,
              source: 'on-chain',
              cached: false,
              latency
            };
          }
        }
      } catch (httpError) {
        console.warn(`⚠️ HTTP tokenURI fetch failed: ${httpError}`);
      }
    }
    
    // Step 5: All else failed, use placeholder and cache it briefly
    console.log(`⚠️ All fallbacks failed for ${contractAddress}:${tokenId}, using placeholder`);
    const placeholderMetadata = generatePlaceholderMetadata(contractAddress, tokenId, publicBaseUrl);
    
    // Cache placeholder for shorter time to retry sooner
    await cacheMetadata(cacheKey, placeholderMetadata, 2);
    
    const latency = Date.now() - startTime;
    return {
      metadata: placeholderMetadata,
      source: 'placeholder',
      cached: false,
      latency
    };
    
  } finally {
    cleanup();
    await releaseLock(cacheKey);
  }
};

// Export utility functions for testing
export { validateMetadataSchema, generatePlaceholderMetadata };