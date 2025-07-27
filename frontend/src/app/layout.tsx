import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "../components/ClientLayout";

const inter = Inter({ 
  subsets: ["latin"],
  fallback: ["system-ui", "arial"],
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://cryptogift-wallets.vercel.app'),
  title: "CryptoGift Wallets - Regala el Futuro",
  description: "Regala NFT-wallets con criptomonedas. La forma más fácil de introducir a tus amigos al mundo cripto.",
  keywords: "crypto, NFT, wallet, gift, regalo, blockchain, Base, USDC",
  authors: [{ name: "CryptoGift Wallets Team" }],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} font-sans antialiased`}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
