// Redis-based referral database for production persistence
// Uses centralized Redis configuration for consistency and security
// Replaces file-based system to ensure data survives server restarts

import { validateRedisForCriticalOps, isRedisConfigured, getRedisStatus } from './redisConfig';

// Helper function to serialize ReferralRecord for Redis storage
function serializeReferralRecordForRedis(referral: ReferralRecord): Record<string, string> {
  const serialized: Record<string, string> = {};
  
  Object.entries(referral).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (typeof value === 'object') {
        // Convert arrays and objects to JSON strings
        serialized[key] = JSON.stringify(value);
      } else {
        // Convert all other types to strings
        serialized[key] = String(value);
      }
    }
  });
  
  return serialized;
}

// Helper function to serialize UserProfile for Redis storage
function serializeUserProfileForRedis(profile: UserProfile): Record<string, string> {
  const serialized: Record<string, string> = {};
  
  Object.entries(profile).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (typeof value === 'object') {
        try {
          // Safely convert arrays and objects to JSON strings
          serialized[key] = JSON.stringify(value);
        } catch (jsonError) {
          console.error(`❌ Failed to serialize ${key}:`, value, jsonError);
          // Fallback for objects that can't be serialized
          serialized[key] = String(value);
        }
      } else {
        // Convert all other types to strings
        serialized[key] = String(value);
      }
    }
  });
  
  return serialized;
}

export interface ReferralRecord {
  id: string;
  referrerAddress: string;
  referredAddress?: string;
  referredEmail?: string;
  referredIP?: string;
  referredUserDisplay: string;
  registrationDate: string;
  status: 'registered' | 'activated' | 'active';
  source?: string;
  lastActivity: string;
  gifts: GiftRecord[];
  totalEarnings: number;
  isIPBased?: boolean;
  // New fields for better tracking
  sessionId?: string;
  userAgent?: string;
  upgradedFromIP?: boolean;
}

export interface GiftRecord {
  id: string;
  tokenId: string;
  amount: number;
  commission: number;
  date: string;
  transactionHash?: string;
  status: 'completed' | 'pending';
  paymentStatus?: 'paid' | 'pending_blockchain' | 'pending_payment' | 'pending_review';
  estimatedPaymentDate?: string;
  pendingReason?: 'blockchain_confirmation' | 'payment_processing' | 'fraud_review' | 'manual_review';
}

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingRewards: number;
  conversionRate: number;
}

export interface UserProfile {
  address: string;
  email?: string;
  registrationDate: string;
  lastActivity: string;
  referralStats: ReferralStats;
  sessionHistory: string[];
  ipHistory: string[];
}

// Helper function to safely parse ReferralRecord from Redis
function parseReferralRecordFromRedis(redisData: Record<string, unknown>): ReferralRecord | null {
  try {
    if (!redisData || Object.keys(redisData).length === 0) {
      return null;
    }

    // Parse JSON fields that may be stored as strings in Redis
    const gifts = redisData.gifts ? 
      (typeof redisData.gifts === 'string' ? 
        JSON.parse(redisData.gifts) : redisData.gifts) : [];

    const record: ReferralRecord = {
      id: redisData.id as string,
      referrerAddress: redisData.referrerAddress as string,
      referredAddress: redisData.referredAddress as string | undefined,
      referredEmail: redisData.referredEmail as string | undefined,
      referredIP: redisData.referredIP as string | undefined,
      referredUserDisplay: redisData.referredUserDisplay as string,
      registrationDate: redisData.registrationDate as string,
      status: (redisData.status as string) as 'registered' | 'activated' | 'active',
      source: redisData.source as string | undefined,
      lastActivity: redisData.lastActivity as string,
      gifts: gifts,
      totalEarnings: parseFloat(redisData.totalEarnings as string) || 0,
      isIPBased: redisData.isIPBased === 'true',
      sessionId: redisData.sessionId as string | undefined,
      userAgent: redisData.userAgent as string | undefined,
      upgradedFromIP: redisData.upgradedFromIP === 'true'
    };

    return record;
  } catch (error) {
    console.error('❌ Failed to parse ReferralRecord from Redis:', error);
    return null;
  }
}

// Helper function to safely parse UserProfile from Redis
function parseUserProfileFromRedis(redisData: Record<string, unknown>): UserProfile | null {
  try {
    if (!redisData || Object.keys(redisData).length === 0) {
      return null;
    }

    // Safe JSON parsing with fallbacks
    let referralStats = {
      totalReferrals: 0,
      activeReferrals: 0,
      totalEarnings: 0,
      pendingRewards: 0,
      conversionRate: 0
    };
    
    if (redisData.referralStats) {
      try {
        const statsString = redisData.referralStats as string;
        if (typeof statsString === 'string' && statsString !== '[object Object]' && statsString.startsWith('{')) {
          referralStats = JSON.parse(statsString);
        }
      } catch (parseError) {
        console.warn('❌ Failed to parse referralStats, using defaults:', parseError);
      }
    }

    let sessionHistory: string[] = [];
    if (redisData.sessionHistory) {
      try {
        const historyString = redisData.sessionHistory as string;
        if (typeof historyString === 'string' && historyString !== '[object Object]' && historyString.startsWith('[')) {
          sessionHistory = JSON.parse(historyString);
        }
      } catch (parseError) {
        console.warn('❌ Failed to parse sessionHistory, using empty array:', parseError);
      }
    }

    let ipHistory: string[] = [];
    if (redisData.ipHistory) {
      try {
        const ipString = redisData.ipHistory as string;
        if (typeof ipString === 'string' && ipString !== '[object Object]' && ipString.startsWith('[')) {
          ipHistory = JSON.parse(ipString);
        }
      } catch (parseError) {
        console.warn('❌ Failed to parse ipHistory, using empty array:', parseError);
      }
    }

    const profile: UserProfile = {
      address: redisData.address as string,
      email: redisData.email as string | undefined,
      registrationDate: redisData.registrationDate as string,
      lastActivity: redisData.lastActivity as string,
      referralStats: referralStats,
      sessionHistory: sessionHistory,
      ipHistory: ipHistory
    };

    return profile;
  } catch (error) {
    console.error('❌ Failed to parse UserProfile from Redis:', error);
    return null;
  }
}

// KV Keys Structure:
// referral:{id} -> ReferralRecord
// user_referrals:{address} -> Set<referral_id>
// user_profile:{address} -> UserProfile
// ip_to_user:{ip} -> address
// pending_activations -> Set<referral_id>

export class VercelKVReferralDatabase {
  
  // ==================== CORE CRUD OPERATIONS ====================
  
  async saveReferral(referral: ReferralRecord): Promise<void> {
    console.log('💾 Saving referral to Redis:', referral.id);
    
    // MANDATORY: Redis is required for referral persistence
    const redis = validateRedisForCriticalOps('Referral data persistence');
    
    // Save the referral record
    const serializedReferral = serializeReferralRecordForRedis(referral);
    await redis.hset(`referral:${referral.id}`, serializedReferral);
    
    // Add to user's referral set
    await redis.sadd(`user_referrals:${referral.referrerAddress.toLowerCase()}`, referral.id);
    
    // Track IP mapping if available
    if (referral.referredIP && !referral.referredAddress) {
      await redis.set(`ip_to_referral:${referral.referredIP}`, referral.id);
    }
    
    // Track referred user mapping if wallet available
    if (referral.referredAddress) {
      await redis.set(`user_to_referral:${referral.referredAddress.toLowerCase()}`, referral.id);
    }
    
    console.log('✅ Referral saved to Redis successfully');
  }
  
  async getReferral(referralId: string): Promise<ReferralRecord | null> {
    const redis = validateRedisForCriticalOps('Referral data retrieval');
    const redisData = await redis.hgetall(`referral:${referralId}`);
    return parseReferralRecordFromRedis(redisData);
  }
  
  async getUserReferrals(userAddress: string): Promise<ReferralRecord[]> {
    const redis = validateRedisForCriticalOps('User referrals retrieval');
    const referralIds = await redis.smembers(`user_referrals:${userAddress.toLowerCase()}`);
    
    if (!referralIds || referralIds.length === 0) {
      return [];
    }
    
    const referrals = await Promise.all(
      referralIds.map(async (id) => {
        const redisData = await redis.hgetall(`referral:${id}`);
        return parseReferralRecordFromRedis(redisData);
      })
    );
    
    return referrals.filter((referral): referral is ReferralRecord => referral !== null);
  }
  
  // ==================== USER PROFILE MANAGEMENT ====================
  
  async createOrUpdateUserProfile(address: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const redis = validateRedisForCriticalOps('User profile management');
    const existing = await redis.hgetall(`user_profile:${address.toLowerCase()}`);
    
    // Parse existing profile using our parser function
    const existingProfile = parseUserProfileFromRedis(existing);
    
    const profile: UserProfile = {
      address: address.toLowerCase(),
      registrationDate: existingProfile?.registrationDate || new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      referralStats: existingProfile?.referralStats || {
        totalReferrals: 0,
        activeReferrals: 0,
        totalEarnings: 0,
        pendingRewards: 0,
        conversionRate: 0
      },
      sessionHistory: existingProfile?.sessionHistory || [],
      ipHistory: existingProfile?.ipHistory || [],
      ...data
    };
    
    const serializedProfile = serializeUserProfileForRedis(profile);
    await redis.hset(`user_profile:${address.toLowerCase()}`, serializedProfile);
    return profile;
  }
  
  async getUserProfile(address: string): Promise<UserProfile | null> {
    const redis = validateRedisForCriticalOps('User profile retrieval');
    const redisData = await redis.hgetall(`user_profile:${address.toLowerCase()}`);
    return parseUserProfileFromRedis(redisData);
  }
  
  // ==================== ENHANCED TRACKING FUNCTIONS ====================
  
  async trackReferralClick(
    referrerAddress: string, 
    referredData: {
      address?: string;
      email?: string;
      ip?: string;
      userAgent?: string;
    },
    source?: string
  ): Promise<string> {
    console.log('🔗 Tracking referral click (KV):', { referrerAddress, referredData, source });
    
    // MANDATORY: Redis is required for referral tracking
    const redis = validateRedisForCriticalOps('Referral click tracking');
    
    const { address, email, ip, userAgent } = referredData;
    
    // Generate consistent identifier
    const referredIdentifier = this.generateUserDisplay(address, email, ip);
    
    // Check for existing referral
    let existingReferral: ReferralRecord | null = null;
    
    // 1. Check by wallet address first (highest priority)
    if (address) {
      const existingId = await redis.get(`user_to_referral:${address.toLowerCase()}`);
      if (existingId) {
        existingReferral = await this.getReferral(existingId as string);
      }
    }
    
    // 2. Check by IP if no wallet match
    if (!existingReferral && ip) {
      const existingId = await redis.get(`ip_to_referral:${ip}`);
      if (existingId) {
        existingReferral = await this.getReferral(existingId as string);
      }
    }
    
    if (existingReferral && existingReferral.referrerAddress.toLowerCase() === referrerAddress.toLowerCase()) {
      // Update existing referral
      existingReferral.lastActivity = new Date().toISOString();
      
      // Upgrade IP-based to wallet-based if wallet provided
      if (address && !existingReferral.referredAddress) {
        existingReferral.referredAddress = address.toLowerCase();
        existingReferral.referredUserDisplay = this.generateUserDisplay(address, email);
        existingReferral.isIPBased = false;
        existingReferral.upgradedFromIP = true;
        
        // Update mappings
        await redis.set(`user_to_referral:${address.toLowerCase()}`, existingReferral.id);
        
        console.log('🔄 Upgraded IP-based referral to wallet-based');
      }
      
      if (email && !existingReferral.referredEmail) {
        existingReferral.referredEmail = email;
      }
      
      await this.saveReferral(existingReferral);
      return existingReferral.id;
    } else {
      // Create new referral
      const isIPBased = !address && !email;
      
      const newReferral: ReferralRecord = {
        id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        referrerAddress: referrerAddress.toLowerCase(),
        referredAddress: address?.toLowerCase(),
        referredEmail: email,
        referredIP: ip,
        referredUserDisplay: referredIdentifier,
        registrationDate: new Date().toISOString(),
        status: 'registered',
        source: source || 'direct',
        lastActivity: new Date().toISOString(),
        gifts: [],
        totalEarnings: 0,
        isIPBased,
        userAgent,
        sessionId: `session_${Date.now()}`
      };
      
      await this.saveReferral(newReferral);
      console.log('✅ Created new referral record (KV):', newReferral.id);
      
      return newReferral.id;
    }
  }
  
  async trackReferralActivation(
    referrerAddress: string,
    referredData: {
      address?: string;
      email?: string;
      identifier?: string;
    },
    giftData: {
      tokenId: string;
      amount: number;
      commission: number;
      transactionHash?: string;
    }
  ): Promise<boolean> {
    console.log('🎁 Tracking referral activation (KV):', { referrerAddress, referredData, giftData });
    
    // MANDATORY: Redis is required for referral activation tracking
    const redis = validateRedisForCriticalOps('Referral activation tracking');
    
    // Find referral by multiple criteria
    let referral: ReferralRecord | null = null;
    
    // 1. Try by wallet address first
    if (referredData.address) {
      const referralId = await redis.get(`user_to_referral:${referredData.address.toLowerCase()}`);
      if (referralId) {
        referral = await this.getReferral(referralId as string);
      }
    }
    
    // 2. Try by identifier pattern matching
    if (!referral && referredData.identifier) {
      const userReferrals = await this.getUserReferrals(referrerAddress);
      referral = userReferrals.find(r => 
        r.referredUserDisplay === referredData.identifier ||
        (referredData.address && r.referredAddress?.toLowerCase() === referredData.address.toLowerCase())
      ) || null;
    }
    
    if (!referral) {
      console.warn('⚠️ No referral found for activation');
      return false;
    }
    
    // Update referral status
    referral.status = referral.gifts.length > 0 ? 'active' : 'activated';
    referral.lastActivity = new Date().toISOString();
    
    // Add gift record
    const isTestnet = process.env.NEXT_PUBLIC_CHAIN_ID === '84532';
    const giftRecord: GiftRecord = {
      id: `gift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tokenId: giftData.tokenId,
      amount: giftData.amount,
      commission: giftData.commission,
      date: new Date().toISOString(),
      transactionHash: giftData.transactionHash,
      status: 'completed',
      paymentStatus: isTestnet ? 'pending_blockchain' : 'paid',
      pendingReason: isTestnet ? 'blockchain_confirmation' : undefined,
      estimatedPaymentDate: isTestnet ? 
        new Date(Date.now() + (1 + Math.random() * 4) * 60 * 60 * 1000).toISOString() : 
        undefined
    };
    
    referral.gifts.push(giftRecord);
    referral.totalEarnings += giftData.commission;
    
    await this.saveReferral(referral);
    
    // Update user's referral stats
    await this.updateUserStats(referrerAddress);
    
    // Add to pending activations for real-time updates
    await redis.sadd('recent_activations', JSON.stringify({
      referralId: referral.id,
      referrerAddress,
      giftData,
      timestamp: new Date().toISOString()
    }));
    
    console.log('✅ Referral activation tracked successfully (KV)');
    return true;
  }
  
  async updateUserStats(userAddress: string): Promise<void> {
    const referrals = await this.getUserReferrals(userAddress);
    
    const stats: ReferralStats = {
      totalReferrals: referrals.length,
      activeReferrals: referrals.filter(r => r.status === 'activated' || r.status === 'active').length,
      totalEarnings: referrals.reduce((sum, r) => sum + r.totalEarnings, 0),
      pendingRewards: referrals.reduce((sum, r) => 
        sum + r.gifts.reduce((giftSum, g) => 
          g.paymentStatus !== 'paid' ? giftSum + g.commission : giftSum, 0
        ), 0
      ),
      conversionRate: referrals.length > 0 ? 
        (referrals.filter(r => r.status !== 'registered').length / referrals.length) * 100 : 0
    };
    
    await this.createOrUpdateUserProfile(userAddress, { referralStats: stats });
  }
  
  // ==================== ADVANCED QUERIES ====================
  
  async getReferralStats(referrerAddress: string): Promise<ReferralStats> {
    const profile = await this.getUserProfile(referrerAddress);
    if (profile?.referralStats) {
      return profile.referralStats;
    }
    
    // Fallback: calculate from referrals
    await this.updateUserStats(referrerAddress);
    const updatedProfile = await this.getUserProfile(referrerAddress);
    return updatedProfile?.referralStats || {
      totalReferrals: 0,
      activeReferrals: 0,
      totalEarnings: 0,
      pendingRewards: 0,
      conversionRate: 0
    };
  }
  
  async getUserEarningsHistory(referrerAddress: string) {
    const referrals = await this.getUserReferrals(referrerAddress);
    
    const earnings = [];
    for (const referral of referrals) {
      for (const gift of referral.gifts) {
        earnings.push({
          id: gift.id,
          date: gift.date,
          amount: gift.commission,
          referredUser: referral.referredAddress || '',
          referredUserDisplay: referral.referredUserDisplay,
          giftAmount: gift.amount,
          giftTokenId: gift.tokenId,
          transactionHash: gift.transactionHash,
          status: gift.status
        });
      }
    }
    
    return earnings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async getUserPendingRewards(referrerAddress: string) {
    const referrals = await this.getUserReferrals(referrerAddress);
    
    const pendingRewards = [];
    for (const referral of referrals) {
      for (const gift of referral.gifts) {
        if (gift.paymentStatus && gift.paymentStatus !== 'paid') {
          pendingRewards.push({
            id: gift.id,
            date: gift.date,
            amount: gift.commission,
            referredUser: referral.referredAddress || '',
            referredUserDisplay: referral.referredUserDisplay,
            giftAmount: gift.amount,
            giftTokenId: gift.tokenId,
            estimatedCompletionDate: gift.estimatedPaymentDate || 
              new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            reason: gift.pendingReason || 'blockchain_confirmation',
            transactionHash: gift.transactionHash
          });
        }
      }
    }
    
    return pendingRewards.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  // ==================== REAL-TIME FEATURES ====================
  
  async getRecentActivations(limit: number = 10): Promise<any[]> {
    const redis = validateRedisForCriticalOps('Recent activations retrieval');
    const activations = await redis.smembers('recent_activations');
    return activations
      .map(a => JSON.parse(a))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
  
  async cleanupOldActivations(): Promise<void> {
    const redis = validateRedisForCriticalOps('Referral data cleanup');
    // Clean activations older than 24 hours
    const activations = await redis.smembers('recent_activations');
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    
    for (const activation of activations) {
      const data = JSON.parse(activation);
      if (new Date(data.timestamp).getTime() < cutoff) {
        await redis.srem('recent_activations', activation);
      }
    }
  }
  
  // ==================== UTILITY FUNCTIONS ====================
  
  generateUserDisplay(address?: string, email?: string, ip?: string): string {
    if (address && address.startsWith('0x')) {
      return `...${address.slice(-6)}`;
    }
    if (email) {
      const parts = email.split('@');
      if (parts.length === 2) {
        const [local, domain] = parts;
        return `${local.slice(0, 4)}...@${domain}`;
      }
    }
    if (ip) {
      return `ip_${ip.split('.').slice(-2).join('.')}`;
    }
    return `user_${Date.now().toString().slice(-6)}`;
  }
  
  // ==================== MIGRATION HELPERS ====================
  
  async migrateFromFileSystem(oldReferrals: ReferralRecord[]): Promise<void> {
    console.log(`🔄 Migrating ${oldReferrals.length} referrals to Vercel KV...`);
    
    for (const referral of oldReferrals) {
      await this.saveReferral(referral);
      await this.updateUserStats(referral.referrerAddress);
    }
    
    console.log('✅ Migration to Vercel KV completed');
  }
}

// Export singleton instance
export const kvReferralDB = new VercelKVReferralDatabase();

// Legacy compatibility functions
export async function trackReferralClick(
  referrerAddress: string, 
  referredIdentifier: string, 
  source?: string, 
  ipAddress?: string
): Promise<void> {
  await kvReferralDB.trackReferralClick(referrerAddress, {
    ip: ipAddress,
    // Try to extract address from identifier if it looks like a wallet
    address: referredIdentifier.match(/^0x[a-fA-F0-9]{40}$/) ? referredIdentifier : undefined
  }, source);
}

export async function trackReferralActivation(
  referrerAddress: string,
  referredIdentifier: string,
  giftData: {
    tokenId: string;
    amount: number;
    commission: number;
    transactionHash?: string;
  }
): Promise<void> {
  await kvReferralDB.trackReferralActivation(
    referrerAddress,
    { identifier: referredIdentifier },
    giftData
  );
}

export async function getReferralStats(referrerAddress: string): Promise<ReferralStats> {
  return await kvReferralDB.getReferralStats(referrerAddress);
}

export async function getUserReferrals(referrerAddress: string): Promise<ReferralRecord[]> {
  return await kvReferralDB.getUserReferrals(referrerAddress);
}

export async function getUserEarningsHistory(referrerAddress: string) {
  return await kvReferralDB.getUserEarningsHistory(referrerAddress);
}

export async function getUserPendingRewards(referrerAddress: string) {
  return await kvReferralDB.getUserPendingRewards(referrerAddress);
}

export function generateUserDisplay(address?: string, email?: string): string {
  return kvReferralDB.generateUserDisplay(address, email);
}

export async function upgradeIPAccountToUser(
  ipAddress: string, 
  userAddress?: string, 
  userEmail?: string
): Promise<void> {
  // This functionality is now handled automatically in trackReferralClick
  console.log('ℹ️ upgradeIPAccountToUser called - functionality integrated into trackReferralClick');
}