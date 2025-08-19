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

// Import EducationalMasterclass directly
import { EducationalMasterclass } from './EducationalMasterclass';

interface PreClaimFlowProps {
  tokenId: string;
  onValidationSuccess: (sessionToken: string, requiresEducation: boolean, educationGateData?: string) => void;
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showEducationalModule, setShowEducationalModule] = useState(false);
  const [forceRender, setForceRender] = useState(0);
  
  // Debug logging for state changes
  React.useEffect(() => {
    console.log('🔍 STATE CHANGE: showEducationalModule =', showEducationalModule);
    // Force re-render when showEducationalModule changes
    if (showEducationalModule) {
      setForceRender(prev => prev + 1);
    }
  }, [showEducationalModule]);

  // Stable handler for opening educational module
  const handleOpenEducationalModule = useCallback(() => {
    console.log('🎓 BUTTON CLICKED! Starting educational module...');
    setShowEducationalModule(true);
    console.log('🎓 State updated, showEducationalModule should be true now');
    
    // Additional force render trigger
    setTimeout(() => {
      setForceRender(prev => prev + 1);
      console.log('🔄 FORCE RENDER TRIGGERED');
    }, 100);
  }, []);

  // Generate salt on mount
  useEffect(() => {
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

      // AUDIT: Pre-transmission logging
      const requestPayload = {
        tokenId,
        password,
        salt,
        deviceId,
        claimer: account?.address || null // Send null if not connected, API will handle
      };
      
      console.log('🚀 FRONTEND PRE-TRANSMISSION:', {
        tokenId,
        passwordLength: password.length,
        // SECURITY C1 FIX: Removed password fragments from logs
        salt: salt,
        saltType: typeof salt,
        saltLength: salt.length,
        deviceId,
        claimer: requestPayload.claimer,
        claimerConnected: !!account?.address,
        timestamp: new Date().toISOString()
      });

      const response = await fetch('/api/pre-claim/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
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

        // If NO education required, proceed directly to claim
        if (!data.requiresEducation) {
          console.log('✅ No education required, proceeding to claim');
          // CRITICAL FIX A2: Call onValidationSuccess for no-education flow  
          // CRITICAL FIX A3: Pass gateData for consistent interface
          onValidationSuccess(data.sessionToken!, false, '0x'); // No education needed, empty gate data
        }
        // If education IS required, show bypass button (no auto-nav)
        // Let the user see and interact with the bypass button

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'expired': return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30';
      case 'claimed': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
      case 'returned': return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢';
      case 'expired': return '⏰';
      case 'claimed': return '✅';
      case 'returned': return '↩️';
      default: return '❓';
    }
  };

  const canClaim = giftInfo?.status === 'active' && !giftInfo?.isExpired && giftInfo?.canClaim;

  // Handle education bypass (simulates completing education)
  const handleEducationBypass = async () => {
    if (!validationState.sessionToken) return;

    // CRITICAL FIX: Require wallet connection before bypass
    if (!account?.address) {
      addNotification({
        type: 'error',
        title: 'Wallet Required',
        message: 'Please connect your wallet before bypassing education requirements',
        duration: 5000
      });
      return;
    }

    try {
      // Call education approval API to generate EIP-712 signature
      const response = await fetch('/api/education/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionToken: validationState.sessionToken,
          tokenId: tokenId,
          claimer: account.address, // ALWAYS use real address, never placeholder
          giftId: 0 // Will be populated from session data in API
        })
      });

      const approvalData = await response.json();
      
      if (approvalData.success) {
        addNotification({
          type: 'success',
          title: '✅ Education Bypass Activado',
          message: 'Gate contract está listo para procesar tu claim',
          duration: 5000
        });

        // Proceed to claim with education bypassed, passing the gateData
        onValidationSuccess(validationState.sessionToken!, false, approvalData.gateData); // Pass gateData from EIP-712 signature
      } else {
        throw new Error(approvalData.error || 'Bypass failed');
      }
    } catch (error: any) {
      console.error('Education bypass error:', error);
      addNotification({
        type: 'error',
        title: '⚠️ Bypass Error',
        message: 'No se pudo activar el bypass. Intenta nuevamente.',
        duration: 5000
      });
    }
  };

  if (validationState.isValid) {
    return (
      <div className={`max-w-md mx-auto ${className}`}>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6 text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-2">¡Contraseña Correcta!</h2>
          <p className="text-green-600 dark:text-green-400 mb-4">
            {validationState.requiresEducation 
              ? 'Necesitas completar algunos módulos educativos antes de reclamar'
              : 'Puedes proceder al proceso de claim'}
          </p>
          {validationState.requiresEducation && (
            <>
              <div className="text-sm text-green-700 dark:text-green-400 space-y-1 mb-6">
                <p>Módulos requeridos: {validationState.educationRequirements?.length || 0}</p>
                <p>Tiempo estimado: {getTotalEducationTime()} minutos</p>
              </div>
              
              {/* EDUCATION MODULE BUTTON */}
              <div className="space-y-3">
                <button
                  onClick={handleOpenEducationalModule}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-lg hover:scale-105 transition-all font-bold shadow-lg"
                  style={{
                    animation: 'pulse 1.43s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }}
                >
                  <div className="text-2xl mb-1">🎓 INICIAR MÓDULO EDUCATIVO</div>
                  <div className="text-sm font-normal">
                    Proyecto CryptoGift - 7 minutos
                  </div>
                </button>
                
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <div className="text-sm text-purple-700 dark:text-purple-300">
                    <p className="font-bold mb-2">📚 Módulo Requerido:</p>
                    <div className="space-y-1">
                      <p>✨ Proyecto CryptoGift - Introducción completa</p>
                      <p>⏱️ Duración: 7 minutos interactivos</p>
                      <p>🎯 Aprenderás: Qué es, cómo funciona y por qué es revolucionario</p>
                      <p>🎁 Al completar: Desbloquearás tu regalo</p>
                    </div>
                  </div>
                </div>
                
                {/* Dev bypass button (hidden in production) */}
                {process.env.NODE_ENV === 'development' && (
                  <button
                    onClick={handleEducationBypass}
                    className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    [DEV] Bypass Education
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        {/* Header - COPIADO 100% EXACTO DE ClaimEscrowInterface */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Image 
              src="/cg-wallet-logo.png" 
              alt="CryptoGift Wallet" 
              width={32} 
              height={32}
              className="rounded"
            />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Validar Gift Password
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Token ID: {tokenId}
          </p>
        </div>

        {/* Gift Status - COPIADO 100% EXACTO DE ClaimEscrowInterface */}
        {giftInfo && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Gift Status</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(giftInfo.status)}`}>
                {getStatusIcon(giftInfo.status)} {giftInfo.status.toUpperCase()}
              </span>
            </div>
            
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p>Creator: {giftInfo.creator.slice(0, 10)}...{giftInfo.creator.slice(-8)}</p>
              {giftInfo.timeRemaining && !giftInfo.isExpired && (
                <p>Time remaining: {giftInfo.timeRemaining}</p>
              )}
              {giftInfo.isExpired && (
                <p className="text-orange-600">⚠️ This gift has expired</p>
              )}
            </div>
          </div>
        )}

        {/* NFT Preview - COPIADO 100% EXACTO DE ClaimEscrowInterface */}
        {nftMetadata && (
          <div className="mb-6 text-center">
            {nftMetadata.image && (
              <div 
                className="mx-auto mb-2 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                style={{
                  maxWidth: '128px',
                  maxHeight: '128px',
                  width: 'fit-content',
                  height: 'fit-content'
                }}
                onClick={() => {
                  console.log('🖼️ Opening NFT image modal for validation:', tokenId);
                  setImageModalData({
                    isOpen: true,
                    image: nftMetadata.image!,
                    name: nftMetadata.name || `Gift NFT #${tokenId}`,
                    tokenId: tokenId,
                    contractAddress: giftInfo?.nftContract || ''
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
                  className="bg-gray-50 dark:bg-gray-700"
                />
              </div>
            )}
            {nftMetadata.name && (
              <h3 className="font-medium text-gray-900 dark:text-white">{nftMetadata.name}</h3>
            )}
            {nftMetadata.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{nftMetadata.description}</p>
            )}
          </div>
        )}

        {/* REMOVIDO: Authentication Section - NO DEBE PEDIR AUTENTICACIÓN EN PÁGINA INICIAL */}

        {/* Validation Form - COPIADO DE ClaimEscrowInterface pero adaptado para validación */}
        {canClaim ? (
          <div className="space-y-4">
            {/* Password Input - COPIADO 100% EXACTO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gift Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleValidation()}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter the gift password"
                disabled={validationState.isValidating}
                autoFocus
              />
            </div>

            {/* Advanced Options - COPIADO 100% EXACTO pero oculto por simplicidad inicial */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                disabled={validationState.isValidating}
              >
                <svg
                  className={`w-4 h-4 mr-2 transform transition-transform ${
                    showAdvanced ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Advanced Options
              </button>

              {showAdvanced && (
                <div className="mt-3 space-y-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div className="flex items-start">
                      <div className="text-blue-600 dark:text-blue-400 text-lg mr-2">ℹ️</div>
                      <div>
                        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-400">
                          Password Validation
                        </h4>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          Este paso valida tu contraseña antes del proceso de claim final. No se requiere conexión de wallet en este punto.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error Display - COPIADO 100% EXACTO */}
            {validationState.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{validationState.error}</p>
                {validationState.remainingAttempts !== undefined && (
                  <p className="text-xs text-red-500 mt-1">
                    Intentos restantes: {validationState.remainingAttempts}
                  </p>
                )}
              </div>
            )}

            {/* Validate Button - COPIADO 100% EXACTO pero cambiado texto */}
            <button
              onClick={handleValidation}
              disabled={validationState.isValidating || !password}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
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

            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Valida tu contraseña para continuar al proceso de claim
            </p>
          </div>
        ) : (
          /* Cannot Claim - COPIADO 100% EXACTO */
          <div className="text-center py-6">
            <div className="text-4xl mb-4">
              {giftInfo?.status === 'claimed' ? '✅' : 
               giftInfo?.status === 'returned' ? '↩️' : 
               giftInfo?.isExpired ? '⏰' : 
               giftInfo?.status === 'active' && !giftInfo?.canClaim ? '⏳' : '⏰'}
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {giftInfo?.status === 'claimed' ? '✅ Gift reclamado' :
               giftInfo?.status === 'returned' ? '↩️ Gift devuelto al creador' :
               giftInfo?.isExpired ? '⏰ Gift expirado' :
               giftInfo?.status === 'active' && !giftInfo?.canClaim ? '⏳ Gift todavía disponible...' :
               giftInfo?.status === 'active' ? '🎁 Gift disponible para reclamar' : 
               '⏰ Gift expirado'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {giftInfo?.status === 'claimed' ? 'Este gift ya ha sido reclamado exitosamente por otro usuario.' :
               giftInfo?.status === 'returned' ? 'El tiempo de reclamación expiró y el gift fue devuelto automáticamente a su creador.' :
               giftInfo?.isExpired ? 'El tiempo límite para reclamar este gift ha expirado. Ya no puede ser reclamado.' :
               giftInfo?.status === 'active' && !giftInfo?.canClaim ? 
                 `Este gift está activo y disponible para reclamar. Vence el ${new Date(giftInfo.expirationTime * 1000).toLocaleDateString('es-ES')} a las ${new Date(giftInfo.expirationTime * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.` :
               !giftInfo ? 'No se pudo cargar la información del gift. Verifica el enlace o intenta más tarde.' :
               giftInfo?.status === 'pending' ? 'Este gift está siendo procesado. Espera unos momentos e intenta nuevamente.' :
               giftInfo?.status === 'cancelled' ? 'Este gift fue cancelado por su creador y ya no está disponible.' :
               giftInfo?.status === 'active' ? `Este gift está disponible para reclamar. Vence el ${new Date(giftInfo.expirationTime * 1000).toLocaleDateString('es-ES')} a las ${new Date(giftInfo.expirationTime * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.` :
               'Este gift ha expirado y ya no puede ser reclamado.'}
            </p>
          </div>
        )}

        {/* Security Notice - COPIADO 100% EXACTO pero adaptado para validación */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Secure Password Validation:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
                <li>Your password is validated securely and never stored</li>
                <li>This step prepares your gift for the claim process</li>
                <li>Wallet connection will be required in the next step</li>
                <li>All validation is done client-side for maximum security</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* NFT IMAGE MODAL - COPIADO 100% EXACTO */}
      <NFTImageModal
        isOpen={imageModalData.isOpen}
        onClose={() => setImageModalData(prev => ({ ...prev, isOpen: false }))}
        image={imageModalData.image}
        name={imageModalData.name}
        tokenId={imageModalData.tokenId}
        contractAddress={imageModalData.contractAddress}
        metadata={{
          description: nftMetadata?.description || "A special NFT gift waiting to be claimed.",
          attributes: [
            { trait_type: "Status", value: giftInfo?.status.toUpperCase() || "ACTIVE" },
            { trait_type: "Network", value: "Base Sepolia" },
            { trait_type: "Type", value: "CryptoGift NFT" }
          ]
        }}
      />
      
      {/* Educational Masterclass Module */}
      {(() => {
        console.log('🔍 RENDER CHECK: About to check showEducationalModule =', showEducationalModule, 'forceRender =', forceRender);
        return null;
      })()}
      {(showEducationalModule || forceRender > 0) && showEducationalModule && (
        <div>
          {(() => {
            console.log('🔍 RENDERING EDUCATIONAL MODULE:', { 
              showEducationalModule, 
              tokenId,
              sessionToken: validationState.sessionToken 
            });
            return null;
          })()}
          {(() => {
            try {
              return (
                <EducationalMasterclass
                  tokenId={tokenId}
                  sessionToken={validationState.sessionToken || 'test-session'}
                  onComplete={(gateData) => {
                    console.log('🎉 EDUCATIONAL MODULE COMPLETED:', { gateData });
                    setShowEducationalModule(false);
                    onValidationSuccess(validationState.sessionToken || 'test-session', false, gateData);
                  }}
                  onClose={() => {
                    console.log('❌ EDUCATIONAL MODULE CLOSED');
                    setShowEducationalModule(false);
                  }}
                />
              );
            } catch (error) {
              console.error('❌ ERROR RENDERING EDUCATIONAL MODULE:', error);
              return (
                <div className="fixed inset-0 z-[9999] bg-red-500/80 flex items-center justify-center text-white">
                  <div className="bg-black p-6 rounded-lg">
                    <h3 className="text-lg font-bold mb-2">⚠️ Error Loading Educational Module</h3>
                    <p>Error: {String(error)}</p>
                    <button 
                      onClick={() => setShowEducationalModule(false)}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            }
          })()}
        </div>
      )}
    </div>
  );
};