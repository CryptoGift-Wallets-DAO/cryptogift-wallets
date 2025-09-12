import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export async function IntlProvider({
  children,
  locale
}: {
  children: React.ReactNode;
  locale: string;
}) {
  // Get messages for the current locale
  const messages = await getMessages();
  
  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}