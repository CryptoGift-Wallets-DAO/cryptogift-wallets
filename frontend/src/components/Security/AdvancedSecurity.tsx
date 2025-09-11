"use client";

import React, { useState, useEffect } from 'react';

interface Guardian {
  id: string;
  address: string;
  email: string;
  name: string;
  status: 'pending' | 'active' | 'revoked';
  addedAt: string;
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  socialRecoveryEnabled: boolean;
  guardians: Guardian[];
  backupCodes: string[];
}

interface AdvancedSecurityProps {
  walletAddress: string;
  className?: string;
}

export const AdvancedSecurity: React.FC<AdvancedSecurityProps> = ({
  walletAddress,
  className = ""
}) => {
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    socialRecoveryEnabled: false,
    guardians: [],
    backupCodes: []
  });
  const [showSetup, setShowSetup] = useState(false);
  const [setupStep, setSetupStep] = useState<'2fa' | 'recovery' | 'guardians'>('2fa');
  const [qrCode, setQrCode] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [newGuardianEmail, setNewGuardianEmail] = useState('');
  const [newGuardianName, setNewGuardianName] = useState('');

  useEffect(() => {
    loadSecuritySettings();
  }, [walletAddress]);

  const loadSecuritySettings = () => {
    // Load from localStorage for now
    const saved = localStorage.getItem(`security_${walletAddress}`);
    if (saved) {
      setSecuritySettings(JSON.parse(saved));
    }
  };

  const saveSecuritySettings = (settings: SecuritySettings) => {
    localStorage.setItem(`security_${walletAddress}`, JSON.stringify(settings));
    setSecuritySettings(settings);
  };

  const enable2FA = async () => {
    setIsLoading(true);
    try {
      // Generate QR code for Google Authenticator
      const secret = generateTOTPSecret();
      const qrCodeUrl = `otpauth://totp/CryptoGift:${walletAddress}?secret=${secret}&issuer=CryptoGift`;
      
      // In a real implementation, you'd generate an actual QR code image
      setQrCode(qrCodeUrl);
      
      // Save the secret temporarily
      sessionStorage.setItem('temp_totp_secret', secret);
      
    } catch (error) {
      console.error('❌ Error enabling 2FA:', error);
      alert('Error al configurar 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const verify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      alert('Ingresa un código de 6 dígitos');
      return;
    }

    setIsLoading(true);
    try {
      // In a real implementation, verify the TOTP code
      // For demo, we'll just check if it's 6 digits
      const secret = sessionStorage.getItem('temp_totp_secret');
      
      if (verificationCode === '123456') { // Demo code
        const newSettings = {
          ...securitySettings,
          twoFactorEnabled: true,
          backupCodes: generateBackupCodes()
        };
        saveSecuritySettings(newSettings);
        
        sessionStorage.removeItem('temp_totp_secret');
        alert('¡2FA configurado exitosamente! Guarda tus códigos de respaldo.');
        setSetupStep('recovery');
      } else {
        alert('Código incorrecto. Usa 123456 para la demo.');
      }
    } catch (error) {
      console.error('❌ Error verifying 2FA:', error);
      alert('Error al verificar 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const addGuardian = async () => {
    if (!newGuardianEmail || !newGuardianName) {
      alert('Completa todos los campos');
      return;
    }

    setIsLoading(true);
    try {
      const newGuardian: Guardian = {
        id: Date.now().toString(),
        address: '', // Will be set when guardian accepts
        email: newGuardianEmail,
        name: newGuardianName,
        status: 'pending',
        addedAt: new Date().toISOString()
      };

      const newSettings = {
        ...securitySettings,
        guardians: [...securitySettings.guardians, newGuardian],
        socialRecoveryEnabled: true
      };
      
      saveSecuritySettings(newSettings);
      
      // In a real implementation, send invitation email
      console.log('📧 Sending guardian invitation to:', newGuardianEmail);
      
      setNewGuardianEmail('');
      setNewGuardianName('');
      
      alert(`Invitación enviada a ${newGuardianEmail}`);
      
    } catch (error) {
      console.error('❌ Error adding guardian:', error);
      alert('Error al agregar guardián');
    } finally {
      setIsLoading(false);
    }
  };

  const removeGuardian = (guardianId: string) => {
    const newSettings = {
      ...securitySettings,
      guardians: securitySettings.guardians.filter(g => g.id !== guardianId)
    };
    saveSecuritySettings(newSettings);
  };

  const disable2FA = () => {
    if (confirm('¿Estás seguro de querer deshabilitar 2FA? Esto reducirá la seguridad de tu wallet.')) {
      const newSettings = {
        ...securitySettings,
        twoFactorEnabled: false,
        backupCodes: []
      };
      saveSecuritySettings(newSettings);
    }
  };

  const generateTOTPSecret = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  const generateBackupCodes = (): string[] => {
    const codes = [];
    for (let i = 0; i < 8; i++) {
      codes.push(Math.random().toString(36).substr(2, 8).toUpperCase());
    }
    return codes;
  };

  const getSecurityScore = (): number => {
    let score = 0;
    if (securitySettings.twoFactorEnabled) score += 40;
    if (securitySettings.socialRecoveryEnabled) score += 30;
    if (securitySettings.guardians.length >= 3) score += 30;
    return score;
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-start space-x-4">
        {/* Security Icon */}
        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
          🔒
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 mb-2">
            Seguridad Avanzada
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Configura recuperación social y autenticación 2FA
          </p>
          
          {/* Security Score */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Puntuación de Seguridad</span>
              <span className={`text-sm font-bold ${
                getSecurityScore() >= 70 ? 'text-green-600' : 
                getSecurityScore() >= 40 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {getSecurityScore()}/100
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  getSecurityScore() >= 70 ? 'bg-green-500' : 
                  getSecurityScore() >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${getSecurityScore()}%` }}
              ></div>
            </div>
          </div>

          {/* Security Features Status */}
          <div className="space-y-3 mb-4">
            {/* 2FA Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${
                  securitySettings.twoFactorEnabled ? 'bg-green-500' : 'bg-gray-400'
                }`}></span>
                <span className="text-sm text-gray-700">Autenticación 2FA</span>
              </div>
              <button
                onClick={securitySettings.twoFactorEnabled ? disable2FA : () => {
                  setShowSetup(true);
                  setSetupStep('2fa');
                  enable2FA();
                }}
                className={`text-xs px-3 py-1 rounded-full ${
                  securitySettings.twoFactorEnabled 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                }`}
              >
                {securitySettings.twoFactorEnabled ? 'Deshabilitar' : 'Configurar'}
              </button>
            </div>

            {/* Social Recovery Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${
                  securitySettings.socialRecoveryEnabled ? 'bg-green-500' : 'bg-gray-400'
                }`}></span>
                <span className="text-sm text-gray-700">
                  Recuperación Social ({securitySettings.guardians.length} guardianes)
                </span>
              </div>
              <button
                onClick={() => {
                  setShowSetup(true);
                  setSetupStep('guardians');
                }}
                className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200"
              >
                Gestionar
              </button>
            </div>
          </div>
          
          {/* Main Action Button */}
          {!securitySettings.twoFactorEnabled && !securitySettings.socialRecoveryEnabled ? (
            <button
              onClick={() => {
                setShowSetup(true);
                setSetupStep('2fa');
                enable2FA();
              }}
              className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
            >
              🛡️ Configurar Seguridad
            </button>
          ) : (
            <button
              onClick={() => setShowSetup(true)}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              ⚙️ Gestionar Seguridad
            </button>
          )}
        </div>
      </div>

      {/* Setup Modal */}
      {showSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">
                {setupStep === '2fa' && 'Configurar 2FA'}
                {setupStep === 'recovery' && 'Códigos de Respaldo'}
                {setupStep === 'guardians' && 'Guardianes de Recuperación'}
              </h3>
              <button
                onClick={() => setShowSetup(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* 2FA Setup */}
            {setupStep === '2fa' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  1. Instala Google Authenticator o similar
                </p>
                <p className="text-sm text-gray-600">
                  2. Escanea este código QR (demo):
                </p>
                <div className="bg-gray-100 p-4 rounded-lg text-center">
                  <div className="text-xs text-gray-500 mb-2">QR Code placeholder</div>
                  <div className="text-xs font-mono bg-white p-2 rounded border">
                    {qrCode}
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Código de 6 dígitos (usa 123456)"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  maxLength={6}
                />
                <button
                  onClick={verify2FA}
                  disabled={isLoading}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Verificando...' : 'Verificar y Activar'}
                </button>
              </div>
            )}

            {/* Backup Codes */}
            {setupStep === 'recovery' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Guarda estos códigos de respaldo en un lugar seguro:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {securitySettings.backupCodes.map((code, index) => (
                    <div key={index} className="font-mono text-sm py-1">
                      {index + 1}. {code}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setSetupStep('guardians')}
                  className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Continuar con Guardianes
                </button>
              </div>
            )}

            {/* Guardians Management */}
            {setupStep === 'guardians' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Los guardianes pueden ayudarte a recuperar tu wallet
                </p>
                
                {/* Existing Guardians */}
                {securitySettings.guardians.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-800">Guardianes Actuales:</h4>
                    {securitySettings.guardians.map((guardian) => (
                      <div key={guardian.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{guardian.name}</div>
                          <div className="text-xs text-gray-500">{guardian.email}</div>
                          <div className={`text-xs ${
                            guardian.status === 'active' ? 'text-green-600' : 
                            guardian.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {guardian.status === 'active' && '✅ Activo'}
                            {guardian.status === 'pending' && '⏳ Pendiente'}
                            {guardian.status === 'revoked' && '❌ Revocado'}
                          </div>
                        </div>
                        <button
                          onClick={() => removeGuardian(guardian.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Guardian */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-800 mb-3">Agregar Guardián:</h4>
                  <input
                    type="text"
                    placeholder="Nombre del guardián"
                    value={newGuardianName}
                    onChange={(e) => setNewGuardianName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg mb-3"
                  />
                  <input
                    type="email"
                    placeholder="Email del guardián"
                    value={newGuardianEmail}
                    onChange={(e) => setNewGuardianEmail(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg mb-3"
                  />
                  <button
                    onClick={addGuardian}
                    disabled={isLoading}
                    className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Agregando...' : 'Enviar Invitación'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};