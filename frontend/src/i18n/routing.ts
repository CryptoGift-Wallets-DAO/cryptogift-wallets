import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localePrefix: 'never', // Never show locale in URL - use cookies/headers only
  localeCookie: {
    name: 'NEXT_LOCALE',
    maxAge: 60 * 60 * 24 * 365 // 1 year persistence
  }
});

// Typed navigation APIs
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);