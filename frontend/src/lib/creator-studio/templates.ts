/**
 * CREATOR STUDIO - SISTEMA DE PLANTILLAS
 * Plantillas predefinidas para lecciones educativas y campañas/quests
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import { Template, LessonCreatorData, CampaignCreatorData, JsonLogicRule } from './types';

// ========== PLANTILLAS DE LECCIONES EDUCATIVAS ==========

export const LESSON_TEMPLATES: Template[] = [
  {
    id: 'crypto-basics-template',
    name: '🪙 Introducción a Criptomonedas',
    description: 'Plantilla para enseñar conceptos básicos de criptomonedas usando el patrón DO→EXPLAIN→CHECK→REINFORCE',
    category: 'lesson',
    type: 'education',
    estimatedSetupTime: 15,
    thumbnail: '/images/templates/crypto-basics.png',
    lessonTemplate: {
      metadata: {
        id: '',
        title: 'Mis Primeras Criptomonedas',
        description: 'Aprende los fundamentos de las criptomonedas de manera práctica e interactiva',
        tags: ['cripto', 'blockchain', 'básico', 'finanzas'],
        estimatedTime: 10,
        difficulty: 'beginner' as const,
        category: 'getting-started',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: '',
        status: 'draft' as const
      },
      learningObjectives: [
        'Entender qué es una criptomoneda',
        'Conocer la diferencia entre Bitcoin y altcoins',
        'Comprender el concepto de descentralización'
      ],
      prerequisites: [],
      blocks: [
        {
          type: 'do' as const,
          id: 'do-check-wallet',
          title: 'DO: Verifica tu Balance',
          duration: 90,
          instruction: 'Conecta tu wallet y verifica tu balance actual de diferentes criptomonedas',
          interactionType: 'wallet-connect' as const,
          data: {
            requiredAction: 'connect-wallet',
            supportedWallets: ['metamask', 'walletconnect']
          }
        },
        {
          type: 'explain' as const,
          id: 'explain-crypto-basics',
          title: 'EXPLAIN: ¿Qué son las Criptomonedas?',
          duration: 120,
          concept: 'Dinero Digital Descentralizado',
          explanation: 'Las criptomonedas son monedas digitales que funcionan en una red descentralizada llamada blockchain. No están controladas por bancos ni gobiernos.',
          comparison: {
            before: {
              title: 'Dinero Tradicional',
              points: [
                '🏦 Controlado por bancos centrales',
                '📄 Requiere intermediarios',
                '🌍 Limitado por fronteras',
                '⏰ Horarios bancarios restringidos'
              ]
            },
            after: {
              title: 'Criptomonedas',
              points: [
                '🔗 Red descentralizada',
                '🤝 Transacciones directas',
                '🌐 Sin fronteras geográficas',
                '⚡ Disponible 24/7'
              ]
            }
          }
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
            ],
            explanation: 'La descentralización es la característica fundamental que diferencia a las criptomonedas del dinero tradicional.'
          }
        },
        {
          type: 'reinforce' as const,
          id: 'reinforce-knowledge',
          title: 'REINFORCE: Consolida tu Conocimiento',
          duration: 30,
          summary: 'Conceptos Clave Aprendidos',
          keyPoints: [
            '🪙 Las criptomonedas son dinero digital descentralizado',
            '🔗 Funcionan en blockchain sin intermediarios',
            '🌐 Están disponibles 24/7 sin restricciones geográficas',
            '🤝 Permiten transacciones directas entre personas'
          ],
          nextSteps: 'Próximo paso: Aprende a crear tu primera wallet para guardar criptomonedas de forma segura'
        }
      ],
      patternValidation: {
        hasDoBlock: true,
        hasExplainBlock: true,
        hasCheckBlock: true,
        hasReinforceBlock: true
      },
      knowledgeSettings: {
        featured: false,
        order: 1
      },
      educationalSettings: {
        canBeUsedAsRequirement: true,
        points: 100,
        completionCriteria: {
          minTimeSpent: 180,
          requiredCorrectAnswers: 1,
          allowSkipping: false
        }
      }
    },
    previewData: {
      screenshots: ['/images/templates/crypto-basics-preview-1.png'],
      demoData: {
        estimatedCompletion: '10 minutos',
        difficulty: 'Principiante',
        topics: 4
      },
      useCase: 'Ideal para onboardear nuevos usuarios al mundo cripto'
    },
    metrics: {
      usageCount: 0,
      successRate: 0.85,
      rating: 4.7,
      tags: ['popular', 'beginner-friendly']
    }
  }
];

// ========== PLANTILLAS DE CAMPAÑAS/QUESTS ==========

export const CAMPAIGN_TEMPLATES: Template[] = [
  {
    id: 'onboard-48h-template',
    name: '🚀 Onboarding Express 48h',
    description: 'Campaña de adopción rápida con auto-return para nuevos usuarios',
    category: 'campaign',
    type: 'onboarding',
    estimatedSetupTime: 5,
    thumbnail: '/images/templates/onboard-48h.png',
    campaignTemplate: {
      metadata: {
        id: '',
        title: 'Bienvenido a CryptoGift - 48h Express',
        description: 'Únete a CryptoGift y reclama tu regalo de bienvenida en las próximas 48 horas',
        tags: ['onboarding', 'new-users', 'welcome'],
        estimatedTime: 5,
        difficulty: 'beginner' as const,
        category: 'adoption',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: '',
        status: 'draft' as const
      },
      timeWindow: {
        start: new Date(Date.now() + 24 * 60 * 60 * 1000), // Mañana
        end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // En 3 días
        graceHours: 24,
        timezone: 'UTC'
      },
      prizePool: {
        type: 'nft' as const,
        supply: 10000,
        value: 'NFT de Bienvenida + 10 USDC',
        returnUnclaimed: true,
        autoReturnAfterHours: 48
      },
      eligibility: {
        rules: {
          logic: { "==": [{ "var": "is_new_user" }, true] },
          humanReadable: 'SI es usuario nuevo ENTONCES puede reclamar',
          variables: [
            {
              name: 'is_new_user',
              type: 'boolean' as const,
              description: 'Usuario registrado en las últimas 48 horas'
            }
          ]
        },
        description: 'Solo usuarios nuevos que se registraron en las últimas 48 horas',
        requiredActions: ['register', 'verify-email']
      },
      leaderboard: {
        enabled: false
      },
      abuseProtection: {
        maxClaimsPerTBA: 1,
        maxClaimsPerIP: 5,
        rateLimit: '100/hour',
        requireWalletAge: 0,
        minBalance: '0'
      },
      publishing: {
        status: 'draft' as const,
        shareable: true,
        featured: true
      },
      analytics: {
        trackingEvents: ['onboard_start', 'onboard_complete', 'nft_claimed'],
        conversionGoals: ['completion', 'retention_7d'],
        customProperties: {
          campaign_type: 'onboarding',
          urgency: 'high'
        }
      }
    },
    previewData: {
      screenshots: ['/images/templates/onboard-preview-1.png'],
      demoData: {
        expectedParticipants: '5,000+',
        conversionRate: '25%',
        duration: '48 horas'
      },
      useCase: 'Perfecto para lanzamientos y adopción masiva rápida'
    },
    metrics: {
      usageCount: 0,
      successRate: 0.75,
      rating: 4.5,
      tags: ['high-impact', 'quick-setup']
    }
  },
  
  {
    id: 'hold-swap-7d-template',
    name: '💎 Hold 7D + 1 Swap Challenge',
    description: 'Campaña para usuarios que mantengan tokens y hagan al menos 1 swap',
    category: 'campaign',
    type: 'engagement',
    estimatedSetupTime: 8,
    thumbnail: '/images/templates/hold-swap.png',
    campaignTemplate: {
      metadata: {
        id: '',
        title: 'Desafío Diamond Hands - Hold & Swap',
        description: 'Mantén tus tokens por 7 días y haz al menos 1 swap para ganar premios exclusivos',
        tags: ['holding', 'defi', 'trading', 'loyalty'],
        estimatedTime: 10080, // 7 días en minutos
        difficulty: 'intermediate' as const,
        category: 'defi-engagement',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: '',
        status: 'draft' as const
      },
      timeWindow: {
        start: new Date(Date.now() + 24 * 60 * 60 * 1000),
        end: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8 días total
        graceHours: 48,
        timezone: 'UTC'
      },
      prizePool: {
        type: 'nft' as const,
        supply: 500,
        value: 'NFT Diamond Hands + 100 USDC',
        returnUnclaimed: true,
        autoReturnAfterHours: 48
      },
      eligibility: {
        rules: {
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
              description: 'Número de swaps realizados durante el período'
            }
          ]
        },
        description: 'Mantener tokens por 7 días consecutivos Y realizar al menos 1 swap',
        requiredActions: ['hold_tokens', 'make_swap']
      },
      leaderboard: {
        enabled: true,
        metric: 'earliestComplete' as const,
        winners: 100,
        tieBreaker: 'timestamp' as const
      },
      abuseProtection: {
        maxClaimsPerTBA: 1,
        maxClaimsPerIP: 2,
        rateLimit: '50/hour',
        requireWalletAge: 7,
        minBalance: '0.001 ETH'
      },
      publishing: {
        status: 'draft' as const,
        shareable: true,
        featured: false
      },
      analytics: {
        trackingEvents: ['challenge_start', 'day_1_hold', 'first_swap', 'challenge_complete'],
        conversionGoals: ['7_day_retention', 'increased_trading'],
        customProperties: {
          campaign_type: 'engagement',
          difficulty: 'intermediate'
        }
      }
    },
    previewData: {
      screenshots: ['/images/templates/hold-swap-preview-1.png'],
      demoData: {
        expectedParticipants: '1,500+',
        conversionRate: '15%',
        avgReward: '100 USDC'
      },
      useCase: 'Ideal para fomentar holding y actividad DeFi'
    },
    metrics: {
      usageCount: 0,
      successRate: 0.65,
      rating: 4.8,
      tags: ['defi', 'intermediate', 'high-reward']
    }
  },
  
  {
    id: 'top-referrals-72h-template',
    name: '🏆 Top Referidos 72h',
    description: 'Competencia de referidos con leaderboard y premios para los top performers',
    category: 'campaign',
    type: 'referral',
    estimatedSetupTime: 10,
    thumbnail: '/images/templates/top-referrals.png',
    campaignTemplate: {
      metadata: {
        id: '',
        title: 'Batalla de Referidos - Top 50 Ganan',
        description: 'Compite por traer más amigos a CryptoGift. Los top 50 referidores se llevan premios épicos',
        tags: ['referrals', 'competition', 'viral', 'community'],
        estimatedTime: 4320, // 72 horas
        difficulty: 'intermediate' as const,
        category: 'growth',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: '',
        status: 'draft' as const
      },
      timeWindow: {
        start: new Date(Date.now() + 24 * 60 * 60 * 1000),
        end: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 72h + 1 día prep
        graceHours: 24,
        timezone: 'UTC'
      },
      prizePool: {
        type: 'token' as const,
        supply: 50,
        value: 'Premios escalonados: 1º=1000 USDC, 2º=500 USDC, 3º-10º=200 USDC, 11º-50º=50 USDC',
        returnUnclaimed: true,
        autoReturnAfterHours: 48
      },
      eligibility: {
        rules: {
          logic: { ">=": [{ "var": "valid_referrals" }, 1] },
          humanReadable: 'SI valid_referrals ≥ 1 ENTONCES entra al leaderboard',
          variables: [
            {
              name: 'valid_referrals',
              type: 'number' as const,
              description: 'Número de referidos válidos (que completaron onboarding)'
            }
          ]
        },
        description: 'Al menos 1 referido válido para entrar al leaderboard',
        requiredActions: ['refer_users', 'confirm_signups']
      },
      leaderboard: {
        enabled: true,
        metric: 'mostPoints' as const, // Basado en número de referidos válidos
        winners: 50,
        tieBreaker: 'timestamp' as const
      },
      abuseProtection: {
        maxClaimsPerTBA: 1,
        maxClaimsPerIP: 1,
        rateLimit: '10/hour',
        requireWalletAge: 3,
        minBalance: '0.005 ETH'
      },
      publishing: {
        status: 'draft' as const,
        shareable: true,
        featured: true
      },
      analytics: {
        trackingEvents: ['ref_campaign_join', 'ref_sent', 'ref_completed', 'leaderboard_update'],
        conversionGoals: ['viral_coefficient', 'new_user_acquisition'],
        customProperties: {
          campaign_type: 'referral',
          competition: 'true'
        }
      }
    },
    previewData: {
      screenshots: ['/images/templates/referrals-preview-1.png'],
      demoData: {
        expectedParticipants: '2,000+',
        viralCoefficient: '3.5x',
        totalPrizePool: '15,000 USDC'
      },
      useCase: 'Perfecto para crecimiento viral y expansión de comunidad'
    },
    metrics: {
      usageCount: 0,
      successRate: 0.80,
      rating: 4.9,
      tags: ['viral', 'high-reward', 'competitive']
    }
  },
  
  {
    id: 'eligible-raffle-template',
    name: '🎲 Rifa con Elegibilidad',
    description: 'Sistema de rifa donde cumplir condiciones te da tickets para el sorteo',
    category: 'campaign',
    type: 'raffle',
    estimatedSetupTime: 12,
    thumbnail: '/images/templates/raffle.png',
    campaignTemplate: {
      metadata: {
        id: '',
        title: 'Rifa Épica - Gana NFTs Únicos',
        description: 'Completa misiones para ganar tickets de rifa. Más misiones = más posibilidades de ganar',
        tags: ['raffle', 'missions', 'nft', 'luck'],
        estimatedTime: 7200, // 5 días
        difficulty: 'beginner' as const,
        category: 'engagement',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: '',
        status: 'draft' as const
      },
      timeWindow: {
        start: new Date(Date.now() + 24 * 60 * 60 * 1000),
        end: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        graceHours: 12,
        timezone: 'UTC'
      },
      prizePool: {
        type: 'nft' as const,
        supply: 10,
        value: '10 NFTs únicos valorados en 500 USDC cada uno',
        returnUnclaimed: true,
        autoReturnAfterHours: 72
      },
      eligibility: {
        rules: {
          logic: {
            "or": [
              { ">=": [{ "var": "tasks_completed" }, 1] },
              { ">=": [{ "var": "social_shares" }, 3] },
              { ">=": [{ "var": "referrals_made" }, 1] }
            ]
          },
          humanReadable: 'SI tasks_completed ≥ 1 O social_shares ≥ 3 O referrals_made ≥ 1 ENTONCES obtiene tickets',
          variables: [
            {
              name: 'tasks_completed',
              type: 'number' as const,
              description: 'Número de tareas completadas'
            },
            {
              name: 'social_shares',
              type: 'number' as const,
              description: 'Veces que compartió en redes sociales'
            },
            {
              name: 'referrals_made',
              type: 'number' as const,
              description: 'Referidos exitosos realizados'
            }
          ]
        },
        description: 'Completa tareas, comparte en redes o refiere amigos para ganar tickets',
        requiredActions: ['complete_tasks', 'social_engagement', 'refer_friends']
      },
      leaderboard: {
        enabled: false // Es una rifa, no competencia directa
      },
      abuseProtection: {
        maxClaimsPerTBA: 10, // Máximo 10 tickets por persona
        maxClaimsPerIP: 15,
        rateLimit: '20/hour',
        requireWalletAge: 1,
        minBalance: '0'
      },
      publishing: {
        status: 'draft' as const,
        shareable: true,
        featured: false
      },
      analytics: {
        trackingEvents: ['raffle_join', 'ticket_earned', 'task_completed', 'raffle_drawn'],
        conversionGoals: ['engagement_increase', 'social_virality'],
        customProperties: {
          campaign_type: 'raffle',
          luck_based: 'true'
        }
      }
    },
    previewData: {
      screenshots: ['/images/templates/raffle-preview-1.png'],
      demoData: {
        expectedParticipants: '5,000+',
        ticketsPerUser: '1-10',
        prizeValue: '5,000 USDC'
      },
      useCase: 'Ideal para generar engagement diversificado y buzz social'
    },
    metrics: {
      usageCount: 0,
      successRate: 0.70,
      rating: 4.6,
      tags: ['engaging', 'social', 'beginner-friendly']
    }
  }
];

// ========== UTILIDADES PARA PLANTILLAS ==========

export const getTemplatesByCategory = (category: 'lesson' | 'campaign'): Template[] => {
  if (category === 'lesson') {
    return LESSON_TEMPLATES;
  }
  return CAMPAIGN_TEMPLATES;
};

export const getTemplateById = (templateId: string): Template | null => {
  const allTemplates = [...LESSON_TEMPLATES, ...CAMPAIGN_TEMPLATES];
  return allTemplates.find(template => template.id === templateId) || null;
};

export const getPopularTemplates = (limit: number = 6): Template[] => {
  const allTemplates = [...LESSON_TEMPLATES, ...CAMPAIGN_TEMPLATES];
  return allTemplates
    .sort((a, b) => b.metrics.usageCount - a.metrics.usageCount)
    .slice(0, limit);
};

export const getTemplatesByType = (type: string): Template[] => {
  const allTemplates = [...LESSON_TEMPLATES, ...CAMPAIGN_TEMPLATES];
  return allTemplates.filter(template => template.type === type);
};

export const searchTemplates = (query: string): Template[] => {
  const allTemplates = [...LESSON_TEMPLATES, ...CAMPAIGN_TEMPLATES];
  const searchTerm = query.toLowerCase();
  
  return allTemplates.filter(template => 
    template.name.toLowerCase().includes(searchTerm) ||
    template.description.toLowerCase().includes(searchTerm) ||
    template.metrics.tags.some(tag => tag.toLowerCase().includes(searchTerm))
  );
};

// ========== EXPORTS ==========

export default {
  LESSON_TEMPLATES,
  CAMPAIGN_TEMPLATES,
  getTemplatesByCategory,
  getTemplateById,
  getPopularTemplates,
  getTemplatesByType,
  searchTemplates
};