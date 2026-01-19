/**
 * SAFE DEPLOYMENT PANEL
 * UI para desplegar el Gnosis Safe de una competencia
 *
 * Funcionalidades:
 * - Muestra estado del Safe (predicho / desplegado)
 * - Permite al creador desplegar el Safe
 * - Confirma deployment vía API
 * - Muestra owners y threshold
 */

'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
  Users,
  Copy,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { useActiveAccount, useActiveWallet } from 'thirdweb/react';
import { ethers } from 'ethers';
import { SAFE_CONTRACTS } from '../lib/safeClient';

// Types
interface SafeCustody {
  safeAddress: string;
  owners: string[];
  threshold: number;
  deployed: boolean;
  predictedAt?: string;
  saltNonce?: string;
}

interface SafeDeploymentInfo {
  predictedAddress: string;
  owners: string[];
  threshold: number;
  saltNonce: string;
  deployed: boolean;
  chainId: number;
  contracts: {
    singleton: string;
    proxyFactory: string;
    fallbackHandler: string;
  };
}

interface SafeDeploymentPanelProps {
  competitionId: string;
  custody?: SafeCustody;
  safeDeploymentInfo?: SafeDeploymentInfo;
  isCreator: boolean;
  onDeploymentComplete?: () => void;
}

function abbreviateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export const SafeDeploymentPanel: React.FC<SafeDeploymentPanelProps> = ({
  competitionId,
  custody,
  safeDeploymentInfo,
  isCreator,
  onDeploymentComplete,
}) => {
  const account = useActiveAccount();
  const wallet = useActiveWallet();

  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Derived state
  const safeAddress = custody?.safeAddress || safeDeploymentInfo?.predictedAddress;
  const isDeployed = custody?.deployed ?? false;
  const owners = custody?.owners || safeDeploymentInfo?.owners || [];
  const threshold = custody?.threshold || safeDeploymentInfo?.threshold || 1;
  const saltNonce = custody?.saltNonce || safeDeploymentInfo?.saltNonce;

  // Copy address to clipboard
  const handleCopy = async () => {
    if (!safeAddress) return;
    await navigator.clipboard.writeText(safeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Deploy the Safe
  const handleDeploy = useCallback(async () => {
    if (!account?.address || !wallet || !safeAddress || !saltNonce) {
      setError('Wallet no conectada o datos incompletos');
      return;
    }

    setDeploying(true);
    setError(null);
    setTxHash(null);

    try {
      // Get the wallet adapter for ethers
      const walletAccount = wallet.getAccount();
      if (!walletAccount) {
        throw new Error('No se pudo obtener la cuenta del wallet');
      }

      // Create deployment transaction data manually
      // This uses the Safe Proxy Factory to deploy a new Safe
      const proxyFactory = SAFE_CONTRACTS.SAFE_PROXY_FACTORY;
      const singleton = SAFE_CONTRACTS.SAFE_L2_SINGLETON;
      const fallbackHandler = SAFE_CONTRACTS.FALLBACK_HANDLER;

      // Encode the Safe setup call
      const setupInterface = new ethers.Interface([
        'function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address payable paymentReceiver)',
      ]);

      const setupData = setupInterface.encodeFunctionData('setup', [
        owners,
        threshold,
        ethers.ZeroAddress, // to - no delegatecall
        '0x', // data
        fallbackHandler,
        ethers.ZeroAddress, // paymentToken
        0, // payment
        ethers.ZeroAddress, // paymentReceiver
      ]);

      // Encode the createProxyWithNonce call
      const factoryInterface = new ethers.Interface([
        'function createProxyWithNonce(address _singleton, bytes memory initializer, uint256 saltNonce) returns (address proxy)',
      ]);

      const deployData = factoryInterface.encodeFunctionData('createProxyWithNonce', [
        singleton,
        setupData,
        BigInt(saltNonce),
      ]);

      // Send the transaction using ThirdWeb's wallet
      const transaction = {
        to: proxyFactory as `0x${string}`,
        data: deployData as `0x${string}`,
        value: BigInt(0),
        chainId: 8453, // Base Mainnet
      };

      // Use ThirdWeb's sendTransaction
      const result = await walletAccount.sendTransaction(transaction);
      setTxHash(result.transactionHash);

      // Wait for confirmation
      // Poll for transaction receipt
      const provider = new ethers.JsonRpcProvider('https://mainnet.base.org', 8453);
      let receipt = null;
      let attempts = 0;
      while (!receipt && attempts < 60) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        receipt = await provider.getTransactionReceipt(result.transactionHash);
        attempts++;
      }

      if (!receipt) {
        throw new Error('Timeout esperando confirmación de la transacción');
      }

      if (receipt.status === 0) {
        throw new Error('La transacción falló en la blockchain');
      }

      // Confirm deployment with API
      const response = await fetch('/api/safe/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          safeAddress,
          competitionId,
          deploymentTxHash: result.transactionHash,
          owners,
          threshold,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Safe might be deployed but API failed - still show success
        console.warn('API confirmation failed:', data.error);
      }

      // Notify parent
      if (onDeploymentComplete) {
        onDeploymentComplete();
      }
    } catch (err: unknown) {
      console.error('Safe deployment error:', err);
      setError(err instanceof Error ? err.message : 'Error al desplegar el Safe');
    } finally {
      setDeploying(false);
    }
  }, [account, wallet, safeAddress, saltNonce, owners, threshold, competitionId, onDeploymentComplete]);

  // If no Safe info, don't render
  if (!safeAddress) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 mb-6 ${
        isDeployed
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-amber-500/10 border-amber-500/30'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDeployed ? 'bg-green-500/20' : 'bg-amber-500/20'}`}>
            <Shield className={`w-6 h-6 ${isDeployed ? 'text-green-400' : 'text-amber-400'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-white">Gnosis Safe Escrow</h3>
            <p className={`text-sm ${isDeployed ? 'text-green-400' : 'text-amber-400'}`}>
              {isDeployed ? 'Desplegado y activo' : 'Pendiente de despliegue'}
            </p>
          </div>
        </div>

        {isDeployed && (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
            <Check className="w-3 h-3 inline mr-1" />
            Activo
          </span>
        )}
      </div>

      {/* Safe Address */}
      <div className="bg-white/5 rounded-xl p-3 mb-4">
        <div className="text-xs text-gray-500 mb-1">
          {isDeployed ? 'Dirección del Safe' : 'Dirección predicha'}
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm text-white font-mono">{safeAddress}</code>
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Copiar dirección"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-white" />
            )}
          </button>
          {isDeployed && (
            <a
              href={`https://basescan.org/address/${safeAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="Ver en BaseScan"
            >
              <ExternalLink className="w-4 h-4 text-white" />
            </a>
          )}
        </div>
      </div>

      {/* Owners & Threshold */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/5 rounded-xl p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <Users className="w-3 h-3" />
            Owners
          </div>
          <div className="text-white font-medium">{owners.length}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <Shield className="w-3 h-3" />
            Threshold
          </div>
          <div className="text-white font-medium">{threshold} de {owners.length}</div>
        </div>
      </div>

      {/* Owners list */}
      <div className="bg-white/5 rounded-xl p-3 mb-4">
        <div className="text-xs text-gray-500 mb-2">Propietarios del Safe</div>
        <div className="space-y-1">
          {owners.map((owner, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-white font-mono">{abbreviateAddress(owner)}</span>
              {owner.toLowerCase() === account?.address?.toLowerCase() && (
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Tú</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Transaction hash */}
      {txHash && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 mb-4">
          <div className="text-xs text-gray-500 mb-1">Transacción de despliegue</div>
          <a
            href={`https://basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 text-sm hover:underline flex items-center gap-1"
          >
            {abbreviateAddress(txHash)}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Deploy button (only for creator when not deployed) */}
      {!isDeployed && isCreator && (
        <div className="space-y-3">
          {!account?.address ? (
            <div className="bg-amber-500/10 rounded-xl p-4 text-center">
              <Wallet className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-amber-200 text-sm">
                Conecta tu wallet para desplegar el Safe
              </p>
            </div>
          ) : (
            <button
              onClick={handleDeploy}
              disabled={deploying}
              className="w-full py-3 rounded-xl font-semibold
                       bg-gradient-to-r from-amber-500 to-orange-500 text-black
                       hover:shadow-lg hover:shadow-amber-500/25 transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
            >
              {deploying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Desplegando Safe...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Desplegar Gnosis Safe
                </>
              )}
            </button>
          )}

          <p className="text-xs text-gray-500 text-center">
            El Safe se despliega en Base Mainnet. Los fondos estarán seguros en custodia multisig.
          </p>
        </div>
      )}

      {/* Already deployed info */}
      {isDeployed && (
        <div className="text-center text-sm text-gray-400">
          <Check className="w-4 h-4 inline mr-1 text-green-400" />
          Safe desplegado y listo para recibir fondos
        </div>
      )}
    </motion.div>
  );
};

export default SafeDeploymentPanel;
