/**
 * DAILY TIP CARD COMPONENT - Sistema de Tips Diarios
 * Tips de 60-90 segundos con sistema de streaks y gamification
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Flame, Trophy, Clock, CheckCircle, XCircle } from 'lucide-react';

interface DailyTip {
  id: string;
  title: string;
  content: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question?: {
    text: string;
    options: string[];
    correctIndex: number;
  };
  funFact?: string;
  estimatedTime: string;
  points: number;
}

interface DailyTipCardProps {
  tip?: DailyTip;
  streak?: number;
  onComplete?: (correct: boolean) => void;
  onSkip?: () => void;
  compact?: boolean;
  showTimer?: boolean;
}

export const DailyTipCard: React.FC<DailyTipCardProps> = ({
  tip,
  streak = 0,
  onComplete,
  onSkip,
  compact = false,
  showTimer = true
}) => {
  const [stage, setStage] = useState<'intro' | 'content' | 'question' | 'result'>('intro');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState(90); // 90 seconds max
  const [startTime, setStartTime] = useState(Date.now());
  const [showStreak, setShowStreak] = useState(false);

  // Default tip if none provided
  const defaultTip: DailyTip = {
    id: 'tip-1',
    title: '¿Sabías que los NFTs son únicos?',
    content: 'Cada NFT tiene un identificador único en la blockchain que lo hace imposible de duplicar. Es como tener el certificado de autenticidad digital definitivo.',
    category: 'NFT Basics',
    difficulty: 'easy',
    question: {
      text: '¿Qué hace único a un NFT?',
      options: [
        'Su precio',
        'Su identificador en blockchain',
        'Su imagen',
        'Su creador'
      ],
      correctIndex: 1
    },
    funFact: '¡El NFT más caro vendido fue por $69 millones!',
    estimatedTime: '60s',
    points: 10
  };

  const currentTip = tip || defaultTip;

  useEffect(() => {
    if (showTimer && stage !== 'result') {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0) {
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [stage, showTimer]);

  useEffect(() => {
    // Auto-advance from intro after 3 seconds
    if (stage === 'intro') {
      const timer = setTimeout(() => setStage('content'), 3000);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  useEffect(() => {
    // Show streak animation
    if (streak > 0 && streak % 7 === 0) {
      setShowStreak(true);
      const timer = setTimeout(() => setShowStreak(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [streak]);

  const handleTimeout = () => {
    setStage('result');
    setIsCorrect(false);
    onComplete?.(false);
  };

  const handleAnswerSelect = (index: number) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(index);
    const correct = index === currentTip.question?.correctIndex;
    setIsCorrect(correct);
    
    setTimeout(() => {
      setStage('result');
      onComplete?.(correct);
    }, 1500);
  };

  const getDifficultyColor = (difficulty: DailyTip['difficulty']) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'hard':
        return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  const getStreakEmoji = () => {
    if (streak >= 30) return '💎';
    if (streak >= 14) return '🔥';
    if (streak >= 7) return '⭐';
    if (streak >= 3) return '✨';
    return '🌟';
  };

  if (compact) {
    return (
      <motion.div
        className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-4 text-white shadow-xl"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <span className="font-bold">Tip del Día</span>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
              <Flame className="w-4 h-4" />
              <span className="text-sm font-bold">{streak}</span>
            </div>
          )}
        </div>
        <p className="text-sm opacity-90 mb-3">{currentTip.title}</p>
        <button
          onClick={() => setStage('content')}
          className="w-full py-2 bg-white/20 rounded-lg font-medium hover:bg-white/30 transition-colors"
        >
          Ver Tip →
        </button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stage}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden max-w-2xl mx-auto"
      >
        {/* Header with streak and timer */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Tip del Día</h2>
                <p className="text-white/80 text-sm">{currentTip.category}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Streak counter */}
              {streak > 0 && (
                <motion.div
                  className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full"
                  animate={showStreak ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.5 }}
                >
                  <span className="text-2xl">{getStreakEmoji()}</span>
                  <div className="text-right">
                    <div className="text-xs opacity-80">Racha</div>
                    <div className="text-xl font-bold">{streak} días</div>
                  </div>
                </motion.div>
              )}
              
              {/* Timer */}
              {showTimer && stage !== 'result' && (
                <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-full">
                  <Clock className="w-4 h-4" />
                  <span className="font-mono font-bold">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Difficulty badge */}
          <div className="flex items-center gap-2">
            <span className={`
              px-3 py-1 rounded-full text-xs font-bold border
              ${getDifficultyColor(currentTip.difficulty)}
            `}>
              {currentTip.difficulty === 'easy' ? 'Fácil' : 
               currentTip.difficulty === 'medium' ? 'Medio' : 'Difícil'}
            </span>
            <span className="text-white/80 text-sm">
              • {currentTip.estimatedTime} • {currentTip.points} puntos
            </span>
          </div>
        </div>

        {/* Content area */}
        <div className="p-6">
          {stage === 'intro' && (
            <motion.div
              className="text-center py-12"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
            >
              <motion.div
                className="text-8xl mb-4"
                animate={{ 
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 1, delay: 0.5 }}
              >
                💡
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                ¡Tu tip diario está listo!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Aprende algo nuevo en menos de {currentTip.estimatedTime}
              </p>
            </motion.div>
          )}

          {stage === 'content' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {currentTip.title}
              </h3>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                {currentTip.content}
              </p>
              
              {currentTip.funFact && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🎉</span>
                    <div>
                      <p className="font-bold text-purple-900 dark:text-purple-300 mb-1">
                        ¡Dato Curioso!
                      </p>
                      <p className="text-purple-800 dark:text-purple-400">
                        {currentTip.funFact}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <motion.button
                onClick={() => setStage('question')}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Continuar al Quiz →
              </motion.button>
            </motion.div>
          )}

          {stage === 'question' && currentTip.question && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                {currentTip.question.text}
              </h3>
              
              <div className="space-y-3">
                {currentTip.question.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrectOption = index === currentTip.question!.correctIndex;
                  const showResult = selectedAnswer !== null;
                  
                  return (
                    <motion.button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      disabled={selectedAnswer !== null}
                      className={`
                        w-full p-4 rounded-xl text-left transition-all font-medium
                        ${!showResult ? 'hover:bg-purple-50 dark:hover:bg-purple-900/20 border-2 border-gray-200 dark:border-gray-700' : ''}
                        ${showResult && isCorrectOption ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500' : ''}
                        ${showResult && isSelected && !isCorrectOption ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500' : ''}
                        ${showResult && !isSelected && !isCorrectOption ? 'opacity-50' : ''}
                      `}
                      whileHover={!showResult ? { scale: 1.02 } : {}}
                      whileTap={!showResult ? { scale: 0.98 } : {}}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-gray-900 dark:text-white">
                          {option}
                        </span>
                        {showResult && isCorrectOption && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                        {showResult && isSelected && !isCorrectOption && (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {stage === 'result' && (
            <motion.div
              className="text-center py-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <motion.div
                className="text-8xl mb-4"
                animate={isCorrect ? {
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: [1, 1.2, 1]
                } : {
                  x: [-10, 10, -10, 10, 0]
                }}
                transition={{ duration: 0.5 }}
              >
                {isCorrect ? '🎉' : '😅'}
              </motion.div>
              
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {isCorrect ? '¡Excelente!' : '¡Casi lo tienes!'}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {isCorrect 
                  ? `Has ganado ${currentTip.points} puntos y mantienes tu racha de ${streak + 1} días.`
                  : 'No te preocupes, mañana tendrás otra oportunidad.'}
              </p>

              {isCorrect && streak > 0 && streak % 7 === 0 && (
                <motion.div
                  className="bg-yellow-100 dark:bg-yellow-900/30 rounded-xl p-4 mb-6"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                >
                  <Trophy className="w-12 h-12 text-yellow-600 mx-auto mb-2" />
                  <p className="font-bold text-yellow-900 dark:text-yellow-300">
                    ¡{streak} días de racha! 🔥
                  </p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-400">
                    Has desbloqueado un badge especial
                  </p>
                </motion.div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Ver más tips
                </button>
                <button
                  onClick={() => setStage('content')}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                >
                  Compartir 🚀
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Skip button */}
        {stage !== 'result' && stage !== 'intro' && (
          <div className="px-6 pb-6">
            <button
              onClick={onSkip}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Saltar por hoy →
            </button>
          </div>
        )}
      </motion.div>

      {/* Streak celebration overlay */}
      <AnimatePresence>
        {showStreak && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-3xl p-8 shadow-2xl"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <Trophy className="w-20 h-20 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-2">¡{streak} Días de Racha!</h2>
              <p className="text-xl">Eres imparable 🔥</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

export default DailyTipCard;