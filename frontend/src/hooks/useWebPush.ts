/**
 * React Hook for Web Push Notifications
 * Handles subscription management and permission requests
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import {
  getPushConfig,
  isPushSupported,
  isIOS,
  isIOSPWAInstalled,
  urlBase64ToUint8Array,
  type PushCategory,
} from '@/lib/push/config';
import { isInstalledPWA } from '@/lib/pwa/config';

interface WebPushState {
  isEnabled: boolean;
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isIOSRestricted: boolean;
  categories: PushCategory[];
}

export function useWebPush() {
  const account = useActiveAccount();
  const address = account?.address;
  
  const [state, setState] = useState<WebPushState>({
    isEnabled: false,
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isIOSRestricted: false,
    categories: ['transaction', 'security', 'claim'] as PushCategory[],
  });
  
  const subscriptionRef = useRef<PushSubscription | null>(null);
  
  // Initialize
  useEffect(() => {
    const config = getPushConfig();
    const supported = isPushSupported();
    const iosRestricted = isIOS() && !isIOSPWAInstalled();
    
    setState(prev => ({
      ...prev,
      isEnabled: config.enabled,
      isSupported: supported,
      permission: supported ? Notification.permission : 'default',
      isIOSRestricted: iosRestricted,
    }));
    
    if (!config.enabled || !supported || iosRestricted) {
      return;
    }
    
    // Check existing subscription
    checkSubscription();
  }, []);
  
  /**
   * Check if already subscribed
   */
  const checkSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        subscriptionRef.current = subscription;
        setState(prev => ({ ...prev, isSubscribed: true }));
        
        // Refresh subscription in backend
        await refreshSubscription(subscription);
      }
    } catch (error) {
      console.error('[Push] Failed to check subscription:', error);
    }
  }, [address]);
  
  /**
   * Request permission
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    // Check iOS restriction
    if (state.isIOSRestricted) {
      throw new Error('Please install the app first to enable notifications on iOS');
    }
    
    const permission = await Notification.requestPermission();
    setState(prev => ({ ...prev, permission }));
    
    // Track permission event
    trackPushEvent('permission_requested', { result: permission });
    
    return permission;
  }, [state.isIOSRestricted]);
  
  /**
   * Subscribe to push notifications
   */
  const subscribe = useCallback(async (categories?: PushCategory[]): Promise<boolean> => {
    const config = getPushConfig();
    
    if (!config.enabled || !state.isSupported) {
      console.warn('[Push] Push notifications not available');
      return false;
    }
    
    // Check iOS restriction
    if (state.isIOSRestricted) {
      throw new Error('Please install the app first to enable notifications on iOS');
    }
    
    // Request permission if needed
    if (state.permission !== 'granted') {
      const permission = await requestPermission();
      if (permission !== 'granted') {
        return false;
      }
    }
    
    try {
      // Wait for service worker
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey) as ArrayBuffer | ArrayBufferView,
      });
      
      subscriptionRef.current = subscription;
      
      // Send to backend
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          address,
          categories: categories || state.categories,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to store subscription');
      }
      
      setState(prev => ({ 
        ...prev, 
        isSubscribed: true,
        categories: categories || prev.categories,
      }));
      
      trackPushEvent('subscribed', { address: address?.slice(0, 10) });
      
      return true;
    } catch (error) {
      console.error('[Push] Subscribe error:', error);
      trackPushEvent('subscribe_error', { error: (error as Error).message });
      return false;
    }
  }, [state, address, requestPermission]);
  
  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscriptionRef.current) {
      return false;
    }
    
    try {
      // Unsubscribe from push
      await subscriptionRef.current.unsubscribe();
      
      // Notify backend
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscriptionRef.current.endpoint,
          address,
        }),
      });
      
      subscriptionRef.current = null;
      setState(prev => ({ ...prev, isSubscribed: false }));
      
      trackPushEvent('unsubscribed', { address: address?.slice(0, 10) });
      
      return true;
    } catch (error) {
      console.error('[Push] Unsubscribe error:', error);
      return false;
    }
  }, [address]);
  
  /**
   * Update categories
   */
  const updateCategories = useCallback(async (categories: PushCategory[]): Promise<boolean> => {
    if (!state.isSubscribed || !subscriptionRef.current) {
      return false;
    }
    
    try {
      // Update in backend
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscriptionRef.current.toJSON(),
          address,
          categories,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update categories');
      }
      
      setState(prev => ({ ...prev, categories }));
      
      return true;
    } catch (error) {
      console.error('[Push] Update categories error:', error);
      return false;
    }
  }, [state.isSubscribed, address]);
  
  /**
   * Send test notification
   */
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    if (!state.isSubscribed) {
      return false;
    }
    
    try {
      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send test notification');
      }
      
      trackPushEvent('test_sent');
      
      return true;
    } catch (error) {
      console.error('[Push] Test notification error:', error);
      return false;
    }
  }, [state.isSubscribed, address]);
  
  /**
   * Refresh subscription in backend
   */
  const refreshSubscription = async (subscription: PushSubscription) => {
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          address,
          categories: state.categories,
        }),
      });
    } catch (error) {
      console.error('[Push] Failed to refresh subscription:', error);
    }
  };
  
  return {
    ...state,
    subscribe,
    unsubscribe,
    updateCategories,
    sendTestNotification,
    requestPermission,
  };
}

/**
 * Track push events (telemetry)
 */
function trackPushEvent(event: string, data?: any) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Push Event] ${event}`, data);
  }
  
  // Send to analytics (placeholder)
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event, {
      event_category: 'Push',
      ...data,
    });
  }
}