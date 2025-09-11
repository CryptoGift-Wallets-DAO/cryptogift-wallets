/**
 * ADMIN CLEANUP API
 * Programmatic cleanup of old transactions in Redis
 * Designed to be called by server-side cron jobs or external schedulers
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { cleanupOldTransactions } from '../../../lib/gaslessValidation';

// Types
interface CleanupResponse {
  success: boolean;
  message: string;
  cleaned?: number;
  error?: string;
}

// Initialize Redis client
let redis: any = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      enableAutoPipelining: false,
      retry: false,
    });
  }
} catch (error) {
  console.error('❌ Redis initialization failed for cleanup:', error);
}

// Authenticate admin requests
function authenticateAdmin(req: NextApiRequest): boolean {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.ADMIN_API_TOKEN;
  
  if (!expectedToken) {
    console.error('❌ ADMIN_API_TOKEN not configured');
    return false;
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.replace('Bearer ', '');
  return token === expectedToken;
}

// Manual cleanup for expired Redis keys
async function performRedisCleanup(): Promise<{ cleaned: number; message: string }> {
  if (!redis) {
    throw new Error('Redis not available for cleanup');
  }
  
  let cleaned = 0;
  const cutoffTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
  
  try {
    // Get all transaction attempt keys
    const keys = await redis.keys('tx_attempt:*');
    
    for (const key of keys) {
      try {
        const data = await redis.get(key);
        if (data && typeof data === 'string') {
          const attempt = JSON.parse(data);
          if (attempt.timestamp < cutoffTime) {
            await redis.del(key);
            cleaned++;
          }
        }
      } catch (keyError) {
        console.warn(`⚠️ Error processing key ${key}:`, keyError);
      }
    }
    
    // Clean up completed and failed transaction records
    const completedKeys = await redis.keys('tx_completed:*');
    const failedKeys = await redis.keys('tx_failed:*');
    
    for (const key of [...completedKeys, ...failedKeys]) {
      try {
        const data = await redis.get(key);
        if (data && typeof data === 'string') {
          const record = JSON.parse(data);
          if (record.timestamp < cutoffTime) {
            await redis.del(key);
            cleaned++;
          }
        }
      } catch (keyError) {
        console.warn(`⚠️ Error processing record ${key}:`, keyError);
      }
    }
    
    return {
      cleaned,
      message: `Cleaned up ${cleaned} expired transaction records from Redis`
    };
    
  } catch (error) {
    console.error('❌ Redis cleanup failed:', error);
    throw new Error(`Redis cleanup failed: ${error.message}`);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CleanupResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }
  
  try {
    // Authenticate admin request
    if (!authenticateAdmin(req)) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Admin token required.'
      });
    }
    
    console.log('🧹 ADMIN CLEANUP: Starting transaction cleanup...');
    
    // Check Redis availability
    if (!redis) {
      return res.status(500).json({
        success: false,
        message: 'Redis not available for cleanup'
      });
    }
    
    // Perform cleanup
    const result = await performRedisCleanup();
    
    // Also call the gasless validation cleanup (which now handles Redis TTL)
    await cleanupOldTransactions();
    
    console.log('✅ ADMIN CLEANUP: Completed successfully:', result);
    
    return res.status(200).json({
      success: true,
      message: result.message,
      cleaned: result.cleaned
    });
    
  } catch (error: any) {
    console.error('💥 ADMIN CLEANUP ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Cleanup failed',
      error: error.message
    });
  }
}