/**
 * COMPETITION EVENT SYSTEM
 * ========================
 *
 * Real-time event system for competition updates.
 * Uses Server-Sent Events (SSE) for pushing updates to clients.
 *
 * EVENTS:
 * - competition.created      - New competition created
 * - competition.started      - Competition started
 * - competition.ended        - Competition ended
 * - competition.resolved     - Competition resolved with outcome
 * - competition.cancelled    - Competition cancelled
 * - participant.joined       - New participant joined
 * - participant.withdrew     - Participant withdrew
 * - bet.placed               - New bet placed
 * - bet.sold                 - Shares sold
 * - vote.cast                - Judge vote cast
 * - vote.result              - Voting result finalized
 * - prize.distributed        - Prizes distributed
 * - safe.transaction         - Safe transaction created/confirmed/executed
 * - market.update            - Market probability updated
 * - chat.message             - New chat message
 */

import { EventEmitter } from 'events';
import type {
  Competition,
  CompetitionCategory,
  TransparencyEvent,
} from '../types';
import {
  getPrizePoolTotal,
  getPrizePoolCurrency,
} from '../types';
import {
  REDIS_KEYS,
  getCompetitionStore,
  generateRedisId,
  type RedisEvent,
} from './redisSchema';

// =============================================================================
// EVENT TYPES
// =============================================================================

export type CompetitionEventType =
  | 'competition.created'
  | 'competition.started'
  | 'competition.ended'
  | 'competition.resolved'
  | 'competition.cancelled'
  | 'participant.joined'
  | 'participant.withdrew'
  | 'bet.placed'
  | 'bet.sold'
  | 'vote.cast'
  | 'vote.result'
  | 'prize.distributed'
  | 'safe.transaction'
  | 'safe.confirmation'
  | 'safe.execution'
  | 'market.update'
  | 'market.resolved'
  | 'chat.message'
  | 'dispute.created'
  | 'dispute.resolved'
  | 'error';

export interface CompetitionEvent {
  id: string;
  type: CompetitionEventType;
  competitionId: string;
  timestamp: number;
  actor?: string;
  data: Record<string, unknown>;
  verified: boolean;
}

export interface EventSubscription {
  id: string;
  competitionId?: string;
  category?: CompetitionCategory;
  types?: CompetitionEventType[];
  callback: (event: CompetitionEvent) => void;
}

// =============================================================================
// EVENT EMITTER
// =============================================================================

class CompetitionEventEmitter extends EventEmitter {
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventHistory: Map<string, CompetitionEvent[]> = new Map();
  private maxHistorySize = 100;

  constructor() {
    super();
    this.setMaxListeners(1000); // Allow many concurrent listeners
  }

  /**
   * Emit a competition event
   */
  emitCompetitionEvent(event: Omit<CompetitionEvent, 'id' | 'timestamp' | 'verified'>): string {
    const fullEvent: CompetitionEvent = {
      ...event,
      id: generateRedisId('evt'),
      timestamp: Date.now(),
      verified: true,
    };

    // Add to history
    const history = this.eventHistory.get(event.competitionId) || [];
    history.unshift(fullEvent);
    if (history.length > this.maxHistorySize) {
      history.pop();
    }
    this.eventHistory.set(event.competitionId, history);

    // Emit to global listeners
    this.emit('event', fullEvent);

    // Emit to competition-specific listeners
    this.emit(`competition:${event.competitionId}`, fullEvent);

    // Emit to type-specific listeners
    this.emit(`type:${event.type}`, fullEvent);

    // Store event in Redis for persistence
    this.persistEvent(fullEvent).catch(console.error);

    return fullEvent.id;
  }

  /**
   * Subscribe to events
   */
  subscribe(options: Omit<EventSubscription, 'id'>): string {
    const id = generateRedisId('sub');
    const subscription: EventSubscription = { ...options, id };
    this.subscriptions.set(id, subscription);

    // Set up listeners based on subscription options
    const handler = (event: CompetitionEvent) => {
      // Filter by competition if specified
      if (options.competitionId && event.competitionId !== options.competitionId) {
        return;
      }

      // Filter by event type if specified
      if (options.types && !options.types.includes(event.type)) {
        return;
      }

      options.callback(event);
    };

    if (options.competitionId) {
      this.on(`competition:${options.competitionId}`, handler);
    } else {
      this.on('event', handler);
    }

    // Store handler reference for cleanup
    (subscription as EventSubscription & { handler: typeof handler }).handler = handler;

    return id;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId) as
      | (EventSubscription & { handler?: (event: CompetitionEvent) => void })
      | undefined;

    if (!subscription) return false;

    if (subscription.handler) {
      if (subscription.competitionId) {
        this.off(`competition:${subscription.competitionId}`, subscription.handler);
      } else {
        this.off('event', subscription.handler);
      }
    }

    this.subscriptions.delete(subscriptionId);
    return true;
  }

  /**
   * Get event history for a competition
   */
  getEventHistory(competitionId: string, limit = 50): CompetitionEvent[] {
    const history = this.eventHistory.get(competitionId) || [];
    return history.slice(0, limit);
  }

  /**
   * Clear event history for a competition
   */
  clearHistory(competitionId: string): void {
    this.eventHistory.delete(competitionId);
  }

  /**
   * Persist event to Redis
   */
  private async persistEvent(event: CompetitionEvent): Promise<void> {
    try {
      const store = getCompetitionStore();
      const redisEvent: RedisEvent = {
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        actor: event.actor || 'system',
        action: this.getActionDescription(event),
        details: event.data,
        verified: event.verified,
      };
      await store.addEvent(event.competitionId, redisEvent);
    } catch (error) {
      console.error('Failed to persist event:', error);
    }
  }

  /**
   * Get human-readable action description
   */
  private getActionDescription(event: CompetitionEvent): string {
    const descriptions: Record<CompetitionEventType, string> = {
      'competition.created': 'Competition created',
      'competition.started': 'Competition started',
      'competition.ended': 'Competition ended',
      'competition.resolved': 'Competition resolved',
      'competition.cancelled': 'Competition cancelled',
      'participant.joined': 'Participant joined',
      'participant.withdrew': 'Participant withdrew',
      'bet.placed': 'Bet placed',
      'bet.sold': 'Shares sold',
      'vote.cast': 'Vote cast',
      'vote.result': 'Voting finalized',
      'prize.distributed': 'Prizes distributed',
      'safe.transaction': 'Safe transaction created',
      'safe.confirmation': 'Safe transaction confirmed',
      'safe.execution': 'Safe transaction executed',
      'market.update': 'Market probability updated',
      'market.resolved': 'Market resolved',
      'chat.message': 'Message sent',
      'dispute.created': 'Dispute created',
      'dispute.resolved': 'Dispute resolved',
      'error': 'Error occurred',
    };

    return descriptions[event.type] || 'Unknown action';
  }
}

// Singleton instance
let eventEmitter: CompetitionEventEmitter | null = null;

export function getEventEmitter(): CompetitionEventEmitter {
  if (!eventEmitter) {
    eventEmitter = new CompetitionEventEmitter();
  }
  return eventEmitter;
}

// =============================================================================
// SSE CONNECTION MANAGER
// =============================================================================

export interface SSEClient {
  id: string;
  competitionId?: string;
  response: {
    write: (data: string) => void;
    flush?: () => void;
  };
  subscriptionId?: string;
}

class SSEConnectionManager {
  private clients: Map<string, SSEClient> = new Map();

  /**
   * Add a new SSE client
   */
  addClient(client: SSEClient): void {
    this.clients.set(client.id, client);

    // Subscribe to events
    const emitter = getEventEmitter();
    const subscriptionId = emitter.subscribe({
      competitionId: client.competitionId,
      callback: (event) => this.sendEventToClient(client.id, event),
    });

    client.subscriptionId = subscriptionId;
  }

  /**
   * Remove an SSE client
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client?.subscriptionId) {
      const emitter = getEventEmitter();
      emitter.unsubscribe(client.subscriptionId);
    }
    this.clients.delete(clientId);
  }

  /**
   * Send event to a specific client
   */
  sendEventToClient(clientId: string, event: CompetitionEvent): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const data = `data: ${JSON.stringify(event)}\n\n`;
    try {
      client.response.write(data);
      client.response.flush?.();
    } catch (error) {
      // Client disconnected
      this.removeClient(clientId);
    }
  }

  /**
   * Broadcast event to all clients watching a competition
   */
  broadcastToCompetition(competitionId: string, event: CompetitionEvent): void {
    this.clients.forEach((client, clientId) => {
      if (!client.competitionId || client.competitionId === competitionId) {
        this.sendEventToClient(clientId, event);
      }
    });
  }

  /**
   * Get connected client count
   */
  getClientCount(competitionId?: string): number {
    if (!competitionId) {
      return this.clients.size;
    }
    let count = 0;
    this.clients.forEach((client) => {
      if (client.competitionId === competitionId) {
        count++;
      }
    });
    return count;
  }

  /**
   * Send heartbeat to all clients
   */
  sendHeartbeat(): void {
    const heartbeat = `:heartbeat\n\n`;
    this.clients.forEach((client, clientId) => {
      try {
        client.response.write(heartbeat);
        client.response.flush?.();
      } catch {
        this.removeClient(clientId);
      }
    });
  }
}

// Singleton instance
let connectionManager: SSEConnectionManager | null = null;

export function getSSEConnectionManager(): SSEConnectionManager {
  if (!connectionManager) {
    connectionManager = new SSEConnectionManager();

    // Send heartbeat every 30 seconds
    setInterval(() => {
      connectionManager?.sendHeartbeat();
    }, 30000);
  }
  return connectionManager;
}

// =============================================================================
// EVENT HELPER FUNCTIONS
// =============================================================================

/**
 * Emit a competition created event
 */
export function emitCompetitionCreated(
  competitionId: string,
  creator: string,
  competition: Partial<Competition>
): string {
  return getEventEmitter().emitCompetitionEvent({
    type: 'competition.created',
    competitionId,
    actor: creator,
    data: {
      title: competition.title,
      category: competition.category,
      prizePool: getPrizePoolTotal(competition.prizePool),
      currency: getPrizePoolCurrency(competition.prizePool),
    },
  });
}

/**
 * Emit a participant joined event
 */
export function emitParticipantJoined(
  competitionId: string,
  participant: string,
  entryFee?: number
): string {
  return getEventEmitter().emitCompetitionEvent({
    type: 'participant.joined',
    competitionId,
    actor: participant,
    data: {
      participant,
      entryFee,
      timestamp: Date.now(),
    },
  });
}

/**
 * Emit a bet placed event
 */
export function emitBetPlaced(
  competitionId: string,
  bettor: string,
  outcome: string,
  amount: number,
  shares: number,
  newProbability: number
): string {
  return getEventEmitter().emitCompetitionEvent({
    type: 'bet.placed',
    competitionId,
    actor: bettor,
    data: {
      bettor,
      outcome,
      amount,
      shares,
      newProbability,
    },
  });
}

/**
 * Emit a vote cast event
 */
export function emitVoteCast(
  competitionId: string,
  judge: string,
  outcome: string,
  weight: number
): string {
  return getEventEmitter().emitCompetitionEvent({
    type: 'vote.cast',
    competitionId,
    actor: judge,
    data: {
      judge,
      outcome,
      weight,
    },
  });
}

/**
 * Emit a Safe transaction event
 */
export function emitSafeTransaction(
  competitionId: string,
  safeAddress: string,
  safeTxHash: string,
  status: 'created' | 'confirmed' | 'executed',
  data?: Record<string, unknown>
): string {
  const typeMap = {
    created: 'safe.transaction',
    confirmed: 'safe.confirmation',
    executed: 'safe.execution',
  } as const;

  return getEventEmitter().emitCompetitionEvent({
    type: typeMap[status],
    competitionId,
    data: {
      safeAddress,
      safeTxHash,
      status,
      ...data,
    },
  });
}

/**
 * Emit a market update event
 */
export function emitMarketUpdate(
  competitionId: string,
  manifoldId: string,
  probability: number,
  volume: number
): string {
  return getEventEmitter().emitCompetitionEvent({
    type: 'market.update',
    competitionId,
    data: {
      manifoldId,
      probability,
      volume,
    },
  });
}

/**
 * Emit a chat message event
 */
export function emitChatMessage(
  competitionId: string,
  sender: string,
  message: string,
  messageType: 'text' | 'system' | 'bet' | 'vote' = 'text'
): string {
  return getEventEmitter().emitCompetitionEvent({
    type: 'chat.message',
    competitionId,
    actor: sender,
    data: {
      sender,
      message,
      messageType,
    },
  });
}

/**
 * Emit a competition resolved event
 */
export function emitCompetitionResolved(
  competitionId: string,
  outcome: string,
  resolver: string,
  prizeDistribution?: Array<{ address: string; amount: number }>
): string {
  return getEventEmitter().emitCompetitionEvent({
    type: 'competition.resolved',
    competitionId,
    actor: resolver,
    data: {
      outcome,
      resolver,
      prizeDistribution,
    },
  });
}

/**
 * Emit a prize distributed event
 */
export function emitPrizeDistributed(
  competitionId: string,
  safeAddress: string,
  txHash: string,
  recipients: Array<{ address: string; amount: number }>
): string {
  return getEventEmitter().emitCompetitionEvent({
    type: 'prize.distributed',
    competitionId,
    data: {
      safeAddress,
      txHash,
      recipients,
      totalDistributed: recipients.reduce((sum, r) => sum + r.amount, 0),
    },
  });
}

/**
 * Emit an error event
 */
export function emitError(
  competitionId: string,
  error: string,
  details?: Record<string, unknown>
): string {
  return getEventEmitter().emitCompetitionEvent({
    type: 'error',
    competitionId,
    data: {
      error,
      ...details,
    },
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  CompetitionEventEmitter,
  SSEConnectionManager,
};

export default getEventEmitter;
