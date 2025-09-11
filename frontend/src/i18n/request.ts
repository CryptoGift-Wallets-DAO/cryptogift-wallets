import {getRequestConfig} from 'next-intl/server';

export const locales = ['es', 'en'] as const;
export const defaultLocale = 'es' as const;

export default getRequestConfig(async ({locale}) => {
  return {
    messages: (await import(`../locales/${locale}.json`)).default,
    timeZone: 'America/Mexico_City'
  };
});