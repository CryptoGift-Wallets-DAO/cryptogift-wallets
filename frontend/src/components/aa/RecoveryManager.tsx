/**
 * Recovery Manager Component
 * Configure guardians and passkeys for social recovery
 */

'use client';

import { useState } from 'react';
import {
  Shield,
  Users,
  Key,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Info,
  UserPlus,
  Fingerprint,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRecovery } from '@/hooks/useRecovery';
import { formatDistance } from '@/lib/utils';

export function RecoveryManager() {
  const {
    enabled,
    guardians,
    passkeys,
    activeRequest,
    recoveryStatus,
    passkeyStatus,
    webauthnSupported,
    p256Supported,
    inviteGuardian,
    revokeGuardian,
    addPasskey,
    deletePasskey,
    initiateRecovery,
    approveRecovery,
    executeRecovery,
    cancelRecovery,
    policy,
    isLoading,
    error,
  } = useRecovery();
  
  const [activeTab, setActiveTab] = useState<'guardians' | 'passkeys' | 'recovery'>('guardians');
  const [showAddGuardian, setShowAddGuardian] = useState(false);
  const [showAddPasskey, setShowAddPasskey] = useState(false);
  const [showInitiateRecovery, setShowInitiateRecovery] = useState(false);
  
  if (!enabled) {
    return null;
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Recovery Settings
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure guardians and passkeys for account recovery
            </p>
          </div>
          
          {/* Status badges */}
          <div className="flex items-center gap-2">
            {p256Supported && (
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                P256 ✓
              </span>
            )}
            {webauthnSupported && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                WebAuthn ✓
              </span>
            )}
          </div>
        </div>
        
        {/* Active recovery alert */}
        {activeRequest && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Recovery in Progress
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {activeRequest.guardianApprovals.length} of {activeRequest.requiredApprovals} approvals
                </p>
                {activeRequest.status === 'ready' && (
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Can execute in {formatDistance(activeRequest.executesAt - Date.now())}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {activeRequest.status === 'ready' && Date.now() >= activeRequest.executesAt && (
                  <button
                    onClick={() => executeRecovery(activeRequest.id)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    Execute
                  </button>
                )}
                <button
                  onClick={() => cancelRecovery(activeRequest.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('guardians')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'guardians'
              ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Users className="w-4 h-4" />
            <span>Guardians ({guardians.length})</span>
          </div>
        </button>
        
        <button
          onClick={() => setActiveTab('passkeys')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'passkeys'
              ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Fingerprint className="w-4 h-4" />
            <span>Passkeys ({passkeys.length})</span>
          </div>
        </button>
        
        <button
          onClick={() => setActiveTab('recovery')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'recovery'
              ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" />
            <span>Recovery</span>
          </div>
        </button>
      </div>
      
      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <AnimatePresence mode="wait">
          {/* Guardians Tab */}
          {activeTab === 'guardians' && (
            <motion.div
              key="guardians"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Policy info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Threshold</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {policy.threshold} of {Math.max(guardians.length, policy.minGuardians)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Recovery Delay</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {policy.recoveryDelay / 3600} hours
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Cancel Window</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {policy.cancelWindow / 3600} hours
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Guardian list */}
              {guardians.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No guardians configured
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Add at least {policy.minGuardians} guardians to enable recovery
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {guardians.map((guardian) => (
                    <div
                      key={guardian.address}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {guardian.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {guardian.address.slice(0, 6)}...{guardian.address.slice(-4)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => revokeGuardian(guardian.address)}
                        disabled={isLoading || guardians.length <= policy.minGuardians}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add guardian button */}
              <button
                onClick={() => setShowAddGuardian(true)}
                disabled={guardians.length >= policy.maxGuardians}
                className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-purple-600 dark:hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  <span>Add Guardian</span>
                </div>
              </button>
            </motion.div>
          )}
          
          {/* Passkeys Tab */}
          {activeTab === 'passkeys' && (
            <motion.div
              key="passkeys"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {!webauthnSupported ? (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">
                        WebAuthn Not Supported
                      </p>
                      <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                        Your browser or device doesn't support passkeys
                      </p>
                    </div>
                  </div>
                </div>
              ) : !p256Supported ? (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">
                        Chain Not Supported
                      </p>
                      <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                        This chain doesn't support P256 verification for passkeys
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Passkey list */}
                  {passkeys.length === 0 ? (
                    <div className="text-center py-8">
                      <Fingerprint className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400">
                        No passkeys configured
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        Add a passkey for passwordless recovery
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {passkeys.map((passkey) => (
                        <div
                          key={passkey.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                              <Fingerprint className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {passkey.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {passkey.deviceInfo} • Added {formatDistance(Date.now() - passkey.createdAt)} ago
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => deletePasskey(passkey.id)}
                            disabled={isLoading}
                            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Add passkey button */}
                  <button
                    onClick={() => setShowAddPasskey(true)}
                    disabled={!passkeyStatus?.canAddMore || isLoading}
                    className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-600 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" />
                      <span>Add Passkey</span>
                    </div>
                  </button>
                </>
              )}
            </motion.div>
          )}
          
          {/* Recovery Tab */}
          {activeTab === 'recovery' && (
            <motion.div
              key="recovery"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {recoveryStatus?.canInitiateRecovery ? (
                <div className="text-center py-8">
                  <RotateCcw className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Recovery system ready
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    You can initiate recovery if you lose access to your account
                  </p>
                  <button
                    onClick={() => setShowInitiateRecovery(true)}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Test Recovery
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Recovery not available
                  </p>
                  {!recoveryStatus?.hasGuardians && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      Add at least {policy.minGuardians} guardians to enable recovery
                    </p>
                  )}
                  {recoveryStatus?.cooldownRemaining && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      Cooldown active: {formatDistance(recoveryStatus.cooldownRemaining * 1000)} remaining
                    </p>
                  )}
                </div>
              )}
              
              {/* Info box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                      How Recovery Works
                    </p>
                    <ol className="space-y-1 text-blue-700 dark:text-blue-300 list-decimal list-inside">
                      <li>Initiate recovery with new owner address</li>
                      <li>Get {policy.threshold} guardian approvals</li>
                      <li>Wait {policy.recoveryDelay / 3600} hours for delay period</li>
                      <li>Execute recovery within {policy.cancelWindow / 3600} hours</li>
                      <li>Original owner can cancel anytime during the process</li>
                    </ol>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Add Guardian Modal */}
      {showAddGuardian && (
        <AddGuardianModal
          onClose={() => setShowAddGuardian(false)}
          onAdd={inviteGuardian}
        />
      )}
      
      {/* Add Passkey Modal */}
      {showAddPasskey && (
        <AddPasskeyModal
          onClose={() => setShowAddPasskey(false)}
          onAdd={addPasskey}
        />
      )}
    </div>
  );
}

// Modal components would go here...
function AddGuardianModal({ onClose, onAdd }: any) {
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  const handleAdd = async () => {
    if (!address || !name) return;
    
    setIsAdding(true);
    const success = await onAdd(address, name, email || undefined);
    if (success) {
      onClose();
    }
    setIsAdding(false);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Add Guardian
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Guardian Address *
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alice"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alice@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!address || !name || isAdding}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isAdding ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding...
              </span>
            ) : (
              'Add Guardian'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function AddPasskeyModal({ onClose, onAdd }: any) {
  const [name, setName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  const handleAdd = async () => {
    if (!name) return;
    
    setIsAdding(true);
    const credential = await onAdd(name);
    if (credential) {
      onClose();
    }
    setIsAdding(false);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Add Passkey
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Passkey Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My iPhone"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              You'll be prompted to use your device's biometric authentication (Face ID, Touch ID, or Windows Hello)
            </p>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!name || isAdding}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isAdding ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Fingerprint className="w-4 h-4" />
                Create Passkey
              </span>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}