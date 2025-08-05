"use client";

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

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
      alert(`Copia manualmente: ${text}`);
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const shareMessage = `🎁 ¡Te he enviado un regalo cripto especial!

Es un NFT único que contiene criptomonedas reales. Solo tienes que:
1. Hacer clic en el link
2. Conectar tu wallet (o crear una nueva)
3. ¡Reclamar tu regalo!

${shareUrl || 'https://cryptogift-wallets.vercel.app'}

Bienvenid@ al futuro de los regalos 💎✨`;

  const shortUrl = shareUrl ? shareUrl.replace('https://', '').replace('http://', '') : 'cryptogift-wallets.vercel.app';

  const handleSocialShare = (platform: string) => {
    const text = encodeURIComponent(shareMessage);
    const url = encodeURIComponent(shareUrl || 'https://cryptogift-wallets.vercel.app');
    
    const shareUrls = {
      whatsapp: `https://wa.me/?text=${text}`,
      telegram: `https://t.me/share/url?url=${url}&text=${encodeURIComponent('🎁 ¡Te he enviado un regalo cripto especial!')}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent('🎁 Acabo de crear un regalo cripto único en @CryptoGiftWallets')}`,
      email: `mailto:?subject=${encodeURIComponent('🎁 Regalo Cripto para Ti')}&body=${encodeURIComponent(shareMessage)}`
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
          <h2 className="text-2xl font-bold text-blue-600 mb-2">¡NFT Creado Directamente! 🎯</h2>
          <p className="text-gray-600">
            Tu NFT-wallet #{tokenId} fue minteado directamente a tu wallet
          </p>
        </div>

        {/* Direct Mint Info */}
        <div className="bg-blue-50 rounded-xl p-6 text-center">
          <div className="text-4xl mb-4">💎</div>
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Escrow Omitido</h3>
          <p className="text-blue-700 mb-4">
            {message || `NFT minteado directamente a tu wallet. Token ID: ${tokenId}`}
          </p>
          <div className="bg-white rounded-lg p-3 text-sm text-gray-600">
            <p className="font-medium mb-1">¿Qué significa esto?</p>
            <p>• El NFT está directamente en tu wallet</p>
            <p>• No hay período de espera o password</p>
            <p>• Puedes usarlo inmediatamente</p>
            <p>• No es necesario &quot;reclamar&quot; nada</p>
          </div>
        </div>

        {/* NFT Details for Direct Mint */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="font-semibold text-gray-800 mb-2">Detalles del NFT</h3>
          <div className="space-y-1 text-sm text-gray-700">
            <p>• Token ID: #{tokenId}</p>
            <p>• Blockchain: Base Sepolia</p>
            <p>• Estándar: ERC-6551 (Token Bound Account)</p>
            <p>• Status: ✅ Ya en tu wallet</p>
            <p>• Wallet integrada: ✅ Lista para usar</p>
            {wasGasless ? (
              <p className="text-green-600 font-medium">• 🎉 Transacción GASLESS (gratis)</p>
            ) : (
              <p className="text-orange-600 font-medium">• 💰 Gas pagado (~$0.01)</p>
            )}
          </div>
        </div>

        {/* Action Buttons for Direct Mint */}
        <div className="flex gap-4">
          <button
            onClick={() => window.open(`https://basescan.org/token/${process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS}`, '_blank')}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Ver en BaseScan
          </button>
          
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            ¡Perfecto!
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
        <h2 className="text-2xl font-bold text-green-600 mb-2">¡Regalo Creado! 🎉</h2>
        <p className="text-gray-600">
          Tu NFT-wallet #{tokenId} está listo para ser compartido
        </p>
      </div>

      {/* QR Code */}
      <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center">
        <h3 className="font-semibold mb-4">Escanea para Reclamar</h3>
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
          Tu amigo puede escanear este código QR con su teléfono
        </p>
      </div>

      {/* Share URL */}
      <div className="space-y-3">
        <h3 className="font-semibold">Link de Regalo</h3>
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
        <h3 className="font-semibold">Mensaje Completo</h3>
        <div className="p-4 bg-gray-50 rounded-lg border">
          <p className="text-sm text-gray-700 whitespace-pre-line">{shareMessage}</p>
        </div>
        <button
          onClick={() => copyToClipboard(shareMessage, 'message')}
          className="w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {copied && copyType === 'message' ? '✓ Copiado' : '📋 Copiar Mensaje'}
        </button>
      </div>

      {/* Social Share Buttons */}
      <div className="space-y-3">
        <h3 className="font-semibold">Compartir en Redes</h3>
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
        <h3 className="font-semibold text-blue-800 mb-2">Detalles del NFT</h3>
        <div className="space-y-1 text-sm text-blue-700">
          <p>• Token ID: #{tokenId}</p>
          <p>• Blockchain: Base Sepolia</p>
          <p>• Estándar: ERC-6551 (Token Bound Account)</p>
          <p>• Wallet integrada: ✅ Lista para usar</p>
          {wasGasless ? (
            <p className="text-green-600 font-medium">• 🎉 Transacción GASLESS (gratis)</p>
          ) : (
            <p className="text-orange-600 font-medium">• 💰 Gas pagado (~$0.01)</p>
          )}
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-purple-50 rounded-xl p-4">
        <h3 className="font-semibold text-purple-800 mb-2">Próximos Pasos</h3>
        <ul className="space-y-1 text-sm text-purple-700">
          <li>1. Comparte el link o QR con tu amigo</li>
          <li>2. Tu amigo conecta su wallet y reclama el NFT</li>
          <li>3. ¡Puede usar la wallet inmediatamente!</li>
          <li>4. Puedes ver el progreso en el explorador de blockchain</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => window.open(`https://basescan.org/token/${shareUrl.split('/')[4]}`, '_blank')}
          className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Ver en BaseScan
        </button>
        
        <button
          onClick={onClose}
          className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
        >
          ¡Perfecto!
        </button>
      </div>

      {/* Referral Earning */}
      <div className="text-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
        <p className="text-sm text-orange-700">
          💰 <strong>¿Sabías que puedes ganar dinero?</strong> Por cada amigo que cree un regalo usando tu link de referido, ganarás el 20% de las ganancias generadas. 
          <br />
          <a href="/referrals" className="text-orange-600 hover:underline font-medium">
            Ver mi panel de referidos →
          </a>
        </p>
      </div>
    </div>
  );
};