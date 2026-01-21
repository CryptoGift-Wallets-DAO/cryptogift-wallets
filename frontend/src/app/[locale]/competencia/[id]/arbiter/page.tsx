"use client";

/**
 * ARBITER PAGE - Unirse como juez/árbitro
 *
 * PRODUCCIÓN REAL:
 * - ThirdWeb ConnectButton para wallet real
 * - Autenticación SIWE completa
 * - Registro como juez vía API
 * - Sin stake requerido
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  LogIn,
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
    entries: Array<{ address: string }>;
  };
  arbitration?: {
    method: string;
    judges: Array<{ address: string; role: string }>;
    votingThreshold?: number;
  };
}

function abbreviateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ArbiterPage() {
  const params = useParams();
  const router = useRouter();
  const competitionId = params.id as string;
  const locale = params.locale as string || 'es';

  // ThirdWeb account
  const account = useActiveAccount();

  // Auth state
  const { isAuthenticated, isConnected, address: authAddress } = useAuth();

  // Component state
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyJudge, setAlreadyJudge] = useState(false);

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

        // Check if current user is already a judge
        if (authAddress && comp.arbitration?.judges) {
          const isAlreadyJudge = comp.arbitration.judges.some(
            (j: { address: string }) => j.address.toLowerCase() === authAddress.toLowerCase()
          );
          setAlreadyJudge(isAlreadyJudge);
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

  // Check if already judge when auth changes
  useEffect(() => {
    if (authAddress && competition?.arbitration?.judges) {
      const isAlreadyJudge = competition.arbitration.judges.some(
        (j: { address: string }) => j.address.toLowerCase() === authAddress.toLowerCase()
      );
      setAlreadyJudge(isAlreadyJudge);
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
      await fetchCompetition();
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(err.message || 'Error de autenticación');
    } finally {
      setAuthenticating(false);
    }
  };

  // Handle join as arbiter - uses dedicated endpoint
  const handleJoinAsArbiter = async () => {
    // If not authenticated, trigger auth first
    if (!isAuthenticated) {
      await handleAuthenticate();
      return;
    }

    // If already a judge, just go to competition
    if (alreadyJudge) {
      router.push(`/${locale}/competencia/${competitionId}`);
      return;
    }

    setJoining(true);
    setError(null);

    try {
      // Use dedicated join-arbiter endpoint (secured with JWT auth)
      const response = await makeAuthenticatedRequest(`/api/competition/${competitionId}/join-arbiter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
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
        if (data.code === 'ALREADY_JUDGE') {
          setAlreadyJudge(true);
          setError(null);
        } else if (data.code === 'INVALID_STATUS') {
          setError('Esta competencia ya no acepta nuevos jueces');
        } else {
          setError(data.error || 'Error al registrarse como juez');
        }
      }
    } catch (err: unknown) {
      console.error('Join as arbiter error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      if (errorMessage.includes('No valid authentication') || errorMessage.includes('expired')) {
        setError('Tu sesión expiró. Por favor, autentícate de nuevo.');
      } else {
        setError(errorMessage || 'Error al registrarse como juez');
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
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
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

  // Competition not accepting arbiters
  if (competition && competition.status !== 'pending' && competition.status !== 'draft') {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Registro de jueces cerrado</h1>
          <p className="text-gray-400 mb-6">Esta competencia ya no acepta nuevos jueces</p>
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
            className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-400 to-pink-500
                     flex items-center justify-center shadow-lg shadow-purple-500/30 mb-6"
          >
            <Check className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white mb-2">¡Registrado como Juez!</h1>
          <p className="text-gray-400 mb-2">Podrás votar cuando la competencia inicie</p>
          <p className="text-sm text-gray-500">Redirigiendo...</p>
        </motion.div>
      </main>
    );
  }

  const participantCount = competition?.participants?.current || competition?.participants?.entries?.length || 0;
  const judgeCount = competition?.arbitration?.judges?.length || 0;
  const prizeAmount = competition?.prizePool?.total || 0;
  const currency = competition?.prizePool?.currency || 'ETH';

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-gray-950 to-gray-950" />
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
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20
                       border border-purple-500/30 flex items-center justify-center mb-4">
            <Scale className="w-10 h-10 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Unirse como Juez</h1>
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
          <h2 className="text-sm font-medium text-gray-400 mb-3">Estado de la competencia</h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Participantes</span>
              <span className="text-white">{participantCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Jueces actuales</span>
              <span className="text-white">{judgeCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Premio por persona</span>
              <span className="text-amber-400">{prizeAmount} {currency}</span>
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

        {/* Already judge message */}
        {alreadyJudge && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6"
          >
            <div className="flex items-center gap-2 text-purple-400">
              <Check className="w-5 h-5" />
              <span>Ya eres juez de esta competencia</span>
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
                <div className="text-sm text-gray-400">Para registrarte como juez</div>
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
                  backgroundColor: 'rgba(168, 85, 247, 0.2)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
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
            className="bg-purple-500/10 rounded-2xl border border-purple-500/30 p-4 mb-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-purple-400">Wallet conectada y autenticada</div>
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
          onClick={handleJoinAsArbiter}
          disabled={joining || (!isConnected && !isAuthenticated)}
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
          ) : alreadyJudge ? (
            <>
              <Check className="w-5 h-5" />
              <span>Ver Competencia</span>
            </>
          ) : (
            <>
              <Scale className="w-5 h-5" />
              <span>Registrarse como Juez</span>
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
