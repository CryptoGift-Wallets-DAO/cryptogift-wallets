"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useActiveAccount, ConnectButton, TransactionButton } from 'thirdweb/react';
import { prepareContractCall, getContract } from 'thirdweb';
import { baseSepolia, base } from 'thirdweb/chains';
import { client } from '../client';
import { BalanceHistoryPanel } from '../../components/referrals/BalanceHistoryPanel';
import { EarningsHistoryPanel } from '../../components/referrals/EarningsHistoryPanel';
import { FriendsTrackingPanel } from '../../components/referrals/FriendsTrackingPanel';
import { PendingRewardsPanel } from '../../components/referrals/PendingRewardsPanel';
import { useRealTimeReferrals } from '../../hooks/useRealTimeReferrals';

export default function ReferralsPage() {
  const [mounted, setMounted] = useState(false);
  const account = useActiveAccount();
  const [referralData, setReferralData] = useState({
    balance: '0',
    totalEarned: '0',
    referralCount: 0,
    pendingRewards: '0',
    referralUrl: '',
  });
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Panel states
  const [showBalanceHistory, setShowBalanceHistory] = useState(false);
  const [showEarningsHistory, setShowEarningsHistory] = useState(false);
  const [showFriendsTracking, setShowFriendsTracking] = useState(false);
  const [showPendingRewards, setShowPendingRewards] = useState(false);
  
  // Real-time updates using Server-Sent Events
  const {
    stats: realTimeStats,
    recentActivations,
    isConnected,
    error: realTimeError,
    lastUpdate
  } = useRealTimeReferrals(account?.address);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadReferralData = useCallback(async (showLoadingState = true) => {
    if (!mounted || !account) return;

    if (showLoadingState) setIsLoading(true);
    
    try {
      const response = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: account?.address }),
      });

      if (response.ok) {
        const data = await response.json();
        const wasEnhanced = data.enhanced;
        
        setReferralData(prev => {
          const updated = { ...prev, ...data };
          
          // Log if data changed significantly (but only if not using real-time)
          if (!isConnected && (prev.referralCount !== updated.referralCount || 
              prev.totalEarned !== updated.totalEarned)) {
            console.log('📊 Referral data updated (polling):', {
              previousReferrals: prev.referralCount,
              newReferrals: updated.referralCount,
              previousEarnings: prev.totalEarned,
              newEarnings: updated.totalEarned,
              enhanced: wasEnhanced
            });
          }
          
          return updated;
        });
      }
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      if (showLoadingState) setIsLoading(false);
    }
  }, [mounted, account, isConnected]);

  const generateReferralUrl = useCallback(() => {
    if (!mounted || !account) return;
    
    const baseUrl = window.location.origin;
    const referralUrl = `${baseUrl}/?ref=${account?.address}`;
    setReferralData(prev => ({ ...prev, referralUrl }));
  }, [mounted, account]);

  useEffect(() => {
    if (mounted && account) {
      loadReferralData();
      generateReferralUrl();
    }
  }, [mounted, account, loadReferralData, generateReferralUrl]);

  // Sync real-time stats with local state
  useEffect(() => {
    if (realTimeStats && isConnected) {
      setReferralData(prev => ({
        ...prev,
        balance: realTimeStats.totalEarnings.toString(),
        totalEarned: realTimeStats.totalEarnings.toString(),
        referralCount: realTimeStats.totalReferrals,
        pendingRewards: realTimeStats.pendingRewards.toString(),
        conversionRate: realTimeStats.conversionRate,
        activeReferrals: realTimeStats.activeReferrals
      }));
    }
  }, [realTimeStats, isConnected]);

  // Auto-refresh referral data every 30 seconds when real-time is not connected
  useEffect(() => {
    if (!mounted || !account || isConnected) return;

    console.log('🔄 Setting up polling fallback for referral data (real-time not connected)');
    
    const interval = setInterval(() => {
      // Silent refresh (no loading state to avoid UI flicker)
      loadReferralData(false);
    }, 30000); // 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, [mounted, account, isConnected, loadReferralData]);

  const copyReferralUrl = () => {
    navigator.clipboard.writeText(referralData.referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdraw = () => {
    const contract = getContract({
      client,
      chain: process.env.NEXT_PUBLIC_CHAIN_ID === '84532' ? baseSepolia : base,
      address: process.env.NEXT_PUBLIC_REF_TREASURY_ADDRESS!,
    });

    return prepareContractCall({
      contract,
      method: 'function withdraw()',
      params: []
    });
  };

  if (!mounted || !account) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary transition-colors duration-500">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-20 h-20 bg-blue-100 dark:bg-accent-gold/20 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors duration-300">
            <svg className="w-10 h-10 text-blue-500 dark:text-accent-gold transition-colors duration-300" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-4 transition-colors duration-300">Panel de Referidos</h1>
          <p className="text-text-secondary mb-8 transition-colors duration-300">
            Conecta tu wallet para ver tus comisiones y generar tu link de referido
          </p>
          {mounted && (
            <ConnectButton
              client={client}
              appMetadata={{
                name: "CryptoGift Wallets",
                url: typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || (() => { throw new Error('NEXT_PUBLIC_SITE_URL is required for wallet connections'); })(),
              }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 
                   dark:from-bg-primary dark:via-bg-secondary dark:to-bg-primary transition-all duration-500">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-2">
            <div className="w-20 h-20 flex items-center justify-center 
                          bg-gray-50 dark:bg-gray-800/50 
                          rounded-2xl shadow-lg border border-gray-200/30 dark:border-gray-700/30 
                          backdrop-blur-sm transition-all duration-300">
              <Image
                src="/referrals-logo.png"
                alt="Referrals"
                width={76}
                height={76}
                className="object-contain drop-shadow-lg w-full h-full"
              />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-text-primary transition-colors duration-300">
              Panel de Referidos
            </h1>
          </div>
          <p className="text-text-secondary transition-colors duration-300">
            Gana dinero invitando amigos a CryptoGift Wallets
          </p>
          
          {/* Real-time connection status */}
          {mounted && account && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400 dark:bg-gray-600'} transition-colors duration-300`}></div>
              <span className="text-xs text-text-muted transition-colors duration-300">
                {isConnected ? (
                  <>
                    📡 Actualizaciones en tiempo real activas
                    {lastUpdate && (
                      <span className="ml-2 text-green-600 dark:text-accent-gold transition-colors duration-300">
                        (última: {new Date(lastUpdate).toLocaleTimeString()})
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    ⏱️ Modo polling (actualización cada 30s)
                    {realTimeError && (
                      <span className="ml-2 text-red-500 dark:text-red-400 transition-colors duration-300">
                        - Error: {realTimeError}
                      </span>
                    )}
                  </>
                )}
              </span>
            </div>
          )}
        </div>

        <div className="max-w-6xl mx-auto space-y-8">
          {/* Stats Overview */}
          <div className="grid md:grid-cols-4 gap-6">
            <button
              onClick={() => setShowBalanceHistory(true)}
              className="bg-bg-card rounded-2xl p-6 shadow-lg border border-border-primary 
                       hover:shadow-xl hover:border-green-200 dark:hover:border-accent-gold 
                       transition-all duration-200 transform hover:scale-105 cursor-pointer"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-accent-gold/20 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors duration-300">
                  <svg className="w-6 h-6 text-green-600 dark:text-accent-gold transition-colors duration-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-accent-gold transition-colors duration-300">
                  ${parseFloat(referralData.balance).toFixed(2)}
                </div>
                <div className="text-sm text-text-secondary transition-colors duration-300">Balance Disponible</div>
                <div className="text-xs text-green-600 dark:text-accent-gold mt-1 transition-colors duration-300">📊 Ver historial</div>
              </div>
            </button>

            <button
              onClick={() => setShowEarningsHistory(true)}
              className="bg-bg-card rounded-2xl p-6 shadow-lg border border-border-primary 
                       hover:shadow-xl hover:border-blue-200 dark:hover:border-accent-silver 
                       transition-all duration-200 transform hover:scale-105 cursor-pointer"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-accent-silver/20 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors duration-300">
                  <svg className="w-6 h-6 text-blue-600 dark:text-accent-silver transition-colors duration-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-accent-silver transition-colors duration-300">
                  ${parseFloat(referralData.totalEarned).toFixed(2)}
                </div>
                <div className="text-sm text-text-secondary transition-colors duration-300">Total Ganado</div>
                <div className="text-xs text-blue-600 dark:text-accent-silver mt-1 transition-colors duration-300">💎 Ver detalles</div>
              </div>
            </button>

            <button
              onClick={() => setShowFriendsTracking(true)}
              className="bg-bg-card rounded-2xl p-6 shadow-lg border border-border-primary 
                       hover:shadow-xl hover:border-purple-200 dark:hover:border-accent-gold 
                       transition-all duration-200 transform hover:scale-105 cursor-pointer"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-accent-gold/20 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors duration-300">
                  <svg className="w-6 h-6 text-purple-600 dark:text-accent-gold transition-colors duration-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-purple-600 dark:text-accent-gold transition-colors duration-300">
                  {referralData.referralCount}
                </div>
                <div className="text-sm text-text-secondary transition-colors duration-300">Usuarios Invitados</div>
                <div className="text-xs text-purple-600 dark:text-accent-gold mt-1 transition-colors duration-300">👥 Ver tracking</div>
              </div>
            </button>

            <button
              onClick={() => setShowPendingRewards(true)}
              className="bg-bg-card rounded-2xl p-6 shadow-lg border border-border-primary 
                       hover:shadow-xl hover:border-yellow-200 dark:hover:border-accent-silver 
                       transition-all duration-200 transform hover:scale-105 cursor-pointer"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-accent-silver/20 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors duration-300">
                  <svg className="w-6 h-6 text-yellow-600 dark:text-accent-silver transition-colors duration-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-yellow-600 dark:text-accent-silver transition-colors duration-300">
                  ${parseFloat(referralData.pendingRewards).toFixed(2)}
                </div>
                <div className="text-sm text-text-secondary transition-colors duration-300">Pendiente</div>
                <div className="text-xs text-yellow-600 dark:text-accent-silver mt-1 transition-colors duration-300">⏳ Ver detalles</div>
              </div>
            </button>
          </div>

          {/* Withdraw Section */}
          {parseFloat(referralData.balance) > 0 && (
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 
                          dark:from-accent-gold dark:to-accent-silver rounded-2xl p-8 
                          text-white dark:text-bg-primary transition-all duration-500">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">¡Tienes dinero disponible!</h2>
                <p className="text-green-100 dark:text-bg-secondary mb-6 transition-colors duration-300">
                  Puedes retirar ${parseFloat(referralData.balance).toFixed(2)} USDC a tu wallet
                </p>
                <TransactionButton
                  transaction={handleWithdraw}
                  onTransactionConfirmed={() => {
                    loadReferralData();
                  }}
                  className="bg-white dark:bg-bg-primary text-green-600 dark:text-accent-gold px-8 py-3 rounded-xl 
                           font-bold hover:bg-gray-100 dark:hover:bg-bg-secondary transition-all duration-300"
                >
                  💸 Retirar ${parseFloat(referralData.balance).toFixed(2)}
                </TransactionButton>
              </div>
            </div>
          )}

          {/* Referral Link Section */}
          <div className="bg-bg-card rounded-2xl p-8 shadow-lg border border-border-primary transition-all duration-300">
            <h2 className="text-2xl font-bold text-text-primary mb-6 transition-colors duration-300">Tu Link de Referido</h2>
            
            <div className="bg-bg-secondary rounded-xl p-6 mb-6 transition-colors duration-300">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-sm text-text-secondary mb-2 transition-colors duration-300">Comparte este link:</div>
                  <div className="font-mono text-sm bg-bg-primary p-3 rounded-lg border border-border-primary break-all transition-all duration-300">
                    {referralData.referralUrl}
                  </div>
                </div>
                <button
                  onClick={copyReferralUrl}
                  className="px-6 py-3 bg-blue-500 dark:bg-accent-gold text-white dark:text-bg-primary 
                           rounded-lg hover:bg-blue-600 dark:hover:bg-accent-silver transition-all duration-300"
                >
                  {copied ? '✓ Copiado' : '📋 Copiar'}
                </button>
              </div>
            </div>

            {/* Share Options */}
            <div className="grid md:grid-cols-3 gap-4">
              <button
                onClick={() => {
                  const text = `🎁 ¡Descubre CryptoGift Wallets! Crea regalos cripto únicos con arte IA. ¡Es gratis y súper fácil! ${referralData.referralUrl}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="flex items-center justify-center gap-2 p-4 bg-green-500 dark:bg-accent-gold 
                         text-white dark:text-bg-primary rounded-xl hover:bg-green-600 dark:hover:bg-accent-silver 
                         transition-all duration-300"
              >
                <span>📱</span>
                Compartir en WhatsApp
              </button>

              <button
                onClick={() => {
                  const text = `🎁 ¡Descubre CryptoGift Wallets! ${referralData.referralUrl}`;
                  window.open(`https://t.me/share/url?url=${encodeURIComponent(referralData.referralUrl)}&text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="flex items-center justify-center gap-2 p-4 bg-blue-500 dark:bg-accent-silver 
                         text-white dark:text-bg-primary rounded-xl hover:bg-blue-600 dark:hover:bg-accent-gold 
                         transition-all duration-300"
              >
                <span>✈️</span>
                Compartir en Telegram
              </button>

              <button
                onClick={() => {
                  const text = `🎁 Acabo de descubrir @CryptoGiftWallets - la forma más fácil de regalar cripto con arte IA único. ¡Pruébalo gratis!`;
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralData.referralUrl)}`, '_blank');
                }}
                className="flex items-center justify-center gap-2 p-4 bg-blue-400 dark:bg-accent-gold 
                         text-white dark:text-bg-primary rounded-xl hover:bg-blue-500 dark:hover:bg-accent-silver 
                         transition-all duration-300"
              >
                <span>🐦</span>
                Compartir en Twitter
              </button>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-bg-card rounded-2xl p-8 shadow-lg border border-border-primary transition-all duration-300">
            <h2 className="text-2xl font-bold text-text-primary mb-6 transition-colors duration-300">¿Cómo Funciona?</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-accent-gold/20 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
                  <span className="text-2xl">📤</span>
                </div>
                <h3 className="font-bold mb-2 text-blue-600 dark:text-accent-gold transition-colors duration-300">1. Comparte tu Link</h3>
                <p className="text-sm text-text-secondary transition-colors duration-300">
                  Envía tu link de referido a amigos por WhatsApp, redes sociales o email. 
                  <strong> El sistema rastrea cada visita en tiempo real</strong> para que tengas 
                  transparencia total del proceso.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-accent-silver/20 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
                  <span className="text-2xl">🎁</span>
                </div>
                <h3 className="font-bold mb-2 text-green-600 dark:text-accent-silver transition-colors duration-300">2. Ellos Crean Regalos</h3>
                <p className="text-sm text-text-secondary transition-colors duration-300">
                  Cuando tus referidos creen NFT-wallets, <strong>ves la activación instantánea</strong> 
                  en tu panel de tracking. Cada regalo genera comisiones automáticamente sin 
                  intervención manual.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 dark:bg-accent-gold/20 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
                  <span className="text-2xl">💰</span>
                </div>
                <h3 className="font-bold mb-2 text-purple-600 dark:text-accent-gold transition-colors duration-300">3. Ganas Dinero</h3>
                <p className="text-sm text-text-secondary transition-colors duration-300">
                  Obtienes <strong>20% de las ganancias generadas</strong> con tu enlace, 
                  que puede <strong>subir hasta 30-40%</strong> dependiendo de tu desempeño 
                  y volumen de referidos activos.
                </p>
              </div>
            </div>
            
            <div className="mt-8 bg-bg-primary border-2 border-purple-200 dark:border-accent-gold/30 rounded-xl p-6 shadow-lg transition-all duration-300">
              <h4 className="font-bold text-lg mb-4 text-center text-purple-800 dark:text-accent-gold transition-colors duration-300">🎯 Beneficios Adicionales</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start space-x-2">
                  <span className="text-green-600 dark:text-accent-gold font-bold transition-colors duration-300">✅</span>
                  <div className="text-text-primary transition-colors duration-300">
                    <strong className="text-purple-700 dark:text-accent-silver transition-colors duration-300">Tracking en tiempo real:</strong> Ve cada visita, registro y activación al instante
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-green-600 dark:text-accent-gold font-bold transition-colors duration-300">✅</span>
                  <div className="text-text-primary transition-colors duration-300">
                    <strong className="text-purple-700 dark:text-accent-silver transition-colors duration-300">Comisiones escalables:</strong> 20% inicial que puede crecer hasta 40%
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-green-600 dark:text-accent-gold font-bold transition-colors duration-300">✅</span>
                  <div className="text-text-primary transition-colors duration-300">
                    <strong className="text-purple-700 dark:text-accent-silver transition-colors duration-300">Pagos automáticos:</strong> Sin gestión manual, todo se procesa automáticamente
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-green-600 dark:text-accent-gold font-bold transition-colors duration-300">✅</span>
                  <div className="text-text-primary transition-colors duration-300">
                    <strong className="text-purple-700 dark:text-accent-silver transition-colors duration-300">Datos protegidos:</strong> Privacidad total de tus referidos mantenida
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Earnings Calculator */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 
                         dark:from-accent-gold dark:to-accent-silver rounded-2xl p-8 
                         text-white dark:text-bg-primary transition-all duration-500">
            <h2 className="text-2xl font-bold mb-6">💰 Calculadora de Potencial de Ganancias</h2>
            
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="bg-white bg-opacity-10 dark:bg-bg-primary dark:bg-opacity-20 rounded-xl p-4 transition-all duration-300">
                <div className="text-4xl font-bold mb-2">$40</div>
                <div className="text-purple-100 dark:text-bg-secondary text-sm mb-2 transition-colors duration-300">Si tu comunidad de influencia alcanza 10 personas</div>
                <div className="text-xs text-purple-200 dark:text-text-muted transition-colors duration-300">Promedio $50 por regalo • 20% comisión</div>
              </div>

              <div className="bg-white bg-opacity-10 dark:bg-bg-primary dark:bg-opacity-20 rounded-xl p-4 transition-all duration-300">
                <div className="text-4xl font-bold mb-2">$200</div>
                <div className="text-purple-100 dark:text-bg-secondary text-sm mb-2 transition-colors duration-300">Si tu público potencial llega a 50 personas</div>
                <div className="text-xs text-purple-200 dark:text-text-muted transition-colors duration-300">Promedio $50 por regalo • 20% comisión</div>
              </div>

              <div className="bg-white bg-opacity-10 dark:bg-bg-primary dark:bg-opacity-20 rounded-xl p-4 transition-all duration-300">
                <div className="text-4xl font-bold mb-2">$1,000</div>
                <div className="text-purple-100 dark:text-bg-secondary text-sm mb-2 transition-colors duration-300">Si tu red de contactos alcanza 250 personas</div>
                <div className="text-xs text-purple-200 dark:text-text-muted transition-colors duration-300">Promedio $50 por regalo • 20% comisión</div>
              </div>
            </div>

            <div className="text-center mt-8">
              <div className="bg-white bg-opacity-10 dark:bg-bg-primary dark:bg-opacity-20 rounded-xl p-4 mb-4 transition-all duration-300">
                <p className="text-purple-100 dark:text-bg-secondary text-sm mb-2 transition-colors duration-300">
                  🚀 <strong>Potencial de crecimiento:</strong> Tu comisión puede aumentar hasta 30-40% 
                  según tu desempeño y volumen de referidos activos
                </p>
                <p className="text-purple-100 dark:text-bg-secondary text-sm transition-colors duration-300">
                  🌟 <strong>Efecto multiplicador:</strong> Cada persona que invites puede traer a otras, 
                  expandiendo tu red de ganancias exponencialmente
                </p>
              </div>
              
              <a 
                href="/referrals/tips" 
                className="inline-flex items-center px-6 py-3 bg-white dark:bg-bg-primary text-purple-600 dark:text-accent-gold 
                         rounded-xl font-bold hover:bg-purple-50 dark:hover:bg-bg-secondary transition-all duration-300"
              >
                💡 ¿Quieres saber tips para ganar más dinero con este sistema?
              </a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <BalanceHistoryPanel
        isOpen={showBalanceHistory}
        onClose={() => setShowBalanceHistory(false)}
        userAddress={account?.address || ''}
      />
      
      <EarningsHistoryPanel
        isOpen={showEarningsHistory}
        onClose={() => setShowEarningsHistory(false)}
        userAddress={account?.address || ''}
      />
      
      <FriendsTrackingPanel
        isOpen={showFriendsTracking}
        onClose={() => setShowFriendsTracking(false)}
        userAddress={account?.address || ''}
      />
      
      <PendingRewardsPanel
        isOpen={showPendingRewards}
        onClose={() => setShowPendingRewards(false)}
        userAddress={account?.address || ''}
      />
    </div>
  );
}