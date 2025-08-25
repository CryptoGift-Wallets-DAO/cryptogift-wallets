/**
 * EMAIL VERIFICATION MODAL
 * Componente para capturar email y verificar con código OTP
 * Integrado con el sistema de design del proyecto
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Shield, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (email: string) => void;
  source?: string; // 'masterclass' | 'general'
  title?: string;
  subtitle?: string;
}

type VerificationStep = 'email' | 'code' | 'success' | 'error';

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerified,
  source = 'general',
  title = '✉️ Verificación de Email',
  subtitle = 'Necesitamos verificar tu email para continuar'
}) => {
  const [step, setStep] = useState<VerificationStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('email');
      setEmail('');
      setCode('');
      setError(null);
      setTimeLeft(0);
      setRemainingAttempts(null);
    }
  }, [isOpen]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const sendVerificationCode = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Por favor ingresa un email válido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/email/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source })
      });

      const data = await response.json();

      if (data.success) {
        setStep('code');
        setTimeLeft(600); // 10 minutes
        console.log('✅ Verification code sent to:', email);
      } else {
        if (data.rateLimited && data.retryAfter) {
          setTimeLeft(data.retryAfter);
          setError(`${data.message} Podrás intentar de nuevo en ${Math.ceil(data.retryAfter / 60)} minutos.`);
        } else {
          setError(data.message || 'Error enviando código');
        }
      }
    } catch (error) {
      setError('Error de conexión. Verifica tu internet.');
      console.error('❌ Send verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code || !/^\d{6}$/.test(code)) {
      setError('El código debe ser 6 dígitos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/email/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      const data = await response.json();

      if (data.success && data.verified) {
        setStep('success');
        setTimeout(() => {
          onVerified(email);
          onClose();
        }, 2000);
      } else {
        setError(data.message || 'Código incorrecto');
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
        if (data.expired) {
          setTimeout(() => setStep('email'), 3000);
        }
      }
    } catch (error) {
      setError('Error de conexión. Verifica tu internet.');
      console.error('❌ Verify code error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {title}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {subtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Email Input Step */}
            {step === 'email' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tu email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@email.com"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                    autoFocus
                    onKeyPress={(e) => e.key === 'Enter' && !loading && sendVerificationCode()}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={sendVerificationCode}
                  disabled={loading || !email || timeLeft > 0}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Enviando...</span>
                    </div>
                  ) : timeLeft > 0 ? (
                    `Reenviar en ${formatTime(timeLeft)}`
                  ) : (
                    'Enviar Código de Verificación'
                  )}
                </button>
              </motion.div>
            )}

            {/* Code Input Step */}
            {step === 'code' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="text-center">
                  <Shield className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Código enviado a <strong>{email}</strong>
                  </p>
                  {timeLeft > 0 && (
                    <div className="flex items-center gap-1 justify-center mt-2 text-xs text-blue-600 dark:text-blue-400">
                      <Clock className="w-4 h-4" />
                      <span>Expira en {formatTime(timeLeft)}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Código de 6 dígitos
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white text-center text-2xl font-mono letter-spacing-wide"
                    autoFocus
                    onKeyPress={(e) => e.key === 'Enter' && !loading && code.length === 6 && verifyCode()}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                    {remainingAttempts !== null && (
                      <span className="ml-2 text-xs">({remainingAttempts} intentos restantes)</span>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('email')}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cambiar Email
                  </button>
                  <button
                    onClick={verifyCode}
                    disabled={loading || code.length !== 6}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Verificando...</span>
                      </div>
                    ) : (
                      'Verificar'
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Success Step */}
            {step === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  ¡Email Verificado!
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Tu email ha sido verificado exitosamente
                </p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};