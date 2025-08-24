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
      // Make it semi-transparent matching navbar background
      // Dark mode: dark with transparency, Light mode: white with transparency
      // Using rgba format for Android Chrome, falls back to solid on iOS
      metaThemeColor.setAttribute('content', currentTheme === 'dark' ? 'rgba(10, 10, 10, 0.8)' : 'rgba(255, 255, 255, 0.8)');
    } else {
      // Create the meta tag if it doesn't exist
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = currentTheme === 'dark' ? 'rgba(10, 10, 10, 0.8)' : 'rgba(255, 255, 255, 0.8)';
      document.head.appendChild(meta);
    }
    
    // Also add a media query for translucent status bar on iOS
    const metaStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (metaStatusBar) {
      // iOS 15+ supports translucent with theme matching
      metaStatusBar.setAttribute('content', currentTheme === 'dark' ? 'black-translucent' : 'default');
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