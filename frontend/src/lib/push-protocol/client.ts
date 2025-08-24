/**
 * Push Protocol Client
 * Handles communication with Push Protocol APIs
 * NOTE: Using REST API directly until SDK installation completes
 */

import { getPushProtocolConfig, type PushNotification, NOTIFICATION_TYPE } from './config';

/**
 * Push Protocol API client (REST implementation)
 * Will be replaced with @pushprotocol/restapi SDK when installed
 */
export class PushProtocolClient {
  private config = getPushProtocolConfig();
  
  /**
   * Check if user is subscribed to channel
   */
  async isSubscribed(userAddress: string, channelAddress: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/v1/users/${userAddress}/subscriptions`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      const subscriptions = data.subscriptions || [];
      
      return subscriptions.some(
        (sub: any) => sub.channel.toLowerCase() === channelAddress.toLowerCase()
      );
    } catch (error) {
      console.error('[Push Protocol] Failed to check subscription:', error);
      return false;
    }
  }
  
  /**
   * Subscribe to channel (gasless via signature)
   * In production, this will use EIP-712 signature
   */
  async subscribe(
    userAddress: string,
    channelAddress: string,
    signer?: any
  ): Promise<boolean> {
    try {
      // Mock implementation for staging
      // Real implementation will use:
      // await PushAPI.channels.subscribe({
      //   signer,
      //   channelAddress,
      //   userAddress,
      //   env: this.config.env,
      // });
      
      console.log('[Push Protocol] Subscribe request:', {
        user: userAddress,
        channel: channelAddress,
        env: this.config.env,
      });
      
      // Simulate subscription (staging mode)
      if (this.config.env === 'staging') {
        await this.mockDelay();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[Push Protocol] Subscribe failed:', error);
      return false;
    }
  }
  
  /**
   * Unsubscribe from channel
   */
  async unsubscribe(
    userAddress: string,
    channelAddress: string,
    signer?: any
  ): Promise<boolean> {
    try {
      // Mock implementation for staging
      console.log('[Push Protocol] Unsubscribe request:', {
        user: userAddress,
        channel: channelAddress,
        env: this.config.env,
      });
      
      if (this.config.env === 'staging') {
        await this.mockDelay();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[Push Protocol] Unsubscribe failed:', error);
      return false;
    }
  }
  
  /**
   * Get user notifications/feeds
   */
  async getFeeds(userAddress: string, page: number = 1, limit: number = 20): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/v1/users/${userAddress}/feeds?page=${page}&limit=${limit}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      return data.feeds || [];
    } catch (error) {
      console.error('[Push Protocol] Failed to fetch feeds:', error);
      return [];
    }
  }
  
  /**
   * Send notification (requires channel owner signature)
   */
  async sendNotification(
    notification: PushNotification,
    channelSigner?: any
  ): Promise<boolean> {
    try {
      // Mock implementation for staging
      console.log('[Push Protocol] Send notification:', {
        ...notification,
        env: this.config.env,
      });
      
      // In production, this will use:
      // await PushAPI.payloads.sendNotification({
      //   signer: channelSigner,
      //   type: notification.type,
      //   identityType: 2, // Direct payload
      //   notification: {
      //     title: notification.title,
      //     body: notification.body,
      //   },
      //   payload: {
      //     title: notification.title,
      //     body: notification.body,
      //     cta: notification.cta,
      //     img: notification.img,
      //   },
      //   recipients: notification.recipients,
      //   channel: channelAddress,
      //   env: this.config.env,
      // });
      
      if (this.config.env === 'staging') {
        await this.mockDelay(2000);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[Push Protocol] Failed to send notification:', error);
      return false;
    }
  }
  
  /**
   * Get channel details
   */
  async getChannelDetails(channelAddress: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/v1/channels/${channelAddress}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('[Push Protocol] Failed to get channel details:', error);
      return null;
    }
  }
  
  /**
   * Mock delay for staging environment
   */
  private mockDelay(ms: number = 1000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let clientInstance: PushProtocolClient | null = null;

/**
 * Get Push Protocol client instance
 */
export function getPushProtocolClient(): PushProtocolClient {
  if (!clientInstance) {
    clientInstance = new PushProtocolClient();
  }
  return clientInstance;
}

/**
 * Format address for Push Protocol (CAIP-10 format)
 * Format: eip155:chainId:address
 */
export function formatCAIP10Address(address: string, chainId?: number): string {
  const config = getPushProtocolConfig();
  const chain = chainId || config.chainId;
  return `eip155:${chain}:${address}`;
}

/**
 * Parse CAIP-10 address
 */
export function parseCAIP10Address(caip10: string): {
  namespace: string;
  chainId: number;
  address: string;
} {
  const parts = caip10.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid CAIP-10 address format');
  }
  
  return {
    namespace: parts[0],
    chainId: parseInt(parts[1]),
    address: parts[2],
  };
}