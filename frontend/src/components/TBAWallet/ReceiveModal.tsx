'use client';

import React, { useState } from 'react';
// import { QRCodeSVG } from 'qrcode.react'; // TODO: Install qrcode.react

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  tokenId: string;
}

export const ReceiveModal: React.FC<ReceiveModalProps> = ({
  isOpen,
  onClose,
  walletAddress,
  tokenId
}) => {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Security: Safe address formatting
  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Security: Safe clipboard operations
  const copyToClipboard = async (text: string, type: 'address' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'address') {
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/token/${process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS}/${tokenId}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-96 max-h-96 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Receive Tokens</h3>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* QR Code */}
          <div className="text-center">
            <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
              {/* TODO: Replace with QRCodeSVG when qrcode.react is installed */}
              <div className="w-40 h-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">📱</div>
                  <div className="text-xs text-gray-500">QR Code</div>
                  <div className="text-xs text-gray-400">Coming Soon</div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              QR Code will be generated for easy scanning
            </p>
          </div>

          {/* Wallet Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wallet Address
            </label>
            <div className="relative">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm break-all">
                {walletAddress}
              </div>
              <button
                onClick={() => copyToClipboard(walletAddress, 'address')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 transition-colors"
              >
                {copiedAddress ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatAddress(walletAddress)} • ERC-6551 Token Bound Account
            </p>
          </div>

          {/* Share Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share NFT-Wallet Link
            </label>
            <div className="relative">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm break-all">
                {shareUrl}
              </div>
              <button
                onClick={() => copyToClipboard(shareUrl, 'link')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 transition-colors"
              >
                {copiedLink ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Share this link to let others send tokens directly to your NFT-wallet
            </p>
          </div>

          {/* Supported Networks */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-800 mb-2">📡 Supported Networks</h4>
            <div className="space-y-1 text-xs text-blue-700">
              <div className="flex justify-between">
                <span>• Base Sepolia (Testnet)</span>
                <span className="text-green-600">✓ Active</span>
              </div>
              <div className="flex justify-between">
                <span>• Base Mainnet</span>
                <span className="text-gray-500">Coming Soon</span>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-yellow-800 mb-1">🔒 Security Notice</h4>
            <p className="text-xs text-yellow-700">
              Only send tokens from trusted sources. This wallet is bound to NFT #{tokenId} and can only be accessed by the NFT owner.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiveModal;