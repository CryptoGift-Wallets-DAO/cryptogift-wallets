"use client";

/**
 * AI CONTEXT PROVIDER
 * Tracks all user interactions for AI-assisted navigation
 *
 * This system enables:
 * 1. Click-by-click tracking for AI replay
 * 2. Intent recognition from user patterns
 * 3. Smart prefilling based on history
 * 4. Workflow automation by AI agent
 *
 * The AI can use this data to:
 * - Guide users step-by-step
 * - Execute workflows on behalf of users
 * - Learn from user behavior patterns
 * - Suggest next actions
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useEffect,
  useState
} from 'react';
import type {
  AIEvent,
  AIEventType,
  AISession,
  AISuggestion,
  AIAction,
  WorkflowExecution
} from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface AIContextValue {
  // Session management
  sessionId: string;
  userId?: string;
  setUserId: (id: string) => void;

  // Event tracking
  trackEvent: (event: Omit<AIEvent, 'id' | 'timestamp' | 'sessionId'>) => void;
  trackClick: (elementId: string, component: string, data?: Record<string, unknown>) => void;
  trackInput: (field: string, value: unknown, component: string) => void;
  trackNavigation: (page: string, from?: string) => void;
  trackTransaction: (type: 'initiated' | 'signed' | 'confirmed' | 'failed', data: Record<string, unknown>) => void;

  // AI features
  getSuggestions: (context: string) => AISuggestion[];
  registerSuggestion: (suggestion: AISuggestion) => void;
  acceptSuggestion: (suggestionId: string) => void;
  rejectSuggestion: (suggestionId: string) => void;

  // Workflow integration
  currentWorkflow?: WorkflowExecution;
  setCurrentWorkflow: (workflow: WorkflowExecution | undefined) => void;

  // AI actions
  getAvailableActions: () => AIAction[];
  executeAction: (actionId: string) => Promise<boolean>;

  // History and learning
  getRecentEvents: (count?: number) => AIEvent[];
  getUserPatterns: () => UserPattern[];

  // Export for AI agent
  exportSession: () => AISession;
}

interface UserPattern {
  type: string;
  frequency: number;
  lastSeen: number;
  context: Record<string, unknown>;
}

interface AIProviderProps {
  children: React.ReactNode;
  userId?: string;
  onEvent?: (event: AIEvent) => void;
  persistSession?: boolean;
}

// ============================================================================
// CONTEXT
// ============================================================================

const AIContext = createContext<AIContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export function AIContextProvider({
  children,
  userId: initialUserId,
  onEvent,
  persistSession = true
}: AIProviderProps) {
  // Session state
  const [sessionId] = useState(() => generateSessionId());
  const [userId, setUserId] = useState(initialUserId);

  // Event storage
  const eventsRef = useRef<AIEvent[]>([]);
  const suggestionsRef = useRef<Map<string, AISuggestion>>(new Map());
  const patternsRef = useRef<Map<string, UserPattern>>(new Map());

  // Workflow state
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowExecution>();

  // Available AI actions
  const actionsRef = useRef<Map<string, AIAction>>(new Map());

  // --------------------------------------------------------------------------
  // SESSION PERSISTENCE
  // --------------------------------------------------------------------------

  // Load session from storage on mount
  useEffect(() => {
    if (persistSession && typeof window !== 'undefined') {
      const stored = localStorage.getItem('ai_session');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.events) {
            eventsRef.current = parsed.events;
          }
          if (parsed.patterns) {
            patternsRef.current = new Map(Object.entries(parsed.patterns));
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [persistSession]);

  // Save session to storage periodically
  useEffect(() => {
    if (!persistSession) return;

    const saveInterval = setInterval(() => {
      if (typeof window !== 'undefined') {
        const sessionData = {
          sessionId,
          events: eventsRef.current.slice(-100),  // Keep last 100 events
          patterns: Object.fromEntries(patternsRef.current)
        };
        localStorage.setItem('ai_session', JSON.stringify(sessionData));
      }
    }, 10000);  // Save every 10 seconds

    return () => clearInterval(saveInterval);
  }, [sessionId, persistSession]);

  // --------------------------------------------------------------------------
  // EVENT TRACKING
  // --------------------------------------------------------------------------

  const trackEvent = useCallback((
    event: Omit<AIEvent, 'id' | 'timestamp' | 'sessionId'>
  ) => {
    const fullEvent: AIEvent = {
      ...event,
      id: generateEventId(),
      timestamp: Date.now(),
      sessionId,
      userId
    };

    // Store event
    eventsRef.current.push(fullEvent);

    // Limit memory usage
    if (eventsRef.current.length > 1000) {
      eventsRef.current = eventsRef.current.slice(-500);
    }

    // Update patterns
    updatePatterns(fullEvent);

    // Notify external handlers
    onEvent?.(fullEvent);

    // Log for debugging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('[AI Event]', fullEvent.type, fullEvent.data);
    }
  }, [sessionId, userId, onEvent]);

  const trackClick = useCallback((
    elementId: string,
    component: string,
    data?: Record<string, unknown>
  ) => {
    trackEvent({
      type: 'click',
      page: getCurrentPage(),
      component,
      elementId,
      data: data || {}
    });
  }, [trackEvent]);

  const trackInput = useCallback((
    field: string,
    value: unknown,
    component: string
  ) => {
    trackEvent({
      type: 'input_change',
      page: getCurrentPage(),
      component,
      data: { field, value }
    });
  }, [trackEvent]);

  const trackNavigation = useCallback((
    page: string,
    from?: string
  ) => {
    trackEvent({
      type: 'page_view',
      page,
      component: 'Router',
      data: { from: from || 'unknown' }
    });
  }, [trackEvent]);

  const trackTransaction = useCallback((
    type: 'initiated' | 'signed' | 'confirmed' | 'failed',
    data: Record<string, unknown>
  ) => {
    const eventType: AIEventType = `tx_${type}` as AIEventType;
    trackEvent({
      type: eventType,
      page: getCurrentPage(),
      component: 'Transaction',
      data
    });
  }, [trackEvent]);

  // --------------------------------------------------------------------------
  // PATTERN LEARNING
  // --------------------------------------------------------------------------

  const updatePatterns = (event: AIEvent) => {
    const patternKey = `${event.type}:${event.component}`;
    const existing = patternsRef.current.get(patternKey);

    if (existing) {
      existing.frequency += 1;
      existing.lastSeen = event.timestamp;
    } else {
      patternsRef.current.set(patternKey, {
        type: patternKey,
        frequency: 1,
        lastSeen: event.timestamp,
        context: { page: event.page, component: event.component }
      });
    }
  };

  const getUserPatterns = useCallback((): UserPattern[] => {
    return Array.from(patternsRef.current.values())
      .sort((a, b) => b.frequency - a.frequency);
  }, []);

  // --------------------------------------------------------------------------
  // SUGGESTIONS
  // --------------------------------------------------------------------------

  const getSuggestions = useCallback((context: string): AISuggestion[] => {
    const suggestions: AISuggestion[] = [];

    // Get suggestions matching context
    for (const [, suggestion] of suggestionsRef.current) {
      if (suggestion.field === context || !suggestion.field) {
        suggestions.push(suggestion);
      }
    }

    // Generate suggestions from patterns
    const patterns = getUserPatterns();
    for (const pattern of patterns.slice(0, 5)) {
      if (pattern.frequency >= 3) {
        suggestions.push({
          id: `pattern_${pattern.type}`,
          type: 'action',
          message: `Based on your history: ${pattern.type}`,
          confidence: Math.min(pattern.frequency / 10, 0.9),
          source: 'pattern'
        });
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }, [getUserPatterns]);

  const registerSuggestion = useCallback((suggestion: AISuggestion) => {
    suggestionsRef.current.set(suggestion.id, suggestion);
  }, []);

  const acceptSuggestion = useCallback((suggestionId: string) => {
    const suggestion = suggestionsRef.current.get(suggestionId);
    if (suggestion) {
      trackEvent({
        type: 'ai_accepted',
        page: getCurrentPage(),
        component: 'AISuggestion',
        data: { suggestionId, suggestion }
      });
      suggestionsRef.current.delete(suggestionId);
    }
  }, [trackEvent]);

  const rejectSuggestion = useCallback((suggestionId: string) => {
    const suggestion = suggestionsRef.current.get(suggestionId);
    if (suggestion) {
      trackEvent({
        type: 'ai_rejected',
        page: getCurrentPage(),
        component: 'AISuggestion',
        data: { suggestionId, suggestion }
      });
      suggestionsRef.current.delete(suggestionId);
    }
  }, [trackEvent]);

  // --------------------------------------------------------------------------
  // AI ACTIONS
  // --------------------------------------------------------------------------

  const getAvailableActions = useCallback((): AIAction[] => {
    const actions: AIAction[] = [];

    // Add workflow-based actions
    if (currentWorkflow) {
      actions.push({
        id: 'continue_workflow',
        name: 'Continue Workflow',
        description: `Continue with ${currentWorkflow.workflowId}`,
        type: 'navigate',
        target: `/modelos/${currentWorkflow.workflowId}`,
        requiresConfirmation: false,
        requiresWallet: false
      });
    }

    // Add navigation actions
    actions.push({
      id: 'go_to_predictions',
      name: 'Create Prediction',
      description: 'Start creating a new prediction market',
      type: 'navigate',
      target: '/modelos?category=prediction',
      requiresConfirmation: false,
      requiresWallet: false
    });

    actions.push({
      id: 'go_to_tournaments',
      name: 'Create Tournament',
      description: 'Start creating a new tournament',
      type: 'navigate',
      target: '/modelos?category=tournament',
      requiresConfirmation: false,
      requiresWallet: false
    });

    // Add registered custom actions
    for (const [, action] of actionsRef.current) {
      actions.push(action);
    }

    return actions;
  }, [currentWorkflow]);

  const executeAction = useCallback(async (actionId: string): Promise<boolean> => {
    const actions = getAvailableActions();
    const action = actions.find(a => a.id === actionId);

    if (!action) {
      console.error(`Action ${actionId} not found`);
      return false;
    }

    trackEvent({
      type: 'ai_suggestion',
      page: getCurrentPage(),
      component: 'AIAction',
      data: { actionId, action },
      intent: 'execute_action'
    });

    try {
      switch (action.type) {
        case 'navigate':
          if (typeof window !== 'undefined') {
            window.location.href = action.target;
          }
          return true;

        case 'fill':
          // Fill form field
          const element = document.getElementById(action.target);
          if (element && 'value' in element) {
            (element as HTMLInputElement).value = String(action.params?.value || '');
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
          return true;

        case 'click':
          // Click element
          const clickElement = document.getElementById(action.target);
          if (clickElement) {
            clickElement.click();
          }
          return true;

        default:
          return false;
      }
    } catch (error) {
      console.error('Action execution failed:', error);
      return false;
    }
  }, [getAvailableActions, trackEvent]);

  // --------------------------------------------------------------------------
  // HISTORY & EXPORT
  // --------------------------------------------------------------------------

  const getRecentEvents = useCallback((count: number = 50): AIEvent[] => {
    return eventsRef.current.slice(-count);
  }, []);

  const exportSession = useCallback((): AISession => {
    return {
      id: sessionId,
      userId,
      startedAt: eventsRef.current[0]?.timestamp || Date.now(),
      lastActiveAt: eventsRef.current[eventsRef.current.length - 1]?.timestamp || Date.now(),
      events: eventsRef.current,
      context: {
        currentPage: getCurrentPage(),
        currentWorkflow: currentWorkflow?.workflowId,
        userPreferences: Object.fromEntries(
          getUserPatterns()
            .slice(0, 10)
            .map(p => [p.type, p.frequency])
        )
      }
    };
  }, [sessionId, userId, currentWorkflow, getUserPatterns]);

  // --------------------------------------------------------------------------
  // CONTEXT VALUE
  // --------------------------------------------------------------------------

  const value: AIContextValue = {
    sessionId,
    userId,
    setUserId,
    trackEvent,
    trackClick,
    trackInput,
    trackNavigation,
    trackTransaction,
    getSuggestions,
    registerSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    currentWorkflow,
    setCurrentWorkflow,
    getAvailableActions,
    executeAction,
    getRecentEvents,
    getUserPatterns,
    exportSession
  };

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

export function useAIContext(): AIContextValue {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAIContext must be used within AIContextProvider');
  }
  return context;
}

/**
 * Hook for tracking element interactions
 */
export function useAITracking(component: string) {
  const { trackClick, trackInput } = useAIContext();

  const onClickTracked = useCallback((
    elementId: string,
    data?: Record<string, unknown>
  ) => {
    return (e: React.MouseEvent) => {
      trackClick(elementId, component, data);
    };
  }, [trackClick, component]);

  const onChangeTracked = useCallback((
    field: string
  ) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      trackInput(field, e.target.value, component);
    };
  }, [trackInput, component]);

  return {
    onClickTracked,
    onChangeTracked
  };
}

/**
 * Hook for AI suggestions in a specific context
 */
export function useAISuggestions(context: string) {
  const { getSuggestions, acceptSuggestion, rejectSuggestion } = useAIContext();
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);

  useEffect(() => {
    setSuggestions(getSuggestions(context));
  }, [context, getSuggestions]);

  return {
    suggestions,
    accept: acceptSuggestion,
    reject: rejectSuggestion
  };
}

/**
 * Hook for workflow tracking
 */
export function useWorkflowTracking() {
  const { trackEvent, currentWorkflow, setCurrentWorkflow } = useAIContext();

  const startWorkflow = useCallback((workflowId: string, userId: string) => {
    const execution: WorkflowExecution = {
      workflowId,
      executionId: generateEventId(),
      userId,
      status: 'active',
      currentStepId: '',
      stepHistory: [],
      startedAt: Date.now()
    };

    setCurrentWorkflow(execution);

    trackEvent({
      type: 'workflow_start',
      page: getCurrentPage(),
      component: 'WorkflowEngine',
      data: { workflowId, executionId: execution.executionId }
    });

    return execution;
  }, [trackEvent, setCurrentWorkflow]);

  const completeStep = useCallback((stepId: string, data: unknown) => {
    if (currentWorkflow) {
      trackEvent({
        type: 'workflow_step',
        page: getCurrentPage(),
        component: 'WorkflowEngine',
        data: {
          workflowId: currentWorkflow.workflowId,
          stepId,
          stepData: data
        }
      });
    }
  }, [trackEvent, currentWorkflow]);

  const endWorkflow = useCallback((success: boolean) => {
    if (currentWorkflow) {
      trackEvent({
        type: 'workflow_complete',
        page: getCurrentPage(),
        component: 'WorkflowEngine',
        data: {
          workflowId: currentWorkflow.workflowId,
          success,
          duration: Date.now() - currentWorkflow.startedAt
        }
      });
      setCurrentWorkflow(undefined);
    }
  }, [trackEvent, currentWorkflow, setCurrentWorkflow]);

  return {
    currentWorkflow,
    startWorkflow,
    completeStep,
    endWorkflow
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function generateEventId(): string {
  return `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

function getCurrentPage(): string {
  if (typeof window !== 'undefined') {
    return window.location.pathname;
  }
  return 'unknown';
}

// ============================================================================
// AI AGENT INTERFACE
// ============================================================================

/**
 * Interface for external AI agents to interact with the system
 */
export interface AIAgentInterface {
  // Query current state
  getSession: () => AISession;
  getAvailableActions: () => AIAction[];
  getSuggestions: (context: string) => AISuggestion[];

  // Execute actions
  executeAction: (actionId: string) => Promise<boolean>;
  fillField: (fieldId: string, value: unknown) => boolean;
  clickElement: (elementId: string) => boolean;
  navigate: (path: string) => void;

  // Workflow control
  startWorkflow: (workflowId: string) => void;
  nextStep: (data?: unknown) => void;
  cancelWorkflow: () => void;
}

/**
 * Create an AI agent interface from context
 * This can be exposed to an external AI system
 */
export function createAIAgentInterface(context: AIContextValue): AIAgentInterface {
  return {
    getSession: context.exportSession,
    getAvailableActions: context.getAvailableActions,
    getSuggestions: context.getSuggestions,
    executeAction: context.executeAction,

    fillField: (fieldId: string, value: unknown) => {
      const element = document.getElementById(fieldId);
      if (element && 'value' in element) {
        (element as HTMLInputElement).value = String(value);
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    },

    clickElement: (elementId: string) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.click();
        return true;
      }
      return false;
    },

    navigate: (path: string) => {
      if (typeof window !== 'undefined') {
        window.location.href = path;
      }
    },

    startWorkflow: (_workflowId: string) => {
      // Would need to integrate with workflow engine
      console.log('Start workflow:', _workflowId);
    },

    nextStep: (_data?: unknown) => {
      // Would need to integrate with workflow engine
      console.log('Next step:', _data);
    },

    cancelWorkflow: () => {
      context.setCurrentWorkflow(undefined);
    }
  };
}
