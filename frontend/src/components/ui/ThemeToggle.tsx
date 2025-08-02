'use client';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Clock, MapPin } from 'lucide-react';
import { useAutoTheme } from '../../hooks/useAutoTheme';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { 
    autoSettings, 
    timezoneInfo, 
    enableAutoTheme, 
    disableAutoTheme, 
    isAutoEnabled,
    isDarkHours 
  } = useAutoTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center space-x-1">
        <Sun size={14} className="text-accent-gold" />
        <span className="text-xs font-medium text-accent-gold">Light</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* TOGGLE PRINCIPAL - SOLO SILUETAS SIN CONTORNOS */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 transition-all duration-300 hover:opacity-80"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
{isAutoEnabled ? (
          <>
            <Clock 
              size={14} 
              className={`${isDarkHours ? 'text-accent-silver' : 'text-accent-gold'} animate-pulse`}
            />
            <span className={`text-xs font-medium ${isDarkHours ? 'text-accent-silver' : 'text-accent-gold'}`}>
              Auto
            </span>
          </>
        ) : theme === 'dark' ? (
          <>
            <Moon 
              size={14} 
              className="text-accent-silver animate-moon-glow" 
            />
            <span className="text-xs font-medium text-accent-silver">Dark</span>
          </>
        ) : (
          <>
            <Sun 
              size={14} 
              className="text-accent-gold animate-sun-rotate" 
            />
            <span className="text-xs font-medium text-accent-gold">Light</span>
          </>
        )}
      </motion.button>

      {/* PANEL DESPLEGABLE MINIMALISTA */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute top-12 right-0 w-48 
                       glass-panel rounded-xl shadow-2xl p-2 z-50"
          >
            {/* MODO AUTOMÁTICO */}
            <motion.button
              onClick={() => {
                if (isAutoEnabled) {
                  disableAutoTheme();
                } else {
                  enableAutoTheme();
                }
                setIsOpen(false);
              }}
              className={`w-full flex items-center space-x-2 p-2 rounded-lg text-sm
                         transition-colors duration-200 ${
                isAutoEnabled 
                  ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' 
                  : 'hover:bg-bg-secondary text-text-secondary'
              }`}
              whileHover={{ x: 2 }}
            >
              <Clock size={14} className={isAutoEnabled ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500'} />
              <div className="flex-1 text-left">
                <span className={isAutoEnabled ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400'}>
                  Auto
                </span>
                {timezoneInfo && (
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                    <MapPin size={10} className="mr-1" />
                    <span>{timezoneInfo.time}</span>
                  </div>
                )}
              </div>
            </motion.button>

            {!isAutoEnabled && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                
                {/* MODO CLARO */}
                <motion.button
                  onClick={() => {
                    setTheme('light');
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center space-x-2 p-2 rounded-lg text-sm
                             transition-colors duration-200 ${
                    theme === 'light' 
                      ? 'bg-accent-gold/20 text-accent-gold' 
                      : 'hover:bg-bg-secondary text-text-secondary'
                  }`}
                  whileHover={{ x: 2 }}
                >
                  <Sun size={14} className="text-accent-gold" />
                  <span className="text-accent-gold">Light</span>
                </motion.button>

                {/* MODO OSCURO */}
                <motion.button
                  onClick={() => {
                    setTheme('dark');
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center space-x-2 p-2 rounded-lg text-sm mt-1
                             transition-colors duration-200 ${
                    theme === 'dark' 
                      ? 'bg-accent-silver/20 text-accent-silver' 
                      : 'hover:bg-bg-secondary text-text-secondary'
                  }`}
                  whileHover={{ x: 2 }}
                >
                  <Moon 
                    size={14} 
                    className="text-accent-silver" 
                  />
                  <span className="text-accent-silver">Dark</span>
                </motion.button>
              </>
            )}

            {/* INFORMACIÓN DE ZONA HORARIA */}
            {timezoneInfo && isAutoEnabled && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center mb-1">
                    <MapPin size={10} className="mr-1" />
                    <span>{timezoneInfo.location}</span>
                  </div>
                  <div>
                    Oscuro: 19:00 - 07:00
                  </div>
                  {isDarkHours && (
                    <div className="text-purple-600 dark:text-purple-400 mt-1">
                      🌙 Modo nocturno activo
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERLAY PARA CERRAR */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}