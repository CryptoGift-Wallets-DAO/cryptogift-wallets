/**
 * Push Notification Subscribe API
 * Stores push subscription in Redis/KV
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRedisConnection } from '@/lib/redisConfig';
import type { PushSubscription } from '@/lib/push/config';

export async function POST(request: NextRequest) {
  try {
    // Check if push is enabled
    if (process.env.NEXT_PUBLIC_FEATURE_WEBPUSH !== 'on') {
      return NextResponse.json(
        { error: 'Push notifications are disabled' },
        { status: 503 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { subscription, address, categories } = body;
    
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }
    
    // Get user agent for device identification
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const userAgentHash = await hashUserAgent(userAgent);
    
    // Create subscription record
    const pushSubscription: PushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      address: address || null,
      userAgent: userAgentHash,
      createdAt: Date.now(),
      categories: categories || ['transaction', 'security', 'claim'],
    };
    
    // Store in Redis/KV
    const redis = await getRedisConnection();
    const key = `push:subscription:${userAgentHash}`;
    
    // Store with 30 day expiry (renew on each visit)
    await redis.setex(key, 30 * 24 * 60 * 60, JSON.stringify(pushSubscription));
    
    // Also store by address if provided
    if (address) {
      const addressKey = `push:address:${address.toLowerCase()}`;
      const existingSubs = await redis.get(addressKey);
      const subs = existingSubs ? JSON.parse(existingSubs as string) : [];
      
      // Add this subscription if not already present
      if (!subs.includes(userAgentHash)) {
        subs.push(userAgentHash);
        await redis.setex(addressKey, 30 * 24 * 60 * 60, JSON.stringify(subs));
      }
    }
    
    // Log subscription (no PII)
    console.log('[Push] Subscription stored:', {
      endpoint: subscription.endpoint.substring(0, 50) + '...',
      address: address ? address.substring(0, 10) + '...' : 'none',
      categories: pushSubscription.categories,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Push subscription stored successfully',
    });
  } catch (error) {
    console.error('[Push] Subscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to store subscription' },
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
  return hashHex.substring(0, 16); // Use first 16 chars
}