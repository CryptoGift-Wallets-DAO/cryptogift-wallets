import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

// SENTRY: Export required hook for Next.js 15 router transitions
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// PostHog Analytics - Direct API connection (bypasses Vercel proxy issues)
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    // Direct API host - bypasses Vercel rewrites that caused 405 errors
    api_host: 'https://us.i.posthog.com',
    // Capture page views and interactions
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    // Persistence settings
    persistence: 'localStorage',
    // Session replay (disable if bandwidth is a concern)
    disable_session_recording: false,
    // Only initialize in production
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        posthog.opt_out_capturing();
      }
    },
  });
}
