/**
 * CREATOR STUDIO - JSONLOGIC ENGINE
 * Motor de reglas JsonLogic para evaluación de condiciones
 * Compatible con json-logic-js y optimizado para React
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

// import jsonLogic from 'json-logic-js';
import { JsonLogicRule } from './types';

// Simple JsonLogic implementation for development
const jsonLogic = {
  apply: (logic: any, data: any): any => {
    // Basic implementation
    if (logic && typeof logic === 'object') {
      if (logic.and) {
        return logic.and.every((rule: any) => jsonLogic.apply(rule, data));
      }
      if (logic.or) {
        return logic.or.some((rule: any) => jsonLogic.apply(rule, data));
      }
      if (logic['==']) {
        const [left, right] = logic['=='];
        const leftVal = left.var ? data[left.var] : left;
        return leftVal === right;
      }
      if (logic['>=']) {
        const [left, right] = logic['>='];
        const leftVal = left.var ? data[left.var] : left;
        return leftVal >= right;
      }
      if (logic['>']) {
        const [left, right] = logic['>'];
        const leftVal = left.var ? data[left.var] : left;
        return leftVal > right;
      }
      if (logic['<=']) {
        const [left, right] = logic['<='];
        const leftVal = left.var ? data[left.var] : left;
        return leftVal <= right;
      }
      if (logic['<']) {
        const [left, right] = logic['<'];
        const leftVal = left.var ? data[left.var] : left;
        return leftVal < right;
      }
      if (logic['!=']) {
        const [left, right] = logic['!='];
        const leftVal = left.var ? data[left.var] : left;
        return leftVal !== right;
      }
      if (logic['!']) {
        return !jsonLogic.apply(logic['!'], data);
      }
      if (logic.var) {
        return data[logic.var];
      }
    }
    return logic;
  },
  
  add_operation: (name: string, fn: Function) => {
    // Placeholder for custom operations
  }
};

// ========== OPERADORES PERSONALIZADOS ==========

// Registrar operadores personalizados para casos de uso específicos
jsonLogic.add_operation('wallet_age_days', (wallet: string) => {
  // En producción, esto consultaría la blockchain
  // Por ahora retorna valor de prueba
  return Math.floor(Math.random() * 30);
});

jsonLogic.add_operation('token_balance', (address: string, token: string) => {
  // En producción, consultaría el balance real
  return Math.random() * 1000;
});

jsonLogic.add_operation('has_nft', (address: string, collection: string) => {
  // En producción, verificaría ownership real
  return Math.random() > 0.5;
});

jsonLogic.add_operation('days_since', (timestamp: string) => {
  const then = new Date(timestamp);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - then.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// ========== EVALUADOR PRINCIPAL ==========

export interface EvaluationContext {
  wallet?: string;
  userId?: string;
  timestamp?: string;
  customData?: Record<string, any>;
}

export interface EvaluationResult {
  passed: boolean;
  details: {
    rule: string;
    context: any;
    result: any;
    errors?: string[];
  };
  timestamp: Date;
}

export class JsonLogicEngine {
  private rules: Map<string, JsonLogicRule>;
  private evaluationHistory: EvaluationResult[];
  
  constructor() {
    this.rules = new Map();
    this.evaluationHistory = [];
  }
  
  /**
   * Registra una nueva regla en el engine
   */
  addRule(id: string, rule: JsonLogicRule): void {
    if (!this.validateRule(rule)) {
      throw new Error('Regla JsonLogic inválida');
    }
    this.rules.set(id, rule);
  }
  
  /**
   * Elimina una regla del engine
   */
  removeRule(id: string): boolean {
    return this.rules.delete(id);
  }
  
  /**
   * Obtiene una regla por ID
   */
  getRule(id: string): JsonLogicRule | undefined {
    return this.rules.get(id);
  }
  
  /**
   * Valida la sintaxis de una regla
   */
  validateRule(rule: JsonLogicRule): boolean {
    try {
      // Intentar evaluar con datos dummy para verificar sintaxis
      const dummyData = this.generateDummyData(rule.variables);
      jsonLogic.apply(rule.logic, dummyData);
      return true;
    } catch (error) {
      console.error('Error validando regla JsonLogic:', error);
      return false;
    }
  }
  
  /**
   * Evalúa una regla con el contexto dado
   */
  evaluate(ruleId: string, context: EvaluationContext): EvaluationResult {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Regla ${ruleId} no encontrada`);
    }
    
    try {
      // Preparar datos para evaluación
      const data = this.prepareEvaluationData(rule, context);
      
      // Evaluar la regla
      const result = jsonLogic.apply(rule.logic, data);
      
      const evaluationResult: EvaluationResult = {
        passed: Boolean(result),
        details: {
          rule: rule.humanReadable,
          context: data,
          result
        },
        timestamp: new Date()
      };
      
      // Guardar en historial
      this.evaluationHistory.push(evaluationResult);
      
      return evaluationResult;
    } catch (error) {
      const errorResult: EvaluationResult = {
        passed: false,
        details: {
          rule: rule.humanReadable,
          context,
          result: null,
          errors: [error instanceof Error ? error.message : 'Error desconocido']
        },
        timestamp: new Date()
      };
      
      this.evaluationHistory.push(errorResult);
      return errorResult;
    }
  }
  
  /**
   * Evalúa múltiples reglas y retorna si todas pasan
   */
  evaluateAll(ruleIds: string[], context: EvaluationContext): {
    allPassed: boolean;
    results: Map<string, EvaluationResult>;
  } {
    const results = new Map<string, EvaluationResult>();
    let allPassed = true;
    
    for (const ruleId of ruleIds) {
      const result = this.evaluate(ruleId, context);
      results.set(ruleId, result);
      if (!result.passed) {
        allPassed = false;
      }
    }
    
    return { allPassed, results };
  }
  
  /**
   * Evalúa con operador OR - al menos una debe pasar
   */
  evaluateAny(ruleIds: string[], context: EvaluationContext): {
    anyPassed: boolean;
    results: Map<string, EvaluationResult>;
  } {
    const results = new Map<string, EvaluationResult>();
    let anyPassed = false;
    
    for (const ruleId of ruleIds) {
      const result = this.evaluate(ruleId, context);
      results.set(ruleId, result);
      if (result.passed) {
        anyPassed = true;
      }
    }
    
    return { anyPassed, results };
  }
  
  /**
   * Prepara los datos para evaluación basado en las variables definidas
   */
  private prepareEvaluationData(rule: JsonLogicRule, context: EvaluationContext): Record<string, any> {
    const data: Record<string, any> = {};
    
    // Mapear variables definidas con datos del contexto
    for (const variable of rule.variables) {
      switch (variable.name) {
        case 'wallet_address':
          data[variable.name] = context.wallet || '0x0000000000000000000000000000000000000000';
          break;
        case 'user_id':
          data[variable.name] = context.userId || 'anonymous';
          break;
        case 'timestamp':
          data[variable.name] = context.timestamp || new Date().toISOString();
          break;
        case 'holding_days':
          // Simular cálculo de días holding
          data[variable.name] = context.customData?.holding_days || 0;
          break;
        case 'swaps_count':
          data[variable.name] = context.customData?.swaps_count || 0;
          break;
        case 'valid_referrals':
          data[variable.name] = context.customData?.valid_referrals || 0;
          break;
        case 'is_new_user':
          data[variable.name] = context.customData?.is_new_user || false;
          break;
        case 'tasks_completed':
          data[variable.name] = context.customData?.tasks_completed || 0;
          break;
        case 'social_shares':
          data[variable.name] = context.customData?.social_shares || 0;
          break;
        case 'referrals_made':
          data[variable.name] = context.customData?.referrals_made || 0;
          break;
        default:
          // Usar datos personalizados si están disponibles
          data[variable.name] = context.customData?.[variable.name] ?? this.getDefaultValue(variable.type);
      }
    }
    
    return data;
  }
  
  /**
   * Genera datos dummy para pruebas
   */
  private generateDummyData(variables: JsonLogicRule['variables']): Record<string, any> {
    const data: Record<string, any> = {};
    
    for (const variable of variables) {
      data[variable.name] = this.getDefaultValue(variable.type);
    }
    
    return data;
  }
  
  /**
   * Obtiene valor por defecto según el tipo
   */
  private getDefaultValue(type: string): any {
    switch (type) {
      case 'number':
        return 0;
      case 'string':
        return '';
      case 'boolean':
        return false;
      case 'date':
        return new Date().toISOString();
      default:
        return null;
    }
  }
  
  /**
   * Obtiene el historial de evaluaciones
   */
  getHistory(limit?: number): EvaluationResult[] {
    if (limit) {
      return this.evaluationHistory.slice(-limit);
    }
    return [...this.evaluationHistory];
  }
  
  /**
   * Limpia el historial de evaluaciones
   */
  clearHistory(): void {
    this.evaluationHistory = [];
  }
  
  /**
   * Exporta todas las reglas
   */
  exportRules(): Record<string, JsonLogicRule> {
    const rules: Record<string, JsonLogicRule> = {};
    this.rules.forEach((rule, id) => {
      rules[id] = rule;
    });
    return rules;
  }
  
  /**
   * Importa reglas desde un objeto
   */
  importRules(rules: Record<string, JsonLogicRule>): void {
    Object.entries(rules).forEach(([id, rule]) => {
      this.addRule(id, rule);
    });
  }
}

// ========== BUILDER DE REGLAS ==========

export class RuleBuilder {
  private logic: any = {};
  private variables: JsonLogicRule['variables'] = [];
  private humanReadable: string = '';
  
  /**
   * Crea una condición simple
   */
  where(variable: string, operator: string, value: any): RuleBuilder {
    this.logic = { [operator]: [{ "var": variable }, value] };
    this.addVariable(variable, typeof value as any);
    this.humanReadable = `${variable} ${operator} ${value}`;
    return this;
  }
  
  /**
   * Añade condición AND
   */
  and(builder: RuleBuilder): RuleBuilder {
    if (!this.logic.and) {
      this.logic = { and: [this.logic] };
    }
    this.logic.and.push(builder.logic);
    this.variables.push(...builder.variables);
    this.humanReadable = `(${this.humanReadable}) Y (${builder.humanReadable})`;
    return this;
  }
  
  /**
   * Añade condición OR
   */
  or(builder: RuleBuilder): RuleBuilder {
    if (!this.logic.or) {
      this.logic = { or: [this.logic] };
    }
    this.logic.or.push(builder.logic);
    this.variables.push(...builder.variables);
    this.humanReadable = `(${this.humanReadable}) O (${builder.humanReadable})`;
    return this;
  }
  
  /**
   * Niega la condición actual
   */
  not(): RuleBuilder {
    this.logic = { "!": this.logic };
    this.humanReadable = `NO (${this.humanReadable})`;
    return this;
  }
  
  /**
   * Añade una variable
   */
  private addVariable(name: string, type: 'string' | 'number' | 'boolean' | 'date'): void {
    if (!this.variables.find(v => v.name === name)) {
      this.variables.push({
        name,
        type,
        description: `Variable ${name}`
      });
    }
  }
  
  /**
   * Construye la regla final
   */
  build(): JsonLogicRule {
    return {
      logic: this.logic,
      humanReadable: this.humanReadable,
      variables: this.variables
    };
  }
}

// ========== UTILIDADES DE CONVERSIÓN ==========

export const convertToHumanReadable = (logic: any): string => {
  try {
    return JSON.stringify(logic)
      .replace(/"var":\s*"(\w+)"/g, '$1')
      .replace(/"=="/g, 'es igual a')
      .replace(/">="/g, 'es mayor o igual que')
      .replace(/"<="/g, 'es menor o igual que')
      .replace(/">"/g, 'es mayor que')
      .replace(/"<"/g, 'es menor que')
      .replace(/"and"/g, 'Y')
      .replace(/"or"/g, 'O')
      .replace(/"!"/g, 'NO');
  } catch {
    return 'Regla compleja';
  }
};

// ========== SINGLETON INSTANCE ==========

export const jsonLogicEngine = new JsonLogicEngine();

// ========== EXPORTS ==========

export default {
  JsonLogicEngine,
  RuleBuilder,
  jsonLogicEngine,
  convertToHumanReadable
};