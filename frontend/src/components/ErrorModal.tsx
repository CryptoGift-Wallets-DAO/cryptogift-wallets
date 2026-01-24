"use client";

import React from 'react';
import { CryptoGiftError, ErrorType } from '../lib/errorHandler';
import { useTranslations } from 'next-intl';

interface ErrorModalProps {
  isOpen: boolean;
  error: CryptoGiftError | Error | null;
  onClose: () => void;
  onRetry?: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, error, onClose, onRetry }) => {
  const t = useTranslations('errorModal');

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
        return t('titles.network');
      case ErrorType.VALIDATION:
        return t('titles.validation');
      case ErrorType.RATE_LIMIT:
        return t('titles.rateLimit');
      case ErrorType.API_KEY:
        return t('titles.apiKey');
      case ErrorType.CONTRACT:
        return t('titles.contract');
      default:
        return t('titles.unknown');
    }
  };

  const getStepByStepSolution = () => {
    const getSolutionKey = () => {
      switch (errorType) {
        case ErrorType.NETWORK: return 'network';
        case ErrorType.VALIDATION: return 'validation';
        case ErrorType.RATE_LIMIT: return 'rateLimit';
        case ErrorType.API_KEY: return 'apiKey';
        case ErrorType.CONTRACT: return 'contract';
        default: return 'unknown';
      }
    };
    const key = getSolutionKey();
    return [
      t(`solutions.${key}.step1`),
      t(`solutions.${key}.step2`),
      t(`solutions.${key}.step3`),
      t(`solutions.${key}.step4`)
    ];
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
              💡 {t('howToFix')}
            </h4>
            <div className="space-y-2">
              {getStepByStepSolution().map((step, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs flex items-center justify-center font-medium">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-700">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Technical details for developers */}
          {cryptoGiftError?.details && process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <h5 className="text-xs font-medium text-gray-500 mb-2">
                {t('technicalDetails')}
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
                <strong>{t('errorCode')}</strong> {cryptoGiftError.code}
                <br />
                <em>{t('mentionCode')}</em>
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
              🔄 {t('buttons.retry')}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            {t('buttons.close')}
          </button>
        </div>

        {/* Contact support */}
        <div className="px-6 pb-6">
          <div className="text-center">
            <p className="text-xs text-gray-500">
              {t('needHelp')}{' '}
              <a
                href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@mbxarts.com'}`}
                className="text-blue-600 hover:text-blue-700"
              >
                {t('contactSupport')}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};