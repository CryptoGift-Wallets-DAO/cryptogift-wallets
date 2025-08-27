import posthog from "posthog-js";
import * as Sentry from '@sentry/nextjs';

// SENTRY: Export required hook for Next.js 15 router transitions
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// Only initialize PostHog if API key is properly configured
if (process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_KEY !== 'your_posthog_key') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: '2025-05-24',
    capture_exceptions: true, // This enables capturing exceptions using Error Tracking, set to false if you don't want this
    debug: process.env.NODE_ENV === "development",
  });
} else {
  console.log('[PostHog] Analytics disabled - API key not configured properly');
}
