import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "../components/ClientLayout";
import { IntlProvider } from "./IntlProvider";
import { getLocale } from 'next-intl/server';

const inter = Inter({ 
  subsets: ["latin"],
  fallback: ["system-ui", "arial"],
  display: "swap"
});

// Determinar URL base para metadata de forma robusta
// Prioridad: NEXT_PUBLIC_SITE_URL > VERCEL_URL > localhost (para build sin vars)
function getMetadataBaseUrl(): URL {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL);
  }
  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }
  // Fallback para build local sin variables configuradas
  // En producción, VERCEL_URL siempre está disponible durante el build
  return new URL('http://localhost:3000');
}

export const metadata: Metadata = {
  metadataBase: getMetadataBaseUrl(),
  title: "CryptoGift Wallets - Regala el Futuro",
  description: "Regala NFT-wallets con criptomonedas. La forma más fácil de introducir a tus amigos al mundo cripto.",
  keywords: "crypto, NFT, wallet, gift, regalo, blockchain, Base, USDC",
  authors: [{ name: "CryptoGift Wallets Team" }],
  icons: {
    icon: [
      { url: '/favicon.ico?v=3', sizes: 'any' },
      { url: '/favicon.png?v=3', type: 'image/png', sizes: '32x32' },
      { url: '/icon.png?v=3', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png?v=3',
    shortcut: '/favicon.ico?v=3',
  },
  openGraph: {
    title: "CryptoGift Wallets - Regala el Futuro",
    description: "Regala NFT-wallets con criptomonedas. La forma más fácil de introducir a tus amigos al mundo cripto.",
    type: "website",
    images: ["/og-image.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "CryptoGift Wallets - Regala el Futuro",
    description: "Regala NFT-wallets con criptomonedas. La forma más fácil de introducir a tus amigos al mundo cripto.",
    images: ["/og-image.jpg"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Detect current locale from cookie/header  
  const locale = await getLocale();
  
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Favicons with cache busting */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=3" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png?v=3" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon.png?v=3" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=3" />
        
        {/* PWA Configuration */}
        <link rel="manifest" href="/manifest.webmanifest?v=3" />
        {/* Theme color will be set dynamically by ClientLayout based on theme */}
        
        {/* iOS Support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CryptoGift" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        
        {/* Splash screens for iOS */}
        <link rel="apple-touch-startup-image" href="/splash/splash-640x1136.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-750x1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-1242x2208.png" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-1125x2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-1536x2048.png" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-1668x2224.png" media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-2048x2732.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" />
        
        {/* Android Support */}
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Microsoft Support */}
        <meta name="msapplication-TileColor" content="#0a0a0a" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Viewport for mobile optimization */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
      </head>
      <body className={`${inter.className} font-sans antialiased`}>
        <IntlProvider locale={locale}>
          <ClientLayout>
            {children}
          </ClientLayout>
        </IntlProvider>
      </body>
    </html>
  );
}
