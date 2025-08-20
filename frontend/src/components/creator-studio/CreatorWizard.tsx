/**
 * CREATOR WIZARD - SISTEMA DE PASOS PARA CREACIÓN
 * Wizard universal para crear lecciones y campañas
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Save,
  Eye,
  Sparkles,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  X
} from 'lucide-react';
import { 
  WizardState, 
  WizardStep,
  LessonCreatorData,
  CampaignCreatorData
} from '@/lib/creator-studio/types';
import {
  createWizardState,
  updateWizardStep,
  canProceedToNextStep,
  getWizardProgress,
  saveToLocalStorage,
  loadFromLocalStorage,
  trackWizardStep
} from '@/lib/creator-studio/utils';

// ========== TIPOS ==========

interface CreatorWizardProps {
  type: 'lesson' | 'campaign';
  templateData?: Partial<LessonCreatorData | CampaignCreatorData>;
  onComplete: (data: LessonCreatorData | CampaignCreatorData) => void;
  onSaveDraft?: (data: any) => void;
  onCancel?: () => void;
  className?: string;
}

interface StepComponentProps {
  data: any;
  onChange: (data: any) => void;
  onValidate: (isValid: boolean, errors: string[]) => void;
  readonly?: boolean;
}

// ========== COMPONENTE PRINCIPAL ==========

export const CreatorWizard: React.FC<CreatorWizardProps> = ({
  type,
  templateData,
  onComplete,
  onSaveDraft,
  onCancel,
  className = ''
}) => {
  // Estado del wizard
  const [wizardState, setWizardState] = useState<WizardState>(() => {
    // Intentar cargar estado guardado
    const savedState = loadFromLocalStorage(`creator_wizard_${type}`);
    if (savedState) {
      return savedState;
    }
    
    // Crear estado inicial basado en el tipo
    const steps = type === 'lesson' ? getLessonSteps() : getCampaignSteps();
    return createWizardState(steps);
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // Obtener paso actual
  const currentStep = wizardState.steps[wizardState.currentStep];
  const progress = getWizardProgress(wizardState);
  
  // Navegación entre pasos
  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex < 0 || stepIndex >= wizardState.steps.length) return;
    
    setWizardState(prev => ({
      ...prev,
      currentStep: stepIndex
    }));
    
    // Track analytics
    trackWizardStep(
      wizardState.steps[stepIndex].title,
      stepIndex,
      wizardState.data[`step_${stepIndex}`]
    );
  }, [wizardState.steps, wizardState.data]);
  
  const goToPrevious = () => goToStep(wizardState.currentStep - 1);
  const goToNext = () => goToStep(wizardState.currentStep + 1);
  
  // Manejo de datos del paso actual
  const handleStepDataChange = useCallback((data: any) => {
    setWizardState(prev => updateWizardStep(
      prev,
      prev.currentStep,
      data,
      validationErrors
    ));
  }, [validationErrors]);
  
  const handleStepValidation = useCallback((isValid: boolean, errors: string[]) => {
    setValidationErrors(errors);
    setWizardState(prev => ({
      ...prev,
      canProceed: isValid,
      errors: {
        ...prev.errors,
        [`step_${prev.currentStep}`]: errors
      }
    }));
  }, []);
  
  // Guardar borrador
  const handleSaveDraft = useCallback(async () => {
    setIsSaving(true);
    
    try {
      // Guardar en localStorage
      saveToLocalStorage(`creator_wizard_${type}`, wizardState);
      
      // Callback opcional para guardar en backend
      if (onSaveDraft) {
        await onSaveDraft(wizardState.data);
      }
      
      // Mostrar notificación de éxito
      console.log('✅ Borrador guardado exitosamente');
    } catch (error) {
      console.error('Error guardando borrador:', error);
    } finally {
      setIsSaving(false);
    }
  }, [type, wizardState, onSaveDraft]);
  
  // Completar wizard
  const handleComplete = useCallback(() => {
    // Validar todos los pasos requeridos
    const incompleteSteps = wizardState.steps
      .filter((step, index) => !step.optional && !step.completed)
      .map(step => step.title);
    
    if (incompleteSteps.length > 0) {
      setValidationErrors([
        `Por favor completa los siguientes pasos: ${incompleteSteps.join(', ')}`
      ]);
      return;
    }
    
    // Construir datos finales
    const finalData = buildFinalData(wizardState, type);
    
    // Limpiar localStorage
    localStorage.removeItem(`creator_wizard_${type}`);
    
    // Callback de completado
    onComplete(finalData as any);
  }, [wizardState, type, onComplete]);
  
  // Cancelar wizard
  const handleCancel = useCallback(() => {
    if (progress > 0) {
      setShowExitWarning(true);
    } else if (onCancel) {
      onCancel();
    }
  }, [progress, onCancel]);
  
  const confirmCancel = () => {
    localStorage.removeItem(`creator_wizard_${type}`);
    if (onCancel) onCancel();
  };
  
  // Auto-guardar cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (progress > 0) {
        handleSaveDraft();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [progress, handleSaveDraft]);
  
  // Aplicar datos de plantilla si existen
  useEffect(() => {
    if (templateData && Object.keys(templateData).length > 0) {
      setWizardState(prev => ({
        ...prev,
        data: { ...prev.data, template: templateData }
      }));
    }
  }, [templateData]);
  
  // ========== RENDERIZADO ==========
  
  return (
    <div className={`creator-wizard ${className}`}>
      {/* Header con progreso */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Cancelar"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {type === 'lesson' ? '📚 Crear Nueva Lección' : '🎯 Crear Nueva Campaña'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Paso {wizardState.currentStep + 1} de {wizardState.steps.length}: {currentStep?.title}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Tiempo estimado */}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>~{currentStep?.estimatedTime} min</span>
            </div>
            
            {/* Botón guardar borrador */}
            <button
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 
                       text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 
                       dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Guardar Borrador
            </button>
          </div>
        </div>
        
        {/* Barra de progreso */}
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            {wizardState.steps.map((step, index) => (
              <div
                key={step.id}
                className="flex-1 flex items-center"
              >
                <button
                  onClick={() => goToStep(index)}
                  disabled={!step.completed && index > wizardState.currentStep}
                  className={`
                    relative z-10 w-10 h-10 rounded-full flex items-center justify-center
                    font-semibold transition-all duration-300
                    ${index === wizardState.currentStep
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-110'
                      : step.completed
                      ? 'bg-green-500 text-white'
                      : index < wizardState.currentStep
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}
                    ${index <= wizardState.currentStep || step.completed
                      ? 'cursor-pointer hover:scale-105'
                      : 'cursor-not-allowed opacity-50'}
                  `}
                  title={step.title}
                >
                  {step.completed ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </button>
                
                {index < wizardState.steps.length - 1 && (
                  <div className="flex-1 h-1 mx-2">
                    <div className="h-full bg-gray-200 dark:bg-gray-700 rounded">
                      <div
                        className={`h-full rounded transition-all duration-500 ${
                          step.completed
                            ? 'bg-green-500'
                            : index < wizardState.currentStep
                            ? 'bg-orange-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        style={{
                          width: step.completed || index < wizardState.currentStep ? '100%' : '0%'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Labels de pasos */}
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
            {wizardState.steps.map((step, index) => (
              <div
                key={step.id}
                className={`text-center ${
                  index === 0 ? 'text-left' : 
                  index === wizardState.steps.length - 1 ? 'text-right' : ''
                }`}
                style={{ width: `${100 / wizardState.steps.length}%` }}
              >
                <span className={`
                  ${index === wizardState.currentStep ? 'font-semibold text-purple-600 dark:text-purple-400' : ''}
                  ${step.completed ? 'text-green-600 dark:text-green-400' : ''}
                `}>
                  {step.title}
                </span>
                {step.optional && (
                  <span className="text-gray-400 text-xs ml-1">(opcional)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Contenido del paso actual */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Errores de validación */}
        {validationErrors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-700 dark:text-red-400 mb-1">
                  Por favor corrige los siguientes errores:
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-sm text-red-600 dark:text-red-400">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Componente del paso */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep?.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStepComponent(
              type,
              wizardState.currentStep,
              wizardState.data[`step_${wizardState.currentStep}`] || {},
              handleStepDataChange,
              handleStepValidation,
              templateData
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Footer con navegación */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPrevious}
            disabled={wizardState.currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600
                     text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Anterior
          </button>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>{wizardState.steps.filter(s => s.completed).length} completados</span>
            </div>
            <span>•</span>
            <span>{Math.round(progress)}% de progreso</span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Preview button */}
            <button
              className="flex items-center gap-2 px-4 py-2 border border-purple-300 dark:border-purple-600
                       text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20
                       transition-colors"
            >
              <Eye className="w-4 h-4" />
              Vista Previa
            </button>
            
            {/* Next/Complete button */}
            {wizardState.currentStep < wizardState.steps.length - 1 ? (
              <button
                onClick={goToNext}
                disabled={!canProceedToNextStep(wizardState)}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500
                         text-white rounded-lg hover:shadow-lg transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={!wizardState.isCompleted}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500
                         text-white rounded-lg hover:shadow-lg transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                Completar y Publicar
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal de confirmación de salida */}
      <AnimatePresence>
        {showExitWarning && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                ¿Estás seguro de que quieres salir?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Tienes un {Math.round(progress)}% de progreso. Tu trabajo se guardará como borrador
                y podrás continuar más tarde.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitWarning(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600
                           text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50
                           dark:hover:bg-gray-700 transition-colors"
                >
                  Continuar Editando
                </button>
                <button
                  onClick={confirmCancel}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg
                           hover:bg-red-600 transition-colors"
                >
                  Salir y Guardar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ========== FUNCIONES AUXILIARES ==========

// Definir pasos para lección
const getLessonSteps = (): WizardStep[] => [
  {
    id: 'metadata',
    title: 'Información Básica',
    description: 'Define el título, descripción y categoría de tu lección',
    completed: false,
    optional: false,
    estimatedTime: 3,
    validationSchema: undefined
  },
  {
    id: 'objectives',
    title: 'Objetivos',
    description: 'Define qué aprenderán los estudiantes',
    completed: false,
    optional: false,
    estimatedTime: 5,
    validationSchema: undefined
  },
  {
    id: 'content',
    title: 'Contenido',
    description: 'Crea los bloques DO → EXPLAIN → CHECK → REINFORCE',
    completed: false,
    optional: false,
    estimatedTime: 15,
    validationSchema: undefined
  },
  {
    id: 'settings',
    title: 'Configuración',
    description: 'Ajusta los parámetros educativos',
    completed: false,
    optional: true,
    estimatedTime: 3,
    validationSchema: undefined
  },
  {
    id: 'review',
    title: 'Revisar',
    description: 'Revisa y publica tu lección',
    completed: false,
    optional: false,
    estimatedTime: 2,
    validationSchema: undefined
  }
];

// Definir pasos para campaña
const getCampaignSteps = (): WizardStep[] => [
  {
    id: 'basics',
    title: 'Información',
    description: 'Define el título y objetivo de tu campaña',
    completed: false,
    optional: false,
    estimatedTime: 3,
    validationSchema: undefined
  },
  {
    id: 'prizes',
    title: 'Premios',
    description: 'Configura el pool de premios',
    completed: false,
    optional: false,
    estimatedTime: 5,
    validationSchema: undefined
  },
  {
    id: 'rules',
    title: 'Reglas',
    description: 'Define las condiciones de elegibilidad',
    completed: false,
    optional: false,
    estimatedTime: 8,
    validationSchema: undefined
  },
  {
    id: 'window',
    title: 'Ventana',
    description: 'Establece fechas y plazos',
    completed: false,
    optional: false,
    estimatedTime: 3,
    validationSchema: undefined
  },
  {
    id: 'protection',
    title: 'Anti-Abuse',
    description: 'Configura protecciones',
    completed: false,
    optional: true,
    estimatedTime: 3,
    validationSchema: undefined
  },
  {
    id: 'publish',
    title: 'Publicar',
    description: 'Revisa y lanza tu campaña',
    completed: false,
    optional: false,
    estimatedTime: 2,
    validationSchema: undefined
  }
];

// Renderizar componente del paso
const renderStepComponent = (
  type: 'lesson' | 'campaign',
  stepIndex: number,
  data: any,
  onChange: (data: any) => void,
  onValidate: (isValid: boolean, errors: string[]) => void,
  templateData?: any
): JSX.Element => {
  // Aquí se renderizarían los componentes específicos de cada paso
  // Por ahora, un placeholder
  return (
    <div className="text-center py-12">
      <Sparkles className="w-16 h-16 text-purple-500 mx-auto mb-4" />
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Paso {stepIndex + 1}: {type === 'lesson' ? getLessonSteps()[stepIndex].title : getCampaignSteps()[stepIndex].title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
        {type === 'lesson' ? getLessonSteps()[stepIndex].description : getCampaignSteps()[stepIndex].description}
      </p>
      
      {/* Aquí irían los componentes específicos de cada paso */}
      <div className="mt-8 p-8 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <p className="text-sm text-gray-500">
          [Componente del paso {stepIndex + 1} - En desarrollo]
        </p>
      </div>
    </div>
  );
};

// Construir datos finales
const buildFinalData = (state: WizardState, type: 'lesson' | 'campaign'): any => {
  // Combinar todos los datos de los pasos
  const combined = Object.values(state.data).reduce((acc, stepData) => {
    if (stepData && typeof stepData === 'object') {
      return { ...acc, ...stepData };
    }
    return acc;
  }, {});
  
  return combined;
};

export default CreatorWizard;