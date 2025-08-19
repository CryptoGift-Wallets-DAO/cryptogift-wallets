/**
 * EDUCATIONAL MASTERCLASS WRAPPER
 * Integrates Sales Masterclass as Educational Requirement
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useActiveAccount } from 'thirdweb/react';
import confetti from 'canvas-confetti';

// Dynamic import to avoid SSR issues
const SalesMasterclass = dynamic(
  () => import('../learn/SalesMasterclass'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl">Cargando Módulo Educativo...</div>
      </div>
    )
  }
);

interface EducationalMasterclassProps {
  tokenId: string;
  sessionToken: string;
  onComplete: (gateData: string) => void;
  onClose?: () => void;
}

export const EducationalMasterclass: React.FC<EducationalMasterclassProps> = ({
  tokenId,
  sessionToken,
  onComplete,
  onClose
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const account = useActiveAccount();

  // Handle masterclass completion
  const handleMasterclassComplete = async () => {
    if (!account?.address) {
      console.error('No wallet connected');
      return;
    }

    setIsCompleted(true);
    
    // Trigger celebration
    confetti({
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
          module: 'proyecto-cryptogift'
        })
      });

      const approvalData = await response.json();
      
      if (approvalData.success) {
        // Wait a bit for celebration
        setTimeout(() => {
          // More confetti!
          confetti({
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

  // Custom wrapper for Sales Masterclass
  const MasterclassWrapper: React.FC = () => {
    // Intercept the lead submission to trigger completion
    useEffect(() => {
      // Listen for masterclass completion event
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'MASTERCLASS_COMPLETE') {
          handleMasterclassComplete();
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, []);

    return (
      <div className="educational-masterclass-container">
        <SalesMasterclass 
          educationalMode={true}
          onEducationComplete={handleMasterclassComplete}
        />
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] bg-black"
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
              className="absolute top-4 right-4 z-[10000] text-white/50 hover:text-white text-sm"
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
                      ✅ Proyecto CryptoGift - APROBADO
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

          {/* Masterclass Content */}
          {!showSuccess && (
            <div className="h-full overflow-y-auto">
              <MasterclassWrapper />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EducationalMasterclass;