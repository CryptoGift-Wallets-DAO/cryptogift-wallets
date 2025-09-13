"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { LessonModalWrapper } from '../../../components/education/LessonModalWrapper';
import { getAllLessons, getLessonsByCategory } from '../../../lib/lessonRegistry';
import { ProgressRing, ProgressRingGroup } from '../../../components/learn/ProgressRing';
import { LearningContainer } from '../../../components/learn';
import { DailyTipCard } from '../../../components/learn/DailyTipCard';
import { AchievementShowcase, PRESET_ACHIEVEMENTS } from '../../../components/learn/AchievementSystem';
import type { PathNode } from '../../../types/curriculum';
import { BookOpen, Trophy, Flame, Clock, Star, TrendingUp, Users, Sparkles, Plus, Grid3x3, Layers, Settings, PenTool, Wand2, GraduationCap, Gift, Gem, Coins, Wallet, Image as ImageIcon, Shield, ShieldCheck, Lock, Rocket, Zap, Bot, Building2 } from 'lucide-react';
import { SmartIcon } from '../../../components/ui/SmartIcon';

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

// Importar componentes del Creator Studio
import CreatorWizard from '../../components/creator-studio/CreatorWizard';
import RuleBuilder from '../../components/creator-studio/RuleBuilder';
import { getPopularTemplates } from '../../lib/creator-studio/templates';

type TabType = 'learn' | 'create' | 'my-content' | 'analytics';

export default function KnowledgePage() {
  // NUEVO: Sistema de pestañas para diferentes roles
  const [activeTab, setActiveTab] = useState<TabType>('learn');
  const [userRole, setUserRole] = useState<'student' | 'creator' | 'both'>('both'); // Demo: both roles
  
  // Estados del modo Learn (estudiante)
  const [selectedCategory, setSelectedCategory] = useState('sales-masterclass');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDailyTip, setShowDailyTip] = useState(false);
  const [userStreak, setUserStreak] = useState(7); // Demo streak
  const [showAchievements, setShowAchievements] = useState(false);
  
  // Toggle system is now handled internally by LearningContainer
  
  // NUEVO: Estados del modo Creator
  const [showCreatorWizard, setShowCreatorWizard] = useState(false);
  const [creatorWizardType, setCreatorWizardType] = useState<'lesson' | 'campaign'>('lesson');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [myCreations, setMyCreations] = useState<any[]>([]);
  
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
    console.log('LESSON: Opening lesson in Knowledge mode:', lessonId);
    setCurrentLessonId(lessonId);
    setShowLessonModal(true);
  };

  const knowledgeModules: Record<string, KnowledgeModule[]> = {
    'sales-masterclass': [
      {
        id: 'sales-masterclass',
        title: 'SALES MASTERCLASS',
        description: 'De $0 a $100M en 10 minutos - La presentación definitiva para captar colaboradores, inversores y comunidad',
        icon: '💎',
        level: 'Avanzado',
        duration: '10 min',
        topics: ['Psicología de Ventas', 'AIDA Framework', 'Demo Live', 'Captación de Leads', 'ROI $100M+']
      }
    ],
    'getting-started': [
      {
        id: 'claim-first-gift',
        title: 'Reclama tu Primer Regalo Cripto',
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
    { id: 'sales-masterclass', name: 'MASTERCLASS', icon: '🚀', color: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold shadow-lg' },
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

  // LEARNING PATH NODES - SISTEMA DOCUMENTADO DE DISEÑO UX
  // =====================================================
  //
  // ESTÁNDARES DE DISEÑO LEARNING PATH OBLIGATORIOS:
  //
  // 1. POSICIONAMIENTO DE CARDS:
  //    - Cards aparecen SIEMPRE DEBAJO de los nodos
  //    - Espacio mínimo: nodeSize/2 + 15px entre nodo y card
  //    - Cards centradas: cardLeft = node.position.x - 100
  //    - SVG height debe incluir +350px para espacio de cards
  //
  // 2. SISTEMA DE INTERACCIÓN HOVER/TOUCH:
  //    - onMouseEnter/onMouseLeave para desktop
  //    - onTouchStart/onTouchEnd para móvil
  //    - State: Set<string> para múltiples cards visibles
  //    - NO botones de cierre (X) - UX limpia
  //
  // 3. CLICK OUTSIDE TO CLOSE:
  //    - Event listeners: mousedown + touchstart
  //    - data-node y data-card para identificar elementos
  //    - Solo activos cuando visibleCards.size > 0
  //
  // 4. INDICADORES VISUALES:
  //    - Solo nodos NO locked muestran "Hover → Info"
  //    - Nodos grises (locked) sin indicadores
  //    - Cambio dinámico: "Hover → Info" / "Click → Entrenar"
  //
  // 5. ANIMACIONES OBLIGATORIAS:
  //    - Spring physics: stiffness: 300, damping: 25
  //    - Entry: opacity 0→1, y: -20→0, scale: 0.8→1
  //    - Exit: opacity 1→0, y: 0→-10, scale: 1→0.9
  //    - Hover en nodos: scale: 1.1, stiffness: 400, damping: 10
  //
  // 6. GLASS MORPHISM OBLIGATORIO:
  //    - backdrop-blur-xl + backdrop-saturate-150
  //    - from-white/95 to-white/90 (light)
  //    - from-gray-800/95 to-gray-900/90 (dark)
  //    - border-white/20 + shadow-2xl
  //
  // 7. RESPONSIVE & MOBILE:
  //    - Touch events idénticos a mouse events
  //    - Cards width: 200px fijo
  //    - Overflow-x-auto en contenedor principal
  //
  // ESTE DISEÑO ES EL ESTÁNDAR DEFINITIVO - NO CAMBIAR SIN DOCUMENTAR
  //
  const learningPathNodes: PathNode[] = [
    {
      id: 'start',
      title: 'Inicio',
      description: 'Tu viaje cripto empieza aquí. Descubre el poder de la tecnología blockchain',
      icon: '🚀',
      status: 'completed',
      position: { x: 150, y: 80 }, // Higher position for card space below
      connections: ['wallet-basics'],
      estimatedTime: '2 min',
      difficulty: 'beginner'
    },
    {
      id: 'wallet-basics',
      title: 'Wallet Básico',
      description: 'Aprende a crear y gestionar tu billetera digital de forma segura',
      icon: '👛',
      status: 'completed',
      position: { x: 350, y: 100 }, // Staggered for flow
      connections: ['nft-intro', 'crypto-basics'],
      estimatedTime: '8 min',
      difficulty: 'beginner'
    },
    {
      id: 'nft-intro',
      title: 'Intro NFTs',
      description: 'Descubre qué son los NFTs y cómo revolucionan la propiedad digital',
      icon: '🖼️',
      status: 'in-progress',
      progress: 65,
      position: { x: 550, y: 60 }, // Higher branch
      connections: ['cryptogift-basics'],
      estimatedTime: '12 min',
      difficulty: 'beginner'
    },
    {
      id: 'crypto-basics',
      title: 'Crypto Básico',
      description: 'Fundamentos de criptomonedas y tecnología blockchain',
      icon: '🪙',
      status: 'available',
      position: { x: 550, y: 140 }, // Lower branch, more space
      connections: ['defi-basics'],
      estimatedTime: '15 min',
      difficulty: 'beginner'
    },
    {
      id: 'cryptogift-basics',
      title: 'CryptoGift',
      description: 'Domina CryptoGift: envía y recibe regalos cripto de forma fácil',
      icon: '🎁',
      status: 'available',
      position: { x: 750, y: 80 }, // Continue upper flow
      connections: ['sales-masterclass'],
      estimatedTime: '10 min',
      difficulty: 'intermediate',
      prerequisites: ['nft-intro']
    },
    {
      id: 'defi-basics',
      title: 'DeFi',
      description: 'Finanzas descentralizadas: préstamos, yield farming y más',
      icon: '🏦',
      status: 'locked',
      position: { x: 750, y: 160 }, // Lower branch continues
      connections: ['advanced'],
      estimatedTime: '25 min',
      difficulty: 'advanced',
      prerequisites: ['crypto-basics']
    },
    {
      id: 'sales-masterclass',
      title: 'Sales Masterclass',
      description: 'Conviértete en colaborador experto y monetiza con CryptoGift',
      icon: '💎',
      status: 'available',
      position: { x: 950, y: 100 }, // Central convergence
      connections: ['advanced'],
      estimatedTime: '20 min',
      difficulty: 'intermediate',
      prerequisites: ['cryptogift-basics']
    },
    {
      id: 'advanced',
      title: 'Experto Crypto',
      description: 'Contenido experto: trading avanzado, DeFi y estrategias pro',
      icon: '🏆',
      status: 'locked',
      position: { x: 1150, y: 120 }, // Final destination with space
      connections: [],
      estimatedTime: '45 min',
      difficulty: 'advanced',
      prerequisites: ['sales-masterclass', 'defi-basics']
    }
  ];
  
  // Tabs configuration
  const tabs = [
    { id: 'learn' as TabType, label: 'Aprender', icon: GraduationCap, visible: userRole !== 'creator' },
    { id: 'create' as TabType, label: 'Crear', icon: PenTool, visible: userRole !== 'student' },
    { id: 'my-content' as TabType, label: 'Mi Contenido', icon: Layers, visible: userRole !== 'student' },
    { id: 'analytics' as TabType, label: 'Analíticas', icon: TrendingUp, visible: userRole !== 'student' }
  ].filter(tab => tab.visible);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50 
                   dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 transition-all duration-500">
      <div className="max-w-7xl mx-auto p-6">
        {/* Enhanced Header with Tabs */}
        <motion.div 
          className="mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header con título */}
          <div className="text-center mb-8">
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
              {activeTab === 'learn' ? 
                'Aprende cripto de forma interactiva y divertida. Sistema DO → EXPLAIN → CHECK → REINFORCE.' :
                activeTab === 'create' ?
                'Crea lecciones y campañas sin código. Constructor visual con plantillas y wizard.' :
                activeTab === 'my-content' ?
                'Gestiona tus lecciones y campañas creadas. Edita, publica y monitorea.' :
                'Analiza el rendimiento de tu contenido. Métricas, engagement y optimización.'
              }
              {activeTab === 'learn' && (
                <>
                  <br />
                  <span className="text-purple-600 dark:text-purple-400 font-medium">
                    <SmartIcon icon="🚀" size={16} className="mr-1" />{learningProgress.completedModules} módulos completados • 
                    <SmartIcon icon="🔥" size={16} className="mr-1" />{userStreak} días de racha • 
                    ⚡ {learningProgress.points} puntos
                  </span>
                </>
              )}
            </p>
            
            {/* User Level Badge - solo en modo Learn */}
            {activeTab === 'learn' && (
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
            )}
          </div>
          
          {/* TABS NAVIGATION - MOBILE SCROLL OPTIMIZED */}
          <div className="flex justify-center mb-8">
            {/* Mobile horizontal scroll wrapper */}
            <div className="w-full max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain scrollbar-hide">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-2 mx-auto w-max min-w-fit flex gap-2 scroll-smooth">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300
                      ${activeTab === tab.id 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}
                    `}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </motion.button>
                );
              })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* TAB CONTENT */}
        <AnimatePresence mode="wait">
          {activeTab === 'learn' ? (
            <motion.div
              key="learn-content"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
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
            <p className="text-sm text-orange-500 mt-2 flex items-center">¡Sigue así! <SmartIcon icon="🔥" size={16} className="ml-1" /></p>
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
        
        {/* Learning Path / Curriculum Tree Visualization */}
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl mb-12"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
              CG Academy - Sistema de Aprendizaje Interactivo
            </h2>
          </div>
          
          {/* New Learning Container with Toggle System */}
          <div className="h-[600px] rounded-xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
            <LearningContainer
              onNodeClick={(nodeId, nodeType) => {
                console.log('NODE: Node selected:', nodeId, nodeType);
                // Handle node selection - could open lesson modal, etc.
                if (nodeId === 'sales-masterclass') {
                  handleOpenLesson('sales-masterclass');
                }
              }}
              onQuestStart={(questId) => {
                console.log('✪ Starting quest:', questId);
                // TODO: Start quest system
              }}
              className="w-full h-full"
            />
          </div>
        </motion.div>

        {/* Search Bar with Quick Actions */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <motion.input
              type="text"
              placeholder="Buscar lecciones, conceptos, tutoriales..."
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
              <SmartIcon icon="💡" size={20} className="mr-2" />Tip del Día
            </motion.button>
            <motion.button
              onClick={() => setShowAchievements(true)}
              className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full 
                       font-medium shadow-lg hover:shadow-xl transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <SmartIcon icon="🏆" size={20} className="mr-2" />Mis Logros
            </motion.button>
            <motion.button
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full 
                       font-medium shadow-lg hover:shadow-xl transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <SmartIcon icon="📊" size={20} className="mr-2" />Estadísticas
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
              <SmartIcon icon={category.icon} size={20} className="mr-2" /> {category.name}
            </button>
          ))}
        </div>

        {/* Featured Sales Masterclass */}
        <div className="mb-12 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 
                       border border-yellow-500/30 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <span className="inline-flex items-center px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-full animate-pulse">
              <SmartIcon icon="⭐" size={20} className="mr-2" />MÓDULO ESTRELLA
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-6xl"><SmartIcon icon="🚀" size={72} /></div>
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
                <SmartIcon icon="🚀" size={20} className="mr-2" />INICIAR MASTERCLASS AHORA
              </button>
            </div>
            
            <div className="hidden lg:block ml-8">
              <div className="w-32 h-32 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full 
                            flex items-center justify-center text-4xl animate-spin-slow">
                <SmartIcon icon="💎" size={20} />
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
                  <SmartIcon icon="💡" size={24} />
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
                  <div className="flex items-center justify-center w-16 h-16">
                    <SmartIcon icon={module.icon} size={64} />
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(module.level)}`}>
                      {module.level}
                    </span>
                    {module.isLocked && (
                      <span className="px-2 py-1 bg-bg-secondary dark:bg-bg-primary text-text-secondary 
                                     rounded-full text-xs font-medium transition-colors duration-300">
                        <SmartIcon icon="🔒" size={14} className="mr-1" />
                        Bloqueado
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
                  <span><SmartIcon icon="📖" size={16} className="mr-2" />{module.topics.length} temas</span>
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
                      <SmartIcon icon="🔒" size={16} className="mr-2" />Bloqueado
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
                      <SmartIcon icon="🚀" size={18} className="mr-2" />INICIAR MASTERCLASS
                    </button>
                  ) : module.id === 'claim-first-gift' ? (
                    <button
                      onClick={() => handleOpenLesson('claim-first-gift')}
                      className="block w-full text-center py-3 rounded-lg font-medium hover:opacity-90 transition-all duration-300 
                               bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold shadow-lg"
                    >
                      <SmartIcon icon="🎁" size={18} className="mr-2" />COMENZAR EXPERIENCIA
                    </button>
                  ) : (
                    <Link
                      href={`/knowledge/${module.id}`}
                      className="block w-full text-center py-3 rounded-lg font-medium hover:opacity-90 transition-all duration-300 
                               bg-gradient-to-r from-purple-500 to-pink-500 dark:from-accent-gold dark:to-accent-silver text-white dark:text-bg-primary"
                    >
                      <SmartIcon icon="🚀" size={16} className="mr-2" />Comenzar Lección
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
              <h3 className="text-2xl font-bold mb-2 flex items-center"><SmartIcon icon="🤖" size={24} className="mr-2" />Asistente AI Cripto</h3>
              <p className="text-indigo-100 dark:text-bg-secondary mb-4 transition-colors duration-300">
                ¿Tienes dudas específicas? Nuestro asistente AI está aquí 24/7 para ayudarte con cualquier pregunta sobre cripto.
              </p>
              <ul className="text-sm text-indigo-100 dark:text-bg-secondary space-y-1 transition-colors duration-300">
                <li><SmartIcon icon="✨" size={16} className="mr-2" />Respuestas personalizadas a tus preguntas</li>
                <li><SmartIcon icon="🎯" size={16} className="mr-2" />Recomendaciones de aprendizaje</li>
                <li><SmartIcon icon="🔗" size={16} className="mr-2" />Enlaces a lecciones relevantes</li>
                <li><SmartIcon icon="📊" size={16} className="mr-2" />Seguimiento de tu progreso</li>
              </ul>
            </div>
            <div className="ml-8">
              <button className="bg-white dark:bg-bg-primary text-indigo-600 dark:text-accent-gold px-8 py-4 
                               rounded-xl font-bold hover:bg-indigo-50 dark:hover:bg-bg-secondary 
                               transition-all duration-300">
                <SmartIcon icon="💬" size={16} className="mr-2" />Chatear Ahora
              </button>
            </div>
          </div>
        </div>

              {/* Progress Tracking */}
              <div className="mt-8 bg-bg-card rounded-2xl p-6 transition-colors duration-300">
                <h3 className="text-xl font-bold text-text-primary mb-4 transition-colors duration-300 flex items-center"><SmartIcon icon="📈" size={20} className="mr-2" />Tu Progreso de Aprendizaje</h3>
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
            </motion.div>
          ) : activeTab === 'create' ? (
            /* CREATE TAB - CREATOR STUDIO */
            <motion.div
              key="create-content"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {!showCreatorWizard ? (
                /* Creator Studio Home */
                <div className="space-y-8">
                  {/* Welcome Section */}
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-3xl font-bold mb-3 flex items-center gap-3">
                          <Wand2 className="w-8 h-8" />
                          Creator Studio
                        </h2>
                        <p className="text-purple-100 mb-6 max-w-2xl">
                          Crea lecciones educativas y campañas de engagement sin necesidad de programar. 
                          Usa nuestro constructor visual con drag & drop, plantillas prediseñadas y wizard paso a paso.
                        </p>
                        <div className="flex gap-4">
                          <motion.button
                            onClick={() => {
                              setCreatorWizardType('lesson');
                              setShowCreatorWizard(true);
                            }}
                            className="px-6 py-3 bg-white text-purple-600 font-bold rounded-xl 
                                     hover:bg-purple-50 transition-all shadow-lg"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <BookOpen className="inline w-5 h-5 mr-2" />
                            Crear Lección
                          </motion.button>
                          <motion.button
                            onClick={() => {
                              setCreatorWizardType('campaign');
                              setShowCreatorWizard(true);
                            }}
                            className="px-6 py-3 bg-purple-700 text-white font-bold rounded-xl 
                                     hover:bg-purple-800 transition-all shadow-lg"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Trophy className="inline w-5 h-5 mr-2" />
                            Crear Campaña
                          </motion.button>
                        </div>
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
                          <SmartIcon icon="✨" size={20} />
                        </motion.div>
                      </div>
                    </div>
                  </div>

                  {/* Templates Section */}
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                      <SmartIcon icon="🎨" size={20} className="mr-2" />Plantillas Populares
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6">
                      {getPopularTemplates().slice(0, 6).map((template) => (
                        <motion.div
                          key={template.id}
                          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl 
                                   transition-all cursor-pointer border-2 border-transparent 
                                   hover:border-purple-500"
                          whileHover={{ scale: 1.02 }}
                          onClick={() => {
                            setSelectedTemplate(template);
                            setCreatorWizardType(template.type as 'lesson' | 'campaign');
                            setShowCreatorWizard(true);
                          }}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <SmartIcon icon={template.icon} size={36} />
                            <span className={`px-3 py-1 rounded-full text-xs font-medium
                              ${template.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                template.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'}`}>
                              {template.difficulty === 'easy' ? 'Fácil' :
                               template.difficulty === 'medium' ? 'Medio' : 'Avanzado'}
                            </span>
                          </div>
                          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                            {template.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {template.description}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {template.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 
                                                       text-purple-700 dark:text-purple-300 
                                                       rounded text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Tools */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-purple-500" />
                        Constructor de Reglas
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Define condiciones de elegibilidad para tus campañas con nuestro constructor visual JsonLogic.
                      </p>
                      <RuleBuilder 
                        showPreview={false}
                        className="mt-4"
                        onChange={(rule) => console.log('Rule changed:', rule)}
                      />
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Grid3x3 className="w-5 h-5 text-purple-500" />
                        Recursos de Creación
                      </h3>
                      <ul className="space-y-3">
                        <li className="flex items-center gap-3">
                          <SmartIcon icon="📚" size={32} />
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">Guía de Mejores Prácticas</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Aprende a crear contenido efectivo</div>
                          </div>
                        </li>
                        <li className="flex items-center gap-3">
                          <SmartIcon icon="🎯" size={32} />
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">Ejemplos de Campañas Exitosas</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Inspírate con casos reales</div>
                          </div>
                        </li>
                        <li className="flex items-center gap-3">
                          <SmartIcon icon="🤖" size={32} />
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">AI Content Assistant</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Genera ideas y contenido con IA</div>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                /* Creator Wizard Active */
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
                  <CreatorWizard
                    type={creatorWizardType}
                    templateData={selectedTemplate}
                    onComplete={(data) => {
                      console.log('Content created:', data);
                      setMyCreations(prev => [...prev, data]);
                      setShowCreatorWizard(false);
                      setSelectedTemplate(null);
                      // TODO: Save to backend
                    }}
                    onCancel={() => {
                      setShowCreatorWizard(false);
                      setSelectedTemplate(null);
                    }}
                    onSaveDraft={(data) => {
                      console.log('Draft saved:', data);
                      // TODO: Save draft to backend
                    }}
                  />
                </div>
              )}
            </motion.div>
          ) : activeTab === 'my-content' ? (
            /* MY CONTENT TAB */
            <motion.div
              key="my-content"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                    <SmartIcon icon="📚" size={20} className="mr-2" />Mi Contenido
                  </h2>
                  <div className="flex gap-3">
                    <button className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg 
                                     text-gray-700 dark:text-gray-300 hover:bg-gray-200 
                                     dark:hover:bg-gray-700 transition-colors">
                      Filtrar
                    </button>
                    <button className="px-4 py-2 bg-purple-600 text-white rounded-lg 
                                     hover:bg-purple-700 transition-colors font-medium">
                      <Plus className="inline w-5 h-5 mr-2" />
                      Nuevo
                    </button>
                  </div>
                </div>
                
                {myCreations.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl">
                    <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      No tienes contenido creado aún
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Empieza creando tu primera lección o campaña
                    </p>
                    <button
                      onClick={() => setActiveTab('create')}
                      className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 
                               text-white font-bold rounded-xl hover:shadow-lg transition-all"
                    >
                      Ir a Creator Studio
                    </button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {myCreations.map((content, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                          {content.metadata?.title || 'Sin título'}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          {content.metadata?.description || 'Sin descripción'}
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            Creado hace {index + 1} días
                          </span>
                          <div className="flex gap-2">
                            <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 
                                             rounded hover:bg-blue-200 transition-colors">
                              Editar
                            </button>
                            <button className="px-3 py-1 text-sm bg-green-100 text-green-700 
                                             rounded hover:bg-green-200 transition-colors">
                              Publicar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* ANALYTICS TAB */
            <motion.div
              key="analytics-content"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
                  <SmartIcon icon="📊" size={20} className="mr-2" />Analíticas de Contenido
                </h2>
                
                {/* Metrics Overview */}
                <div className="grid md:grid-cols-4 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <Users className="w-8 h-8 text-blue-500" />
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">0</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Estudiantes Totales</p>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <TrendingUp className="w-8 h-8 text-green-500" />
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">0%</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Tasa de Finalización</p>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <Star className="w-8 h-8 text-yellow-500" />
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">--</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Calificación Promedio</p>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <Clock className="w-8 h-8 text-purple-500" />
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">0h</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Tiempo Total Visto</p>
                  </div>
                </div>
                
                {/* Empty State */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center">
                  <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    No hay datos de analíticas aún
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    Las métricas aparecerán aquí cuando publiques contenido y los estudiantes comiencen a interactuar
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 
                             text-white font-bold rounded-xl hover:shadow-lg transition-all"
                  >
                    Crear Contenido
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* LESSON MODAL WRAPPER - SISTEMA UNIFICADO */}
      <LessonModalWrapper
        lessonId={currentLessonId}
        mode="knowledge"
        isOpen={showLessonModal}
        onClose={() => {
          console.log('LESSON: Closing lesson modal in Knowledge mode');
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
                    <SmartIcon icon="🏆" size={20} className="mr-2" />Tus Logros
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