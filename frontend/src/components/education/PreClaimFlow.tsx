"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useActiveAccount } from 'thirdweb/react';
import { generateSalt } from '../../lib/escrowUtils';
import { useNotifications } from '../ui/NotificationSystem';
import { useAuth } from '../../hooks/useAuth';
import { ConnectAndAuthButton } from '../ConnectAndAuthButton';
import { NFTImageModal } from '../ui/NFTImageModal';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { 
  saveClaimSession, 
  loadClaimSession, 
  clearClaimSession,
  updateClaimSession,
  canSkipEducation,
  sessionNeedsRefresh
} from '../../lib/claimSessionStorage';

// Confetti function - misma que se usa en LessonModalWrapper
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

// Import EscrowGiftStatus para el panel izquierdo
import { EscrowGiftStatus } from '../escrow/EscrowGiftStatus';

// Import LessonModalWrapper - Sistema Unificado Knowledge ↔ Educational
import { LessonModalWrapper } from './LessonModalWrapper';

interface PreClaimFlowProps {
  tokenId: string;
  onValidationSuccess: (sessionToken: string, requiresEducation: boolean, educationGateData?: string, educationModules?: number[]) => void;
  giftInfo?: {
    creator: string;
    nftContract: string;
    expirationTime: number;
    status: 'active' | 'expired' | 'claimed' | 'returned';
    timeRemaining?: string;
    canClaim: boolean;
    isExpired: boolean;
  };
  nftMetadata?: {
    name?: string;
    description?: string;
    image?: string;
  };
  className?: string;
}

interface EducationRequirement {
  id: number;
  name: string;
  estimatedTime: number;
  description?: string;
}

interface ValidationState {
  isValidating: boolean;
  isValid: boolean;
  requiresEducation: boolean;
  educationRequirements?: EducationRequirement[];
  educationModules?: number[]; // Add modules to state
  sessionToken?: string;
  error?: string;
  remainingAttempts?: number;
}

export const PreClaimFlow: React.FC<PreClaimFlowProps> = ({
  tokenId,
  onValidationSuccess,
  giftInfo,
  nftMetadata,
  className = ''
}) => {
  const router = useRouter();
  const account = useActiveAccount();
  const auth = useAuth();
  const { addNotification } = useNotifications();
  const [password, setPassword] = useState('');
  const [salt, setSalt] = useState<string>('');
  const [validationState, setValidationState] = useState<ValidationState>({
    isValidating: false,
    isValid: false,
    requiresEducation: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [imageModalData, setImageModalData] = useState<{
    isOpen: boolean;
    image: string;
    name: string;
    tokenId: string;
    contractAddress: string;
  }>({ isOpen: false, image: '', name: '', tokenId: '', contractAddress: '' });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showEducationalModule, setShowEducationalModule] = useState(false);

  // Handler for opening educational module
  const handleOpenEducationalModule = useCallback(() => {
    console.log('🎓 Opening Educational Module');
    setShowEducationalModule(true);
  }, []);

  // State for showing reinit button
  const [canReinitialize, setCanReinitialize] = useState(false);

  // Generate salt on mount, recover session if exists, and trigger confetti
  useEffect(() => {
    // Try to recover existing session first
    const existingSession = loadClaimSession(tokenId);
    
    if (existingSession && !sessionNeedsRefresh(tokenId)) {
      console.log('🔄 Recovering existing session:', {
        tokenId,
        passwordValidated: existingSession.passwordValidated,
        educationCompleted: existingSession.educationCompleted,
        hasGateData: !!existingSession.educationGateData
      });
      
      // Restore session state
      setSalt(existingSession.salt);
      setValidationState({
        isValidating: false,
        isValid: existingSession.passwordValidated,
        requiresEducation: existingSession.requiresEducation,
        educationModules: existingSession.educationModules,
        sessionToken: existingSession.sessionToken
      });
      
      // If education was completed, show option to skip or restart
      if (existingSession.educationCompleted && existingSession.educationGateData) {
        setCanReinitialize(true);
        
        // Automatically call onValidationSuccess with recovered data
        onValidationSuccess(
          existingSession.sessionToken,
          existingSession.requiresEducation,
          existingSession.educationGateData,
          existingSession.educationModules
        );
      }
    } else {
      // Generate new salt if no valid session
      const newSalt = generateSalt();
      setSalt(newSalt);
      
      // AUDIT: Salt generation logging
      console.log('🧂 FRONTEND SALT GENERATION:', {
        salt: newSalt,
        saltType: typeof newSalt,
        saltLength: newSalt.length,
        saltStartsWith0x: newSalt.startsWith('0x'),
        timestamp: new Date().toISOString()
      });
      
      // Save initial session
      saveClaimSession(tokenId, {
        salt: newSalt,
        flowState: 'pre_validation',
        passwordValidated: false,
        educationCompleted: false
      });
    }
    
    // Trigger confetti when component mounts (user lands on claim page)
    triggerConfetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF6347']
    });
  }, [tokenId, onValidationSuccess]);

  // Check if password is required
  useEffect(() => {
    const checkPasswordRequirement = async () => {
      try {
        const response = await fetch(`/api/gift-has-password?tokenId=${tokenId}`);
        const data = await response.json();
        
        if (data.hasPassword && data.requiresEducation) {
          console.log('🎓 Gift requires education modules:', data.educationModules);
        }
      } catch (error) {
        console.error('Error checking password requirement:', error);
      }
    };
    
    if (tokenId) {
      checkPasswordRequirement();
    }
  }, [tokenId]);

  // Validate password with backend
  const handlePasswordValidation = async () => {
    if (!password) {
      setValidationState(prev => ({
        ...prev,
        error: 'Por favor, ingresa la contraseña del regalo'
      }));
      return;
    }

    // CRITICAL FIX: Allow password validation WITHOUT wallet
    // Wallet is ONLY required for EIP-712 signature at the END of education module
    // PASSWORD VALIDATION MUST WORK WITHOUT WALLET CONNECTION

    setValidationState(prev => ({
      ...prev,
      isValidating: true,
      error: undefined
    }));

    try {
      // PASSWORD VALIDATION PAYLOAD - NO WALLET REQUIRED
      const validationPayload = {
        tokenId,
        password,
        salt
        // REMOVED: claimer field - not needed for password validation
        // Wallet connection only required at final EIP-712 step
      };

      console.log('🔐 Validating password for token:', tokenId);

      const response = await fetch('/api/pre-claim/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationPayload)
      });

      const data = await response.json();
      console.log('📊 Password validation response:', {
        valid: data.valid,
        requiresEducation: data.requiresEducation,
        hasEducationGateData: !!data.educationGateData
      });

      if (data.valid) {
        setValidationState({
          isValidating: false,
          isValid: true,
          requiresEducation: data.requiresEducation || false,
          educationRequirements: data.educationRequirements,
          sessionToken: data.sessionToken,
          educationModules: data.educationModules // Store modules for later use
        });

        // Save session to localStorage for recovery
        saveClaimSession(tokenId, {
          sessionToken: data.sessionToken,
          salt,
          requiresEducation: data.requiresEducation || false,
          educationModules: data.educationModules,
          flowState: data.requiresEducation ? 'education' : 'claim',
          passwordValidated: true,
          educationCompleted: false,
          educationGateData: data.educationGateData || '0x'
        });

        // FIX: Pass the educationGateData and modules from validation
        onValidationSuccess(
          data.sessionToken,
          data.requiresEducation || false,
          data.educationGateData || '0x',
          data.educationModules // Pass modules directly
        );
      } else {
        setValidationState({
          isValidating: false,
          isValid: false,
          requiresEducation: false,
          error: data.message || 'Contraseña incorrecta',
          remainingAttempts: data.remainingAttempts
        });
      }
    } catch (error) {
      console.error('Error validating password:', error);
      setValidationState({
        isValidating: false,
        isValid: false,
        requiresEducation: false,
        error: 'Error al validar la contraseña. Por favor, intenta de nuevo.'
      });
    }
  };

  // Handle educational bypass approval
  const handleEducationalBypass = useCallback(async () => {
    if (!validationState.sessionToken) {
      console.error('No session token available for bypass');
      return;
    }

    // FIX: Don't allow bypass without wallet connected (same as validation)
    if (!account?.address) {
      addNotification({
        type: 'warning',
        title: 'Wallet Requerida',
        message: 'Necesitas conectar tu wallet para obtener la aprobación educativa',
        duration: 5000
      });
      return;
    }

    try {
      console.log('🎓 Requesting educational bypass approval...');
      const response = await fetch('/api/education/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId,
          sessionToken: validationState.sessionToken,
          claimer: account?.address // FIXED: Unified property name with API
        })
      });

      const data = await response.json();

      if (data.success && data.educationGateData) {
        console.log('✅ Educational bypass approved, proceeding to claim');
        
        // Update session as education completed
        updateClaimSession(tokenId, {
          educationCompleted: true,
          educationGateData: data.educationGateData,
          flowState: 'claim'
        });

        onValidationSuccess(
          validationState.sessionToken,
          false, // No education needed anymore
          data.educationGateData // EIP-712 signature
        );
      } else {
        console.error('Failed to get bypass approval:', data.error);
        addNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'No se pudo obtener la aprobación educativa',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error requesting bypass:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Error al procesar la solicitud. Por favor, intenta de nuevo.',
        duration: 5000
      });
    }
  }, [validationState.sessionToken, tokenId, account, onValidationSuccess, addNotification]);

  const isExpired = giftInfo?.isExpired || giftInfo?.status === 'expired';
  const isClaimed = giftInfo?.status === 'claimed';
  const cannotClaim = isExpired || isClaimed || giftInfo?.status === 'returned';

  return (
    <>
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 ${className}`}>
        {/* Panel Izquierdo - EXACTAMENTE IGUAL AL CLAIM FINAL */}
        <div>
          <EscrowGiftStatus
            tokenId={tokenId}
            giftInfo={giftInfo}
            nftMetadata={nftMetadata}
            isCreator={false}
            onRefresh={() => {
              // Refresh logic if needed
              window.location.reload();
            }}
            className="mb-6"
          />
          
          {/* Help Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              🎁 ¡Tu Regalo Te Está Esperando!
            </h3>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-white font-bold text-xs">💰</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Valor Real en Blockchain</p>
                  <p className="text-xs mt-1">Este NFT tiene valor monetario real que podrás intercambiar, vender o conservar como inversión.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-white font-bold text-xs">🚀</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Tecnología del Futuro</p>
                  <p className="text-xs mt-1">Únete a millones que ya usan Web3. Este es tu primer paso hacia la economía digital descentralizada.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-white font-bold text-xs">🎓</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Aprendizaje = Ganancias</p>
                  <p className="text-xs mt-1">En solo 5 minutos aprenderás a manejar activos digitales valorados en miles de millones globalmente.</p>
                </div>
              </div>
            </div>
            
            {/* Urgency Banner */}
            {giftInfo?.timeRemaining && !isExpired && (
              <div className="mt-4 p-3 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-lg border border-orange-300 dark:border-orange-700">
                <div className="flex items-center">
                  <span className="text-2xl mr-2 animate-pulse">⏰</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-orange-800 dark:text-orange-300">
                      ¡TIEMPO LIMITADO! {giftInfo.timeRemaining}
                    </p>
                    <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">
                      No pierdas esta oportunidad única. El regalo expira pronto.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel Derecho - Validación de Password */}
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            {/* Header con ganchos de venta */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-20 h-20 bg-gray-200/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-xl flex items-center justify-center animate-bounce shadow-lg">
                  <Image 
                    src="/Apex.PNG" 
                    alt="Apex Logo" 
                    width={50} 
                    height={50}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    ¡Felicidades! Has Recibido un Regalo
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Un activo digital de valor real te está esperando
                  </p>
                </div>
              </div>
              
              {/* Trust Indicators */}
              <div className="flex justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  100% Seguro
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-yellow-500">⭐</span>
                  +50,000 usuarios
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-blue-500">🔒</span>
                  Blockchain verificado
                </span>
              </div>
            </div>

            {/* Sales Hook Banner */}
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
              <div className="flex items-start">
                <div className="w-14 h-14 bg-gray-200/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-lg flex items-center justify-center mr-3 flex-shrink-0 shadow-md p-1">
                  <Image 
                    src="/cg-wallet-logo.png" 
                    alt="CG Wallet Logo" 
                    width={48} 
                    height={48}
                    className="object-contain w-full h-full"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-purple-800 dark:text-purple-300 mb-1 pr-3">
                    ¡Tu regalo es una NFT Wallet con tesoros dentro!
                  </h3>
                  <p className="text-sm text-purple-700 dark:text-purple-400">
                    No es solo un NFT común - es una billetera digital inteligente que puede contener 
                    criptomonedas, tokens y otros activos valiosos que el creador ha guardado especialmente para ti. 
                    ¡Descubre los tesoros que te esperan dentro!
                  </p>
                </div>
              </div>
            </div>

            {/* Password Validation Form */}
            {!cannotClaim ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    🔑 Contraseña del Regalo
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && password && !validationState.isValidating) {
                          handlePasswordValidation();
                        }
                      }}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="Ingresa la contraseña que te compartieron"
                      disabled={validationState.isValidating}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    La persona que te envió este regalo te debe haber compartido una contraseña
                  </p>
                </div>

                {/* Error Display */}
                {validationState.error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                    <div className="flex items-start">
                      <span className="text-red-500 mr-2">⚠️</span>
                      <div className="flex-1">
                        <p className="text-sm text-red-800 dark:text-red-300">{validationState.error}</p>
                        {validationState.remainingAttempts !== undefined && (
                          <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                            Intentos restantes: {validationState.remainingAttempts}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Show Continue or Restart buttons if session was recovered */}
                {canReinitialize && (
                  <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                    <div className="flex items-start">
                      <span className="text-green-500 text-xl mr-3">✅</span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-green-800 dark:text-green-300 mb-1">
                          Sesión de educación recuperada
                        </h4>
                        <p className="text-sm text-green-700 dark:text-green-400 mb-3">
                          Ya completaste los requisitos educativos anteriormente. Puedes continuar con el reclamo o reiniciar el proceso.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              // Continue with existing session
                              const session = loadClaimSession(tokenId);
                              if (session) {
                                onValidationSuccess(
                                  session.sessionToken,
                                  session.requiresEducation,
                                  session.educationGateData,
                                  session.educationModules
                                );
                              }
                            }}
                            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                          >
                            Continuar con el reclamo
                          </button>
                          <button
                            onClick={() => {
                              // Clear session and restart
                              clearClaimSession(tokenId);
                              setCanReinitialize(false);
                              setValidationState({
                                isValidating: false,
                                isValid: false,
                                requiresEducation: false
                              });
                              setPassword('');
                              const newSalt = generateSalt();
                              setSalt(newSalt);
                              saveClaimSession(tokenId, {
                                salt: newSalt,
                                flowState: 'pre_validation',
                                passwordValidated: false,
                                educationCompleted: false
                              });
                            }}
                            className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                          >
                            Reiniciar proceso
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Validate Button */}
                <button
                  onClick={handlePasswordValidation}
                  disabled={!password || validationState.isValidating || canReinitialize}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {validationState.isValidating ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Validando...
                    </div>
                  ) : (
                    <span className="flex items-center justify-center">
                      <span className="mr-2">🎯</span>
                      Validar Contraseña y Continuar
                    </span>
                  )}
                </button>

                {/* Educational Requirements Notice */}
                {validationState.requiresEducation && validationState.educationRequirements && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <div className="flex items-start">
                      <span className="text-blue-500 text-xl mr-3">🎓</span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">
                          Requisitos Educativos Detectados
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                          Este regalo requiere completar algunos módulos educativos cortos para asegurar que puedas manejarlo de forma segura.
                        </p>
                        <div className="space-y-1">
                          {validationState.educationRequirements.map((req) => (
                            <div key={req.id} className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                              <span className="mr-2">•</span>
                              <span>{req.name} (~{req.estimatedTime} min)</span>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={handleEducationalBypass}
                          className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                        >
                          Saltar requisitos educativos (usuario avanzado)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Motivational Messages */}
                <div className="mt-6 space-y-2">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Sin costos ocultos - 100% gratis para ti</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Proceso seguro verificado por blockchain</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Recibirás el NFT directamente en tu wallet</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Cannot Claim State */
              <div className="text-center py-6">
                <div className="text-4xl mb-4">
                  {isClaimed ? '✅' : isExpired ? '⏰' : '↩️'}
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {isClaimed ? 'Regalo ya reclamado' :
                   isExpired ? 'Regalo expirado' :
                   'Regalo no disponible'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {isClaimed ? 'Este regalo ya fue reclamado exitosamente.' :
                   isExpired ? 'El tiempo límite para reclamar este regalo ha expirado.' :
                   'Este regalo no está disponible para reclamar.'}
                </p>
              </div>
            )}
          </div>

          {/* Trust & Security Footer */}
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
                  🏆 ¿Por qué CryptoGift es diferente?
                </h4>
                <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                  <li>• <strong>Sin complicaciones:</strong> No necesitas experiencia previa en crypto</li>
                  <li>• <strong>100% Gratis:</strong> El remitente pagó todos los costos por ti</li>
                  <li>• <strong>Valor real:</strong> NFT con valor de mercado intercambiable</li>
                  <li>• <strong>Soporte 24/7:</strong> Te ayudamos en cada paso del proceso</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Educational Module Modal - Using Sales Masterclass with DAO Showcase */}
      {showEducationalModule && validationState.sessionToken && (
        <LessonModalWrapper
          lessonId="sales-masterclass"
          mode="educational"
          isOpen={showEducationalModule}
          onClose={() => {
            setShowEducationalModule(false);
            // After completing education, proceed with claim
            if (validationState.sessionToken) {
              handleEducationalBypass();
            }
          }}
          tokenId={tokenId}
          sessionToken={validationState.sessionToken}
          onComplete={(gateData) => {
            console.log('Education completed with gate data:', gateData);
            setShowEducationalModule(false);
            if (validationState.sessionToken) {
              handleEducationalBypass();
            }
          }}
        />
      )}

      {/* NFT Image Modal */}
      <NFTImageModal
        isOpen={imageModalData.isOpen}
        onClose={() => setImageModalData(prev => ({ ...prev, isOpen: false }))}
        image={imageModalData.image}
        name={imageModalData.name}
        tokenId={imageModalData.tokenId}
        contractAddress={imageModalData.contractAddress}
      />
    </>
  );
};