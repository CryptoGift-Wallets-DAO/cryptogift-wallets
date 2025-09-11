"use client";

import React, { useState, useEffect } from 'react';

export const StatsSection: React.FC = () => {
  const [stats, setStats] = useState({
    totalGifted: 2100000,
    totalWallets: 52000,
    satisfaction: 98,
    savedInFees: 84000
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    const element = document.getElementById('stats-section');
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, []);

  const formatNumber = (num: number, suffix: string = '') => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M${suffix}`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K${suffix}`;
    }
    return `${num}${suffix}`;
  };

  const CountingNumber: React.FC<{ target: number; suffix?: string; prefix?: string }> = ({ 
    target, 
    suffix = '', 
    prefix = '' 
  }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      if (!isVisible) return;

      const duration = 2000; // 2 seconds
      const steps = 60;
      const increment = target / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }, [target]);

    return (
      <span>
        {prefix}{formatNumber(count, suffix)}
      </span>
    );
  };

  return (
    <section id="stats-section" className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 
                                          dark:from-bg-primary dark:to-bg-secondary transition-all duration-500">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white dark:text-text-primary mb-6 transition-colors duration-300">
            El Impacto de CryptoGift
          </h2>
          <p className="text-xl text-blue-100 dark:text-text-secondary max-w-3xl mx-auto transition-colors duration-300">
            Cada número representa una historia real de adopción cripto y conexión humana.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {/* Total Gifted */}
          <div className="text-center group">
            <div className="bg-white/10 dark:bg-bg-card backdrop-blur-lg rounded-2xl p-8 
                          border border-white/20 dark:border-border-primary 
                          hover:bg-white/20 dark:hover:bg-bg-secondary 
                          transition-all duration-300">
              <div className="text-4xl md:text-5xl font-bold text-white dark:text-accent-gold mb-2 transition-colors duration-300">
                <CountingNumber target={stats.totalGifted} prefix="$" />
              </div>
              <div className="text-blue-100 dark:text-text-primary font-medium transition-colors duration-300">Total Regalado</div>
              <div className="text-sm text-blue-200 dark:text-text-secondary mt-2 transition-colors duration-300">En valor cripto real</div>
            </div>
          </div>

          {/* Total Wallets */}
          <div className="text-center group">
            <div className="bg-white/10 dark:bg-bg-card backdrop-blur-lg rounded-2xl p-8 
                          border border-white/20 dark:border-border-primary 
                          hover:bg-white/20 dark:hover:bg-bg-secondary 
                          transition-all duration-300">
              <div className="text-4xl md:text-5xl font-bold text-white dark:text-accent-silver mb-2 transition-colors duration-300">
                <CountingNumber target={stats.totalWallets} suffix="+" />
              </div>
              <div className="text-blue-100 dark:text-text-primary font-medium transition-colors duration-300">NFT-Wallets</div>
              <div className="text-sm text-blue-200 dark:text-text-secondary mt-2 transition-colors duration-300">Creadas y activas</div>
            </div>
          </div>

          {/* Satisfaction */}
          <div className="text-center group">
            <div className="bg-white/10 dark:bg-bg-card backdrop-blur-lg rounded-2xl p-8 
                          border border-white/20 dark:border-border-primary 
                          hover:bg-white/20 dark:hover:bg-bg-secondary 
                          transition-all duration-300">
              <div className="text-4xl md:text-5xl font-bold text-white dark:text-accent-gold mb-2 transition-colors duration-300">
                <CountingNumber target={stats.satisfaction} suffix="%" />
              </div>
              <div className="text-blue-100 dark:text-text-primary font-medium transition-colors duration-300">Satisfacción</div>
              <div className="text-sm text-blue-200 dark:text-text-secondary mt-2 transition-colors duration-300">De usuarios activos</div>
            </div>
          </div>

          {/* Saved in Fees */}
          <div className="text-center group">
            <div className="bg-white/10 dark:bg-bg-card backdrop-blur-lg rounded-2xl p-8 
                          border border-white/20 dark:border-border-primary 
                          hover:bg-white/20 dark:hover:bg-bg-secondary 
                          transition-all duration-300">
              <div className="text-4xl md:text-5xl font-bold text-white dark:text-accent-silver mb-2 transition-colors duration-300">
                <CountingNumber target={stats.savedInFees} prefix="$" />
              </div>
              <div className="text-blue-100 dark:text-text-primary font-medium transition-colors duration-300">Ahorrado en Gas</div>
              <div className="text-sm text-blue-200 dark:text-text-secondary mt-2 transition-colors duration-300">Gracias al Paymaster</div>
            </div>
          </div>
        </div>

        {/* Live Transparency Dashboard */}
        <div className="mt-16 bg-white/10 dark:bg-bg-card backdrop-blur-lg rounded-3xl p-8 
                       border border-white/20 dark:border-border-primary transition-all duration-300">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white dark:text-text-primary mb-2 transition-colors duration-300">Dashboard de Transparencia</h3>
            <p className="text-blue-100 dark:text-text-secondary transition-colors duration-300">Todas las reservas son auditables en tiempo real on-chain</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-300 dark:text-accent-gold transition-colors duration-300">
                <CountingNumber target={1850000} prefix="$" />
              </div>
              <div className="text-sm text-blue-200 dark:text-text-secondary transition-colors duration-300">Reservas Totales</div>
              <div className="text-xs text-blue-300 dark:text-text-muted mt-1 transition-colors duration-300">En contratos auditados</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-300 dark:text-accent-silver transition-colors duration-300">
                <CountingNumber target={47500} />
              </div>
              <div className="text-sm text-blue-200 dark:text-text-secondary transition-colors duration-300">Wallets Activas</div>
              <div className="text-xs text-blue-300 dark:text-text-muted mt-1 transition-colors duration-300">Con saldo &gt; $1</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-purple-300 dark:text-accent-gold transition-colors duration-300">
                <CountingNumber target={156} />
              </div>
              <div className="text-sm text-blue-200 dark:text-text-secondary transition-colors duration-300">Transacciones/hora</div>
              <div className="text-xs text-blue-300 dark:text-text-muted mt-1 transition-colors duration-300">Promedio últimas 24h</div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button className="text-white/80 dark:text-text-muted hover:text-white dark:hover:text-text-primary 
                             text-sm underline transition-colors duration-300">
              Ver Dashboard Completo en BaseScan →
            </button>
          </div>
        </div>

        {/* Social Proof */}
        <div className="mt-16 text-center">
          <div className="text-white/80 dark:text-text-muted text-sm mb-4 transition-colors duration-300">Respaldado por</div>
          <div className="flex justify-center items-center space-x-8 opacity-60 dark:opacity-70 transition-opacity duration-300">
            <div className="text-white dark:text-text-secondary font-semibold transition-colors duration-300">Base Blockchain</div>
            <div className="text-white dark:text-text-secondary font-semibold transition-colors duration-300">ThirdWeb</div>
            <div className="text-white dark:text-text-secondary font-semibold transition-colors duration-300">0x Protocol</div>
            <div className="text-white dark:text-text-secondary font-semibold transition-colors duration-300">OpenZeppelin</div>
          </div>
        </div>
      </div>
    </section>
  );
};