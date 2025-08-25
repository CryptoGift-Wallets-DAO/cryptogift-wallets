/**
 * Push Notification Unsubscribe API
 * Removes push subscription from Redis/KV
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRedisConnection } from '@/lib/redisConfig';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { endpoint, address } = body;
    
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }
    
    // Get user agent hash
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const userAgentHash = await hashUserAgent(userAgent);
    
    // Remove from Redis/KV
    const redis = await getRedisConnection();
    const key = `push:subscription:${userAgentHash}`;
    
    await redis.del(key);
    
    // Also remove from address list if provided
    if (address) {
      const addressKey = `push:address:${address.toLowerCase()}`;
      const existingSubs = await redis.get(addressKey);
      
      if (existingSubs) {
        const subs = JSON.parse(existingSubs as string);
        const filtered = subs.filter((hash: string) => hash !== userAgentHash);
        
        if (filtered.length > 0) {
          await redis.setex(addressKey, 30 * 24 * 60 * 60, JSON.stringify(filtered));
        } else {
          await redis.del(addressKey);
        }
      }
    }
    
    console.log('[Push] Subscription removed:', {
      endpoint: endpoint.substring(0, 50) + '...',
      address: address ? address.substring(0, 10) + '...' : 'none',
    });
    
    return NextResponse.json({
      success: true,
      message: 'Push subscription removed successfully',
    });
  } catch (error) {
    console.error('[Push] Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    );
  }
}

/**
 * Hash user agent for privacy
 */
async function hashUserAgent(userAgent: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(userAgent);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16);
}