/**
 * Push Notification Test API
 * Sends a test notification to subscribed device
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRedisConnection } from '@/lib/redis/redisConfig';
import webpush from 'web-push';
import type { PushSubscription, PushNotification } from '@/lib/push/config';

// Configure web-push with VAPID (server-side only)
const vapidPublicKey = process.env.NEXT_PUBLIC_WEBPUSH_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.WEBPUSH_PRIVATE_KEY || '';
const vapidSubject = `mailto:${process.env.NEXT_PUBLIC_WEBPUSH_SENDER_EMAIL || 'support@cryptogift-wallets.com'}`;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export async function POST(request: NextRequest) {
  try {
    // Check if push is enabled
    if (process.env.NEXT_PUBLIC_FEATURE_WEBPUSH !== 'on') {
      return NextResponse.json(
        { error: 'Push notifications are disabled' },
        { status: 503 }
      );
    }
    
    // Check VAPID configuration
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { error: 'Push service not configured' },
        { status: 503 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { address } = body;
    
    // Get user agent hash
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const userAgentHash = await hashUserAgent(userAgent);
    
    // Get subscription from Redis/KV
    const redis = await getRedisConnection();
    const key = `push:subscription:${userAgentHash}`;
    const subscriptionData = await redis.get(key);
    
    if (!subscriptionData) {
      return NextResponse.json(
        { error: 'No push subscription found for this device' },
        { status: 404 }
      );
    }
    
    const subscription: PushSubscription = JSON.parse(subscriptionData);
    
    // Create test notification
    const notification: PushNotification = {
      title: '🎉 Test Notification',
      body: 'Your push notifications are working! This is a test from CryptoGift Wallets.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'test-notification',
      data: {
        type: 'test',
        timestamp: Date.now(),
        address: address || 'unknown',
      },
      actions: [
        {
          action: 'view',
          title: 'View',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
        },
      ],
      requireInteraction: false,
      category: 'system',
    };
    
    // Send notification
    try {
      const result = await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        },
        JSON.stringify(notification),
        {
          TTL: 60 * 60, // 1 hour TTL
        }
      );
      
      console.log('[Push] Test notification sent:', {
        status: result.statusCode,
        endpoint: subscription.endpoint.substring(0, 50) + '...',
      });
      
      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully',
        status: result.statusCode,
      });
    } catch (sendError: any) {
      console.error('[Push] Send error:', sendError);
      
      // Handle subscription expiry
      if (sendError.statusCode === 410) {
        // Remove expired subscription
        await redis.del(key);
        
        return NextResponse.json(
          { error: 'Push subscription has expired. Please re-subscribe.' },
          { status: 410 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to send notification: ' + sendError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Push] Test error:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' },
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