import React from 'react';
import Image from 'next/image';

interface HeroSectionProps {
  onCreateGift: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onCreateGift }) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center 
                        bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 
                        dark:from-bg-primary dark:via-bg-secondary dark:to-bg-card
                        overflow-hidden transition-all duration-500 pt-20">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-96 h-96 bg-white dark:bg-accent-gold opacity-10 dark:opacity-5 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute -bottom-8 -right-4 w-96 h-96 bg-yellow-300 dark:bg-accent-silver opacity-10 dark:opacity-8 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-300 dark:bg-accent-silver opacity-10 dark:opacity-6 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto scale-80">
        {/* NFT Preview Mockup */}
        <div className="mb-10 flex justify-center">
          <div className="relative">
            <div className="w-72 h-72 bg-white/10 dark:bg-bg-card/90 backdrop-blur-lg rounded-3xl p-5 
                          border border-white/20 dark:border-border-primary shadow-2xl transition-all duration-500">
              <div className="w-full h-40 bg-gradient-to-br from-purple-400 to-blue-500 
                            dark:from-accent-gold dark:to-accent-silver rounded-2xl mb-3 
                            flex items-center justify-center overflow-hidden">
                <div className="w-28 h-28 relative">
                  <Image
                    src="/Apex.PNG"
                    alt="Apex CryptoGift"
                    fill
                    className="object-cover rounded-full border-4 border-white/30 dark:border-border-primary"
                    sizes="112px"
                  />
                </div>
              </div>
              <div className="text-white dark:text-text-primary transition-colors duration-300">
                <h3 className="font-bold text-lg mb-2">Tu Regalo Cripto</h3>
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-75">Balance:</span>
                  <span className="font-semibold text-accent-gold dark:text-accent-silver">50 USDC</span>
                </div>
              </div>
            </div>
            
            {/* Floating elements - 1.2 bounces per second (zen timing) */}
            <div 
              className="absolute -top-2 -right-2 w-14 h-14 bg-green-400 dark:bg-accent-gold 
                        rounded-full flex items-center justify-center transition-colors duration-300"
              style={{
                animation: 'natural-bounce 0.83s ease-in-out infinite'
              }}
            >
              <Image
                src="/cg-wallet-logo.png"
                alt="CG Wallet"
                width={48}
                height={48}
                className="object-contain"
              />
            </div>
            <div 
              className="absolute -bottom-2 -left-2 w-12 h-12 bg-yellow-400 dark:bg-accent-silver 
                        rounded-full flex items-center justify-center transition-colors duration-300"
              style={{
                animation: 'gentle-pulse 0.83s ease-in-out infinite'
              }}
            >
              <Image
                src="/wallet-regalo.png"
                alt="Wallet Regalo"
                width={40}
                height={40}
                className="object-contain"
                priority
                onError={(e) => {
                  console.log('ERROR: Error loading wallet-regalo.png from /wallet-regalo.png');
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) {
                    fallback.style.display = 'block';
                  }
                }}
              />
              <span className="text-white dark:text-bg-primary text-lg" style={{ display: 'none' }}>🎁</span>
            </div>
          </div>
        </div>

        {/* Hero Text */}
        <h1 className="text-3xl md:text-6xl font-bold text-white dark:text-text-primary mb-5 leading-tight transition-colors duration-300">
          Regala el
          <span className="block bg-gradient-to-r from-yellow-300 to-pink-300 
                         dark:from-accent-gold dark:to-accent-silver bg-clip-text text-transparent">
            Futuro
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-white/80 dark:text-text-secondary mb-7 max-w-2xl mx-auto leading-relaxed transition-colors duration-300">
          Crea NFT-wallets únicos con arte IA y criptomonedas reales. 
          La forma más emotiva de introducir a tus amigos al mundo blockchain.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-10">
          <button
            onClick={onCreateGift}
            className="group relative px-7 py-3 bg-white dark:bg-bg-card text-purple-600 dark:text-accent-gold 
                     rounded-full font-bold text-base hover:scale-105 transition-all duration-300 
                     shadow-xl hover:shadow-2xl border dark:border-border-primary"
          >
            <span className="relative z-10">Crear mi Regalo</span>
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-pink-300 
                          dark:from-accent-gold dark:to-accent-silver rounded-full opacity-0 
                          group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
          
          <div className="flex items-center text-white/60 dark:text-text-muted transition-colors duration-300">
            <span className="text-sm">Sin comisiones • Gas gratis • 2 min</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 max-w-xl mx-auto text-white dark:text-text-primary transition-colors duration-300">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-gold dark:text-accent-silver">$2M+</div>
            <div className="text-xs opacity-75">Regalado</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-gold dark:text-accent-silver">50K+</div>
            <div className="text-xs opacity-75">NFT-Wallets</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-gold dark:text-accent-silver">98%</div>
            <div className="text-xs opacity-75">Satisfacción</div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-white/60 dark:text-text-muted transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
};