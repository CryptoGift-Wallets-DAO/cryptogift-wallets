"use client";

import React, { useState, useEffect } from 'react';
import { 
  TIMEFRAME_OPTIONS,
  TIMEFRAME_LABELS,
  TIMEFRAME_DESCRIPTIONS,
  type TimeframeOption,
  validatePassword,
  validateGiftMessage
} from '../../lib/escrowUtils';

interface GiftEscrowConfigProps {
  onConfigureEscrow: (config: EscrowConfig) => void;
  onSkipEscrow: () => void;
  initialConfig?: Partial<EscrowConfig>;
  isLoading?: boolean;
}

export interface EscrowConfig {
  enabled: boolean;
  password: string;
  confirmPassword: string;
  timeframe: TimeframeOption;
  giftMessage: string;
  recipientAddress?: string; // Optional specific recipient
}

export const GiftEscrowConfig: React.FC<GiftEscrowConfigProps> = ({
  onConfigureEscrow,
  onSkipEscrow,
  initialConfig,
  isLoading = false
}) => {
  const [config, setConfig] = useState<EscrowConfig>({
    enabled: initialConfig?.enabled ?? true,
    password: initialConfig?.password ?? '',
    confirmPassword: initialConfig?.confirmPassword ?? '',
    timeframe: initialConfig?.timeframe ?? 'SEVEN_DAYS',
    giftMessage: initialConfig?.giftMessage ?? '',
    recipientAddress: initialConfig?.recipientAddress ?? ''
  });

  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    giftMessage?: string;
    recipientAddress?: string;
  }>({});

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Validate form in real-time
  useEffect(() => {
    const newErrors: typeof errors = {};

    if (config.enabled) {
      // Validate password
      if (config.password) {
        const passwordValidation = validatePassword(config.password);
        if (!passwordValidation.valid) {
          newErrors.password = passwordValidation.message;
        }
      }

      // Validate password confirmation
      if (config.password && config.confirmPassword && config.password !== config.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }

      // Validate gift message
      if (config.giftMessage) {
        const messageValidation = validateGiftMessage(config.giftMessage);
        if (!messageValidation.valid) {
          newErrors.giftMessage = messageValidation.message;
        }
      }

      // Validate recipient address (basic ETH address check)
      if (config.recipientAddress && config.recipientAddress.length > 0) {
        if (!config.recipientAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
          newErrors.recipientAddress = 'Invalid Ethereum address';
        }
      }
    }

    setErrors(newErrors);
  }, [config]);

  const isValid = config.enabled ? (
    config.password.length >= 6 &&
    config.password === config.confirmPassword &&
    config.giftMessage.length > 0 &&
    Object.keys(errors).length === 0
  ) : true;

  const handleSubmit = () => {
    if (isValid) {
      onConfigureEscrow(config);
    }
  };

  const handleSkip = () => {
    onSkipEscrow();
  };

  const getTimeRemainingText = (timeframe: TimeframeOption) => {
    const timeConstants = {
      FIFTEEN_MINUTES: '15 minutes',
      SEVEN_DAYS: '7 days',
      FIFTEEN_DAYS: '15 days', 
      THIRTY_DAYS: '30 days'
    };
    return timeConstants[timeframe];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          🔒 Secure Gift with Temporal Escrow
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Add an extra layer of security with password protection and time-based claiming
        </p>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Enable Temporal Escrow
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Secure your gift with password protection and automatic returns if unclaimed
            </p>
          </div>
          <button
            onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.enabled 
                ? 'bg-blue-600' 
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
            disabled={isLoading}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Escrow Configuration (only shown when enabled) */}
      {config.enabled && (
        <div className="space-y-4">
          {/* Password Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gift Password *
              </label>
              <input
                type="password"
                value={config.password}
                onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.password 
                    ? 'border-red-300 dark:border-red-600' 
                    : 'border-gray-300 dark:border-gray-600'
                } dark:bg-gray-700 dark:text-white`}
                placeholder="Enter secure password"
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password *
              </label>
              <input
                type="password"
                value={config.confirmPassword}
                onChange={(e) => setConfig(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.confirmPassword 
                    ? 'border-red-300 dark:border-red-600' 
                    : 'border-gray-300 dark:border-gray-600'
                } dark:bg-gray-700 dark:text-white`}
                placeholder="Confirm password"
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Gift Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Gift Message *
            </label>
            <textarea
              value={config.giftMessage}
              onChange={(e) => setConfig(prev => ({ ...prev, giftMessage: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.giftMessage 
                  ? 'border-red-300 dark:border-red-600' 
                  : 'border-gray-300 dark:border-gray-600'
              } dark:bg-gray-700 dark:text-white`}
              placeholder="Enter a message for the gift recipient..."
              rows={3}
              maxLength={191}
              disabled={isLoading}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.giftMessage && (
                <p className="text-red-500 text-xs">{errors.giftMessage}</p>
              )}
              <p className="text-gray-500 text-xs ml-auto">
                {config.giftMessage.length}/191
              </p>
            </div>
          </div>

          {/* Timeframe Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Claim Timeframe
            </label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(TIMEFRAME_OPTIONS).map(([key, value]) => {
                const timeframeKey = key as TimeframeOption;
                const isSelected = config.timeframe === timeframeKey;
                
                return (
                  <button
                    key={key}
                    onClick={() => setConfig(prev => ({ ...prev, timeframe: timeframeKey }))}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    disabled={isLoading}
                  >
                    <div className="font-medium text-sm text-gray-900 dark:text-white">
                      {TIMEFRAME_LABELS[timeframeKey]}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {TIMEFRAME_DESCRIPTIONS[timeframeKey]}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Gift will be automatically returned to you after {getTimeRemainingText(config.timeframe)} if not claimed
            </p>
          </div>

          {/* Advanced Options */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
              disabled={isLoading}
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
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Specific Recipient (Optional)
                  </label>
                  <input
                    type="text"
                    value={config.recipientAddress}
                    onChange={(e) => setConfig(prev => ({ ...prev, recipientAddress: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.recipientAddress 
                        ? 'border-red-300 dark:border-red-600' 
                        : 'border-gray-300 dark:border-gray-600'
                    } dark:bg-gray-700 dark:text-white`}
                    placeholder="0x... (optional - leave empty for anyone with password)"
                    disabled={isLoading}
                  />
                  {errors.recipientAddress && (
                    <p className="text-red-500 text-xs mt-1">{errors.recipientAddress}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    If specified, only this address can claim the gift even with the correct password
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSkip}
          className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          disabled={isLoading}
        >
          {config.enabled ? 'Skip Escrow' : 'Continue without Escrow'}
        </button>
        
        <button
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Processing...' : (config.enabled ? 'Configure Escrow' : 'Continue')}
        </button>
      </div>

      {/* Security Notice */}
      {config.enabled && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="flex">
            <svg className="w-5 h-5 text-amber-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-xs text-amber-700 dark:text-amber-300">
              <p className="font-medium mb-1">Important Security Information:</p>
              <ul className="list-disc list-inside space-y-1 text-amber-600 dark:text-amber-400">
                <li>Save the password securely - it cannot be recovered if lost</li>
                <li>The gift will be automatically returned after the timeframe expires</li>
                <li>Anyone with the password can claim the gift (unless specific recipient is set)</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};