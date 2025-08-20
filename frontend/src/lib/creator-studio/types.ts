/**
 * CREATOR STUDIO - TIPOS BASE Y VALIDACIÓN
 * Sistema unificado para crear lecciones educativas y campañas/quests
 * Compatible con la arquitectura Knowledge ↔ Educational existente
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import { z } from 'zod';

// ========== TIPOS BASE COMUNES ==========

export const BaseMetadataSchema = z.object({
  id: z.string().min(1, 'ID es requerido'),
  title: z.string().min(1, 'Título es requerido').max(100, 'Título muy largo'),
  description: z.string().min(10, 'Descripción muy corta').max(500, 'Descripción muy larga'),
  tags: z.array(z.string()).min(1, 'Al menos un tag es requerido'),
  estimatedTime: z.number().min(1).max(180), // minutos
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  category: z.string().min(1, 'Categoría es requerida'),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  createdBy: z.string().min(1, 'Creador es requerido'),
  status: z.enum(['draft', 'published', 'archived']).default('draft')
});

export type BaseMetadata = z.infer<typeof BaseMetadataSchema>;

// ========== JSONLOGIC RULE SYSTEM ==========

export const JsonLogicRuleSchema = z.object({
  logic: z.record(z.any()), // JsonLogic rule object
  humanReadable: z.string(), // "SI holding_dias ≥ 7 Y swaps_0x ≥ 1 ENTONCES..."
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(['number', 'string', 'boolean', 'date']),
    description: z.string()
  }))
});

export type JsonLogicRule = z.infer<typeof JsonLogicRuleSchema>;

// ========== SISTEMA DE BLOQUES DE CONTENIDO ==========

export const ContentBlockSchema = z.discriminatedUnion('type', [
  // DO Block - Experiencia práctica
  z.object({
    type: z.literal('do'),
    id: z.string(),
    title: z.string(),
    duration: z.number(),
    instruction: z.string(),
    interactionType: z.enum(['qr-scan', 'wallet-connect', 'transaction', 'click-element']),
    data: z.record(z.any()) // Flexible data for different interaction types
  }),
  
  // EXPLAIN Block - Conceptos y teoría
  z.object({
    type: z.literal('explain'),
    id: z.string(),
    title: z.string(),
    duration: z.number(),
    concept: z.string(),
    explanation: z.string(),
    mediaType: z.enum(['text', 'image', 'video', 'animation']).optional(),
    mediaUrl: z.string().optional(),
    comparison: z.object({
      before: z.object({
        title: z.string(),
        points: z.array(z.string())
      }),
      after: z.object({
        title: z.string(),
        points: z.array(z.string())
      })
    }).optional(),
    features: z.array(z.object({
      icon: z.string(),
      text: z.string()
    })).optional()
  }),
  
  // CHECK Block - Verificación de aprendizaje
  z.object({
    type: z.literal('check'),
    id: z.string(),
    title: z.string(),
    duration: z.number(),
    questionType: z.enum(['multiple-choice', 'true-false', 'text-input', 'drag-drop']),
    question: z.object({
      text: z.string(),
      options: z.array(z.object({
        text: z.string(),
        isCorrect: z.boolean(),
        feedback: z.string().optional()
      })).min(2),
      explanation: z.string().optional()
    })
  }),
  
  // REINFORCE Block - Consolidación
  z.object({
    type: z.literal('reinforce'),
    id: z.string(),
    title: z.string(),
    duration: z.number(),
    summary: z.string(),
    keyPoints: z.array(z.string()),
    nextSteps: z.string(),
    achievementUnlocked: z.string().optional()
  })
]);

export type ContentBlock = z.infer<typeof ContentBlockSchema>;

// ========== SISTEMA DE LECCIONES ==========

export const LessonCreatorDataSchema = z.object({
  metadata: BaseMetadataSchema,
  learningObjectives: z.array(z.string()).min(1, 'Al menos un objetivo de aprendizaje'),
  prerequisites: z.array(z.string()).default([]),
  blocks: z.array(ContentBlockSchema).min(4, 'Mínimo 4 bloques (DO-EXPLAIN-CHECK-REINFORCE)'),
  
  // Validación del patrón DO → EXPLAIN → CHECK → REINFORCE
  patternValidation: z.object({
    hasDoBlock: z.boolean(),
    hasExplainBlock: z.boolean(),
    hasCheckBlock: z.boolean(),
    hasReinforceBlock: z.boolean()
  }).refine(
    (data) => data.hasDoBlock && data.hasExplainBlock && data.hasCheckBlock && data.hasReinforceBlock,
    { message: 'Debe incluir al menos un bloque de cada tipo: DO, EXPLAIN, CHECK, REINFORCE' }
  ),
  
  // Configuración para Knowledge Academy
  knowledgeSettings: z.object({
    thumbnailUrl: z.string().optional(),
    featured: z.boolean().default(false),
    order: z.number().default(0)
  }),
  
  // Configuración para Educational Requirements
  educationalSettings: z.object({
    canBeUsedAsRequirement: z.boolean().default(true),
    points: z.number().min(0).default(100),
    completionCriteria: z.object({
      minTimeSpent: z.number().default(60), // segundos
      requiredCorrectAnswers: z.number().min(0).default(0),
      allowSkipping: z.boolean().default(false)
    })
  })
});

export type LessonCreatorData = z.infer<typeof LessonCreatorDataSchema>;

// ========== SISTEMA DE CAMPAÑAS/QUESTS ==========

export const CampaignCreatorDataSchema = z.object({
  metadata: BaseMetadataSchema,
  
  // Configuración de tiempo
  timeWindow: z.object({
    start: z.date(),
    end: z.date(),
    graceHours: z.number().min(0).max(72).default(24),
    timezone: z.string().default('UTC')
  }).refine(
    (data) => data.end > data.start,
    { message: 'La fecha de fin debe ser posterior a la fecha de inicio' }
  ),
  
  // Pool de premios
  prizePool: z.object({
    type: z.enum(['nft', 'token', 'points', 'badge']),
    supply: z.number().min(1),
    value: z.string().optional(), // "100 USDC", "1 NFT especial"
    escrowAddress: z.string().optional(),
    returnUnclaimed: z.boolean().default(true),
    autoReturnAfterHours: z.number().default(48)
  }),
  
  // Reglas de elegibilidad (JsonLogic)
  eligibility: z.object({
    rules: JsonLogicRuleSchema,
    description: z.string(), // Descripción humana de las reglas
    requiredActions: z.array(z.string()) // ["hold_tokens", "make_swap", "invite_friends"]
  }),
  
  // Sistema de leaderboard (opcional)
  leaderboard: z.object({
    enabled: z.boolean().default(false),
    metric: z.enum(['earliestComplete', 'mostPoints', 'bestPerformance']).default('earliestComplete'),
    winners: z.number().min(1).default(1),
    tieBreaker: z.enum(['timestamp', 'random']).default('timestamp')
  }).optional(),
  
  // Anti-abuse y límites
  abuseProtection: z.object({
    maxClaimsPerTBA: z.number().min(1).default(1),
    maxClaimsPerIP: z.number().min(1).default(3),
    rateLimit: z.string().default('60/min'), // "60/min", "100/hour"
    requireWalletAge: z.number().default(0), // días
    minBalance: z.string().default('0') // "0.001 ETH"
  }),
  
  // Configuración de publicación
  publishing: z.object({
    status: z.enum(['draft', 'live', 'paused', 'ended']).default('draft'),
    deeplink: z.string().optional(),
    qrCode: z.string().optional(), // URL to QR image
    shareable: z.boolean().default(true),
    featured: z.boolean().default(false)
  }),
  
  // Analytics y tracking
  analytics: z.object({
    trackingEvents: z.array(z.string()).default(['campaign_view', 'campaign_start', 'campaign_complete']),
    conversionGoals: z.array(z.string()).default(['completion']),
    customProperties: z.record(z.string()).default({})
  })
});

export type CampaignCreatorData = z.infer<typeof CampaignCreatorDataSchema>;

// ========== SISTEMA DE PLANTILLAS ==========

export const TemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(['lesson', 'campaign']),
  type: z.string(), // "onboarding", "referral", "education", etc.
  thumbnail: z.string().optional(),
  estimatedSetupTime: z.number(), // minutos
  
  // Template data
  lessonTemplate: LessonCreatorDataSchema.optional(),
  campaignTemplate: CampaignCreatorDataSchema.optional(),
  
  // Preview data for empty states
  previewData: z.object({
    screenshots: z.array(z.string()),
    demoData: z.record(z.any()),
    useCase: z.string()
  }),
  
  // Popularity metrics
  metrics: z.object({
    usageCount: z.number().default(0),
    successRate: z.number().default(0),
    rating: z.number().min(0).max(5).default(0),
    tags: z.array(z.string()).default([])
  })
});

export type Template = z.infer<typeof TemplateSchema>;

// ========== WIZARD STATE MANAGEMENT ==========

export const WizardStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  completed: z.boolean().default(false),
  optional: z.boolean().default(false),
  estimatedTime: z.number(), // minutos
  validationSchema: z.any().optional() // Zod schema for this step
});

export type WizardStep = z.infer<typeof WizardStepSchema>;

export const WizardStateSchema = z.object({
  currentStep: z.number().default(0),
  steps: z.array(WizardStepSchema),
  data: z.record(z.any()).default({}),
  errors: z.record(z.array(z.string())).default({}),
  touched: z.record(z.boolean()).default({}),
  canProceed: z.boolean().default(false),
  isCompleted: z.boolean().default(false),
  savedAt: z.date().optional()
});

export type WizardState = z.infer<typeof WizardStateSchema>;

// ========== UTILIDADES DE VALIDACIÓN ==========

export const validateLessonPattern = (blocks: ContentBlock[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  const hasDoBlock = blocks.some(block => block.type === 'do');
  const hasExplainBlock = blocks.some(block => block.type === 'explain');
  const hasCheckBlock = blocks.some(block => block.type === 'check');
  const hasReinforceBlock = blocks.some(block => block.type === 'reinforce');
  
  if (!hasDoBlock) errors.push('Falta bloque DO (experiencia práctica)');
  if (!hasExplainBlock) errors.push('Falta bloque EXPLAIN (conceptos)');
  if (!hasCheckBlock) errors.push('Falta bloque CHECK (verificación)');
  if (!hasReinforceBlock) errors.push('Falta bloque REINFORCE (consolidación)');
  
  // Verificar orden recomendado
  const doIndex = blocks.findIndex(block => block.type === 'do');
  const explainIndex = blocks.findIndex(block => block.type === 'explain');
  const checkIndex = blocks.findIndex(block => block.type === 'check');
  const reinforceIndex = blocks.findIndex(block => block.type === 'reinforce');
  
  if (doIndex > explainIndex && explainIndex !== -1) {
    errors.push('Recomendado: bloque DO antes que EXPLAIN');
  }
  
  if (checkIndex < explainIndex && checkIndex !== -1) {
    errors.push('Recomendado: bloque CHECK después de EXPLAIN');
  }
  
  if (reinforceIndex !== blocks.length - 1 && reinforceIndex !== -1) {
    errors.push('Recomendado: bloque REINFORCE al final');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ========== CONSTANTES ==========

export const CREATOR_STUDIO_ROUTES = {
  DASHBOARD: '/creator',
  NEW_LESSON: '/creator/lesson/new',
  NEW_CAMPAIGN: '/creator/campaign/new',
  TEMPLATES: '/creator/templates',
  MY_CREATIONS: '/creator/my-creations',
  ANALYTICS: '/creator/analytics'
} as const;

export const DEFAULT_DURATION = {
  DO: 90,      // 1.5 minutos - experiencia práctica
  EXPLAIN: 120, // 2 minutos - explicación de conceptos
  CHECK: 60,   // 1 minuto - verificación
  REINFORCE: 30 // 30 segundos - consolidación
} as const;

export const INTERACTION_TYPES = {
  QR_SCAN: 'qr-scan',
  WALLET_CONNECT: 'wallet-connect',
  TRANSACTION: 'transaction',
  CLICK_ELEMENT: 'click-element'
} as const;

// ========== EXPORTS ==========

export * from './validation';
export * from './templates';
export * from './utils';