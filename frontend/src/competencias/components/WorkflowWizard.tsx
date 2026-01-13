/**
 * WORKFLOW WIZARD
 * AI-First Step-by-Step Competition Wizard
 *
 * Features:
 * - Dynamic step rendering based on workflow definition
 * - AI-assisted prefilling and suggestions
 * - Progress tracking with click-by-click visibility
 * - Real-time validation
 * - Mobile-responsive design
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Sparkles,
  Loader2,
  Info,
  RefreshCw,
  Play,
  Pause,
} from 'lucide-react';
import {
  Workflow,
  WorkflowStep,
  CompetitionCategory,
} from '../types';
import {
  WorkflowEngine,
  createWorkflowEngine,
  getWorkflowById,
} from '../lib/workflowEngine';
import { useAIContext, useWorkflowTracking } from '../hooks/useAIContext';

// =============================================================================
// TYPES
// =============================================================================

export interface WorkflowWizardProps {
  workflowId: string;
  category: CompetitionCategory;
  initialData?: Record<string, unknown>;
  onComplete?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
  onStepChange?: (step: WorkflowStep, index: number) => void;
  userId?: string;
  aiEnabled?: boolean;
  className?: string;
}

interface StepInputProps {
  step: WorkflowStep;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  aiSuggestion?: unknown;
  onAcceptSuggestion?: () => void;
  disabled?: boolean;
}

// =============================================================================
// CATEGORY ICONS & COLORS
// =============================================================================

const CATEGORY_CONFIG: Record<CompetitionCategory, {
  icon: string;
  color: string;
  gradient: string;
  label: string;
}> = {
  prediction: {
    icon: '🎯',
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-500',
    label: 'Predicción',
  },
  tournament: {
    icon: '🏆',
    color: 'amber',
    gradient: 'from-amber-500 to-orange-500',
    label: 'Torneo',
  },
  challenge: {
    icon: '⚔️',
    color: 'red',
    gradient: 'from-red-500 to-pink-500',
    label: 'Desafío',
  },
  pool: {
    icon: '💰',
    color: 'green',
    gradient: 'from-green-500 to-emerald-500',
    label: 'Pool',
  },
  milestone: {
    icon: '🎯',
    color: 'purple',
    gradient: 'from-purple-500 to-violet-500',
    label: 'Hitos',
  },
  ranking: {
    icon: '📊',
    color: 'indigo',
    gradient: 'from-indigo-500 to-blue-500',
    label: 'Ranking',
  },
};

// =============================================================================
// STEP INPUT COMPONENTS
// =============================================================================

/**
 * Text Input Step
 */
const TextInput: React.FC<StepInputProps> = ({
  step,
  value,
  onChange,
  error,
  aiSuggestion,
  onAcceptSuggestion,
  disabled,
}) => {
  const props = step.props || {};

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {props.label || step.name}
        {step.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {props.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {props.description}
        </p>
      )}

      <div className="relative">
        {props.multiline ? (
          <textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={props.placeholder}
            disabled={disabled}
            rows={props.rows || 4}
            maxLength={props.maxLength}
            className={`
              w-full px-4 py-3 rounded-xl border
              ${error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500'
              }
              bg-white dark:bg-gray-800
              text-gray-900 dark:text-white
              placeholder-gray-400
              focus:outline-none focus:ring-2
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              resize-none
            `}
          />
        ) : (
          <input
            type={props.type || 'text'}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={props.placeholder}
            disabled={disabled}
            maxLength={props.maxLength}
            className={`
              w-full px-4 py-3 rounded-xl border
              ${error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500'
              }
              bg-white dark:bg-gray-800
              text-gray-900 dark:text-white
              placeholder-gray-400
              focus:outline-none focus:ring-2
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          />
        )}

        {/* AI Suggestion Badge */}
        {aiSuggestion && onAcceptSuggestion && (
          <div className="absolute right-2 top-2">
            <button
              type="button"
              onClick={onAcceptSuggestion}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/50
                text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800
                transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              AI
            </button>
          </div>
        )}
      </div>

      {/* Character count */}
      {props.maxLength && (
        <div className="text-xs text-gray-400 text-right">
          {(value as string)?.length || 0} / {props.maxLength}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * Number Input Step
 */
const NumberInput: React.FC<StepInputProps> = ({
  step,
  value,
  onChange,
  error,
  disabled,
}) => {
  const props = step.props || {};

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {props.label || step.name}
        {step.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {props.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {props.description}
        </p>
      )}

      <div className="relative">
        <input
          type="number"
          value={(value as number) || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={props.placeholder}
          disabled={disabled}
          min={props.min}
          max={props.max}
          step={props.step || 1}
          className={`
            w-full px-4 py-3 rounded-xl border
            ${error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500'
            }
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-white
            placeholder-gray-400
            focus:outline-none focus:ring-2
            transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        />

        {props.suffix && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            {props.suffix}
          </div>
        )}
      </div>

      {/* Range info */}
      {(props.min !== undefined || props.max !== undefined) && (
        <div className="text-xs text-gray-400">
          {props.min !== undefined && `Mín: ${props.min}`}
          {props.min !== undefined && props.max !== undefined && ' | '}
          {props.max !== undefined && `Máx: ${props.max}`}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * Select Input Step
 */
const SelectInput: React.FC<StepInputProps> = ({
  step,
  value,
  onChange,
  error,
  disabled,
}) => {
  const props = step.props || {};
  const options = props.options || [];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {props.label || step.name}
        {step.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {props.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {props.description}
        </p>
      )}

      {/* Card-style options */}
      {props.cardStyle ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {options.map((option: { value: string; label: string; icon?: string; description?: string }) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              disabled={disabled}
              className={`
                p-4 rounded-xl border-2 text-left transition-all
                ${value === option.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {option.icon && <div className="text-2xl mb-2">{option.icon}</div>}
              <div className="font-medium text-gray-900 dark:text-white">
                {option.label}
              </div>
              {option.description && (
                <div className="text-xs text-gray-500 mt-1">
                  {option.description}
                </div>
              )}
            </button>
          ))}
        </div>
      ) : (
        /* Standard select */
        <select
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`
            w-full px-4 py-3 rounded-xl border
            ${error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500'
            }
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-white
            focus:outline-none focus:ring-2
            transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <option value="">Seleccionar...</option>
          {options.map((option: { value: string; label: string }) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * Date Input Step
 */
const DateInput: React.FC<StepInputProps> = ({
  step,
  value,
  onChange,
  error,
  disabled,
}) => {
  const props = step.props || {};

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {props.label || step.name}
        {step.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {props.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {props.description}
        </p>
      )}

      <input
        type={props.includeTime ? 'datetime-local' : 'date'}
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        min={props.minDate}
        max={props.maxDate}
        className={`
          w-full px-4 py-3 rounded-xl border
          ${error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500'
          }
          bg-white dark:bg-gray-800
          text-gray-900 dark:text-white
          focus:outline-none focus:ring-2
          transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      />

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * Confirmation Step
 */
const ConfirmationStep: React.FC<StepInputProps> = ({
  step,
  value,
  onChange,
  error,
  disabled,
}) => {
  const props = step.props || {};

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-4xl mb-4">{props.icon || '✅'}</div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {props.title || step.name}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {props.description}
        </p>
      </div>

      {props.summary && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
          <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
            Resumen:
          </h4>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {props.summary}
          </div>
        </div>
      )}

      {props.requireConfirmation && (
        <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {props.confirmationText || 'Confirmo que la información es correcta'}
          </span>
        </label>
      )}

      {error && (
        <p className="text-sm text-red-500 flex items-center justify-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * Action Step (Wallet connection, transaction, etc.)
 */
const ActionStep: React.FC<StepInputProps & {
  onExecute?: () => Promise<void>;
  isExecuting?: boolean;
}> = ({
  step,
  value,
  error,
  disabled,
  onExecute,
  isExecuting,
}) => {
  const props = step.props || {};

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-4xl mb-4">{props.icon || '⚡'}</div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {props.title || step.name}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {props.description}
        </p>
      </div>

      <button
        type="button"
        onClick={onExecute}
        disabled={disabled || isExecuting || !!value}
        className={`
          w-full py-4 rounded-xl font-medium text-lg
          flex items-center justify-center gap-2
          transition-all transform hover:scale-[1.02]
          ${value
            ? 'bg-green-500 text-white'
            : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg'
          }
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        `}
      >
        {isExecuting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Ejecutando...
          </>
        ) : value ? (
          <>
            <Check className="w-5 h-5" />
            Completado
          </>
        ) : (
          <>
            <Play className="w-5 h-5" />
            {props.actionLabel || 'Ejecutar'}
          </>
        )}
      </button>

      {error && (
        <p className="text-sm text-red-500 flex items-center justify-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
};

// Step component mapper
const STEP_COMPONENTS: Record<string, React.FC<StepInputProps>> = {
  TextInput,
  NumberInput,
  SelectInput,
  Select: SelectInput,
  DateInput,
  DatePicker: DateInput,
  Confirmation: ConfirmationStep,
  Action: ActionStep,
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const WorkflowWizard: React.FC<WorkflowWizardProps> = ({
  workflowId,
  category,
  initialData = {},
  onComplete,
  onCancel,
  onStepChange,
  userId,
  aiEnabled = true,
  className = '',
}) => {
  // State
  const [engine, setEngine] = useState<WorkflowEngine | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, unknown>>({});

  // AI Context
  const aiContext = useAIContext();
  const { startWorkflow, completeStep, endWorkflow } = useWorkflowTracking();

  // Category config
  const categoryConfig = CATEGORY_CONFIG[category];

  // Initialize workflow engine
  useEffect(() => {
    const workflow = getWorkflowById(workflowId);
    if (workflow) {
      const newEngine = createWorkflowEngine(workflow, userId);
      setEngine(newEngine);

      // Start AI tracking
      if (aiEnabled && startWorkflow) {
        startWorkflow(workflowId, userId);
      }
    }
  }, [workflowId, userId, aiEnabled, startWorkflow]);

  // Get current step
  const currentStep = useMemo(() => {
    if (!engine) return null;
    const workflow = getWorkflowById(workflowId);
    return workflow?.steps[currentStepIndex] || null;
  }, [engine, workflowId, currentStepIndex]);

  // Get all steps for progress display
  const allSteps = useMemo(() => {
    const workflow = getWorkflowById(workflowId);
    return workflow?.steps || [];
  }, [workflowId]);

  // Handle step change notification
  useEffect(() => {
    if (currentStep && onStepChange) {
      onStepChange(currentStep, currentStepIndex);
    }
  }, [currentStep, currentStepIndex, onStepChange]);

  // Generate AI suggestions for current step
  useEffect(() => {
    if (!currentStep || !aiEnabled || !engine) return;

    const canPrefill = engine.canAIExecuteCurrentStep();
    if (canPrefill.canExecute && canPrefill.suggestedValue !== undefined) {
      setAiSuggestions(prev => ({
        ...prev,
        [currentStep.id]: canPrefill.suggestedValue,
      }));
    }
  }, [currentStep, aiEnabled, engine]);

  // Handle input change
  const handleInputChange = useCallback((stepId: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [stepId]: value,
    }));

    // Clear error for this step
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[stepId];
      return newErrors;
    });
  }, []);

  // Accept AI suggestion
  const handleAcceptSuggestion = useCallback((stepId: string) => {
    const suggestion = aiSuggestions[stepId];
    if (suggestion !== undefined) {
      handleInputChange(stepId, suggestion);
    }
  }, [aiSuggestions, handleInputChange]);

  // Validate current step
  const validateStep = useCallback((): boolean => {
    if (!currentStep) return true;

    const value = formData[currentStep.id];
    const validations = currentStep.validation || [];

    for (const validation of validations) {
      switch (validation.type) {
        case 'required':
          if (!value || (typeof value === 'string' && !value.trim())) {
            setErrors(prev => ({ ...prev, [currentStep.id]: validation.message }));
            return false;
          }
          break;
        case 'min':
          if (typeof value === 'number' && typeof validation.value === 'number' && value < validation.value) {
            setErrors(prev => ({ ...prev, [currentStep.id]: validation.message }));
            return false;
          }
          if (typeof value === 'string' && typeof validation.value === 'number' && value.length < validation.value) {
            setErrors(prev => ({ ...prev, [currentStep.id]: validation.message }));
            return false;
          }
          break;
        case 'max':
          if (typeof value === 'number' && typeof validation.value === 'number' && value > validation.value) {
            setErrors(prev => ({ ...prev, [currentStep.id]: validation.message }));
            return false;
          }
          if (typeof value === 'string' && typeof validation.value === 'number' && value.length > validation.value) {
            setErrors(prev => ({ ...prev, [currentStep.id]: validation.message }));
            return false;
          }
          break;
        case 'pattern':
          if (typeof value === 'string' && typeof validation.value === 'string' && !new RegExp(validation.value).test(value)) {
            setErrors(prev => ({ ...prev, [currentStep.id]: validation.message }));
            return false;
          }
          break;
      }
    }

    return true;
  }, [currentStep, formData]);

  // Go to next step
  const handleNext = useCallback(async () => {
    if (!validateStep()) return;

    if (currentStep && completeStep) {
      completeStep(currentStep.id, formData[currentStep.id]);
    }

    if (currentStepIndex < allSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Complete workflow
      if (endWorkflow) {
        endWorkflow(true);
      }
      if (onComplete) {
        onComplete(formData);
      }
    }
  }, [currentStep, currentStepIndex, allSteps.length, validateStep, formData, completeStep, endWorkflow, onComplete]);

  // Go to previous step
  const handlePrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  // Handle action step execution
  const handleActionExecute = useCallback(async () => {
    if (!currentStep) return;

    setIsExecuting(true);
    try {
      // Simulate action execution (in real implementation, this would trigger wallet/transaction)
      await new Promise(resolve => setTimeout(resolve, 2000));

      handleInputChange(currentStep.id, true);
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        [currentStep.id]: error instanceof Error ? error.message : 'Error al ejecutar',
      }));
    } finally {
      setIsExecuting(false);
    }
  }, [currentStep, handleInputChange]);

  // Render step input based on component type
  const renderStepInput = () => {
    if (!currentStep) return null;

    const componentName = currentStep.component || 'TextInput';
    const Component = STEP_COMPONENTS[componentName];

    if (!Component) {
      console.warn(`Unknown step component: ${componentName}`);
      return <TextInput step={currentStep} value={formData[currentStep.id]} onChange={(v) => handleInputChange(currentStep.id, v)} />;
    }

    const props: StepInputProps = {
      step: currentStep,
      value: formData[currentStep.id],
      onChange: (v) => handleInputChange(currentStep.id, v),
      error: errors[currentStep.id],
      aiSuggestion: aiSuggestions[currentStep.id],
      onAcceptSuggestion: () => handleAcceptSuggestion(currentStep.id),
      disabled: isExecuting,
    };

    if (componentName === 'Action') {
      return (
        <ActionStep
          {...props}
          onExecute={handleActionExecute}
          isExecuting={isExecuting}
        />
      );
    }

    return <Component {...props} />;
  };

  // Loading state
  if (!engine || !currentStep) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const progress = ((currentStepIndex + 1) / allSteps.length) * 100;
  const isLastStep = currentStepIndex === allSteps.length - 1;

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{categoryConfig.icon}</span>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {categoryConfig.label}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Paso {currentStepIndex + 1} de {allSteps.length}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${categoryConfig.gradient}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {allSteps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            onClick={() => index < currentStepIndex && setCurrentStepIndex(index)}
            disabled={index > currentStepIndex}
            className={`
              flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
              transition-all
              ${index === currentStepIndex
                ? `bg-gradient-to-r ${categoryConfig.gradient} text-white`
                : index < currentStepIndex
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
              }
              ${index < currentStepIndex ? 'cursor-pointer hover:opacity-80' : ''}
              ${index > currentStepIndex ? 'cursor-not-allowed' : ''}
            `}
          >
            {index < currentStepIndex ? (
              <Check className="w-3 h-3 inline mr-1" />
            ) : null}
            {step.name}
          </button>
        ))}
      </div>

      {/* Current step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="mb-8"
        >
          {/* AI description */}
          {aiEnabled && currentStep.aiDescription && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-4">
              <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {currentStep.aiDescription}
              </p>
            </div>
          )}

          {/* Step input */}
          {renderStepInput()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex gap-3">
        {currentStepIndex > 0 && (
          <button
            type="button"
            onClick={handlePrevious}
            disabled={isExecuting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
              border border-gray-200 dark:border-gray-700
              text-gray-700 dark:text-gray-300
              hover:bg-gray-50 dark:hover:bg-gray-800
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>
        )}

        {onCancel && currentStepIndex === 0 && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isExecuting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
              border border-gray-200 dark:border-gray-700
              text-gray-700 dark:text-gray-300
              hover:bg-gray-50 dark:hover:bg-gray-800
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
        )}

        <button
          type="button"
          onClick={handleNext}
          disabled={isExecuting}
          className={`
            flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl
            font-medium text-white
            bg-gradient-to-r ${categoryConfig.gradient}
            hover:shadow-lg hover:scale-[1.02]
            transition-all transform
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
          `}
        >
          {isLastStep ? (
            <>
              <Check className="w-4 h-4" />
              Completar
            </>
          ) : (
            <>
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* AI assistance indicator */}
      {aiEnabled && (
        <div className="mt-4 text-center">
          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
            <Sparkles className="w-3 h-3" />
            Asistencia AI activa - Click-by-click tracking
          </span>
        </div>
      )}
    </div>
  );
};

export default WorkflowWizard;
