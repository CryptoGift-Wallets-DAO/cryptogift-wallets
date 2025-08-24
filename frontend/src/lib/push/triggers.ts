/**
 * Push Notification Triggers
 * Operational event handlers that trigger push notifications
 */

import type { PushCategory } from './config';

interface NotificationTrigger {
  address?: string;
  title: string;
  body: string;
  category: PushCategory;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

/**
 * Send push notification via internal API
 */
async function sendNotification(trigger: NotificationTrigger): Promise<boolean> {
  try {
    // Check if push is enabled
    if (process.env.NEXT_PUBLIC_FEATURE_WEBPUSH !== 'on') {
      return false;
    }
    
    const response = await fetch('/api/push/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': process.env.ADMIN_API_TOKEN || '',
      },
      body: JSON.stringify(trigger),
    });
    
    if (!response.ok) {
      console.error('[Push Trigger] Failed to send notification:', await response.text());
      return false;
    }
    
    const result = await response.json();
    console.log('[Push Trigger] Notification sent:', result);
    return result.success;
  } catch (error) {
    console.error('[Push Trigger] Error sending notification:', error);
    return false;
  }
}

/**
 * Transaction received trigger
 */
export async function notifyTransactionReceived(
  address: string,
  amount: string,
  token: string,
  txHash: string
): Promise<boolean> {
  return sendNotification({
    address,
    title: '💰 Funds Received',
    body: `You received ${amount} ${token}`,
    category: 'transaction',
    data: {
      type: 'receive',
      amount,
      token,
      transactionHash: txHash,
      url: `/wallet/transaction/${txHash}`,
    },
    actions: [
      {
        action: 'view',
        title: 'View Transaction',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  });
}

/**
 * Transaction sent trigger
 */
export async function notifyTransactionSent(
  address: string,
  amount: string,
  token: string,
  txHash: string
): Promise<boolean> {
  return sendNotification({
    address,
    title: '📤 Transaction Sent',
    body: `Successfully sent ${amount} ${token}`,
    category: 'transaction',
    data: {
      type: 'send',
      amount,
      token,
      transactionHash: txHash,
      url: `/wallet/transaction/${txHash}`,
    },
    actions: [
      {
        action: 'view',
        title: 'View Details',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  });
}

/**
 * Swap completed trigger
 */
export async function notifySwapCompleted(
  address: string,
  fromAmount: string,
  fromToken: string,
  toAmount: string,
  toToken: string,
  txHash: string
): Promise<boolean> {
  return sendNotification({
    address,
    title: '🔄 Swap Completed',
    body: `Swapped ${fromAmount} ${fromToken} for ${toAmount} ${toToken}`,
    category: 'transaction',
    data: {
      type: 'swap',
      fromAmount,
      fromToken,
      toAmount,
      toToken,
      transactionHash: txHash,
      url: `/wallet/transaction/${txHash}`,
    },
    actions: [
      {
        action: 'view',
        title: 'View Swap',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  });
}

/**
 * Security alert trigger
 */
export async function notifySecurityAlert(
  address: string,
  alertType: 'approval' | 'allowance' | 'suspicious',
  details: string
): Promise<boolean> {
  const titles = {
    approval: '⚠️ New Approval Detected',
    allowance: '⚠️ Token Allowance Changed',
    suspicious: '🚨 Suspicious Activity',
  };
  
  return sendNotification({
    address,
    title: titles[alertType],
    body: details,
    category: 'security',
    data: {
      type: alertType,
      url: '/wallet/security',
    },
    actions: [
      {
        action: 'review',
        title: 'Review Now',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  });
}

/**
 * Gift received trigger
 */
export async function notifyGiftReceived(
  address: string,
  tokenId: string,
  message?: string
): Promise<boolean> {
  return sendNotification({
    address,
    title: '🎁 Gift Received!',
    body: message || 'You have received a new CryptoGift',
    category: 'claim',
    data: {
      type: 'gift_received',
      tokenId,
      url: `/gift/claim/${tokenId}`,
    },
    actions: [
      {
        action: 'claim',
        title: 'Claim Now',
      },
      {
        action: 'dismiss',
        title: 'Later',
      },
    ],
  });
}

/**
 * Gift about to expire trigger
 */
export async function notifyGiftExpiring(
  address: string,
  tokenId: string,
  hoursLeft: number
): Promise<boolean> {
  return sendNotification({
    address,
    title: '⏰ Gift Expiring Soon',
    body: `Your gift expires in ${hoursLeft} hours. Claim it now!`,
    category: 'claim',
    data: {
      type: 'gift_expiring',
      tokenId,
      hoursLeft,
      url: `/gift/claim/${tokenId}`,
    },
    actions: [
      {
        action: 'claim',
        title: 'Claim Now',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  });
}

/**
 * System update trigger
 */
export async function notifySystemUpdate(
  title: string,
  message: string,
  url?: string
): Promise<boolean> {
  return sendNotification({
    title: `📢 ${title}`,
    body: message,
    category: 'system',
    data: {
      type: 'system_update',
      url: url || '/',
    },
    actions: [
      {
        action: 'view',
        title: 'Learn More',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  });
}

/**
 * Batch notification for multiple events
 */
export async function notifyBatch(
  address: string,
  events: Array<{
    title: string;
    body: string;
    category: PushCategory;
    data?: any;
  }>
): Promise<boolean[]> {
  const results = await Promise.all(
    events.map(event =>
      sendNotification({
        address,
        ...event,
      })
    )
  );
  
  return results;
}