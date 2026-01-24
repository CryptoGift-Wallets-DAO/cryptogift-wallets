"use client";

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslations } from 'next-intl';

interface QRShareProps {
  tokenId: string; // Enhanced numeric string for uniqueness
  shareUrl?: string;
  qrCode?: string;
  onClose: () => void;
  wasGasless?: boolean;
  isDirectMint?: boolean;
  message?: string;
}

export const QRShare: React.FC<QRShareProps> = ({ tokenId, shareUrl, qrCode, onClose, wasGasless = false, isDirectMint = false, message }) => {
  const t = useTranslations('qrShare');
  const [copied, setCopied] = useState(false);
  const [copyType, setCopyType] = useState<'url' | 'message' | null>(null);

  const copyToClipboard = (text: string, type: 'url' | 'message') => {
    // Check if clipboard API is available (HTTPS required)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setCopyType(type);
        setTimeout(() => {
          setCopied(false);
          setCopyType(null);
        }, 2000);
      }).catch((err) => {
        console.warn('Clipboard API failed, using fallback:', err);
        fallbackCopyToClipboard(text, type);
      });
    } else {
      // Fallback for non-HTTPS or unsupported browsers
      fallbackCopyToClipboard(text, type);
    }
  };

  const fallbackCopyToClipboard = (text: string, type: 'url' | 'message') => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      setCopied(true);
      setCopyType(type);
      setTimeout(() => {
        setCopied(false);
        setCopyType(null);
      }, 2000);
    } catch (err) {
      console.error('Fallback copy failed:', err);
      // Show manual copy instruction
      alert(`${t('fallbackCopy')} ${text}`);
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const shareMessage = `🎁 ${t('shareMessage.line1')}

${t('shareMessage.line2')}
1. ${t('shareMessage.step1')}
2. ${t('shareMessage.step2')}
3. ${t('shareMessage.step3')}

${shareUrl || (typeof window !== 'undefined' ? window.location.origin : '')}

${t('shareMessage.closing')} 💎✨`;

  const shortUrl = shareUrl ? shareUrl.replace('https://', '').replace('http://', '') : (typeof window !== 'undefined' ? window.location.host : (() => { throw new Error('shareUrl is required for QR sharing'); })());

  const handleSocialShare = (platform: string) => {
    const text = encodeURIComponent(shareMessage);
    const url = encodeURIComponent(shareUrl || (typeof window !== 'undefined' ? window.location.origin : ''));
    
    const shareUrls = {
      whatsapp: `https://wa.me/?text=${text}`,
      telegram: `https://t.me/share/url?url=${url}&text=${encodeURIComponent(`🎁 ${t('shareMessage.line1')}`)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`🎁 ${t('shareMessage.line1')} @CryptoGiftWallets`)}`,
      email: `mailto:?subject=${encodeURIComponent(`🎁 ${t('shareMessage.line1')}`)}&body=${encodeURIComponent(shareMessage)}`
    };

    window.open(shareUrls[platform as keyof typeof shareUrls], '_blank');
  };

  // Render different interface for direct mints (skip escrow)
  if (isDirectMint) {
    return (
      <div className="space-y-6">
        {/* Success Header for Direct Mint */}
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-blue-600 mb-2">{t('directMint.title')} 🎯</h2>
          <p className="text-gray-600">
            {t('directMint.subtitle', { tokenId })}
          </p>
        </div>

        {/* Direct Mint Info */}
        <div className="bg-blue-50 rounded-xl p-6 text-center">
          <div className="text-4xl mb-4">💎</div>
          <h3 className="text-lg font-semibold text-blue-800 mb-2">{t('directMint.escrowSkipped')}</h3>
          <p className="text-blue-700 mb-4">
            {message || t('directMint.defaultMessage', { tokenId })}
          </p>
          <div className="bg-white rounded-lg p-3 text-sm text-gray-600">
            <p className="font-medium mb-1">{t('directMint.whatMeans')}</p>
            <p>• {t('directMint.point1')}</p>
            <p>• {t('directMint.point2')}</p>
            <p>• {t('directMint.point3')}</p>
            <p>• {t('directMint.point4')}</p>
          </div>
        </div>

        {/* NFT Details for Direct Mint */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="font-semibold text-gray-800 mb-2">{t('nftDetails.title')}</h3>
          <div className="space-y-1 text-sm text-gray-700">
            <p>• {t('nftDetails.tokenId')} #{tokenId}</p>
            <p>• {t('nftDetails.blockchain')} {t('nftDetails.blockchainValue')}</p>
            <p>• {t('nftDetails.standard')} {t('nftDetails.standardValue')}</p>
            <p>• {t('nftDetails.status')} ✅ {t('nftDetails.statusValue')}</p>
            <p>• {t('nftDetails.walletIntegrated')} ✅ {t('nftDetails.walletReady')}</p>
            {wasGasless ? (
              <p className="text-green-600 font-medium">• 🎉 {t('nftDetails.gasless')}</p>
            ) : (
              <p className="text-orange-600 font-medium">• 💰 {t('nftDetails.gasPaid')}</p>
            )}
          </div>
        </div>

        {/* Action Buttons for Direct Mint */}
        <div className="flex gap-4">
          <button
            onClick={() => window.open(`https://basescan.org/token/${process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS}`, '_blank')}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            {t('buttons.viewBaseScan')}
          </button>

          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            {t('buttons.perfect')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-green-600 mb-2">{t('success.title')} 🎉</h2>
        <p className="text-gray-600">
          {t('success.subtitle', { tokenId })}
        </p>
      </div>

      {/* QR Code */}
      <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center">
        <h3 className="font-semibold mb-4">{t('qrCode.title')}</h3>
        <div className="flex justify-center mb-4">
          <QRCodeSVG
            value={shareUrl}
            size={200}
            level="M"
            includeMargin={true}
            className="border border-gray-200 rounded-lg"
          />
        </div>
        <p className="text-sm text-gray-500">
          {t('qrCode.subtitle')}
        </p>
      </div>

      {/* Share URL */}
      <div className="space-y-3">
        <h3 className="font-semibold">{t('giftLink.title')}</h3>
        <div className="flex gap-2">
          <div className="flex-1 p-3 bg-gray-50 rounded-lg border">
            <span className="text-sm text-gray-600 break-all">{shortUrl}</span>
          </div>
          <button
            onClick={() => copyToClipboard(shareUrl, 'url')}
            className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            {copied && copyType === 'url' ? '✓' : '📋'}
          </button>
        </div>
      </div>

      {/* Share Message */}
      <div className="space-y-3">
        <h3 className="font-semibold">{t('shareMessageSection.title')}</h3>
        <div className="p-4 bg-gray-50 rounded-lg border">
          <p className="text-sm text-gray-700 whitespace-pre-line">{shareMessage}</p>
        </div>
        <button
          onClick={() => copyToClipboard(shareMessage, 'message')}
          className="w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {copied && copyType === 'message' ? `✓ ${t('giftLink.copied')}` : `📋 ${t('shareMessageSection.copyButton')}`}
        </button>
      </div>

      {/* Social Share Buttons */}
      <div className="space-y-3">
        <h3 className="font-semibold">{t('socialShare.title')}</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleSocialShare('whatsapp')}
            className="flex items-center justify-center gap-2 p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <span>📱</span>
            WhatsApp
          </button>
          
          <button
            onClick={() => handleSocialShare('telegram')}
            className="flex items-center justify-center gap-2 p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <span>✈️</span>
            Telegram
          </button>
          
          <button
            onClick={() => handleSocialShare('email')}
            className="flex items-center justify-center gap-2 p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <span>📧</span>
            Email
          </button>
          
          <button
            onClick={() => handleSocialShare('twitter')}
            className="flex items-center justify-center gap-2 p-3 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            <span>🐦</span>
            Twitter
          </button>
        </div>
      </div>

      {/* NFT Details */}
      <div className="bg-blue-50 rounded-xl p-4">
        <h3 className="font-semibold text-blue-800 mb-2">{t('nftDetails.title')}</h3>
        <div className="space-y-1 text-sm text-blue-700">
          <p>• {t('nftDetails.tokenId')} #{tokenId}</p>
          <p>• {t('nftDetails.blockchain')} {t('nftDetails.blockchainValue')}</p>
          <p>• {t('nftDetails.standard')} {t('nftDetails.standardValue')}</p>
          <p>• {t('nftDetails.walletIntegrated')} ✅ {t('nftDetails.walletReady')}</p>
          {wasGasless ? (
            <p className="text-green-600 font-medium">• 🎉 {t('nftDetails.gasless')}</p>
          ) : (
            <p className="text-orange-600 font-medium">• 💰 {t('nftDetails.gasPaid')}</p>
          )}
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-purple-50 rounded-xl p-4">
        <h3 className="font-semibold text-purple-800 mb-2">{t('nextSteps.title')}</h3>
        <ul className="space-y-1 text-sm text-purple-700">
          <li>1. {t('nextSteps.step1')}</li>
          <li>2. {t('nextSteps.step2')}</li>
          <li>3. {t('nextSteps.step3')}</li>
          <li>4. {t('nextSteps.step4')}</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => window.open(`https://basescan.org/token/${shareUrl.split('/')[4]}`, '_blank')}
          className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          {t('buttons.viewBaseScan')}
        </button>

        <button
          onClick={onClose}
          className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
        >
          {t('buttons.perfect')}
        </button>
      </div>

      {/* Referral Earning */}
      <div className="text-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
        <p className="text-sm text-orange-700">
          💰 <strong>{t('referral.title')}</strong> {t('referral.description')}
          <br />
          <a href="/referrals" className="text-orange-600 hover:underline font-medium">
            {t('referral.link')}
          </a>
        </p>
      </div>
    </div>
  );
};