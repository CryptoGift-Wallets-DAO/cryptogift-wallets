/**
 * METADATA WARMING SYSTEM - CRITICAL FOR NFT VISIBILITY
 *
 * This module ensures NFT metadata is properly warmed and available
 * across all wallets and devices immediately after claiming.
 *
 * PROBLEM SOLVED:
 * - PC claim → NFT appears without image initially
 * - Mobile claim → NFT permanently without image
 * - Metadata not being warmed properly before wallet_watchAsset
 *
 * SOLUTION:
 * - Comprehensive metadata warming before AND after claim
 * - Multiple gateway warming for redundancy
 * - Proper Redis cache verification
 * - Force metadata refresh across all endpoints
 *
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import { getMetadataUrl, getStandardMetadataUrl } from './clientSafeBaseUrl';
import { convertIPFSToHTTPS } from '../utils/ipfs';

interface WarmingResult {
  success: boolean;
  warmedEndpoints: string[];
  errors: string[];
  metadata?: any;
}

/**
 * Warm all metadata endpoints to ensure availability
 * This should be called BEFORE wallet_watchAsset for best results
 */
export async function warmAllMetadataEndpoints(
  contractAddress: string,
  tokenId: string | number,
  options?: {
    timeout?: number;
    includeIPFS?: boolean;
    forceRefresh?: boolean;
  }
): Promise<WarmingResult> {
  const timeout = options?.timeout || 5000;
  const includeIPFS = options?.includeIPFS ?? true;
  const forceRefresh = options?.forceRefresh ?? false;

  const warmedEndpoints: string[] = [];
  const errors: string[] = [];
  let metadata: any = null;

  console.log('🔥 WARMING ALL METADATA ENDPOINTS for token:', tokenId);

  try {
    // 1. Warm primary metadata endpoint (BaseScan compatible)
    const primaryUrl = getMetadataUrl(contractAddress, tokenId);
    console.log('📡 Warming primary endpoint:', primaryUrl);

    try {
      const primaryResponse = await fetch(primaryUrl, {
        method: 'GET',
        headers: forceRefresh ? { 'Cache-Control': 'no-cache' } : {},
        signal: AbortSignal.timeout(timeout)
      });

      if (primaryResponse.ok) {
        metadata = await primaryResponse.json();
        warmedEndpoints.push(primaryUrl);
        console.log('✅ Primary endpoint warmed successfully');

        // Extract image URL for IPFS warming
        if (metadata?.image && includeIPFS) {
          await warmIPFSGateways(metadata.image, timeout);
        }
      } else {
        errors.push(`Primary endpoint returned ${primaryResponse.status}`);
        console.warn('⚠️ Primary endpoint not ready:', primaryResponse.status);
      }
    } catch (err: any) {
      errors.push(`Primary endpoint error: ${err.message}`);
      console.error('❌ Primary endpoint warming failed:', err);
    }

    // 2. Warm standard metadata endpoint (MetaMask compatible)
    const standardUrl = getStandardMetadataUrl(contractAddress, tokenId);
    console.log('📡 Warming standard endpoint:', standardUrl);

    try {
      const standardResponse = await fetch(standardUrl, {
        method: 'GET',
        headers: forceRefresh ? { 'Cache-Control': 'no-cache' } : {},
        signal: AbortSignal.timeout(timeout)
      });

      if (standardResponse.ok) {
        const standardMetadata = await standardResponse.json();
        warmedEndpoints.push(standardUrl);
        console.log('✅ Standard endpoint warmed successfully');

        // Use standard metadata if primary failed
        if (!metadata) {
          metadata = standardMetadata;
        }
      } else {
        errors.push(`Standard endpoint returned ${standardResponse.status}`);
        console.warn('⚠️ Standard endpoint not ready:', standardResponse.status);
      }
    } catch (err: any) {
      errors.push(`Standard endpoint error: ${err.message}`);
      console.error('❌ Standard endpoint warming failed:', err);
    }

    // 3. Warm placeholder endpoint as fallback
    const placeholderUrl = `${primaryUrl.split('/api/')[0]}/api/nft-metadata/placeholder`;
    try {
      const placeholderResponse = await fetch(placeholderUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(1000) // Quick check only
      });

      if (placeholderResponse.ok) {
        warmedEndpoints.push(placeholderUrl);
        console.log('✅ Placeholder endpoint ready as fallback');
      }
    } catch {
      // Placeholder is optional, don't log as error
    }

    // 4. Force Redis cache refresh if requested
    if (forceRefresh && metadata) {
      await refreshRedisCache(contractAddress, tokenId, metadata);
    }

    const success = warmedEndpoints.length > 0;

    console.log('🔥 WARMING COMPLETE:', {
      success,
      endpointsWarmed: warmedEndpoints.length,
      errors: errors.length,
      hasMetadata: !!metadata
    });

    return {
      success,
      warmedEndpoints,
      errors,
      metadata
    };

  } catch (error: any) {
    console.error('💥 CRITICAL WARMING ERROR:', error);
    return {
      success: false,
      warmedEndpoints,
      errors: [...errors, error.message],
      metadata: null
    };
  }
}

/**
 * Warm IPFS gateways for image availability
 */
async function warmIPFSGateways(imageUrl: string, timeout: number): Promise<void> {
  if (!imageUrl || (!imageUrl.startsWith('ipfs://') && !imageUrl.includes('/ipfs/'))) {
    return; // Not an IPFS URL
  }

  console.log('🖼️ Warming IPFS gateways for image...');

  // Extract CID from various formats
  let cid: string | null = null;
  if (imageUrl.startsWith('ipfs://')) {
    cid = imageUrl.replace('ipfs://', '');
  } else if (imageUrl.includes('/ipfs/')) {
    cid = imageUrl.split('/ipfs/')[1].split('?')[0];
  }

  if (!cid) {
    console.warn('⚠️ Could not extract CID from image URL');
    return;
  }

  // Critical gateways to warm
  const gateways = [
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://gateway.thirdweb.com/ipfs/${cid}`,
    `https://nftstorage.link/ipfs/${cid}`
  ];

  // Warm all gateways in parallel (best effort)
  const warmingPromises = gateways.map(async (gatewayUrl) => {
    try {
      const response = await fetch(gatewayUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(timeout)
      });

      if (response.ok || response.status === 206) {
        console.log(`✅ Gateway warmed: ${new URL(gatewayUrl).hostname}`);
      }
    } catch {
      // Silent fail - best effort
    }
  });

  // Wait for all warmings or timeout
  await Promise.race([
    Promise.allSettled(warmingPromises),
    new Promise(resolve => setTimeout(resolve, timeout))
  ]);
}

/**
 * Force refresh Redis cache with latest metadata
 */
async function refreshRedisCache(
  contractAddress: string,
  tokenId: string | number,
  metadata: any
): Promise<void> {
  try {
    console.log('🔄 Forcing Redis cache refresh...');

    // Call the update-metadata endpoint to ensure Redis is fresh
    const response = await fetch('/api/nft/update-metadata-cache', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contractAddress,
        tokenId,
        metadata,
        source: 'warming-system'
      })
    });

    if (response.ok) {
      console.log('✅ Redis cache refreshed successfully');
    } else {
      console.warn('⚠️ Redis refresh returned:', response.status);
    }
  } catch (error) {
    console.warn('⚠️ Redis refresh failed:', error);
    // Non-critical, don't throw
  }
}

/**
 * Enhanced metadata warming specifically for post-claim
 * This ensures the NFT appears correctly in wallets
 */
export async function warmMetadataPostClaim(
  contractAddress: string,
  tokenId: string | number,
  transactionHash?: string
): Promise<WarmingResult> {
  console.log('🎯 POST-CLAIM METADATA WARMING:', {
    contractAddress,
    tokenId,
    transactionHash: transactionHash?.slice(0, 10) + '...'
  });

  // First, do standard warming
  const warmingResult = await warmAllMetadataEndpoints(contractAddress, tokenId, {
    timeout: 8000, // Longer timeout for post-claim
    includeIPFS: true,
    forceRefresh: true // Force refresh after claim
  });

  // Additional post-claim specific warming
  if (warmingResult.metadata?.image) {
    // Ensure image is accessible via multiple gateways
    const imageUrl = warmingResult.metadata.image;

    if (imageUrl.startsWith('ipfs://') || imageUrl.includes('/ipfs/')) {
      console.log('🖼️ Ensuring image availability across gateways...');

      // Convert to HTTPS and warm
      const httpsUrl = convertIPFSToHTTPS(imageUrl);
      try {
        const imageResponse = await fetch(httpsUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });

        if (imageResponse.ok) {
          console.log('✅ Image confirmed accessible via HTTPS');
        }
      } catch {
        console.warn('⚠️ Image not immediately accessible, may need time to propagate');
      }
    }
  }

  return warmingResult;
}

/**
 * Pre-claim metadata warming to ensure everything is ready
 * Call this BEFORE the actual claim transaction
 */
export async function warmMetadataPreClaim(
  contractAddress: string,
  tokenId: string | number
): Promise<WarmingResult> {
  console.log('🔮 PRE-CLAIM METADATA WARMING:', {
    contractAddress,
    tokenId
  });

  // Warm with shorter timeout since this is pre-claim
  return await warmAllMetadataEndpoints(contractAddress, tokenId, {
    timeout: 3000,
    includeIPFS: true,
    forceRefresh: false // Don't force refresh before claim
  });
}

/**
 * Emergency metadata recovery for cases where image is missing
 * This tries multiple strategies to recover the metadata
 */
export async function recoverMissingMetadata(
  contractAddress: string,
  tokenId: string | number
): Promise<WarmingResult> {
  console.log('🚨 EMERGENCY METADATA RECOVERY for token:', tokenId);

  // Try multiple strategies in sequence
  const strategies = [
    // Strategy 1: Force refresh from all sources
    () => warmAllMetadataEndpoints(contractAddress, tokenId, {
      timeout: 10000,
      includeIPFS: true,
      forceRefresh: true
    }),

    // Strategy 2: Try to get from blockchain directly
    async () => {
      console.log('🔗 Attempting blockchain metadata recovery...');
      const response = await fetch(`/api/metadata/recover/${contractAddress}/${tokenId}`, {
        method: 'POST',
        signal: AbortSignal.timeout(15000)
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          warmedEndpoints: ['blockchain-recovery'],
          errors: [],
          metadata: result.metadata
        };
      }
      throw new Error('Blockchain recovery failed');
    },

    // Strategy 3: Force IPFS gateway rotation
    async () => {
      console.log('🔄 Attempting IPFS gateway rotation...');
      const metadataUrl = getMetadataUrl(contractAddress, tokenId);
      const response = await fetch(`${metadataUrl}?forceGatewayRotation=true`, {
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const metadata = await response.json();
        return {
          success: true,
          warmedEndpoints: ['gateway-rotation'],
          errors: [],
          metadata
        };
      }
      throw new Error('Gateway rotation failed');
    }
  ];

  // Try each strategy until one works
  for (const strategy of strategies) {
    try {
      const result = await strategy();
      if (result.success && result.metadata) {
        console.log('✅ RECOVERY SUCCESSFUL with metadata');
        return result;
      }
    } catch (error) {
      console.warn('⚠️ Recovery strategy failed:', error);
      continue;
    }
  }

  // All strategies failed
  console.error('❌ ALL RECOVERY STRATEGIES FAILED');
  return {
    success: false,
    warmedEndpoints: [],
    errors: ['All recovery strategies exhausted'],
    metadata: null
  };
}