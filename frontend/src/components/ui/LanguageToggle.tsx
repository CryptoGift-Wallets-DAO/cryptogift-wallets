'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';

const locales = [
  { code: 'es', name: 'ES', flag: '🇪🇸' },
  { code: 'en', name: 'EN', flag: '🇺🇸' }
];

export function LanguageToggle() {
  const [isPending, startTransition] = useTransition();
  const locale = useLocale();

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === locale) return;
    
    console.log('🔥 LanguageToggle clicked:', newLocale);
    console.log('🌍 Language change requested:', { from: locale, to: newLocale });
    
    startTransition(() => {
      try {
        // Set locale cookie and reload page (invisible URL switching)
        document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
        console.log('✅ Cookie set, reloading page');
        
        // Reload the page to apply new locale
        window.location.reload();
      } catch (error) {
        console.error('❌ Language change failed:', error);
      }
    });
  };

  const currentLocale = locales.find(l => l.code === locale) || locales[0];
  const otherLocale = locales.find(l => l.code !== locale) || locales[1];

  return (
    <div className="flex items-center space-x-1">
      <Globe size={14} className="text-gray-600 dark:text-gray-400" />
      <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {/* Current locale */}
        <motion.button
          onClick={() => handleLocaleChange(currentLocale.code)}
          disabled={isPending}
          className="px-2 py-1 text-xs font-medium bg-white dark:bg-gray-700 
                     text-gray-900 dark:text-white rounded shadow-sm
                     disabled:opacity-50"
          whileHover={{ scale: isPending ? 1 : 1.05 }}
          whileTap={{ scale: isPending ? 1 : 0.95 }}
        >
          {currentLocale.name}
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