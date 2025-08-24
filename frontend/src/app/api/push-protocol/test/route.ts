/**
 * Push Protocol Test Notification API
 * Send test notification from staging channel
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getPushProtocolClient,
  formatCAIP10Address 
} from '@/lib/push-protocol/client';
import { 
  isPushProtocolEnabled,
  getChannelAddress,
  NOTIFICATION_TYPE,
  type PushNotification 
} from '@/lib/push-protocol/config';

// Mock KMS signer for staging
// In production, this will use AWS KMS or similar
class MockChannelSigner {
  async getAddress() {
    return getChannelAddress();
  }
  
  async signMessage(message: string) {
    // Mock signature for staging
    return '0x' + '00'.repeat(65);
  }
}

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
    const { address, type = 'test' } = body;
    
    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }
    
    // Get Push Protocol client
    const client = getPushProtocolClient();
    
    // Format recipient address
    const recipientCAIP = formatCAIP10Address(address);
    
    // Create test notification based on type
    let notification: PushNotification;
    
    switch (type) {
      case 'transaction':
        notification = {
          title: '💰 Test Transaction',
          body: 'You received 0.1 ETH (staging test)',
          cta: 'https://cryptogift-wallets.vercel.app/wallet/activity',
          type: NOTIFICATION_TYPE.TARGETED,
          recipients: recipientCAIP,
        };
        break;
        
      case 'security':
        notification = {
          title: '🔒 Security Alert',
          body: 'New approval detected (staging test)',
          cta: 'https://cryptogift-wallets.vercel.app/wallet/security',
          type: NOTIFICATION_TYPE.TARGETED,
          recipients: recipientCAIP,
        };
        break;
        
      case 'gift':
        notification = {
          title: '🎁 Gift Received',
          body: 'You have a new CryptoGift! (staging test)',
          cta: 'https://cryptogift-wallets.vercel.app/my-wallets',
          type: NOTIFICATION_TYPE.TARGETED,
          recipients: recipientCAIP,
        };
        break;
        
      default:
        notification = {
          title: '🔔 Test Notification',
          body: 'This is a test notification from CryptoGift Staging channel',
          cta: 'https://cryptogift-wallets.vercel.app',
          type: NOTIFICATION_TYPE.TARGETED,
          recipients: recipientCAIP,
        };
    }
    
    // Get channel signer (mock for staging)
    const signer = new MockChannelSigner();
    
    // Send notification
    const success = await client.sendNotification(notification, signer);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to send test notification' },
        { status: 500 }
      );
    }
    
    console.log('[Push Protocol] Test notification sent:', {
      type,
      recipient: address.slice(0, 10) + '...',
      title: notification.title,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Test notification sent successfully',
      notification: {
        title: notification.title,
        body: notification.body,
        recipient: address,
      },
    });
  } catch (error) {
    console.error('[Push Protocol] Test error:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
}