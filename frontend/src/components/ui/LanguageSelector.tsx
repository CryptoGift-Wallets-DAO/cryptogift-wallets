'use client';
import { useState, useEffect, useTransition } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useRouter, usePathname } from '../../i18n/routing';

const locales = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' }
];

export function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) {
      setIsOpen(false);
      return;
    }

    console.log('🌍 Language change requested:', { from: locale, to: newLocale, pathname });

    startTransition(() => {
      try {
        // Set locale cookie and reload page
        document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
        console.log('✅ Cookie set, reloading page');
        
        // Reload the page to apply new locale
        window.location.reload();
        
        setIsOpen(false);
      } catch (error) {
        console.error('❌ Language change failed:', error);
        setIsOpen(false);
      }
    });
  };

  if (!mounted) {
    return (
      <div className="flex items-center space-x-1">
        <Globe size={14} className="text-accent-gold" />
        <span className="text-xs font-medium text-accent-gold">ES</span>
      </div>
    );
  }

  const currentLocale = locales.find(l => l.code === locale) || locales[0];

  return (
    <div className="relative">
      {/* SELECTOR PRINCIPAL */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="flex items-center space-x-1 transition-all duration-300 hover:opacity-80 disabled:opacity-50"
        whileHover={{ scale: isPending ? 1 : 1.05 }}
        whileTap={{ scale: isPending ? 1 : 0.95 }}
      >
        <span className="text-sm">{currentLocale.flag}</span>
        <span className="text-xs font-medium text-accent-gold uppercase">
          {currentLocale.code}
        </span>
        <ChevronDown 
          size={12} 
          className={`text-accent-gold transition-transform duration-300 ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </motion.button>

      {/* DROPDOWN DE IDIOMAS */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* OVERLAY PARA CERRAR */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* PANEL DE OPCIONES */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 25 
              }}
              className="absolute right-0 top-8 z-50 min-w-[160px] rounded-xl bg-white/90 
                         dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 
                         dark:border-gray-700/50 shadow-xl shadow-blue-500/10 
                         dark:shadow-purple-500/10"
            >
              <div className="p-2">
                {locales.map((localeOption) => (
                  <motion.button
                    key={localeOption.code}
                    onClick={() => {
                      console.log('🔥 Button clicked:', localeOption.code);
                      handleLanguageChange(localeOption.code);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg 
                               transition-all duration-200 text-left
                               ${locale === localeOption.code 
                                 ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30' 
                                 : 'hover:bg-gray-100/80 dark:hover:bg-gray-700/80'
                               }`}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="text-lg">{localeOption.flag}</span>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {localeOption.name}
                      </span>
                    </div>
                    {locale === localeOption.code && (
                      <Check size={14} className="text-blue-600 dark:text-blue-400" />
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}