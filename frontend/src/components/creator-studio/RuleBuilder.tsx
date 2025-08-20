/**
 * RULE BUILDER VISUAL - COMPONENTE DE CONSTRUCCIÓN DE REGLAS
 * Sistema drag & drop para crear reglas JsonLogic visualmente
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Sparkles,
  Code,
  RefreshCw
} from 'lucide-react';
import { JsonLogicRule } from '@/lib/creator-studio/types';
import { RuleBuilder as RuleBuilderClass } from '@/lib/creator-studio/jsonLogicEngine';

// ========== TIPOS ==========

interface RuleCondition {
  id: string;
  field: string;
  operator: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'date';
  locked?: boolean;
}

interface RuleGroup {
  id: string;
  operator: 'AND' | 'OR';
  conditions: (RuleCondition | RuleGroup)[];
  locked?: boolean;
  collapsed?: boolean;
}

interface RuleBuilderProps {
  initialRule?: JsonLogicRule;
  availableFields?: Array<{
    name: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    description?: string;
    options?: Array<{ label: string; value: any }>;
  }>;
  onChange?: (rule: JsonLogicRule) => void;
  onValidate?: (isValid: boolean, errors: string[]) => void;
  readonly?: boolean;
  showPreview?: boolean;
  className?: string;
}

// ========== OPERADORES DISPONIBLES ==========

const OPERATORS = {
  string: [
    { value: '==', label: 'es igual a' },
    { value: '!=', label: 'no es igual a' },
    { value: 'in', label: 'contiene' },
    { value: '!in', label: 'no contiene' }
  ],
  number: [
    { value: '==', label: 'es igual a' },
    { value: '!=', label: 'no es igual a' },
    { value: '>', label: 'es mayor que' },
    { value: '>=', label: 'es mayor o igual que' },
    { value: '<', label: 'es menor que' },
    { value: '<=', label: 'es menor o igual que' }
  ],
  boolean: [
    { value: '==', label: 'es' }
  ],
  date: [
    { value: '==', label: 'es igual a' },
    { value: '>', label: 'es después de' },
    { value: '<', label: 'es antes de' },
    { value: '>=', label: 'es igual o después de' },
    { value: '<=', label: 'es igual o antes de' }
  ]
};

// ========== CAMPOS POR DEFECTO ==========

const DEFAULT_FIELDS = [
  { name: 'holding_days', label: 'Días manteniendo tokens', type: 'number' as const },
  { name: 'swaps_count', label: 'Número de swaps', type: 'number' as const },
  { name: 'valid_referrals', label: 'Referidos válidos', type: 'number' as const },
  { name: 'is_new_user', label: 'Es usuario nuevo', type: 'boolean' as const },
  { name: 'wallet_age_days', label: 'Edad de la wallet (días)', type: 'number' as const },
  { name: 'tasks_completed', label: 'Tareas completadas', type: 'number' as const },
  { name: 'social_shares', label: 'Compartidas en redes', type: 'number' as const },
  { name: 'has_nft', label: 'Tiene NFT', type: 'boolean' as const }
];

// ========== COMPONENTE PRINCIPAL ==========

export const RuleBuilder: React.FC<RuleBuilderProps> = ({
  initialRule,
  availableFields = DEFAULT_FIELDS,
  onChange,
  onValidate,
  readonly = false,
  showPreview = true,
  className = ''
}) => {
  const [rootGroup, setRootGroup] = useState<RuleGroup>(() => ({
    id: 'root',
    operator: 'AND',
    conditions: [],
    locked: false,
    collapsed: false
  }));
  
  const [showJson, setShowJson] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [humanReadable, setHumanReadable] = useState('');
  
  // Generar ID único
  const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Añadir nueva condición
  const addCondition = useCallback((groupId: string) => {
    if (readonly) return;
    
    const newCondition: RuleCondition = {
      id: generateId(),
      field: availableFields[0]?.name || '',
      operator: '==',
      value: '',
      type: availableFields[0]?.type || 'string'
    };
    
    const updateGroup = (group: RuleGroup): RuleGroup => {
      if (group.id === groupId && !group.locked) {
        return {
          ...group,
          conditions: [...group.conditions, newCondition]
        };
      }
      return {
        ...group,
        conditions: group.conditions.map(item =>
          'operator' in item ? updateGroup(item) : item
        )
      };
    };
    
    setRootGroup(updateGroup(rootGroup));
  }, [rootGroup, availableFields, readonly]);
  
  // Añadir nuevo grupo
  const addGroup = useCallback((parentGroupId: string) => {
    if (readonly) return;
    
    const newGroup: RuleGroup = {
      id: generateId(),
      operator: 'AND',
      conditions: [],
      locked: false,
      collapsed: false
    };
    
    const updateGroup = (group: RuleGroup): RuleGroup => {
      if (group.id === parentGroupId && !group.locked) {
        return {
          ...group,
          conditions: [...group.conditions, newGroup]
        };
      }
      return {
        ...group,
        conditions: group.conditions.map(item =>
          'operator' in item ? updateGroup(item) : item
        )
      };
    };
    
    setRootGroup(updateGroup(rootGroup));
  }, [rootGroup, readonly]);
  
  // Eliminar condición o grupo
  const removeItem = useCallback((itemId: string) => {
    if (readonly) return;
    
    const updateGroup = (group: RuleGroup): RuleGroup => {
      return {
        ...group,
        conditions: group.conditions
          .filter(item => item.id !== itemId)
          .map(item => 'operator' in item ? updateGroup(item) : item)
      };
    };
    
    setRootGroup(updateGroup(rootGroup));
  }, [rootGroup, readonly]);
  
  // Actualizar condición
  const updateCondition = useCallback((conditionId: string, updates: Partial<RuleCondition>) => {
    if (readonly) return;
    
    const updateGroup = (group: RuleGroup): RuleGroup => {
      return {
        ...group,
        conditions: group.conditions.map(item => {
          if ('operator' in item) {
            return updateGroup(item);
          }
          if (item.id === conditionId && !item.locked) {
            // Si cambia el campo, actualizar el tipo y operador
            if (updates.field) {
              const fieldDef = availableFields.find(f => f.name === updates.field);
              if (fieldDef) {
                updates.type = fieldDef.type;
                updates.operator = OPERATORS[fieldDef.type][0].value;
                updates.value = fieldDef.type === 'boolean' ? false : '';
              }
            }
            return { ...item, ...updates };
          }
          return item;
        })
      };
    };
    
    setRootGroup(updateGroup(rootGroup));
  }, [rootGroup, availableFields, readonly]);
  
  // Cambiar operador del grupo (AND/OR)
  const toggleGroupOperator = useCallback((groupId: string) => {
    if (readonly) return;
    
    const updateGroup = (group: RuleGroup): RuleGroup => {
      if (group.id === groupId && !group.locked) {
        return {
          ...group,
          operator: group.operator === 'AND' ? 'OR' : 'AND'
        };
      }
      return {
        ...group,
        conditions: group.conditions.map(item =>
          'operator' in item ? updateGroup(item) : item
        )
      };
    };
    
    setRootGroup(updateGroup(rootGroup));
  }, [rootGroup, readonly]);
  
  // Bloquear/desbloquear item
  const toggleLock = useCallback((itemId: string) => {
    if (readonly) return;
    
    const updateGroup = (group: RuleGroup): RuleGroup => {
      if (group.id === itemId) {
        return { ...group, locked: !group.locked };
      }
      return {
        ...group,
        conditions: group.conditions.map(item => {
          if ('operator' in item) {
            return updateGroup(item);
          }
          if (item.id === itemId) {
            return { ...item, locked: !item.locked };
          }
          return item;
        })
      };
    };
    
    setRootGroup(updateGroup(rootGroup));
  }, [rootGroup, readonly]);
  
  // Colapsar/expandir grupo
  const toggleCollapse = useCallback((groupId: string) => {
    const updateGroup = (group: RuleGroup): RuleGroup => {
      if (group.id === groupId) {
        return { ...group, collapsed: !group.collapsed };
      }
      return {
        ...group,
        conditions: group.conditions.map(item =>
          'operator' in item ? updateGroup(item) : item
        )
      };
    };
    
    setRootGroup(updateGroup(rootGroup));
  }, [rootGroup]);
  
  // Duplicar condición
  const duplicateCondition = useCallback((condition: RuleCondition, groupId: string) => {
    if (readonly) return;
    
    const newCondition: RuleCondition = {
      ...condition,
      id: generateId()
    };
    
    const updateGroup = (group: RuleGroup): RuleGroup => {
      if (group.id === groupId && !group.locked) {
        const index = group.conditions.findIndex(c => c.id === condition.id);
        const newConditions = [...group.conditions];
        newConditions.splice(index + 1, 0, newCondition);
        return { ...group, conditions: newConditions };
      }
      return {
        ...group,
        conditions: group.conditions.map(item =>
          'operator' in item ? updateGroup(item) : item
        )
      };
    };
    
    setRootGroup(updateGroup(rootGroup));
  }, [rootGroup, readonly]);
  
  // Convertir a JsonLogic
  const convertToJsonLogic = useCallback((group: RuleGroup): any => {
    if (group.conditions.length === 0) {
      return {};
    }
    
    const conditions = group.conditions.map(item => {
      if ('operator' in item) {
        return convertToJsonLogic(item);
      }
      
      // Condición simple
      const { field, operator, value } = item;
      
      // Manejo especial para operadores negados
      if (operator === '!in') {
        return { "!": { "in": [value, { "var": field }] } };
      }
      if (operator === '!=') {
        return { "!": { "==": [{ "var": field }, value] } };
      }
      
      return { [operator]: [{ "var": field }, value] };
    });
    
    if (conditions.length === 1) {
      return conditions[0];
    }
    
    return {
      [group.operator.toLowerCase()]: conditions
    };
  }, []);
  
  // Generar descripción legible
  const generateHumanReadable = useCallback((group: RuleGroup, depth: number = 0): string => {
    if (group.conditions.length === 0) {
      return 'Sin condiciones';
    }
    
    const indent = '  '.repeat(depth);
    const parts = group.conditions.map(item => {
      if ('operator' in item) {
        return generateHumanReadable(item, depth + 1);
      }
      
      const field = availableFields.find(f => f.name === item.field);
      const operator = OPERATORS[item.type]?.find(op => op.value === item.operator);
      
      return `${indent}${field?.label || item.field} ${operator?.label || item.operator} ${
        item.type === 'boolean' ? (item.value ? 'verdadero' : 'falso') : item.value
      }`;
    });
    
    const connector = group.operator === 'AND' ? ' Y\n' : ' O\n';
    return parts.join(connector);
  }, [availableFields]);
  
  // Validar regla
  const validateRule = useCallback((): { isValid: boolean; errors: string[] } => {
    const validationErrors: string[] = [];
    
    const validateGroup = (group: RuleGroup, path: string = 'root'): void => {
      if (group.conditions.length === 0) {
        validationErrors.push(`El grupo ${path} está vacío`);
        return;
      }
      
      group.conditions.forEach((item, index) => {
        if ('operator' in item) {
          validateGroup(item, `${path}.${index}`);
        } else {
          if (!item.field) {
            validationErrors.push(`Condición ${index + 1}: Falta seleccionar campo`);
          }
          if (item.value === '' || item.value === null || item.value === undefined) {
            validationErrors.push(`Condición ${index + 1}: Falta valor`);
          }
        }
      });
    };
    
    validateGroup(rootGroup);
    
    return {
      isValid: validationErrors.length === 0,
      errors: validationErrors
    };
  }, [rootGroup]);
  
  // Efectos
  useEffect(() => {
    const logic = convertToJsonLogic(rootGroup);
    const readable = generateHumanReadable(rootGroup);
    setHumanReadable(readable);
    
    const validation = validateRule();
    setErrors(validation.errors);
    
    if (onChange && validation.isValid) {
      const variables = extractVariables(rootGroup);
      onChange({
        logic,
        humanReadable: readable,
        variables
      });
    }
    
    if (onValidate) {
      onValidate(validation.isValid, validation.errors);
    }
  }, [rootGroup, convertToJsonLogic, generateHumanReadable, validateRule, onChange, onValidate]);
  
  // Extraer variables usadas
  const extractVariables = (group: RuleGroup): JsonLogicRule['variables'] => {
    const variables: JsonLogicRule['variables'] = [];
    const seen = new Set<string>();
    
    const extract = (g: RuleGroup): void => {
      g.conditions.forEach(item => {
        if ('operator' in item) {
          extract(item);
        } else if (!seen.has(item.field)) {
          seen.add(item.field);
          const fieldDef = availableFields.find(f => f.name === item.field);
          variables.push({
            name: item.field,
            type: item.type,
            description: fieldDef?.description || fieldDef?.label || item.field
          });
        }
      });
    };
    
    extract(group);
    return variables;
  };
  
  // ========== RENDERIZADO DE CONDICIÓN ==========
  
  const renderCondition = (
    condition: RuleCondition,
    groupId: string,
    index: number
  ) => (
    <motion.div
      key={condition.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className={`
        flex items-center gap-2 p-3 rounded-lg
        ${condition.locked ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}
        border ${condition.locked ? 'border-gray-300' : 'border-gray-200 dark:border-gray-700'}
        ${readonly ? '' : 'hover:shadow-md'}
        transition-all duration-200
      `}
    >
      {/* Número de condición */}
      <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full 
                    flex items-center justify-center text-sm font-bold text-purple-700 dark:text-purple-300">
        {index + 1}
      </div>
      
      {/* Campo */}
      <select
        value={condition.field}
        onChange={(e) => updateCondition(condition.id, { field: e.target.value })}
        disabled={readonly || condition.locked}
        className="flex-1 min-w-[150px] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                 bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
      >
        {availableFields.map(field => (
          <option key={field.name} value={field.name}>
            {field.label}
          </option>
        ))}
      </select>
      
      {/* Operador */}
      <select
        value={condition.operator}
        onChange={(e) => updateCondition(condition.id, { operator: e.target.value })}
        disabled={readonly || condition.locked}
        className="min-w-[150px] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                 bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
      >
        {OPERATORS[condition.type]?.map(op => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>
      
      {/* Valor */}
      {condition.type === 'boolean' ? (
        <select
          value={condition.value ? 'true' : 'false'}
          onChange={(e) => updateCondition(condition.id, { value: e.target.value === 'true' })}
          disabled={readonly || condition.locked}
          className="min-w-[120px] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                   focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        >
          <option value="true">Verdadero</option>
          <option value="false">Falso</option>
        </select>
      ) : condition.type === 'number' ? (
        <input
          type="number"
          value={condition.value}
          onChange={(e) => updateCondition(condition.id, { value: parseFloat(e.target.value) || 0 })}
          disabled={readonly || condition.locked}
          placeholder="0"
          className="min-w-[120px] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                   focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        />
      ) : condition.type === 'date' ? (
        <input
          type="date"
          value={condition.value}
          onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
          disabled={readonly || condition.locked}
          className="min-w-[150px] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                   focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        />
      ) : (
        <input
          type="text"
          value={condition.value}
          onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
          disabled={readonly || condition.locked}
          placeholder="Valor..."
          className="min-w-[150px] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                   focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        />
      )}
      
      {/* Acciones */}
      {!readonly && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleLock(condition.id)}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={condition.locked ? 'Desbloquear' : 'Bloquear'}
          >
            {condition.locked ? (
              <Lock className="w-4 h-4 text-gray-500" />
            ) : (
              <Unlock className="w-4 h-4 text-gray-400" />
            )}
          </button>
          
          <button
            onClick={() => duplicateCondition(condition, groupId)}
            disabled={condition.locked}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
            title="Duplicar"
          >
            <Copy className="w-4 h-4 text-gray-400" />
          </button>
          
          <button
            onClick={() => removeItem(condition.id)}
            disabled={condition.locked}
            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      )}
    </motion.div>
  );
  
  // ========== RENDERIZADO DE GRUPO ==========
  
  const renderGroup = (group: RuleGroup, depth: number = 0): JSX.Element => {
    const isRoot = group.id === 'root';
    
    return (
      <motion.div
        key={group.id}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          ${!isRoot ? 'border-2 border-dashed rounded-xl p-4 mb-2' : ''}
          ${group.operator === 'AND' ? 'border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-900/10' : 
            'border-orange-300 bg-orange-50/50 dark:border-orange-700 dark:bg-orange-900/10'}
        `}
      >
        {/* Header del grupo */}
        {!isRoot && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleCollapse(group.id)}
                className="p-1 rounded hover:bg-white/50 dark:hover:bg-black/20 transition-colors"
              >
                {group.collapsed ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </button>
              
              <button
                onClick={() => toggleGroupOperator(group.id)}
                disabled={readonly || group.locked}
                className={`
                  px-3 py-1 rounded-full font-bold text-sm transition-all
                  ${group.operator === 'AND' 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-orange-500 text-white hover:bg-orange-600'}
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {group.operator}
              </button>
              
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Grupo ({group.conditions.length} condiciones)
              </span>
            </div>
            
            {!readonly && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleLock(group.id)}
                  className="p-1.5 rounded hover:bg-white/50 dark:hover:bg-black/20 transition-colors"
                  title={group.locked ? 'Desbloquear grupo' : 'Bloquear grupo'}
                >
                  {group.locked ? (
                    <Lock className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Unlock className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                
                <button
                  onClick={() => removeItem(group.id)}
                  disabled={group.locked}
                  className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Eliminar grupo"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Contenido del grupo */}
        {!group.collapsed && (
          <>
            {/* Operador principal para el root */}
            {isRoot && group.conditions.length > 1 && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Operador principal:
                </span>
                <button
                  onClick={() => toggleGroupOperator(group.id)}
                  disabled={readonly}
                  className={`
                    px-4 py-2 rounded-lg font-bold transition-all
                    ${group.operator === 'AND' 
                      ? 'bg-blue-500 text-white hover:bg-blue-600' 
                      : 'bg-orange-500 text-white hover:bg-orange-600'}
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {group.operator === 'AND' ? 'Y (AND)' : 'O (OR)'}
                </button>
              </div>
            )}
            
            {/* Condiciones */}
            <AnimatePresence>
              <div className="space-y-2">
                {group.conditions.map((item, index) => (
                  'operator' in item 
                    ? renderGroup(item, depth + 1)
                    : renderCondition(item, group.id, index)
                ))}
              </div>
            </AnimatePresence>
            
            {/* Botones de añadir */}
            {!readonly && !group.locked && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => addCondition(group.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 
                           text-white rounded-lg hover:shadow-lg transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  Añadir Condición
                </button>
                
                {depth < 2 && ( // Limitar profundidad de anidamiento
                  <button
                    onClick={() => addGroup(group.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 
                             text-white rounded-lg hover:shadow-lg transition-all duration-200"
                  >
                    <Plus className="w-4 h-4" />
                    Añadir Grupo
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </motion.div>
    );
  };
  
  // ========== RENDER PRINCIPAL ==========
  
  return (
    <div className={`rule-builder ${className}`}>
      {/* Header con controles */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Constructor de Reglas
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {readonly ? 'Modo solo lectura' : 'Arrastra y construye tus condiciones visualmente'}
          </p>
        </div>
        
        {showPreview && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowJson(!showJson)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700
                       hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {showJson ? <Eye className="w-4 h-4" /> : <Code className="w-4 h-4" />}
              {showJson ? 'Ver Visual' : 'Ver JSON'}
            </button>
          </div>
        )}
      </div>
      
      {/* Errores de validación */}
      {errors.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2">
            Errores de validación:
          </h4>
          <ul className="list-disc list-inside space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-sm text-red-600 dark:text-red-400">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Constructor visual o vista JSON */}
      {showJson ? (
        <div className="space-y-4">
          {/* JSON Logic */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="text-sm font-mono text-green-400 mb-2">// JsonLogic Rule</h4>
            <pre className="text-sm text-gray-300 overflow-x-auto">
              {JSON.stringify(convertToJsonLogic(rootGroup), null, 2)}
            </pre>
          </div>
          
          {/* Descripción legible */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">
              Descripción en lenguaje natural:
            </h4>
            <p className="text-sm text-blue-600 dark:text-blue-300 whitespace-pre-wrap font-mono">
              {humanReadable || 'Sin condiciones definidas'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Constructor visual */}
          {renderGroup(rootGroup)}
          
          {/* Botón inicial si está vacío */}
          {rootGroup.conditions.length === 0 && !readonly && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl"
            >
              <Sparkles className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Comienza a construir tu regla
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Añade condiciones para definir quién puede participar en tu campaña o acceder a tu contenido
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => addCondition('root')}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 
                           text-white rounded-lg hover:shadow-lg transition-all duration-200 font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Añadir Primera Condición
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}
      
      {/* Preview en texto */}
      {showPreview && !showJson && humanReadable && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 
                   border border-purple-200 dark:border-purple-800 rounded-lg"
        >
          <h4 className="font-semibold text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Vista previa en texto:
          </h4>
          <p className="text-sm text-purple-600 dark:text-purple-300 whitespace-pre-wrap">
            SI {humanReadable} ENTONCES se cumple la condición
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default RuleBuilder;