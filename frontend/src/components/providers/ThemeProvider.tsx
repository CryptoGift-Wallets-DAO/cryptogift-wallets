'use client';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

function ThemeColorUpdater({ children }: { children: React.ReactNode }) {
  const { theme, systemTheme } = useTheme();
  
  useEffect(() => {
    // Determine the actual theme (considering system preference)
    const currentTheme = theme === 'system' ? systemTheme : theme;
    
    // Update theme-color meta tag based on current theme
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      // Use EXACT same colors as navbar (bg-bg-primary from globals.css)
      // Dark mode: #0A0E15 (rgb(10, 14, 21))
      // Light mode: #FFFFFF (rgb(255, 255, 255))
      // Using solid hex colors for maximum compatibility
      const darkColor = '#0A0E15'; // Exacto mismo color que navbar dark
      const lightColor = '#FFFFFF'; // Exacto mismo color que navbar light
      metaThemeColor.setAttribute('content', currentTheme === 'dark' ? darkColor : lightColor);
    } else {
      // Create the meta tag if it doesn't exist
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = currentTheme === 'dark' ? '#0A0E15' : '#FFFFFF';
      document.head.appendChild(meta);
    }
    
    // For iOS: set translucent status bar
    const metaStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (metaStatusBar) {
      // black-translucent allows content to show through on iOS
      metaStatusBar.setAttribute('content', 'black-translucent');
    }
    
    // Android Chrome specific: supports alpha channel
    const metaThemeColorAndroid = document.querySelector('meta[name="theme-color-android"]');
    if (!metaThemeColorAndroid && navigator.userAgent.includes('Android')) {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = currentTheme === 'dark' ? 'rgba(10, 14, 21, 0.9)' : 'rgba(255, 255, 255, 0.9)';
      document.head.appendChild(meta);
    }
  }, [theme, systemTheme]);
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen bg-background text-foreground"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme="system" 
      enableSystem={true}
      disableTransitionOnChange={false}
    >
      <ThemeColorUpdater>
        {children}
      </ThemeColorUpdater>
    </NextThemesProvider>
  );
}