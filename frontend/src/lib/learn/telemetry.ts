/**
 * LEARNING TELEMETRY SYSTEM
 * Sistema de tracking para módulos educativos
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

interface LearningEvent {
  eventName: string;
  moduleId: string;
  timestamp: number;
  userId?: string;
  sessionId: string;
  metadata?: Record<string, any>;
}

interface ModuleMetrics {
  startTime: number;
  endTime?: number;
  completionRate: number;
  interactions: number;
  timePerBlock: Record<string, number>;
  wowMoments: number;
  leadSubmitted: boolean;
  npsScore?: number;
}

class LearningTelemetry {
  private static instance: LearningTelemetry;
  private events: LearningEvent[] = [];
  private currentSession: string | null = null;
  private metrics: Map<string, ModuleMetrics> = new Map();

  private constructor() {
    this.initializeSession();
  }

  static getInstance(): LearningTelemetry {
    if (!this.instance) {
      this.instance = new LearningTelemetry();
    }
    return this.instance;
  }

  private initializeSession(): void {
    this.currentSession = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track a learning event
   */
  track(eventName: string, metadata?: Record<string, any>): void {
    const event: LearningEvent = {
      eventName,
      moduleId: metadata?.moduleId || 'unknown',
      timestamp: Date.now(),
      sessionId: this.currentSession!,
      userId: this.getUserId(),
      metadata
    };

    this.events.push(event);
    this.sendToAnalytics(event);
    this.updateMetrics(event);
  }

  /**
   * Start tracking a module
   */
  startModule(moduleId: string): void {
    const metrics: ModuleMetrics = {
      startTime: Date.now(),
      completionRate: 0,
      interactions: 0,
      timePerBlock: {},
      wowMoments: 0,
      leadSubmitted: false
    };

    this.metrics.set(moduleId, metrics);
    this.track('module_started', { moduleId });
  }

  /**
   * Track block completion
   */
  completeBlock(moduleId: string, blockId: string, duration: number): void {
    const metrics = this.metrics.get(moduleId);
    if (metrics) {
      metrics.timePerBlock[blockId] = duration;
      metrics.completionRate = (Object.keys(metrics.timePerBlock).length / 7) * 100; // Assuming 7 blocks
      this.track('block_completed', { 
        moduleId, 
        blockId, 
        duration,
        completionRate: metrics.completionRate 
      });
    }
  }

  /**
   * Track wow moment
   */
  trackWowMoment(moduleId: string, context: string): void {
    const metrics = this.metrics.get(moduleId);
    if (metrics) {
      metrics.wowMoments++;
      this.track('wow_moment', { moduleId, context });
    }
  }

  /**
   * Track interaction
   */
  trackInteraction(moduleId: string, interactionType: string, data?: any): void {
    const metrics = this.metrics.get(moduleId);
    if (metrics) {
      metrics.interactions++;
      this.track('user_interaction', { 
        moduleId, 
        interactionType, 
        ...data 
      });
    }
  }

  /**
   * Complete module
   */
  completeModule(moduleId: string, leadData?: any): void {
    const metrics = this.metrics.get(moduleId);
    if (metrics) {
      metrics.endTime = Date.now();
      if (leadData) {
        metrics.leadSubmitted = true;
        metrics.npsScore = leadData.nps;
      }

      const totalDuration = metrics.endTime - metrics.startTime;
      
      this.track('module_completed', {
        moduleId,
        totalDuration,
        completionRate: metrics.completionRate,
        interactions: metrics.interactions,
        wowMoments: metrics.wowMoments,
        leadSubmitted: metrics.leadSubmitted,
        npsScore: metrics.npsScore
      });

      this.saveToLocalStorage(moduleId, metrics);
    }
  }

  /**
   * Get metrics for a module
   */
  getMetrics(moduleId: string): ModuleMetrics | undefined {
    return this.metrics.get(moduleId);
  }

  /**
   * Get all events for current session
   */
  getSessionEvents(): LearningEvent[] {
    return this.events.filter(e => e.sessionId === this.currentSession);
  }

  /**
   * Send event to analytics (GA, Mixpanel, etc.)
   */
  private sendToAnalytics(event: LearningEvent): void {
    // Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event.eventName, {
        module_id: event.moduleId,
        session_id: event.sessionId,
        ...event.metadata
      });
    }

    // Console log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Learning Event:', event);
    }
  }

  /**
   * Update metrics based on event
   */
  private updateMetrics(event: LearningEvent): void {
    // Update any aggregate metrics here
  }

  /**
   * Save progress to localStorage
   */
  private saveToLocalStorage(moduleId: string, metrics: ModuleMetrics): void {
    if (typeof window !== 'undefined') {
      const key = `learn_progress_${moduleId}`;
      localStorage.setItem(key, JSON.stringify({
        metrics,
        lastUpdated: Date.now()
      }));
    }
  }

  /**
   * Get or create anonymous user ID
   */
  private getUserId(): string {
    if (typeof window === 'undefined') return 'server';
    
    let userId = localStorage.getItem('learn_user_id');
    if (!userId) {
      userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('learn_user_id', userId);
    }
    return userId;
  }

  /**
   * Export metrics for reporting
   */
  exportMetrics(): {
    session: string;
    events: LearningEvent[];
    metrics: Record<string, ModuleMetrics>;
  } {
    return {
      session: this.currentSession!,
      events: this.events,
      metrics: Object.fromEntries(this.metrics)
    };
  }
}

export const telemetry = LearningTelemetry.getInstance();

/**
 * React hook for telemetry
 */
export function useLearningTelemetry(moduleId: string) {
  const [metrics, setMetrics] = React.useState<ModuleMetrics | undefined>();

  React.useEffect(() => {
    telemetry.startModule(moduleId);
    
    return () => {
      // Cleanup if needed
    };
  }, [moduleId]);

  const trackEvent = React.useCallback((eventName: string, metadata?: Record<string, any>) => {
    telemetry.track(eventName, { moduleId, ...metadata });
  }, [moduleId]);

  const trackBlock = React.useCallback((blockId: string, duration: number) => {
    telemetry.completeBlock(moduleId, blockId, duration);
    setMetrics(telemetry.getMetrics(moduleId));
  }, [moduleId]);

  const trackWow = React.useCallback((context: string) => {
    telemetry.trackWowMoment(moduleId, context);
    setMetrics(telemetry.getMetrics(moduleId));
  }, [moduleId]);

  const trackInteraction = React.useCallback((type: string, data?: any) => {
    telemetry.trackInteraction(moduleId, type, data);
    setMetrics(telemetry.getMetrics(moduleId));
  }, [moduleId]);

  const complete = React.useCallback((leadData?: any) => {
    telemetry.completeModule(moduleId, leadData);
    setMetrics(telemetry.getMetrics(moduleId));
  }, [moduleId]);

  return {
    metrics,
    trackEvent,
    trackBlock,
    trackWow,
    trackInteraction,
    complete
  };
}

// Import React for hooks
import React from 'react';