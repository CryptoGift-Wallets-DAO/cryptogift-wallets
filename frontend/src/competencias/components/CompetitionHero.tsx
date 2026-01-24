"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Users, Coins, TrendingUp, Zap, Target } from 'lucide-react';

interface CompetitionStats {
  totalCompetitions: number;
  activeCompetitions: number;
  totalPrizePool: string;
  totalParticipants: number;
  totalVolume: string;
  avgProbability: number;
}

interface CompetitionHeroProps {
  stats?: CompetitionStats;
}

export function CompetitionHero({ stats }: CompetitionHeroProps) {
  const defaultStats: CompetitionStats = {
    totalCompetitions: 0,
    activeCompetitions: 0,
    totalPrizePool: '0',
    totalParticipants: 0,
    totalVolume: '0',
    avgProbability: 50,
  };

  const s = stats || defaultStats;

  const statCards = [
    {
      icon: <Trophy className="w-5 h-5" />,
      label: 'Competencias',
      value: s.totalCompetitions.toString(),
      color: 'amber',
      gradient: 'from-amber-500 to-orange-600',
    },
    {
      icon: <Zap className="w-5 h-5" />,
      label: 'En Vivo',
      value: s.activeCompetitions.toString(),
      color: 'green',
      gradient: 'from-green-500 to-emerald-600',
    },
    {
      icon: <Coins className="w-5 h-5" />,
      label: 'Prize Pool',
      value: `${parseFloat(s.totalPrizePool).toFixed(2)} ETH`,
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-600',
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: 'Participantes',
      value: s.totalParticipants.toString(),
      color: 'purple',
      gradient: 'from-purple-500 to-pink-600',
    },
  ];

  return (
    <div className="relative overflow-hidden pt-8 pb-24 px-4 sm:px-6">
      {/* Hero Content */}
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm
                      rounded-full border border-white/10 mb-6"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-sm text-gray-300">
              {s.activeCompetitions} competencias en vivo
            </span>
          </motion.div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
            <span className="text-white">Sistema de </span>
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400
                           bg-clip-text text-transparent">
              Competencias
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Predicciones, torneos y desafíos con custodia segura en{' '}
            <span className="text-blue-400 font-semibold">Gnosis Safe</span>.
            Apuesta, compite y gana con total transparencia.
          </p>

          {/* Category Pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {[
              { emoji: '🎯', label: 'Predicciones', color: 'blue' },
              { emoji: '🏆', label: 'Torneos', color: 'amber' },
              { emoji: '⚔️', label: 'Desafíos', color: 'red' },
              { emoji: '🎱', label: 'Pools', color: 'purple' },
            ].map((cat, i) => (
              <motion.div
                key={cat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full
                           bg-${cat.color}-500/10 border border-${cat.color}-500/20
                           hover:bg-${cat.color}-500/20 transition-colors cursor-pointer`}
              >
                <span className="text-lg">{cat.emoji}</span>
                <span className={`text-sm font-medium text-${cat.color}-400`}>
                  {cat.label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="group relative"
            >
              <div className="glass-crystal rounded-2xl p-5 border border-white/10
                            hover:border-white/20 transition-all duration-300
                            hover:shadow-lg hover:shadow-white/5">
                {/* Gradient accent */}
                <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl
                               bg-gradient-to-r ${stat.gradient} opacity-60
                               group-hover:opacity-100 transition-opacity`} />

                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-white">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-2 bg-${stat.color}-500/10 rounded-lg
                                 group-hover:bg-${stat.color}-500/20 transition-colors`}>
                    <div className={`text-${stat.color}-400`}>
                      {stat.icon}
                    </div>
                  </div>
                </div>

                {/* Shimmer effect on hover */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden opacity-0
                              group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent
                                via-white/5 to-transparent -translate-x-full
                                group-hover:translate-x-full transition-transform duration-1000" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px
                    bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

      {/* Floating particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-blue-400/60 rounded-full"
          style={{
            top: `${20 + Math.random() * 60}%`,
            left: `${10 + Math.random() * 80}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
}
