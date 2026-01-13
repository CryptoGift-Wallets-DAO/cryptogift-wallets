/**
 * COMPETITION REDIS SCHEMA
 * ========================
 *
 * Comprehensive Redis schema for the competition system.
 * This file defines all Redis keys, data structures, and utility functions
 * for storing and retrieving competition data.
 *
 * KEY NAMING CONVENTIONS:
 * - competition:{id}                    - Main competition object
 * - competitions:all                    - Sorted set of all competitions by timestamp
 * - competitions:{category}             - Set of competition IDs by category
 * - competitions:status:{status}        - Set of competition IDs by status
 * - user:{address}:competitions         - Set of competitions created by user
 * - user:{address}:participations       - Set of competitions user has joined
 * - user:{address}:bets                 - List of user's bets across competitions
 * - competition:{id}:participants       - Hash of participant data
 * - competition:{id}:bets               - List of bets for this competition
 * - competition:{id}:votes              - Hash of judge votes
 * - competition:{id}:events             - List of transparency events
 * - competition:{id}:chat               - List of chat messages
 * - safe:{address}:transactions         - List of Safe transaction history
 * - market:{manifoldId}:history         - Time series of market probability
 */

import { Redis } from '@upstash/redis';
import { getRedisConnection, isRedisConfigured } from '../../lib/redisConfig';
import type {
  Competition,
  CompetitionCategory,
  CompetitionStatus,
  TransparencyEvent,
} from '../types';
import {
  getCreatorAddress,
  getParticipantCount,
  isParticipantList,
} from '../types';

// =============================================================================
// KEY GENERATORS
// =============================================================================

export const REDIS_KEYS = {
  // Competition keys
  competition: (id: string) => `competition:${id}`,
  competitionParticipants: (id: string) => `competition:${id}:participants`,
  competitionBets: (id: string) => `competition:${id}:bets`,
  competitionVotes: (id: string) => `competition:${id}:votes`,
  competitionEvents: (id: string) => `competition:${id}:events`,
  competitionChat: (id: string) => `competition:${id}:chat`,

  // Index keys
  allCompetitions: 'competitions:all',
  competitionsByCategory: (category: CompetitionCategory) => `competitions:${category}`,
  competitionsByStatus: (status: CompetitionStatus) => `competitions:status:${status}`,

  // User keys
  userCompetitions: (address: string) => `user:${address.toLowerCase()}:competitions`,
  userParticipations: (address: string) => `user:${address.toLowerCase()}:participations`,
  userBets: (address: string) => `user:${address.toLowerCase()}:bets`,

  // Safe keys
  safeTransactions: (address: string) => `safe:${address.toLowerCase()}:transactions`,
  safePending: (address: string) => `safe:${address.toLowerCase()}:pending`,

  // Market keys
  marketHistory: (manifoldId: string) => `market:${manifoldId}:history`,
  marketBets: (manifoldId: string) => `market:${manifoldId}:bets`,

  // Leaderboard keys
  leaderboardGlobal: 'leaderboard:global',
  leaderboardCategory: (category: CompetitionCategory) => `leaderboard:${category}`,
  leaderboardCompetition: (id: string) => `leaderboard:competition:${id}`,

  // Statistics keys
  statsGlobal: 'stats:global',
  statsCategory: (category: CompetitionCategory) => `stats:${category}`,
  statsDaily: (date: string) => `stats:daily:${date}`,
} as const;

// =============================================================================
// DATA STRUCTURES
// =============================================================================

/**
 * Competition data stored in Redis
 * Full Competition object serialized as JSON
 */
export interface RedisCompetition extends Competition {
  // Additional Redis-specific fields
  _version: number;
  _updatedAt: number;
  _createdAt: number;
}

/**
 * Participant entry in competition hash
 */
export interface RedisParticipant {
  address: string;
  joinedAt: number;
  entryFee: number;
  status: 'active' | 'disqualified' | 'withdrawn';
  metadata?: Record<string, unknown>;
}

/**
 * Bet entry in competition list
 */
export interface RedisBet {
  id: string;
  competitionId: string;
  userId: string;
  outcome: string;
  amount: number;
  shares: number;
  probability: number;
  timestamp: number;
  manifoldBetId?: string;
}

/**
 * Vote entry in competition hash
 */
export interface RedisVote {
  judgeAddress: string;
  outcome: string;
  weight: number;
  timestamp: number;
  reason?: string;
  signature?: string;
}

/**
 * Transparency event entry
 */
export interface RedisEvent extends TransparencyEvent {
  id: string;
}

/**
 * Chat message entry
 */
export interface RedisChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: number;
  type: 'text' | 'system' | 'bet' | 'vote';
  metadata?: Record<string, unknown>;
}

/**
 * Safe transaction entry
 */
export interface RedisSafeTransaction {
  safeTxHash: string;
  to: string;
  value: string;
  data: string;
  operation: number;
  nonce: number;
  status: 'pending' | 'confirmed' | 'executed' | 'failed';
  confirmations: string[];
  executedAt?: number;
  txHash?: string;
}

/**
 * Market history point
 */
export interface RedisMarketHistory {
  timestamp: number;
  probability: number;
  volume: number;
  trades: number;
}

/**
 * Global statistics
 */
export interface RedisGlobalStats {
  totalCompetitions: number;
  activeCompetitions: number;
  totalPrizePool: number;
  totalParticipants: number;
  totalBets: number;
  totalVolume: number;
  lastUpdated: number;
}

// =============================================================================
// COMPETITION STORE
// =============================================================================

export class CompetitionStore {
  private redis: Redis;

  constructor() {
    if (!isRedisConfigured()) {
      throw new Error('Redis not configured for CompetitionStore');
    }
    this.redis = getRedisConnection();
  }

  // ---------------------------------------------------------------------------
  // COMPETITION CRUD
  // ---------------------------------------------------------------------------

  /**
   * Create a new competition
   */
  async createCompetition(competition: Competition): Promise<string> {
    const redisCompetition: RedisCompetition = {
      ...competition,
      _version: 1,
      _createdAt: Date.now(),
      _updatedAt: Date.now(),
    };

    const key = REDIS_KEYS.competition(competition.id);

    // Use transaction for atomic creation
    const pipeline = this.redis.pipeline();

    // Store main competition object
    pipeline.set(key, JSON.stringify(redisCompetition));

    // Add to indices
    pipeline.zadd(REDIS_KEYS.allCompetitions, {
      score: Date.now(),
      member: competition.id,
    });
    pipeline.sadd(REDIS_KEYS.competitionsByCategory(competition.category), competition.id);
    pipeline.sadd(REDIS_KEYS.competitionsByStatus(competition.status), competition.id);
    pipeline.sadd(REDIS_KEYS.userCompetitions(getCreatorAddress(competition.creator)), competition.id);

    await pipeline.exec();

    return competition.id;
  }

  /**
   * Get a competition by ID
   */
  async getCompetition(id: string): Promise<RedisCompetition | null> {
    const data = await this.redis.get<string>(REDIS_KEYS.competition(id));
    if (!data) return null;

    return typeof data === 'string' ? JSON.parse(data) : data;
  }

  /**
   * Update a competition
   */
  async updateCompetition(
    id: string,
    updates: Partial<Competition>
  ): Promise<RedisCompetition | null> {
    const existing = await this.getCompetition(id);
    if (!existing) return null;

    const oldStatus = existing.status;
    const updated: RedisCompetition = {
      ...existing,
      ...updates,
      _version: existing._version + 1,
      _updatedAt: Date.now(),
    };

    const pipeline = this.redis.pipeline();

    // Update main object
    pipeline.set(REDIS_KEYS.competition(id), JSON.stringify(updated));

    // Update status index if changed
    if (updates.status && updates.status !== oldStatus) {
      pipeline.srem(REDIS_KEYS.competitionsByStatus(oldStatus), id);
      pipeline.sadd(REDIS_KEYS.competitionsByStatus(updates.status), id);
    }

    await pipeline.exec();

    return updated;
  }

  /**
   * Delete a competition
   */
  async deleteCompetition(id: string): Promise<boolean> {
    const competition = await this.getCompetition(id);
    if (!competition) return false;

    const pipeline = this.redis.pipeline();

    // Remove main object
    pipeline.del(REDIS_KEYS.competition(id));

    // Remove from indices
    pipeline.zrem(REDIS_KEYS.allCompetitions, id);
    pipeline.srem(REDIS_KEYS.competitionsByCategory(competition.category), id);
    pipeline.srem(REDIS_KEYS.competitionsByStatus(competition.status), id);
    pipeline.srem(REDIS_KEYS.userCompetitions(getCreatorAddress(competition.creator)), id);

    // Remove related data
    pipeline.del(REDIS_KEYS.competitionParticipants(id));
    pipeline.del(REDIS_KEYS.competitionBets(id));
    pipeline.del(REDIS_KEYS.competitionVotes(id));
    pipeline.del(REDIS_KEYS.competitionEvents(id));
    pipeline.del(REDIS_KEYS.competitionChat(id));

    await pipeline.exec();

    return true;
  }

  // ---------------------------------------------------------------------------
  // LISTING & SEARCH
  // ---------------------------------------------------------------------------

  /**
   * List competitions with pagination
   */
  async listCompetitions(options: {
    category?: CompetitionCategory;
    status?: CompetitionStatus;
    creator?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'created' | 'updated' | 'prize';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ competitions: RedisCompetition[]; total: number }> {
    const { limit = 20, offset = 0, sortOrder = 'desc' } = options;

    let ids: string[];
    let total: number;

    if (options.creator) {
      // Filter by creator
      ids = await this.redis.smembers(REDIS_KEYS.userCompetitions(options.creator));
      total = ids.length;
    } else if (options.category) {
      // Filter by category
      ids = await this.redis.smembers(REDIS_KEYS.competitionsByCategory(options.category));
      total = ids.length;
    } else if (options.status) {
      // Filter by status
      ids = await this.redis.smembers(REDIS_KEYS.competitionsByStatus(options.status));
      total = ids.length;
    } else {
      // Get all from sorted set
      total = await this.redis.zcard(REDIS_KEYS.allCompetitions);

      if (sortOrder === 'desc') {
        ids = await this.redis.zrange(REDIS_KEYS.allCompetitions, offset, offset + limit - 1, {
          rev: true,
        });
      } else {
        ids = await this.redis.zrange(REDIS_KEYS.allCompetitions, offset, offset + limit - 1);
      }
    }

    // Apply pagination for set-based queries
    if (options.category || options.status || options.creator) {
      ids = ids.slice(offset, offset + limit);
    }

    // Fetch full competition objects
    const competitions: RedisCompetition[] = [];
    for (const id of ids) {
      const comp = await this.getCompetition(id);
      if (comp) competitions.push(comp);
    }

    return { competitions, total };
  }

  /**
   * Search competitions by text
   */
  async searchCompetitions(query: string, limit = 20): Promise<RedisCompetition[]> {
    // Get all competition IDs
    const ids = await this.redis.zrange(REDIS_KEYS.allCompetitions, 0, -1);

    const results: RedisCompetition[] = [];
    const queryLower = query.toLowerCase();

    for (const id of ids) {
      const comp = await this.getCompetition(id as string);
      if (comp) {
        const matches =
          comp.title.toLowerCase().includes(queryLower) ||
          comp.description?.toLowerCase().includes(queryLower);

        if (matches) {
          results.push(comp);
          if (results.length >= limit) break;
        }
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // PARTICIPANTS
  // ---------------------------------------------------------------------------

  /**
   * Add a participant to a competition
   */
  async addParticipant(
    competitionId: string,
    participant: RedisParticipant
  ): Promise<boolean> {
    const key = REDIS_KEYS.competitionParticipants(competitionId);
    await this.redis.hset(key, { [participant.address.toLowerCase()]: JSON.stringify(participant) });

    // Update user's participations
    await this.redis.sadd(
      REDIS_KEYS.userParticipations(participant.address),
      competitionId
    );

    // Update competition participant count
    const competition = await this.getCompetition(competitionId);
    if (competition) {
      const currentCount = getParticipantCount(competition.participants);
      await this.updateCompetition(competitionId, {
        participants: {
          current: currentCount + 1,
          maxParticipants: isParticipantList(competition.participants)
            ? competition.participants.maxParticipants
            : undefined,
          list: isParticipantList(competition.participants)
            ? competition.participants.list
            : competition.participants,
        },
      });
    }

    return true;
  }

  /**
   * Get all participants for a competition
   */
  async getParticipants(competitionId: string): Promise<RedisParticipant[]> {
    const key = REDIS_KEYS.competitionParticipants(competitionId);
    const data = await this.redis.hgetall<Record<string, string>>(key);

    if (!data) return [];

    return Object.values(data).map((v) =>
      typeof v === 'string' ? JSON.parse(v) : v
    );
  }

  /**
   * Get a specific participant
   */
  async getParticipant(
    competitionId: string,
    address: string
  ): Promise<RedisParticipant | null> {
    const key = REDIS_KEYS.competitionParticipants(competitionId);
    const data = await this.redis.hget<string>(key, address.toLowerCase());

    if (!data) return null;
    return typeof data === 'string' ? JSON.parse(data) : data;
  }

  /**
   * Update a participant's status
   */
  async updateParticipant(
    competitionId: string,
    address: string,
    updates: Partial<RedisParticipant>
  ): Promise<boolean> {
    const existing = await this.getParticipant(competitionId, address);
    if (!existing) return false;

    const updated = { ...existing, ...updates };
    const key = REDIS_KEYS.competitionParticipants(competitionId);
    await this.redis.hset(key, { [address.toLowerCase()]: JSON.stringify(updated) });

    return true;
  }

  // ---------------------------------------------------------------------------
  // BETS
  // ---------------------------------------------------------------------------

  /**
   * Record a bet
   */
  async addBet(bet: RedisBet): Promise<string> {
    // Add to competition bets list
    await this.redis.lpush(
      REDIS_KEYS.competitionBets(bet.competitionId),
      JSON.stringify(bet)
    );

    // Add to user's bets
    await this.redis.lpush(
      REDIS_KEYS.userBets(bet.userId),
      JSON.stringify(bet)
    );

    return bet.id;
  }

  /**
   * Get bets for a competition
   */
  async getBets(competitionId: string, limit = 100): Promise<RedisBet[]> {
    const data = await this.redis.lrange(
      REDIS_KEYS.competitionBets(competitionId),
      0,
      limit - 1
    );

    return data.map((item) =>
      typeof item === 'string' ? JSON.parse(item) : item
    );
  }

  /**
   * Get user's bets
   */
  async getUserBets(address: string, limit = 100): Promise<RedisBet[]> {
    const data = await this.redis.lrange(
      REDIS_KEYS.userBets(address),
      0,
      limit - 1
    );

    return data.map((item) =>
      typeof item === 'string' ? JSON.parse(item) : item
    );
  }

  // ---------------------------------------------------------------------------
  // VOTES
  // ---------------------------------------------------------------------------

  /**
   * Record a judge vote
   */
  async addVote(competitionId: string, vote: RedisVote): Promise<boolean> {
    const key = REDIS_KEYS.competitionVotes(competitionId);
    await this.redis.hset(key, { [vote.judgeAddress.toLowerCase()]: JSON.stringify(vote) });
    return true;
  }

  /**
   * Get all votes for a competition
   */
  async getVotes(competitionId: string): Promise<RedisVote[]> {
    const key = REDIS_KEYS.competitionVotes(competitionId);
    const data = await this.redis.hgetall<Record<string, string>>(key);

    if (!data) return [];

    return Object.values(data).map((v) =>
      typeof v === 'string' ? JSON.parse(v) : v
    );
  }

  /**
   * Check if judge has voted
   */
  async hasVoted(competitionId: string, judgeAddress: string): Promise<boolean> {
    const key = REDIS_KEYS.competitionVotes(competitionId);
    const vote = await this.redis.hget(key, judgeAddress.toLowerCase());
    return !!vote;
  }

  // ---------------------------------------------------------------------------
  // TRANSPARENCY EVENTS
  // ---------------------------------------------------------------------------

  /**
   * Add a transparency event
   */
  async addEvent(competitionId: string, event: RedisEvent): Promise<string> {
    await this.redis.lpush(
      REDIS_KEYS.competitionEvents(competitionId),
      JSON.stringify(event)
    );
    return event.id;
  }

  /**
   * Get transparency events for a competition
   */
  async getEvents(competitionId: string, limit = 100): Promise<RedisEvent[]> {
    const data = await this.redis.lrange(
      REDIS_KEYS.competitionEvents(competitionId),
      0,
      limit - 1
    );

    return data.map((item) =>
      typeof item === 'string' ? JSON.parse(item) : item
    );
  }

  // ---------------------------------------------------------------------------
  // CHAT
  // ---------------------------------------------------------------------------

  /**
   * Add a chat message
   */
  async addChatMessage(
    competitionId: string,
    message: RedisChatMessage
  ): Promise<string> {
    await this.redis.lpush(
      REDIS_KEYS.competitionChat(competitionId),
      JSON.stringify(message)
    );
    return message.id;
  }

  /**
   * Get chat messages for a competition
   */
  async getChatMessages(
    competitionId: string,
    limit = 50
  ): Promise<RedisChatMessage[]> {
    const data = await this.redis.lrange(
      REDIS_KEYS.competitionChat(competitionId),
      0,
      limit - 1
    );

    return data.map((item) =>
      typeof item === 'string' ? JSON.parse(item) : item
    );
  }

  // ---------------------------------------------------------------------------
  // SAFE TRANSACTIONS
  // ---------------------------------------------------------------------------

  /**
   * Record a Safe transaction
   */
  async addSafeTransaction(
    safeAddress: string,
    tx: RedisSafeTransaction
  ): Promise<string> {
    await this.redis.lpush(
      REDIS_KEYS.safeTransactions(safeAddress),
      JSON.stringify(tx)
    );

    if (tx.status === 'pending') {
      await this.redis.hset(
        REDIS_KEYS.safePending(safeAddress),
        { [tx.safeTxHash]: JSON.stringify(tx) }
      );
    }

    return tx.safeTxHash;
  }

  /**
   * Update Safe transaction status
   */
  async updateSafeTransaction(
    safeAddress: string,
    safeTxHash: string,
    updates: Partial<RedisSafeTransaction>
  ): Promise<boolean> {
    // Update in pending hash
    const pendingKey = REDIS_KEYS.safePending(safeAddress);
    const existing = await this.redis.hget<string>(pendingKey, safeTxHash);

    if (existing) {
      const tx = typeof existing === 'string' ? JSON.parse(existing) : existing;
      const updated = { ...tx, ...updates };

      if (updates.status && updates.status !== 'pending') {
        // Remove from pending
        await this.redis.hdel(pendingKey, safeTxHash);
      } else {
        await this.redis.hset(pendingKey, { [safeTxHash]: JSON.stringify(updated) });
      }
    }

    return true;
  }

  /**
   * Get pending Safe transactions
   */
  async getPendingSafeTransactions(
    safeAddress: string
  ): Promise<RedisSafeTransaction[]> {
    const data = await this.redis.hgetall<Record<string, string>>(
      REDIS_KEYS.safePending(safeAddress)
    );

    if (!data) return [];

    return Object.values(data).map((v) =>
      typeof v === 'string' ? JSON.parse(v) : v
    );
  }

  // ---------------------------------------------------------------------------
  // MARKET HISTORY
  // ---------------------------------------------------------------------------

  /**
   * Add market history point
   */
  async addMarketHistoryPoint(
    manifoldId: string,
    point: RedisMarketHistory
  ): Promise<void> {
    await this.redis.zadd(REDIS_KEYS.marketHistory(manifoldId), {
      score: point.timestamp,
      member: JSON.stringify(point),
    });
  }

  /**
   * Get market history
   */
  async getMarketHistory(
    manifoldId: string,
    from?: number,
    to?: number
  ): Promise<RedisMarketHistory[]> {
    const key = REDIS_KEYS.marketHistory(manifoldId);

    const data = await this.redis.zrange(
      key,
      from || 0,
      to || Date.now(),
      { byScore: true }
    );

    return data.map((item) =>
      typeof item === 'string' ? JSON.parse(item) : item
    );
  }

  // ---------------------------------------------------------------------------
  // LEADERBOARD
  // ---------------------------------------------------------------------------

  /**
   * Update user's leaderboard score
   */
  async updateLeaderboardScore(
    address: string,
    score: number,
    category?: CompetitionCategory
  ): Promise<void> {
    const pipeline = this.redis.pipeline();

    // Update global leaderboard
    pipeline.zincrby(REDIS_KEYS.leaderboardGlobal, score, address.toLowerCase());

    // Update category leaderboard if specified
    if (category) {
      pipeline.zincrby(REDIS_KEYS.leaderboardCategory(category), score, address.toLowerCase());
    }

    await pipeline.exec();
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(options: {
    category?: CompetitionCategory;
    competitionId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Array<{ address: string; score: number; rank: number }>> {
    const { limit = 50, offset = 0 } = options;

    let key: string;
    if (options.competitionId) {
      key = REDIS_KEYS.leaderboardCompetition(options.competitionId);
    } else if (options.category) {
      key = REDIS_KEYS.leaderboardCategory(options.category);
    } else {
      key = REDIS_KEYS.leaderboardGlobal;
    }

    const data = await this.redis.zrange(key, offset, offset + limit - 1, {
      rev: true,
      withScores: true,
    });

    const results: Array<{ address: string; score: number; rank: number }> = [];

    for (let i = 0; i < data.length; i += 2) {
      results.push({
        address: data[i] as string,
        score: data[i + 1] as number,
        rank: offset + Math.floor(i / 2) + 1,
      });
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // STATISTICS
  // ---------------------------------------------------------------------------

  /**
   * Get global statistics
   */
  async getGlobalStats(): Promise<RedisGlobalStats | null> {
    const data = await this.redis.get<string>(REDIS_KEYS.statsGlobal);
    if (!data) return null;
    return typeof data === 'string' ? JSON.parse(data) : data;
  }

  /**
   * Update global statistics
   */
  async updateGlobalStats(updates: Partial<RedisGlobalStats>): Promise<void> {
    const existing = await this.getGlobalStats();
    const updated: RedisGlobalStats = {
      totalCompetitions: existing?.totalCompetitions || 0,
      activeCompetitions: existing?.activeCompetitions || 0,
      totalPrizePool: existing?.totalPrizePool || 0,
      totalParticipants: existing?.totalParticipants || 0,
      totalBets: existing?.totalBets || 0,
      totalVolume: existing?.totalVolume || 0,
      lastUpdated: Date.now(),
      ...updates,
    };

    await this.redis.set(REDIS_KEYS.statsGlobal, JSON.stringify(updated));
  }

  /**
   * Increment a statistic
   */
  async incrementStat(
    stat: keyof Omit<RedisGlobalStats, 'lastUpdated'>,
    amount = 1
  ): Promise<void> {
    const existing = await this.getGlobalStats();
    const current = existing?.[stat] || 0;

    await this.updateGlobalStats({
      [stat]: current + amount,
    });
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let storeInstance: CompetitionStore | null = null;

/**
 * Get the competition store singleton
 */
export function getCompetitionStore(): CompetitionStore {
  if (!storeInstance) {
    storeInstance = new CompetitionStore();
  }
  return storeInstance;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a unique ID for Redis entries
 */
export function generateRedisId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Parse Redis timestamp to Date
 */
export function parseRedisTimestamp(timestamp: number): Date {
  return new Date(timestamp);
}

/**
 * Format Date for Redis storage
 */
export function formatRedisTimestamp(date: Date): number {
  return date.getTime();
}

/**
 * Calculate TTL for competition data
 */
export function calculateCompetitionTTL(competition: Competition): number {
  // Keep resolved competitions for 90 days
  if (competition.status === 'resolved' || competition.status === 'cancelled') {
    return 90 * 24 * 60 * 60; // 90 days in seconds
  }

  // Active competitions have no TTL
  return 0;
}

export default CompetitionStore;
