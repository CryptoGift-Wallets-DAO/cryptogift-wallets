import { getLocale, getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';
import * as MDX from '@/content/mdx-components';

// Import MDX files with frontmatter
const EsDoc = dynamic(() => import('@/content/education/es/sales-masterclass.mdx'));
const EnDoc = dynamic(() => import('@/content/education/en/sales-masterclass.mdx'));

// For static imports with frontmatter (if plugins are configured)
// import EsDoc, { frontmatter as esFm } from '@/content/education/es/sales-masterclass.mdx';
// import EnDoc, { frontmatter as enFm } from '@/content/education/en/sales-masterclass.mdx';

export default async function SalesMasterclassPage() {
  const locale = await getLocale();
  const Doc = locale === 'en' ? EnDoc : EsDoc;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Doc components={MDX} />
      </div>
    </div>
  );
}

export async function generateMetadata() {
  const locale = await getLocale();

  // Option A: Use frontmatter if remark plugins are configured
  // const fm = locale === 'en' ? enFm : esFm;
  // if (fm?.title || fm?.description) {
  //   return {
  //     title: fm?.title ?? 'Sales Masterclass',
  //     description: fm?.description ?? 'Learn about CryptoGift Wallets'
  //   };
  // }

  // Option B: Use i18n catalog
  const t = await getTranslations('education');

  return {
    title: locale === 'en'
      ? 'Masterclass: Gift the Future'
      : 'Masterclass: Regala el Futuro',
    description: locale === 'en'
      ? 'A complete guide to gifting crypto safely and emotionally'
      : 'Guía completa para regalar cripto de forma segura y emotiva',
    openGraph: {
      title: locale === 'en'
        ? 'CryptoGift Wallets Masterclass'
        : 'Masterclass de CryptoGift Wallets',
      description: locale === 'en'
        ? 'Learn how to gift crypto with NFT-wallets'
        : 'Aprende a regalar cripto con NFT-wallets',
      type: 'article',
      locale: locale,
      siteName: 'CryptoGift Wallets',
    },
  };
}