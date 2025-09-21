import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';

const locales = [
  { code: 'es', name: 'ES', flag: '🇪🇸' },
  { code: 'en', name: 'EN', flag: '🇺🇸' }
];

export function LanguageToggle() {
  const [isPending, setIsPending] = useState(false);
  const [currentLocale, setCurrentLocale] = useState('es');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Mark as client-side to avoid SSR issues
    setIsClient(true);

    // Read locale from cookie on mount
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      const localeCookie = cookies.find(c => c.trim().startsWith('NEXT_LOCALE='));
      if (localeCookie) {
        const locale = localeCookie.split('=')[1];
        setCurrentLocale(locale);
      }
    }
  }, []);

  const handleLocaleChange = async (newLocale: string) => {
    if (newLocale === currentLocale) return;

    console.log('🔥 LanguageToggle clicked:', newLocale);
    console.log('🌍 Language change via server action:', { from: currentLocale, to: newLocale });

    setIsPending(true);
    try {
      // Call server action to set cookie
      const response = await fetch('/api/locale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ locale: newLocale }),
      });

      if (response.ok) {
        console.log('✅ Server locale cookie set, refreshing...');
        setCurrentLocale(newLocale);
        // Reload the page to apply new locale
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      } else {
        console.error('❌ Failed to set locale on server:', response.statusText);
      }
    } catch (error) {
      console.error('❌ Language change failed:', error);
    } finally {
      setIsPending(false);
    }
  };

  const currentLocaleObj = locales.find(l => l.code === currentLocale) || locales[0];
  const otherLocale = locales.find(l => l.code !== currentLocale) || locales[1];

  // Don't render anything on server side to avoid hydration mismatch
  if (!isClient) {
    return null;
  }

  return (
    <div className="flex items-center space-x-1">
      <Globe size={14} className="text-gray-600 dark:text-gray-400" />
      <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {/* Current locale */}
        <motion.button
          onClick={() => handleLocaleChange(currentLocaleObj.code)}
          disabled={isPending}
          className="px-2 py-1 text-xs font-medium bg-white dark:bg-gray-700 
                     text-gray-900 dark:text-white rounded shadow-sm
                     disabled:opacity-50"
          whileHover={{ scale: isPending ? 1 : 1.05 }}
          whileTap={{ scale: isPending ? 1 : 0.95 }}
        >
          {currentLocaleObj.name}
        </motion.button>
        
        {/* Separator */}
        <div className="text-gray-400 px-1">|</div>
        
        {/* Other locale */}
        <motion.button
          onClick={() => handleLocaleChange(otherLocale.code)}
          disabled={isPending}
          className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400
                     hover:text-gray-900 dark:hover:text-white transition-colors
                     disabled:opacity-50"
          whileHover={{ scale: isPending ? 1 : 1.05 }}
          whileTap={{ scale: isPending ? 1 : 0.95 }}
        >
          {otherLocale.name}
        </motion.button>
      </div>
    </div>
  );
}