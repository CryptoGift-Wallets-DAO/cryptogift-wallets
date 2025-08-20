/**
 * CREATOR STUDIO - TYPES
 * TypeScript types and interfaces for the Creator Studio system
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

// ========== TIPOS BASE COMUNES ==========

export interface BaseMetadata {
  id: string;
  title: string;
  description: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  author: string;
  version: number;
}

// ========== TIPOS PARA LECCIONES ==========

export interface LessonMetadata extends BaseMetadata {
  category: 'getting-started' | 'platform-guide' | 'advanced-crypto' | 'security' | 'sales-masterclass';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number; // minutos
  language: string;
  thumbnailUrl?: string;
}

export type ContentBlockType = 'do' | 'explain' | 'check' | 'reinforce';

export interface BaseContentBlock {
  id: string;
  type: ContentBlockType;
  title: string;
  duration: number; // segundos
}

export interface DoBlock extends BaseContentBlock {
  type: 'do';
  instruction: string;
  interactionType: 'wallet-connect' | 'qr-scan' | 'transaction' | 'nft-create' | 'custom';
  data: {
    endpoint?: string;
    parameters?: Record<string, any>;
    expectedResult?: any;
  };
}

export interface ExplainBlock extends BaseContentBlock {
  type: 'explain';
  concept: string;
  explanation: string;
  visuals?: {
    type: 'image' | 'video' | 'animation' | 'diagram';
    url: string;
    alt: string;
  }[];
  analogies?: string[];
}

export interface CheckBlock extends BaseContentBlock {
  type: 'check';
  questionType: 'multiple-choice' | 'true-false' | 'drag-drop' | 'fill-blank';
  question: {
    text: string;
    options?: Array<{
      text: string;
      isCorrect: boolean;
      feedback?: string;
    }>;
    correctAnswer?: string;
  };
  hints?: string[];
}

export interface ReinforceBlock extends BaseContentBlock {
  type: 'reinforce';
  summary: string;
  keyPoints: string[];
  achievement?: {
    name: string;
    icon: string;
    points: number;
  };
  nextSteps: string;
  shareTemplate?: string;
}

export type ContentBlock = DoBlock | ExplainBlock | CheckBlock | ReinforceBlock;

export interface Assessment {
  id: string;
  type: 'quiz' | 'practice' | 'project';
  title: string;
  questions: Array<{
    id: string;
    type: 'multiple-choice' | 'true-false' | 'open-ended';
    question: string;
    options?: string[];
    correctAnswer?: string | number;
    explanation?: string;
    points: number;
  }>;
  passingScore: number; // percentage
  timeLimit?: number; // minutos
}

export interface GamificationSettings {
  pointsEnabled: boolean;
  pointsPerCompletion: number;
  badgesEnabled: boolean;
  badges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    criteria: string;
  }>;
  leaderboardEnabled: boolean;
  streakTracking: boolean;
}

export interface KnowledgeSettings {
  autoRegister: boolean;
  availableInEducational: boolean;
  prerequisiteLessons: string[];
  nextLessons: string[];
  relatedLessons: string[];
  certificateEnabled: boolean;
  certificateTemplate?: string;
  thumbnailUrl?: string;
}

export interface LessonCreatorData {
  metadata: LessonMetadata;
  learningObjectives: string[];
  prerequisites: string[];
  contentBlocks: ContentBlock[];
  assessments: Assessment[];
  gamification: GamificationSettings;
  knowledgeSettings: KnowledgeSettings;
}

// ========== TIPOS PARA CAMPAÑAS ==========

export interface CampaignMetadata extends BaseMetadata {
  type: 'referral' | 'engagement' | 'retention' | 'acquisition' | 'special';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  targetAudience: string[];
  budget?: number;
}

export interface PrizePool {
  totalValue: number;
  currency: 'USDC' | 'ETH' | 'NFT' | 'POINTS';
  distribution: {
    type: 'fixed' | 'percentage' | 'tiered' | 'lottery';
    tiers?: Array<{
      rank: string;
      amount: number;
      quantity: number;
    }>;
    winners?: number;
  };
  claimMethod: 'automatic' | 'manual' | 'milestone';
  claimDeadline?: Date;
}

export interface JsonLogicRule {
  logic: any; // JsonLogic rule object
  humanReadable: string;
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    description: string;
  }>;
}

export interface TimeWindow {
  startDate: Date;
  endDate: Date;
  timezone: string;
  recurring?: {
    enabled: boolean;
    pattern: 'daily' | 'weekly' | 'monthly';
    endAfter?: number; // occurrences
  };
  blackoutPeriods?: Array<{
    start: Date;
    end: Date;
    reason: string;
  }>;
}

export interface AntiAbuseSettings {
  enabled: boolean;
  maxEntriesPerUser: number;
  cooldownPeriod?: number; // hours
  requireVerification: boolean;
  verificationType?: 'email' | 'phone' | 'kyc' | 'social';
  ipRestrictions?: {
    enabled: boolean;
    maxPerIp: number;
    blockedCountries?: string[];
  };
  walletAgeMinimum?: number; // days
  minimumBalance?: number;
  suspiciousActivityDetection: boolean;
}

export interface TrackingSettings {
  analyticsEnabled: boolean;
  events: Array<{
    name: string;
    description: string;
    points?: number;
  }>;
  customMetrics?: Record<string, any>;
  reportingFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  webhooks?: Array<{
    url: string;
    events: string[];
    secret?: string;
  }>;
}

export interface CampaignCreatorData {
  metadata: CampaignMetadata;
  prizes: PrizePool;
  eligibilityRules: JsonLogicRule[];
  timeWindow: TimeWindow;
  antiAbuseSettings: AntiAbuseSettings;
  trackingSettings: TrackingSettings;
}

// ========== TIPOS PARA TEMPLATES ==========

export interface Template {
  id: string;
  type: 'lesson' | 'campaign';
  name: string;
  description: string;
  icon: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number; // minutos
  popularity: number; // 0-100
  tags: string[];
  data: Partial<LessonCreatorData | CampaignCreatorData>;
  preview?: {
    images: string[];
    demoUrl?: string;
  };
}

// ========== WIZARD TYPES ==========

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  optional: boolean;
  estimatedTime: number; // minutos
  validationSchema?: any; // Schema de validación
}

export interface WizardState {
  currentStep: number;
  steps: WizardStep[];
  data: Record<string, any>;
  errors: Record<string, string[]>;
  touched: Record<string, boolean>;
  canProceed: boolean;
  isCompleted: boolean;
  savedAt?: Date;
}

// ========== CONSTANTES ==========

export const LESSON_CATEGORIES = [
  'getting-started',
  'platform-guide', 
  'advanced-crypto',
  'security',
  'sales-masterclass'
] as const;

export const CAMPAIGN_TYPES = [
  'referral',
  'engagement',
  'retention',
  'acquisition',
  'special'
] as const;

export const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'] as const;

export const INTERACTION_TYPES = [
  'wallet-connect',
  'qr-scan',
  'transaction',
  'nft-create',
  'custom'
] as const;

export const QUESTION_TYPES = [
  'multiple-choice',
  'true-false',
  'drag-drop',
  'fill-blank'
] as const;

export const DEFAULT_DURATION = {
  DO: 180, // 3 minutos
  EXPLAIN: 180, // 3 minutos
  CHECK: 120, // 2 minutos
  REINFORCE: 60 // 1 minuto
};

export const MAX_LESSON_DURATION = 900; // 15 minutos
export const MIN_LESSON_DURATION = 300; // 5 minutos

export const DEFAULT_GAMIFICATION: GamificationSettings = {
  pointsEnabled: true,
  pointsPerCompletion: 100,
  badgesEnabled: true,
  badges: [],
  leaderboardEnabled: false,
  streakTracking: true
};

export const DEFAULT_KNOWLEDGE_SETTINGS: KnowledgeSettings = {
  autoRegister: true,
  availableInEducational: false,
  prerequisiteLessons: [],
  nextLessons: [],
  relatedLessons: [],
  certificateEnabled: false
};