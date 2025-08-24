/**
 * Push Protocol Subscribe API
 * Handle gasless opt-in via signature
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getPushProtocolClient, 
  formatCAIP10Address 
} from '@/lib/push-protocol/client';
import { 
  isPushProtocolEnabled, 
  getChannelAddress 
} from '@/lib/push-protocol/config';

export async function POST(request: NextRequest) {
  try {
    // Check if Push Protocol is enabled
    if (!isPushProtocolEnabled()) {
      return NextResponse.json(
        { error: 'Push Protocol is disabled' },
        { status: 503 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { address, action = 'subscribe', signature } = body;
    
    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }
    
    // Get Push Protocol client
    const client = getPushProtocolClient();
    
    // Get channel address
    const channelAddress = getChannelAddress();
    
    // Format addresses for Push Protocol
    const userCAIP = formatCAIP10Address(address);
    const channelCAIP = formatCAIP10Address(channelAddress);
    
    // Check current subscription status
    const isSubscribed = await client.isSubscribed(userCAIP, channelCAIP);
    
    let success = false;
    let message = '';
    
    if (action === 'subscribe') {
      if (isSubscribed) {
        return NextResponse.json({
          success: true,
          message: 'Already subscribed',
          subscribed: true,
        });
      }
      
      // Subscribe (gasless via signature)
      // In production, signature will be EIP-712 signed message
      success = await client.subscribe(userCAIP, channelCAIP);
      message = success ? 'Successfully subscribed' : 'Failed to subscribe';
    } else if (action === 'unsubscribe') {
      if (!isSubscribed) {
        return NextResponse.json({
          success: true,
          message: 'Not subscribed',
          subscribed: false,
        });
      }
      
      // Unsubscribe
      success = await client.unsubscribe(userCAIP, channelCAIP);
      message = success ? 'Successfully unsubscribed' : 'Failed to unsubscribe';
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "subscribe" or "unsubscribe"' },
        { status: 400 }
      );
    }
    
    // Log action
    console.log('[Push Protocol] Subscription action:', {
      action,
      address: address.slice(0, 10) + '...',
      channel: channelAddress.slice(0, 10) + '...',
      success,
    });
    
    return NextResponse.json({
      success,
      message,
      subscribed: action === 'subscribe' ? success : !success,
      channel: {
        address: channelAddress,
        name: 'CryptoGift Staging',
      },
    });
  } catch (error) {
    console.error('[Push Protocol] Subscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to process subscription' },
      { status: 500 }
    );
  }
}

/**
 * Get subscription status
 */
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
    
    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }
    
    // Get Push Protocol client
    const client = getPushProtocolClient();
    
    // Get channel address
    const channelAddress = getChannelAddress();
    
    // Format addresses
    const userCAIP = formatCAIP10Address(address);
    const channelCAIP = formatCAIP10Address(channelAddress);
    
    // Check subscription status
    const isSubscribed = await client.isSubscribed(userCAIP, channelCAIP);
    
    return NextResponse.json({
      success: true,
      subscribed: isSubscribed,
      channel: {
        address: channelAddress,
        name: 'CryptoGift Staging',
      },
    });
  } catch (error) {
    console.error('[Push Protocol] Status error:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription status' },
      { status: 500 }
    );
  }
}