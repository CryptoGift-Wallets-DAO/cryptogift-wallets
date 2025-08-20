/**
 * CREATOR STUDIO - SISTEMA DE PLANTILLAS
 * Plantillas predefinidas para lecciones educativas y campañas/quests
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import { Template, LessonCreatorData, CampaignCreatorData } from './types';

// ========== PLANTILLAS DE LECCIONES EDUCATIVAS ==========

export const LESSON_TEMPLATES: Template[] = [
  {
    id: 'crypto-basics-template',
    type: 'lesson',
    name: '🪙 Introducción a Criptomonedas',
    description: 'Plantilla para enseñar conceptos básicos de criptomonedas usando el patrón DO→EXPLAIN→CHECK→REINFORCE',
    icon: '🪙',
    category: 'getting-started',
    difficulty: 'easy',
    estimatedTime: 15,
    popularity: 85,
    tags: ['cripto', 'blockchain', 'básico', 'finanzas'],
    data: {
      metadata: {
        id: '',
        title: 'Mis Primeras Criptomonedas',
        description: 'Aprende los fundamentos de las criptomonedas de manera práctica e interactiva',
        tags: ['cripto', 'blockchain', 'básico', 'finanzas'],
        createdAt: new Date(),
        updatedAt: new Date(),
        author: '',
        version: 1,
        category: 'getting-started',
        difficulty: 'easy',
        estimatedTime: 10,
        language: 'es'
      },
      learningObjectives: [
        'Entender qué es una criptomoneda',
        'Conocer la diferencia entre Bitcoin y altcoins',
        'Comprender el concepto de descentralización'
      ],
      prerequisites: [],
      contentBlocks: [
        {
          type: 'do' as const,
          id: 'do-check-wallet',
          title: 'DO: Verifica tu Balance',
          duration: 90,
          instruction: 'Conecta tu wallet y verifica tu balance actual de diferentes criptomonedas',
          interactionType: 'wallet-connect' as const,
          data: {
            parameters: {
              requiredAction: 'connect-wallet',
              supportedWallets: ['metamask', 'walletconnect']
            }
          }
        },
        {
          type: 'explain' as const,
          id: 'explain-crypto-basics',
          title: 'EXPLAIN: ¿Qué son las Criptomonedas?',
          duration: 120,
          concept: 'Dinero Digital Descentralizado',
          explanation: 'Las criptomonedas son monedas digitales que funcionan en una red descentralizada llamada blockchain. No están controladas por bancos ni gobiernos.',
          analogies: [
            'Como el email revolucionó el correo, las criptomonedas revolucionan el dinero'
          ]
        },
        {
          type: 'check' as const,
          id: 'check-understanding',
          title: 'CHECK: Verifica tu Aprendizaje',
          duration: 60,
          questionType: 'multiple-choice' as const,
          question: {
            text: '¿Cuál es la principal característica de las criptomonedas?',
            options: [
              { text: 'Son más baratas que el dinero tradicional', isCorrect: false },
              { text: 'Funcionan en una red descentralizada sin intermediarios', isCorrect: true },
              { text: 'Solo se pueden usar en internet', isCorrect: false },
              { text: 'Las controla el gobierno', isCorrect: false }
            ]
          }
        },
        {
          type: 'reinforce' as const,
          id: 'reinforce-knowledge',
          title: 'REINFORCE: Lo que Aprendiste',
          duration: 60,
          summary: 'Has aprendido los conceptos básicos de las criptomonedas',
          keyPoints: [
            'Las criptomonedas son descentralizadas',
            'No requieren intermediarios bancarios',
            'Funcionan 24/7 sin fronteras'
          ],
          nextSteps: 'Continúa con la lección sobre wallets digitales'
        }
      ],
      assessments: [],
      gamification: {
        pointsEnabled: true,
        pointsPerCompletion: 100,
        badgesEnabled: true,
        badges: [],
        leaderboardEnabled: false,
        streakTracking: true
      },
      knowledgeSettings: {
        autoRegister: true,
        availableInEducational: true,
        prerequisiteLessons: [],
        nextLessons: [],
        relatedLessons: [],
        certificateEnabled: false
      }
    } as Partial<LessonCreatorData>,
    preview: {
      images: ['/images/templates/crypto-basics-preview.png']
    }
  }
];

// ========== PLANTILLAS DE CAMPAÑAS/QUESTS ==========

export const CAMPAIGN_TEMPLATES: Template[] = [
  {
    id: 'onboard-48h-template',
    type: 'campaign',
    name: '🚀 Onboarding Express 48h',
    description: 'Campaña de adopción rápida con auto-return para nuevos usuarios',
    icon: '🚀',
    category: 'acquisition',
    difficulty: 'easy',
    estimatedTime: 5,
    popularity: 92,
    tags: ['onboarding', 'new-users', 'welcome'],
    data: {
      metadata: {
        id: '',
        title: 'Bienvenido a CryptoGift - 48h Express',
        description: 'Únete a CryptoGift y reclama tu regalo de bienvenida en las próximas 48 horas',
        tags: ['onboarding', 'new-users', 'welcome'],
        createdAt: new Date(),
        updatedAt: new Date(),
        author: '',
        version: 1,
        type: 'acquisition',
        priority: 'high',
        status: 'draft',
        targetAudience: ['new-users']
      },
      prizes: {
        totalValue: 10000,
        currency: 'USDC',
        distribution: {
          type: 'fixed',
          winners: 10000
        },
        claimMethod: 'automatic'
      },
      eligibilityRules: [
        {
          logic: { "==": [{ "var": "is_new_user" }, true] },
          humanReadable: 'SI es usuario nuevo ENTONCES puede reclamar',
          variables: [
            {
              name: 'is_new_user',
              type: 'boolean' as const,
              description: 'Usuario registrado en las últimas 48 horas'
            }
          ]
        }
      ],
      timeWindow: {
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        timezone: 'UTC'
      },
      antiAbuseSettings: {
        enabled: true,
        maxEntriesPerUser: 1,
        requireVerification: true,
        verificationType: 'email',
        suspiciousActivityDetection: true
      },
      trackingSettings: {
        analyticsEnabled: true,
        events: [
          { name: 'onboard_start', description: 'Usuario inicia onboarding' },
          { name: 'onboard_complete', description: 'Usuario completa onboarding' }
        ],
        reportingFrequency: 'realtime'
      }
    } as Partial<CampaignCreatorData>,
    preview: {
      images: ['/images/templates/onboard-preview.png']
    }
  },
  
  {
    id: 'hold-swap-7d-template',
    type: 'campaign',
    name: '💎 Hold 7D + 1 Swap Challenge',
    description: 'Campaña para usuarios que mantengan tokens y hagan al menos 1 swap',
    icon: '💎',
    category: 'retention',
    difficulty: 'medium',
    estimatedTime: 8,
    popularity: 78,
    tags: ['holding', 'defi', 'trading', 'loyalty'],
    data: {
      metadata: {
        id: '',
        title: 'Desafío Diamond Hands - Hold & Swap',
        description: 'Mantén tus tokens por 7 días y haz al menos 1 swap para ganar premios exclusivos',
        tags: ['holding', 'defi', 'trading', 'loyalty'],
        createdAt: new Date(),
        updatedAt: new Date(),
        author: '',
        version: 1,
        type: 'retention',
        priority: 'medium',
        status: 'draft',
        targetAudience: ['holders', 'traders']
      },
      prizes: {
        totalValue: 50000,
        currency: 'USDC',
        distribution: {
          type: 'tiered',
          tiers: [
            { rank: 'Top 10', amount: 1000, quantity: 10 },
            { rank: 'Top 50', amount: 500, quantity: 40 },
            { rank: 'Top 100', amount: 250, quantity: 50 }
          ]
        },
        claimMethod: 'manual',
        claimDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
      },
      eligibilityRules: [
        {
          logic: {
            "and": [
              { ">=": [{ "var": "holding_days" }, 7] },
              { ">=": [{ "var": "swaps_count" }, 1] }
            ]
          },
          humanReadable: 'SI holding_days ≥ 7 Y swaps_count ≥ 1 ENTONCES elegible para claim',
          variables: [
            {
              name: 'holding_days',
              type: 'number' as const,
              description: 'Días consecutivos manteniendo tokens'
            },
            {
              name: 'swaps_count',
              type: 'number' as const,
              description: 'Número de swaps realizados'
            }
          ]
        }
      ],
      timeWindow: {
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        timezone: 'UTC'
      },
      antiAbuseSettings: {
        enabled: true,
        maxEntriesPerUser: 1,
        cooldownPeriod: 24,
        requireVerification: false,
        walletAgeMinimum: 7,
        minimumBalance: 100
      },
      trackingSettings: {
        analyticsEnabled: true,
        events: [
          { name: 'hold_start', description: 'Inicia período de holding' },
          { name: 'swap_completed', description: 'Completa swap requerido' },
          { name: 'claim_prize', description: 'Reclama premio' }
        ],
        reportingFrequency: 'daily'
      }
    } as Partial<CampaignCreatorData>,
    preview: {
      images: ['/images/templates/hold-swap-preview.png']
    }
  },
  
  {
    id: 'referral-contest-template',
    type: 'campaign',
    name: '🌟 Top 10 Referrals Contest',
    description: 'Competencia para los mejores referidores con premios escalonados',
    icon: '🌟',
    category: 'referral',
    difficulty: 'medium',
    estimatedTime: 10,
    popularity: 88,
    tags: ['referral', 'competition', 'social', 'growth'],
    data: {
      metadata: {
        id: '',
        title: 'Contest de Referidos - Top 10 Ganan',
        description: 'Refiere amigos y compite por premios increíbles. Los top 10 referidores ganan.',
        tags: ['referral', 'competition', 'social', 'growth'],
        createdAt: new Date(),
        updatedAt: new Date(),
        author: '',
        version: 1,
        type: 'referral',
        priority: 'high',
        status: 'draft',
        targetAudience: ['influencers', 'community-leaders']
      },
      prizes: {
        totalValue: 100000,
        currency: 'USDC',
        distribution: {
          type: 'tiered',
          tiers: [
            { rank: '1st', amount: 25000, quantity: 1 },
            { rank: '2nd', amount: 15000, quantity: 1 },
            { rank: '3rd', amount: 10000, quantity: 1 },
            { rank: '4-10', amount: 7142, quantity: 7 }
          ]
        },
        claimMethod: 'automatic'
      },
      eligibilityRules: [
        {
          logic: { ">=": [{ "var": "valid_referrals" }, 3] },
          humanReadable: 'SI valid_referrals ≥ 3 ENTONCES elegible para competir',
          variables: [
            {
              name: 'valid_referrals',
              type: 'number' as const,
              description: 'Número de referidos válidos (verificados)'
            }
          ]
        }
      ],
      timeWindow: {
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        timezone: 'UTC'
      },
      antiAbuseSettings: {
        enabled: true,
        maxEntriesPerUser: 1,
        requireVerification: true,
        verificationType: 'social',
        ipRestrictions: {
          enabled: true,
          maxPerIp: 3
        },
        suspiciousActivityDetection: true
      },
      trackingSettings: {
        analyticsEnabled: true,
        events: [
          { name: 'referral_link_created', description: 'Link de referido creado' },
          { name: 'referral_click', description: 'Click en link de referido' },
          { name: 'referral_conversion', description: 'Referido convertido' }
        ],
        reportingFrequency: 'hourly'
      }
    } as Partial<CampaignCreatorData>,
    preview: {
      images: ['/images/templates/referral-preview.png']
    }
  },
  
  {
    id: 'daily-engagement-template',
    type: 'campaign',
    name: '🎁 Daily Rewards 30D',
    description: 'Sistema de recompensas diarias para mantener engagement',
    icon: '🎁',
    category: 'engagement',
    difficulty: 'easy',
    estimatedTime: 5,
    popularity: 75,
    tags: ['daily', 'retention', 'rewards', 'streak'],
    data: {
      metadata: {
        id: '',
        title: 'Recompensas Diarias - 30 Días',
        description: 'Reclama recompensas diarias y construye tu racha de 30 días',
        tags: ['daily', 'retention', 'rewards', 'streak'],
        createdAt: new Date(),
        updatedAt: new Date(),
        author: '',
        version: 1,
        type: 'engagement',
        priority: 'medium',
        status: 'draft',
        targetAudience: ['active-users']
      },
      prizes: {
        totalValue: 30000,
        currency: 'POINTS',
        distribution: {
          type: 'fixed',
          winners: 10000
        },
        claimMethod: 'milestone'
      },
      eligibilityRules: [
        {
          logic: { "==": [{ "var": "daily_check_in" }, true] },
          humanReadable: 'SI daily_check_in ENTONCES recibe recompensa',
          variables: [
            {
              name: 'daily_check_in',
              type: 'boolean' as const,
              description: 'Completó check-in diario'
            }
          ]
        }
      ],
      timeWindow: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        timezone: 'UTC',
        recurring: {
          enabled: true,
          pattern: 'daily',
          endAfter: 30
        }
      },
      antiAbuseSettings: {
        enabled: true,
        maxEntriesPerUser: 30,
        cooldownPeriod: 23,
        requireVerification: false
      },
      trackingSettings: {
        analyticsEnabled: true,
        events: [
          { name: 'daily_checkin', description: 'Check-in diario completado' },
          { name: 'streak_milestone', description: 'Milestone de racha alcanzado', points: 100 }
        ],
        reportingFrequency: 'daily'
      }
    } as Partial<CampaignCreatorData>,
    preview: {
      images: ['/images/templates/daily-rewards-preview.png']
    }
  }
];

// ========== FUNCIONES HELPER ==========

/**
 * Obtiene todas las plantillas disponibles
 */
export const getAllTemplates = (): Template[] => {
  return [...LESSON_TEMPLATES, ...CAMPAIGN_TEMPLATES];
};

/**
 * Obtiene plantillas por tipo
 */
export const getTemplatesByType = (type: 'lesson' | 'campaign'): Template[] => {
  return type === 'lesson' ? LESSON_TEMPLATES : CAMPAIGN_TEMPLATES;
};

/**
 * Obtiene una plantilla por ID
 */
export const getTemplateById = (id: string): Template | undefined => {
  return getAllTemplates().find(template => template.id === id);
};

/**
 * Obtiene plantillas populares (popularity > 80)
 */
export const getPopularTemplates = (): Template[] => {
  return getAllTemplates()
    .filter(template => template.popularity > 80)
    .sort((a, b) => b.popularity - a.popularity);
};

/**
 * Obtiene plantillas por categoría
 */
export const getTemplatesByCategory = (category: string): Template[] => {
  return getAllTemplates().filter(template => template.category === category);
};

/**
 * Obtiene plantillas por dificultad
 */
export const getTemplatesByDifficulty = (difficulty: 'easy' | 'medium' | 'hard'): Template[] => {
  return getAllTemplates().filter(template => template.difficulty === difficulty);
};

/**
 * Busca plantillas por tags
 */
export const searchTemplatesByTags = (tags: string[]): Template[] => {
  return getAllTemplates().filter(template => 
    tags.some(tag => template.tags.includes(tag))
  );
};

/**
 * Obtiene plantillas recomendadas basadas en el contexto
 */
export const getRecommendedTemplates = (context: {
  userLevel?: 'beginner' | 'intermediate' | 'advanced';
  goal?: 'education' | 'engagement' | 'acquisition' | 'retention';
  timeAvailable?: number; // minutos
}): Template[] => {
  let templates = getAllTemplates();
  
  // Filtrar por nivel de usuario
  if (context.userLevel) {
    const difficultyMap = {
      'beginner': 'easy',
      'intermediate': 'medium',
      'advanced': 'hard'
    };
    templates = templates.filter(t => t.difficulty === difficultyMap[context.userLevel as keyof typeof difficultyMap]);
  }
  
  // Filtrar por objetivo
  if (context.goal) {
    templates = templates.filter(t => t.category.includes(context.goal));
  }
  
  // Filtrar por tiempo disponible
  if (context.timeAvailable) {
    templates = templates.filter(t => t.estimatedTime <= context.timeAvailable);
  }
  
  // Ordenar por popularidad
  return templates.sort((a, b) => b.popularity - a.popularity).slice(0, 5);
};

// ========== EXPORTS ==========

export default {
  LESSON_TEMPLATES,
  CAMPAIGN_TEMPLATES,
  getAllTemplates,
  getTemplatesByType,
  getTemplateById,
  getPopularTemplates,
  getTemplatesByCategory,
  getTemplatesByDifficulty,
  searchTemplatesByTags,
  getRecommendedTemplates
};