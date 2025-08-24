/**
 * Push Protocol Feeds API
 * Get user notifications from Push Protocol
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPushProtocolClient, formatCAIP10Address } from '@/lib/push-protocol/client';
import { isPushProtocolEnabled } from '@/lib/push-protocol/config';

export async function GET(request: NextRequest) {
  try {
    // Check if Push Protocol is enabled
    if (!isPushProtocolEnabled()) {
      return NextResponse.json(
        { error: 'Push Protocol is disabled' },
        { status: 503 }
      );
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }
    
    // Get Push Protocol client
    const client = getPushProtocolClient();
    
    // Format address for Push Protocol
    const caip10Address = formatCAIP10Address(address);
    
    // Fetch feeds
    const feeds = await client.getFeeds(caip10Address, page, limit);
    
    // Format response
    const formattedFeeds = feeds.map((feed: any) => ({
      id: feed.sid || feed.payload_id,
      title: feed.notification?.title || feed.title,
      body: feed.notification?.body || feed.message,
      app: feed.app || 'CryptoGift Staging',
      icon: feed.icon || '/icons/icon-192x192.png',
      url: feed.cta || '/',
      timestamp: feed.epoch || Date.now(),
      category: feed.notification_category || 'system',
    }));
    
    console.log('[Push Protocol] Feeds fetched:', {
      address: address.slice(0, 10) + '...',
      count: formattedFeeds.length,
      page,
    });
    
    return NextResponse.json({
      success: true,
      feeds: formattedFeeds,
      pagination: {
        page,
        limit,
        hasMore: feeds.length === limit,
      },
    });
  } catch (error) {
    console.error('[Push Protocol] Feeds error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feeds' },
      { status: 500 }
    );
  }
}