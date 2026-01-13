/**
 * WORKFLOW ENGINE
 * AI-First Architecture - Core engine for executing competition workflows
 *
 * This engine:
 * 1. Manages step-by-step workflow execution
 * 2. Tracks all interactions for AI learning
 * 3. Validates inputs and transitions
 * 4. Supports AI-assisted prefilling
 * 5. Handles transactions and external calls
 */

import type {
  Workflow,
  WorkflowStep,
  WorkflowExecution,
  StepExecution,
  WorkflowCondition,
  ValidationRule,
  AIEvent,
  AISuggestion
} from '../types';

// ============================================================================
// WORKFLOW ENGINE CLASS
// ============================================================================

export class WorkflowEngine {
  private workflow: Workflow;
  private execution: WorkflowExecution;
  private eventHandlers: Map<string, ((event: AIEvent) => void)[]>;
  private aiSuggestions: Map<string, AISuggestion[]>;

  constructor(workflow: Workflow, userId?: string) {
    this.workflow = { ...workflow };
    this.execution = this.initializeExecution(userId);
    this.eventHandlers = new Map();
    this.aiSuggestions = new Map();
  }

  // --------------------------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------------------------

  private initializeExecution(userId?: string): WorkflowExecution {
    const firstStep = this.workflow.steps[0];

    return {
      workflowId: this.workflow.id,
      executionId: this.generateId(),
      userId: userId || 'anonymous',
      status: 'active',
      currentStepId: firstStep?.id || '',
      stepHistory: [],
      startedAt: Date.now()
    };
  }

  private generateId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // --------------------------------------------------------------------------
  // STEP NAVIGATION
  // --------------------------------------------------------------------------

  getCurrentStep(): WorkflowStep | null {
    return this.workflow.steps.find(
      s => s.id === this.execution.currentStepId
    ) || null;
  }

  getStepById(stepId: string): WorkflowStep | null {
    return this.workflow.steps.find(s => s.id === stepId) || null;
  }

  getProgress(): {
    current: number;
    total: number;
    percentage: number;
    completedSteps: string[];
  } {
    const currentIndex = this.workflow.steps.findIndex(
      s => s.id === this.execution.currentStepId
    );

    return {
      current: currentIndex + 1,
      total: this.workflow.steps.length,
      percentage: Math.round(((currentIndex + 1) / this.workflow.steps.length) * 100),
      completedSteps: this.workflow.completedSteps
    };
  }

  canProceed(): { allowed: boolean; reason?: string } {
    const currentStep = this.getCurrentStep();
    if (!currentStep) {
      return { allowed: false, reason: 'No current step found' };
    }

    // Check if step has dependencies
    if (currentStep.dependsOn?.length) {
      const unmetDeps = currentStep.dependsOn.filter(
        depId => !this.workflow.completedSteps.includes(depId)
      );

      if (unmetDeps.length > 0) {
        return {
          allowed: false,
          reason: `Waiting for steps: ${unmetDeps.join(', ')}`
        };
      }
    }

    // Check conditions
    if (currentStep.condition) {
      const conditionMet = this.evaluateCondition(currentStep.condition);
      if (!conditionMet) {
        return {
          allowed: false,
          reason: 'Step condition not met'
        };
      }
    }

    return { allowed: true };
  }

  // --------------------------------------------------------------------------
  // STEP EXECUTION
  // --------------------------------------------------------------------------

  async executeStep(
    stepId: string,
    input: unknown,
    aiAssisted: boolean = false
  ): Promise<{
    success: boolean;
    output?: unknown;
    error?: string;
    nextStepId?: string;
  }> {
    const step = this.getStepById(stepId);
    if (!step) {
      return { success: false, error: `Step ${stepId} not found` };
    }

    // Validate input
    const validation = this.validateInput(step, input);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    // Create step execution record
    const stepExec: StepExecution = {
      stepId,
      status: 'active',
      input,
      startedAt: Date.now(),
      aiAssisted
    };

    this.execution.stepHistory.push(stepExec);

    // Emit event for AI tracking
    this.emitEvent({
      id: this.generateId(),
      type: 'workflow_step',
      timestamp: Date.now(),
      sessionId: this.execution.executionId,
      userId: this.execution.userId,
      page: 'competencias',
      component: 'WorkflowEngine',
      data: {
        stepId,
        stepType: step.type,
        stepName: step.name,
        input,
        aiAssisted
      }
    });

    try {
      // Execute based on step type
      const output = await this.executeStepByType(step, input);

      // Mark step as completed
      stepExec.status = 'completed';
      stepExec.output = output;
      stepExec.completedAt = Date.now();

      // Update workflow data
      this.workflow.data[stepId] = output;
      this.workflow.completedSteps.push(stepId);

      // Find next step
      const nextStepId = this.findNextStep(stepId);

      if (nextStepId) {
        this.execution.currentStepId = nextStepId;
        this.workflow.currentStep = this.workflow.steps.findIndex(
          s => s.id === nextStepId
        );
      } else {
        // Workflow complete
        this.execution.status = 'completed';
        this.execution.completedAt = Date.now();
        this.workflow.completedAt = Date.now();

        this.emitEvent({
          id: this.generateId(),
          type: 'workflow_complete',
          timestamp: Date.now(),
          sessionId: this.execution.executionId,
          userId: this.execution.userId,
          page: 'competencias',
          component: 'WorkflowEngine',
          data: {
            workflowId: this.workflow.id,
            totalSteps: this.workflow.steps.length,
            duration: Date.now() - this.execution.startedAt,
            data: this.workflow.data
          }
        });
      }

      return {
        success: true,
        output,
        nextStepId
      };
    } catch (error) {
      stepExec.status = 'failed';
      stepExec.error = error instanceof Error ? error.message : 'Unknown error';
      stepExec.completedAt = Date.now();

      this.emitEvent({
        id: this.generateId(),
        type: 'workflow_error',
        timestamp: Date.now(),
        sessionId: this.execution.executionId,
        userId: this.execution.userId,
        page: 'competencias',
        component: 'WorkflowEngine',
        data: {
          stepId,
          error: stepExec.error
        }
      });

      return {
        success: false,
        error: stepExec.error
      };
    }
  }

  private async executeStepByType(
    step: WorkflowStep,
    input: unknown
  ): Promise<unknown> {
    switch (step.type) {
      case 'input':
      case 'selection':
        // Simply return the input as output
        return input;

      case 'confirmation':
        // Return confirmation status
        return { confirmed: input === true, timestamp: Date.now() };

      case 'computation':
        // Execute computation function from props
        if (typeof step.props.compute === 'function') {
          return await (step.props.compute as (input: unknown, data: Record<string, unknown>) => Promise<unknown>)(
            input,
            this.workflow.data
          );
        }
        return input;

      case 'transaction':
        // Transaction steps are handled externally
        // This just records the intent
        return {
          type: 'transaction_pending',
          params: input,
          timestamp: Date.now()
        };

      case 'api_call':
        // API calls are handled externally
        return {
          type: 'api_call_pending',
          endpoint: step.props.endpoint,
          params: input,
          timestamp: Date.now()
        };

      case 'wait':
        // Wait steps resolve when condition is met
        return {
          type: 'waiting',
          condition: step.condition,
          timestamp: Date.now()
        };

      case 'notification':
        // Notification sent
        return {
          type: 'notification_sent',
          message: step.props.message,
          timestamp: Date.now()
        };

      default:
        return input;
    }
  }

  private findNextStep(currentStepId: string): string | null {
    const currentIndex = this.workflow.steps.findIndex(
      s => s.id === currentStepId
    );

    // Look for next step that isn't already completed
    for (let i = currentIndex + 1; i < this.workflow.steps.length; i++) {
      const nextStep = this.workflow.steps[i];

      // Check if step should be skipped based on condition
      if (nextStep.condition) {
        const conditionMet = this.evaluateCondition(nextStep.condition);
        if (!conditionMet) continue;
      }

      return nextStep.id;
    }

    return null; // No more steps
  }

  // --------------------------------------------------------------------------
  // VALIDATION
  // --------------------------------------------------------------------------

  validateInput(
    step: WorkflowStep,
    input: unknown
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!step.validation) {
      return { valid: true, errors: [] };
    }

    for (const rule of step.validation) {
      const error = this.validateRule(rule, input);
      if (error) errors.push(error);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateRule(rule: ValidationRule, input: unknown): string | null {
    switch (rule.type) {
      case 'required':
        if (input === null || input === undefined || input === '') {
          return rule.message;
        }
        break;

      case 'min':
        if (typeof input === 'number' && input < (rule.value as number)) {
          return rule.message;
        }
        if (typeof input === 'string' && input.length < (rule.value as number)) {
          return rule.message;
        }
        break;

      case 'max':
        if (typeof input === 'number' && input > (rule.value as number)) {
          return rule.message;
        }
        if (typeof input === 'string' && input.length > (rule.value as number)) {
          return rule.message;
        }
        break;

      case 'pattern':
        if (typeof input === 'string') {
          const regex = new RegExp(rule.value as string);
          if (!regex.test(input)) {
            return rule.message;
          }
        }
        break;

      case 'custom':
        // Custom validation would be handled by props.customValidate
        break;
    }

    return null;
  }

  private evaluateCondition(condition: WorkflowCondition): boolean {
    let value: unknown;

    if (condition.type === 'value' && condition.field) {
      value = this.workflow.data[condition.field];
    } else if (condition.type === 'time') {
      value = Date.now();
    } else {
      value = condition.value;
    }

    switch (condition.operator) {
      case '==':
        return value === condition.value;
      case '!=':
        return value !== condition.value;
      case '>':
        return (value as number) > (condition.value as number);
      case '<':
        return (value as number) < (condition.value as number);
      case '>=':
        return (value as number) >= (condition.value as number);
      case '<=':
        return (value as number) <= (condition.value as number);
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'exists':
        return value !== null && value !== undefined;
      default:
        return false;
    }
  }

  // --------------------------------------------------------------------------
  // AI FEATURES
  // --------------------------------------------------------------------------

  /**
   * Get AI suggestions for the current step
   * Based on user history, patterns, and context
   */
  getAISuggestions(stepId: string): AISuggestion[] {
    return this.aiSuggestions.get(stepId) || [];
  }

  /**
   * Register AI suggestions for a step
   */
  registerAISuggestions(stepId: string, suggestions: AISuggestion[]): void {
    this.aiSuggestions.set(stepId, suggestions);
  }

  /**
   * Check if current step can be executed by AI without user intervention
   */
  canAIExecuteCurrentStep(): {
    canExecute: boolean;
    reason?: string;
    suggestedValue?: unknown;
  } {
    const step = this.getCurrentStep();
    if (!step) {
      return { canExecute: false, reason: 'No current step' };
    }

    if (!step.aiCanExecute) {
      return { canExecute: false, reason: 'Step requires user input' };
    }

    const suggestions = this.getAISuggestions(step.id);
    const highConfidenceSuggestion = suggestions.find(
      s => s.type === 'prefill' && s.confidence >= 0.9
    );

    if (highConfidenceSuggestion) {
      return {
        canExecute: true,
        suggestedValue: highConfidenceSuggestion.value
      };
    }

    return { canExecute: false, reason: 'No high-confidence suggestion available' };
  }

  /**
   * Get workflow state for AI context
   */
  getAIContext(): {
    workflowId: string;
    workflowName: string;
    currentStep: string;
    progress: number;
    collectedData: Record<string, unknown>;
    remainingSteps: string[];
    estimatedTimeRemaining: number;
  } {
    const currentIndex = this.workflow.steps.findIndex(
      s => s.id === this.execution.currentStepId
    );
    const remainingSteps = this.workflow.steps
      .slice(currentIndex)
      .map(s => s.name);
    const estimatedTimeRemaining = this.workflow.steps
      .slice(currentIndex)
      .reduce((acc, s) => acc + (s.estimatedSeconds || 30), 0);

    return {
      workflowId: this.workflow.id,
      workflowName: this.workflow.name,
      currentStep: this.getCurrentStep()?.name || '',
      progress: this.getProgress().percentage,
      collectedData: this.workflow.data,
      remainingSteps,
      estimatedTimeRemaining
    };
  }

  // --------------------------------------------------------------------------
  // EVENT SYSTEM
  // --------------------------------------------------------------------------

  /**
   * Subscribe to workflow events for AI tracking
   */
  onEvent(eventType: string, handler: (event: AIEvent) => void): () => void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(eventType, handlers);

    // Return unsubscribe function
    return () => {
      const currentHandlers = this.eventHandlers.get(eventType) || [];
      const index = currentHandlers.indexOf(handler);
      if (index > -1) {
        currentHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to all events
   */
  onAllEvents(handler: (event: AIEvent) => void): () => void {
    return this.onEvent('*', handler);
  }

  private emitEvent(event: AIEvent): void {
    // Emit to specific type handlers
    const typeHandlers = this.eventHandlers.get(event.type) || [];
    typeHandlers.forEach(handler => handler(event));

    // Emit to wildcard handlers
    const allHandlers = this.eventHandlers.get('*') || [];
    allHandlers.forEach(handler => handler(event));
  }

  // --------------------------------------------------------------------------
  // STATE MANAGEMENT
  // --------------------------------------------------------------------------

  getWorkflow(): Workflow {
    return { ...this.workflow };
  }

  getExecution(): WorkflowExecution {
    return { ...this.execution };
  }

  getData(): Record<string, unknown> {
    return { ...this.workflow.data };
  }

  setData(key: string, value: unknown): void {
    this.workflow.data[key] = value;
  }

  pause(): void {
    this.execution.status = 'paused';
  }

  resume(): void {
    if (this.execution.status === 'paused') {
      this.execution.status = 'active';
    }
  }

  cancel(): void {
    this.execution.status = 'cancelled';
    this.execution.completedAt = Date.now();

    this.emitEvent({
      id: this.generateId(),
      type: 'workflow_complete',
      timestamp: Date.now(),
      sessionId: this.execution.executionId,
      userId: this.execution.userId,
      page: 'competencias',
      component: 'WorkflowEngine',
      data: {
        workflowId: this.workflow.id,
        cancelled: true,
        progress: this.getProgress().percentage
      }
    });
  }

  /**
   * Export full state for persistence/recovery
   */
  exportState(): {
    workflow: Workflow;
    execution: WorkflowExecution;
  } {
    return {
      workflow: this.getWorkflow(),
      execution: this.getExecution()
    };
  }

  /**
   * Import state to resume workflow
   */
  static fromState(state: {
    workflow: Workflow;
    execution: WorkflowExecution;
  }): WorkflowEngine {
    const engine = new WorkflowEngine(state.workflow, state.execution.userId);
    engine.execution = state.execution;
    engine.workflow = state.workflow;
    return engine;
  }
}

// ============================================================================
// WORKFLOW FACTORY
// ============================================================================

export function createWorkflowEngine(
  workflow: Workflow,
  userId?: string
): WorkflowEngine {
  return new WorkflowEngine(workflow, userId);
}

// ============================================================================
// WORKFLOW REGISTRY
// ============================================================================

const workflowRegistry = new Map<string, Workflow>();

export function registerWorkflow(workflow: Workflow): void {
  workflowRegistry.set(workflow.id, workflow);
}

export function getWorkflowById(id: string): Workflow | undefined {
  return workflowRegistry.get(id);
}

export function getAllWorkflows(): Workflow[] {
  return Array.from(workflowRegistry.values());
}

export function getWorkflowsByCategory(category: string): Workflow[] {
  return getAllWorkflows().filter(w => w.category === category);
}
