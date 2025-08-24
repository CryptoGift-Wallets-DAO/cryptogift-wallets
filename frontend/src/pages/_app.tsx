import type { AppProps } from 'next/app';
import { ThirdwebProvider } from 'thirdweb/react';
import { ThemeProvider } from 'next-themes';
import '../app/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <ThirdwebProvider>
        <Component {...pageProps} />
      </ThirdwebProvider>
    </ThemeProvider>
  );
}