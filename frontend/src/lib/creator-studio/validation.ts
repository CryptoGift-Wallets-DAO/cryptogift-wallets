/**
 * CREATOR STUDIO - SISTEMA DE VALIDACIÓN
 * Validación robusta para lecciones y campañas
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
  DoBlock,
  ExplainBlock,
  CheckBlock,
  ReinforceBlock
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
      case 'do': {
        const doBlock = block as DoBlock;
        if (!doBlock.instruction || doBlock.instruction.length < 20) {
          errors.push(`Bloque DO ${index + 1}: La instrucción debe tener al menos 20 caracteres`);
        }
        break;
      }
        
      case 'explain': {
        const explainBlock = block as ExplainBlock;
        if (!explainBlock.concept || explainBlock.concept.length < 5) {
          errors.push(`Bloque EXPLAIN ${index + 1}: El concepto debe estar definido`);
        }
        if (!explainBlock.explanation || explainBlock.explanation.length < 50) {
          errors.push(`Bloque EXPLAIN ${index + 1}: La explicación debe tener al menos 50 caracteres`);
        }
        break;
      }
        
      case 'check': {
        const checkBlock = block as CheckBlock;
        if (!checkBlock.question.options || checkBlock.question.options.length < 2) {
          errors.push(`Bloque CHECK ${index + 1}: Debe tener al menos 2 opciones`);
        }
        const correctOptions = checkBlock.question.options?.filter(opt => opt.isCorrect) || [];
        if (correctOptions.length === 0) {
          errors.push(`Bloque CHECK ${index + 1}: Debe tener al menos una respuesta correcta`);
        }
        break;
      }
        
      case 'reinforce': {
        const reinforceBlock = block as ReinforceBlock;
        if (!reinforceBlock.keyPoints || reinforceBlock.keyPoints.length < 2) {
          errors.push(`Bloque REINFORCE ${index + 1}: Debe tener al menos 2 puntos clave`);
        }
        break;
      }
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
  if (!lesson.metadata.title || lesson.metadata.title.length < 5) {
    errors.push('El título debe tener al menos 5 caracteres');
  }
  
  if (!lesson.metadata.description || lesson.metadata.description.length < 20) {
    errors.push('La descripción debe tener al menos 20 caracteres');
  }
  
  // Validar objetivos de aprendizaje
  if (!lesson.learningObjectives || lesson.learningObjectives.length === 0) {
    errors.push('Debe definir al menos un objetivo de aprendizaje');
  }
  
  lesson.learningObjectives?.forEach((objective, index) => {
    if (objective.length < 20) {
      errors.push(`Objetivo ${index + 1}: Debe tener al menos 20 caracteres`);
    }
  });
  
  // Validar bloques de contenido
  if (lesson.contentBlocks) {
    const blockValidation = validateContentBlocks(lesson.contentBlocks);
    errors.push(...blockValidation.errors);
  } else {
    errors.push('Debe definir bloques de contenido');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ========== VALIDACIÓN DE CAMPAÑAS ==========

export const validateCampaign = (campaign: CampaignCreatorData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Validar metadata básica
  if (!campaign.metadata.title || campaign.metadata.title.length < 5) {
    errors.push('El título debe tener al menos 5 caracteres');
  }
  
  if (!campaign.metadata.description || campaign.metadata.description.length < 20) {
    errors.push('La descripción debe tener al menos 20 caracteres');
  }
  
  // Validar ventana de tiempo
  if (campaign.timeWindow) {
    const timeValidation = validateTimeWindow(
      new Date(campaign.timeWindow.startDate),
      new Date(campaign.timeWindow.endDate)
    );
    if (!timeValidation.isValid) {
      errors.push(timeValidation.error!);
    }
  }
  
  // Validar pool de premios
  if (!campaign.prizes || campaign.prizes.totalValue <= 0) {
    errors.push('El pool de premios debe tener un valor mayor a 0');
  }
  
  // Validar reglas de elegibilidad
  if (campaign.eligibilityRules && campaign.eligibilityRules.length > 0) {
    campaign.eligibilityRules.forEach((rule, index) => {
      const ruleValidation = validateJsonLogicRule(rule);
      if (!ruleValidation.isValid) {
        errors.push(`Regla ${index + 1}: ${ruleValidation.errors.join(', ')}`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ========== VALIDACIÓN DE WIZARD ==========

export const validateWizardStep = (
  stepId: string, 
  data: any
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Validación básica según el paso
  switch (stepId) {
    case 'metadata':
    case 'basics':
      if (!data.title || data.title.length < 5) {
        errors.push('El título debe tener al menos 5 caracteres');
      }
      if (!data.description || data.description.length < 20) {
        errors.push('La descripción debe tener al menos 20 caracteres');
      }
      break;
      
    case 'objectives':
      if (!data.objectives || data.objectives.length === 0) {
        errors.push('Debe definir al menos un objetivo');
      }
      break;
      
    case 'content':
      if (!data.blocks || data.blocks.length < 4) {
        errors.push('Debe crear al menos 4 bloques de contenido');
      }
      break;
      
    case 'prizes':
      if (!data.totalValue || data.totalValue <= 0) {
        errors.push('El valor total de premios debe ser mayor a 0');
      }
      break;
      
    case 'rules':
      if (!data.rules || data.rules.length === 0) {
        errors.push('Debe definir al menos una regla de elegibilidad');
      }
      break;
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
  getValidationSeverity,
  validateEthereumAddress,
  validateTimeWindow,
  validateRateLimit
};