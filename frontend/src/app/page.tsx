import { redirect } from 'next/navigation';
import { defaultLocale } from '../i18n/request';

// Root page that redirects to default locale
export default function RootPage() {
  redirect(`/${defaultLocale}`);
}