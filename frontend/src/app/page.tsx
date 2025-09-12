import { getLocale } from 'next-intl/server';
import HomeClient from './[locale]/HomeClient';

export default async function Home() {
  // Get locale from cookie/header (not URL)
  const locale = await getLocale();
  
  return <HomeClient />;
}