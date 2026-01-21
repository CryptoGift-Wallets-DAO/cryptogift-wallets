"use client";

/**
 * JOIN COMPETITION PAGE - Unirse como participante
 *
 * PRODUCCIÓN REAL:
 * - ThirdWeb ConnectButton para wallet real
 * - Autenticación SIWE completa
 * - Llamada a API /api/competition/[id]/join
 * - Depósito de stake real (ETH/USDC)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Trophy,
  Users,
  Coins,
  Loader2,
  Check,
  ArrowLeft,
  Wallet,
  AlertCircle,
  Sparkles,
  Shield,
  LogIn,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useActiveAccount } from 'thirdweb/react';
import { ConnectButton } from 'thirdweb/react';
import { createThirdwebClient } from 'thirdweb';
import { base } from 'thirdweb/chains';
import { useAuth } from '../../../../../hooks/useAuth';
import {
  authenticateWithSiwe,
  makeAuthenticatedRequest,
  isAuthValid,
  getAuthState,
} from '../../../../../lib/siweClient';

// ThirdWeb client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID || '',
});

interface Competition {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: 'draft' | 'pending' | 'active' | 'paused' | 'resolution' | 'resolved' | 'completed' | 'cancelled';
  prizePool?: {
    total: number;
    currency: string;
  };
  participants?: {
    current: number;
    maxParticipants?: number | 'unlimited';
    minParticipants?: number;
    entries: Array<{ address: string }>;
  };
  rules?: {
    entryFee?: number;
  };
  safeAddress?: string;
}

function abbreviateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function JoinCompetitionPage() {
  const params = useParams();
  const router = useRouter();
  const competitionId = params.id as string;
  const locale = params.locale as string || 'es';

  // ThirdWeb account
  const account = useActiveAccount();

  // Auth state
  const { isAuthenticated, isConnected, address: authAddress, token } = useAuth();

  // Component state
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyJoined, setAlreadyJoined] = useState(false);

  // Fetch competition data
  const fetchCompetition = useCallback(async () => {
    if (!competitionId) return;

    try {
      const response = await fetch(`/api/competition/${competitionId}`);

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
        const comp = data.data.competition;
        setCompetition(comp);
        setError(null);

        // Check if current user already joined
        if (authAddress && comp.participants?.entries) {
          const isAlreadyParticipant = comp.participants.entries.some(
            (p: { address: string }) => p.address.toLowerCase() === authAddress.toLowerCase()
          );
          setAlreadyJoined(isAlreadyParticipant);
        }
      } else {
        setError('Formato de respuesta inválido');
      }
    } catch (err) {
      console.error('Error fetching competition:', err);
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [competitionId, authAddress]);

  // Initial fetch
  useEffect(() => {
    fetchCompetition();
  }, [fetchCompetition]);

  // Check if already joined when auth changes
  useEffect(() => {
    if (authAddress && competition?.participants?.entries) {
      const isAlreadyParticipant = competition.participants.entries.some(
        (p: { address: string }) => p.address.toLowerCase() === authAddress.toLowerCase()
      );
      setAlreadyJoined(isAlreadyParticipant);
    }
  }, [authAddress, competition]);

  // Handle SIWE authentication
  const handleAuthenticate = async () => {
    if (!account?.address) {
      setError('Conecta tu wallet primero');
      return;
    }

    setAuthenticating(true);
    setError(null);

    try {
      await authenticateWithSiwe(account.address, account);
      // Refetch to check if already joined
      await fetchCompetition();
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(err.message || 'Error de autenticación');
    } finally {
      setAuthenticating(false);
    }
  };

  // Handle join competition
  const handleJoin = async () => {
    if (!isAuthenticated) {
      await handleAuthenticate();
      return;
    }

    if (alreadyJoined) {
      router.push(`/${locale}/competencia/${competitionId}`);
      return;
    }

    setJoining(true);
    setError(null);

    try {
      // Get entry fee amount (in wei)
      const entryFee = competition?.rules?.entryFee || competition?.prizePool?.total || 0;
      const amountWei = entryFee > 0 ? (entryFee * 1e18).toString() : '0';

      // Call join API
      const response = await makeAuthenticatedRequest(`/api/competition/${competitionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position: 'participant',
          amount: amountWei,
          metadata: {
            joinedFrom: 'web',
            timestamp: Date.now(),
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setJoined(true);

        // Redirect to competition page after 2 seconds
        setTimeout(() => {
          router.push(`/${locale}/competencia/${competitionId}`);
        }, 2000);
      } else {
        // Handle specific error codes
        if (data.code === 'ALREADY_JOINED') {
          setAlreadyJoined(true);
          setError('Ya estás registrado en esta competencia');
        } else if (data.code === 'FULL') {
          setError('La competencia está llena');
        } else if (data.code === 'INVALID_STATUS') {
          setError('Las inscripciones están cerradas');
        } else {
          setError(data.error || 'Error al unirse');
        }
      }
    } catch (err: any) {
      console.error('Join error:', err);
      if (err.message?.includes('No valid authentication')) {
        setError('Tu sesión expiró. Por favor, autentícate de nuevo.');
      } else {
        setError(err.message || 'Error al unirse a la competencia');
      }
    } finally {
      setJoining(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Cargando competencia...</p>
        </div>
      </main>
    );
  }

  // Error state (competition not found)
  if (error && !competition) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">{error}</h1>
          <Link
            href={`/${locale}/modelos`}
            className="text-amber-400 hover:text-amber-300"
          >
            ← Volver a Modelos
          </Link>
        </div>
      </main>
    );
  }

  // Competition not accepting participants
  if (competition && competition.status !== 'pending' && competition.status !== 'draft') {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Inscripciones cerradas</h1>
          <p className="text-gray-400 mb-6">Esta competencia ya no acepta nuevos participantes</p>
          <Link
            href={`/${locale}/competencia/${competitionId}`}
            className="text-amber-400 hover:text-amber-300"
          >
            Ver competencia →
          </Link>
        </div>
      </main>
    );
  }

  // Success state
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
            className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-500
                     flex items-center justify-center shadow-lg shadow-green-500/30 mb-6"
          >
            <Check className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white mb-2">¡Te has unido!</h1>
          <p className="text-gray-400 mb-2">Ya eres participante de esta competencia</p>
          <p className="text-sm text-gray-500">Redirigiendo...</p>
        </motion.div>
      </main>
    );
  }

  const entryFee = competition?.rules?.entryFee || competition?.prizePool?.total || 0;
  const currency = competition?.prizePool?.currency || 'ETH';
  const participantCount = competition?.participants?.current || competition?.participants?.entries?.length || 0;
  const maxParticipants = competition?.participants?.maxParticipants;

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/20 via-gray-950 to-gray-950" />
      </div>

      <div className="relative max-w-lg mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href={`/${locale}/competencia/${competitionId}`}
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
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20
                       border border-green-500/30 flex items-center justify-center mb-4">
            <Users className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Unirse como Participante</h1>
          <p className="text-gray-400">{competition?.title}</p>
          <p className="text-amber-400 font-mono text-sm mt-1">{competition?.id?.slice(0, 20)}...</p>
        </motion.div>

        {/* Competition info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 p-5 mb-6"
        >
          <h2 className="text-sm font-medium text-gray-400 mb-3">Detalles de la competencia</h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Formato</span>
              <span className="text-white">
                {competition?.category === 'adaptive' || !competition?.category ? '🎲 Adaptativo' : competition?.category}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Participantes actuales</span>
              <span className="text-white">{participantCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Máximo</span>
              <span className="text-white">
                {maxParticipants === 'unlimited' || !maxParticipants ? '∞ Ilimitado' : maxParticipants}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stake info */}
        {entryFee > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-green-600/20 to-emerald-600/20
                     border border-green-500/30 rounded-2xl p-5 mb-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Coins className="w-6 h-6 text-green-400" />
              <div>
                <div className="text-sm text-gray-400">Stake requerido</div>
                <div className="text-2xl font-bold text-white">
                  {entryFee} {currency}
                </div>
              </div>
            </div>

            <div className="text-sm text-green-200/70 flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                Tu stake se deposita en un contrato seguro.
                Si ganas, recibes el premio. Si pierdes, va al ganador.
              </span>
            </div>
          </motion.div>
        )}

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6"
          >
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </motion.div>
        )}

        {/* Already joined message */}
        {alreadyJoined && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6"
          >
            <div className="flex items-center gap-2 text-green-400">
              <Check className="w-5 h-5" />
              <span>Ya estás registrado en esta competencia</span>
            </div>
          </motion.div>
        )}

        {/* Wallet connection section */}
        {!isConnected ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 rounded-2xl border border-white/10 p-5 mb-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="w-6 h-6 text-amber-400" />
              <div>
                <div className="font-medium text-white">Conecta tu wallet</div>
                <div className="text-sm text-gray-400">Necesitas conectar para participar</div>
              </div>
            </div>

            <ConnectButton
              client={client}
              chains={[base]}
              connectButton={{
                label: "Conectar Wallet",
                style: {
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: 'white',
                  fontWeight: 600,
                },
              }}
            />
          </motion.div>
        ) : !isAuthenticated ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-amber-500/10 rounded-2xl border border-amber-500/30 p-5 mb-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <LogIn className="w-6 h-6 text-amber-400" />
              <div>
                <div className="font-medium text-white">Autenticación requerida</div>
                <div className="text-sm text-gray-400">
                  Wallet conectada: {abbreviateAddress(account?.address || '')}
                </div>
              </div>
            </div>

            <button
              onClick={handleAuthenticate}
              disabled={authenticating}
              className="w-full py-3 rounded-xl font-semibold
                       bg-gradient-to-r from-amber-500/20 to-orange-500/20
                       border border-amber-500/30 text-amber-400
                       hover:border-amber-500/50 transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
            >
              {authenticating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Firmando...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Firmar con Wallet (SIWE)
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Firma un mensaje para verificar que eres el dueño de esta wallet
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-green-500/10 rounded-2xl border border-green-500/30 p-4 mb-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <div className="text-sm text-green-400">Wallet conectada y autenticada</div>
                <div className="text-white font-mono">{abbreviateAddress(authAddress || '')}</div>
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
          onClick={handleJoin}
          disabled={joining || (!isConnected && !isAuthenticated)}
          className="w-full py-4 rounded-2xl font-bold text-lg
                   bg-gradient-to-r from-green-500 to-emerald-500 text-white
                   hover:shadow-lg hover:shadow-green-500/25 transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center gap-3"
        >
          {joining ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Procesando...</span>
            </>
          ) : !isConnected ? (
            <>
              <Wallet className="w-5 h-5" />
              <span>Conectar Wallet</span>
            </>
          ) : !isAuthenticated ? (
            <>
              <LogIn className="w-5 h-5" />
              <span>Autenticar Wallet</span>
            </>
          ) : alreadyJoined ? (
            <>
              <Check className="w-5 h-5" />
              <span>Ver Competencia</span>
            </>
          ) : entryFee > 0 ? (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Depositar {entryFee} {currency} y Unirse</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Unirse a la Competencia</span>
            </>
          )}
        </motion.button>

        <p className="text-center text-sm text-gray-500 mt-4">
          Al unirte, aceptas las reglas de la competencia
        </p>
      </div>
    </main>
  );
}
