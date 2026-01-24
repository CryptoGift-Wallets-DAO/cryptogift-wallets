'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export const FeatureSection: React.FC = () => {
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);
  const t = useTranslations('featureSection');

  const features = [
    {
      icon: 'Arte-IA-Personalizado.png',
      key: 'aiArt',
      color: 'from-pink-500 to-rose-500',
    },
    {
      icon: 'cg-wallet-logo.png',
      key: 'nftWallet',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: 'Gas‑Patrocinado.png',
      key: 'gasSponsored',
      color: 'from-yellow-500 to-orange-500',
    },
    {
      icon: 'Recuperacion-Social.png',
      key: 'socialRecovery',
      color: 'from-purple-500 to-violet-500',
    },
    {
      icon: 'Swap-Integrado.png',
      key: 'integratedSwap',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: 'Transparencia-Total.png',
      key: 'transparency',
      color: 'from-indigo-500 to-blue-600',
    }
  ];

  return (
    <section className="py-20 bg-bg-secondary dark:bg-bg-primary transition-colors duration-500">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6 transition-colors duration-300">
            {t('title')}
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto transition-colors duration-300">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <div key={index} className="relative">
              {/* Main Feature Card */}
              <div
                onClick={() => setExpandedFeature(expandedFeature === index ? null : index)}
                className={`group bg-bg-card rounded-2xl p-8 shadow-lg hover:shadow-2xl 
                         transition-all duration-300 border cursor-pointer
                         ${expandedFeature === index 
                           ? 'border-accent-gold dark:border-accent-silver ring-2 ring-accent-gold/20 dark:ring-accent-silver/20' 
                           : 'border-border-primary hover:border-accent-gold dark:hover:border-accent-silver'
                         }`}
              >
                <div className={`w-16 h-20 bg-gradient-to-r ${feature.color}
                               dark:from-accent-gold dark:to-accent-silver
                               rounded-2xl flex items-center justify-center mb-6
                               group-hover:scale-110 transition-transform duration-300
                               ${feature.icon === 'Arte-IA-Personalizado.png' ? 'p-0 overflow-hidden' : 'p-1'}`}>
                  <Image
                    src={`/${feature.icon}`}
                    alt={t(`cards.${feature.key}.title`)}
                    width={64}
                    height={80}
                    className={`${
                      feature.icon === 'Arte-IA-Personalizado.png'
                        ? 'object-cover w-full h-full rounded-2xl'
                        : 'object-contain w-full h-full drop-shadow-lg filter contrast-125 brightness-110'
                    }`}
                    priority
                  />
                </div>

                <h3 className="text-xl font-bold text-text-primary mb-4
                             group-hover:text-accent-gold dark:group-hover:text-accent-silver
                             transition-colors duration-300">
                  {t(`cards.${feature.key}.title`)}
                </h3>

                <p className="text-text-secondary leading-relaxed transition-colors duration-300 mb-4">
                  {t(`cards.${feature.key}.description`)}
                </p>

                {/* Expand Indicator */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-accent-gold dark:text-accent-silver font-medium">
                    {expandedFeature === index ? t('viewLess') : t('viewMore')}
                  </span>
                  <svg 
                    className={`w-5 h-5 text-accent-gold dark:text-accent-silver transition-transform duration-300 ${
                      expandedFeature === index ? 'rotate-180' : ''
                    }`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {/* Expanded Panel */}
              {expandedFeature === index && (
                <div className="absolute top-full left-0 right-0 z-10 mt-2 bg-bg-card border border-accent-gold dark:border-accent-silver
                              rounded-2xl p-6 shadow-2xl backdrop-blur-sm transition-all duration-300">
                  <div className="space-y-4">
                    <h4 className="text-lg font-bold text-accent-gold dark:text-accent-silver">
                      {t(`cards.${feature.key}.subtitle`)}
                    </h4>

                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((num) => (
                        <div key={num} className="flex items-start">
                          <span className="text-accent-gold dark:text-accent-silver mr-3 mt-1 text-sm">✓</span>
                          <span className="text-text-secondary text-sm">{t(`cards.${feature.key}.feature${num}`)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-accent-gold/10 dark:bg-accent-silver/10 rounded-xl p-4 mt-4">
                      <p className="text-sm text-text-primary italic leading-relaxed">
                        {t(`cards.${feature.key}.highlight`)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Backdrop to close expanded panels */}
        {expandedFeature !== null && (
          <div 
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-5 transition-opacity duration-300"
            onClick={() => setExpandedFeature(null)}
          />
        )}

        {/* Spacer for expanded panels */}
        <div className="h-32"></div>
        
        {/* Comparison Section */}
        <div className="mt-20 bg-bg-card rounded-3xl p-8 md:p-12 shadow-xl
                      border border-border-primary transition-all duration-300">
          <h3 className="text-2xl md:text-3xl font-bold text-center text-text-primary mb-12 transition-colors duration-300">
            {t('comparison.title')}
          </h3>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Traditional Way */}
            <div className="space-y-4">
              <h4 className="text-xl font-semibold text-text-primary mb-6 flex items-center transition-colors duration-300">
                <span className="w-8 h-8 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400
                               rounded-full flex items-center justify-center mr-3 text-sm transition-colors duration-300">✗</span>
                {t('comparison.traditional.title')}
              </h4>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="text-red-500 dark:text-red-400 mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">{t('comparison.traditional.point1')}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-red-500 dark:text-red-400 mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">{t('comparison.traditional.point2')}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-red-500 dark:text-red-400 mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">{t('comparison.traditional.point3')}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-red-500 dark:text-red-400 mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">{t('comparison.traditional.point4')}</span>
                </div>
              </div>
            </div>

            {/* CryptoGift Way */}
            <div className="space-y-4">
              <h4 className="text-xl font-semibold text-text-primary mb-6 flex items-center transition-colors duration-300">
                <span className="w-8 h-8 bg-green-100 dark:bg-accent-gold/20 text-green-600 dark:text-accent-gold
                               rounded-full flex items-center justify-center mr-3 text-sm transition-colors duration-300">✓</span>
                {t('comparison.cryptogift.title')}
              </h4>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="text-green-500 dark:text-accent-gold mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">{t('comparison.cryptogift.point1')}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 dark:text-accent-gold mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">{t('comparison.cryptogift.point2')}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 dark:text-accent-gold mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">{t('comparison.cryptogift.point3')}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 dark:text-accent-gold mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">{t('comparison.cryptogift.point4')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};