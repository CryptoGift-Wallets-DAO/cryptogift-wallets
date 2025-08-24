/**
 * Session Wizard Component
 * Create temporary permissions with visual feedback
 */

'use client';

import { useState } from 'react';
import { 
  Key, 
  Clock, 
  DollarSign, 
  Shield,
  ChevronRight,
  AlertTriangle,
  Check,
  X,
  Loader2,
  Zap,
  Gift,
  ArrowUpDown,
  Gamepad2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionKeys } from '@/hooks/useSessionKeys';
import { SESSION_CONFIG } from '@/lib/aa/session-keys/config';

interface SessionWizardProps {
  onClose: () => void;
  onSuccess?: (sessionId: string) => void;
}

const PRESET_ICONS = {
  claim: Gift,
  microPayments: DollarSign,
  swap: ArrowUpDown,
  gaming: Gamepad2,
};

const PRESET_COLORS = {
  claim: 'purple',
  microPayments: 'green',
  swap: 'blue',
  gaming: 'orange',
};

export function SessionWizard({ onClose, onSuccess }: SessionWizardProps) {
  const { createSession, isCreating, error } = useSessionKeys();
  
  const [step, setStep] = useState<'select' | 'confirm' | 'creating' | 'success'>('select');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const handleSelectPreset = (preset: string) => {
    setSelectedPreset(preset);
    setStep('confirm');
  };
  
  const handleConfirm = async () => {
    if (!selectedPreset) return;
    
    setStep('creating');
    
    const id = await createSession(selectedPreset);
    
    if (id) {
      setSessionId(id);
      setStep('success');
      setTimeout(() => {
        onSuccess?.(id);
        onClose();
      }, 2000);
    } else {
      setStep('confirm');
    }
  };
  
  const getPresetDetails = () => {
    if (!selectedPreset) return null;
    return SESSION_CONFIG.presets[selectedPreset as keyof typeof SESSION_CONFIG.presets];
  };
  
  const formatDuration = (hours: number) => {
    if (hours < 24) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${Math.floor(hours / 24)} day${hours >= 48 ? 's' : ''}`;
  };
  
  const formatValue = (wei: bigint) => {
    const eth = Number(wei) / 1e18;
    if (eth === 0) return 'No value';
    if (eth < 0.001) return '< 0.001 ETH';
    return `${eth.toFixed(3)} ETH`;
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Create Session</h2>
                <p className="text-sm text-white/80">
                  Temporary permissions for your wallet
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Select Preset */}
            {step === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Choose a session type based on your needs
                </p>
                
                {Object.entries(SESSION_CONFIG.presets).map(([key, preset]) => {
                  const Icon = PRESET_ICONS[key as keyof typeof PRESET_ICONS];
                  const color = PRESET_COLORS[key as keyof typeof PRESET_COLORS];
                  
                  return (
                    <button
                      key={key}
                      onClick={() => handleSelectPreset(key)}
                      className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all hover:scale-[1.02] text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900`}>
                          <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {preset.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {preset.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(preset.duration)}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {formatValue(preset.maxValue)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            )}
            
            {/* Step 2: Confirm */}
            {step === 'confirm' && selectedPreset && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
                        Review Permissions
                      </h3>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        This session will allow operations without re-signing
                      </p>
                    </div>
                  </div>
                </div>
                
                {(() => {
                  const preset = getPresetDetails();
                  if (!preset) return null;
                  
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Duration
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatDuration(preset.duration)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Max per transaction
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatValue(preset.maxValue)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Daily limit
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatValue(preset.dailyLimit)}
                        </span>
                      </div>
                      
                      <div className="py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Allowed operations
                        </span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {preset.allowedSelectors.map((selector) => {
                            const functionNames: Record<string, string> = {
                              '0xa9059cbb': 'Transfer',
                              '0x095ea7b3': 'Approve',
                              '0x4e71d92d': 'Claim',
                              '0x38ed1739': 'Swap',
                              '0x40c10f19': 'Mint',
                            };
                            return (
                              <span
                                key={selector}
                                className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-medium"
                              >
                                {functionNames[selector] || selector}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setStep('select')}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Create Session
                  </button>
                </div>
              </motion.div>
            )}
            
            {/* Step 3: Creating */}
            {step === 'creating' && (
              <motion.div
                key="creating"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <Loader2 className="w-12 h-12 animate-spin text-purple-600 dark:text-purple-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Creating Session...
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Setting up temporary permissions
                </p>
              </motion.div>
            )}
            
            {/* Step 4: Success */}
            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Session Created!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Your session is now active
                </p>
                {sessionId && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    ID: {sessionId.slice(0, 20)}...
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}