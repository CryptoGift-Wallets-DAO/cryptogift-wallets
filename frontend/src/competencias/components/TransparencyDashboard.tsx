/**
 * TRANSPARENCY DASHBOARD
 * ======================
 *
 * Comprehensive dashboard for competition transparency showing:
 * - Real-time event feed
 * - Live statistics
 * - Market probability chart
 * - Safe transaction status
 * - Participant leaderboard
 * - Dispute status
 */

'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  Coins,
  Shield,
  AlertTriangle,
  BarChart3,
  PieChart,
  Eye,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  Clock,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import type { Competition, TransparencyEvent } from '../types';
import { getParticipantCount, getPrizePoolTotal, getPrizePoolCurrency } from '../types';
import { LiveTransparencyView } from './LiveTransparencyView';
import { useRealtimeEvents } from '../hooks/useRealtimeEvents';

// =============================================================================
// TYPES
// =============================================================================

export interface TransparencyDashboardProps {
  competition: Competition;
  className?: string;
}

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  changeLabel,
  icon,
  color,
  bgColor,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-gray-800 rounded-2xl p-5
      border border-gray-200 dark:border-gray-700"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
          {value}
        </p>
        {change !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${
            change >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {change >= 0 ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            <span>{Math.abs(change)}%</span>
            {changeLabel && (
              <span className="text-gray-400 ml-1">{changeLabel}</span>
            )}
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl ${bgColor}`}>
        <div className={color}>{icon}</div>
      </div>
    </div>
  </motion.div>
);

// =============================================================================
// PROBABILITY CHART COMPONENT
// =============================================================================

interface ProbabilityChartProps {
  probability: number;
  yesPool: number;
  noPool: number;
  totalVolume: number;
}

const ProbabilityChart: React.FC<ProbabilityChartProps> = ({
  probability,
  yesPool,
  noPool,
  totalVolume,
}) => {
  const yesWidth = Math.round(probability * 100);
  const noWidth = 100 - yesWidth;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-5
        border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          Probabilidad del Mercado
        </h3>
        <span className="text-sm text-gray-500">
          Volumen: {totalVolume.toLocaleString()} M$
        </span>
      </div>

      {/* Probability bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-green-600 font-medium">SI: {yesWidth}%</span>
          <span className="text-red-600 font-medium">NO: {noWidth}%</span>
        </div>
        <div className="h-4 rounded-full overflow-hidden flex bg-gray-200 dark:bg-gray-700">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${yesWidth}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="bg-gradient-to-r from-green-500 to-emerald-500"
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${noWidth}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="bg-gradient-to-r from-red-500 to-rose-500"
          />
        </div>
      </div>

      {/* Pool info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
          <p className="text-xs text-green-600 mb-1">Pool SI</p>
          <p className="text-lg font-semibold text-green-700 dark:text-green-400">
            {yesPool.toLocaleString()} M$
          </p>
        </div>
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
          <p className="text-xs text-red-600 mb-1">Pool NO</p>
          <p className="text-lg font-semibold text-red-700 dark:text-red-400">
            {noPool.toLocaleString()} M$
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// =============================================================================
// SAFE STATUS COMPONENT
// =============================================================================

interface SafeStatusProps {
  safeAddress?: string;
  threshold?: number;
  owners?: string[];
  pendingTxCount?: number;
  balance?: number;
  currency?: string;
}

const SafeStatus: React.FC<SafeStatusProps> = ({
  safeAddress,
  threshold = 2,
  owners = [],
  pendingTxCount = 0,
  balance = 0,
  currency = 'ETH',
}) => {
  if (!safeAddress) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-5
          border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Gnosis Safe
          </h3>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-center py-4">
          No hay Safe configurado
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-5
        border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-500" />
          Gnosis Safe
        </h3>
        <a
          href={`https://app.safe.global/basesep:${safeAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
        >
          Ver Safe
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Balance */}
      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 mb-4">
        <p className="text-xs text-emerald-600 mb-1">Balance Custodiado</p>
        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
          {balance.toLocaleString()} {currency}
        </p>
      </div>

      {/* Info */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Threshold</span>
          <span className="text-gray-900 dark:text-white font-medium">
            {threshold} de {owners.length}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Propietarios</span>
          <span className="text-gray-900 dark:text-white font-medium">
            {owners.length}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">TX Pendientes</span>
          <span className={`font-medium ${
            pendingTxCount > 0 ? 'text-amber-600' : 'text-gray-900 dark:text-white'
          }`}>
            {pendingTxCount}
          </span>
        </div>
      </div>

      {/* Safe Address */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 truncate">
          {safeAddress}
        </p>
      </div>
    </motion.div>
  );
};

// =============================================================================
// LEADERBOARD COMPONENT
// =============================================================================

interface LeaderboardEntry {
  rank: number;
  address: string;
  profit: number;
  bets: number;
  winRate: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

const Leaderboard: React.FC<LeaderboardProps> = ({ entries }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-gray-800 rounded-2xl p-5
      border border-gray-200 dark:border-gray-700"
  >
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-amber-500" />
        Clasificacion
      </h3>
      <span className="text-sm text-gray-500">Top {entries.length}</span>
    </div>

    {entries.length === 0 ? (
      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
        Sin datos aun
      </p>
    ) : (
      <div className="space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.address}
            className="flex items-center gap-3 p-3 rounded-xl
              bg-gray-50 dark:bg-gray-800/50"
          >
            {/* Rank */}
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center
              text-sm font-bold
              ${entry.rank === 1 ? 'bg-amber-100 text-amber-700' :
                entry.rank === 2 ? 'bg-gray-200 text-gray-700' :
                entry.rank === 3 ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-600'}
            `}>
              {entry.rank}
            </div>

            {/* Address */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
              </p>
              <p className="text-xs text-gray-500">
                {entry.bets} apuestas · {entry.winRate}% win rate
              </p>
            </div>

            {/* Profit */}
            <div className={`text-right ${
              entry.profit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              <p className="font-semibold">
                {entry.profit >= 0 ? '+' : ''}{entry.profit.toFixed(2)}
              </p>
              <p className="text-xs">M$</p>
            </div>
          </div>
        ))}
      </div>
    )}
  </motion.div>
);

// =============================================================================
// DISPUTE STATUS COMPONENT
// =============================================================================

interface DisputeStatusProps {
  hasDispute: boolean;
  disputeId?: string;
  status?: 'pending' | 'evidence' | 'voting' | 'resolved';
  deadline?: number;
}

const DisputeStatus: React.FC<DisputeStatusProps> = ({
  hasDispute,
  disputeId,
  status,
  deadline,
}) => {
  if (!hasDispute) return null;

  const statusConfig = {
    pending: { label: 'Pendiente', color: 'text-amber-600', bg: 'bg-amber-100' },
    evidence: { label: 'Evidencia', color: 'text-blue-600', bg: 'bg-blue-100' },
    voting: { label: 'Votacion', color: 'text-purple-600', bg: 'bg-purple-100' },
    resolved: { label: 'Resuelto', color: 'text-green-600', bg: 'bg-green-100' },
  };

  const config = status ? statusConfig[status] : statusConfig.pending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-5
        border border-red-200 dark:border-red-800"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-red-800 dark:text-red-200 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Disputa Activa
        </h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
          {config.label}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        {disputeId && (
          <div className="flex justify-between">
            <span className="text-red-600">ID Disputa</span>
            <span className="text-red-800 dark:text-red-200 font-mono">
              {disputeId}
            </span>
          </div>
        )}
        {deadline && (
          <div className="flex justify-between">
            <span className="text-red-600">Plazo</span>
            <span className="text-red-800 dark:text-red-200">
              {new Date(deadline).toLocaleDateString('es-ES')}
            </span>
          </div>
        )}
      </div>

      <a
        href={`https://court.kleros.io/cases/${disputeId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-center justify-center gap-2 w-full
          py-2 rounded-xl bg-red-100 dark:bg-red-900/40
          text-red-700 dark:text-red-300 text-sm font-medium
          hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
      >
        Ver en Kleros Court
        <ExternalLink className="w-4 h-4" />
      </a>
    </motion.div>
  );
};

// =============================================================================
// MAIN DASHBOARD COMPONENT
// =============================================================================

export const TransparencyDashboard: React.FC<TransparencyDashboardProps> = ({
  competition,
  className = '',
}) => {
  // Real-time events
  const { events, isConnected, reconnect } = useRealtimeEvents({
    competitionId: competition.id,
  });

  // Convert real-time events to TransparencyEvent format
  const transparencyEvents: TransparencyEvent[] = useMemo(() => {
    return events.map((e) => ({
      type: e.type.replace('.', '_'),
      timestamp: e.timestamp,
      actor: e.actor || 'system',
      action: e.data?.action as string || e.type,
      details: e.data,
      verified: e.verified,
    }));
  }, [events]);

  // Merge with existing transparency events
  const allEvents = useMemo(() => {
    const existingEvents = competition.transparency?.events || [];
    return [...transparencyEvents, ...existingEvents].sort(
      (a, b) => b.timestamp - a.timestamp
    );
  }, [transparencyEvents, competition.transparency?.events]);

  // Calculate stats
  const stats = useMemo(() => {
    const participants = getParticipantCount(competition.participants);
    const prizePool = getPrizePoolTotal(competition.prizePool);
    const betsCount = competition.market?.bets?.length || 0;
    const volume = competition.market?.totalVolume || 0;

    return { participants, prizePool, betsCount, volume };
  }, [competition]);

  // Mock leaderboard data (would come from API in production)
  const leaderboardEntries: LeaderboardEntry[] = useMemo(() => {
    if (!competition.market?.bets) return [];

    const betsByUser = new Map<string, { total: number; count: number }>();
    competition.market.bets.forEach((bet) => {
      const existing = betsByUser.get(bet.userId) || { total: 0, count: 0 };
      betsByUser.set(bet.userId, {
        total: existing.total + (bet.payout || 0) - bet.amount,
        count: existing.count + 1,
      });
    });

    return Array.from(betsByUser.entries())
      .map(([address, data], index) => ({
        rank: index + 1,
        address,
        profit: data.total,
        bets: data.count,
        winRate: Math.round(Math.random() * 100),
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [competition.market?.bets]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Connection status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Eye className="w-7 h-7 text-blue-500" />
          Dashboard de Transparencia
        </h2>
        <div className="flex items-center gap-3">
          {isConnected ? (
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full
              bg-green-100 dark:bg-green-900/30 text-green-600 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Conectado
            </span>
          ) : (
            <button
              onClick={reconnect}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full
                bg-amber-100 dark:bg-amber-900/30 text-amber-600 text-sm
                hover:bg-amber-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reconectar
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Participantes"
          value={stats.participants}
          icon={<Users className="w-5 h-5" />}
          color="text-blue-600"
          bgColor="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatCard
          label="Premio Total"
          value={`${stats.prizePool} ${getPrizePoolCurrency(competition.prizePool)}`}
          icon={<Coins className="w-5 h-5" />}
          color="text-amber-600"
          bgColor="bg-amber-100 dark:bg-amber-900/30"
        />
        <StatCard
          label="Apuestas"
          value={stats.betsCount}
          icon={<TrendingUp className="w-5 h-5" />}
          color="text-green-600"
          bgColor="bg-green-100 dark:bg-green-900/30"
        />
        <StatCard
          label="Volumen"
          value={`${stats.volume.toLocaleString()} M$`}
          icon={<BarChart3 className="w-5 h-5" />}
          color="text-purple-600"
          bgColor="bg-purple-100 dark:bg-purple-900/30"
        />
      </div>

      {/* Dispute alert */}
      <DisputeStatus
        hasDispute={!!competition.arbitration?.dispute}
        disputeId={competition.arbitration?.dispute?.klerosDisputeId}
        status={competition.arbitration?.dispute?.status}
        deadline={competition.arbitration?.dispute?.deadline}
      />

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Event feed */}
        <div className="lg:col-span-2">
          <LiveTransparencyView
            competition={competition}
            events={allEvents}
            maxHeight="500px"
            onRefresh={reconnect}
            onExport={() => {
              const data = JSON.stringify(allEvents, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `events-${competition.id}.json`;
              a.click();
            }}
          />
        </div>

        {/* Right column - Widgets */}
        <div className="space-y-6">
          {/* Market probability */}
          {competition.market && (
            <ProbabilityChart
              probability={competition.market.probability || 0.5}
              yesPool={competition.market.pool?.yesPool || 0}
              noPool={competition.market.pool?.noPool || 0}
              totalVolume={competition.market.totalVolume || 0}
            />
          )}

          {/* Safe status */}
          <SafeStatus
            safeAddress={competition.safeAddress}
            threshold={2}
            owners={competition.arbitration?.judges?.map(j => j.address) || []}
            pendingTxCount={0}
            balance={getPrizePoolTotal(competition.prizePool)}
            currency={getPrizePoolCurrency(competition.prizePool)}
          />

          {/* Leaderboard */}
          <Leaderboard entries={leaderboardEntries} />
        </div>
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between py-4 px-6
        bg-gray-50 dark:bg-gray-800/50 rounded-2xl
        border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            {allEvents.filter(e => e.verified).length} eventos verificados
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Ultima actualizacion: {allEvents[0]
              ? new Date(allEvents[0].timestamp).toLocaleTimeString('es-ES')
              : 'N/A'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`https://sepolia.basescan.org/address/${competition.safeAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
          >
            BaseScan
            <ExternalLink className="w-3 h-3" />
          </a>
          {competition.market?.manifoldId && (
            <a
              href={`https://manifold.markets/${competition.market.manifoldId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
            >
              Manifold
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransparencyDashboard;
