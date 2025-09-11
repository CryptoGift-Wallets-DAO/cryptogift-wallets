"use client";

import { useState, useEffect } from 'react';
import { CacheManager } from '../../components/admin/CacheManager';

interface MintLog {
  timestamp: string;
  level: 'INFO' | 'ERROR' | 'SUCCESS' | 'WARN';
  step: string;
  data: any;
}

export default function DebugPage() {
  const [logs, setLogs] = useState<MintLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showCacheManager, setShowCacheManager] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/debug/mint-logs');
      const data = await response.json();
      console.log('Debug logs response:', data);
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = async () => {
    try {
      await fetch('/api/debug/mint-logs?clear=true');
      setLogs([]);
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const testDebugSystem = async () => {
    try {
      const response = await fetch('/api/debug/mint-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'INFO',
          step: 'DEBUG_TEST',
          data: { message: 'Test log entry created', timestamp: new Date().toISOString() }
        })
      });
      if (response.ok) {
        fetchLogs();
      }
    } catch (error) {
      console.error('Error testing debug system:', error);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-600 bg-red-50';
      case 'SUCCESS': return 'text-green-600 bg-green-50';
      case 'INFO': return 'text-blue-600 bg-blue-50';
      case 'WARN': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">🔍 Mint Debug Console</h1>
            <div className="flex gap-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="mr-2"
                />
                Auto-refresh (2s)
              </label>
              <button
                onClick={fetchLogs}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
              <button
                onClick={testDebugSystem}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Test Debug
              </button>
              <button
                onClick={clearLogs}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Clear Logs
              </button>
              <button
                onClick={() => setShowCacheManager(true)}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                🧹 Cache Manager
              </button>
            </div>
          </div>

          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
            <div className="mb-4">
              <div className="text-yellow-400">📋 DEBUGGING GUIDE:</div>
              <div>1. Try to mint an NFT and watch the logs appear here</div>
              <div>2. Look for ERROR level logs to identify the exact failure point</div>
              <div>3. Check the step where it fails (STEP_1 to STEP_5)</div>
              <div>4. Use the data field to see specific error details</div>
            </div>
            
            <div className="border-t border-gray-700 pt-4">
              <div className="text-yellow-400">📊 LOGS ({logs.length} total) - {isLoading ? 'Loading...' : 'Ready'}:</div>
              {logs.length === 0 ? (
                <div className="text-gray-500 italic">
                  No logs yet. Try minting an NFT to see debug information.
                  <br />
                  <small>If logs don&apos;t appear, check browser console for errors.</small>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index} className={`p-2 my-2 rounded ${getLevelColor(log.level)}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold">
                            [{log.level}] {log.step}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                          {log.data && (
                            <div className="mt-2 text-xs bg-white p-2 rounded border overflow-x-auto">
                              <pre className="text-gray-800">{JSON.stringify(log.data, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-bold text-yellow-800 mb-2">🚨 Common Issues & Solutions:</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li><strong>STEP_1 fails:</strong> IPFS upload issue - check internet connection</li>
                <li><strong>STEP_2 fails:</strong> Biconomy configuration issue - check environment variables</li>
                <li><strong>STEP_3 fails:</strong> Smart Account creation issue - check private key and funding</li>
                <li><strong>STEP_4 fails:</strong> Transaction execution issue - check contract addresses</li>
                <li><strong>STEP_5 fails:</strong> TBA calculation issue - should not fail, but check token ID</li>
              </ul>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-bold text-blue-800 mb-2">🔧 Debug System Status:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li><strong>Logs Storage:</strong> In-memory (resets on server restart)</li>
                <li><strong>Max Logs:</strong> 100 entries (automatic cleanup)</li>
                <li><strong>Auto-refresh:</strong> {autoRefresh ? '✅ Enabled (2s)' : '❌ Disabled'}</li>
                <li><strong>API Endpoint:</strong> /api/debug/mint-logs</li>
                <li><strong>Environment:</strong> {process.env.NODE_ENV || 'development'}</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-bold text-green-800 mb-2">🎯 How to Use Debug System:</h3>
            <ol className="text-sm text-green-700 space-y-1 list-decimal list-inside">
              <li><strong>Test Debug System:</strong> Click &quot;Test Debug&quot; button to verify logs are working</li>
              <li><strong>Create NFT Gift:</strong> Go to main page and try to create a gift</li>
              <li><strong>Monitor in Real-time:</strong> Enable auto-refresh and watch logs appear</li>
              <li><strong>Identify Issues:</strong> Look for ERROR or WARN level logs</li>
              <li><strong>Check Data Field:</strong> Expand log entries to see detailed error information</li>
              <li><strong>Clear When Done:</strong> Use &quot;Clear Logs&quot; to start fresh</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Cache Manager Modal */}
      <CacheManager 
        isOpen={showCacheManager} 
        onClose={() => setShowCacheManager(false)} 
      />
    </div>
  );
}