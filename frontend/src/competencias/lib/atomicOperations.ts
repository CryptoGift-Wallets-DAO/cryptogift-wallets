/**
 * ATOMIC REDIS OPERATIONS FOR COMPETITIONS
 * =========================================
 *
 * Uses Lua scripts to ensure atomic operations for:
 * - Joining competitions (prevent overselling/double join)
 * - Placing bets (prevent race conditions on probability/pool)
 *
 * These scripts execute atomically in Redis, preventing race conditions.
 */

import { Redis } from '@upstash/redis';
import { getRedisConnection } from '../../lib/redisConfig';
import type { Competition, ParticipantEntry, ManifoldBet, TransparencyEvent } from '../types';

// =============================================================================
// LUA SCRIPTS
// =============================================================================

/**
 * Lua script for atomic join operation
 *
 * KEYS[1] = competition:{id} (main competition object)
 * KEYS[2] = competition:{id}:events (events list)
 * KEYS[3] = user:{address}:joined (user's joined competitions set)
 *
 * ARGV[1] = participant address (lowercase)
 * ARGV[2] = participant entry JSON
 * ARGV[3] = transparency event JSON
 * ARGV[4] = competition ID
 *
 * Returns: JSON with { success, error?, data? }
 */
const ATOMIC_JOIN_SCRIPT = `
local compKey = KEYS[1]
local eventsKey = KEYS[2]
local userJoinedKey = KEYS[3]

local participantAddress = ARGV[1]
local entryJson = ARGV[2]
local eventJson = ARGV[3]
local competitionId = ARGV[4]

-- Read competition
local compData = redis.call('GET', compKey)
if not compData then
  return cjson.encode({success = false, error = 'Competition not found', code = 'NOT_FOUND'})
end

local competition = cjson.decode(compData)

-- Check status
if competition.status ~= 'active' and competition.status ~= 'pending' then
  return cjson.encode({success = false, error = 'Competition is not accepting participants', code = 'INVALID_STATUS'})
end

-- Initialize participants if needed
if not competition.participants then
  competition.participants = {current = 0, entries = {}}
end
if not competition.participants.entries then
  competition.participants.entries = {}
end
if not competition.participants.current then
  competition.participants.current = 0
end

-- Check if already joined
for i, entry in ipairs(competition.participants.entries) do
  if entry.address == participantAddress then
    return cjson.encode({success = false, error = 'Already joined this competition', code = 'ALREADY_JOINED'})
  end
end

-- Check max participants
local maxP = competition.participants.maxParticipants
if maxP and competition.participants.current >= maxP then
  return cjson.encode({success = false, error = 'Competition is full', code = 'FULL'})
end

-- Add participant
local entry = cjson.decode(entryJson)
table.insert(competition.participants.entries, entry)
competition.participants.current = competition.participants.current + 1

-- Add transparency event
if not competition.transparency then
  competition.transparency = {events = {}, publicData = true, auditLog = true}
end
if not competition.transparency.events then
  competition.transparency.events = {}
end
local event = cjson.decode(eventJson)
table.insert(competition.transparency.events, 1, event)

-- Atomic writes
redis.call('SET', compKey, cjson.encode(competition))
redis.call('LPUSH', eventsKey, eventJson)
redis.call('SADD', userJoinedKey, competitionId)

return cjson.encode({
  success = true,
  data = {
    entry = entry,
    participantCount = competition.participants.current
  }
})
`;

/**
 * Lua script for atomic bet operation
 *
 * KEYS[1] = competition:{id} (main competition object)
 * KEYS[2] = competition:{id}:bets (bets list)
 * KEYS[3] = competition:{id}:events (events list)
 * KEYS[4] = user:{address}:bets (user's bets list)
 *
 * ARGV[1] = user address (lowercase)
 * ARGV[2] = bet JSON
 * ARGV[3] = transparency event JSON
 * ARGV[4] = competition ID
 * ARGV[5] = outcome (YES/NO)
 * ARGV[6] = amount (number as string)
 *
 * Returns: JSON with { success, error?, data? }
 */
const ATOMIC_BET_SCRIPT = `
local compKey = KEYS[1]
local betsKey = KEYS[2]
local eventsKey = KEYS[3]
local userBetsKey = KEYS[4]

local userAddress = ARGV[1]
local betJson = ARGV[2]
local eventJson = ARGV[3]
local competitionId = ARGV[4]
local outcome = ARGV[5]
local amount = tonumber(ARGV[6])

-- Read competition
local compData = redis.call('GET', compKey)
if not compData then
  return cjson.encode({success = false, error = 'Competition not found', code = 'NOT_FOUND'})
end

local competition = cjson.decode(compData)

-- Validate competition
if competition.category ~= 'prediction' then
  return cjson.encode({success = false, error = 'Competition is not a prediction market', code = 'NOT_PREDICTION'})
end
if competition.status ~= 'active' then
  return cjson.encode({success = false, error = 'Competition is not active', code = 'NOT_ACTIVE'})
end
if not competition.market then
  return cjson.encode({success = false, error = 'No market associated with this competition', code = 'NO_MARKET'})
end

-- Get current market state
local pool = competition.market.pool or {yesPool = 100, noPool = 100}
local yesPool = pool.yesPool or 100
local noPool = pool.noPool or 100
local currentProb = competition.market.probability or 0.5

-- Calculate shares using CPMM formula: shares = amount * otherPool / (thisPool + amount)
local shares
local newProbability
if outcome == 'YES' then
  shares = amount * noPool / (yesPool + amount)
  -- New probability = yesPool / (yesPool + noPool) after adding to yes pool
  newProbability = (yesPool + amount) / (yesPool + amount + noPool)
  yesPool = yesPool + amount
else
  shares = amount * yesPool / (noPool + amount)
  -- New probability for YES after adding to NO pool
  newProbability = yesPool / (yesPool + noPool + amount)
  noPool = noPool + amount
end

-- Update market state
competition.market.probability = newProbability
competition.market.pool = {yesPool = yesPool, noPool = noPool}
competition.market.totalVolume = (competition.market.totalVolume or 0) + amount

-- Create bet with calculated values
local bet = cjson.decode(betJson)
bet.shares = shares
bet.probBefore = currentProb
bet.probAfter = newProbability

-- Add bet to market
if not competition.market.bets then
  competition.market.bets = {}
end
table.insert(competition.market.bets, bet)

-- Update prize pool
if not competition.prizePool then
  competition.prizePool = {total = 0, currency = 'ETH', distribution = {}, platformFee = 2.5}
end
competition.prizePool.total = (competition.prizePool.total or 0) + amount

-- Add transparency event
if not competition.transparency then
  competition.transparency = {events = {}, publicData = true, auditLog = true}
end
if not competition.transparency.events then
  competition.transparency.events = {}
end

-- Update event with calculated values
local event = cjson.decode(eventJson)
event.details.shares = shares
event.details.probBefore = currentProb
event.details.probAfter = newProbability
table.insert(competition.transparency.events, 1, event)

-- Atomic writes
redis.call('SET', compKey, cjson.encode(competition))
redis.call('LPUSH', betsKey, cjson.encode(bet))
redis.call('LPUSH', eventsKey, cjson.encode(event))

-- Add to user's bets with competition ID
local userBet = cjson.decode(betJson)
userBet.competitionId = competitionId
userBet.shares = shares
userBet.probBefore = currentProb
userBet.probAfter = newProbability
redis.call('LPUSH', userBetsKey, cjson.encode(userBet))

return cjson.encode({
  success = true,
  data = {
    bet = bet,
    newProbability = newProbability,
    pool = {yesPool = yesPool, noPool = noPool},
    totalVolume = competition.market.totalVolume
  }
})
`;

// =============================================================================
// TYPESCRIPT FUNCTIONS
// =============================================================================

export interface AtomicJoinResult {
  success: boolean;
  error?: string;
  code?: string;
  data?: {
    entry: ParticipantEntry;
    participantCount: number;
  };
}

export interface AtomicBetResult {
  success: boolean;
  error?: string;
  code?: string;
  data?: {
    bet: ManifoldBet;
    newProbability: number;
    pool: { yesPool: number; noPool: number };
    totalVolume: number;
  };
}

/**
 * Atomically join a competition
 * Prevents race conditions on participant count and duplicate joins
 */
export async function atomicJoinCompetition(
  competitionId: string,
  participantAddress: string,
  entry: ParticipantEntry,
  event: TransparencyEvent
): Promise<AtomicJoinResult> {
  const redis = getRedisConnection();
  const address = participantAddress.toLowerCase();

  const keys = [
    `competition:${competitionId}`,
    `competition:${competitionId}:events`,
    `user:${address}:joined`,
  ];

  const args = [
    address,
    JSON.stringify(entry),
    JSON.stringify(event),
    competitionId,
  ];

  try {
    const result = await redis.eval(
      ATOMIC_JOIN_SCRIPT,
      keys,
      args
    );

    // Parse result - Upstash returns the result directly
    if (typeof result === 'string') {
      return JSON.parse(result) as AtomicJoinResult;
    }
    return result as AtomicJoinResult;
  } catch (error) {
    console.error('Atomic join error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Atomic join failed',
      code: 'SCRIPT_ERROR',
    };
  }
}

/**
 * Atomically place a bet on a prediction market
 * Prevents race conditions on probability and pool calculations
 */
export async function atomicPlaceBet(
  competitionId: string,
  userAddress: string,
  bet: Omit<ManifoldBet, 'shares' | 'probBefore' | 'probAfter'>,
  event: Omit<TransparencyEvent, 'details'> & { details: Record<string, unknown> },
  outcome: 'YES' | 'NO',
  amount: number
): Promise<AtomicBetResult> {
  const redis = getRedisConnection();
  const address = userAddress.toLowerCase();

  const keys = [
    `competition:${competitionId}`,
    `competition:${competitionId}:bets`,
    `competition:${competitionId}:events`,
    `user:${address}:bets`,
  ];

  // Prepare bet and event templates (shares/probs will be calculated in Lua)
  const betTemplate = {
    ...bet,
    shares: 0,
    probBefore: 0,
    probAfter: 0,
  };

  const eventTemplate = {
    ...event,
    details: {
      ...event.details,
      shares: 0,
      probBefore: 0,
      probAfter: 0,
    },
  };

  const args = [
    address,
    JSON.stringify(betTemplate),
    JSON.stringify(eventTemplate),
    competitionId,
    outcome,
    amount.toString(),
  ];

  try {
    const result = await redis.eval(
      ATOMIC_BET_SCRIPT,
      keys,
      args
    );

    // Parse result
    if (typeof result === 'string') {
      return JSON.parse(result) as AtomicBetResult;
    }
    return result as AtomicBetResult;
  } catch (error) {
    console.error('Atomic bet error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Atomic bet failed',
      code: 'SCRIPT_ERROR',
    };
  }
}

/**
 * Check if a user is a participant in a competition (atomic read)
 */
export async function isParticipant(
  competitionId: string,
  userAddress: string
): Promise<boolean> {
  const redis = getRedisConnection();
  const address = userAddress.toLowerCase();

  // Use SISMEMBER for O(1) check
  const isMember = await redis.sismember(`user:${address}:joined`, competitionId);
  return isMember === 1;
}

/**
 * Get participant count atomically
 */
export async function getParticipantCount(competitionId: string): Promise<number> {
  const redis = getRedisConnection();
  const data = await redis.get(`competition:${competitionId}`);

  if (!data) return 0;

  const competition: Competition = typeof data === 'string'
    ? JSON.parse(data)
    : data;

  return competition.participants?.current || 0;
}
