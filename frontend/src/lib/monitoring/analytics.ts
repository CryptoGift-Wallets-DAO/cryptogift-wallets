/**
 * Analytics & User Tracking
 * Privacy-first analytics implementation
 */

import { getProductionConfig } from '@/lib/config/production';

// Google Analytics 4
declare global {
  interface Window {
    gtag?: (command: string, ...args: any[]) => void;
    dataLayer?: any[];
  }
}

/**
 * Initialize analytics
 */
export function initAnalytics() {
  const config = getProductionConfig();
  
  if (!config.monitoring.analytics || !process.env.NEXT_PUBLIC_GA_ID) {
    console.log('[Analytics] Tracking disabled');
    return;
  }
  
  // Load GA4
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`;
  script.async = true;
  document.head.appendChild(script);
  
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer!.push(arguments);
  };
  
  window.gtag('js', new Date());
  window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
    send_page_view: false,
    cookie_flags: 'SameSite=None;Secure',
  });
}

/**
 * Track page view
 */
export function trackPageView(url: string, title?: string) {
  if (!window.gtag) return;
  
  window.gtag('event', 'page_view', {
    page_location: url,
    page_title: title,
  });
}

/**
 * Track custom event
 */
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  if (!window.gtag) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
}

/**
 * Track wallet connection
 */
export function trackWalletConnect(address: string, method: string) {
  trackEvent('wallet_connect', 'engagement', method);
  
  // Hash address for privacy
  const hashedAddress = hashString(address.toLowerCase());
  if (window.gtag) {
    window.gtag('set', { user_id: hashedAddress });
  }
}

/**
 * Track transaction
 */
export function trackTransaction(
  type: string,
  chain: number,
  value?: string,
  token?: string
) {
  trackEvent('transaction', type, `${chain}_${token || 'ETH'}`, 
    value ? parseFloat(value) : undefined
  );
}

/**
 * Track conversion
 */
export function trackConversion(
  type: 'bridge' | 'onramp' | 'swap',
  value: number,
  currency: string
) {
  if (!window.gtag) return;
  
  window.gtag('event', 'conversion', {
    send_to: process.env.NEXT_PUBLIC_GA_ID,
    value: value,
    currency: currency,
    conversion_type: type,
  });
}

/**
 * Track timing
 */
export function trackTiming(
  category: string,
  variable: string,
  value: number,
  label?: string
) {
  if (!window.gtag) return;
  
  window.gtag('event', 'timing_complete', {
    name: variable,
    value: Math.round(value),
    event_category: category,
    event_label: label,
  });
}

/**
 * Track exception
 */
export function trackException(description: string, fatal = false) {
  if (!window.gtag) return;
  
  window.gtag('event', 'exception', {
    description: description,
    fatal: fatal,
  });
}

/**
 * Simple hash function for privacy
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Privacy-first Plausible Analytics alternative
 */
export class PlausibleAnalytics {
  private domain: string;
  private apiHost: string;
  
  constructor(domain: string, apiHost = 'https://plausible.io') {
    this.domain = domain;
    this.apiHost = apiHost;
  }
  
  async trackEvent(
    name: string,
    props?: Record<string, string | number>
  ) {
    try {
      const url = `${this.apiHost}/api/event`;
      const payload = {
        domain: this.domain,
        name,
        url: window.location.href,
        referrer: document.referrer || null,
        props,
      };
      
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      // Silent fail
      console.debug('[Plausible] Track error:', error);
    }
  }
  
  trackPageView() {
    this.trackEvent('pageview');
  }
}

// Export Plausible instance if configured
export const plausible = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
  ? new PlausibleAnalytics(process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN)
  : null;