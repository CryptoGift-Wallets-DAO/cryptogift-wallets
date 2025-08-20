/**
 * CREATOR STUDIO - UTILIDADES
 * Funciones helper para el sistema de creación
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import { 
  LessonCreatorData, 
  CampaignCreatorData, 
  ContentBlock, 
  JsonLogicRule,
  WizardState,
  Template,
  DEFAULT_DURATION
} from './types';

// ========== GENERADORES DE ID ==========

export const generateId = (prefix: string = ''): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${prefix}${prefix ? '_' : ''}${timestamp}_${randomStr}`;
};

export const generateLessonId = (title: string): string => {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30);
  return `lesson_${slug}_${generateId()}`;
};

export const generateCampaignId = (title: string): string => {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30);
  return `campaign_${slug}_${generateId()}`;
};

// ========== MANIPULACIÓN DE BLOQUES ==========

export const createEmptyBlock = (type: ContentBlock['type']): ContentBlock => {
  const baseBlock = {
    id: generateId(`block_${type}`),
    title: `${type.toUpperCase()}: `,
    duration: DEFAULT_DURATION[type.toUpperCase() as keyof typeof DEFAULT_DURATION] || 60
  };

  switch (type) {
    case 'do':
      return {
        ...baseBlock,
        type: 'do',
        instruction: '',
        interactionType: 'wallet-connect',
        data: {}
      };
      
    case 'explain':
      return {
        ...baseBlock,
        type: 'explain',
        concept: '',
        explanation: ''
      };
      
    case 'check':
      return {
        ...baseBlock,
        type: 'check',
        questionType: 'multiple-choice',
        question: {
          text: '',
          options: [
            { text: '', isCorrect: false },
            { text: '', isCorrect: true }
          ]
        }
      };
      
    case 'reinforce':
      return {
        ...baseBlock,
        type: 'reinforce',
        summary: '',
        keyPoints: [''],
        nextSteps: ''
      };
      
    default:
      throw new Error(`Tipo de bloque no soportado: ${type}`);
  }
};

export const duplicateBlock = (block: ContentBlock): ContentBlock => {
  return {
    ...block,
    id: generateId(`block_${block.type}`),
    title: `${block.title} (Copia)`
  };
};

export const reorderBlocks = (blocks: ContentBlock[], fromIndex: number, toIndex: number): ContentBlock[] => {
  const result = Array.from(blocks);
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
};

// ========== CÁLCULOS DE DURACIÓN ==========

export const calculateTotalDuration = (blocks: ContentBlock[]): number => {
  return blocks.reduce((total, block) => total + block.duration, 0);
};

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
};

export const estimateReadingTime = (text: string): number => {
  // Promedio de 200 palabras por minuto
  const wordsPerMinute = 200;
  const wordCount = text.trim().split(/\s+/).length;
  return Math.ceil((wordCount / wordsPerMinute) * 60); // en segundos
};

// ========== JSONLOGIC HELPERS ==========

export const createSimpleRule = (
  variable: string, 
  operator: string, 
  value: any
): JsonLogicRule => {
  const logic = { [operator]: [{ "var": variable }, value] };
  
  return {
    logic,
    humanReadable: `SI ${variable} ${operator} ${value} ENTONCES elegible`,
    variables: [
      {
        name: variable,
        type: typeof value as 'string' | 'number' | 'boolean',
        description: `Variable ${variable}`
      }
    ]
  };
};

export const combineRules = (
  rules: JsonLogicRule[], 
  operator: 'and' | 'or'
): JsonLogicRule => {
  const combinedLogic = {
    [operator]: rules.map(rule => rule.logic)
  };
  
  const allVariables = rules.flatMap(rule => rule.variables);
  const uniqueVariables = allVariables.filter((variable, index, self) => 
    index === self.findIndex(v => v.name === variable.name)
  );
  
  const humanReadable = rules
    .map(rule => rule.humanReadable)
    .join(operator === 'and' ? ' Y ' : ' O ');
  
  return {
    logic: combinedLogic,
    humanReadable,
    variables: uniqueVariables
  };
};

export const validateJsonLogicSyntax = (logic: any): boolean => {
  try {
    // Verificación básica de estructura JsonLogic
    if (typeof logic !== 'object' || logic === null) {
      return false;
    }
    
    // Verificar que tiene al menos una operación
    const operations = Object.keys(logic);
    if (operations.length === 0) {
      return false;
    }
    
    // JsonLogic válido tiene estructura específica
    const validOperators = [
      '==', '!=', '===', '!==', '>', '>=', '<', '<=',
      'and', 'or', 'not', '!!', 'if', 'var', 'missing',
      'in', 'cat', '+', '-', '*', '/', '%', 'min', 'max'
    ];
    
    return operations.every(op => validOperators.includes(op));
  } catch {
    return false;
  }
};

// ========== WIZARD HELPERS ==========

export const createWizardState = (steps: any[]): WizardState => {
  return {
    currentStep: 0,
    steps: steps.map((step, index) => ({
      id: `step_${index}`,
      title: step.title,
      description: step.description,
      completed: false,
      optional: step.optional || false,
      estimatedTime: step.estimatedTime || 5,
      validationSchema: step.validationSchema
    })),
    data: {},
    errors: {},
    touched: {},
    canProceed: false,
    isCompleted: false
  };
};

export const updateWizardStep = (
  state: WizardState, 
  stepIndex: number, 
  data: any, 
  errors: string[] = []
): WizardState => {
  const updatedSteps = [...state.steps];
  updatedSteps[stepIndex] = {
    ...updatedSteps[stepIndex],
    completed: errors.length === 0
  };
  
  return {
    ...state,
    steps: updatedSteps,
    data: { ...state.data, [`step_${stepIndex}`]: data },
    errors: { ...state.errors, [`step_${stepIndex}`]: errors },
    touched: { ...state.touched, [`step_${stepIndex}`]: true },
    canProceed: errors.length === 0,
    savedAt: new Date()
  };
};

export const canProceedToNextStep = (state: WizardState): boolean => {
  const currentStep = state.steps[state.currentStep];
  if (!currentStep) return false;
  
  return currentStep.completed || currentStep.optional;
};

export const getWizardProgress = (state: WizardState): number => {
  const completedSteps = state.steps.filter(step => step.completed).length;
  return (completedSteps / state.steps.length) * 100;
};

// ========== CONVERSIÓN DE DATOS ==========

export const convertLessonToRegistry = (lesson: LessonCreatorData) => {
  return {
    id: lesson.metadata.id,
    title: lesson.metadata.title,
    description: lesson.metadata.description,
    estimatedTime: lesson.metadata.estimatedTime,
    difficulty: lesson.metadata.difficulty,
    category: lesson.metadata.category,
    knowledgePath: `/knowledge/${lesson.metadata.id}`,
    thumbnailUrl: lesson.knowledgeSettings?.thumbnailUrl || '',
    educationalValue: lesson.learningObjectives?.join('. ') || '',
    prerequisites: lesson.prerequisites || [],
    tags: lesson.metadata.tags
  };
};

export const generateDeeplink = (campaignId: string, baseUrl: string = 'https://cryptogift-wallets.vercel.app'): string => {
  return `${baseUrl}/campaign/${campaignId}`;
};

export const generateQRCode = async (url: string): Promise<string> => {
  // En implementación real, usar biblioteca como qrcode
  // Por ahora retornar URL placeholder
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
};

// ========== VALIDACIÓN DE DATOS ==========

export const sanitizeTitle = (title: string): string => {
  return title
    .trim()
    .replace(/[<>]/g, '') // Remover HTML básico
    .substring(0, 100);
};

export const sanitizeDescription = (description: string): string => {
  return description
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, 500);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// ========== STORAGE HELPERS ==========

export const saveToLocalStorage = (key: string, data: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('No se pudo guardar en localStorage:', error);
  }
};

export const loadFromLocalStorage = (key: string): any | null => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.warn('No se pudo cargar de localStorage:', error);
    return null;
  }
};

export const clearLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('No se pudo limpiar localStorage:', error);
  }
};

// ========== FORMATEO Y DISPLAY ==========

export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const getTimeUntil = (targetDate: Date): { days: number; hours: number; minutes: number } => {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0 };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes };
};

// ========== ANALYTICS HELPERS ==========

// Declare gtag type for TypeScript
declare global {
  interface Window {
    gtag?: (command: string, ...args: any[]) => void;
  }
}

export const trackEvent = (eventName: string, properties: Record<string, any> = {}): void => {
  // Integración con sistema de analytics existente
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, properties);
  }
  
  // Log para desarrollo
  console.log('📊 Analytics Event:', eventName, properties);
};

export const trackWizardStep = (stepName: string, stepIndex: number, data: any): void => {
  trackEvent('wizard_step_completed', {
    step_name: stepName,
    step_index: stepIndex,
    step_data: data
  });
};

export const trackTemplateUsed = (templateId: string, category: string): void => {
  trackEvent('template_used', {
    template_id: templateId,
    template_category: category
  });
};

// ========== EXPORTS ==========

export default {
  generateId,
  generateLessonId,
  generateCampaignId,
  createEmptyBlock,
  duplicateBlock,
  reorderBlocks,
  calculateTotalDuration,
  formatDuration,
  estimateReadingTime,
  createSimpleRule,
  combineRules,
  validateJsonLogicSyntax,
  createWizardState,
  updateWizardStep,
  canProceedToNextStep,
  getWizardProgress,
  convertLessonToRegistry,
  generateDeeplink,
  generateQRCode,
  sanitizeTitle,
  sanitizeDescription,
  validateEmail,
  validateUrl,
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
  formatNumber,
  formatDate,
  getTimeUntil,
  trackEvent,
  trackWizardStep,
  trackTemplateUsed
};