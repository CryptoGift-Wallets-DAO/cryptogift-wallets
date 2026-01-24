/**
 * JUDGE PANEL
 * Interface for Judges to Manage Competition Resolution
 *
 * Features:
 * - Vote submission
 * - Evidence review
 * - Multi-signature coordination
 * - Dispute management
 * - Resolution timeline
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  Send,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Shield,
  MessageSquare,
  Lock,
  Unlock,
  Loader2,
} from 'lucide-react';
import {
  Competition,
  Judge,
  JudgeRole,
  Vote,
  Dispute,
} from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface JudgePanelProps {
  competition: Competition;
  currentJudge: Judge;
  allJudges: Judge[];
  votes: Vote[];
  disputes: Dispute[];
  onSubmitVote: (vote: Omit<Vote, 'id' | 'timestamp'>) => Promise<void>;
  onProposeResolution?: (resolution: string, winners: string[]) => Promise<void>;
  onSignResolution?: (resolutionId: string) => Promise<void>;
  onCreateDispute?: (reason: string) => Promise<void>;
  onSubmitEvidence?: (disputeId: string, evidence: string) => Promise<void>;
  className?: string;
}

interface VoteOption {
  id: string;
  label: string;
  description?: string;
  winner?: string;
}

// =============================================================================
// ROLE CONFIG
// =============================================================================

const ROLE_CONFIG: Record<JudgeRole, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  permissions: string[];
}> = {
  primary: {
    label: 'Principal',
    icon: <Scale className="w-4 h-4" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    permissions: ['vote', 'propose', 'sign', 'dispute', 'resolve'],
  },
  backup: {
    label: 'Respaldo',
    icon: <Shield className="w-4 h-4" />,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 dark:bg-slate-900/30',
    permissions: ['vote', 'propose', 'sign'],
  },
  appeal: {
    label: 'Apelación',
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    permissions: ['vote', 'dispute', 'appeal'],
  },
  arbiter: {
    label: 'Árbitro',
    icon: <Scale className="w-4 h-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    permissions: ['vote', 'propose', 'sign', 'dispute'],
  },
  reviewer: {
    label: 'Revisor',
    icon: <Eye className="w-4 h-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    permissions: ['vote', 'dispute'],
  },
  verifier: {
    label: 'Verificador',
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    permissions: ['vote'],
  },
  observer: {
    label: 'Observador',
    icon: <Eye className="w-4 h-4" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    permissions: [],
  },
  participant_judge: {
    label: 'Participante-Juez',
    icon: <Users className="w-4 h-4" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    permissions: ['vote'], // Participants can vote on winners
  },
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Judge List Card
 */
const JudgeListCard: React.FC<{
  judges: Judge[];
  votes: Vote[];
  currentJudgeAddress: string;
}> = ({ judges, votes, currentJudgeAddress }) => {
  const getJudgeVote = (judgeAddress: string) =>
    votes.find(v => v.judge === judgeAddress);

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <Users className="w-4 h-4" />
        Panel de Jueces ({judges.length})
      </h4>

      <div className="space-y-2">
        {judges.map(judge => {
          const roleConfig = ROLE_CONFIG[judge.role];
          const vote = getJudgeVote(judge.address);
          const isCurrentUser = judge.address === currentJudgeAddress;

          return (
            <div
              key={judge.address}
              className={`
                flex items-center justify-between p-3 rounded-lg
                ${isCurrentUser
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                  : 'bg-white dark:bg-gray-800'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${roleConfig.bgColor} ${roleConfig.color}`}>
                  {roleConfig.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white text-sm">
                      {judge.address.slice(0, 6)}...{judge.address.slice(-4)}
                    </span>
                    {isCurrentUser && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-600">
                        Tú
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{roleConfig.label}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {vote ? (
                  <span className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${vote.vote === 'approve'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-600'
                    }
                  `}>
                    {vote.vote === 'approve' ? '✓ Aprobó' : '✗ Rechazó'}
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-500">
                    Pendiente
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Vote Submission Form
 */
const VoteForm: React.FC<{
  options: VoteOption[];
  onSubmit: (optionId: string, comment?: string) => Promise<void>;
  hasVoted: boolean;
  currentVote?: Vote;
  loading: boolean;
}> = ({ options, onSubmit, hasVoted, currentVote, loading }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const handleSubmit = async () => {
    if (selectedOption) {
      await onSubmit(selectedOption, comment || undefined);
    }
  };

  if (hasVoted && currentVote) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="font-medium text-green-700 dark:text-green-400">
            Voto Registrado
          </span>
        </div>
        <p className="text-sm text-green-600 dark:text-green-400">
          Tu voto: <strong>{currentVote.vote}</strong>
        </p>
        {currentVote.comment && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            "{currentVote.comment}"
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <Scale className="w-4 h-4" />
        Emitir Voto
      </h4>

      <div className="grid grid-cols-2 gap-3">
        {options.map(option => (
          <button
            key={option.id}
            type="button"
            onClick={() => setSelectedOption(option.id)}
            disabled={loading}
            className={`
              p-4 rounded-xl border-2 text-left transition-all
              ${selectedOption === option.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <div className="font-medium text-gray-900 dark:text-white">
              {option.label}
            </div>
            {option.description && (
              <div className="text-xs text-gray-500 mt-1">
                {option.description}
              </div>
            )}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Comentario (opcional)
        </label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Explica tu decisión..."
          rows={3}
          disabled={loading}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-800 text-gray-900 dark:text-white
            placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed resize-none"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!selectedOption || loading}
        className="w-full py-3 rounded-xl font-medium text-white
          bg-gradient-to-r from-purple-500 to-blue-500
          hover:shadow-lg transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Enviar Voto
          </>
        )}
      </button>
    </div>
  );
};

/**
 * Resolution Proposal Form
 */
const ResolutionForm: React.FC<{
  competition: Competition;
  onPropose: (resolution: string, winners: string[]) => Promise<void>;
  loading: boolean;
}> = ({ competition, onPropose, loading }) => {
  const [resolution, setResolution] = useState('');
  const [winners, setWinners] = useState<string[]>([]);
  const [winnerInput, setWinnerInput] = useState('');

  const addWinner = () => {
    if (winnerInput && !winners.includes(winnerInput)) {
      setWinners([...winners, winnerInput]);
      setWinnerInput('');
    }
  };

  const removeWinner = (address: string) => {
    setWinners(winners.filter(w => w !== address));
  };

  const handleSubmit = async () => {
    if (resolution && winners.length > 0) {
      await onPropose(resolution, winners);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Proponer Resolución
      </h4>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Descripción de la Resolución
        </label>
        <textarea
          value={resolution}
          onChange={e => setResolution(e.target.value)}
          placeholder="Describe el resultado de la competencia..."
          rows={4}
          disabled={loading}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-800 text-gray-900 dark:text-white
            placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Ganadores
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={winnerInput}
            onChange={e => setWinnerInput(e.target.value)}
            placeholder="0x..."
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700
              bg-white dark:bg-gray-800 text-gray-900 dark:text-white
              placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500
              disabled:opacity-50"
          />
          <button
            type="button"
            onClick={addWinner}
            disabled={loading || !winnerInput}
            className="px-4 py-2 rounded-xl bg-blue-500 text-white
              hover:bg-blue-600 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Añadir
          </button>
        </div>

        {winners.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {winners.map((winner, index) => (
              <div
                key={winner}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full
                  bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm"
              >
                <span>#{index + 1}</span>
                <span>{winner.slice(0, 6)}...{winner.slice(-4)}</span>
                <button
                  type="button"
                  onClick={() => removeWinner(winner)}
                  className="text-red-500 hover:text-red-700"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!resolution || winners.length === 0 || loading}
        className="w-full py-3 rounded-xl font-medium text-white
          bg-gradient-to-r from-green-500 to-emerald-500
          hover:shadow-lg transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Proponiendo...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Proponer Resolución
          </>
        )}
      </button>
    </div>
  );
};

/**
 * Dispute Section
 */
const DisputeSection: React.FC<{
  disputes: Dispute[];
  onCreateDispute?: (reason: string) => Promise<void>;
  onSubmitEvidence?: (disputeId: string, evidence: string) => Promise<void>;
  canDispute: boolean;
  loading: boolean;
}> = ({ disputes, onCreateDispute, onSubmitEvidence, canDispute, loading }) => {
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');

  const handleCreate = async () => {
    if (onCreateDispute && reason) {
      await onCreateDispute(reason);
      setReason('');
      setShowForm(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Disputas ({disputes.length})
        </h4>

        {canDispute && onCreateDispute && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            {showForm ? 'Cancelar' : '+ Nueva Disputa'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 space-y-3">
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Razón de la disputa..."
                rows={3}
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl border border-red-200 dark:border-red-700
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                  placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500
                  disabled:opacity-50 resize-none"
              />
              <button
                onClick={handleCreate}
                disabled={!reason || loading}
                className="w-full py-2 rounded-xl font-medium text-white
                  bg-red-500 hover:bg-red-600 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creando...' : 'Crear Disputa'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {disputes.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          No hay disputas activas
        </p>
      ) : (
        <div className="space-y-3">
          {disputes.map(dispute => (
            <div
              key={dispute.id}
              className="p-4 rounded-xl bg-white dark:bg-gray-800
                border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`
                    px-2 py-0.5 rounded-full text-xs font-medium
                    ${dispute.status === 'open'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600'
                      : dispute.status === 'resolved'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600'
                    }
                  `}>
                    {dispute.status === 'open' ? 'Abierta' :
                      dispute.status === 'resolved' ? 'Resuelta' : dispute.status}
                  </span>
                  {dispute.platform === 'kleros' && (
                    <span className="text-xs text-purple-600 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Kleros
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(dispute.createdAt).toLocaleDateString('es-ES')}
                </span>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-300">
                {dispute.reason}
              </p>

              {dispute.evidence && dispute.evidence.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs text-gray-500">
                    {dispute.evidence.length} evidencias
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const JudgePanel: React.FC<JudgePanelProps> = ({
  competition,
  currentJudge,
  allJudges,
  votes,
  disputes,
  onSubmitVote,
  onProposeResolution,
  onSignResolution,
  onCreateDispute,
  onSubmitEvidence,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'vote' | 'resolution' | 'disputes'>('vote');
  const [loading, setLoading] = useState(false);

  const roleConfig = ROLE_CONFIG[currentJudge.role];
  const canVote = roleConfig.permissions.includes('vote');
  const canPropose = roleConfig.permissions.includes('propose');
  const canDispute = roleConfig.permissions.includes('dispute');

  const currentVote = votes.find(v => v.judge === currentJudge.address);
  const hasVoted = !!currentVote;

  // Vote options based on competition type
  const voteOptions: VoteOption[] = useMemo(() => {
    if (competition.category === 'challenge' || competition.category === 'tournament') {
      return [
        { id: 'approve', label: 'Aprobar Resultado', description: 'El resultado es válido' },
        { id: 'reject', label: 'Rechazar Resultado', description: 'El resultado no es válido' },
      ];
    }
    return [
      { id: 'yes', label: 'SÍ', description: 'La predicción es correcta' },
      { id: 'no', label: 'NO', description: 'La predicción es incorrecta' },
    ];
  }, [competition.category]);

  // Voting stats
  const votingStats = useMemo(() => {
    const total = allJudges.filter(j => ROLE_CONFIG[j.role].permissions.includes('vote')).length;
    const voted = votes.length;
    const threshold = Math.ceil(total * (competition.arbitration.votingThreshold / 100));
    const approvals = votes.filter(v => v.vote === 'approve' || v.vote === 'yes').length;
    const rejections = votes.filter(v => v.vote === 'reject' || v.vote === 'no').length;

    return { total, voted, threshold, approvals, rejections };
  }, [allJudges, votes, competition.arbitration.votingThreshold]);

  // Handlers
  const handleSubmitVote = useCallback(async (optionId: string, comment?: string) => {
    setLoading(true);
    try {
      await onSubmitVote({
        competitionId: competition.id,
        judge: currentJudge.address,
        vote: optionId,
        comment,
        weight: 1,
      });
    } finally {
      setLoading(false);
    }
  }, [competition.id, currentJudge.address, onSubmitVote]);

  const handleProposeResolution = useCallback(async (resolution: string, winners: string[]) => {
    if (!onProposeResolution) return;
    setLoading(true);
    try {
      await onProposeResolution(resolution, winners);
    } finally {
      setLoading(false);
    }
  }, [onProposeResolution]);

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
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${roleConfig.bgColor} ${roleConfig.color}`}>
              {roleConfig.icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Panel de Juez
              </h3>
              <span className={`text-sm ${roleConfig.color}`}>
                {roleConfig.label}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500">Votos</div>
            <div className="font-bold text-gray-900 dark:text-white">
              {votingStats.voted} / {votingStats.threshold} necesarios
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
            style={{ width: `${(votingStats.voted / votingStats.total) * 100}%` }}
          />
        </div>

        {/* Vote breakdown */}
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <ThumbsUp className="w-3 h-3 text-green-500" />
            {votingStats.approvals} a favor
          </span>
          <span className="flex items-center gap-1">
            <ThumbsDown className="w-3 h-3 text-red-500" />
            {votingStats.rejections} en contra
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'vote', label: 'Votar', icon: <Scale className="w-4 h-4" />, show: canVote },
          { id: 'resolution', label: 'Resolución', icon: <FileText className="w-4 h-4" />, show: canPropose },
          { id: 'disputes', label: 'Disputas', icon: <AlertTriangle className="w-4 h-4" />, show: true },
        ].filter(tab => tab.show).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`
              flex-1 px-4 py-3 text-sm font-medium
              flex items-center justify-center gap-2
              transition-colors
              ${activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }
            `}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'disputes' && disputes.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-red-100 dark:bg-red-900/30 text-red-600">
                {disputes.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-5">
        <AnimatePresence mode="wait">
          {activeTab === 'vote' && canVote && (
            <motion.div
              key="vote"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <JudgeListCard
                judges={allJudges}
                votes={votes}
                currentJudgeAddress={currentJudge.address}
              />

              <VoteForm
                options={voteOptions}
                onSubmit={handleSubmitVote}
                hasVoted={hasVoted}
                currentVote={currentVote}
                loading={loading}
              />
            </motion.div>
          )}

          {activeTab === 'resolution' && canPropose && onProposeResolution && (
            <motion.div
              key="resolution"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ResolutionForm
                competition={competition}
                onPropose={handleProposeResolution}
                loading={loading}
              />
            </motion.div>
          )}

          {activeTab === 'disputes' && (
            <motion.div
              key="disputes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <DisputeSection
                disputes={disputes}
                onCreateDispute={onCreateDispute}
                onSubmitEvidence={onSubmitEvidence}
                canDispute={canDispute}
                loading={loading}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700
        bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Deadline: {new Date(competition.timeline.resolutionDeadline || Date.now()).toLocaleDateString('es-ES')}
          </span>
          <span className="flex items-center gap-1">
            {competition.arbitration.method === 'kleros' ? (
              <>
                <Shield className="w-3 h-3" />
                Kleros Court
              </>
            ) : (
              <>
                <Users className="w-3 h-3" />
                Multisig Panel
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default JudgePanel;
