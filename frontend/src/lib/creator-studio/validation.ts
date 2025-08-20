/**
 * CREATOR STUDIO - SISTEMA DE VALIDACIÓN
 * Validación robusta para lecciones y campañas
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import { z } from 'zod';
import { 
  LessonCreatorData, 
  CampaignCreatorData, 
  ContentBlock, 
  JsonLogicRule,
  WizardState
} from './types';

// ========== VALIDADORES PERSONALIZADOS ==========

export const validateEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const validateTimeWindow = (start: Date, end: Date): { isValid: boolean; error?: string } => {
  const now = new Date();
  
  if (start < now) {
    return { isValid: false, error: 'La fecha de inicio no puede ser en el pasado' };
  }
  
  if (end <= start) {
    return { isValid: false, error: 'La fecha de fin debe ser posterior a la fecha de inicio' };
  }
  
  const maxDuration = 30 * 24 * 60 * 60 * 1000; // 30 días en milisegundos
  if (end.getTime() - start.getTime() > maxDuration) {
    return { isValid: false, error: 'La duración máxima de una campaña es 30 días' };
  }
  
  return { isValid: true };
};

export const validateRateLimit = (rateLimit: string): boolean => {
  // Formats: "60/min", "100/hour", "1000/day"
  const rateLimitRegex = /^\d+\/(min|hour|day)$/;
  return rateLimitRegex.test(rateLimit);
};

// ========== VALIDACIÓN DE JSONLOGIC ==========

export const validateJsonLogicRule = (rule: JsonLogicRule): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  try {
    // Verificar que la regla tiene estructura válida
    if (!rule.logic || typeof rule.logic !== 'object') {
      errors.push('La regla JsonLogic debe ser un objeto válido');
    }
    
    // Verificar que tiene descripción humana
    if (!rule.humanReadable || rule.humanReadable.length < 10) {
      errors.push('La descripción de la regla debe tener al menos 10 caracteres');
    }
    
    // Verificar variables definidas
    if (!rule.variables || rule.variables.length === 0) {
      errors.push('Debe definir al menos una variable para la regla');
    }
    
    // Verificar que las variables usadas en la regla están definidas
    const ruleString = JSON.stringify(rule.logic);
    const usedVariables = extractVariablesFromRule(ruleString);
    const definedVariables = rule.variables.map(v => v.name);
    
    const undefinedVariables = usedVariables.filter(v => !definedVariables.includes(v));
    if (undefinedVariables.length > 0) {
      errors.push(`Variables no definidas: ${undefinedVariables.join(', ')}`);
    }
    
  } catch (error) {
    errors.push('Error al validar la regla JsonLogic: estructura inválida');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const extractVariablesFromRule = (ruleString: string): string[] => {
  const variableRegex = /"var"\s*:\s*"([^"]+)"/g;
  const variables: string[] = [];
  let match;
  
  while ((match = variableRegex.exec(ruleString)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  
  return variables;
};

// ========== VALIDACIÓN DE BLOQUES DE CONTENIDO ==========

export const validateContentBlocks = (blocks: ContentBlock[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (blocks.length < 4) {
    errors.push('Se requieren mínimo 4 bloques (DO, EXPLAIN, CHECK, REINFORCE)');
  }
  
  // Verificar que hay al menos uno de cada tipo
  const blockTypes = blocks.map(block => block.type);
  const requiredTypes = ['do', 'explain', 'check', 'reinforce'];
  
  for (const type of requiredTypes) {
    if (!blockTypes.includes(type as any)) {
      errors.push(`Falta bloque de tipo ${type.toUpperCase()}`);
    }
  }
  
  // Verificar duración total razonable
  const totalDuration = blocks.reduce((sum, block) => sum + block.duration, 0);
  if (totalDuration < 180) { // 3 minutos mínimo
    errors.push('La duración total de la lección debe ser al menos 3 minutos');
  }
  if (totalDuration > 3600) { // 60 minutos máximo
    errors.push('La duración total de la lección no debe exceder 60 minutos');
  }
  
  // Validaciones específicas por tipo de bloque
  blocks.forEach((block, index) => {
    switch (block.type) {
      case 'do':
        if (!block.instruction || block.instruction.length < 20) {
          errors.push(`Bloque DO ${index + 1}: La instrucción debe tener al menos 20 caracteres`);
        }
        break;
        
      case 'explain':
        if (!block.concept || block.concept.length < 5) {
          errors.push(`Bloque EXPLAIN ${index + 1}: El concepto debe estar definido`);
        }
        if (!block.explanation || block.explanation.length < 50) {
          errors.push(`Bloque EXPLAIN ${index + 1}: La explicación debe tener al menos 50 caracteres`);
        }
        break;
        
      case 'check':
        if (!block.question.options || block.question.options.length < 2) {
          errors.push(`Bloque CHECK ${index + 1}: Debe tener al menos 2 opciones`);
        }
        const correctOptions = block.question.options.filter(opt => opt.isCorrect);
        if (correctOptions.length === 0) {
          errors.push(`Bloque CHECK ${index + 1}: Debe tener al menos una respuesta correcta`);
        }
        break;
        
      case 'reinforce':
        if (!block.keyPoints || block.keyPoints.length < 2) {
          errors.push(`Bloque REINFORCE ${index + 1}: Debe tener al menos 2 puntos clave`);
        }
        break;
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ========== VALIDACIÓN DE LECCIONES ==========

export const validateLesson = (lesson: LessonCreatorData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Validar metadata básica
  try {
    lesson.metadata; // Se valida automáticamente por el schema Zod
  } catch (error) {
    errors.push('Metadata inválida');
  }
  
  // Validar objetivos de aprendizaje
  if (lesson.learningObjectives.length === 0) {
    errors.push('Debe definir al menos un objetivo de aprendizaje');
  }
  
  lesson.learningObjectives.forEach((objective, index) => {
    if (objective.length < 20) {
      errors.push(`Objetivo ${index + 1}: Debe tener al menos 20 caracteres`);
    }
  });
  
  // Validar bloques de contenido
  const blockValidation = validateContentBlocks(lesson.blocks);
  errors.push(...blockValidation.errors);
  
  // Validar configuración educacional
  if (lesson.educationalSettings.completionCriteria.requiredCorrectAnswers > lesson.blocks.filter(b => b.type === 'check').length) {
    errors.push('Las respuestas correctas requeridas no pueden exceder el número de preguntas');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ========== VALIDACIÓN DE CAMPAÑAS ==========

export const validateCampaign = (campaign: CampaignCreatorData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Validar ventana de tiempo
  const timeValidation = validateTimeWindow(campaign.timeWindow.start, campaign.timeWindow.end);
  if (!timeValidation.isValid) {
    errors.push(timeValidation.error!);
  }
  
  // Validar pool de premios
  if (campaign.prizePool.supply <= 0) {
    errors.push('El pool de premios debe tener al menos 1 premio');
  }
  
  if (campaign.prizePool.type === 'nft' && !campaign.prizePool.escrowAddress) {
    errors.push('Las campañas NFT requieren una dirección de escrow');
  }
  
  if (campaign.prizePool.escrowAddress && !validateEthereumAddress(campaign.prizePool.escrowAddress)) {
    errors.push('Dirección de escrow inválida');
  }
  
  // Validar reglas de elegibilidad
  const ruleValidation = validateJsonLogicRule(campaign.eligibility.rules);
  errors.push(...ruleValidation.errors);
  
  // Validar leaderboard si está habilitado
  if (campaign.leaderboard?.enabled) {
    if (campaign.leaderboard.winners > campaign.prizePool.supply) {
      errors.push('El número de ganadores no puede exceder el pool de premios');
    }
  }
  
  // Validar protección anti-abuse
  if (!validateRateLimit(campaign.abuseProtection.rateLimit)) {
    errors.push('Formato de rate limit inválido (usar formato: "60/min", "100/hour", etc.)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ========== VALIDACIÓN DE WIZARD ==========

export const validateWizardStep = (
  stepId: string, 
  data: any, 
  schema?: z.ZodSchema
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!schema) {
    return { isValid: true, errors: [] };
  }
  
  try {
    schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(...error.errors.map(err => `${err.path.join('.')}: ${err.message}`));
    } else {
      errors.push('Error de validación desconocido');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateWizardCompletion = (state: WizardState): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Verificar que todos los pasos requeridos están completados
  const incompleteSteps = state.steps
    .filter(step => !step.optional && !step.completed)
    .map(step => step.title);
  
  if (incompleteSteps.length > 0) {
    errors.push(`Pasos incompletos: ${incompleteSteps.join(', ')}`);
  }
  
  // Verificar que no hay errores pendientes
  const hasErrors = Object.values(state.errors).some(stepErrors => stepErrors.length > 0);
  if (hasErrors) {
    errors.push('Hay errores de validación pendientes');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ========== UTILIDADES DE FORMATO ==========

export const formatValidationErrors = (errors: string[]): string => {
  if (errors.length === 0) return '';
  
  if (errors.length === 1) {
    return errors[0];
  }
  
  return `• ${errors.join('\n• ')}`;
};

export const getValidationSeverity = (errorCount: number): 'info' | 'warning' | 'error' => {
  if (errorCount === 0) return 'info';
  if (errorCount <= 2) return 'warning';
  return 'error';
};

// ========== EXPORTS ==========

export default {
  validateLesson,
  validateCampaign,
  validateContentBlocks,
  validateJsonLogicRule,
  validateWizardStep,
  validateWizardCompletion,
  formatValidationErrors,
  getValidationSeverity
};