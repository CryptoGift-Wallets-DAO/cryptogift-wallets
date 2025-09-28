/**
 * EDUCATION TRACKING SYSTEM
 * Captures comprehensive educational journey data for analytics
 *
 * Tracks:
 * - Individual question responses (correct/incorrect)
 * - Time spent on each module
 * - Score achieved
 * - Email collected
 * - Wallet address
 * - Complete interaction flow
 */

import { Redis } from '@upstash/redis';
import { debugLogger } from '@/lib/secureDebugLogger';
import { getCanonicalEventId, processBlockchainEvent } from './canonicalEvents';

export interface EducationQuestion {
  questionId: string;
  questionText: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpent: number; // seconds
  attemptNumber: number;
}

export interface EducationSession {
  sessionId: string;
  tokenId: string;
  giftId: string;
  claimerAddress: string;
  email?: string;
  emailHash?: string; // SHA-256 hash for privacy

  // Education Details
  moduleId: string;
  moduleName: string;
  startedAt: number;
  completedAt?: number;
  totalTimeSpent: number; // seconds

  // Performance Metrics
  questionsAnswered: EducationQuestion[];
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  score: number; // percentage
  passed: boolean;

  // Engagement Metrics
  videoWatched: boolean;
  videoWatchTime?: number;
  resourcesViewed: string[];
  interactions: Array<{
    type: string;
    timestamp: number;
    data?: any;
  }>;

  // Metadata
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  campaignId?: string;
}

class EducationTracker {
  private redis?: Redis;
  private sessions: Map<string, EducationSession> = new Map();

  constructor() {
    // Initialize Redis if configured
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN
      });
    }
  }

  /**
   * Start a new education session
   */
  async startSession(params: {
    sessionId: string;
    tokenId: string;
    giftId: string;
    claimerAddress: string;
    moduleId: string;
    moduleName: string;
    email?: string;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    campaignId?: string;
  }): Promise<EducationSession> {
    const session: EducationSession = {
      sessionId: params.sessionId,
      tokenId: params.tokenId,
      giftId: params.giftId,
      claimerAddress: params.claimerAddress.toLowerCase(),
      email: params.email,
      moduleId: params.moduleId,
      moduleName: params.moduleName,
      startedAt: Date.now(),
      totalTimeSpent: 0,
      questionsAnswered: [],
      totalQuestions: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      score: 0,
      passed: false,
      videoWatched: false,
      resourcesViewed: [],
      interactions: [],
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      referrer: params.referrer,
      campaignId: params.campaignId
    };

    // Store in memory
    this.sessions.set(params.sessionId, session);

    // Store in Redis if available
    if (this.redis) {
      try {
        await this.redis.setex(
          `education:session:${params.sessionId}`,
          3600, // 1 hour TTL
          JSON.stringify(session)
        );

        // Track session start event
        await this.trackEvent('education_started', session);

        debugLogger.operation('Education session started', {
          sessionId: params.sessionId,
          tokenId: params.tokenId,
          module: params.moduleName
        });
      } catch (error) {
        debugLogger.error('Failed to store education session', error);
      }
    }

    return session;
  }

  /**
   * Record a question answer
   */
  async recordAnswer(params: {
    sessionId: string;
    questionId: string;
    questionText: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    timeSpent: number;
    attemptNumber?: number;
  }): Promise<void> {
    const session = await this.getSession(params.sessionId);
    if (!session) {
      debugLogger.error('Session not found', new Error(`Session not found: ${params.sessionId}`));
      return;
    }

    const question: EducationQuestion = {
      questionId: params.questionId,
      questionText: params.questionText,
      selectedAnswer: params.selectedAnswer,
      correctAnswer: params.correctAnswer,
      isCorrect: params.isCorrect,
      timeSpent: params.timeSpent,
      attemptNumber: params.attemptNumber || 1
    };

    // Update session
    session.questionsAnswered.push(question);
    session.totalQuestions = Math.max(session.totalQuestions, session.questionsAnswered.length);

    if (params.isCorrect) {
      session.correctAnswers++;
    } else {
      session.incorrectAnswers++;
    }

    // Calculate score
    if (session.totalQuestions > 0) {
      session.score = Math.round((session.correctAnswers / session.totalQuestions) * 100);
    }

    // Track interaction
    session.interactions.push({
      type: 'question_answered',
      timestamp: Date.now(),
      data: {
        questionId: params.questionId,
        isCorrect: params.isCorrect,
        timeSpent: params.timeSpent
      }
    });

    await this.updateSession(session);

    // Track answer event
    await this.trackEvent('question_answered', {
      ...session,
      lastQuestion: question
    });
  }

  /**
   * Record video watch progress
   */
  async recordVideoWatch(sessionId: string, watchTime: number): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    session.videoWatched = true;
    session.videoWatchTime = (session.videoWatchTime || 0) + watchTime;

    session.interactions.push({
      type: 'video_watched',
      timestamp: Date.now(),
      data: { watchTime }
    });

    await this.updateSession(session);
  }

  /**
   * Record resource view
   */
  async recordResourceView(sessionId: string, resourceId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    if (!session.resourcesViewed.includes(resourceId)) {
      session.resourcesViewed.push(resourceId);
    }

    session.interactions.push({
      type: 'resource_viewed',
      timestamp: Date.now(),
      data: { resourceId }
    });

    await this.updateSession(session);
  }

  /**
   * Complete education session
   */
  async completeSession(sessionId: string, passed: boolean): Promise<EducationSession | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    session.completedAt = Date.now();
    session.totalTimeSpent = Math.round((session.completedAt - session.startedAt) / 1000); // seconds
    session.passed = passed;

    await this.updateSession(session);

    // Store permanent record
    if (this.redis) {
      try {
        // Store in permanent education records
        await this.redis.hset(
          `education:gift:${session.giftId}`,
          {
            tokenId: session.tokenId,
            claimerAddress: session.claimerAddress,
            email: session.email || '',
            moduleId: session.moduleId,
            moduleName: session.moduleName,
            completedAt: session.completedAt.toString(),
            totalTimeSpent: session.totalTimeSpent.toString(),
            score: session.score.toString(),
            passed: passed.toString(),
            correctAnswers: session.correctAnswers.toString(),
            incorrectAnswers: session.incorrectAnswers.toString(),
            questionsDetail: JSON.stringify(session.questionsAnswered)
          }
        );

        // Store by claimer address for lookup
        await this.redis.sadd(
          `education:claimer:${session.claimerAddress}`,
          session.giftId
        );

        // Track completion event
        await this.trackEvent('education_completed', session);

        // Process as blockchain event for canonical system
        if (this.redis) {
          await processBlockchainEvent(
            this.redis,
            'EducationCompleted',
            `education_${session.sessionId}`,
            0,
            BigInt(Date.now()),
            Date.now(),
            {
              giftId: session.giftId,
              tokenId: session.tokenId,
              claimer: session.claimerAddress,
              educationData: JSON.stringify({
                score: session.score,
                passed: session.passed,
                questionsAnswered: session.questionsAnswered,
                email: session.email
              })
            },
            'realtime'
          );
        }

        debugLogger.operation('Education session completed', {
          sessionId,
          giftId: session.giftId,
          score: session.score,
          passed
        });

      } catch (error) {
        debugLogger.error('Failed to store education completion', error);
      }
    }

    // Clear from memory
    this.sessions.delete(sessionId);

    return session;
  }

  /**
   * Get education data for a gift
   */
  async getGiftEducationData(giftId: string): Promise<any> {
    if (!this.redis) return null;

    try {
      const data = await this.redis.hgetall(`education:gift:${giftId}`);
      if (data && data.questionsDetail) {
        data.questionsDetail = JSON.parse(data.questionsDetail as string);
      }
      return data;
    } catch (error) {
      debugLogger.error('Failed to get gift education data', error);
      return null;
    }
  }

  /**
   * Get education history for a claimer
   */
  async getClaimerEducationHistory(claimerAddress: string): Promise<string[]> {
    if (!this.redis) return [];

    try {
      const giftIds = await this.redis.smembers(`education:claimer:${claimerAddress.toLowerCase()}`);
      return giftIds as string[];
    } catch (error) {
      debugLogger.error('Failed to get claimer education history', error);
      return [];
    }
  }

  // Private helper methods

  private async getSession(sessionId: string): Promise<EducationSession | null> {
    // Check memory first
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)!;
    }

    // Try Redis
    if (this.redis) {
      try {
        const data = await this.redis.get(`education:session:${sessionId}`);
        if (data) {
          const session = JSON.parse(data as string) as EducationSession;
          this.sessions.set(sessionId, session);
          return session;
        }
      } catch (error) {
        debugLogger.error('Failed to get session from Redis', error);
      }
    }

    return null;
  }

  private async updateSession(session: EducationSession): Promise<void> {
    // Update memory
    this.sessions.set(session.sessionId, session);

    // Update Redis
    if (this.redis) {
      try {
        await this.redis.setex(
          `education:session:${session.sessionId}`,
          3600, // 1 hour TTL
          JSON.stringify(session)
        );
      } catch (error) {
        debugLogger.error('Failed to update session in Redis', error);
      }
    }
  }

  private async trackEvent(eventType: string, data: any): Promise<void> {
    if (!this.redis) return;

    try {
      const eventId = `education_${eventType}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      // Add to event stream
      await this.redis.xadd(
        'ga:education_events',
        '*',
        {
          eventId,
          type: eventType,
          sessionId: data.sessionId,
          giftId: data.giftId,
          tokenId: data.tokenId,
          claimerAddress: data.claimerAddress,
          timestamp: Date.now().toString(),
          data: JSON.stringify(data)
        }
      );
    } catch (error) {
      debugLogger.error('Failed to track education event', error);
    }
  }
}

// Export singleton instance
export const educationTracker = new EducationTracker();

// Export convenience functions
export async function startEducationSession(params: Parameters<EducationTracker['startSession']>[0]) {
  return educationTracker.startSession(params);
}

export async function recordEducationAnswer(params: Parameters<EducationTracker['recordAnswer']>[0]) {
  return educationTracker.recordAnswer(params);
}

export async function completeEducationSession(sessionId: string, passed: boolean) {
  return educationTracker.completeSession(sessionId, passed);
}

export async function getGiftEducationDetails(giftId: string) {
  return educationTracker.getGiftEducationData(giftId);
}

export async function getClaimerEducationHistory(claimerAddress: string) {
  return educationTracker.getClaimerEducationHistory(claimerAddress);
}