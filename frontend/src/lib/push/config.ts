/**
 * Web Push Configuration
 * Settings for push notifications via Service Worker
 */

/**
 * Push notification configuration
 */
export interface PushConfig {
  enabled: boolean;
  vapidPublicKey: string;
  senderEmail: string;
  serverUrl: string;
  categories: PushCategory[];
  throttleMs: number;
  requirePWA: boolean; // iOS requirement
}

/**
 * Push notification categories
 */
export enum PushCategory {
  TRANSACTION = 'transaction',
  SECURITY = 'security',
  CLAIM = 'claim',
  SYSTEM = 'system',
  MARKETING = 'marketing',
}

/**
 * Push subscription data
 */
export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  address?: string;
  userAgent?: string;
  createdAt: number;
  categories: PushCategory[];
}

/**
 * Push notification payload
 */
export interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  category: PushCategory;
}

/**
 * Get push configuration from environment
 */
export function getPushConfig(): PushConfig {
  return {
    enabled: process.env.NEXT_PUBLIC_FEATURE_WEBPUSH === 'on',
    vapidPublicKey: process.env.NEXT_PUBLIC_WEBPUSH_PUBLIC_KEY || '',
    senderEmail: process.env.NEXT_PUBLIC_WEBPUSH_SENDER_EMAIL || 'support@cryptogift-wallets.com',
    serverUrl: process.env.NEXT_PUBLIC_API_URL || '',
    categories: [
      PushCategory.TRANSACTION,
      PushCategory.SECURITY,
      PushCategory.CLAIM,
      PushCategory.SYSTEM,
    ],
    throttleMs: parseInt(process.env.NEXT_PUBLIC_PUSH_THROTTLE_MS || '60000'), // 1 min default
    requirePWA: true, // iOS requires PWA installation
  };
}

/**
 * Check if push notifications are enabled
 */
export function isPushEnabled(): boolean {
  return getPushConfig().enabled;
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Check if running on iOS
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Check if iOS PWA is installed (required for push on iOS)
 */
export function isIOSPWAInstalled(): boolean {
  if (!isIOS()) return true; // Not iOS, no restriction
  
  // Check if running in standalone mode
  const isStandalone = (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
  
  return isStandalone;
}

/**
 * URL base64 to Uint8Array for VAPID
 */
export function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray.buffer;
}