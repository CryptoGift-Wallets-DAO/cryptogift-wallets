"use client";

import React, { useState } from 'react';
import { storeNFTMetadataClient, getNFTMetadataClient, NFTMetadata } from '../lib/clientMetadataStore';

interface FlowDiagnosticProps {
  contractAddress: string;
  tokenId: string;
}

export const FlowDiagnostic: React.FC<FlowDiagnosticProps> = ({ contractAddress, tokenId }) => {
  const [diagnostic, setDiagnostic] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const runDiagnostic = async () => {
    setIsLoading(true);
    setDiagnostic(null);

    try {
      const results = {
        timestamp: new Date().toISOString(),
        contractAddress,
        tokenId,
        tests: {
          clientStorage: null,
          serverStorage: null,
          mintProcess: null,
          imageAccess: null
        }
      };

      // 1. Test client storage
      console.log('🧪 Testing client storage...');
      const testMetadata: NFTMetadata = {
        contractAddress,
        tokenId,
        name: `Test NFT #${tokenId}`,
        description: 'Test metadata for diagnostic',
        image: 'ipfs://QmTest123',
        imageIpfsCid: 'QmTest123',
        attributes: [],
        createdAt: new Date().toISOString()
      };

      try {
        // Use a dummy wallet address for testing (wallet-scoped storage)
        const testWalletAddress = '0x0000000000000000000000000000000000000000';
        storeNFTMetadataClient(testMetadata, testWalletAddress);
        const retrieved = getNFTMetadataClient(contractAddress, tokenId, testWalletAddress);
        
        results.tests.clientStorage = {
          status: 'success',
          stored: !!retrieved,
          data: retrieved,
          message: retrieved ? 'Client storage working' : 'Client storage failed to retrieve'
        };
      } catch (error) {
        results.tests.clientStorage = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Client storage failed'
        };
      }

      // 2. Test server storage via API
      console.log('🧪 Testing server storage...');
      try {
        const serverResponse = await fetch('/api/debug/flow-trace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractAddress, tokenId })
        });

        if (serverResponse.ok) {
          const serverData = await serverResponse.json();
          results.tests.serverStorage = {
            status: 'success',
            data: serverData,
            message: 'Server diagnostic completed'
          };
        } else {
          results.tests.serverStorage = {
            status: 'error',
            error: `HTTP ${serverResponse.status}`,
            message: 'Server diagnostic failed'
          };
        }
      } catch (error) {
        results.tests.serverStorage = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Server diagnostic failed'
        };
      }

      // 3. Test image access
      console.log('🧪 Testing image access...');
      try {
        const imageResponse = await fetch(`/api/nft/${contractAddress}/${tokenId}`);
        
        if (imageResponse.ok) {
          const nftData = await imageResponse.json();
          results.tests.imageAccess = {
            status: 'success',
            data: nftData,
            hasImage: !!nftData.image,
            isPlaceholder: nftData.image?.includes('placeholder') || false,
            message: nftData.image ? 'NFT data retrieved' : 'No image in NFT data'
          };
        } else {
          results.tests.imageAccess = {
            status: 'error',
            error: `HTTP ${imageResponse.status}`,
            message: 'NFT API failed'
          };
        }
      } catch (error) {
        results.tests.imageAccess = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'NFT API failed'
        };
      }

      // 4. Test mint process simulation
      console.log('🧪 Testing mint process simulation...');
      try {
        // This would be the same metadata the mint process creates
        const mintMetadata: NFTMetadata = {
          contractAddress: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS || '',
          tokenId: tokenId,
          name: `CryptoGift NFT-Wallet #${tokenId}`,
          description: 'Un regalo cripto único creado con amor',
          image: 'ipfs://QmSimulatedMint123',
          imageIpfsCid: 'QmSimulatedMint123',
          attributes: [
            { trait_type: "Initial Balance", value: "45 USDC" },
            { trait_type: "Filter", value: "Original" },
            { trait_type: "Creation Date", value: new Date().toISOString() }
          ],
          createdAt: new Date().toISOString(),
          owner: '0x1234567890123456789012345678901234567890'
        };

        // Use the same test wallet address for consistency
        const testWalletAddress = '0x0000000000000000000000000000000000000000';
        storeNFTMetadataClient(mintMetadata, testWalletAddress);
        const mintRetrieved = getNFTMetadataClient(contractAddress, tokenId, testWalletAddress);
        
        results.tests.mintProcess = {
          status: 'success',
          stored: !!mintRetrieved,
          data: mintRetrieved,
          message: mintRetrieved ? 'Mint simulation successful' : 'Mint simulation failed'
        };
      } catch (error) {
        results.tests.mintProcess = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Mint simulation failed'
        };
      }

      setDiagnostic(results);
      console.log('🧪 Diagnostic complete:', results);
    } catch (error) {
      console.error('❌ Diagnostic failed:', error);
      setDiagnostic({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
      setShowResults(true);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return '❓';
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Flow Diagnostic</h3>
        <button
          onClick={runDiagnostic}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? '🔄 Running...' : '🧪 Run Diagnostic'}
        </button>
      </div>

      {showResults && diagnostic && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Storage Test */}
            <div className="bg-white p-3 rounded border">
              <h4 className="font-medium mb-2">
                {getStatusIcon(diagnostic.tests.clientStorage?.status)} Client Storage
              </h4>
              <p className="text-sm text-gray-600 mb-1">
                {diagnostic.tests.clientStorage?.message}
              </p>
              {diagnostic.tests.clientStorage?.data && (
                <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
                  {JSON.stringify(diagnostic.tests.clientStorage.data, null, 2)}
                </pre>
              )}
            </div>

            {/* Server Storage Test */}
            <div className="bg-white p-3 rounded border">
              <h4 className="font-medium mb-2">
                {getStatusIcon(diagnostic.tests.serverStorage?.status)} Server Storage
              </h4>
              <p className="text-sm text-gray-600 mb-1">
                {diagnostic.tests.serverStorage?.message}
              </p>
              {diagnostic.tests.serverStorage?.data && (
                <div className="text-xs bg-gray-100 p-2 rounded mt-2">
                  <div>Environment: {diagnostic.tests.serverStorage.data.checks?.environment?.nodeEnv}</div>
                  <div>Server Metadata: {diagnostic.tests.serverStorage.data.checks?.serverMetadata?.found ? 'Found' : 'Not Found'}</div>
                  <div>Tmp Files: {diagnostic.tests.serverStorage.data.checks?.tmpFiles?.length || 0}</div>
                </div>
              )}
            </div>

            {/* Image Access Test */}
            <div className="bg-white p-3 rounded border">
              <h4 className="font-medium mb-2">
                {getStatusIcon(diagnostic.tests.imageAccess?.status)} Image Access
              </h4>
              <p className="text-sm text-gray-600 mb-1">
                {diagnostic.tests.imageAccess?.message}
              </p>
              {diagnostic.tests.imageAccess?.data && (
                <div className="text-xs bg-gray-100 p-2 rounded mt-2">
                  <div>Has Image: {diagnostic.tests.imageAccess.hasImage ? 'Yes' : 'No'}</div>
                  <div>Is Placeholder: {diagnostic.tests.imageAccess.isPlaceholder ? 'Yes' : 'No'}</div>
                  <div>Image URL: {diagnostic.tests.imageAccess.data.image}</div>
                </div>
              )}
            </div>

            {/* Mint Process Test */}
            <div className="bg-white p-3 rounded border">
              <h4 className="font-medium mb-2">
                {getStatusIcon(diagnostic.tests.mintProcess?.status)} Mint Process
              </h4>
              <p className="text-sm text-gray-600 mb-1">
                {diagnostic.tests.mintProcess?.message}
              </p>
              {diagnostic.tests.mintProcess?.stored && (
                <div className="text-xs bg-gray-100 p-2 rounded mt-2">
                  <div>Stored: {diagnostic.tests.mintProcess.stored ? 'Yes' : 'No'}</div>
                  <div>Name: {diagnostic.tests.mintProcess.data?.name}</div>
                  <div>Image: {diagnostic.tests.mintProcess.data?.image}</div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-3 rounded border">
            <h4 className="font-medium mb-2">Summary</h4>
            <div className="text-sm">
              <div>Contract: {diagnostic.contractAddress}</div>
              <div>Token ID: {diagnostic.tokenId}</div>
              <div>Timestamp: {diagnostic.timestamp}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};