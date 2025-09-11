"use client";

import React, { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';

interface GuardiansModalProps {
  isOpen: boolean;
  onClose: () => void;
  tbaAddress: string;
  walletAddress?: string;
}

interface GuardianStatus {
  hasGuardians: boolean;
  status: string;
  securityLevel: string;
  guardianInfo: {
    total: number;
    verified: number;
    allVerified: boolean;
    requiredSignatures: number;
  };
  recommendations: string[];
}

interface GuardianFormData {
  address: string;
  nickname: string;
  relationship: string;
  verificationMethod: 'email' | 'wallet_signature';
}

export const GuardiansModal: React.FC<GuardiansModalProps> = ({
  isOpen,
  onClose,
  tbaAddress,
  walletAddress
}) => {
  const activeAccount = useActiveAccount();
  const [guardians, setGuardians] = useState<GuardianFormData[]>([
    { address: '', nickname: '', relationship: 'family', verificationMethod: 'email' },
    { address: '', nickname: '', relationship: 'friend', verificationMethod: 'email' },
    { address: '', nickname: '', relationship: 'family', verificationMethod: 'email' }
  ]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentGuardianStatus, setCurrentGuardianStatus] = useState<GuardianStatus | null>(null);
  const [showEducationalModal, setShowEducationalModal] = useState(false);
  const [setupStep, setSetupStep] = useState<'info' | 'setup' | 'verification'>('info');

  const currentWallet = walletAddress || activeAccount?.address || tbaAddress;

  // Load current guardian status when modal opens
  useEffect(() => {
    if (isOpen && currentWallet) {
      loadGuardianStatus();
    }
  }, [isOpen, currentWallet]);

  const loadGuardianStatus = async () => {
    try {
      const response = await fetch(`/api/guardians/status?walletAddress=${currentWallet}`);
      const data = await response.json();
      
      if (data.success) {
        setCurrentGuardianStatus(data);
        setSetupStep(data.hasGuardians ? 'verification' : 'info');
      }
    } catch (error) {
      console.error('Error loading guardian status:', error);
    }
  };

  const handleGuardianChange = (index: number, field: string, value: string) => {
    const newGuardians = [...guardians];
    newGuardians[index] = { ...newGuardians[index], [field]: value };
    setGuardians(newGuardians);
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateEthereumAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const handleSetupGuardians = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate guardians
      const validGuardians = guardians.filter(g => {
        if (g.verificationMethod === 'email') {
          return g.address.trim() && validateEmail(g.address.trim()) && g.nickname.trim();
        } else {
          return g.address.trim() && validateEthereumAddress(g.address.trim()) && g.nickname.trim();
        }
      });

      if (validGuardians.length < 2) {
        throw new Error('Se requieren al menos 2 guardianes válidos');
      }

      const response = await fetch('/api/guardians/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: currentWallet,
          guardians: validGuardians.map(g => ({
            address: g.address.toLowerCase().trim(),
            nickname: g.nickname.trim(),
            relationship: g.relationship,
            verificationMethod: g.verificationMethod
          })),
          requiredSignatures: Math.min(2, validGuardians.length)
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('¡Sistema de guardianes configurado! Se han enviado códigos de verificación.');
        setSetupStep('verification');
        loadGuardianStatus();
      } else {
        throw new Error(data.message || 'Error configurando guardianes');
      }

    } catch (error) {
      console.error('Error setting up guardians:', error);
      setError(error instanceof Error ? error.message : 'Error configurando guardianes');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Guardian Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto">
          {/* Header with Importance Notice */}
          <div className="flex justify-between items-start p-6 border-b">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-2xl font-bold">🛡️ Sistema de Guardianes</h2>
                {/* Importance Badge */}
                <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                  🚨 CRÍTICO
                </div>
              </div>
              
              {/* Brief Importance Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                <p className="text-sm font-medium text-yellow-800">
                  <span className="mr-2">⚠️</span>
                  <strong>¡Es FUNDAMENTAL configurar guardianes!</strong> Sin ellos, podrías perder acceso permanente a tus fondos si pierdes tu wallet.
                </p>
                <button
                  onClick={() => setShowEducationalModal(true)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium underline mt-1 inline-flex items-center gap-1"
                >
                  <span>📚 Saber más</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              </div>

              {/* Current Status */}
              {currentGuardianStatus && (
                <div className="flex items-center gap-2">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    currentGuardianStatus.securityLevel === 'Maximum' ? 'bg-green-100 text-green-800' :
                    currentGuardianStatus.securityLevel === 'High' ? 'bg-blue-100 text-blue-800' :
                    currentGuardianStatus.securityLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    Seguridad: {currentGuardianStatus.securityLevel}
                  </div>
                  <span className="text-sm text-gray-600">
                    ({currentGuardianStatus.guardianInfo.verified}/{currentGuardianStatus.guardianInfo.total} verificados)
                  </span>
                </div>
              )}
            </div>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl ml-4"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Info Step */}
            {setupStep === 'info' && (
              <>
                {/* Why Guardians Matter */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-5 border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <span className="text-lg">🛡️</span>
                    ¿Por qué son tan importantes los Guardianes?
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
                    <div className="space-y-2">
                      <p className="flex items-start gap-2">
                        <span className="text-green-600">✅</span>
                        <span><strong>Protección contra pérdida:</strong> Si pierdes tu dispositivo o claves privadas</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <span className="text-green-600">✅</span>
                        <span><strong>Recuperación social:</strong> Tus contactos de confianza pueden ayudarte</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <span className="text-green-600">✅</span>
                        <span><strong>Seguridad multicapa:</strong> Require múltiples firmas para cambios</span>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="flex items-start gap-2">
                        <span className="text-red-600">❌</span>
                        <span><strong>Sin guardianes:</strong> Pérdida permanente de fondos</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <span className="text-red-600">❌</span>
                        <span><strong>No hay soporte:</strong> Nadie puede ayudarte a recuperar</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <span className="text-red-600">❌</span>
                        <span><strong>Riesgo total:</strong> Una sola falla = pérdida completa</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Setup CTA */}
                <div className="text-center space-y-4">
                  <button
                    onClick={() => setSetupStep('setup')}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
                  >
                    🚀 Configurar Guardianes Ahora (2 minutos)
                  </button>
                  <p className="text-sm text-gray-600">
                    Configuración rápida y segura • Privacidad garantizada • Cambios cuando quieras
                  </p>
                </div>
              </>
            )}

            {/* Setup Step */}
            {setupStep === 'setup' && (
              <>
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="font-semibold text-blue-800 mb-2">📋 Configuración de Guardianes</h3>
                  <p className="text-sm text-blue-700">
                    Agrega contactos de confianza que puedan verificar tu identidad si necesitas recuperar tu wallet.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-red-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="font-medium">Error</p>
                        <p className="text-sm mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="font-medium">Éxito</p>
                        <p className="text-sm mt-1">{success}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Guardian Inputs */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800">👥 Tus Guardianes</h3>
                  
                  {guardians.map((guardian, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="font-medium text-gray-700">
                          Guardián {index + 1}
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500">Método:</label>
                          <select
                            value={guardian.verificationMethod}
                            onChange={(e) => handleGuardianChange(index, 'verificationMethod', e.target.value)}
                            className="text-xs border rounded px-2 py-1"
                          >
                            <option value="email">📧 Email</option>
                            <option value="wallet_signature">💼 Wallet</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <input
                            type={guardian.verificationMethod === 'email' ? 'email' : 'text'}
                            value={guardian.address}
                            onChange={(e) => handleGuardianChange(index, 'address', e.target.value)}
                            placeholder={guardian.verificationMethod === 'email' ? 'email@ejemplo.com' : '0x...'}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                          />
                          {guardian.address && guardian.verificationMethod === 'email' && validateEmail(guardian.address) && (
                            <span className="text-green-500 text-xs">✅ Email válido</span>
                          )}
                          {guardian.address && guardian.verificationMethod === 'wallet_signature' && validateEthereumAddress(guardian.address) && (
                            <span className="text-green-500 text-xs">✅ Dirección válida</span>
                          )}
                        </div>
                        
                        <div>
                          <input
                            type="text"
                            value={guardian.nickname}
                            onChange={(e) => handleGuardianChange(index, 'nickname', e.target.value)}
                            placeholder="Nombre (ej: Juan, Mi hermana)"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <select
                          value={guardian.relationship}
                          onChange={(e) => handleGuardianChange(index, 'relationship', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        >
                          <option value="family">👨‍👩‍👧‍👦 Familia</option>
                          <option value="friend">👫 Amigo/a</option>
                          <option value="colleague">🤝 Colega</option>
                          <option value="trusted_contact">🔒 Contacto de confianza</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Security Features */}
                <div className="bg-green-50 rounded-xl p-4">
                  <h3 className="font-semibold text-green-800 mb-2">🔐 Características de Seguridad</h3>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>• <strong>Encriptación total:</strong> Los datos se almacenan encriptados</p>
                    <p>• <strong>Verificación múltiple:</strong> Se requieren 2 de 3 firmas para recuperación</p>
                    <p>• <strong>Tiempo de espera:</strong> 72 horas de bloqueo después de configurar</p>
                    <p>• <strong>Registros auditables:</strong> Todas las acciones quedan registradas</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setSetupStep('info')}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    ← Atrás
                  </button>
                  
                  <button
                    onClick={handleSetupGuardians}
                    disabled={loading || guardians.filter(g => {
                      if (g.verificationMethod === 'email') {
                        return g.address.trim() && validateEmail(g.address.trim()) && g.nickname.trim();
                      } else {
                        return g.address.trim() && validateEthereumAddress(g.address.trim()) && g.nickname.trim();
                      }
                    }).length < 2}
                    className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? '⏳ Configurando...' : '🛡️ Configurar Guardianes'}
                  </button>
                </div>
              </>
            )}

            {/* Verification Step */}
            {setupStep === 'verification' && currentGuardianStatus && (
              <>
                <div className="bg-green-50 rounded-xl p-4">
                  <h3 className="font-semibold text-green-800 mb-2">✅ Sistema de Guardianes Configurado</h3>
                  <p className="text-sm text-green-700">
                    Tu sistema de guardianes está {currentGuardianStatus.status === 'active' ? 'activo y protegiendo tu wallet' : 'configurado pero pendiente de verificación'}.
                  </p>
                </div>

                {/* Status Overview */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{currentGuardianStatus.guardianInfo.total}</div>
                    <div className="text-sm text-gray-600">Guardianes</div>
                  </div>
                  <div className="bg-white border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{currentGuardianStatus.guardianInfo.verified}</div>
                    <div className="text-sm text-gray-600">Verificados</div>
                  </div>
                  <div className="bg-white border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">{currentGuardianStatus.guardianInfo.requiredSignatures}</div>
                    <div className="text-sm text-gray-600">Firmas necesarias</div>
                  </div>
                </div>

                {/* Recommendations */}
                {currentGuardianStatus.recommendations.length > 0 && (
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <h3 className="font-semibold text-yellow-800 mb-2">💡 Recomendaciones</h3>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {currentGuardianStatus.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span>•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="text-center">
                  <button
                    onClick={onClose}
                    className="px-8 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                  >
                    ✅ Perfecto, estoy protegido
                  </button>
                </div>
              </>
            )}

            {/* Skip Option (only in setup) */}
            {setupStep !== 'verification' && (
              <div className="text-center border-t pt-4">
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 text-sm underline transition-colors"
                >
                  ⚠️ Configurar más tarde (no recomendado)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Educational Modal */}
      {showEducationalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold">📚 Importancia y Proceso de los Guardianes</h2>
              <button
                onClick={() => setShowEducationalModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Critical Importance */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-red-800 mb-4 flex items-center gap-2">
                  <span className="text-2xl">🚨</span>
                  Importancia CRÍTICA del Sistema de Guardianes
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-red-700 mb-2">❌ Sin Guardianes:</h4>
                    <ul className="text-red-700 space-y-1 text-sm">
                      <li>• Si pierdes tu teléfono/computadora = PÉRDIDA TOTAL</li>
                      <li>• Si olvidas tu clave privada = PÉRDIDA TOTAL</li>
                      <li>• Si tu dispositivo se daña = PÉRDIDA TOTAL</li>
                      <li>• Nadie puede ayudarte a recuperar</li>
                      <li>• Fondos bloqueados para siempre</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-700 mb-2">✅ Con Guardianes:</h4>
                    <ul className="text-green-700 space-y-1 text-sm">
                      <li>• Recuperación social segura</li>
                      <li>• Múltiples puntos de verificación</li>
                      <li>• Protección contra pérdida de dispositivo</li>
                      <li>• Respaldo humano confiable</li>
                      <li>• Tranquilidad total</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* How It Works */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-blue-800 mb-4">🔧 Cómo Funciona el Sistema</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">1</div>
                    <h4 className="font-semibold text-blue-800 mb-2">Configuración</h4>
                    <p className="text-sm text-blue-700">Agregas 3 contactos de confianza con sus emails o wallets</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">2</div>
                    <h4 className="font-semibold text-blue-800 mb-2">Verificación</h4>
                    <p className="text-sm text-blue-700">Cada guardián recibe un código y verifica su identidad</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">3</div>
                    <h4 className="font-semibold text-blue-800 mb-2">Protección</h4>
                    <p className="text-sm text-blue-700">2 de 3 guardianes pueden ayudarte a recuperar acceso</p>
                  </div>
                </div>
              </div>

              {/* Security Features */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-green-800 mb-4">🛡️ Características de Seguridad Extrema</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-green-700 mb-2">Protecciones Cryptográficas:</h4>
                    <ul className="text-green-700 space-y-1 text-sm">
                      <li>• Encriptación de datos personal</li>
                      <li>• Firmas múltiples requeridas</li>
                      <li>• Verificación temporal con delays</li>
                      <li>• Registros auditables inmutables</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-700 mb-2">Protecciones Sociales:</h4>
                    <ul className="text-green-700 space-y-1 text-sm">
                      <li>• Requiere 2 de 3 confirmaciones</li>
                      <li>• Período de espera obligatorio</li>
                      <li>• Verificación de identidad múltiple</li>
                      <li>• Cancelación de emergencia disponible</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Recovery Process */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-purple-800 mb-4">🔄 Proceso de Recuperación</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <h4 className="font-semibold text-purple-800">Solicitud de Recuperación</h4>
                      <p className="text-sm text-purple-700">Uno de tus guardianes inicia el proceso de recuperación</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <h4 className="font-semibold text-purple-800">Verificaciones Múltiples</h4>
                      <p className="text-sm text-purple-700">Al menos 2 guardianes deben confirmar tu identidad</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <h4 className="font-semibold text-purple-800">Período de Seguridad</h4>
                      <p className="text-sm text-purple-700">24 horas de espera obligatorio para prevenir ataques</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                    <div>
                      <h4 className="font-semibold text-purple-800">Acceso Restaurado</h4>
                      <p className="text-sm text-purple-700">Recuperas el control total de tu wallet y fondos</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Call to Action */}
              <div className="text-center bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-orange-800 mb-2">⏰ No Esperes Más</h3>
                <p className="text-orange-700 mb-4">
                  Cada día sin guardianes es un día de riesgo total. La configuración toma solo 2 minutos.
                </p>
                <button
                  onClick={() => {
                    setShowEducationalModal(false);
                    setSetupStep('setup');
                  }}
                  className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all transform hover:scale-105"
                >
                  🚀 Configurar Ahora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};