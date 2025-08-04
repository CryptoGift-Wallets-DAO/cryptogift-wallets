'use client';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme="system" 
      enableSystem={true}
      disableTransitionOnChange={false}
    >
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
    </NextThemesProvider>
  );
}