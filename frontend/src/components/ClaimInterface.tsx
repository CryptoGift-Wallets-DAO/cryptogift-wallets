"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { makeAuthenticatedRequest } from '../lib/siweClient';
import { ConnectAndAuthButton } from './ConnectAndAuthButton';

interface ClaimInterfaceProps {
  nftData: any;
  tokenId: string;
  contractAddress: string;
  claimerAddress: string;
  isLoading: boolean;
  error: string | null;
  onClaimSuccess?: (result: any) => void;
  onWalletOpen?: () => void; // Callback to open wallet after guardian setup
}

export const ClaimInterface: React.FC<ClaimInterfaceProps> = ({
  nftData,
  tokenId,
  contractAddress,
  claimerAddress,
  isLoading: externalLoading,
  error: externalError,
  onClaimSuccess,
  onWalletOpen
}) => {
  const auth = useAuth();
  const [showGuardianSetup, setShowGuardianSetup] = useState(false);
  const [guardians, setGuardians] = useState(['', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCryptoExplanation, setShowCryptoExplanation] = useState(false);
  const [claimResult, setClaimResult] = useState<any>(null);

  const handleClaim = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check SIWE authentication
      if (!auth.isAuthenticated) {
        setError('Please authenticate with your wallet first to claim the NFT');
        setIsLoading(false);
        return;
      }
      
      console.log('🔍 DEBUG ClaimInterface: Request params:', {
        tokenId,
        contractAddress,
        claimerAddress,
        claimerAddressValid: !!claimerAddress && claimerAddress !== '0x0000000000000000000000000000000000000000'
      });
      
      // Use authenticated request with JWT token
      const response = await makeAuthenticatedRequest('/api/claim-nft', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tokenId,
          contractAddress,
          claimerAddress,
          setupGuardians: false, // Will setup later if user chooses
          guardianEmails: []
        }),
      });

      if (!response.ok) {
        throw new Error(`Claim failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setClaimResult(result);
        setShowGuardianSetup(true);
        onClaimSuccess?.(result);
        console.log('✅ NFT claimed successfully:', result);
      } else {
        throw new Error(result.message || 'Claim failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim NFT');
      console.error('Claim error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuardianChange = (index: number, value: string) => {
    const newGuardians = [...guardians];
    newGuardians[index] = value;
    setGuardians(newGuardians);
  };

  const setupGuardians = async () => {
    if (!claimResult) {
      setShowGuardianSetup(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check SIWE authentication
      if (!auth.isAuthenticated) {
        setError('Please authenticate with your wallet first to setup guardians');
        setIsLoading(false);
        return;
      }
      
      console.log('🔍 DEBUG ClaimInterface: Request params:', {
        tokenId,
        contractAddress,
        claimerAddress,
        claimerAddressValid: !!claimerAddress && claimerAddress !== '0x0000000000000000000000000000000000000000'
      });
      
      // Use authenticated request with JWT token
      const response = await makeAuthenticatedRequest('/api/claim-nft', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tokenId,
          contractAddress,
          claimerAddress,
          setupGuardians: true,
          guardianEmails: guardians.filter(g => g.trim())
        }),
      });

      if (!response.ok) {
        throw new Error(`Guardian setup failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.guardians?.success) {
        console.log('✅ Guardians configured successfully');
        // Auto-open wallet after guardian setup
        setTimeout(() => {
          if (onWalletOpen) {
            onWalletOpen();
          }
        }, 1000); // Small delay to show success
      } else {
        console.warn('Guardian setup had issues:', result.guardians);
      }
    } catch (err) {
      console.error('Guardian setup error:', err);
      // Don't show error for guardian setup failure since claim already succeeded
    } finally {
      setIsLoading(false);
      setShowGuardianSetup(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Authentication Section */}
      {!auth.isAuthenticated && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">🔐</div>
            <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-400 mb-2">
              Authentication Required
            </h3>
            <p className="text-yellow-700 dark:text-yellow-300">
              Please connect and authenticate your wallet to claim this NFT gift securely.
            </p>
          </div>
          
          <ConnectAndAuthButton 
            showAuthStatus={true}
            className="w-full"
            onAuthChange={(isAuthenticated) => {
              if (isAuthenticated) {
                console.log('✅ User authenticated, can now claim NFT');
              }
            }}
          />
        </div>
      )}

      {/* Gift Message */}
      <div className="text-center bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-2xl p-6">
        <div className="text-4xl mb-4">🎁</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
          ¡Tienes un Regalo Cripto!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Alguien especial te ha enviado este NFT único con criptomonedas reales incluidas.
        </p>
      </div>

      {/* Gift Details */}
      <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
        <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4">Detalles del Regalo</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Valor inicial:</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              {nftData.attributes?.find((attr: any) => attr.trait_type === 'Initial Balance')?.value || 'N/A'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Filtro aplicado:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {nftData.attributes?.find((attr: any) => attr.trait_type === 'Filter')?.value || 'Original'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Fecha de creación:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {nftData.attributes?.find((attr: any) => attr.trait_type === 'Creation Date')?.value 
                ? new Date(nftData.attributes.find((attr: any) => attr.trait_type === 'Creation Date').value).toLocaleDateString()
                : 'N/A'
              }
            </span>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6">
        <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-4">¿Cómo funciona?</h3>
        <div className="space-y-3 text-sm text-blue-700 dark:text-blue-400">
          <div className="flex items-start">
            <span className="font-bold mr-2">1.</span>
            <span>Al reclamar, el NFT se transfiere a tu wallet conectada</span>
          </div>
          <div className="flex items-start">
            <span className="font-bold mr-2">2.</span>
            <span>El NFT incluye una wallet integrada (ERC-6551) con las criptomonedas</span>
          </div>
          <div className="flex items-start">
            <span className="font-bold mr-2">3.</span>
            <span>Puedes usar los fondos inmediatamente: retirar, cambiar o enviar</span>
          </div>
          <div className="flex items-start">
            <span className="font-bold mr-2">4.</span>
            <span>Todas las transacciones tienen gas gratis patrocinado</span>
          </div>
        </div>
      </div>

      {/* Crypto Novice Section */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-green-800 dark:text-green-300">🌱 ¿Nuevo en el mundo cripto?</h3>
          <button
            onClick={() => setShowCryptoExplanation(!showCryptoExplanation)}
            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
          >
            {showCryptoExplanation ? '▼' : '▶'}
          </button>
        </div>
        
        {!showCryptoExplanation ? (
          <div className="text-sm text-green-700 dark:text-green-400 space-y-2">
            <p className="font-medium">¡No te preocupes! Este regalo funciona como tu primera wallet completa.</p>
            <p>No necesitas MetaMask ni otra wallet externa para empezar.</p>
            <button
              onClick={() => setShowCryptoExplanation(true)}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 underline"
            >
              Clic aquí para aprender más →
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-sm text-green-700 dark:text-green-400">
            <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-green-200 dark:border-green-700">
              <h4 className="font-semibold mb-2 text-green-800 dark:text-green-300">💡 ¿Qué es esto exactamente?</h4>
              <p>Este regalo es un <strong>NFT-Wallet</strong>: una imagen única que también funciona como una wallet de criptomonedas real.</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-green-200 dark:border-green-700">
              <h4 className="font-semibold mb-2 text-green-800 dark:text-green-300">🎯 ¿Necesito otra wallet?</h4>
              <p><strong>¡NO!</strong> Puedes usar esta wallet indefinidamente. Es tu primera wallet cripto completa.</p>
              <ul className="mt-2 space-y-1 ml-4 list-disc">
                <li>Enviar y recibir dinero digital</li>
                <li>Cambiar monedas (USDC, ETH, etc.)</li>
                <li>Todas las transacciones son gratuitas</li>
                <li>Funciona en móvil y computadora</li>
              </ul>
            </div>
            
            <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-green-200 dark:border-green-700">
              <h4 className="font-semibold mb-2 text-green-800 dark:text-green-300">🔒 ¿Es seguro?</h4>
              <p>Sí, muy seguro. Usa la misma tecnología que bancos digitales grandes:</p>
              <ul className="mt-2 space-y-1 ml-4 list-disc">
                <li>Blockchain verificado y auditado</li>
                <li>Tus fondos están siempre bajo tu control</li>
                <li>Recuperación social en caso de problemas</li>
              </ul>
            </div>
            
            <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4 border border-green-300 dark:border-green-600">
              <h4 className="font-semibold mb-2 text-green-800 dark:text-green-300">🚀 ¿Qué hago después de reclamar?</h4>
              <ol className="space-y-1 ml-4 list-decimal">
                <li>Reclama tu regalo (botón azul arriba)</li>
                <li>Explora la interfaz de wallet integrada</li>
                <li>Prueba enviar pequeñas cantidades a amigos</li>
                <li>¡Bienvenido al futuro del dinero digital!</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {(error || externalError) && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 text-red-700 dark:text-red-400">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium text-red-800 dark:text-red-300">Error al reclamar</p>
              <p className="text-sm mt-1 text-red-700 dark:text-red-400">{error || externalError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {claimResult && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 text-green-700 dark:text-green-400">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-green-500 dark:text-green-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium text-green-800 dark:text-green-300">¡Regalo reclamado exitosamente!</p>
              <p className="text-sm mt-1 text-green-700 dark:text-green-400">
                {claimResult.claim?.gasless ? 'Transacción gratuita completada' : 'Transacción blockchain completada'}
              </p>
              {claimResult.nft?.tbaAddress && (
                <p className="text-xs mt-1 font-mono text-green-600 dark:text-green-500">
                  TBA: {claimResult.nft.tbaAddress.slice(0, 10)}...{claimResult.nft.tbaAddress.slice(-8)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Claim Button */}
      {!showGuardianSetup && !claimResult && auth.isAuthenticated ? (
        <div className="text-center">
          <button
            onClick={handleClaim}
            disabled={isLoading || externalLoading}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-2xl font-bold text-lg hover:from-green-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            {(isLoading || externalLoading) ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mr-3"></div>
                Reclamando tu Regalo...
              </div>
            ) : (
              '🎁 Reclamar Mi Regalo'
            )}
          </button>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            Gratis • Sin comisiones • Transacción segura
          </p>
        </div>
      ) : showGuardianSetup ? (
        /* Guardian Setup */
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">🔒 Configura tu Seguridad</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Añade 3 contactos de confianza para recuperar tu wallet si pierdes acceso
            </p>
          </div>

          <div className="space-y-3">
            {guardians.map((guardian, index) => (
              <div key={index}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Guardián {index + 1}
                </label>
                <input
                  type="email"
                  value={guardian}
                  onChange={(e) => handleGuardianChange(index, e.target.value)}
                  placeholder="email@ejemplo.com"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowGuardianSetup(false);
                // Auto-open wallet when skipping guardian setup
                setTimeout(() => {
                  if (onWalletOpen) {
                    onWalletOpen();
                  }
                }, 500);
              }}
              className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-900 dark:text-white"
            >
              Ahora No
            </button>
            <button
              onClick={setupGuardians}
              disabled={guardians.filter(g => g.trim()).length < 3 || isLoading}
              className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Configurando...' : 'Configurar Guardianes'}
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Podrás configurar esto más tarde desde la configuración de tu wallet
          </p>
        </div>
      ) : (
        /* Claim Complete - Next Steps */
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            ¡Tu regalo ya está en tu wallet!
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Ahora puedes usar los fondos: retirar, cambiar o enviar a otros.
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (onWalletOpen) {
                  onWalletOpen();
                } else {
                  // Fallback: redirect to token page with wallet open
                  window.location.href = `/token/${contractAddress}/${tokenId}?wallet=open`;
                }
              }}
              className="flex-1 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-medium hover:from-green-600 hover:to-blue-600 transition-all text-center"
            >
              Ver Mi Wallet
            </button>
            <button
              onClick={() => setShowGuardianSetup(true)}
              className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-900 dark:text-white"
            >
              Configurar Seguridad
            </button>
          </div>
        </div>
      )}

      {/* Security Info */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6">
        <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Seguridad y Transparencia
        </h3>
        
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-start">
            <span className="text-green-500 dark:text-green-400 mr-2">✓</span>
            <span>Contratos auditados por OpenZeppelin</span>
          </div>
          <div className="flex items-start">
            <span className="text-green-500 dark:text-green-400 mr-2">✓</span>
            <span>Fondos guardados on-chain en Base blockchain</span>
          </div>
          <div className="flex items-start">
            <span className="text-green-500 dark:text-green-400 mr-2">✓</span>
            <span>Recuperación social con guardianes de confianza</span>
          </div>
          <div className="flex items-start">
            <span className="text-green-500 dark:text-green-400 mr-2">✓</span>
            <span>Sin custodia: tú controlas tus fondos</span>
          </div>
        </div>
      </div>

      {/* Create Your Own */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-white text-center">
        <h3 className="font-bold mb-2">¿Te gustó tu regalo?</h3>
        <p className="text-purple-100 text-sm mb-4">
          Crea tus propios regalos cripto y gana comisiones por cada amigo que invites
        </p>
        <Link
          href="/?ref=nuevo"
          className="inline-block bg-white text-purple-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
        >
          Crear Mi Primer Regalo
        </Link>
      </div>
    </div>
  );
};