'use client';

import { useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';

const locales = [
  { code: 'es', name: 'ES', flag: '🇪🇸' },
  { code: 'en', name: 'EN', flag: '🇺🇸' }
];

export function LanguageToggle() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === locale) return;
    
    startTransition(() => {
      // Remove current locale from pathname if present
      const pathWithoutLocale = pathname.replace(/^\/(es|en)/, '') || '/';
      
      // Add new locale prefix only if not default
      const newPath = newLocale === 'es' 
        ? pathWithoutLocale 
        : `/${newLocale}${pathWithoutLocale}`;
      
      router.replace(newPath);
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