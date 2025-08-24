/**
 * Session Manager Component
 * View and manage active sessions with Kill Switch
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Key,
  Clock,
  Activity,
  Trash2,
  AlertTriangle,
  Shield,
  Plus,
  Power,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionKeys } from '@/hooks/useSessionKeys';
import { SessionWizard } from './SessionWizard';

export function SessionManager() {
  const {
    enabled,
    activeSessions,
    revokeSession,
    revokeAllSessions,
    getSessionStats,
  } = useSessionKeys();
  
  const [showWizard, setShowWizard] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showKillSwitch, setShowKillSwitch] = useState(false);
  const [isKilling, setIsKilling] = useState(false);
  
  if (!enabled) {
    return null;
  }
  
  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    await revokeSession(sessionId);
    setRevokingId(null);
  };
  
  const handleKillSwitch = async () => {
    setIsKilling(true);
    const count = await revokeAllSessions();
    setIsKilling(false);
    setShowKillSwitch(false);
    
    // Show success message
    if (count > 0) {
      console.log(`Revoked ${count} sessions`);
    }
  };
  
  const formatTimeRemaining = (ms: number) => {
    if (ms <= 0) return 'Expired';
    
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };
  
  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Key className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Active Sessions
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Temporary permissions for your wallet
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Kill Switch */}
            {activeSessions.length > 0 && (
              <button
                onClick={() => setShowKillSwitch(true)}
                className="px-3 py-1.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Power className="w-4 h-4" />
                Kill All
              </button>
            )}
            
            {/* Create Session */}
            <button
              onClick={() => setShowWizard(true)}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Session
            </button>
          </div>
        </div>
        
        {/* Sessions List */}
        {activeSessions.length === 0 ? (
          <div className="text-center py-12">
            <Key className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No active sessions
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Create a session to enable auto-signing for specific operations
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {activeSessions.map((session) => {
                const stats = getSessionStats(session.sessionId);
                if (!stats) return null;
                
                return (
                  <motion.div
                    key={session.sessionId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {session.name}
                          </h4>
                          {stats.isExpired ? (
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded text-xs">
                              Expired
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs">
                              Active
                            </span>
                          )}
                        </div>
                        
                        {session.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {session.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimeRemaining(stats.remainingTime)}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            <span>{stats.usageCount} uses</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            <span>{session.allowedSelectors.length} permissions</span>
                          </div>
                        </div>
                        
                        {/* Permissions */}
                        <div className="mt-3 flex flex-wrap gap-1">
                          {session.allowedSelectors.map((selector) => {
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
                                className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs"
                              >
                                {functionNames[selector] || 'Custom'}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Revoke Button */}
                      <button
                        onClick={() => handleRevoke(session.sessionId)}
                        disabled={revokingId === session.sessionId}
                        className="ml-4 p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        {revokingId === session.sessionId ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
        
        {/* Security Note */}
        <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-blue-800 dark:text-blue-200 font-medium">
                Security Note
              </p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                Sessions allow operations without re-signing. Revoke immediately if you notice suspicious activity.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Session Wizard */}
      {showWizard && (
        <SessionWizard
          onClose={() => setShowWizard(false)}
          onSuccess={() => setShowWizard(false)}
        />
      )}
      
      {/* Kill Switch Confirmation */}
      {showKillSwitch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Kill All Sessions?
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This will immediately revoke all {activeSessions.length} active session{activeSessions.length !== 1 ? 's' : ''}. 
              You'll need to create new sessions for auto-signing.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowKillSwitch(false)}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleKillSwitch}
                disabled={isKilling}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isKilling ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Revoking...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Power className="w-4 h-4" />
                    Kill All
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}