import posthog from "posthog-js";

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
