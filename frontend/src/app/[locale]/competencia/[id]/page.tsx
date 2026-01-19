"use client";

/**
 * COMPETITION PAGE - Vista principal de una competencia
 *
 * PRODUCCIÓN REAL:
 * - Conecta con API real /api/competition/[id]
 * - Usa ThirdWeb para wallet connection
 * - Muestra datos reales de Redis
 * - Permite iniciar competencia si es el creador
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  RefreshCw,
  ExternalLink,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { useActiveAccount } from 'thirdweb/react';
import { useAuth } from '../../../../hooks/useAuth';
import { makeAuthenticatedRequest, isAuthValid } from '../../../../lib/siweClient';

// Types from competition system
interface ParticipantEntry {
  address: string;
  position?: string;
  amount?: string;
  joinedAt: number;
}

interface Judge {
  address: string;
  role: string;
  weight?: number;
  reputation?: number;
}

interface Competition {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: 'draft' | 'pending' | 'active' | 'paused' | 'resolution' | 'resolved' | 'completed' | 'cancelled';
  creator?: {
    address: string;
    createdAt: string;
  };
  prizePool?: {
    total: number;
    currency: string;
    platformFee?: number;
  };
  timeline?: {
    createdAt: string;
    startsAt?: string;
    endsAt?: string;
  };
  participants?: {
    current: number;
    maxParticipants?: number;
    minParticipants?: number;
    entries: ParticipantEntry[];
  };
  arbitration?: {
    method: string;
    judges: Judge[];
    votingThreshold?: number;
    votes?: Array<{ judge: string; vote: string; timestamp: number }>;
  };
  rules?: {
    entryFee?: number;
  };
  safeAddress?: string;
  custody?: {
    safeAddress: string;
    deployed: boolean;
    threshold: number;
    owners: string[];
  };
}

function abbreviateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(timestamp: number | string): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CompetitionPage() {
  const params = useParams();
  const router = useRouter();
  const competitionId = params.id as string;
  const locale = params.locale as string || 'es';

  // Auth state
  const account = useActiveAccount();
  const { isAuthenticated, address: authAddress } = useAuth();

  // Competition state
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'participant' | 'arbiter' | null>(null);
  const [starting, setStarting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch competition data
  const fetchCompetition = useCallback(async () => {
    if (!competitionId) return;

    try {
      const response = await fetch(`/api/competition/${competitionId}?include=votes,events`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Competencia no encontrada');
        } else {
          const data = await response.json();
          setError(data.error || 'Error al cargar la competencia');
        }
        return;
      }

      const data = await response.json();
      if (data.success && data.data?.competition) {
        setCompetition(data.data.competition);
        setError(null);
      } else {
        setError('Formato de respuesta inválido');
      }
    } catch (err) {
      console.error('Error fetching competition:', err);
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [competitionId]);

  // Initial fetch
  useEffect(() => {
    fetchCompetition();
  }, [fetchCompetition]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchCompetition, 30000);
    return () => clearInterval(interval);
  }, [fetchCompetition]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCompetition();
  };

  // Handle copy link
  const handleCopyLink = async (type: 'participant' | 'arbiter') => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const link = type === 'participant'
      ? `${baseUrl}/${locale}/competencia/${competitionId}/join`
      : `${baseUrl}/${locale}/competencia/${competitionId}/arbiter`;

    await navigator.clipboard.writeText(link);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  // Handle start competition
  const handleStartCompetition = async () => {
    if (!isAuthenticated || !competition) return;

    setStarting(true);
    try {
      const response = await makeAuthenticatedRequest(`/api/competition/${competitionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'active',
          callerAddress: authAddress,
        }),
      });

      if (response.ok) {
        await fetchCompetition();
      } else {
        const data = await response.json();
        alert(data.error || 'Error al iniciar la competencia');
      }
    } catch (err) {
      console.error('Error starting competition:', err);
      alert('Error al iniciar la competencia');
    } finally {
      setStarting(false);
    }
  };

  // Computed values
  const isCreator = competition?.creator?.address?.toLowerCase() === authAddress?.toLowerCase();
  const isJudge = competition?.arbitration?.judges?.some(
    j => j.address.toLowerCase() === authAddress?.toLowerCase()
  );
  const participantCount = competition?.participants?.current || competition?.participants?.entries?.length || 0;
  const judgeCount = competition?.arbitration?.judges?.length || 0;
  const minParticipants = competition?.participants?.minParticipants || 2;
  const canStart = isCreator &&
    competition?.status === 'pending' &&
    participantCount >= minParticipants;

  const participantLink = typeof window !== 'undefined'
    ? `${window.location.origin}/${locale}/competencia/${competitionId}/join`
    : '';
  const arbiterLink = typeof window !== 'undefined'
    ? `${window.location.origin}/${locale}/competencia/${competitionId}/arbiter`
    : '';

  // Loading state
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

  // Error state
  if (error || !competition) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            {error || 'Competencia no encontrada'}
          </h1>
          <p className="text-gray-400 mb-6">
            {competitionId ? `ID: ${competitionId}` : 'No se proporcionó ID'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              Reintentar
            </button>
            <Link
              href={`/${locale}/modelos`}
              className="px-4 py-2 bg-amber-500 rounded-lg text-black font-medium hover:bg-amber-400 transition-colors"
            >
              Volver a Modelos
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: 'Borrador', color: 'text-gray-400', bg: 'bg-gray-500/20' },
    pending: { label: 'Esperando participantes', color: 'text-amber-400', bg: 'bg-amber-500/20' },
    active: { label: 'En progreso', color: 'text-green-400', bg: 'bg-green-500/20' },
    paused: { label: 'Pausada', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    resolution: { label: 'En resolución', color: 'text-blue-400', bg: 'bg-blue-500/20' },
    resolved: { label: 'Resuelta', color: 'text-purple-400', bg: 'bg-purple-500/20' },
    completed: { label: 'Finalizada', color: 'text-gray-400', bg: 'bg-gray-500/20' },
    cancelled: { label: 'Cancelada', color: 'text-red-400', bg: 'bg-red-500/20' },
  };

  const status = statusConfig[competition.status] || statusConfig.pending;

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-gray-950 to-gray-950" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        {/* Back link + Refresh */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href={`/${locale}/modelos`}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Modelos
          </Link>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

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
                <p className="text-amber-400 font-mono text-sm">{competition.id.slice(0, 20)}...</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.color}`}>
              {status.label}
            </span>
          </div>

          {competition.description && (
            <p className="text-gray-400 mb-4">{competition.description}</p>
          )}

          {/* Safe Address if deployed */}
          {competition.safeAddress && (
            <div className="mb-4 p-3 bg-green-500/10 rounded-xl border border-green-500/30">
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <Shield className="w-4 h-4" />
                <span>Safe Escrow: {abbreviateAddress(competition.safeAddress)}</span>
                {competition.custody?.deployed && (
                  <span className="text-xs bg-green-500/20 px-2 py-0.5 rounded">Desplegado</span>
                )}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-white">{participantCount}</div>
              <div className="text-xs text-gray-500">Participantes</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-white">{judgeCount}</div>
              <div className="text-xs text-gray-500">Jueces</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-amber-400">
                {competition.prizePool?.total || competition.rules?.entryFee || 0}
              </div>
              <div className="text-xs text-gray-500">
                {competition.prizePool?.currency || 'ETH'} / persona
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-white">
                {competition.category === 'adaptive' || !competition.category ? '🎲' : competition.category}
              </div>
              <div className="text-xs text-gray-500">Formato</div>
            </div>
          </div>
        </motion.div>

        {/* Actions for pending competition */}
        {(competition.status === 'pending' || competition.status === 'draft') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid md:grid-cols-2 gap-4 mb-6"
          >
            {/* Join as participant */}
            <Link
              href={`/${locale}/competencia/${competitionId}/join`}
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
              href={`/${locale}/competencia/${competitionId}/arbiter`}
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
                  onClick={() => handleCopyLink('participant')}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  {copied === 'participant' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
            </div>

            {/* Arbiter link */}
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-1">Link para Jueces</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm text-purple-400 truncate">{arbiterLink}</code>
                <button
                  onClick={() => handleCopyLink('arbiter')}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  {copied === 'arbiter' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-white" />
                  )}
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
            Participantes ({participantCount})
            {competition.participants?.minParticipants && (
              <span className="text-xs text-gray-500 font-normal">
                (mínimo {competition.participants.minParticipants})
              </span>
            )}
          </h2>

          {!competition.participants?.entries?.length ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">Aún no hay participantes</p>
              <p className="text-sm text-gray-600">Comparte el link para que se unan</p>
            </div>
          ) : (
            <div className="space-y-2">
              {competition.participants.entries.map((p, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <span className="text-green-400 text-sm font-bold">#{i + 1}</span>
                    </div>
                    <span className="text-white font-mono">{abbreviateAddress(p.address)}</span>
                    {p.address.toLowerCase() === authAddress?.toLowerCase() && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Tú</span>
                    )}
                  </div>
                  <div className="text-right">
                    {p.amount && p.amount !== '0' && (
                      <div className="text-amber-400 text-sm font-medium">
                        {(Number(p.amount) / 1e18).toFixed(4)} ETH
                      </div>
                    )}
                    <span className="text-xs text-gray-500">
                      {formatDate(p.joinedAt)}
                    </span>
                  </div>
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
            Jueces ({judgeCount})
          </h2>

          {!competition.arbitration?.judges?.length ? (
            <div className="text-center py-8">
              <Scale className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">Aún no hay jueces</p>
              <p className="text-sm text-gray-600">Comparte el link de árbitros</p>
            </div>
          ) : (
            <div className="space-y-2">
              {competition.arbitration.judges.map((a, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Scale className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-white font-mono">{abbreviateAddress(a.address)}</span>
                    {a.address.toLowerCase() === authAddress?.toLowerCase() && (
                      <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">Tú</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 capitalize">{a.role}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Start button (only for creator when enough participants) */}
        <AnimatePresence>
          {canStart && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.5 }}
              className="mt-6"
            >
              <button
                onClick={handleStartCompetition}
                disabled={starting}
                className="w-full py-4 rounded-2xl font-bold text-lg
                         bg-gradient-to-r from-amber-500 to-orange-500 text-black
                         hover:shadow-lg hover:shadow-amber-500/25 transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-3"
              >
                {starting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6" />
                    Iniciar Competencia
                  </>
                )}
              </button>
              <p className="text-center text-sm text-gray-500 mt-2">
                Al iniciar, se cierra la entrada y el sistema determina el formato
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Creator badge */}
        {isCreator && (
          <div className="mt-4 text-center">
            <span className="inline-flex items-center gap-2 text-amber-400 text-sm">
              <Sparkles className="w-4 h-4" />
              Eres el creador de esta competencia
            </span>
          </div>
        )}

        {/* Judge badge */}
        {isJudge && !isCreator && (
          <div className="mt-4 text-center">
            <span className="inline-flex items-center gap-2 text-purple-400 text-sm">
              <Scale className="w-4 h-4" />
              Eres juez de esta competencia
            </span>
          </div>
        )}
      </div>
    </main>
  );
}
