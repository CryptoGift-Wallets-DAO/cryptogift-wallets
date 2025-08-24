/**
 * Amplitude Analytics Configuration
 * Client-side analytics and session replay
 */

import * as amplitude from '@amplitude/analytics-browser';
import { sessionReplayPlugin } from '@amplitude/plugin-session-replay-browser';

let initialized = false;

/**
 * Initialize Amplitude Analytics
 * Must only run client-side
 */
export function initAmplitude() {
  // Only initialize once
  if (initialized) return;
  
  // Only run on client side
  if (typeof window === 'undefined') return;
  
  // Check if API key is configured
  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
  if (!apiKey) {
    console.log('[Amplitude] API key not configured');
    return;
  }
  
  try {
    // Configure session replay
    const replaySampleRate = process.env.NEXT_PUBLIC_AMPLITUDE_REPLAY_SAMPLE === '1' ? 1 : 0;
    
    // Add session replay plugin
    if (replaySampleRate > 0) {
      amplitude.add(sessionReplayPlugin({
        sampleRate: replaySampleRate
      }));
    }
    
    // Initialize Amplitude
    amplitude.init(apiKey, {
      autocapture: true,
      defaultTracking: {
        sessions: true,
        pageViews: true,
        formInteractions: true,
        fileDownloads: true,
      },
      serverZone: process.env.NEXT_PUBLIC_AMPLITUDE_SERVER_ZONE as 'US' | 'EU' || 'US',
      logLevel: process.env.NODE_ENV === 'development' ? amplitude.Types.LogLevel.Debug : amplitude.Types.LogLevel.None,
    });
    
    initialized = true;
    console.log('[Amplitude] Analytics initialized');
  } catch (error) {
    console.error('[Amplitude] Failed to initialize:', error);
  }
}

/**
 * Track custom event
 */
export function trackAmplitudeEvent(eventName: string, eventProperties?: Record<string, any>) {
  if (!initialized || typeof window === 'undefined') return;
  
  try {
    amplitude.track(eventName, eventProperties);
  } catch (error) {
    console.debug('[Amplitude] Track error:', error);
  }
}

/**
 * Set user properties
 */
export function setAmplitudeUser(userId: string, userProperties?: Record<string, any>) {
  if (!initialized || typeof window === 'undefined') return;
  
  try {
    amplitude.setUserId(userId);
    if (userProperties) {
      // Use the Identify class for user properties
      const identify = new amplitude.Identify();
      Object.entries(userProperties).forEach(([key, value]) => {
        identify.set(key, value);
      });
      amplitude.identify(identify);
    }
  } catch (error) {
    console.debug('[Amplitude] Set user error:', error);
  }
}

/**
 * Track revenue
 */
export function trackAmplitudeRevenue(amount: number, productId?: string, quantity?: number) {
  if (!initialized || typeof window === 'undefined') return;
  
  try {
    const revenue = new amplitude.Revenue()
      .setPrice(amount)
      .setEventProperties({
        source: 'cryptogift-wallets'
      });
    
    if (productId) revenue.setProductId(productId);
    if (quantity) revenue.setQuantity(quantity);
    
    amplitude.revenue(revenue);
  } catch (error) {
    console.debug('[Amplitude] Revenue track error:', error);
  }
}

/**
 * Clear user
 */
export function clearAmplitudeUser() {
  if (!initialized || typeof window === 'undefined') return;
  
  try {
    amplitude.reset();
  } catch (error) {
    console.debug('[Amplitude] Clear user error:', error);
  }
}