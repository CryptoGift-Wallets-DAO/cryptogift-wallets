"use client";

/**
 * ARBITER PAGE - Unirse como juez/árbitro
 *
 * Permite al usuario:
 * - Ver info de la competencia
 * - Conectar wallet
 * - Confirmar rol de juez (sin stake)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Scale,
  Loader2,
  Check,
  ArrowLeft,
  Wallet,
  AlertCircle,
  Sparkles,
  Users,
  Eye,
  Vote,
} from 'lucide-react';
import Link from 'next/link';

interface Competition {
  id: string;
  code: string;
  title: string;
  description?: string;
  format: string;
  status: 'pending' | 'active' | 'resolving' | 'completed' | 'cancelled';
  stakeAmount: string;
  currency: string;
  arbiters: Array<{ address: string; joinedAt: string }>;
  participants: Array<{ address: string; joinedAt: string }>;
}

function getMockCompetition(id: string): Competition {
  return {
    id,
    code: id.includes('COMP-') ? id : `COMP-${id.slice(-8).toUpperCase()}`,
    title: `Competencia ${id.slice(-6)}`,
    description: 'Competencia adaptativa - el formato se determina al iniciar',
    format: 'adaptive',
    status: 'pending',
    stakeAmount: '0.01',
    currency: 'USDC',
    arbiters: [],
    participants: [],
  };
}

export default function ArbiterPage() {
  const params = useParams();
  const router = useRouter();
  const competitionId = params.id as string;

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompetition = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        const data = getMockCompetition(competitionId);
        setCompetition(data);
      } catch (error) {
        console.error('Error fetching competition:', error);
      } finally {
        setLoading(false);
      }
    };

    if (competitionId) {
      fetchCompetition();
    }
  }, [competitionId]);

  const handleConnectWallet = async () => {
    // TODO: Integrar con ThirdWeb/MetaMask
    setWalletConnected(true);
    setWalletAddress('0x1234...5678');
  };

  const handleJoinAsArbiter = async () => {
    if (!walletConnected) {
      await handleConnectWallet();
      return;
    }

    setJoining(true);
    try {
      // TODO: Llamar a API para registrarse como juez
      await new Promise(resolve => setTimeout(resolve, 1500));
      setJoined(true);

      // Redirigir a la página principal después de 2 segundos
      setTimeout(() => {
        router.push(`/competencia/${competitionId}`);
      }, 2000);
    } catch (error) {
      console.error('Error joining as arbiter:', error);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Cargando competencia...</p>
        </div>
      </main>
    );
  }

  if (!competition) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Competencia no encontrada</h1>
          <Link href="/modelos" className="text-amber-400 hover:text-amber-300">
            ← Volver a Modelos
          </Link>
        </div>
      </main>
    );
  }

  if (competition.status !== 'pending') {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Registro de jueces cerrado</h1>
          <p className="text-gray-400 mb-6">Esta competencia ya no acepta nuevos jueces</p>
          <Link href={`/competencia/${competitionId}`} className="text-amber-400 hover:text-amber-300">
            Ver competencia →
          </Link>
        </div>
      </main>
    );
  }

  if (joined) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-400 to-pink-500
                     flex items-center justify-center shadow-lg shadow-purple-500/30 mb-6"
          >
            <Check className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white mb-2">Registrado como Juez!</h1>
          <p className="text-gray-400 mb-2">Podrás votar cuando la competencia inicie</p>
          <p className="text-sm text-gray-500">Redirigiendo...</p>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-gray-950 to-gray-950" />
      </div>

      <div className="relative max-w-lg mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href={`/competencia/${competitionId}`}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la competencia
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20
                       border border-purple-500/30 flex items-center justify-center mb-4">
            <Scale className="w-10 h-10 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Unirse como Juez</h1>
          <p className="text-gray-400">{competition.title}</p>
          <p className="text-amber-400 font-mono text-sm mt-1">{competition.code}</p>
        </motion.div>

        {/* Competition info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 p-5 mb-6"
        >
          <h2 className="text-sm font-medium text-gray-400 mb-3">Estado de la competencia</h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Participantes</span>
              <span className="text-white">{competition.participants.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Jueces actuales</span>
              <span className="text-white">{competition.arbiters.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Premio por persona</span>
              <span className="text-amber-400">{competition.stakeAmount} {competition.currency}</span>
            </div>
          </div>
        </motion.div>

        {/* Arbiter role info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-purple-600/20 to-pink-600/20
                   border border-purple-500/30 rounded-2xl p-5 mb-6"
        >
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Scale className="w-5 h-5 text-purple-400" />
            Rol del Juez
          </h3>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-purple-400 mt-0.5" />
              <div>
                <div className="text-white text-sm font-medium">Observar</div>
                <div className="text-gray-400 text-xs">Ver el desarrollo de la competencia</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Vote className="w-5 h-5 text-purple-400 mt-0.5" />
              <div>
                <div className="text-white text-sm font-medium">Votar</div>
                <div className="text-gray-400 text-xs">Decidir el ganador cuando termine</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-400 mt-0.5" />
              <div>
                <div className="text-white text-sm font-medium">Sin stake</div>
                <div className="text-gray-400 text-xs">No necesitas depositar para ser juez</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Wallet connection */}
        {!walletConnected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 rounded-2xl border border-white/10 p-5 mb-6"
          >
            <div className="flex items-center gap-3">
              <Wallet className="w-6 h-6 text-amber-400" />
              <div>
                <div className="font-medium text-white">Conecta tu wallet</div>
                <div className="text-sm text-gray-400">Para registrarte como juez</div>
              </div>
            </div>
          </motion.div>
        )}

        {walletConnected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-purple-500/10 rounded-2xl border border-purple-500/30 p-4 mb-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-purple-400">Wallet conectada</div>
                <div className="text-white font-mono">{walletAddress}</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Join button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleJoinAsArbiter}
          disabled={joining}
          className="w-full py-4 rounded-2xl font-bold text-lg
                   bg-gradient-to-r from-purple-500 to-pink-500 text-white
                   hover:shadow-lg hover:shadow-purple-500/25 transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center gap-3"
        >
          {joining ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Registrando...</span>
            </>
          ) : walletConnected ? (
            <>
              <Scale className="w-5 h-5" />
              <span>Registrarse como Juez</span>
            </>
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              <span>Conectar Wallet</span>
            </>
          )}
        </motion.button>

        <p className="text-center text-sm text-gray-500 mt-4">
          Como juez, te comprometes a votar de forma justa
        </p>
      </div>
    </main>
  );
}
