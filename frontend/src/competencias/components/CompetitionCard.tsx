/**
 * COMPETITION CARD
 * Display card for competitions with status, progress, and actions
 *
 * Features:
 * - Category-specific styling
 * - Real-time status updates
 * - Prize pool display
 * - Participant count
 * - Quick actions
 */

'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Clock,
  Trophy,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Coins,
  Calendar,
  Scale,
} from 'lucide-react';
import {
  Competition,
  CompetitionCategory,
  CompetitionStatus,
  getParticipantCount,
  getMaxParticipants,
  getPrizePoolTotal,
  getPrizePoolCurrency,
  getCreatorAddress,
} from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface CompetitionCardProps {
  competition: Competition;
  onClick?: () => void;
  onJoin?: () => void;
  onViewDetails?: () => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

// =============================================================================
// CATEGORY CONFIG
// =============================================================================

const CATEGORY_CONFIG: Record<CompetitionCategory, {
  icon: string;
  gradient: string;
  bgGradient: string;
  label: string;
}> = {
  prediction: {
    icon: '🎯',
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-500/10 to-cyan-500/10',
    label: 'Predicción',
  },
  tournament: {
    icon: '🏆',
    gradient: 'from-amber-500 to-orange-500',
    bgGradient: 'from-amber-500/10 to-orange-500/10',
    label: 'Torneo',
  },
  challenge: {
    icon: '⚔️',
    gradient: 'from-red-500 to-pink-500',
    bgGradient: 'from-red-500/10 to-pink-500/10',
    label: 'Desafío',
  },
  pool: {
    icon: '💰',
    gradient: 'from-green-500 to-emerald-500',
    bgGradient: 'from-green-500/10 to-emerald-500/10',
    label: 'Pool',
  },
  milestone: {
    icon: '🎯',
    gradient: 'from-purple-500 to-violet-500',
    bgGradient: 'from-purple-500/10 to-violet-500/10',
    label: 'Hitos',
  },
  ranking: {
    icon: '📊',
    gradient: 'from-indigo-500 to-blue-500',
    bgGradient: 'from-indigo-500/10 to-blue-500/10',
    label: 'Ranking',
  },
};

// Status configuration
const STATUS_CONFIG: Record<CompetitionStatus, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}> = {
  draft: {
    label: 'Borrador',
    icon: <Clock className="w-3 h-3" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
  pending: {
    label: 'Pendiente',
    icon: <Clock className="w-3 h-3" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  active: {
    label: 'Activo',
    icon: <TrendingUp className="w-3 h-3" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  paused: {
    label: 'Pausado',
    icon: <AlertCircle className="w-3 h-3" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  resolution: {
    label: 'Resolución',
    icon: <Scale className="w-3 h-3" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  resolving: {
    label: 'En Resolución',
    icon: <Scale className="w-3 h-3" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  resolved: {
    label: 'Resuelto',
    icon: <CheckCircle className="w-3 h-3" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  disputed: {
    label: 'En Disputa',
    icon: <AlertCircle className="w-3 h-3" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  completed: {
    label: 'Completado',
    icon: <CheckCircle className="w-3 h-3" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  cancelled: {
    label: 'Cancelado',
    icon: <XCircle className="w-3 h-3" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
};

// =============================================================================
// HELPERS
// =============================================================================

function formatPrize(amount: number, currency: string = 'ETH'): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M ${currency}`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K ${currency}`;
  }
  return `${amount.toFixed(2)} ${currency}`;
}

function formatTimeRemaining(endDate: Date | string | number): string {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return 'Finalizado';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CompetitionCard: React.FC<CompetitionCardProps> = ({
  competition,
  onClick,
  onJoin,
  onViewDetails,
  showActions = true,
  compact = false,
  className = '',
}) => {
  const categoryConfig = CATEGORY_CONFIG[competition.category];
  const statusConfig = STATUS_CONFIG[competition.status];

  // Calculate progress
  const progress = useMemo(() => {
    if (!competition.timeline.endsAt) return 0;

    const start = new Date(competition.timeline.startsAt || competition.timeline.createdAt).getTime();
    const end = new Date(competition.timeline.endsAt).getTime();
    const now = Date.now();

    if (now >= end) return 100;
    if (now <= start) return 0;

    return Math.round(((now - start) / (end - start)) * 100);
  }, [competition.timeline]);

  // Check if can join
  const canJoin = useMemo(() => {
    const maxParts = getMaxParticipants(competition.participants);
    const currentParts = getParticipantCount(competition.participants);
    return (
      competition.status === 'active' &&
      (!maxParts || currentParts < maxParts)
    );
  }, [competition]);

  if (compact) {
    // Compact version for lists
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={onClick}
        className={`
          flex items-center gap-4 p-4 rounded-xl
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          hover:shadow-md transition-all cursor-pointer
          ${className}
        `}
      >
        {/* Category icon */}
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center text-2xl
          bg-gradient-to-br ${categoryConfig.bgGradient}
        `}>
          {categoryConfig.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {competition.title}
          </h3>
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {getParticipantCount(competition.participants)}
            </span>
            <span className="flex items-center gap-1">
              <Coins className="w-3 h-3" />
              {formatPrize(getPrizePoolTotal(competition.prizePool))}
            </span>
          </div>
        </div>

        {/* Status badge */}
        <div className={`
          px-2 py-1 rounded-full text-xs font-medium
          ${statusConfig.bgColor} ${statusConfig.color}
          flex items-center gap-1
        `}>
          {statusConfig.icon}
          {statusConfig.label}
        </div>
      </motion.div>
    );
  }

  // Full card version
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`
        rounded-2xl overflow-hidden
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        hover:shadow-xl transition-all
        ${className}
      `}
    >
      {/* Header gradient */}
      <div className={`
        h-2 bg-gradient-to-r ${categoryConfig.gradient}
      `} />

      {/* Content */}
      <div className="p-5">
        {/* Top row: category + status */}
        <div className="flex items-center justify-between mb-4">
          <div className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full
            bg-gradient-to-r ${categoryConfig.bgGradient}
          `}>
            <span className="text-lg">{categoryConfig.icon}</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {categoryConfig.label}
            </span>
          </div>

          <div className={`
            px-2.5 py-1 rounded-full text-xs font-medium
            ${statusConfig.bgColor} ${statusConfig.color}
            flex items-center gap-1
          `}>
            {statusConfig.icon}
            {statusConfig.label}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
          {competition.title}
        </h3>

        {/* Description */}
        {competition.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
            {competition.description}
          </p>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Prize Pool */}
          <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <Trophy className="w-4 h-4 mx-auto mb-1 text-amber-500" />
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              {formatPrize(getPrizePoolTotal(competition.prizePool))}
            </div>
            <div className="text-xs text-gray-500">Premio</div>
          </div>

          {/* Participants */}
          <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <Users className="w-4 h-4 mx-auto mb-1 text-blue-500" />
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              {getParticipantCount(competition.participants)}
              {getMaxParticipants(competition.participants) && (
                <span className="text-gray-400">/{getMaxParticipants(competition.participants)}</span>
              )}
            </div>
            <div className="text-xs text-gray-500">Participantes</div>
          </div>

          {/* Time remaining */}
          <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <Clock className="w-4 h-4 mx-auto mb-1 text-purple-500" />
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              {competition.timeline.endsAt
                ? formatTimeRemaining(competition.timeline.endsAt)
                : 'Sin límite'}
            </div>
            <div className="text-xs text-gray-500">Restante</div>
          </div>
        </div>

        {/* Progress bar (if active) */}
        {competition.status === 'active' && competition.timeline.endsAt && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progreso</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${categoryConfig.gradient}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

        {/* Prediction market preview (if applicable) */}
        {competition.category === 'prediction' && competition.market?.probability !== undefined && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 mb-4">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <div className="flex-1">
              <div className="text-xs text-gray-500 dark:text-gray-400">Probabilidad actual</div>
              <div className="font-bold text-blue-600 dark:text-blue-400">
                {Math.round(competition.market.probability * 100)}%
              </div>
            </div>
            <div className="text-sm font-medium">
              <span className="text-green-500">SÍ</span>
              <span className="text-gray-400 mx-1">/</span>
              <span className="text-red-500">NO</span>
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2">
            {canJoin && onJoin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJoin();
                }}
                className={`
                  flex-1 py-2.5 rounded-xl font-medium text-white
                  bg-gradient-to-r ${categoryConfig.gradient}
                  hover:shadow-lg transition-all
                `}
              >
                Participar
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onViewDetails) onViewDetails();
                else if (onClick) onClick();
              }}
              className="flex-1 py-2.5 rounded-xl font-medium
                border border-gray-200 dark:border-gray-700
                text-gray-700 dark:text-gray-300
                hover:bg-gray-50 dark:hover:bg-gray-700/50
                transition-colors flex items-center justify-center gap-2"
            >
              Ver Detalles
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Footer: creator + dates */}
      <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700/50
        bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              👤
            </span>
            {getCreatorAddress(competition.creator).slice(0, 6)}...{getCreatorAddress(competition.creator).slice(-4)}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(competition.timeline.createdAt).toLocaleDateString('es-ES')}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default CompetitionCard;
