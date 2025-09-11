"use client";

import React, { useState, useEffect } from 'react';
import { storeNFTMetadataClient, getNFTMetadataClient, getAllNFTMetadataClient, NFTMetadata } from '../lib/clientMetadataStore';

export const MintDebugger: React.FC = () => {
  // Only show in development environment
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const [allMetadata, setAllMetadata] = useState<Record<string, NFTMetadata>>({});
  const [testResult, setTestResult] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isDevelopment) {
      refreshMetadata();
    }
  }, [isDevelopment]);

  const refreshMetadata = () => {
    const metadata = getAllNFTMetadataClient();
    setAllMetadata(metadata);
    console.log('📊 All client metadata:', metadata);
  };

  const testMintFlow = () => {
    try {
      const contractAddress = process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS || '0x54314166B36E3Cc66cFb36265D99697f4F733231';
      const tokenId = '999';
      
      // Simulate the exact metadata structure from GiftWizard
      const nftMetadata: NFTMetadata = {
        contractAddress: contractAddress,
        tokenId: tokenId,
        name: `CryptoGift NFT-Wallet #${tokenId}`,
        description: 'Un regalo cripto único creado con amor',
        image: `ipfs://QmTestImageCID123`,
        imageIpfsCid: 'QmTestImageCID123',
        attributes: [
          {
            trait_type: "Initial Balance",
            value: `50 USDC`
          },
          {
            trait_type: "Filter",
            value: "Original"
          },
          {
            trait_type: "Creation Date",
            value: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString(),
        mintTransactionHash: '0xtest123',
        owner: '0x1234567890123456789012345678901234567890'
      };
      
      console.log('💾 Storing test metadata:', nftMetadata);
      // Use dummy wallet address for testing
      const testWalletAddress = '0x0000000000000000000000000000000000000000';
      storeNFTMetadataClient(nftMetadata, testWalletAddress);
      
      const retrieved = getNFTMetadataClient(contractAddress, tokenId, testWalletAddress);
      console.log('📥 Retrieved metadata:', retrieved);
      
      if (retrieved) {
        setTestResult(`✅ Success! Stored and retrieved metadata for token ${tokenId}`);
      } else {
        setTestResult(`❌ Failed to retrieve metadata for token ${tokenId}`);
      }
      
      refreshMetadata();
    } catch (error) {
      console.error('❌ Test failed:', error);
      setTestResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Don't render anything in production
  if (!isDevelopment) {
    return null;
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-purple-600 text-white px-3 py-2 rounded-full shadow-lg hover:bg-purple-700"
          title="Show Mint Debugger (DEV ONLY)"
        >
          🔧
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-sm">Mint Debugger</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-3">
        <div>
          <button
            onClick={testMintFlow}
            className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
          >
            🧪 Test Mint Flow
          </button>
        </div>
        
        {testResult && (
          <div className="p-2 bg-gray-100 rounded text-sm">
            {testResult}
          </div>
        )}
        
        <div>
          <button
            onClick={refreshMetadata}
            className="w-full bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
          >
            🔄 Refresh Metadata
          </button>
        </div>
        
        <div>
          <h4 className="font-medium text-sm mb-2">Stored Metadata ({Object.keys(allMetadata).length})</h4>
          <div className="max-h-48 overflow-y-auto">
            {Object.keys(allMetadata).length === 0 ? (
              <p className="text-sm text-gray-500">No metadata stored</p>
            ) : (
              Object.entries(allMetadata).map(([key, metadata]) => (
                <div key={key} className="p-2 bg-gray-50 rounded mb-2 text-xs">
                  <div className="font-medium">{metadata.name}</div>
                  <div className="text-gray-600">Token: {metadata.tokenId}</div>
                  <div className="text-gray-600">Image: {metadata.image}</div>
                  <div className="text-gray-600">Created: {new Date(metadata.createdAt).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div>
          <button
            onClick={() => {
              localStorage.removeItem('cryptogift_nft_metadata');
              refreshMetadata();
              setTestResult('🗑️ Cleared all metadata');
            }}
            className="w-full bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700"
          >
            🗑️ Clear All
          </button>
        </div>
      </div>
    </div>
  );
};