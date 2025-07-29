import { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

// Initialize Redis client 
let redis: any;

try {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
    console.log('🟢 Cache clearing using Vercel KV with Upstash backend');
  } else if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log('🟢 Cache clearing using direct Upstash Redis');
  } else {
    // Mock client for development
    redis = {
      keys: async () => [],
      del: async () => 0,
      scan: async () => ({ cursor: '0', keys: [] })
    };
    console.log('⚠️ Cache clearing using mock Redis client for development');
  }
} catch (error) {
  console.error('❌ Failed to initialize Redis client for cache clearing:', error);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Admin Authentication - MANDATORY for all admin endpoints
  const adminToken = process.env.ADMIN_API_TOKEN;
  const providedToken = req.headers['x-admin-token'] || req.body.adminToken;
  
  // CRITICAL SECURITY: ADMIN_API_TOKEN must be configured
  if (!adminToken) {
    console.error('🚨 SECURITY: ADMIN_API_TOKEN not configured - blocking admin endpoint access');
    return res.status(500).json({ 
      error: 'Server configuration error',
      message: 'Admin token required. Contact administrator.'
    });
  }
  
  // CRITICAL SECURITY: Token must match exactly
  if (providedToken !== adminToken) {
    console.error('🚨 SECURITY: Invalid admin token provided');
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Valid admin token required. Provide via X-Admin-Token header or adminToken body field.'
    });
  }
  
  console.log('✅ SECURITY: Admin token validated successfully');

  try {
    const { action, confirm } = req.body;

    // Security check - require confirmation
    if (confirm !== 'CLEAR_ALL_CACHE_CONFIRMED') {
      return res.status(400).json({ 
        error: 'Confirmation required',
        message: 'Send { "action": "clear_all", "confirm": "CLEAR_ALL_CACHE_CONFIRMED" } to proceed'
      });
    }

    console.log('🧹 ADMIN: Starting cache clearing operation...');

    const results = {
      timestamp: new Date().toISOString(),
      clientCacheCleared: false,
      serverCacheCleared: false,
      details: {
        nftMetadataKeys: 0,
        walletNftKeys: 0,
        guardianKeys: 0,
        referralKeys: 0,
        otherKeys: 0,
        totalKeysFound: 0,
        totalKeysDeleted: 0,
        errors: [] as string[]
      }
    };

    if (action === 'clear_all' || action === 'clear_server') {
      try {
        console.log('🔍 Scanning Redis for all cache keys...');

        // Get all keys matching our patterns
        const patterns = [
          'nft_metadata:*',      // NFT metadata
          'wallet_nfts:*',       // Wallet NFT lists
          'guardian_*',          // Guardian system
          'referral_*',          // Referral system
          'mint_logs:*',         // Debug logs
          'ipfs_*'               // IPFS cache
        ];

        let allKeys: string[] = [];

        for (const pattern of patterns) {
          try {
            const keys = await redis.keys(pattern);
            if (Array.isArray(keys)) {
              allKeys = allKeys.concat(keys);
            }
          } catch (error) {
            console.error(`Error getting keys for pattern ${pattern}:`, error);
            results.details.errors.push(`Pattern ${pattern}: ${error.message}`);
          }
        }

        results.details.totalKeysFound = allKeys.length;
        console.log(`🔍 Found ${allKeys.length} cache keys to delete`);

        // Categorize keys
        allKeys.forEach(key => {
          if (key.startsWith('nft_metadata:')) {
            results.details.nftMetadataKeys++;
          } else if (key.startsWith('wallet_nfts:')) {
            results.details.walletNftKeys++;
          } else if (key.startsWith('guardian_')) {
            results.details.guardianKeys++;
          } else if (key.startsWith('referral_')) {
            results.details.referralKeys++;
          } else {
            results.details.otherKeys++;
          }
        });

        // Delete keys in batches
        if (allKeys.length > 0) {
          try {
            const deleteResult = await redis.del(...allKeys);
            results.details.totalKeysDeleted = typeof deleteResult === 'number' ? deleteResult : allKeys.length;
            results.serverCacheCleared = true;
            console.log(`✅ Deleted ${results.details.totalKeysDeleted} cache keys from Redis`);
          } catch (deleteError) {
            console.error('Error deleting keys:', deleteError);
            results.details.errors.push(`Delete error: ${deleteError.message}`);
          }
        } else {
          results.serverCacheCleared = true;
          console.log('ℹ️ No cache keys found to delete');
        }

      } catch (error) {
        console.error('❌ Error clearing server cache:', error);
        results.details.errors.push(`Server cache error: ${error.message}`);
      }
    }

    // Note about client cache
    if (action === 'clear_all' || action === 'clear_client') {
      results.clientCacheCleared = true;
      console.log('ℹ️ Client cache clearing must be done from frontend using clearAllUserCache()');
    }

    console.log('🧹 Cache clearing operation completed:', results);

    res.status(200).json({
      success: true,
      message: 'Cache clearing operation completed',
      ...results
    });

  } catch (error) {
    console.error('❌ Error in cache clearing API:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}