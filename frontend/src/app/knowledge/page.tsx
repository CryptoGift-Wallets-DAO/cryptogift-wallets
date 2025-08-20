"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { LessonModalWrapper } from '../../components/education/LessonModalWrapper';
import { getAllLessons, getLessonsByCategory } from '../../lib/lessonRegistry';
import { ProgressRing, ProgressRingGroup } from '../../components/learn/ProgressRing';
import { LearningPath, PathNode } from '../../components/learn/LearningPath';
import { DailyTipCard } from '../../components/learn/DailyTipCard';
import { AchievementShowcase, PRESET_ACHIEVEMENTS } from '../../components/learn/AchievementSystem';
import { BookOpen, Trophy, Flame, Clock, Star, TrendingUp, Users, Sparkles } from 'lucide-react';

interface KnowledgeModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  level: 'Básico' | 'Intermedio' | 'Avanzado';
  duration: string;
  topics: string[];
  isLocked?: boolean;
  prerequisite?: string;
}

export default function KnowledgePage() {
  const [selectedCategory, setSelectedCategory] = useState('sales-masterclass');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDailyTip, setShowDailyTip] = useState(false);
  const [userStreak, setUserStreak] = useState(7); // Demo streak
  const [showAchievements, setShowAchievements] = useState(false);
  
  // Sistema Unificado: LessonModalWrapper states
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [currentLessonId, setCurrentLessonId] = useState('');
  
  // Learning progress demo data
  const [learningProgress] = useState({
    totalModules: 50,
    completedModules: 12,
    inProgressModules: 3,
    totalTime: 15,
    points: 2450,
    level: 5,
    nextLevelProgress: 65
  });
  
  // Check for daily tip on mount
  useEffect(() => {
    const lastTipDate = localStorage.getItem('lastDailyTip');
    const today = new Date().toDateString();
    if (lastTipDate !== today) {
      setTimeout(() => setShowDailyTip(true), 2000);
    }
  }, []);

  // Handler para abrir lecciones en modal (preserva la Sales Masterclass)
  const handleOpenLesson = (lessonId: string) => {
    console.log('📚 Opening lesson in Knowledge mode:', lessonId);
    setCurrentLessonId(lessonId);
    setShowLessonModal(true);
  };

  const knowledgeModules: Record<string, KnowledgeModule[]> = {
    'sales-masterclass': [
      {
        id: 'sales-masterclass',
        title: '🚀 SALES MASTERCLASS',
        description: 'De $0 a $100M en 15 minutos - La presentación definitiva para captar colaboradores, inversores y comunidad',
        icon: '💎',
        level: 'Avanzado',
        duration: '15 min',
        topics: ['Psicología de Ventas', 'AIDA Framework', 'Demo Live', 'Captación de Leads', 'ROI $100M+']
      }
    ],
    'getting-started': [
      {
        id: 'claim-first-gift',
        title: '🎁 Reclama tu Primer Regalo Cripto',
        description: 'Aprende haciendo: reclama un NFT real sin pagar gas y descubre cómo funciona',
        icon: '🎁',
        level: 'Básico',
        duration: '7 min',
        topics: ['Claim sin Gas', 'NFT-Wallets', 'Paymaster', 'ERC-6551', 'Experiencia Práctica']
      },
      {
        id: 'crypto-basics',
        title: '¿Qué es una Criptomoneda?',
        description: 'Conceptos fundamentales del dinero digital y blockchain',
        icon: '🪙',
        level: 'Básico',
        duration: '10 min',
        topics: ['Bitcoin', 'Ethereum', 'Wallets', 'Private Keys']
      },
      {
        id: 'wallet-basics',
        title: 'Tu Primera Wallet',
        description: 'Cómo crear y usar una billetera de criptomonedas',
        icon: '👛',
        level: 'Básico',
        duration: '15 min',
        topics: ['MetaMask', 'Seed Phrases', 'Seguridad', 'Backup']
      },
      {
        id: 'nft-intro',
        title: 'NFTs Explicado Simple',
        description: 'Qué son los NFTs y por qué son únicos',
        icon: '🖼️',
        level: 'Básico',
        duration: '12 min',
        topics: ['Tokens Únicos', 'Ownership', 'OpenSea', 'Metadata']
      }
    ],
    'platform-guide': [
      {
        id: 'cryptogift-basics',
        title: 'Cómo Funciona CryptoGift',
        description: 'Guía completa de nuestra plataforma',
        icon: '🎁',
        level: 'Básico',
        duration: '20 min',
        topics: ['NFT-Wallets', 'Gasless Transactions', 'TBA', 'Referrals']
      },
      {
        id: 'creating-gifts',
        title: 'Crear tu Primer Regalo',
        description: 'Tutorial paso a paso para regalar crypto',
        icon: '✨',
        level: 'Básico',
        duration: '25 min',
        topics: ['Upload Image', 'Add Funds', 'Share Link', 'Track Status']
      },
      {
        id: 'referral-system',
        title: 'Sistema de Referidos',
        description: 'Gana dinero invitando amigos',
        icon: '🌟',
        level: 'Intermedio',
        duration: '30 min',
        topics: ['Commission Structure', 'Tracking', 'Payments', 'Optimization']
      }
    ],
    'advanced-crypto': [
      {
        id: 'defi-basics',
        title: 'DeFi para Principiantes',
        description: 'Finanzas descentralizadas explicadas',
        icon: '🏦',
        level: 'Intermedio',
        duration: '45 min',
        topics: ['Lending', 'DEX', 'Yield Farming', 'Liquidity Pools'],
        isLocked: true,
        prerequisite: 'crypto-basics'
      },
      {
        id: 'smart-contracts',
        title: 'Smart Contracts 101',
        description: 'Contratos inteligentes y automatización',
        icon: '🤖',
        level: 'Avanzado',
        duration: '60 min',
        topics: ['Ethereum', 'Solidity', 'Gas', 'Security'],
        isLocked: true,
        prerequisite: 'defi-basics'
      }
    ],
    'security': [
      {
        id: 'wallet-security',
        title: 'Seguridad de Wallets',
        description: 'Protege tus fondos como un experto',
        icon: '🔐',
        level: 'Intermedio',
        duration: '35 min',
        topics: ['Hardware Wallets', 'Phishing', '2FA', 'Cold Storage']
      },
      {
        id: 'scam-protection',
        title: 'Evitar Estafas Crypto',
        description: 'Reconoce y evita las estafas más comunes',
        icon: '🛡️',
        level: 'Básico',
        duration: '20 min',
        topics: ['Rug Pulls', 'Fake Tokens', 'Social Engineering', 'Red Flags']
      }
    ]
  };

  const categories = [
    { id: 'sales-masterclass', name: '⭐ MASTERCLASS', icon: '🚀', color: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold shadow-lg' },
    { id: 'getting-started', name: 'Primeros Pasos', icon: '🚀', color: 'bg-blue-50 text-blue-700' },
    { id: 'platform-guide', name: 'Guía CryptoGift', icon: '🎁', color: 'bg-purple-50 text-purple-700' },
    { id: 'advanced-crypto', name: 'Crypto Avanzado', icon: '⚡', color: 'bg-yellow-50 text-yellow-700' },
    { id: 'security', name: 'Seguridad', icon: '🔒', color: 'bg-red-50 text-red-700' }
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Básico': return 'bg-green-100 text-green-800';
      case 'Intermedio': return 'bg-yellow-100 text-yellow-800';
      case 'Avanzado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const currentModules = knowledgeModules[selectedCategory] || [];
  const filteredModules = currentModules.filter(module => 
    module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.topics.some(topic => topic.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Learning path nodes for visualization
  const learningPathNodes: PathNode[] = [
    {
      id: 'start',
      title: 'Inicio',
      description: 'Tu viaje cripto empieza aquí',
      icon: '🚀',
      status: 'completed',
      position: { x: 100, y: 200 },
      connections: ['wallet-basics']
    },
    {
      id: 'wallet-basics',
      title: 'Wallet Básico',
      description: 'Aprende sobre wallets',
      icon: '👛',
      status: 'completed',
      position: { x: 250, y: 200 },
      connections: ['nft-intro', 'crypto-basics']
    },
    {
      id: 'nft-intro',
      title: 'Intro NFTs',
      description: 'Descubre los NFTs',
      icon: '🖼️',
      status: 'in-progress',
      progress: 65,
      position: { x: 400, y: 150 },
      connections: ['cryptogift-basics']
    },
    {
      id: 'crypto-basics',
      title: 'Crypto Básico',
      description: 'Fundamentos de cripto',
      icon: '🪙',
      status: 'available',
      position: { x: 400, y: 250 },
      connections: ['defi-basics']
    },
    {
      id: 'cryptogift-basics',
      title: 'CryptoGift',
      description: 'Domina CryptoGift',
      icon: '🎁',
      status: 'available',
      position: { x: 550, y: 150 },
      connections: ['sales-masterclass']
    },
    {
      id: 'defi-basics',
      title: 'DeFi',
      description: 'Finanzas descentralizadas',
      icon: '🏦',
      status: 'locked',
      position: { x: 550, y: 250 },
      connections: ['advanced']
    },
    {
      id: 'sales-masterclass',
      title: 'Sales Masterclass',
      description: 'Conviértete en experto',
      icon: '💎',
      status: 'available',
      position: { x: 700, y: 150 },
      connections: ['advanced']
    },
    {
      id: 'advanced',
      title: 'Avanzado',
      description: 'Contenido experto',
      icon: '🏆',
      status: 'locked',
      position: { x: 850, y: 200 },
      connections: []
    }
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50 
                   dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 transition-all duration-500">
      <div className="max-w-7xl mx-auto p-6">
        {/* Enhanced Header with Stats */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <motion.div 
              className="w-20 h-20 flex items-center justify-center 
                        bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30
                        rounded-2xl shadow-xl border border-purple-200/30 dark:border-purple-700/30 
                        backdrop-blur-sm transition-all duration-300"
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Sparkles className="w-12 h-12 text-purple-600 dark:text-purple-400" />
            </motion.div>
            <h1 className="text-5xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Knowledge Academy
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-6">
            Aprende cripto de forma interactiva y divertida. Sistema DO → EXPLAIN → CHECK → REINFORCE.
            <br />
            <span className="text-purple-600 dark:text-purple-400 font-medium">
              🚀 {learningProgress.completedModules} módulos completados • 
              🔥 {userStreak} días de racha • 
              ⚡ {learningProgress.points} puntos
            </span>
          </p>
          
          {/* User Level Badge */}
          <motion.div 
            className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full shadow-lg"
            whileHover={{ scale: 1.05 }}
          >
            <Trophy className="w-5 h-5" />
            <span className="font-bold">Nivel {learningProgress.level}</span>
            <div className="w-32 bg-white/20 rounded-full h-2 overflow-hidden">
              <motion.div 
                className="h-full bg-white"
                initial={{ width: 0 }}
                animate={{ width: `${learningProgress.nextLevelProgress}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
            <span className="text-sm">{learningProgress.nextLevelProgress}%</span>
          </motion.div>
        </motion.div>

        {/* Progress Overview Section */}
        <motion.div 
          className="grid md:grid-cols-4 gap-6 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
            <ProgressRing 
              progress={(learningProgress.completedModules / learningProgress.totalModules) * 100}
              size={100}
              label="Progreso Total"
              color="gradient"
              glowEffect={true}
            />
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-3">
              <Clock className="w-8 h-8 text-blue-500" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{learningProgress.totalTime}h</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400">Tiempo Total</p>
            <p className="text-sm text-blue-500 mt-2">+2h esta semana</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-3">
              <Flame className="w-8 h-8 text-orange-500" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{userStreak}</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400">Días de Racha</p>
            <p className="text-sm text-orange-500 mt-2">¡Sigue así! 🔥</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-3">
              <Star className="w-8 h-8 text-yellow-500" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{learningProgress.points}</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400">Puntos Totales</p>
            <p className="text-sm text-yellow-500 mt-2">Top 5% usuarios</p>
          </div>
        </motion.div>
        
        {/* Learning Path Visualization */}
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl mb-12"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tu Ruta de Aprendizaje</h2>
            <button 
              className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
              onClick={() => setSelectedCategory('getting-started')}
            >
              Ver todos los módulos →
            </button>
          </div>
          <div className="overflow-x-auto">
            <LearningPath 
              nodes={learningPathNodes}
              currentNodeId="nft-intro"
              onNodeClick={(nodeId) => {
                if (nodeId === 'sales-masterclass') {
                  handleOpenLesson('sales-masterclass');
                }
              }}
              animated={true}
            />
          </div>
        </motion.div>

        {/* Search Bar with Quick Actions */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <motion.input
              type="text"
              placeholder="🔍 Buscar lecciones, conceptos, tutoriales..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border-2 border-purple-200 dark:border-purple-700 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500
                       text-lg transition-all duration-300 shadow-lg"
              whileFocus={{ scale: 1.02 }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 
                         hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
          
          {/* Quick Action Buttons */}
          <div className="flex justify-center gap-3 mt-4">
            <motion.button
              onClick={() => setShowDailyTip(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full 
                       font-medium shadow-lg hover:shadow-xl transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              💡 Tip del Día
            </motion.button>
            <motion.button
              onClick={() => setShowAchievements(true)}
              className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full 
                       font-medium shadow-lg hover:shadow-xl transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🏆 Mis Logros
            </motion.button>
            <motion.button
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full 
                       font-medium shadow-lg hover:shadow-xl transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              📊 Estadísticas
            </motion.button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                selectedCategory === category.id
                  ? category.color + ' dark:bg-accent-gold/20 dark:text-accent-gold shadow-lg scale-105'
                  : 'bg-bg-card text-text-secondary hover:bg-bg-secondary'
              }`}
            >
              {category.icon} {category.name}
            </button>
          ))}
        </div>

        {/* Featured Sales Masterclass */}
        <div className="mb-12 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 
                       border border-yellow-500/30 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <span className="inline-flex items-center px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-full animate-pulse">
              ⭐ MÓDULO ESTRELLA
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-6xl">🚀</div>
                <div>
                  <h2 className="text-4xl font-bold text-black mb-2">
                    SALES MASTERCLASS
                  </h2>
                  <p className="text-lg text-gray-700">
                    De $0 a $100M en Regalos Cripto - 15 minutos que cambiarán tu visión del futuro
                  </p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/50 p-3 rounded-lg text-center">
                  <div className="font-bold text-black">15 minutos</div>
                  <div className="text-sm text-gray-600">Duración</div>
                </div>
                <div className="bg-white/50 p-3 rounded-lg text-center">
                  <div className="font-bold text-black">AIDA + SPIN</div>
                  <div className="text-sm text-gray-600">Frameworks</div>
                </div>
                <div className="bg-white/50 p-3 rounded-lg text-center">
                  <div className="font-bold text-black">Demo Live</div>
                  <div className="text-sm text-gray-600">QR Interactivo</div>
                </div>
              </div>

              <button
                onClick={() => handleOpenLesson('sales-masterclass')}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 
                         text-black font-bold rounded-xl hover:scale-105 transition-all duration-300 shadow-lg"
                style={{
                  animation: 'pulse 1.43s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}
              >
                🚀 INICIAR MASTERCLASS AHORA
              </button>
            </div>
            
            <div className="hidden lg:block ml-8">
              <div className="w-32 h-32 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full 
                            flex items-center justify-center text-4xl animate-spin-slow">
                💎
              </div>
            </div>
          </div>
          
          {/* Background decoration */}
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 rounded-full blur-3xl" />
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-orange-500/30 to-red-500/30 rounded-full blur-3xl" />
        </div>

        {/* Featured Daily Tip Card */}
        <motion.div 
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <Sparkles className="w-6 h-6" />
                  Tip del Día: ¿Sabías que los NFTs son únicos?
                </h3>
                <p className="text-purple-100 mb-4 max-w-2xl">
                  Cada NFT tiene un identificador único en la blockchain que lo hace imposible de duplicar. 
                  Es como tener el certificado de autenticidad digital definitivo.
                </p>
                <motion.button
                  onClick={() => setShowDailyTip(true)}
                  className="px-6 py-3 bg-white text-purple-600 font-bold rounded-xl 
                           hover:bg-purple-50 transition-all shadow-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Ver Tip Completo →
                </motion.button>
              </div>
              <div className="hidden lg:block">
                <motion.div
                  className="text-8xl"
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [-5, 5, -5]
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  💡
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Knowledge Modules */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map(module => (
            <div
              key={module.id}
              className={`bg-bg-card rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden ${
                module.isLocked ? 'opacity-75' : 'cursor-pointer hover:scale-105'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{module.icon}</div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(module.level)}`}>
                      {module.level}
                    </span>
                    {module.isLocked && (
                      <span className="px-2 py-1 bg-bg-secondary dark:bg-bg-primary text-text-secondary 
                                     rounded-full text-xs font-medium transition-colors duration-300">
                        🔒 Bloqueado
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-text-primary mb-2 transition-colors duration-300">
                  {module.title}
                </h3>
                
                <p className="text-text-secondary mb-4 text-sm transition-colors duration-300">
                  {module.description}
                </p>

                <div className="flex items-center justify-between text-sm text-text-muted mb-4 transition-colors duration-300">
                  <span>⏱️ {module.duration}</span>
                  <span>📖 {module.topics.length} temas</span>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {module.topics.slice(0, 3).map(topic => (
                    <span key={topic} className="px-2 py-1 bg-bg-secondary dark:bg-bg-primary text-text-secondary 
                                               rounded text-xs transition-colors duration-300">
                      {topic}
                    </span>
                  ))}
                  {module.topics.length > 3 && (
                    <span className="px-2 py-1 bg-bg-secondary dark:bg-bg-primary text-text-secondary 
                                   rounded text-xs transition-colors duration-300">
                      +{module.topics.length - 3} más
                    </span>
                  )}
                </div>

                {module.isLocked ? (
                  <div className="text-center py-3">
                    <p className="text-sm text-text-muted mb-2 transition-colors duration-300">
                      Completa &quot;{module.prerequisite}&quot; para desbloquear
                    </p>
                    <button className="px-4 py-2 bg-bg-secondary dark:bg-bg-primary text-text-muted 
                                     rounded-lg cursor-not-allowed transition-colors duration-300">
                      🔒 Bloqueado
                    </button>
                  </div>
                ) : (
                  module.id === 'sales-masterclass' ? (
                    <button
                      onClick={() => handleOpenLesson('sales-masterclass')}
                      className="block w-full text-center py-3 rounded-lg font-medium hover:opacity-90 transition-all duration-300 
                               bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold shadow-lg"
                      style={{
                        animation: 'pulse 1.43s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }}
                    >
                      🚀 INICIAR MASTERCLASS
                    </button>
                  ) : module.id === 'claim-first-gift' ? (
                    <button
                      onClick={() => handleOpenLesson('claim-first-gift')}
                      className="block w-full text-center py-3 rounded-lg font-medium hover:opacity-90 transition-all duration-300 
                               bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold shadow-lg"
                    >
                      🎁 COMENZAR EXPERIENCIA
                    </button>
                  ) : (
                    <Link
                      href={`/knowledge/${module.id}`}
                      className="block w-full text-center py-3 rounded-lg font-medium hover:opacity-90 transition-all duration-300 
                               bg-gradient-to-r from-purple-500 to-pink-500 dark:from-accent-gold dark:to-accent-silver text-white dark:text-bg-primary"
                    >
                      🚀 Comenzar Lección
                    </Link>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        {/* AI Assistant Banner */}
        <div className="mt-12 bg-gradient-to-r from-indigo-500 to-purple-600 
                       dark:from-accent-gold dark:to-accent-silver rounded-2xl p-8 
                       text-white dark:text-bg-primary transition-all duration-500">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">🤖 Asistente AI Cripto</h3>
              <p className="text-indigo-100 dark:text-bg-secondary mb-4 transition-colors duration-300">
                ¿Tienes dudas específicas? Nuestro asistente AI está aquí 24/7 para ayudarte con cualquier pregunta sobre cripto.
              </p>
              <ul className="text-sm text-indigo-100 dark:text-bg-secondary space-y-1 transition-colors duration-300">
                <li>✨ Respuestas personalizadas a tus preguntas</li>
                <li>🎯 Recomendaciones de aprendizaje</li>
                <li>🔗 Enlaces a lecciones relevantes</li>
                <li>📊 Seguimiento de tu progreso</li>
              </ul>
            </div>
            <div className="ml-8">
              <button className="bg-white dark:bg-bg-primary text-indigo-600 dark:text-accent-gold px-8 py-4 
                               rounded-xl font-bold hover:bg-indigo-50 dark:hover:bg-bg-secondary 
                               transition-all duration-300">
                💬 Chatear Ahora
              </button>
            </div>
          </div>
        </div>

        {/* Progress Tracking */}
        <div className="mt-8 bg-bg-card rounded-2xl p-6 transition-colors duration-300">
          <h3 className="text-xl font-bold text-text-primary mb-4 transition-colors duration-300">📈 Tu Progreso de Aprendizaje</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-accent-gold/20 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors duration-300">
                <span className="text-2xl font-bold text-green-600 dark:text-accent-gold transition-colors duration-300">75%</span>
              </div>
              <div className="text-sm text-text-secondary transition-colors duration-300">Básico Completado</div>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-yellow-100 dark:bg-accent-silver/20 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors duration-300">
                <span className="text-2xl font-bold text-yellow-600 dark:text-accent-silver transition-colors duration-300">45%</span>
              </div>
              <div className="text-sm text-text-secondary transition-colors duration-300">Intermedio en Progreso</div>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-bg-secondary dark:bg-bg-primary rounded-full flex items-center justify-center mx-auto mb-3 transition-colors duration-300">
                <span className="text-2xl font-bold text-text-muted transition-colors duration-300">0%</span>
              </div>
              <div className="text-sm text-text-secondary transition-colors duration-300">Avanzado Pendiente</div>
            </div>
          </div>
        </div>
      </div>

      {/* LESSON MODAL WRAPPER - SISTEMA UNIFICADO */}
      <LessonModalWrapper
        lessonId={currentLessonId}
        mode="knowledge"
        isOpen={showLessonModal}
        onClose={() => {
          console.log('📚 Closing lesson modal in Knowledge mode');
          setShowLessonModal(false);
          setCurrentLessonId('');
        }}
      />
      
      {/* Daily Tip Modal */}
      <AnimatePresence>
        {showDailyTip && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDailyTip(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="max-w-2xl w-full"
            >
              <DailyTipCard 
                streak={userStreak}
                onComplete={(correct) => {
                  if (correct) {
                    setUserStreak(prev => prev + 1);
                    localStorage.setItem('lastDailyTip', new Date().toDateString());
                  }
                  setTimeout(() => setShowDailyTip(false), 3000);
                }}
                onSkip={() => setShowDailyTip(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Achievements Modal */}
      <AnimatePresence>
        {showAchievements && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAchievements(false)}
          >
            <motion.div
              className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                    🏆 Tus Logros
                  </h2>
                  <button
                    onClick={() => setShowAchievements(false)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <AchievementShowcase 
                  achievements={PRESET_ACHIEVEMENTS}
                  columns={4}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}