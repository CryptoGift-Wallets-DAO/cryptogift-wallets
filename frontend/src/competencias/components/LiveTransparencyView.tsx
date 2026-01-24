/**
 * LIVE TRANSPARENCY VIEW
 * Real-time Event Log for Competition Transparency
 *
 * Features:
 * - Real-time event streaming
 * - Event filtering by type
 * - Transaction verification links
 * - Timeline visualization
 * - Export functionality
 */

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  ExternalLink,
  Filter,
  Download,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  User,
  Coins,
  Scale,
  Shield,
  Eye,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';
import { TransparencyEvent, Competition } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface LiveTransparencyViewProps {
  competition: Competition;
  events: TransparencyEvent[];
  onRefresh?: () => void;
  onExport?: () => void;
  maxHeight?: string;
  autoScroll?: boolean;
  showFilters?: boolean;
  className?: string;
}

type EventFilter = 'all' | 'bets' | 'judges' | 'transactions' | 'disputes' | 'system';

// =============================================================================
// EVENT TYPE CONFIG
// =============================================================================

const EVENT_TYPE_CONFIG: Record<string, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
  category: EventFilter;
}> = {
  // Bet events
  bet_placed: {
    icon: <Coins className="w-4 h-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    label: 'Apuesta',
    category: 'bets',
  },
  bet_cancelled: {
    icon: <Coins className="w-4 h-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    label: 'Apuesta Cancelada',
    category: 'bets',
  },
  shares_sold: {
    icon: <Coins className="w-4 h-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    label: 'Venta de Shares',
    category: 'bets',
  },

  // Judge events
  judge_added: {
    icon: <Scale className="w-4 h-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    label: 'Juez Añadido',
    category: 'judges',
  },
  vote_submitted: {
    icon: <Scale className="w-4 h-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Voto Emitido',
    category: 'judges',
  },
  resolution_proposed: {
    icon: <Scale className="w-4 h-4" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    label: 'Resolución Propuesta',
    category: 'judges',
  },

  // Transaction events
  safe_created: {
    icon: <Shield className="w-4 h-4" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    label: 'Safe Creado',
    category: 'transactions',
  },
  safe_transaction: {
    icon: <Shield className="w-4 h-4" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    label: 'Transacción Safe',
    category: 'transactions',
  },
  prize_distributed: {
    icon: <Coins className="w-4 h-4" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    label: 'Premio Distribuido',
    category: 'transactions',
  },

  // Dispute events
  dispute_created: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    label: 'Disputa Creada',
    category: 'disputes',
  },
  dispute_evidence: {
    icon: <Eye className="w-4 h-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    label: 'Evidencia Añadida',
    category: 'disputes',
  },
  dispute_resolved: {
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    label: 'Disputa Resuelta',
    category: 'disputes',
  },

  // VRF events
  vrf_request: {
    icon: <RefreshCw className="w-4 h-4" />,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    label: 'VRF Solicitado',
    category: 'system',
  },
  vrf_fulfilled: {
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    label: 'VRF Completado',
    category: 'system',
  },

  // System events
  competition_created: {
    icon: <Activity className="w-4 h-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Competencia Creada',
    category: 'system',
  },
  status_changed: {
    icon: <Activity className="w-4 h-4" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    label: 'Estado Cambiado',
    category: 'system',
  },
  participant_joined: {
    icon: <User className="w-4 h-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Participante',
    category: 'system',
  },
};

const FILTER_OPTIONS: { value: EventFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Todos', icon: <Activity className="w-4 h-4" /> },
  { value: 'bets', label: 'Apuestas', icon: <Coins className="w-4 h-4" /> },
  { value: 'judges', label: 'Jueces', icon: <Scale className="w-4 h-4" /> },
  { value: 'transactions', label: 'Transacciones', icon: <Shield className="w-4 h-4" /> },
  { value: 'disputes', label: 'Disputas', icon: <AlertTriangle className="w-4 h-4" /> },
  { value: 'system', label: 'Sistema', icon: <Activity className="w-4 h-4" /> },
];

// =============================================================================
// HELPERS
// =============================================================================

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return 'Ahora';
  if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;

  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// =============================================================================
// EVENT ITEM COMPONENT
// =============================================================================

const EventItem: React.FC<{
  event: TransparencyEvent;
  isLast: boolean;
}> = ({ event, isLast }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const config = EVENT_TYPE_CONFIG[event.type] || {
    icon: <Activity className="w-4 h-4" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    label: event.type,
    category: 'system',
  };

  const handleCopyTxHash = async () => {
    if (event.txHash) {
      await navigator.clipboard.writeText(event.txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
      )}

      <div className="flex gap-3">
        {/* Icon */}
        <div className={`
          relative z-10 w-10 h-10 rounded-full flex items-center justify-center
          ${config.bgColor} ${config.color}
        `}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 pb-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-white">
                  {config.label}
                </span>
                {event.verified && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {event.action}
              </p>
            </div>

            <span className="text-xs text-gray-400 whitespace-nowrap">
              {formatTimestamp(event.timestamp)}
            </span>
          </div>

          {/* Actor */}
          {event.actor && event.actor !== 'system' && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
              <User className="w-3 h-3" />
              {truncateAddress(event.actor)}
            </div>
          )}

          {/* Transaction hash */}
          {event.txHash && (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleCopyTxHash}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700
                  transition-colors"
              >
                {copied ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {truncateAddress(event.txHash)}
              </button>
              <a
                href={`https://basescan.org/tx/${event.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Expandable details */}
          {event.details && Object.keys(event.details).length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700
                  dark:hover:text-gray-300 transition-colors"
              >
                {expanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                {expanded ? 'Ocultar' : 'Ver'} detalles
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50
                      text-xs font-mono">
                      <pre className="whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                        {JSON.stringify(event.details, null, 2)}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const LiveTransparencyView: React.FC<LiveTransparencyViewProps> = ({
  competition,
  events,
  onRefresh,
  onExport,
  maxHeight = '600px',
  autoScroll = true,
  showFilters = true,
  className = '',
}) => {
  const [filter, setFilter] = useState<EventFilter>('all');
  const [isLive, setIsLive] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;

    return events.filter(event => {
      const config = EVENT_TYPE_CONFIG[event.type];
      return config?.category === filter;
    });
  }, [events, filter]);

  // Auto-scroll to new events
  useEffect(() => {
    if (autoScroll && isLive && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length, autoScroll, isLive]);

  // Stats
  const stats = useMemo(() => ({
    total: events.length,
    verified: events.filter(e => e.verified).length,
    lastUpdate: events[0]?.timestamp || null,
  }), [events]);

  return (
    <div className={`
      bg-white dark:bg-gray-800 rounded-2xl
      border border-gray-200 dark:border-gray-700
      overflow-hidden
      ${className}
    `}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Transparencia en Vivo
            </h3>
            {isLive && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full
                bg-green-100 dark:bg-green-900/30 text-green-600 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                EN VIVO
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLive(!isLive)}
              className={`p-2 rounded-lg transition-colors ${
                isLive
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}
            >
              {isLive ? <Activity className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            </button>

            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800
                  text-gray-600 dark:text-gray-400 hover:bg-gray-200
                  dark:hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {onExport && (
              <button
                onClick={onExport}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800
                  text-gray-600 dark:text-gray-400 hover:bg-gray-200
                  dark:hover:bg-gray-700 transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>{stats.total} eventos</span>
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            {stats.verified} verificados
          </span>
          {stats.lastUpdate && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Última: {formatTimestamp(stats.lastUpdate)}
            </span>
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {FILTER_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                  whitespace-nowrap transition-colors
                  ${filter === option.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }
                `}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Events list */}
      <div
        ref={scrollRef}
        className="overflow-y-auto p-5"
        style={{ maxHeight }}
      >
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No hay eventos para mostrar</p>
            <p className="text-sm mt-1">
              Los eventos aparecerán aquí en tiempo real
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredEvents.map((event, index) => (
              <EventItem
                key={`${event.timestamp}-${event.type}-${index}`}
                event={event}
                isLast={index === filteredEvents.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700
        bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Competencia: {competition.id}</span>
          <a
            href={`https://basescan.org/address/${competition.safeAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
          >
            Ver en BaseScan
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default LiveTransparencyView;
