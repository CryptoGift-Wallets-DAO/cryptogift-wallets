"use client";

/**
 * COMPETITION PAGE - Vista principal de una competencia
 *
 * Muestra el estado actual de la competencia:
 * - Info general (título, código, formato)
 * - Participantes registrados
 * - Jueces registrados
 * - Estado (esperando, activa, resuelta)
 * - Acciones disponibles según rol
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Trophy,
  Users,
  Scale,
  Clock,
  Share2,
  Copy,
  Check,
  Loader2,
  Play,
  ArrowLeft,
  Sparkles,
  UserPlus,
  Coins,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

// Tipo temporal para la competencia (después vendrá del backend)
interface Competition {
  id: string;
  code: string;
  title: string;
  description?: string;
  format: string;
  status: 'pending' | 'active' | 'resolving' | 'completed' | 'cancelled';
  stakeAmount: string;
  currency: string;
  participants: Array<{ address: string; joinedAt: string }>;
  arbiters: Array<{ address: string; joinedAt: string }>;
  createdAt: string;
  createdBy: string;
}

// Mock data para desarrollo (después se reemplaza con API call)
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
    participants: [],
    arbiters: [],
    createdAt: new Date().toISOString(),
    createdBy: '0x0000...0000',
  };
}

function abbreviateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function CompetitionPage() {
  const params = useParams();
  const competitionId = params.id as string;

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // TODO: Reemplazar con llamada a API real
    const fetchCompetition = async () => {
      setLoading(true);
      try {
        // Simular fetch
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

  const handleCopyLink = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const participantLink = typeof window !== 'undefined'
    ? `${window.location.origin}/competencia/${competitionId}/join`
    : '';
  const arbiterLink = typeof window !== 'undefined'
    ? `${window.location.origin}/competencia/${competitionId}/arbiter`
    : '';

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto mb-4" />
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
          <p className="text-gray-400 mb-6">El ID "{competitionId}" no existe</p>
          <Link href="/modelos" className="text-amber-400 hover:text-amber-300">
            ← Volver a Modelos
          </Link>
        </div>
      </main>
    );
  }

  const statusConfig = {
    pending: { label: 'Esperando participantes', color: 'text-amber-400', bg: 'bg-amber-500/20' },
    active: { label: 'En progreso', color: 'text-green-400', bg: 'bg-green-500/20' },
    resolving: { label: 'Esperando resolución', color: 'text-blue-400', bg: 'bg-blue-500/20' },
    completed: { label: 'Finalizada', color: 'text-gray-400', bg: 'bg-gray-500/20' },
    cancelled: { label: 'Cancelada', color: 'text-red-400', bg: 'bg-red-500/20' },
  };

  const status = statusConfig[competition.status];

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-gray-950 to-gray-950" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/modelos"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Modelos
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-white/10 p-6 mb-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                <Trophy className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{competition.title}</h1>
                <p className="text-amber-400 font-mono text-sm">{competition.code}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.color}`}>
              {status.label}
            </span>
          </div>

          {competition.description && (
            <p className="text-gray-400 mb-4">{competition.description}</p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-white">{competition.participants.length}</div>
              <div className="text-xs text-gray-500">Participantes</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-white">{competition.arbiters.length}</div>
              <div className="text-xs text-gray-500">Jueces</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-amber-400">{competition.stakeAmount}</div>
              <div className="text-xs text-gray-500">{competition.currency} / persona</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-white">
                {competition.format === 'adaptive' ? '🎲' : competition.format}
              </div>
              <div className="text-xs text-gray-500">Formato</div>
            </div>
          </div>
        </motion.div>

        {/* Actions for pending competition */}
        {competition.status === 'pending' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid md:grid-cols-2 gap-4 mb-6"
          >
            {/* Join as participant */}
            <Link
              href={`/competencia/${competitionId}/join`}
              className="bg-gradient-to-r from-green-600/20 to-emerald-600/20
                       border border-green-500/30 rounded-2xl p-5
                       hover:border-green-500/50 transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-green-500/20">
                  <UserPlus className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Unirse como Participante</h3>
                  <p className="text-sm text-gray-400">Compite por el premio</p>
                </div>
              </div>
              <div className="text-green-400 text-sm group-hover:translate-x-1 transition-transform">
                Entrar →
              </div>
            </Link>

            {/* Join as arbiter */}
            <Link
              href={`/competencia/${competitionId}/arbiter`}
              className="bg-gradient-to-r from-purple-600/20 to-pink-600/20
                       border border-purple-500/30 rounded-2xl p-5
                       hover:border-purple-500/50 transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-purple-500/20">
                  <Scale className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Unirse como Juez</h3>
                  <p className="text-sm text-gray-400">Decide el ganador</p>
                </div>
              </div>
              <div className="text-purple-400 text-sm group-hover:translate-x-1 transition-transform">
                Entrar →
              </div>
            </Link>
          </motion.div>
        )}

        {/* Share links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-white/10 p-6 mb-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-amber-400" />
            Compartir Links
          </h2>

          <div className="space-y-3">
            {/* Participant link */}
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-1">Link para Participantes</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm text-amber-400 truncate">{participantLink}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(participantLink)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <Copy className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Arbiter link */}
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-1">Link para Jueces</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm text-purple-400 truncate">{arbiterLink}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(arbiterLink)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <Copy className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Participants list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-white/10 p-6 mb-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-400" />
            Participantes ({competition.participants.length})
          </h2>

          {competition.participants.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">Aún no hay participantes</p>
              <p className="text-sm text-gray-600">Comparte el link para que se unan</p>
            </div>
          ) : (
            <div className="space-y-2">
              {competition.participants.map((p, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                  <span className="text-white font-mono">{abbreviateAddress(p.address)}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(p.joinedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Arbiters list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-white/10 p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Scale className="w-5 h-5 text-purple-400" />
            Jueces ({competition.arbiters.length})
          </h2>

          {competition.arbiters.length === 0 ? (
            <div className="text-center py-8">
              <Scale className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">Aún no hay jueces</p>
              <p className="text-sm text-gray-600">Comparte el link de árbitros</p>
            </div>
          ) : (
            <div className="space-y-2">
              {competition.arbiters.map((a, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                  <span className="text-white font-mono">{abbreviateAddress(a.address)}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(a.joinedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Start button (only for creator when enough participants) */}
        {competition.status === 'pending' && competition.participants.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6"
          >
            <button
              className="w-full py-4 rounded-2xl font-bold text-lg
                       bg-gradient-to-r from-amber-500 to-orange-500 text-black
                       hover:shadow-lg hover:shadow-amber-500/25 transition-all
                       flex items-center justify-center gap-3"
            >
              <Play className="w-6 h-6" />
              Iniciar Competencia
            </button>
            <p className="text-center text-sm text-gray-500 mt-2">
              Al iniciar, se cierra la entrada y el sistema determina el formato
            </p>
          </motion.div>
        )}
      </div>
    </main>
  );
}
