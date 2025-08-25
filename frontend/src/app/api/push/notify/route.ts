/**
 * Push Notification Send API
 * Sends notifications to subscribed devices
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRedisConnection } from '@/lib/redisConfig';
import webpush from 'web-push';
import type { PushSubscription, PushNotification, PushCategory } from '@/lib/push/config';

// Configure web-push
const vapidPublicKey = process.env.NEXT_PUBLIC_WEBPUSH_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.WEBPUSH_PRIVATE_KEY || '';
const vapidSubject = `mailto:${process.env.NEXT_PUBLIC_WEBPUSH_SENDER_EMAIL || 'support@cryptogift-wallets.com'}`;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin token for security
    const token = request.headers.get('x-admin-token');
    if (token !== process.env.ADMIN_API_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { 
      address, 
      title, 
      body: notificationBody, 
      category = 'system',
      data,
      actions,
    } = body;
    
    if (!title || !notificationBody) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }
    
    // Get subscriptions for address
    const redis = await getRedisConnection();
    const subscriptions: PushSubscription[] = [];
    
    if (address) {
      // Get subscriptions for specific address
      const addressKey = `push:address:${address.toLowerCase()}`;
      const subHashes = await redis.get(addressKey);
      
      if (subHashes) {
        const hashes = JSON.parse(subHashes as string);
        for (const hash of hashes) {
          const subData = await redis.get(`push:subscription:${hash}`);
          if (subData) {
            subscriptions.push(JSON.parse(subData as string));
          }
        }
      }
    } else {
      // Broadcast to all (admin only)
      const keys = await redis.keys('push:subscription:*');
      for (const key of keys) {
        const subData = await redis.get(key);
        if (subData) {
          subscriptions.push(JSON.parse(subData as string));
        }
      }
    }
    
    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No subscriptions found',
        sent: 0,
      });
    }
    
    // Create notification
    const notification: PushNotification = {
      title,
      body: notificationBody,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: {
        ...data,
        timestamp: Date.now(),
        category,
      },
      actions: actions || [],
      requireInteraction: category === 'security',
      category: category as PushCategory,
    };
    
    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        // Check if category is enabled for this subscription
        if (!sub.categories.includes(category)) {
          return { skipped: true };
        }
        
        try {
          const result = await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            JSON.stringify(notification),
            {
              TTL: 24 * 60 * 60, // 24 hour TTL
            }
          );
          
          return { success: true, status: result.statusCode };
        } catch (error: any) {
          // Handle expired subscriptions
          if (error.statusCode === 410) {
            // Remove expired subscription
            await redis.del(`push:subscription:${sub.userAgent}`);
          }
          
          return { success: false, error: error.message };
        }
      })
    );
    
    // Count results
    const sent = results.filter(r => 
      r.status === 'fulfilled' && r.value.success
    ).length;
    
    const failed = results.filter(r => 
      r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
    ).length;
    
    const skipped = results.filter(r => 
      r.status === 'fulfilled' && r.value.skipped
    ).length;
    
    console.log('[Push] Notifications sent:', {
      total: subscriptions.length,
      sent,
      failed,
      skipped,
      category,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Notifications sent',
      sent,
      failed,
      skipped,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error('[Push] Notify error:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    );
  }
}