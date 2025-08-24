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
      // Dark mode: dark gray, Light mode: white
      metaThemeColor.setAttribute('content', currentTheme === 'dark' ? '#0a0a0a' : '#ffffff');
    } else {
      // Create the meta tag if it doesn't exist
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = currentTheme === 'dark' ? '#0a0a0a' : '#ffffff';
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