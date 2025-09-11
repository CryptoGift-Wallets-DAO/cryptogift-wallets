"use client";

import React, { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import dynamic from 'next/dynamic';

function MigrationPageContent() {
  const account = useActiveAccount();
  const [contractAddress, setContractAddress] = useState('0x54314166B36E3Cc66cFb36265D99697f4F733231');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Simple admin check (you should implement proper admin auth)
  const isAdmin = account?.address?.toLowerCase() === '0xa362a26f6100ff5f8157c0ed1c2bcc0a1919df4a';

  if (!mounted) {
    return <div>Loading...</div>;
  }

  const runAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/migrate-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          contractAddress,
          dryRun: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        setAnalysisResult(result.results);
        console.log('📊 Analysis result:', result.results);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Analysis failed');
      }
    } catch (error) {
      setError('Network error during analysis');
      console.error('Analysis error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runMigration = async (dryRun: boolean = true) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/migrate-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'migrate',
          contractAddress,
          dryRun
        })
      });

      if (response.ok) {
        const result = await response.json();
        setMigrationResult(result.results);
        console.log('🔄 Migration result:', result.results);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Migration failed');
      }
    } catch (error) {
      setError('Network error during migration');
      console.error('Migration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>You need admin privileges to access this page.</p>
          <p className="text-sm text-gray-500 mt-2">
            Connected: {account?.address || 'Not connected'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-6">🔧 NFT Metadata Migration</h1>
          
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <h2 className="font-semibold text-yellow-800">⚠️ Problema Identificado</h2>
            <p className="text-yellow-700 mt-2">
              Las metadata están almacenadas con tokenId incorrecto debido al cálculo erróneo:
              <br />
              <code className="bg-yellow-100 px-2 py-1 rounded">tokenId = totalSupply</code> (incorrecto)
              <br />
              Debería ser: <code className="bg-green-100 px-2 py-1 rounded">tokenId = totalSupply - 1</code>
            </p>
          </div>

          {/* Contract Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Contract Address</label>
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="0x..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={runAnalysis}
              disabled={isLoading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              📊 Analyze Contract
            </button>
            <button
              onClick={() => runMigration(true)}
              disabled={isLoading || !analysisResult}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
            >
              🧪 Dry Run Migration
            </button>
            <button
              onClick={() => runMigration(false)}
              disabled={isLoading || !analysisResult}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
            >
              🚀 Execute Migration
            </button>
          </div>

          {isLoading && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <div className="flex items-center">
                <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mr-3"></div>
                <span>Processing...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
              <h3 className="font-semibold text-red-800">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Analysis Results */}
          {analysisResult && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">📊 Analysis Results</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded">
                  <h3 className="font-semibold">Contract Info</h3>
                  <p>Total Supply: {analysisResult.contractInfo?.totalSupply}</p>
                  <p>Valid Tokens: {analysisResult.contractInfo?.firstTokenId} to {analysisResult.contractInfo?.lastTokenId}</p>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <h3 className="font-semibold">Correct Metadata</h3>
                  <p>Count: {analysisResult.analysis?.correctTokenIds?.length || 0}</p>
                </div>
                <div className="bg-red-50 p-4 rounded">
                  <h3 className="font-semibold">Incorrect Metadata</h3>
                  <p>Count: {analysisResult.analysis?.incorrectTokenIds?.length || 0}</p>
                </div>
              </div>

              {/* Migration Plan */}
              {analysisResult.migration?.planned?.length > 0 && (
                <div className="bg-yellow-50 p-4 rounded">
                  <h3 className="font-semibold mb-2">📋 Migration Plan ({analysisResult.migration.planned.length} operations)</h3>
                  <div className="max-h-64 overflow-y-auto">
                    {analysisResult.migration.planned.map((op: any, index: number) => (
                      <div key={index} className="text-sm mb-1">
                        {op.action === 'move' ? (
                          <span className="text-blue-600">
                            🔄 Move: {op.fromTokenId} → {op.toTokenId} ({op.reason})
                          </span>
                        ) : (
                          <span className="text-red-600">
                            🗑️ Delete: {op.tokenId} ({op.reason})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded mt-4">
                <h3 className="font-semibold">Summary</h3>
                <pre className="text-sm mt-2 overflow-auto">
                  {JSON.stringify(analysisResult.summary, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Migration Results */}
          {migrationResult && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">🔄 Migration Results</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-green-50 p-4 rounded">
                  <h3 className="font-semibold">Successful</h3>
                  <p>{migrationResult.migration?.executed?.length || 0} operations</p>
                </div>
                <div className="bg-red-50 p-4 rounded">
                  <h3 className="font-semibold">Failed</h3>
                  <p>{migrationResult.migration?.failed?.length || 0} operations</p>
                </div>
                <div className="bg-blue-50 p-4 rounded">
                  <h3 className="font-semibold">Status</h3>
                  <p>{migrationResult.dryRun ? '🧪 Dry Run' : '🚀 Executed'}</p>
                </div>
              </div>

              {migrationResult.migration?.failed?.length > 0 && (
                <div className="bg-red-50 p-4 rounded mb-4">
                  <h3 className="font-semibold text-red-800">Failed Operations</h3>
                  <div className="max-h-32 overflow-y-auto">
                    {migrationResult.migration.failed.map((fail: any, index: number) => (
                      <div key={index} className="text-sm text-red-700">
                        {fail.operation.tokenId}: {fail.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold">Full Results</h3>
                <pre className="text-sm mt-2 overflow-auto max-h-64">
                  {JSON.stringify(migrationResult, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Export with dynamic import to prevent SSR issues
const MigrationPage = dynamic(() => Promise.resolve(MigrationPageContent), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

export default MigrationPage;