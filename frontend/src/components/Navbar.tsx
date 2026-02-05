"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useActiveAccount } from 'thirdweb/react';
import { useTranslations } from 'next-intl';
import { Link } from '../i18n/routing';
import { DAOProfileCard } from './DAOProfileCard';
import { ConnectAndAuthButton } from './ConnectAndAuthButton';
import { ThemeToggle } from './ui/ThemeToggle';
import { LanguageToggle } from './ui/LanguageToggle';
import { SmartIcon } from './ui/SmartIcon';

export const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const account = useActiveAccount();
  const t = useTranslations('navigation');
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="bg-bg-primary shadow-lg sticky top-0 z-40 transition-colors duration-300 border-b border-border-primary">
      <div className="w-full px-4 sm:px-6">
        <div className="flex justify-between items-center py-4">
          {/* Logo and Theme Toggle Container */}
          <div className="flex items-center space-x-3">
            {/* Logo - Solo este redirige al inicio */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="relative w-12 h-12">
                <Image
                  src="/logo.png"
                  alt="CryptoGift Wallets Logo"
                  width={48}
                  height={48}
                  className="rounded-xl object-cover shadow-lg"
                  priority
                  onError={(e) => {
                    // Fallback to emoji if PNG fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) {
                      fallback.style.display = 'flex';
                    }
                  }}
                />
                <div 
                  className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ display: 'none' }}
                >
                  <SmartIcon icon="🎁" size={24} className="text-white" />
                </div>
              </div>
              <div>
                <div className="font-bold text-xl text-text-primary">CryptoGift</div>
                <div className="text-xs font-medium -mt-1 text-accent-gold dark:text-accent-silver">Wallets</div>
              </div>
            </Link>
            
            {/* THEME TOGGLE SEPARADO - NO REDIRIGE */}
            <ThemeToggle />
            
            {/* LANGUAGE TOGGLE */}
            <LanguageToggle />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/" className="text-text-secondary hover:text-accent-gold dark:hover:text-accent-silver transition-colors text-base font-bold">
              {t('home')}
            </Link>
            
            {/* Separator */}
            <div className="w-px h-6 bg-gradient-to-b from-transparent via-text-muted to-transparent opacity-40"></div>
            
            <Link href="/referrals" className="text-text-secondary hover:text-accent-gold dark:hover:text-accent-silver transition-colors text-base font-bold">
              {t('referrals')}
            </Link>
            
            {/* Separator */}
            <div className="w-px h-6 bg-gradient-to-b from-transparent via-text-muted to-transparent opacity-40"></div>
            
            <Link href="/knowledge" className="text-text-secondary hover:text-accent-gold dark:hover:text-accent-silver transition-colors text-base font-bold">
              {t('knowledge')}
            </Link>

            {/* Separator */}
            <div className="w-px h-6 bg-gradient-to-b from-transparent via-text-muted to-transparent opacity-40"></div>

            <Link href="/nexuswallet" className="text-text-secondary hover:text-accent-gold dark:hover:text-accent-silver transition-colors text-base font-bold">
              {t('nexuswallet')}
            </Link>
            
            {mounted && (
              account ? (
                <DAOProfileCard className="scale-90" />
              ) : (
                <ConnectAndAuthButton className="scale-90" />
              )
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-text-secondary hover:text-text-primary focus:outline-none transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border-primary py-4 bg-bg-primary">
            <div className="space-y-4">
              {/* THEME TOGGLE EN MOBILE MENU */}
              <div className="px-4 py-2">
                <ThemeToggle />
              </div>
              
              <Link 
                href="/" 
                className="block text-text-secondary hover:text-accent-gold dark:hover:text-accent-silver transition-colors px-4 py-3 font-bold text-base"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('home')}
              </Link>
              
              {/* Mobile Separator */}
              <div className="mx-4 h-px bg-gradient-to-r from-transparent via-text-muted to-transparent opacity-30"></div>
              
              <Link 
                href="/referrals" 
                className="block text-text-secondary hover:text-accent-gold dark:hover:text-accent-silver transition-colors px-4 py-3 font-bold text-base"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('referrals')}
              </Link>
              
              {/* Mobile Separator */}
              <div className="mx-4 h-px bg-gradient-to-r from-transparent via-text-muted to-transparent opacity-30"></div>
              
              <Link
                href="/knowledge"
                className="block text-text-secondary hover:text-accent-gold dark:hover:text-accent-silver transition-colors px-4 py-3 font-bold text-base"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('knowledge')}
              </Link>

              {/* Mobile Separator */}
              <div className="mx-4 h-px bg-gradient-to-r from-transparent via-text-muted to-transparent opacity-30"></div>

              <Link
                href="/nexuswallet"
                className="block text-text-secondary hover:text-accent-gold dark:hover:text-accent-silver transition-colors px-4 py-3 font-bold text-base"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nexuswallet')}
              </Link>
              
              <div className="pt-4 px-4">
                {account ? (
                  <DAOProfileCard className="w-full" />
                ) : (
                  <ConnectAndAuthButton className="w-full" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};