"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { generateSalt } from '../../lib/escrowUtils';
import { useNotifications } from '../ui/NotificationSystem';

interface PreClaimFlowProps {
  tokenId: string;
  onValidationSuccess: (sessionToken: string, requiresEducation: boolean) => void;
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
  className = ''
}) => {
  const router = useRouter();
  const { addNotification } = useNotifications();
  const [password, setPassword] = useState('');
  const [salt, setSalt] = useState<string>('');
  const [validationState, setValidationState] = useState<ValidationState>({
    isValidating: false,
    isValid: false,
    requiresEducation: false
  });
  const [showPassword, setShowPassword] = useState(false);

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
    <div className={`max-w-md mx-auto ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <span className="text-3xl">🎁</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center">
            Validación de Regalo
          </h2>
          <p className="text-center text-white/90 mt-2">
            Ingresa la contraseña para acceder a tu regalo
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!validationState.isValid ? (
            <>
              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contraseña del Regalo
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleValidation()}
                    placeholder="Ingresa la contraseña"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-purple-500 focus:border-transparent
                             placeholder-gray-400 dark:placeholder-gray-500"
                    disabled={validationState.isValidating}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 
                             dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {validationState.error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {validationState.error}
                  </p>
                  {validationState.remainingAttempts !== undefined && (
                    <p className="text-xs text-red-500 dark:text-red-500 mt-1">
                      Intentos restantes: {validationState.remainingAttempts}
                    </p>
                  )}
                </div>
              )}

              {/* Validate Button */}
              <button
                onClick={handleValidation}
                disabled={validationState.isValidating || !password}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white 
                         font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 
                         transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed 
                         disabled:transform-none disabled:shadow-none"
              >
                {validationState.isValidating ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Validando...
                  </span>
                ) : (
                  'Validar y Continuar'
                )}
              </button>

              {/* Help Text */}
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ¿No tienes la contraseña?
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Contacta a quien te envió el regalo
                </p>
              </div>
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