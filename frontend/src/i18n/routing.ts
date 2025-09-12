import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localePrefix: 'as-needed' // No prefix for default locale (es), prefix for others (en)
});

// Typed navigation APIs
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);