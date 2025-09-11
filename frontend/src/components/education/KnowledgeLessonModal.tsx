/**
 * KNOWLEDGE LESSON MODAL
 * Modal wrapper que muestra lecciones de Knowledge en educational requirements
 * Mantiene exactamente el mismo timing y presentación que Knowledge Academy
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveAccount } from 'thirdweb/react';

// Simple confetti implementation to avoid external dependency
function triggerConfetti(options?: any) {
  // Visual confetti effect using CSS animation
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    
    // Create confetti elements
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
      
      // Animate falling
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
  
  console.log('🎉 Confetti effect triggered!', options);
}

interface KnowledgeLessonModalProps {
  lessonId: string;
  tokenId: string;
  sessionToken: string;
  onComplete: (gateData: string) => void;
  onClose?: () => void;
}

export const KnowledgeLessonModal: React.FC<KnowledgeLessonModalProps> = ({
  lessonId,
  tokenId,
  sessionToken,
  onComplete,
  onClose
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const account = useActiveAccount();

  console.log('📚 KNOWLEDGE LESSON MODAL INIT:', { 
    lessonId, 
    tokenId, 
    hasSessionToken: !!sessionToken,
    hasAccount: !!account?.address 
  });

  // Handle lesson completion
  const handleLessonComplete = async () => {
    if (!account?.address) {
      console.error('No wallet connected');
      return;
    }

    console.log('✅ LESSON COMPLETION TRIGGERED:', { lessonId });
    setIsCompleted(true);
    
    // Trigger celebration
    triggerConfetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF6347']
    });

    // Show success screen
    setShowSuccess(true);

    try {
      // Call education approval API to mark as completed
      const response = await fetch('/api/education/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionToken: sessionToken,
          tokenId: tokenId,
          claimer: account.address,
          giftId: 0, // Will be populated from session
          educationCompleted: true,
          module: lessonId
        })
      });

      const approvalData = await response.json();
      
      if (approvalData.success) {
        // Wait a bit for celebration
        setTimeout(() => {
          // More confetti!
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
          onComplete(approvalData.gateData);
        }, 2000);
      } else {
        throw new Error(approvalData.error || 'Approval failed');
      }
    } catch (error) {
      console.error('Education completion error:', error);
      // Still proceed even if API fails
      setTimeout(() => onComplete('0x'), 3000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Emergency Close Button (hidden by default) */}
          {process.env.NODE_ENV === 'development' && !isCompleted && (
            <button
              onClick={() => {
                setIsOpen(false);
                onClose?.();
              }}
              className="absolute top-4 right-4 z-[10000] text-gray-500 hover:text-gray-700 text-sm bg-white rounded-full px-3 py-1 shadow-lg"
            >
              [DEV] Cerrar X
            </button>
          )}

          {/* Success Overlay */}
          {showSuccess && (
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
                      ✅ {lessonId} - COMPLETADO
                    </p>
                    <p className="text-green-300 text-sm mt-2">
                      Has completado exitosamente el módulo educativo
                    </p>
                  </div>
                  
                  <motion.button
                    className="px-12 py-4 bg-gradient-to-r from-yellow-500 to-green-500 text-black font-bold text-xl rounded-xl hover:scale-105 transition-all"
                    animate={{ 
                      boxShadow: [
                        '0 0 20px rgba(255, 215, 0, 0.5)',
                        '0 0 40px rgba(255, 215, 0, 0.8)',
                        '0 0 20px rgba(255, 215, 0, 0.5)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    🎁 RECLAMAR MI REGALO AHORA
                  </motion.button>
                  
                  <p className="text-gray-400 text-sm">
                    Redirigiendo al claim en 3 segundos...
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Lesson Content */}
          {!showSuccess && (
            <div className="h-full overflow-y-auto">
              <CryptoGiftBasicsLesson onComplete={handleLessonComplete} />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Lección específica: Proyecto CryptoGift (basada en Knowledge Academy)
const CryptoGiftBasicsLesson: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const slides = [
    {
      id: 'intro',
      title: 'Proyecto CryptoGift',
      subtitle: 'La revolución de los regalos digitales',
      content: (
        <div className="text-center space-y-8">
          <div className="text-8xl mb-6">🎁</div>
          <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            CryptoGift Wallets
          </h1>
          <p className="text-2xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto">
            Transforma cualquier imagen en un NFT-Wallet funcional con cripto adentro. 
            Sin gas fees, sin complejidad técnica, solo magia blockchain.
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
              <div className="text-4xl mb-4">⛽</div>
              <h3 className="text-xl font-bold mb-2">Zero Gas Fees</h3>
              <p className="text-gray-600 dark:text-gray-400">Patrocinamos todas las transacciones</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
              <div className="text-4xl mb-4">🔄</div>
              <h3 className="text-xl font-bold mb-2">Auto-Conversión</h3>
              <p className="text-gray-600 dark:text-gray-400">USDC a cualquier token al instante</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
              <div className="text-4xl mb-4">🛡️</div>
              <h3 className="text-xl font-bold mb-2">Recuperación Social</h3>
              <p className="text-gray-600 dark:text-gray-400">Nunca pierdas acceso a tus fondos</p>
            </div>
          </div>
        </div>
      ),
      duration: 20
    },
    {
      id: 'how-it-works',
      title: 'Cómo Funciona',
      subtitle: 'La tecnología detrás de la magia',
      content: (
        <div className="space-y-8">
          <h2 className="text-4xl font-bold text-center mb-8">Tecnología ERC-6551</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-6 rounded-2xl border border-blue-500/30">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <span className="text-3xl">1️⃣</span>
                  Crear Regalo
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  Sube una imagen, agrega fondos USDC, y crea un NFT único que funciona como wallet
                </p>
              </div>
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-6 rounded-2xl border border-purple-500/30">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <span className="text-3xl">2️⃣</span>
                  Compartir Link
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  Envía el link único. El receptor solo necesita conectar su wallet para reclamar
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 p-6 rounded-2xl border border-green-500/30">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <span className="text-3xl">3️⃣</span>
                  Reclamar NFT-Wallet
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  El NFT se transfiere y automáticamente funciona como wallet con los fondos adentro
                </p>
              </div>
              <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 p-6 rounded-2xl border border-orange-500/30">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <span className="text-3xl">4️⃣</span>
                  Usar & Convertir
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  Convierte USDC a cualquier token, envía a otros wallets, o guarda como NFT coleccionable
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      duration: 30
    },
    {
      id: 'benefits',
      title: 'Beneficios Únicos',
      subtitle: 'Por qué CryptoGift es revolucionario',
      content: (
        <div className="space-y-8">
          <h2 className="text-4xl font-bold text-center mb-8">Ventajas Competitivas</h2>
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 p-8 rounded-2xl border border-red-500/30">
                <h3 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">❌ Métodos Tradicionales</h3>
                <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                  <li>💸 Gas fees altos e impredecibles</li>
                  <li>🔑 Riesgo de perder claves privadas</li>
                  <li>🤓 Complejidad técnica intimidante</li>
                  <li>💳 Gift cards que expiran</li>
                  <li>🏦 Dependencia de exchanges centralizados</li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-green-500/20 to-blue-500/20 p-8 rounded-2xl border border-green-500/30">
                <h3 className="text-2xl font-bold mb-4 text-green-600 dark:text-green-400">✅ CryptoGift Wallets</h3>
                <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                  <li>⛽ Zero gas fees (patrocinados por nosotros)</li>
                  <li>🛡️ Recuperación social con guardianes</li>
                  <li>📱 Simple como enviar un email</li>
                  <li>♾️ NFTs que nunca expiran</li>
                  <li>🔓 100% descentralizado y sin custodia</li>
                </ul>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-6 rounded-2xl border border-yellow-500/30 inline-block">
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  🚀 97% de adoption rate vs 3% tradicional
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      duration: 25
    },
    {
      id: 'future',
      title: 'Visión de Futuro',
      subtitle: 'Hacia dónde vamos',
      content: (
        <div className="space-y-8">
          <h2 className="text-4xl font-bold text-center mb-8">El Futuro es Exponencial</h2>
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-6 rounded-2xl border border-indigo-500/30">
                <h3 className="text-xl font-bold mb-3 text-indigo-600 dark:text-indigo-400">Fase 1: MVP</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-3">USDC + Arte generativo + Gas gratis</p>
                <p className="text-sm text-indigo-600 dark:text-indigo-400 font-bold">Meta: 100k regalos en 6 meses</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-6 rounded-2xl border border-purple-500/30">
                <h3 className="text-xl font-bold mb-3 text-purple-600 dark:text-purple-400">Fase 2: Escala</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-3">BTC/ETH + Badges + Eventos</p>
                <p className="text-sm text-purple-600 dark:text-purple-400 font-bold">Meta: 1M usuarios + 3 marcas globales</p>
              </div>
              <div className="bg-gradient-to-br from-pink-500/20 to-red-500/20 p-6 rounded-2xl border border-pink-500/30">
                <h3 className="text-xl font-bold mb-3 text-pink-600 dark:text-pink-400">Fase 3: Revolución</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-3">API para fintechs + Tokenización masiva</p>
                <p className="text-sm text-pink-600 dark:text-pink-400 font-bold">Meta: Oro, bonos, puntos de lealtad</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-r from-yellow-500/30 to-orange-500/30 p-8 rounded-2xl border-2 border-yellow-500/50">
                <p className="text-3xl font-bold mb-4">🌟 Nuestra Misión</p>
                <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
                  "Hacer que regalar crypto sea tan fácil como enviar una foto, 
                  conectando emociones con tecnología para traer la siguiente ola 
                  de usuarios a blockchain."
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      duration: 20
    }
  ];

  const [timeLeft, setTimeLeft] = useState(slides[0].duration);

  // Timer management
  useEffect(() => {
    if (timeLeft > 0 && !isCompleted) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && currentSlide < slides.length - 1) {
      // Auto advance to next slide
      setCurrentSlide(prev => prev + 1);
      setTimeLeft(slides[currentSlide + 1].duration);
    } else if (timeLeft === 0 && currentSlide === slides.length - 1) {
      // Lesson completed
      setIsCompleted(true);
      onComplete();
    }
  }, [timeLeft, currentSlide, slides, isCompleted, onComplete]);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
      setTimeLeft(slides[currentSlide + 1].duration);
    } else {
      setIsCompleted(true);
      onComplete();
    }
  };

  const currentSlideData = slides[currentSlide];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
              🎁
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {currentSlideData.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {currentSlideData.subtitle}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
            <p className="text-sm text-gray-500">
              Slide {currentSlide + 1} de {slides.length}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <motion.div
        key={currentSlide}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.5 }}
        className="min-h-[60vh] flex items-center"
      >
        {currentSlideData.content}
      </motion.div>

      {/* Navigation */}
      <div className="mt-8 flex justify-between items-center">
        <div className="flex gap-2">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className={`w-3 h-3 rounded-full transition-all ${
                idx === currentSlide 
                  ? 'bg-purple-500 w-8' 
                  : idx < currentSlide 
                    ? 'bg-green-400' 
                    : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
        
        <button
          onClick={handleNext}
          className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg"
        >
          {currentSlide === slides.length - 1 ? '✅ Completar Lección' : '➡️ Siguiente'}
        </button>
      </div>
    </div>
  );
};

export default KnowledgeLessonModal;