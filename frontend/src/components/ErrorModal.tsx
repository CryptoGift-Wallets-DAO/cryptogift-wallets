"use client";

import React from 'react';
import { CryptoGiftError, ErrorType } from '../lib/errorHandler';

interface ErrorModalProps {
  isOpen: boolean;
  error: CryptoGiftError | Error | null;
  onClose: () => void;
  onRetry?: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, error, onClose, onRetry }) => {
  if (!isOpen || !error) return null;

  const cryptoGiftError = error instanceof CryptoGiftError ? error : null;
  const errorType = cryptoGiftError?.type || ErrorType.UNKNOWN;
  
  const getErrorIcon = () => {
    switch (errorType) {
      case ErrorType.NETWORK:
        return '🌐';
      case ErrorType.VALIDATION:
        return '⚠️';
      case ErrorType.RATE_LIMIT:
        return '⏱️';
      case ErrorType.API_KEY:
        return '🔑';
      case ErrorType.CONTRACT:
        return '⛓️';
      default:
        return '❌';
    }
  };

  const getErrorTitle = () => {
    switch (errorType) {
      case ErrorType.NETWORK:
        return 'Error de Conexión';
      case ErrorType.VALIDATION:
        return 'Datos Inválidos';
      case ErrorType.RATE_LIMIT:
        return 'Demasiadas Solicitudes';
      case ErrorType.API_KEY:
        return 'Error de Configuración';
      case ErrorType.CONTRACT:
        return 'Error de Blockchain';
      default:
        return 'Error Inesperado';
    }
  };

  const getStepByStepSolution = () => {
    switch (errorType) {
      case ErrorType.NETWORK:
        return [
          "1. Verifica tu conexión a internet",
          "2. Refresca la página",
          "3. Desactiva VPN si la tienes activa",
          "4. Intenta nuevamente en unos minutos"
        ];
      case ErrorType.VALIDATION:
        return [
          "1. Verifica que todos los campos estén llenos",
          "2. Asegúrate de que el archivo sea una imagen (JPG, PNG)",
          "3. Confirma que el archivo sea menor a 10MB",
          "4. Intenta con una imagen diferente"
        ];
      case ErrorType.RATE_LIMIT:
        return [
          "1. Espera 1-2 minutos antes de intentar nuevamente",
          "2. No hagas múltiples intentos rápidos",
          "3. Verifica tu conexión a internet",
          "4. Si persiste, contacta soporte"
        ];
      case ErrorType.API_KEY:
        return [
          "1. Este es un error técnico del servidor",
          "2. Refresca la página",
          "3. Si persiste, contacta soporte técnico",
          "4. Menciona el código de error al contactar"
        ];
      case ErrorType.CONTRACT:
        return [
          "1. Verifica que tu wallet esté conectada",
          "2. Asegúrate de estar en la red Base Sepolia",
          "3. Confirma que tengas suficiente balance",
          "4. Intenta reducir el monto del regalo"
        ];
      default:
        return [
          "1. Refresca la página e intenta nuevamente",
          "2. Verifica tu conexión a internet",
          "3. Limpia el cache del navegador",
          "4. Si persiste, contacta soporte"
        ];
    }
  };

  const shouldShowRetry = errorType === ErrorType.NETWORK || errorType === ErrorType.UNKNOWN;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">{getErrorIcon()}</span>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {getErrorTitle()}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {cryptoGiftError?.userMessage || error.message}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-3">
              💡 Cómo solucionarlo:
            </h4>
            <div className="space-y-2">
              {getStepByStepSolution().map((step, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs flex items-center justify-center font-medium">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-700">{step.substring(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Technical details for developers */}
          {cryptoGiftError?.details && process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <h5 className="text-xs font-medium text-gray-500 mb-2">
                Detalles técnicos (solo desarrollo):
              </h5>
              <pre className="text-xs text-gray-600 overflow-x-auto">
                {JSON.stringify(cryptoGiftError.details, null, 2)}
              </pre>
            </div>
          )}

          {/* Error code for support */}
          {cryptoGiftError?.code && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>Código de error:</strong> {cryptoGiftError.code}
                <br />
                <em>Menciona este código al contactar soporte</em>
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 flex space-x-3">
          {shouldShowRetry && onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              🔄 Reintentar
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>

        {/* Contact support */}
        <div className="px-6 pb-6">
          <div className="text-center">
            <p className="text-xs text-gray-500">
              ¿Necesitas ayuda adicional?{' '}
              <a 
                href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@mbxarts.com'}`} 
                className="text-blue-600 hover:text-blue-700"
              >
                Contacta soporte
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};