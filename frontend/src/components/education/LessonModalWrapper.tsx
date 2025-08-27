/**
 * LESSON MODAL WRAPPER - SISTEMA UNIFICADO KNOWLEDGE ↔ EDUCATIONAL
 * Modal universal que usa EXACTAMENTE las mismas lecciones de Knowledge 
 * en Educational Requirements sin modificación alguna
 * 
 * Estructura modal idéntica a GiftWizard con fixed inset-0 bg-black/60
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useActiveAccount, ConnectButton } from 'thirdweb/react';
import { useEffect } from 'react';
import { client } from '../../app/client';
import { baseSepolia } from 'thirdweb/chains';

// Import dinámico para evitar SSR issues con animaciones y confetti
const SalesMasterclass = dynamic(
  () => import('../learn/SalesMasterclass'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">Cargando Sales Masterclass...</p>
        </div>
      </div>
    )
  }
);

// Import dinámico para ClaimFirstGift
const ClaimFirstGift = dynamic(
  () => import('../learn/ClaimFirstGift').then(mod => ({ default: mod.ClaimFirstGift })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">Cargando Lección de Claim...</p>
        </div>
      </div>
    )
  }
);

// Import dinámico para Email Verification y Calendar Booking
const EmailVerificationModal = dynamic(
  () => import('../email/EmailVerificationModal').then(mod => ({ default: mod.EmailVerificationModal })),
  { ssr: false }
);

const CalendarBookingModal = dynamic(
  () => import('../calendar/CalendarBookingModal').then(mod => ({ default: mod.CalendarBookingModal })),
  { ssr: false }
);

// Simple confetti implementation matching existing celebration
function triggerConfetti(options?: any) {
  const duration = 3000;
  const animationEnd = Date.now() + duration;

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    
    for (let i = 0; i < particleCount; i++) {
      const confettiEl = document.createElement('div');
      confettiEl.style.position = 'fixed';
      confettiEl.style.width = '10px';
      confettiEl.style.height = '10px';
      confettiEl.style.backgroundColor = ['#FFD700', '#FFA500', '#FF6347', '#FF69B4', '#00CED1'][Math.floor(Math.random() * 5)];
      confettiEl.style.left = Math.random() * 100 + '%';
      confettiEl.style.top = '-10px';
      confettiEl.style.opacity = '1';
      confettiEl.style.transform = `rotate(${Math.random() * 360}deg)`;
      confettiEl.style.zIndex = '10000';
      confettiEl.className = 'confetti-particle';
      
      document.body.appendChild(confettiEl);
      
      confettiEl.animate([
        { 
          transform: `translateY(0) rotate(0deg)`,
          opacity: 1 
        },
        { 
          transform: `translateY(${window.innerHeight + 100}px) rotate(${Math.random() * 720}deg)`,
          opacity: 0
        }
      ], {
        duration: randomInRange(2000, 4000),
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      }).onfinish = () => confettiEl.remove();
    }
  }, 250);
  
  console.log('🎉 CELEBRATION CONFETTI:', options);
}

export interface LessonModalWrapperProps {
  lessonId: string;
  mode: 'knowledge' | 'educational';
  isOpen: boolean;
  onClose: () => void;
  
  // Educational mode specific props
  tokenId?: string;
  sessionToken?: string;
  onComplete?: (gateData: string) => void;
}

export const LessonModalWrapper: React.FC<LessonModalWrapperProps> = ({
  lessonId,
  mode,
  isOpen,
  onClose,
  tokenId,
  sessionToken,
  onComplete
}) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConnectWallet, setShowConnectWallet] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState<string>('');
  const account = useActiveAccount();

  // FASE 4: connectWallet() abstraction with Promise-based API
  const connectWallet = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      console.log('🔗 connectWallet() abstraction called');
      
      // If already connected, resolve immediately
      if (account?.address) {
        console.log('✅ Wallet already connected:', account.address);
        resolve(account.address);
        return;
      }
      
      // Set up connection monitoring
      setShowConnectWallet(true);
      
      // Create connection watcher
      let connectionTimeout: NodeJS.Timeout;
      
      const checkConnection = () => {
        // This will be resolved by the useEffect when connection succeeds
        connectionTimeout = setTimeout(() => {
          console.log('❌ Wallet connection timeout');
          setShowConnectWallet(false);
          reject(new Error('Wallet connection timeout'));
        }, 30000); // 30 second timeout
      };
      
      // Store resolve/reject functions for useEffect to call
      (window as any).__walletConnectionResolve = resolve;
      (window as any).__walletConnectionReject = reject;
      (window as any).__walletConnectionTimeout = connectionTimeout;
      
      checkConnection();
    });
  }, [account?.address]);

  // canProceed logic abstraction  
  const canProceedToNextStep = useCallback((): boolean => {
    if (mode !== 'educational') return true;
    
    // Educational mode requires wallet connection
    return !!account?.address;
  }, [mode, account?.address]);

  // Watch for wallet connection when in connect wallet state
  useEffect(() => {
    if (showConnectWallet && account?.address) {
      console.log('🔗 Wallet connected via useEffect, resolving Promise');
      setShowConnectWallet(false);
      
      // Resolve the Promise from connectWallet abstraction
      const resolve = (window as any).__walletConnectionResolve;
      const timeout = (window as any).__walletConnectionTimeout;
      
      if (resolve) {
        clearTimeout(timeout);
        resolve(account.address);
        
        // Clean up global references
        delete (window as any).__walletConnectionResolve;
        delete (window as any).__walletConnectionReject;
        delete (window as any).__walletConnectionTimeout;
        
        // Proceed to EIP-712 generation
        processEIP712Generation();
      }
    }
  }, [account?.address, showConnectWallet]);

  const handleLessonComplete = async () => {
    console.log('✅ LESSON COMPLETION TRIGGERED:', { lessonId, mode, accountConnected: !!account?.address });
    
    // En mode educational, first check if email verification is needed
    if (mode === 'educational' && onComplete) {
      // EDUCATIONAL MODE: Email verification will be handled by SalesMasterclass
      // and when email verification completes, THEN show success overlay
      console.log('🎓 Educational mode - waiting for email verification or direct completion');
      
      // This will be called after email verification completes
      return; // Let SalesMasterclass handle the email verification flow first
    } else if (mode === 'knowledge') {
      // En knowledge mode, simplemente mostrar celebración y cerrar
      triggerConfetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347']
      });
      
      setTimeout(() => {
        onClose();
      }, 3000);
    }
  };

  // FASE 1.2: Async functions for email verification and calendar
  const handleShowEmailVerification = async (): Promise<void> => {
    console.log('📧 Showing email verification modal');
    setShowEmailVerification(true);
    
    // Return a Promise that resolves when modal closes
    return new Promise((resolve) => {
      const checkModalClosed = () => {
        if (!showEmailVerification) {
          resolve();
        } else {
          setTimeout(checkModalClosed, 100);
        }
      };
      // Start checking after a short delay
      setTimeout(checkModalClosed, 100);
    });
  };

  const handleShowCalendar = async (): Promise<void> => {
    console.log('📅 Showing calendar booking modal');
    setShowCalendar(true);
    
    // Return a Promise that resolves when modal closes
    return new Promise((resolve) => {
      const checkModalClosed = () => {
        if (!showCalendar) {
          resolve();
        } else {
          setTimeout(checkModalClosed, 100);
        }
      };
      // Start checking after a short delay
      setTimeout(checkModalClosed, 100);
    });
  };

  // Handle email verification completion callback
  const handleEmailVerified = async (email: string) => {
    console.log('✅ Email verified in wrapper:', email);
    setVerifiedEmail(email);
    setShowEmailVerification(false);
  };

  // Handle calendar booking completion
  const handleCalendarBooked = () => {
    console.log('✅ Calendar booking completed');
    setShowCalendar(false);
    // After calendar completes, trigger education completion
    handleEducationCompletionAfterEmail();
  };

  // NEW: Handle completion AFTER email verification completes
  const handleEducationCompletionAfterEmail = async () => {
    console.log('📧 Email verification completed, now proceeding to success overlay');
    
    setShowSuccess(true);
    
    // Trigger celebration - PRESERVAR EXACTAMENTE como está
    triggerConfetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF6347']
    });

    // FASE 4: Use connectWallet() abstraction instead of manual state management
    try {
      console.log('🔗 Using connectWallet() abstraction for wallet connection');
      const walletAddress = await connectWallet();
      console.log('✅ Wallet connected via abstraction:', walletAddress);
      
      // Proceed to EIP-712 generation after successful connection
      await processEIP712Generation();
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      // Show error state or allow retry
    }
  };

  // Separate function for EIP-712 generation after wallet connection
  const processEIP712Generation = async () => {
    try {
      // CRITICAL FIX: Verificar que todos los campos requeridos estén presentes
      if (sessionToken && tokenId && account?.address) {
          console.log('🎓 Submitting education completion with all required fields:', {
            sessionToken: sessionToken.substring(0, 10) + '...',
            tokenId,
            claimer: account.address.substring(0, 10) + '...',
            module: lessonId
          });

          // Call education approval API to mark as completed
          const response = await fetch('/api/education/approve', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionToken: sessionToken,
              tokenId: tokenId,
              claimer: account.address, // CRITICAL FIX: Agregar claimer requerido
              giftId: 0, // Will be populated from session data in API
              educationCompleted: true,
              module: lessonId
            })
          });

          const approvalData = await response.json();
          console.log('🎓 Education API response:', { success: approvalData.success, hasGateData: !!approvalData.gateData });
          
          if (approvalData.success) {
            // Wait for celebration, then more confetti!
            setTimeout(() => {
              triggerConfetti({
                particleCount: 200,
                startVelocity: 30,
                spread: 360,
                ticks: 60,
                origin: {
                  x: Math.random(),
                  y: Math.random() - 0.2
                },
                colors: ['#FFD700', '#FF69B4', '#00CED1', '#FF6347', '#ADFF2F']
              });
              
              // Call completion callback with gate data
              onComplete(approvalData.gateData || '0x');
            }, 2000);
          } else {
            throw new Error(approvalData.error || 'Approval failed');
          }
      } else {
        // Should not happen since we check wallet connection before calling this
        console.error('❌ Missing required fields for EIP-712 generation');
        throw new Error('Missing wallet connection for signature generation');
      }
    } catch (error) {
      console.error('Education completion error:', error);
      // CRITICAL FIX: NO hacer fallback silencioso a '0x' - esto causa el error final  
      // En su lugar, mostrar el error al usuario y mantener modal abierto
      alert(`Error completing education: ${error.message}. Please ensure your wallet is connected and try again.`);
      setShowSuccess(false); // Volver al estado normal para permitir reintentos
      setShowConnectWallet(false); // Reset connect state
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ transform: 'scale(0.92)', transformOrigin: 'center' }}
      >
        <motion.div
          className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl max-w-6xl w-full h-screen overflow-hidden flex flex-col shadow-2xl transition-colors duration-300"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200/50 dark:border-gray-700/50 flex-shrink-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
                {mode === 'educational' ? '🎓 Módulo Educativo Requerido' : '📚 Knowledge Academy'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {lessonId === 'sales-masterclass' ? 
                  (mode === 'educational' ? 
                    'Completa este módulo para desbloquear tu regalo cripto' : 
                    'Sales Masterclass - De $0 a $100M en 15 minutos') : 
                 lessonId === 'claim-first-gift' ? 'Reclama tu Primer Regalo Cripto - 7 minutos' : 
                 'Lección Interactive'}
              </p>
            </div>
            
            {/* Close button - solo mostrar en development o knowledge mode */}
            {(process.env.NODE_ENV === 'development' || mode === 'knowledge') && !showSuccess && (
              <button
                onClick={onClose}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg"
                title="Cerrar"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Success Overlay para Educational Mode */}
          {showSuccess && mode === 'educational' && (
            <motion.div
              className="absolute inset-0 z-[10001] bg-gradient-to-br from-green-900 via-black to-purple-900 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="text-center text-white max-w-2xl mx-auto p-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                >
                  <div className="text-8xl mb-6">🎓</div>
                </motion.div>
                
                <motion.h1
                  className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  ¡EDUCACIÓN COMPLETADA!
                </motion.h1>
                
                <motion.p
                  className="text-2xl mb-8 text-gray-300"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  Ahora entiendes el poder de CryptoGift
                </motion.p>
                
                <motion.div
                  className="space-y-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-4">
                    <p className="text-green-400 font-bold text-xl">
                      ✅ {lessonId === 'sales-masterclass' ? 'Sales Masterclass' : 
                         lessonId === 'claim-first-gift' ? 'Reclama tu Primer Regalo' : 
                         'Módulo'} - COMPLETADO
                    </p>
                    <p className="text-green-300 text-sm mt-2">
                      Has completado exitosamente el módulo educativo
                    </p>
                  </div>
                  
                  {/* CONNECT WALLET USING THIRDWEB MODAL - NO OVERLAY PANEL */}
                  {showConnectWallet ? (
                    <>
                      <div className="bg-blue-900/30 border border-blue-500/50 rounded-xl p-4 mb-4">
                        <p className="text-blue-400 font-bold text-lg mb-2">
                          🔗 Ahora conecta tu wallet para reclamar el regalo
                        </p>
                        <p className="text-blue-300 text-sm">
                          Para generar tu certificación EIP-712 necesitamos verificar tu identidad con la wallet
                        </p>
                      </div>
                      
                      {/* USE THIRDWEB CONNECT BUTTON - NOT CUSTOM OVERLAY */}
                      <div className="flex justify-center">
                        <ConnectButton
                          client={client}
                          chain={baseSepolia}
                          connectModal={{
                            size: "wide",
                            titleIcon: "🔗",
                            showThirdwebBranding: false,
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <motion.div
                        className="px-12 py-4 bg-gradient-to-r from-yellow-500 to-green-500 text-black font-bold text-xl rounded-xl"
                        animate={{ 
                          boxShadow: [
                            '0 0 20px rgba(255, 215, 0, 0.5)',
                            '0 0 40px rgba(255, 215, 0, 0.8)',
                            '0 0 20px rgba(255, 215, 0, 0.5)'
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        Generando tu certificación EIP-712...
                      </motion.div>
                      
                      <p className="text-gray-400 text-sm">
                        Procesando tu credencial educativa...
                      </p>
                    </>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Lesson Content */}
          {!showSuccess && (
            <div className="flex-1 overflow-y-auto min-h-0">
              {lessonId === 'sales-masterclass' ? (
                <div className="h-full">
                  <SalesMasterclass
                    educationalMode={mode === 'educational'}
                    onEducationComplete={handleLessonComplete}
                    onShowEmailVerification={handleShowEmailVerification}
                    onShowCalendar={handleShowCalendar}
                    verifiedEmail={verifiedEmail}
                  />
                </div>
              ) : lessonId === 'claim-first-gift' ? (
                <div className="h-full">
                  <ClaimFirstGift
                    educationalMode={mode === 'educational'}
                    onEducationComplete={handleLessonComplete}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full py-20">
                  <div className="text-center text-white">
                    <div className="text-6xl mb-4">📚</div>
                    <h2 className="text-2xl font-bold mb-2">Lección no encontrada</h2>
                    <p className="text-gray-400">La lección "{lessonId}" no está disponible.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer - Educational mode progress indicator */}
          {mode === 'educational' && !showSuccess && (
            <div className="border-t border-gray-700 p-4 flex-shrink-0">
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>Módulo Educativo Requerido</span>
                <span>🎯 Completa para desbloquear tu regalo</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* EMAIL VERIFICATION MODAL - ONLY SHOW WHEN NOT SUCCESS OVERLAY */}
        {!showSuccess && (
          <>
            <EmailVerificationModal
              isOpen={showEmailVerification}
              onClose={() => setShowEmailVerification(false)}
              onVerified={handleEmailVerified}
              source="educational-masterclass"
              title="📧 ¡Necesitamos tu Email!"
              subtitle="Para enviarte información exclusiva sobre cripto"
            />

            <CalendarBookingModal
              isOpen={showCalendar}
              onClose={handleCalendarBooked}
              userEmail={verifiedEmail || undefined}
              source="educational-masterclass"
            />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default LessonModalWrapper;