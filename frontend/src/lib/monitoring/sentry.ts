/**
 * Sentry Error Monitoring
 * Production error tracking and performance monitoring
 */

import * as Sentry from '@sentry/nextjs';
import { getProductionConfig } from '@/lib/config/production';

/**
 * Initialize Sentry
 */
export function initSentry() {
  const config = getProductionConfig();
  
  if (!config.monitoring.sentry || !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    console.log('[Sentry] Monitoring disabled');
    return;
  }
  
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: config.environment,
    
    // Performance Monitoring
    tracesSampleRate: config.isProduction ? 0.1 : 1.0,
    
    // Session Replay
    replaysSessionSampleRate: config.isProduction ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    
    // Release tracking
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    
    // Integrations
    integrations: [
      new Sentry.BrowserTracing({
        // Navigation transactions
        routingInstrumentation: Sentry.nextRouterInstrumentation,
        // Trace fetch/XHR
        tracingOrigins: [
          'localhost',
          /^\//,
          process.env.NEXT_PUBLIC_APP_URL || '',
        ],
      }),
      new Sentry.Replay({
        // Mask sensitive content
        maskAllText: false,
        maskAllInputs: true,
        // Block certain selectors
        blockSelector: '.sensitive-data',
      }),
    ],
    
    // Filtering
    beforeSend(event, hint) {
      // Filter out certain errors
      if (event.exception) {
        const error = hint.originalException;
        
        // Ignore network errors
        if (error?.message?.includes('Network request failed')) {
          return null;
        }
        
        // Ignore user cancellations
        if (error?.message?.includes('User cancelled')) {
          return null;
        }
        
        // Remove sensitive data
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers?.authorization;
        }
      }
      
      return event;
    },
    
    // User context
    initialScope: {
      tags: {
        component: 'frontend',
      },
    },
  });
}

/**
 * Set user context
 */
export function setSentryUser(userId: string, address?: string) {
  Sentry.setUser({
    id: userId,
    username: address,
  });
}

/**
 * Clear user context
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Capture exception with context
 */
export function captureException(
  error: Error,
  context?: Record<string, any>,
  level: Sentry.SeverityLevel = 'error'
) {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('additional', context);
    }
    scope.setLevel(level);
    Sentry.captureException(error);
  });
}

/**
 * Capture message
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('additional', context);
    }
    scope.setLevel(level);
    Sentry.captureMessage(message);
  });
}

/**
 * Performance transaction
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Add breadcrumb
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
  Sentry.addBreadcrumb(breadcrumb);
}