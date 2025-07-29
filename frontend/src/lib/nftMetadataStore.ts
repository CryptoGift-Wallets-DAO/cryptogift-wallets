// NFT Metadata Storage System - ENHANCED with Redis Persistence
// Uses centralized Redis configuration for consistency and security
// Migrated from ephemeral /tmp/ to persistent Redis storage
// Fixes image caching issues by wallet

import { NFTMetadata } from './clientMetadataStore';
import { validateRedisForCriticalOps, isRedisConfigured, getRedisStatus } from './redisConfig';

// Helper function to safely parse NFTMetadata from Redis
function parseNFTMetadataFromRedis(redisData: Record<string, unknown>): NFTMetadata | null {
  try {
    if (!redisData || Object.keys(redisData).length === 0) {
      return null;
    }

    // Parse JSON fields that are stored as strings in Redis
    const attributes = redisData.attributes ? 
      (typeof redisData.attributes === 'string' ? 
        JSON.parse(redisData.attributes) : redisData.attributes) : [];

    const metadata: NFTMetadata = {
      contractAddress: redisData.contractAddress as string,
      tokenId: redisData.tokenId as string,
      name: redisData.name as string,
      description: redisData.description as string,
      image: redisData.image as string,
      imageIpfsCid: redisData.imageIpfsCid as string | undefined,
      metadataIpfsCid: redisData.metadataIpfsCid as string | undefined,
      attributes: attributes,
      createdAt: redisData.createdAt as string,
      mintTransactionHash: redisData.mintTransactionHash as string | undefined,
      owner: redisData.owner as string | undefined,
      uniqueCreationId: redisData.uniqueCreationId as string | undefined,
      creatorWallet: redisData.creatorWallet as string | undefined,
      crossWalletAccess: redisData.crossWalletAccess === 'true',
      sourceWallet: redisData.sourceWallet as string | undefined
    };

    return metadata;
  } catch (error) {
    console.error('❌ Failed to parse NFTMetadata from Redis:', error);
    return null;
  }
}

// Redis storage functions with cache-busting
function getMetadataKey(contractAddress: string, tokenId: string): string {
  return `nft_metadata:${contractAddress.toLowerCase()}:${tokenId}`;
}

function getWalletNFTsKey(walletAddress: string): string {
  return `wallet_nfts:${walletAddress.toLowerCase()}`;
}

export async function storeNFTMetadata(metadata: NFTMetadata): Promise<void> {
  try {
    // MANDATORY: Redis is required for NFT metadata persistence
    const redis = validateRedisForCriticalOps('NFT metadata storage');
    
    // Add unique metadata ID to prevent cache conflicts
    const enhancedMetadata: NFTMetadata = {
      ...metadata,
      uniqueCreationId: `meta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      contractAddress: metadata.contractAddress.toLowerCase(),
    };
    
    const key = getMetadataKey(metadata.contractAddress, metadata.tokenId);
    
    console.log(`💾 Storing NFT metadata for ${metadata.contractAddress}:${metadata.tokenId}`);
    console.log(`🔑 Redis key: ${key}`);
    console.log(`🆔 Unique ID: ${enhancedMetadata.uniqueCreationId}`);
    console.log(`🖼️ Image being stored: ${enhancedMetadata.image}`);
    console.log(`🖼️ Image CID: ${enhancedMetadata.imageIpfsCid}`);
    
    // CRITICAL FIX: Filter out null/undefined values before storing in Redis
    const cleanMetadata: Record<string, any> = {};
    Object.entries(enhancedMetadata).forEach(([k, v]) => {
      if (v !== null && v !== undefined) {
        // Convert arrays and objects to JSON strings for Redis storage
        if (typeof v === 'object' && v !== null) {
          cleanMetadata[k] = JSON.stringify(v);
        } else {
          cleanMetadata[k] = String(v); // Redis expects string values
        }
      }
    });
    
    console.log(`💾 Calling redis.hset with key: ${key}`);
    console.log(`🧹 Cleaned metadata keys:`, Object.keys(cleanMetadata));
    console.log(`🔍 Filtered out null/undefined values`);
    
    const setResult = await redis.hset(key, cleanMetadata);
    console.log(`✅ Redis hset result:`, setResult);
    
    // Also add to wallet's NFT list if owner is specified
    if (metadata.owner) {
      const walletKey = getWalletNFTsKey(metadata.owner);
      await redis.sadd(walletKey, `${metadata.contractAddress}:${metadata.tokenId}`);
      console.log(`📋 Added to wallet NFT list: ${walletKey}`);
    }
    
    // Track this token in the contract's token list (for migration purposes)
    const contractKey = `contract_nfts:${metadata.contractAddress.toLowerCase()}`;
    await redis.sadd(contractKey, metadata.tokenId);
    console.log(`📊 Added token ${metadata.tokenId} to contract tracking: ${contractKey}`);
    
    console.log(`✅ Metadata stored successfully in Redis`);
    
  } catch (error) {
    console.error('❌ Error storing NFT metadata:', error);
    console.error('📍 Storage error details:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      key: getMetadataKey(metadata.contractAddress, metadata.tokenId)
    });
    throw error;
  }
}

export async function getNFTMetadata(contractAddress: string, tokenId: string): Promise<NFTMetadata | null> {
  try {
    const redis = validateRedisForCriticalOps('NFT metadata retrieval');
    const key = getMetadataKey(contractAddress, tokenId);
    
    console.log(`🔍 Looking for NFT metadata: ${key}`);
    
    const metadata = await redis.hgetall(key);
    
    if (metadata && Object.keys(metadata).length > 0) {
      console.log(`✅ Found stored metadata for ${contractAddress}:${tokenId}`);
      console.log(`🆔 Unique ID: ${metadata.uniqueCreationId || 'legacy'}`);
      
      // Use safe parsing function instead of direct type casting
      return parseNFTMetadataFromRedis(metadata);
    } else {
      console.log(`❌ No metadata found in Redis for ${contractAddress}:${tokenId}`);
      return null;
    }
  } catch (error) {
    console.log(`⚠️ Error retrieving metadata for ${contractAddress}:${tokenId}`);
    console.log(`📍 Error details:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

export async function updateNFTMetadata(
  contractAddress: string, 
  tokenId: string, 
  updates: Partial<NFTMetadata>
): Promise<void> {
  try {
    const existing = await getNFTMetadata(contractAddress, tokenId);
    if (!existing) {
      throw new Error(`No metadata found for ${contractAddress}:${tokenId}`);
    }
    
    // Preserve unique ID but update other fields
    const updated = { 
      ...existing, 
      ...updates,
      // Keep original unique ID to maintain identity
      uniqueCreationId: existing.uniqueCreationId,
      // Update modification timestamp
      lastModified: new Date().toISOString()
    };
    
    const redis = validateRedisForCriticalOps('NFT metadata update');
    const key = getMetadataKey(contractAddress, tokenId);
    await redis.hset(key, updated);
    console.log(`✅ Updated metadata for ${contractAddress}:${tokenId}`);
  } catch (error) {
    console.error('❌ Error updating NFT metadata:', error);
    throw error;
  }
}

export async function listAllNFTMetadata(): Promise<NFTMetadata[]> {
  try {
    // This is complex with Redis - we'll implement a simple version
    // In a production system, you'd maintain a set of all NFT keys
    console.log('📋 Listing all NFT metadata (Redis implementation)');
    
    // For now, return empty array and implement this later if needed
    // The main use case is getting metadata by specific tokenId
    return [];
  } catch (error) {
    console.error('❌ Error listing NFT metadata:', error);
    return [];
  }
}

// NEW: Get NFTs by wallet address
export async function getNFTsByWallet(walletAddress: string): Promise<string[]> {
  try {
    const redis = validateRedisForCriticalOps('NFT wallet lookup');
    const walletKey = getWalletNFTsKey(walletAddress);
    const nftIds = await redis.smembers(walletKey);
    
    console.log(`📋 Found ${nftIds.length} NFTs for wallet ${walletAddress.slice(0, 10)}...`);
    return nftIds || [];
  } catch (error) {
    console.error('❌ Error getting NFTs by wallet:', error);
    return [];
  }
}

// Helper functions for common operations
export function createNFTMetadata(params: {
  contractAddress: string;
  tokenId: string;
  name: string;
  description: string;
  imageIpfsCid: string;
  metadataIpfsCid?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
  mintTransactionHash?: string;
  owner?: string;
  creatorWallet?: string; // NEW: Track who created it
}): NFTMetadata {
  return {
    contractAddress: params.contractAddress.toLowerCase(),
    tokenId: params.tokenId,
    name: params.name,
    description: params.description,
    image: `ipfs://${params.imageIpfsCid}`,
    imageIpfsCid: params.imageIpfsCid,
    metadataIpfsCid: params.metadataIpfsCid,
    attributes: params.attributes || [],
    createdAt: new Date().toISOString(),
    mintTransactionHash: params.mintTransactionHash,
    owner: params.owner,
    creatorWallet: params.creatorWallet,
    // Auto-generate unique ID to prevent cache conflicts
    uniqueCreationId: `meta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
}

// Utility to convert IPFS URLs to HTTP gateways
export function resolveIPFSUrl(ipfsUrl: string): string {
  if (ipfsUrl.startsWith('ipfs://')) {
    const cid = ipfsUrl.replace('ipfs://', '');
    // Try multiple gateways for redundancy
    const gateways = [
      `https://nftstorage.link/ipfs/${cid}`,
      `https://ipfs.io/ipfs/${cid}`,
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`
    ];
    
    // Return the first gateway for now
    // In production, you might want to implement gateway health checking
    return gateways[0];
  }
  
  return ipfsUrl;
}

// Enhanced IPFS URL resolution with fallback testing
export async function resolveIPFSUrlWithFallback(ipfsUrl: string): Promise<string> {
  if (!ipfsUrl.startsWith('ipfs://')) {
    return ipfsUrl;
  }
  
  const cid = ipfsUrl.replace('ipfs://', '');
  const gateways = [
    `https://nftstorage.link/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`
  ];
  
  // Try each gateway with timeout
  for (const gateway of gateways) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(gateway, { 
        method: 'HEAD', // Just check if resource exists
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`✅ IPFS gateway working: ${gateway}`);
        return gateway;
      }
    } catch (error) {
      console.log(`⚠️ IPFS gateway failed: ${gateway}`, error.message);
      continue;
    }
  }
  
  // If all gateways fail, return the first one as fallback
  console.log('⚠️ All IPFS gateways failed, using default');
  return gateways[0];
}

// MIGRATION FUNCTIONS - Added for metadata migration script

/**
 * Get all stored metadata for a specific contract
 */
export async function getAllStoredMetadata(contractAddress: string): Promise<NFTMetadata[]> {
  try {
    console.log(`🔍 Searching for all metadata for contract: ${contractAddress}`);
    
    // Since Redis doesn't have built-in pattern search in Upstash,
    // we'll use a different approach: maintain a set of all NFT keys
    const contractKey = `contract_nfts:${contractAddress.toLowerCase()}`;
    
    try {
      // Try to get from the tracking set first
      const tokenIds = await redis.smembers(contractKey);
      
      if (tokenIds && tokenIds.length > 0) {
        console.log(`📋 Found ${tokenIds.length} tracked tokens for contract`);
        
        const metadataList: NFTMetadata[] = [];
        for (const tokenId of tokenIds) {
          const metadata = await getNFTMetadata(contractAddress, tokenId);
          if (metadata) {
            metadataList.push(metadata);
          }
        }
        
        return metadataList;
      }
    } catch (trackingError) {
      console.log("⚠️ No tracking set found, will scan manually");
    }
    
    // Fallback: scan manually (this is expensive but works)
    console.log("🔍 Manual scan for metadata entries...");
    const metadataList: NFTMetadata[] = [];
    
    // Check tokens 0-999 (adjust range as needed)
    for (let i = 0; i < 1000; i++) {
      const metadata = await getNFTMetadata(contractAddress, i.toString());
      if (metadata) {
        metadataList.push(metadata);
        console.log(`✅ Found metadata for token ${i}`);
      }
    }
    
    console.log(`📊 Manual scan complete: found ${metadataList.length} metadata entries`);
    
    // Update the tracking set for future use
    if (metadataList.length > 0) {
      const tokenIds = metadataList.map(m => m.tokenId);
      await redis.sadd(contractKey, ...tokenIds);
      console.log(`✅ Updated tracking set for contract ${contractAddress}`);
    }
    
    return metadataList;
    
  } catch (error) {
    console.error('❌ Error getting all stored metadata:', error);
    return [];
  }
}

/**
 * Delete metadata for a specific token
 */
export async function deleteNFTMetadata(contractAddress: string, tokenId: string): Promise<boolean> {
  try {
    const key = getMetadataKey(contractAddress, tokenId);
    const walletKey = getWalletNFTsKey(contractAddress); // Wallet tracking key
    const contractKey = `contract_nfts:${contractAddress.toLowerCase()}`;
    
    console.log(`🗑️ Deleting metadata: ${key}`);
    
    // Delete the main metadata
    await redis.del(key);
    
    // Remove from wallet tracking (if exists)
    try {
      await redis.srem(walletKey, `${contractAddress}:${tokenId}`);
    } catch (walletError) {
      console.log("⚠️ No wallet tracking to clean up");
    }
    
    // Remove from contract tracking
    try {
      await redis.srem(contractKey, tokenId);
    } catch (contractError) {
      console.log("⚠️ No contract tracking to clean up");
    }
    
    console.log(`✅ Deleted metadata for ${contractAddress}:${tokenId}`);
    return true;
    
  } catch (error) {
    console.error('❌ Error deleting NFT metadata:', error);
    return false;
  }
}

/**
 * Move metadata from one tokenId to another
 */
export async function moveNFTMetadata(
  contractAddress: string, 
  fromTokenId: string, 
  toTokenId: string
): Promise<boolean> {
  try {
    console.log(`🔄 Moving metadata: ${fromTokenId} → ${toTokenId}`);
    
    // Get existing metadata
    const existingMetadata = await getNFTMetadata(contractAddress, fromTokenId);
    if (!existingMetadata) {
      throw new Error(`No metadata found for ${contractAddress}:${fromTokenId}`);
    }
    
    // Check if destination already has metadata
    const destinationMetadata = await getNFTMetadata(contractAddress, toTokenId);
    if (destinationMetadata) {
      console.log(`⚠️ Destination ${toTokenId} already has metadata, will overwrite`);
    }
    
    // Create new metadata with correct tokenId
    const correctedMetadata = {
      ...existingMetadata,
      tokenId: toTokenId,
      lastModified: new Date().toISOString(),
      migrationNote: `Migrated from tokenId ${fromTokenId} on ${new Date().toISOString()}`
    };
    
    // Store corrected metadata
    await storeNFTMetadata(correctedMetadata);
    
    // Verify it was stored
    const verification = await getNFTMetadata(contractAddress, toTokenId);
    if (!verification) {
      throw new Error('Failed to verify migrated metadata');
    }
    
    // Delete the old metadata
    await deleteNFTMetadata(contractAddress, fromTokenId);
    
    console.log(`✅ Successfully moved metadata: ${fromTokenId} → ${toTokenId}`);
    return true;
    
  } catch (error) {
    console.error('❌ Error moving NFT metadata:', error);
    return false;
  }
}

/**
 * Bulk migration utility
 */
export async function bulkMigrateMetadata(
  contractAddress: string,
  migrations: Array<{ from: string; to: string; action: 'move' | 'delete' }>
): Promise<{ successful: number; failed: Array<{ operation: any; error: string }> }> {
  const results = { successful: 0, failed: [] };
  
  console.log(`🚀 Starting bulk migration for ${migrations.length} operations`);
  
  for (const migration of migrations) {
    try {
      if (migration.action === 'move') {
        const success = await moveNFTMetadata(contractAddress, migration.from, migration.to);
        if (success) {
          results.successful++;
        } else {
          results.failed.push({ operation: migration, error: 'Move operation failed' });
        }
      } else if (migration.action === 'delete') {
        const success = await deleteNFTMetadata(contractAddress, migration.from);
        if (success) {
          results.successful++;
        } else {
          results.failed.push({ operation: migration, error: 'Delete operation failed' });
        }
      }
    } catch (error) {
      results.failed.push({ 
        operation: migration, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
  
  console.log(`✅ Bulk migration complete: ${results.successful} successful, ${results.failed.length} failed`);
  return results;
}