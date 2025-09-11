// Flow Tracker - Detailed transaction flow tracing
// 🚀 Developed by mbxarts.com THE MOON IN A BOX LLC

interface FlowStep {
  id: string;
  timestamp: string;
  component: string;
  action: string;
  decision?: string;
  data?: any;
  result?: 'success' | 'error' | 'pending' | 'skipped';
  error?: string;
  path?: string;
}

interface FlowTrace {
  sessionId: string;
  userAddress: string;
  startTime: string;
  endTime?: string;
  finalResult?: 'success' | 'error' | 'abandoned';
  steps: FlowStep[];
  metadata?: any;
}

class FlowTracker {
  private static instance: FlowTracker;
  private currentTrace: FlowTrace | null = null;

  static getInstance(): FlowTracker {
    if (!FlowTracker.instance) {
      FlowTracker.instance = new FlowTracker();
    }
    return FlowTracker.instance;
  }

  startTrace(userAddress: string, metadata?: any): string {
    const sessionId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentTrace = {
      sessionId,
      userAddress,
      startTime: new Date().toISOString(),
      steps: [],
      metadata
    };

    this.addStep('FLOW_TRACKER', 'TRACE_STARTED', {
      sessionId,
      userAddress,
      metadata
    }, 'success');

    return sessionId;
  }

  addStep(
    component: string, 
    action: string, 
    data?: any, 
    result?: 'success' | 'error' | 'pending' | 'skipped',
    decision?: string,
    error?: string
  ) {
    if (!this.currentTrace) {
      console.warn('No active trace - starting emergency trace');
      this.startTrace('unknown');
    }

    const step: FlowStep = {
      id: `step_${this.currentTrace!.steps.length + 1}`,
      timestamp: new Date().toISOString(),
      component,
      action,
      data,
      result,
      decision,
      error,
      path: this.generateCurrentPath()
    };

    this.currentTrace!.steps.push(step);

    // Real-time logging
    console.log(`🔍 TRACE [${component}] ${action}:`, {
      result,
      decision,
      data: data ? JSON.stringify(data).substring(0, 100) + '...' : 'none'
    });

    // Send to backend for persistence
    this.persistStep(step);
  }

  addDecision(component: string, condition: string, result: boolean, data?: any) {
    this.addStep(
      component,
      'DECISION_POINT',
      { condition, conditionResult: result, ...data },
      'success',
      `IF(${condition}) = ${result} → ${result ? 'TRUE_PATH' : 'FALSE_PATH'}`
    );
  }

  addError(component: string, action: string, error: Error | string, data?: any) {
    this.addStep(
      component,
      action,
      { errorMessage: error instanceof Error ? error.message : error, ...data },
      'error',
      undefined,
      error instanceof Error ? error.stack : error
    );
  }

  finishTrace(finalResult: 'success' | 'error' | 'abandoned', metadata?: any) {
    if (!this.currentTrace) return;

    this.currentTrace.endTime = new Date().toISOString();
    this.currentTrace.finalResult = finalResult;
    if (metadata) this.currentTrace.metadata = { ...this.currentTrace.metadata, ...metadata };

    this.addStep('FLOW_TRACKER', 'TRACE_FINISHED', {
      finalResult,
      duration: this.calculateDuration(),
      totalSteps: this.currentTrace.steps.length,
      metadata
    }, finalResult === 'success' ? 'success' : 'error');

    // Persist complete trace
    this.persistCompleteTrace();
  }

  getCurrentTrace(): FlowTrace | null {
    return this.currentTrace;
  }

  getTraceId(): string | null {
    return this.currentTrace?.sessionId || null;
  }

  private generateCurrentPath(): string {
    if (!this.currentTrace) return 'unknown';
    
    const pathSteps = this.currentTrace.steps
      .filter(step => step.component !== 'FLOW_TRACKER')
      .map(step => `${step.component}.${step.action}`)
      .slice(-3); // Last 3 steps for context
    
    return pathSteps.join(' → ');
  }

  private calculateDuration(): number {
    if (!this.currentTrace || !this.currentTrace.endTime) return 0;
    
    const start = new Date(this.currentTrace.startTime).getTime();
    const end = new Date(this.currentTrace.endTime).getTime();
    return end - start;
  }

  private async persistStep(step: FlowStep) {
    try {
      await fetch('/api/debug/flow-trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'step',
          sessionId: this.currentTrace?.sessionId,
          step
        })
      });
    } catch (error) {
      console.warn('Failed to persist flow step:', error);
    }
  }

  private async persistCompleteTrace() {
    try {
      await fetch('/api/debug/flow-trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'complete',
          trace: this.currentTrace
        })
      });
    } catch (error) {
      console.warn('Failed to persist complete trace:', error);
    }
  }
}

// Export singleton instance
export const flowTracker = FlowTracker.getInstance();

// Convenience functions
export const startTrace = (userAddress: string, metadata?: any) => 
  flowTracker.startTrace(userAddress, metadata);

export const addStep = (component: string, action: string, data?: any, result?: 'success' | 'error' | 'pending' | 'skipped') => 
  flowTracker.addStep(component, action, data, result);

export const addDecision = (component: string, condition: string, result: boolean, data?: any) => 
  flowTracker.addDecision(component, condition, result, data);

export const addError = (component: string, action: string, error: Error | string, data?: any) => 
  flowTracker.addError(component, action, error, data);

export const finishTrace = (result: 'success' | 'error' | 'abandoned', metadata?: any) => 
  flowTracker.finishTrace(result, metadata);

export default flowTracker;