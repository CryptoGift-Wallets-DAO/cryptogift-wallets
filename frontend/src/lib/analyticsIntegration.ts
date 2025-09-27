/**
 * Analytics Integration Helper
 * 
 * Provides easy integration points for tracking gift events
 * throughout the application without coupling business logic
 * to analytics implementation
 */

import { recordGiftEvent, initializeCampaign, type GiftEvent } from './giftAnalytics';
import { debugLogger } from './secureDebugLogger';

/**
 * Track gift creation (mint)
 */
export async function trackGiftCreated(params: {
  tokenId: string;
  giftId?: string;
  campaignId?: string;
  creatorAddress?: string;
  referrer?: string;
  amount?: number;
  timeframe?: number;
  hasEducation?: boolean;
  educationModules?: number[];
  value?: number;
  txHash?: string;
  metadata?: any;
}): Promise<void> {
  try {
    const event: GiftEvent = {
      eventId: params.txHash ? `${params.txHash}-0` : `mint-${params.tokenId}-${Date.now()}`,
      type: 'created',
      campaignId: params.campaignId || 'default',
      giftId: params.giftId || params.tokenId,
      tokenId: params.tokenId,
      referrer: params.referrer,
      value: params.value,
      timestamp: Date.now(),
      txHash: params.txHash,
      metadata: params.metadata
    };
    
    await recordGiftEvent(event);
    debugLogger.operation('Gift created tracked', { tokenId: params.tokenId });
  } catch (error) {
    // Don't fail the main flow if analytics fails
    console.error('Failed to track gift creation:', error);
  }
}

/**
 * Track gift view (landing page)
 */
export async function trackGiftViewed(params: {
  tokenId: string;
  giftId?: string;
  campaignId?: string;
  viewerAddress?: string;
  hasEducationRequirements?: boolean;
  viewerIp?: string;
  metadata?: any;
}): Promise<void> {
  try {
    const event: GiftEvent = {
      eventId: `view-${params.tokenId}-${Date.now()}`,
      type: 'viewed',
      campaignId: params.campaignId || 'default',
      giftId: params.giftId || params.tokenId,
      tokenId: params.tokenId,
      timestamp: Date.now(),
      metadata: {
        ...params.metadata,
        viewerIp: params.viewerIp
      }
    };
    
    await recordGiftEvent(event);
    debugLogger.operation('Gift view tracked', { tokenId: params.tokenId });
  } catch (error) {
    console.error('Failed to track gift view:', error);
  }
}

/**
 * Track pre-claim started
 */
export async function trackPreClaimStarted(params: {
  tokenId: string;
  giftId?: string;
  campaignId?: string;
  claimerAddress?: string;
}): Promise<void> {
  try {
    const event: GiftEvent = {
      eventId: `preclaim-${params.tokenId}-${Date.now()}`,
      type: 'preClaim',
      campaignId: params.campaignId || 'default',
      giftId: params.giftId || params.tokenId,
      tokenId: params.tokenId,
      claimer: params.claimerAddress,
      timestamp: Date.now()
    };
    
    await recordGiftEvent(event);
    debugLogger.operation('Pre-claim tracked', { tokenId: params.tokenId });
  } catch (error) {
    console.error('Failed to track pre-claim:', error);
  }
}

/**
 * Track education progress (individual module)
 */
export async function trackEducationProgress(params: {
  giftId: string;
  tokenId: string;
  claimer: string;
  moduleId: number;
  moduleName: string;
  score: number;
  requiredScore: number;
  passed: boolean;
  completedModules: number;
  totalModules: number;
}): Promise<void> {
  try {
    debugLogger.operation('Education progress tracked', {
      giftId: params.giftId,
      moduleId: params.moduleId,
      score: params.score
    });
  } catch (error) {
    console.error('Failed to track education progress:', error);
  }
}

/**
 * Track education completed - COMPREHENSIVE VERSION
 * Tracks ALL details requested by user: questions, scores, time, email
 */
export async function trackEducationCompleted(params: {
  tokenId: string;
  giftId?: string;
  campaignId?: string;
  claimer?: string;
  claimerAddress?: string;
  educationModules?: string[];
  completedModules?: number[];
  totalScore?: number;
  completedAt?: string;

  // COMPREHENSIVE EDUCATION DATA
  moduleId?: number;
  moduleName?: string;
  totalQuestions?: number;
  correctAnswers?: number;
  incorrectAnswers?: number;
  requiredScore?: number;
  attempts?: number;
  timeSpentSeconds?: number;
  emailProvided?: string;
  questions?: Array<{
    id: number;
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    timeSpent: number;
  }>;
}): Promise<void> {
  try {
    const event: GiftEvent = {
      eventId: `education-${params.tokenId}-${Date.now()}`,
      type: 'education',
      campaignId: params.campaignId || 'default',
      giftId: params.giftId || params.tokenId,
      tokenId: params.tokenId,
      claimer: params.claimerAddress,
      timestamp: Date.now(),
      metadata: {
        // Legacy fields
        modules: params.educationModules,
        completedModules: params.completedModules,
        totalScore: params.totalScore,
        completedAt: params.completedAt,

        // COMPREHENSIVE NEW FIELDS REQUESTED BY USER
        moduleId: params.moduleId,
        moduleName: params.moduleName,
        totalQuestions: params.totalQuestions,
        correctAnswers: params.correctAnswers,
        incorrectAnswers: params.incorrectAnswers,
        score: params.totalScore,
        requiredScore: params.requiredScore,
        attempts: params.attempts,
        timeSpentSeconds: params.timeSpentSeconds,
        emailProvided: params.emailProvided,

        // QUESTION-BY-QUESTION BREAKDOWN
        questions: params.questions,

        // ANALYTICS SUMMARY
        passedEducation: (params.totalScore || 0) >= (params.requiredScore || 70),
        accuracyPercent: params.totalQuestions ?
          Math.round(((params.correctAnswers || 0) / params.totalQuestions) * 100) : 0,
        timePerQuestionAvg: params.totalQuestions && params.timeSpentSeconds ?
          Math.round(params.timeSpentSeconds / params.totalQuestions) : 0
      }
    };

    await recordGiftEvent(event);
    debugLogger.operation('Education completion tracked (COMPREHENSIVE)', {
      tokenId: params.tokenId,
      score: params.totalScore,
      questions: params.totalQuestions,
      correct: params.correctAnswers,
      email: params.emailProvided ? 'provided' : 'not provided'
    });
  } catch (error) {
    console.error('Failed to track education completion:', error);
  }
}

/**
 * Track gift claimed - COMPREHENSIVE VERSION
 * Tracks ALL claim details including education data, timestamps, wallet info
 */
export async function trackGiftClaimed(params: {
  tokenId: string;
  giftId?: string;
  campaignId?: string;
  claimerAddress: string;
  previousOwner?: string;
  txHash?: string;
  value?: number;
  metadata?: any;

  // COMPREHENSIVE CLAIM DATA
  claimedAt?: string;           // Exact timestamp
  educationCompleted?: boolean;
  educationScore?: number;
  emailProvided?: string;
  totalTimeToClaimMinutes?: number;
  modulesCompleted?: string[];
  gasUsed?: number;
  networkUsed?: string;
  tbaAddress?: string;
  currency?: string;
}): Promise<void> {
  try {
    const claimTimestamp = params.claimedAt ? new Date(params.claimedAt).getTime() : Date.now();

    const event: GiftEvent = {
      eventId: params.txHash ? `${params.txHash}-0` : `claim-${params.tokenId}-${Date.now()}`,
      type: 'claimed',
      campaignId: params.campaignId || 'default',
      giftId: params.giftId || params.tokenId,
      tokenId: params.tokenId,
      claimer: params.claimerAddress,
      value: params.value,
      timestamp: claimTimestamp,
      txHash: params.txHash,
      metadata: {
        // Legacy metadata
        ...params.metadata,

        // COMPREHENSIVE CLAIM DATA REQUESTED BY USER
        claimerAddress: params.claimerAddress,        // Wallet que hizo el reclamo
        previousOwner: params.previousOwner,          // Wallet anterior
        claimedAt: params.claimedAt || new Date().toISOString(), // Hora exacta del reclamo
        educationCompleted: params.educationCompleted,
        educationScore: params.educationScore,
        emailProvided: params.emailProvided,
        totalTimeToClaimMinutes: params.totalTimeToClaimMinutes,
        modulesCompleted: params.modulesCompleted,
        gasUsed: params.gasUsed || 0,
        networkUsed: params.networkUsed || 'Base Sepolia',
        tbaAddress: params.tbaAddress,
        value: params.value,
        currency: params.currency || 'USD',

        // TECHNICAL DETAILS
        txHash: params.txHash,
        claimMethod: params.gasUsed === 0 ? 'gasless' : 'gas-paid',
        blockTimestamp: claimTimestamp
      }
    };

    await recordGiftEvent(event);
    debugLogger.operation('Gift claim tracked (COMPREHENSIVE)', {
      tokenId: params.tokenId,
      claimer: params.claimerAddress.slice(0, 10) + '...',
      claimedAt: params.claimedAt,
      educationScore: params.educationScore,
      totalTime: params.totalTimeToClaimMinutes + ' minutes'
    });
  } catch (error) {
    console.error('Failed to track gift claim:', error);
  }
}

/**
 * Track gift expired
 */
export async function trackGiftExpired(params: {
  tokenId: string;
  giftId?: string;
  campaignId?: string;
  txHash?: string;
}): Promise<void> {
  try {
    const event: GiftEvent = {
      eventId: params.txHash ? `${params.txHash}-0` : `expire-${params.tokenId}-${Date.now()}`,
      type: 'expired',
      campaignId: params.campaignId || 'default',
      giftId: params.giftId || params.tokenId,
      tokenId: params.tokenId,
      timestamp: Date.now(),
      txHash: params.txHash
    };
    
    await recordGiftEvent(event);
    debugLogger.operation('Gift expiration tracked', { tokenId: params.tokenId });
  } catch (error) {
    console.error('Failed to track gift expiration:', error);
  }
}

/**
 * Track gift returned
 */
export async function trackGiftReturned(params: {
  tokenId: string;
  giftId?: string;
  campaignId?: string;
  returnedTo?: string;
  txHash?: string;
}): Promise<void> {
  try {
    const event: GiftEvent = {
      eventId: params.txHash ? `${params.txHash}-0` : `return-${params.tokenId}-${Date.now()}`,
      type: 'returned',
      campaignId: params.campaignId || 'default',
      giftId: params.giftId || params.tokenId,
      tokenId: params.tokenId,
      timestamp: Date.now(),
      txHash: params.txHash,
      metadata: {
        returnedTo: params.returnedTo
      }
    };
    
    await recordGiftEvent(event);
    debugLogger.operation('Gift return tracked', { tokenId: params.tokenId });
  } catch (error) {
    console.error('Failed to track gift return:', error);
  }
}

/**
 * Initialize a new campaign
 */
export async function trackCampaignCreated(params: {
  campaignId: string;
  name: string;
  owner: string;
  metadata?: any;
}): Promise<void> {
  try {
    await initializeCampaign(params.campaignId, params.name, params.owner);
    debugLogger.operation('Campaign created', { campaignId: params.campaignId });
  } catch (error) {
    console.error('Failed to track campaign creation:', error);
  }
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
  return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
}

/**
 * Send event to internal ingestion API
 * Used for client-side tracking
 */
export async function sendAnalyticsEvent(event: Partial<GiftEvent>): Promise<void> {
  if (!isAnalyticsEnabled()) {
    return;
  }
  
  try {
    const response = await fetch('/api/referrals/_internal/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.INTERNAL_API_SECRET || ''
      },
      body: JSON.stringify(event)
    });
    
    if (!response.ok) {
      console.error('Failed to send analytics event:', response.statusText);
    }
  } catch (error) {
    console.error('Failed to send analytics event:', error);
  }
}