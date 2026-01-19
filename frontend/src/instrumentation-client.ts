import * as Sentry from '@sentry/nextjs';

// SENTRY: Export required hook for Next.js 15 router transitions
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// PostHog DESHABILITADO temporalmente para evitar errores 405
// Los rewrites de Vercel no están funcionando correctamente
// TODO: Re-habilitar cuando se configure correctamente el proxy de PostHog
console.log('[PostHog] Analytics disabled - proxy not configured correctly');
