import { setRequestLocale } from 'next-intl/server';
import HomeClient from './HomeClient';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function Home({ params }: HomePageProps) {
  const { locale } = await params;
  
  // Enable static rendering
  setRequestLocale(locale);

  return <HomeClient />;
}