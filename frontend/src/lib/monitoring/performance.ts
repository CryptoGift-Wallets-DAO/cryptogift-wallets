/**
 * Performance Monitoring
 * Web Vitals and custom metrics tracking
 */

import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';
import { telemetry } from './telemetry';

/**
 * Web Vitals thresholds
 */
const THRESHOLDS = {
  // Good thresholds
  good: {
    CLS: 0.1,
    FID: 100,
    FCP: 1800,
    LCP: 2500,
    TTFB: 800,
    INP: 200,
  },
  // Needs improvement thresholds
  needsImprovement: {
    CLS: 0.25,
    FID: 300,
    FCP: 3000,
    LCP: 4000,
    TTFB: 1800,
    INP: 500,
  },
};

/**
 * Initialize Web Vitals monitoring
 */
export function initWebVitals() {
  // Cumulative Layout Shift
  onCLS((metric) => {
    reportWebVital('CLS', metric.value, metric.rating);
  });
  
  // First Input Delay
  onFID((metric) => {
    reportWebVital('FID', metric.value, metric.rating);
  });
  
  // First Contentful Paint
  onFCP((metric) => {
    reportWebVital('FCP', metric.value, metric.rating);
  });
  
  // Largest Contentful Paint
  onLCP((metric) => {
    reportWebVital('LCP', metric.value, metric.rating);
  });
  
  // Time to First Byte
  onTTFB((metric) => {
    reportWebVital('TTFB', metric.value, metric.rating);
  });
  
  // Interaction to Next Paint
  onINP((metric) => {
    reportWebVital('INP', metric.value, metric.rating);
  });
}

/**
 * Report Web Vital metric
 */
function reportWebVital(
  name: string,
  value: number,
  rating: 'good' | 'needs-improvement' | 'poor'
) {
  // Send to telemetry
  telemetry.metric(`webvital.${name}`, value, 'ms', { rating });
  
  // Log to console in dev
  if (process.env.NODE_ENV === 'development') {
    console.log(`[WebVital] ${name}: ${value.toFixed(2)}ms (${rating})`);
  }
  
  // Send to analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', name, {
      value: Math.round(value),
      metric_rating: rating,
      event_category: 'Web Vitals',
    });
  }
}

/**
 * Performance Observer for custom metrics
 */
export class PerformanceObserver {
  private observer?: globalThis.PerformanceObserver;
  
  constructor() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }
    
    this.observer = new window.PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.processEntry(entry);
      }
    });
  }
  
  /**
   * Start observing
   */
  observe() {
    if (!this.observer) return;
    
    // Observe different entry types
    try {
      this.observer.observe({ entryTypes: ['navigation'] });
      this.observer.observe({ entryTypes: ['resource'] });
      this.observer.observe({ entryTypes: ['measure'] });
      this.observer.observe({ entryTypes: ['mark'] });
    } catch (error) {
      // Some entry types might not be supported
      console.debug('[Performance] Observer error:', error);
    }
  }
  
  /**
   * Process performance entry
   */
  private processEntry(entry: PerformanceEntry) {
    switch (entry.entryType) {
      case 'navigation':
        this.processNavigation(entry as PerformanceNavigationTiming);
        break;
      case 'resource':
        this.processResource(entry as PerformanceResourceTiming);
        break;
      case 'measure':
        this.processMeasure(entry as PerformanceMeasure);
        break;
    }
  }
  
  /**
   * Process navigation timing
   */
  private processNavigation(entry: PerformanceNavigationTiming) {
    // Calculate metrics
    const dns = entry.domainLookupEnd - entry.domainLookupStart;
    const tcp = entry.connectEnd - entry.connectStart;
    const ttfb = entry.responseStart - entry.requestStart;
    const download = entry.responseEnd - entry.responseStart;
    const domInteractive = entry.domInteractive - entry.fetchStart;
    const domComplete = entry.domComplete - entry.fetchStart;
    
    // Report metrics
    telemetry.metric('navigation.dns', dns, 'ms');
    telemetry.metric('navigation.tcp', tcp, 'ms');
    telemetry.metric('navigation.ttfb', ttfb, 'ms');
    telemetry.metric('navigation.download', download, 'ms');
    telemetry.metric('navigation.domInteractive', domInteractive, 'ms');
    telemetry.metric('navigation.domComplete', domComplete, 'ms');
  }
  
  /**
   * Process resource timing
   */
  private processResource(entry: PerformanceResourceTiming) {
    // Only track critical resources
    const criticalTypes = ['script', 'stylesheet', 'font'];
    const resourceType = this.getResourceType(entry.name);
    
    if (!criticalTypes.includes(resourceType)) return;
    
    const duration = entry.responseEnd - entry.startTime;
    const size = entry.transferSize || 0;
    
    telemetry.metric(`resource.${resourceType}.duration`, duration, 'ms');
    telemetry.metric(`resource.${resourceType}.size`, size, 'bytes');
  }
  
  /**
   * Process custom measure
   */
  private processMeasure(entry: PerformanceMeasure) {
    telemetry.metric(`measure.${entry.name}`, entry.duration, 'ms');
  }
  
  /**
   * Get resource type from URL
   */
  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(woff2?|ttf|otf)/)) return 'font';
    if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)/)) return 'image';
    return 'other';
  }
  
  /**
   * Stop observing
   */
  disconnect() {
    this.observer?.disconnect();
  }
}

/**
 * Custom performance marks
 */
export function mark(name: string) {
  if (typeof window !== 'undefined' && window.performance) {
    window.performance.mark(name);
  }
}

/**
 * Custom performance measure
 */
export function measure(name: string, startMark: string, endMark?: string) {
  if (typeof window !== 'undefined' && window.performance) {
    try {
      window.performance.measure(name, startMark, endMark);
    } catch (error) {
      console.debug('[Performance] Measure error:', error);
    }
  }
}

/**
 * Report custom metric
 */
export function reportMetric(name: string, value: number, unit = 'ms') {
  telemetry.metric(name, value, unit);
  
  // Also send to analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'custom_metric', {
      metric_name: name,
      value: Math.round(value),
      unit: unit,
      event_category: 'Performance',
    });
  }
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring() {
  // Initialize Web Vitals
  initWebVitals();
  
  // Start Performance Observer
  const observer = new PerformanceObserver();
  observer.observe();
  
  // Report initial page load performance
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          const pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
          reportMetric('page.load.total', pageLoadTime);
        }
      }, 0);
    });
  }
}