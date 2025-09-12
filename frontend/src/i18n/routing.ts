import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localePrefix: 'never' // Never show locale in URL - use cookies/headers only
});

// Typed navigation APIs
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);