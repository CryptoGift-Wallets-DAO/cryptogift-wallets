"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useActiveAccount } from 'thirdweb/react';
import { generateSalt } from '../../lib/escrowUtils';
import { useNotifications } from '../ui/NotificationSystem';
import { useAuth } from '../../hooks/useAuth';
import { ConnectAndAuthButton } from '../ConnectAndAuthButton';
import { NFTImageModal } from '../ui/NFTImageModal';

interface PreClaimFlowProps {
  tokenId: string;
  onValidationSuccess: (sessionToken: string, requiresEducation: boolean) => void;
  giftInfo?: {
    creator: string;
    nftContract: string;
    expirationTime: number;
    status: 'active' | 'expired' | 'claimed' | 'returned' | 'pending' | 'cancelled';
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

  // Generate salt on mount
  useEffect(() => {
    setSalt(generateSalt());
  }, []);

  // Handle password validation
  const handleValidation = async () => {
    if (!password || password.length < 6) {
      addNotification({
        type: 'error',
        title: 'Contraseña Inválida',
        message: 'La contraseña debe tener al menos 6 caracteres',
        duration: 5000
      });
      return;
    }

    setValidationState({ ...validationState, isValidating: true, error: undefined });

    try {
      // Get device ID for rate limiting
      const deviceId = localStorage.getItem('deviceId') || 
        `device_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('deviceId', deviceId);

      const response = await fetch('/api/pre-claim/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenId,
          password,
          salt,
          deviceId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle rate limiting
        if (response.status === 429) {
          setValidationState({
            ...validationState,
            isValidating: false,
            error: 'Demasiados intentos. Por favor espera un momento.',
            remainingAttempts: data.remainingAttempts
          });
          
          addNotification({
            type: 'error',
            title: '⏱️ Límite de Intentos',
            message: `Por favor espera 1 minuto antes de intentar nuevamente. Intentos restantes: ${data.remainingAttempts || 0}`,
            duration: 10000
          });
          return;
        }

        throw new Error(data.error || 'Validation failed');
      }

      if (data.valid) {
        setValidationState({
          isValidating: false,
          isValid: true,
          requiresEducation: data.requiresEducation,
          educationRequirements: data.educationRequirements,
          sessionToken: data.sessionToken
        });

        // Show success notification
        addNotification({
          type: 'success',
          title: '✅ Contraseña Correcta',
          message: data.requiresEducation 
            ? 'Ahora necesitas completar algunos módulos educativos'
            : 'Puedes proceder a reclamar tu regalo',
          duration: 5000
        });

        // Small delay for UX
        setTimeout(() => {
          onValidationSuccess(data.sessionToken, data.requiresEducation);
        }, 1500);

      } else {
        setValidationState({
          ...validationState,
          isValidating: false,
          error: data.error || 'Contraseña incorrecta',
          remainingAttempts: data.remainingAttempts
        });

        addNotification({
          type: 'error',
          title: '❌ Validación Fallida',
          message: data.error || 'La contraseña no es correcta',
          duration: 5000
        });
      }

    } catch (error: any) {
      console.error('Validation error:', error);
      setValidationState({
        ...validationState,
        isValidating: false,
        error: error.message || 'Error al validar la contraseña'
      });

      addNotification({
        type: 'error',
        title: '⚠️ Error de Conexión',
        message: 'No se pudo validar la contraseña. Intenta nuevamente.',
        duration: 5000
      });
    }
  };

  // Calculate total education time
  const getTotalEducationTime = () => {
    if (!validationState.educationRequirements) return 0;
    return validationState.educationRequirements.reduce((total, req) => total + req.estimatedTime, 0);
  };

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        
        {/* NFT Display - EXACTLY like ClaimEscrowInterface */}
        {nftMetadata && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-6 border-b border-gray-200 dark:border-gray-600">
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
              {nftMetadata.image && (
                <div 
                  className="flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => {
                    setImageModalData({
                      isOpen: true,
                      image: nftMetadata.image!,
                      name: nftMetadata.name || `CryptoGift NFT #${tokenId}`,
                      tokenId: tokenId,
                      contractAddress: giftInfo?.nftContract || process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS || ''
                    });
                  }}
                  title="Click to view full image"
                >
                  <img 
                    src={nftMetadata.image} 
                    alt={nftMetadata.name || 'Gift NFT'}
                    style={{
                      maxWidth: '128px',
                      maxHeight: '128px',
                      width: 'auto',
                      height: 'auto',
                      display: 'block'
                    }}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg"
                  />
                </div>
              )}
              <div className="flex-1 text-center sm:text-left">
                {nftMetadata.name && (
                  <h3 className="font-medium text-gray-900 dark:text-white">{nftMetadata.name}</h3>
                )}
                {nftMetadata.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{nftMetadata.description}</p>
                )}
                
                {/* Gift Status Info */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-center sm:justify-start">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      🎁 Gift Activo
                    </span>
                  </div>
                  {giftInfo?.timeRemaining && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      ⏰ Expira en: {giftInfo.timeRemaining}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Authentication Section - EXACTLY like ClaimEscrowInterface */}
        {!auth.isAuthenticated ? (
          <div className="p-6 mb-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <div className="text-yellow-600 dark:text-yellow-400 text-xl mr-3">🔐</div>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-1">
                    Authentication Required
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    You need to authenticate with your wallet to validate and claim this gift securely.
                  </p>
                </div>
              </div>
            </div>
            
            <ConnectAndAuthButton 
              showAuthStatus={true}
              className="w-full"
              onAuthChange={(isAuthenticated) => {
                if (isAuthenticated) {
                  console.log('✅ User authenticated, can now validate gift');
                }
              }}
            />
          </div>
        ) : (
          <div className="p-6 mb-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center text-green-800 dark:text-green-400">
                <span className="text-green-600 dark:text-green-400 mr-2">✅</span>
                <span className="text-sm font-medium">Wallet authenticated - Ready to validate gift</span>
              </div>
            </div>
          </div>
        )}

        {/* Validation Form - EXACTLY like ClaimEscrowInterface styling */}
        {auth.isAuthenticated && (
          <div className="p-6 space-y-4">
            {!validationState.isValid ? (
              <>
                {/* Password Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gift Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleValidation()}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="Enter the gift password"
                      disabled={validationState.isValidating}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {validationState.error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex">
                      <svg className="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {validationState.error}
                        </p>
                        {validationState.remainingAttempts !== undefined && (
                          <p className="text-xs text-red-500 dark:text-red-500 mt-1">
                            Intentos restantes: {validationState.remainingAttempts}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Validate Button - EXACTLY like Claim button styling */}
                <button
                  onClick={handleValidation}
                  disabled={validationState.isValidating || !password || !account}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                >
                  {validationState.isValidating ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Validating Gift...
                    </div>
                  ) : (
                    'Validar y Continuar'
                  )}
                </button>

                {!account && giftInfo?.status !== 'claimed' && giftInfo?.status !== 'returned' && !giftInfo?.isExpired && (
                  <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                    Connect your wallet to validate this gift
                  </p>
                )}
              </>
            ) : (
            <>
              {/* Validation Success */}
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full 
                              flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">✅</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  ¡Contraseña Correcta!
                </h3>
                
                {validationState.requiresEducation ? (
                  <>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Antes de reclamar tu regalo, necesitas completar algunos módulos educativos
                    </p>
                    
                    {/* Education Requirements */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-left">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                        Módulos Requeridos:
                      </h4>
                      <div className="space-y-2">
                        {validationState.educationRequirements?.map((req) => (
                          <div key={req.id} className="flex items-start">
                            <span className="text-purple-600 dark:text-purple-400 mr-2">📚</span>
                            <div className="flex-1">
                              <p className="font-medium text-gray-800 dark:text-gray-200">
                                {req.name}
                              </p>
                              {req.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {req.description}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                ⏱️ {req.estimatedTime} minutos
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Tiempo total estimado: {getTotalEducationTime()} minutos
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                      Redirigiendo a los módulos educativos...
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      No hay requisitos educativos. Puedes reclamar tu regalo ahora.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Redirigiendo al claim...
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </div>
        )}

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4">
          <div className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
            <span className="mr-1">🔒</span>
            <span>Tu información está protegida y encriptada</span>
          </div>
        </div>
      </div>
    </div>
  );
};