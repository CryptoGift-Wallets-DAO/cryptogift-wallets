/**
 * ACHIEVEMENT SYSTEM - Sistema de Logros y Badges
 * Gamification completa con notificaciones y celebraciones
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Zap, Target, Award, Shield, Flame, Diamond, Crown, Medal } from 'lucide-react';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'learning' | 'streak' | 'speed' | 'perfect' | 'social' | 'special';
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: Date;
  progress?: {
    current: number;
    total: number;
  };
  secret?: boolean;
}

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  animate?: boolean;
  onClick?: () => void;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  size = 'medium',
  showProgress = true,
  animate = true,
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isUnlocked = !!achievement.unlockedAt;
  const progress = achievement.progress;
  
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32'
  };

  const getRarityColor = () => {
    switch (achievement.rarity) {
      case 'common':
        return 'from-gray-400 to-gray-600';
      case 'rare':
        return 'from-blue-400 to-blue-600';
      case 'epic':
        return 'from-purple-400 to-purple-600';
      case 'legendary':
        return 'from-yellow-400 to-orange-600';
    }
  };

  const getRarityGlow = () => {
    if (!isUnlocked) return '';
    switch (achievement.rarity) {
      case 'legendary':
        return 'shadow-[0_0_30px_rgba(251,191,36,0.5)]';
      case 'epic':
        return 'shadow-[0_0_20px_rgba(168,85,247,0.5)]';
      case 'rare':
        return 'shadow-[0_0_15px_rgba(59,130,246,0.5)]';
      default:
        return 'shadow-lg';
    }
  };

  return (
    <motion.div
      className={`relative ${sizeClasses[size]} cursor-pointer`}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      whileHover={animate ? { scale: 1.1 } : {}}
      whileTap={animate ? { scale: 0.95 } : {}}
    >
      {/* Glow effect for unlocked achievements */}
      {isUnlocked && achievement.rarity !== 'common' && (
        <motion.div
          className={`absolute inset-0 rounded-full bg-gradient-to-br ${getRarityColor()} opacity-30 blur-xl`}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      {/* Main badge */}
      <motion.div
        className={`
          relative w-full h-full rounded-full flex items-center justify-center
          ${isUnlocked 
            ? `bg-gradient-to-br ${getRarityColor()} ${getRarityGlow()}` 
            : 'bg-gray-300 dark:bg-gray-700'
          }
          transition-all duration-300
        `}
        initial={false}
        animate={isUnlocked && animate ? {
          rotate: [0, 5, -5, 0]
        } : {}}
        transition={{
          duration: 0.5,
          delay: 0.2
        }}
      >
        {/* Icon */}
        <div className={`
          ${isUnlocked ? 'text-white' : 'text-gray-500 dark:text-gray-500'}
          ${size === 'small' ? 'text-2xl' : size === 'medium' ? 'text-3xl' : 'text-4xl'}
        `}>
          {achievement.icon}
        </div>

        {/* Lock overlay for locked achievements */}
        {!isUnlocked && (
          <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/20">
            <span className="text-2xl">🔒</span>
          </div>
        )}

        {/* Progress ring */}
        {showProgress && progress && !isUnlocked && (
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="3"
              fill="none"
            />
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="3"
              fill="none"
              strokeDasharray={`${(progress.current / progress.total) * 283} 283`}
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Rarity indicator stars */}
        {isUnlocked && achievement.rarity === 'legendary' && (
          <motion.div
            className="absolute -top-2 -right-2"
            animate={{
              rotate: 360
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            <Star className="w-6 h-6 text-yellow-300 fill-yellow-300" />
          </motion.div>
        )}
      </motion.div>

      {/* Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-gray-900 text-white rounded-lg p-3 shadow-xl min-w-[200px]">
              <h4 className="font-bold text-sm mb-1">{achievement.name}</h4>
              <p className="text-xs opacity-90 mb-2">{achievement.description}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-yellow-400">+{achievement.points} pts</span>
                {progress && (
                  <span className="text-blue-400">
                    {progress.current}/{progress.total}
                  </span>
                )}
              </div>
              {isUnlocked && achievement.unlockedAt && (
                <p className="text-xs text-green-400 mt-2">
                  ✅ Desbloqueado {new Date(achievement.unlockedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Achievement notification component
interface AchievementNotificationProps {
  achievement: Achievement;
  onClose: () => void;
}

export const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  achievement,
  onClose
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className="fixed top-4 right-4 z-50"
    >
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl p-6 shadow-2xl max-w-sm">
        <div className="flex items-start gap-4">
          <motion.div
            className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0"
            animate={{
              rotate: [0, 360],
              scale: [1, 1.2, 1]
            }}
            transition={{
              duration: 1,
              ease: "easeOut"
            }}
          >
            <span className="text-3xl">{achievement.icon}</span>
          </motion.div>
          
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">¡Logro Desbloqueado!</h3>
            <p className="font-semibold mb-1">{achievement.name}</p>
            <p className="text-sm opacity-90">{achievement.description}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-yellow-300 font-bold">+{achievement.points} pts</span>
              <span className="text-xs uppercase opacity-75">
                {achievement.rarity}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Celebration particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-yellow-300 rounded-full"
              initial={{
                x: '50%',
                y: '50%',
                scale: 0
              }}
              animate={{
                x: `${50 + (Math.random() - 0.5) * 100}%`,
                y: `${50 + (Math.random() - 0.5) * 100}%`,
                scale: [0, 1, 0]
              }}
              transition={{
                duration: 1,
                delay: i * 0.05,
                ease: "easeOut"
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// Achievement showcase grid
interface AchievementShowcaseProps {
  achievements: Achievement[];
  title?: string;
  columns?: number;
}

export const AchievementShowcase: React.FC<AchievementShowcaseProps> = ({
  achievements,
  title = "Mis Logros",
  columns = 4
}) => {
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  
  const totalPoints = achievements
    .filter(a => a.unlockedAt)
    .reduce((sum, a) => sum + a.points, 0);
  
  const unlockedCount = achievements.filter(a => a.unlockedAt).length;
  const completionPercentage = (unlockedCount / achievements.length) * 100;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {unlockedCount} de {achievements.length} desbloqueados
          </p>
        </div>
        
        <div className="text-right">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {totalPoints}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Puntos totales
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {completionPercentage.toFixed(0)}% completado
        </p>
      </div>

      {/* Achievements grid */}
      <div className={`grid grid-cols-${columns} gap-4`}>
        {achievements.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <AchievementBadge
              achievement={achievement}
              size="medium"
              onClick={() => setSelectedAchievement(achievement)}
            />
          </motion.div>
        ))}
      </div>

      {/* Selected achievement detail modal */}
      <AnimatePresence>
        {selectedAchievement && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedAchievement(null)}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-6">
                <AchievementBadge
                  achievement={selectedAchievement}
                  size="large"
                  animate={false}
                />
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {selectedAchievement.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedAchievement.description}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Categoría</span>
                  <span className="font-medium text-gray-900 dark:text-white capitalize">
                    {selectedAchievement.category}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Rareza</span>
                  <span className={`
                    font-bold uppercase
                    ${selectedAchievement.rarity === 'legendary' ? 'text-yellow-500' :
                      selectedAchievement.rarity === 'epic' ? 'text-purple-500' :
                      selectedAchievement.rarity === 'rare' ? 'text-blue-500' :
                      'text-gray-500'}
                  `}>
                    {selectedAchievement.rarity}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Puntos</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    +{selectedAchievement.points} pts
                  </span>
                </div>
                {selectedAchievement.unlockedAt && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600 dark:text-gray-400">Desbloqueado</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      {new Date(selectedAchievement.unlockedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {selectedAchievement.progress && !selectedAchievement.unlockedAt && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Progreso</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedAchievement.progress.current} / {selectedAchievement.progress.total}
                      </span>
                    </div>
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        style={{
                          width: `${(selectedAchievement.progress.current / selectedAchievement.progress.total) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedAchievement(null)}
                className="w-full mt-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Preset achievements
export const PRESET_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-claim',
    name: 'Primer Claim',
    description: 'Reclamaste tu primer gift sin gas',
    icon: <Trophy />,
    category: 'learning',
    points: 100,
    rarity: 'common',
    unlockedAt: new Date()
  },
  {
    id: 'streak-7',
    name: 'Semana Perfecta',
    description: '7 días seguidos de Daily Tips',
    icon: <Flame />,
    category: 'streak',
    points: 250,
    rarity: 'rare',
    progress: { current: 5, total: 7 }
  },
  {
    id: 'speed-learner',
    name: 'Aprendiz Veloz',
    description: 'Completaste un módulo en menos de 5 minutos',
    icon: <Zap />,
    category: 'speed',
    points: 150,
    rarity: 'rare'
  },
  {
    id: 'perfect-score',
    name: 'Perfección',
    description: '100% en un módulo sin usar pistas',
    icon: <Star />,
    category: 'perfect',
    points: 300,
    rarity: 'epic'
  },
  {
    id: 'social-butterfly',
    name: 'Social Butterfly',
    description: 'Compartiste 10 logros con amigos',
    icon: <Award />,
    category: 'social',
    points: 200,
    rarity: 'rare',
    progress: { current: 3, total: 10 }
  },
  {
    id: 'crypto-master',
    name: 'Crypto Master',
    description: 'Completaste todos los módulos avanzados',
    icon: <Crown />,
    category: 'learning',
    points: 1000,
    rarity: 'legendary',
    secret: true
  }
];

export default AchievementShowcase;