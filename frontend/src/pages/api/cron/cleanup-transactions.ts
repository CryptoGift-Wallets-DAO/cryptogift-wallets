/**
 * CRON CLEANUP API
 * Automated cleanup of old transactions called by Vercel Cron Jobs
 * Runs periodically to maintain Redis hygiene
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { cleanupOldTransactions } from '../../../lib/gaslessValidation';

// Types
interface CronCleanupResponse {
  success: boolean;
  message: string;
  cleaned?: number;
  timestamp: string;
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
  console.error('❌ Redis initialization failed for cron cleanup:', error);
}

// Authenticate cron requests
function authenticateCron(req: NextApiRequest): boolean {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.error('❌ CRON_SECRET not configured');
    return false;
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.replace('Bearer ', '');
  return token === cronSecret;
}

// Lightweight cleanup for cron jobs
async function performCronCleanup(): Promise<{ cleaned: number; message: string }> {
  if (!redis) {
    return { cleaned: 0, message: 'Redis not available - relying on TTL for cleanup' };
  }
  
  let cleaned = 0;
  const cutoffTime = Date.now() - (6 * 60 * 60 * 1000); // 6 hours ago
  
  try {
    // Clean up very old pending transactions that might be stuck
    const pendingKeys = await redis.keys('tx_attempt:*');
    
    for (const key of pendingKeys.slice(0, 100)) { // Limit to 100 keys per cron run
      try {
        const data = await redis.get(key);
        if (data && typeof data === 'string') {
          const attempt = JSON.parse(data);
          if (attempt.status === 'pending' && attempt.timestamp < cutoffTime) {
            await redis.del(key);
            cleaned++;
          }
        }
      } catch (keyError) {
        console.warn(`⚠️ Error processing key ${key}:`, keyError);
      }
    }
    
    return {
      cleaned,
      message: `Cron cleanup: ${cleaned} stuck pending transactions removed`
    };
    
  } catch (error) {
    console.error('❌ Cron cleanup failed:', error);
    return { cleaned: 0, message: `Cron cleanup failed: ${error.message}` };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CronCleanupResponse>
) {
  // Only allow GET requests for cron jobs
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed',
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    // Authenticate cron request
    if (!authenticateCron(req)) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Cron secret required.',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('🕐 CRON CLEANUP: Starting automated transaction cleanup...');
    
    // Perform lightweight cleanup
    const result = await performCronCleanup();
    
    // Also call the gasless validation cleanup
    await cleanupOldTransactions();
    
    console.log('✅ CRON CLEANUP: Completed successfully:', result);
    
    return res.status(200).json({
      success: true,
      message: result.message,
      cleaned: result.cleaned,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('💥 CRON CLEANUP ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Cron cleanup failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}