"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Trophy, Users, Clock, Coins, ArrowLeft, Shield,
  TrendingUp, TrendingDown, Zap, Target, CheckCircle2,
  AlertCircle, ExternalLink, Copy, Share2, Gavel
} from 'lucide-react';
import { useCompetition } from '@/competencias/hooks/useCompetitions';
// Components will be integrated when full data is available
// import { PredictionMarketView } from '@/competencias/components/PredictionMarketView';
// import { JudgePanel } from '@/competencias/components/JudgePanel';
// import { LiveTransparencyView } from '@/competencias/components/LiveTransparencyView';
import { ethers } from 'ethers';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Category styling
const CATEGORY_STYLES: Record<string, { emoji: string; gradient: string; color: string }> = {
  prediction: { emoji: '🎯', gradient: 'from-blue-500 to-cyan-500', color: 'blue' },
  tournament: { emoji: '🏆', gradient: 'from-amber-500 to-orange-500', color: 'amber' },
  challenge: { emoji: '⚔️', gradient: 'from-red-500 to-pink-500', color: 'red' },
  pool: { emoji: '🎱', gradient: 'from-purple-500 to-violet-500', color: 'purple' },
  milestone: { emoji: '🎯', gradient: 'from-green-500 to-emerald-500', color: 'green' },
  ranking: { emoji: '📊', gradient: 'from-indigo-500 to-blue-500', color: 'indigo' },
};

// Status badges
const STATUS_STYLES: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active: { label: 'En Vivo', color: 'green', icon: <Zap className="w-3 h-3" /> },
  pending: { label: 'Pendiente', color: 'yellow', icon: <Clock className="w-3 h-3" /> },
  resolving: { label: 'Resolviendo', color: 'blue', icon: <Target className="w-3 h-3" /> },
  completed: { label: 'Completada', color: 'emerald', icon: <CheckCircle2 className="w-3 h-3" /> },
  disputed: { label: 'En Disputa', color: 'red', icon: <AlertCircle className="w-3 h-3" /> },
};

export default function CompetitionDetailPage() {
  const params = useParams();
  const competitionId = params?.id as string;
  const { competition, isLoading, error, refetch } = useCompetition(competitionId);
  const [activeTab, setActiveTab] = useState<'market' | 'judges' | 'events'>('market');
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-white/10 rounded-lg w-32" />
            <div className="h-64 bg-white/5 rounded-2xl" />
            <div className="grid md:grid-cols-3 gap-4">
              <div className="h-32 bg-white/5 rounded-xl" />
              <div className="h-32 bg-white/5 rounded-xl" />
              <div className="h-32 bg-white/5 rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !competition) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="glass-crystal rounded-2xl p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Competencia no encontrada</h2>
            <p className="text-gray-400 mb-6">{error || 'La competencia solicitada no existe.'}</p>
            <Link href="/competencias">
              <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600
                               text-white font-semibold rounded-xl hover:shadow-lg transition-all">
                Volver a Competencias
              </button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const categoryStyle = CATEGORY_STYLES[competition.category] || CATEGORY_STYLES.prediction;
  const statusStyle = STATUS_STYLES[competition.status] || STATUS_STYLES.pending;

  // Calculate values
  const prizePoolValue = typeof competition.prizePool === 'string'
    ? parseFloat(competition.prizePool)
    : competition.prizePool?.total || 0;
  const prizePoolDisplay = prizePoolValue > 0
    ? ethers.formatEther(BigInt(Math.floor(prizePoolValue)))
    : '0';

  const participantCount = Array.isArray(competition.participants)
    ? competition.participants.length
    : competition.participants?.current || 0;

  const endsAt = new Date(competition.endsAt);
  const timeRemaining = endsAt > new Date()
    ? formatDistanceToNow(endsAt, { locale: es, addSuffix: true })
    : 'Finalizado';

  const probability = competition.currentProbability || competition.market?.probability;

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-950 to-gray-950" />
        <motion.div
          className="absolute top-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link href="/competencias" className="inline-flex items-center gap-2 text-gray-400
                                              hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Competencias</span>
          </Link>
        </motion.div>

        {/* Main Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-crystal rounded-3xl overflow-hidden border border-white/10 mb-8"
        >
          {/* Top gradient */}
          <div className={`h-2 bg-gradient-to-r ${categoryStyle.gradient}`} />

          <div className="p-6 lg:p-8">
            {/* Header Row */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                {/* Category Icon */}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl
                              bg-gradient-to-br ${categoryStyle.gradient}/20
                              border border-${categoryStyle.color}-500/30`}>
                  {categoryStyle.emoji}
                </div>

                <div>
                  {/* Status Badge */}
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                                text-sm font-medium mb-2
                                bg-${statusStyle.color}-500/20 text-${statusStyle.color}-400
                                border border-${statusStyle.color}-500/30`}>
                    {statusStyle.icon}
                    {statusStyle.label}
                    {competition.status === 'active' && (
                      <span className="relative flex h-2 w-2 ml-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                      </span>
                    )}
                  </div>

                  <h1 className="text-2xl lg:text-3xl font-bold text-white">
                    {competition.title}
                  </h1>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {/* Safe Badge */}
                {competition.safeAddress && (
                  <a
                    href={`https://app.safe.global/home?safe=base:${competition.safeAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-xl
                             border border-green-500/20 text-green-400 hover:bg-green-500/20
                             transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">Ver Safe</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                {/* Share Button */}
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl
                           border border-white/10 text-gray-400 hover:bg-white/10
                           hover:text-white transition-colors"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
                  <span className="text-sm">{copied ? 'Copiado!' : 'Compartir'}</span>
                </button>
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-400 mb-6 max-w-3xl">
              {competition.description}
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Prize Pool */}
              <div className="glass-crystal rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Premio</span>
                </div>
                <p className="text-xl font-bold text-white">{prizePoolDisplay} ETH</p>
              </div>

              {/* Participants */}
              <div className="glass-crystal rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Participantes</span>
                </div>
                <p className="text-xl font-bold text-white">
                  {participantCount}
                  {competition.maxParticipants && (
                    <span className="text-gray-500">/{competition.maxParticipants}</span>
                  )}
                </p>
              </div>

              {/* Time */}
              <div className="glass-crystal rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Finaliza</span>
                </div>
                <p className="text-xl font-bold text-white">{timeRemaining}</p>
              </div>

              {/* Probability (if prediction market) */}
              {probability !== undefined && (
                <div className="glass-crystal rounded-xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Probabilidad</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-bold text-white">{probability.toFixed(0)}%</p>
                    <span className="text-xs text-green-400">SÍ</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mb-6 overflow-x-auto pb-2"
        >
          {[
            { id: 'market', label: 'Mercado', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'judges', label: 'Jueces', icon: <Gavel className="w-4 h-4" /> },
            { id: 'events', label: 'Eventos', icon: <Zap className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium
                        transition-all whitespace-nowrap
                        ${activeTab === tab.id
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                          : 'glass-crystal text-gray-400 hover:text-white border border-white/10'
                        }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'market' && (
              <div className="glass-crystal rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <h3 className="text-lg font-semibold text-white">Mercado de Prediccion</h3>
                </div>
                {probability !== undefined ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                      <span className="text-gray-400">Probabilidad SI</span>
                      <span className="text-2xl font-bold text-green-400">{probability.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                      <span className="text-gray-400">Probabilidad NO</span>
                      <span className="text-2xl font-bold text-red-400">{(100 - probability).toFixed(0)}%</span>
                    </div>
                    <p className="text-sm text-gray-500 text-center">
                      Conecta tu wallet para participar en el mercado
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-400">
                    Esta competencia no tiene mercado de prediccion activo.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'judges' && (
              <div className="glass-crystal rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <Gavel className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Panel de Jueces</h3>
                </div>
                {competition.resolution?.judges && competition.resolution.judges.length > 0 ? (
                  <div className="space-y-3">
                    {competition.resolution.judges.map((judge, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Users className="w-4 h-4 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-white font-mono text-sm">
                              {judge.address.slice(0, 6)}...{judge.address.slice(-4)}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">{judge.role}</p>
                          </div>
                        </div>
                        {judge.hasVoted && (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No hay jueces asignados a esta competencia.</p>
                )}
              </div>
            )}

            {activeTab === 'events' && (
              <div className="glass-crystal rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-semibold text-white">Eventos en Vivo</h3>
                </div>
                {competition.transparency?.events && competition.transparency.events.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {competition.transparency.events.slice(0, 10).map((event, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                        <div className="w-2 h-2 mt-2 rounded-full bg-blue-400" />
                        <div className="flex-1">
                          <p className="text-sm text-white">{event.type}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(event.timestamp).toLocaleString('es-ES')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No hay eventos registrados aun.</p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
