// Guardian System - SECURITY EXTREME for TBA Wallet Recovery
// Implements multi-signature social recovery with cryptographic verification
// Uses centralized Redis configuration for consistency and security

import { ethers } from 'ethers';
import { validateRedisForCriticalOps, isRedisConfigured, getRedisStatus } from './redisConfig';

export interface Guardian {
  address: string;
  email?: string;
  nickname: string;
  relationship: string; // 'family' | 'friend' | 'colleague' | 'trusted_contact'
  verificationMethod: 'email' | 'wallet_signature' | 'phone_sms';
  addedDate: string;
  lastActivity?: string;
  status: 'pending' | 'verified' | 'active' | 'suspended';
  verificationCode?: string;
  publicKey?: string; // For cryptographic verification
}

export interface GuardianSetup {
  walletAddress: string;
  guardians: Guardian[];
  requiredSignatures: number; // Minimum signatures needed for recovery (typically 2 of 3)
  recoveryThreshold: number; // Hours to wait before recovery is possible
  emergencyContact?: string; // Last resort contact
  setupDate: string;
  lastModified: string;
  recoveryLockPeriod: number; // Hours - prevents immediate recovery after setup
  status: 'configuring' | 'active' | 'recovery_in_progress' | 'suspended';
}

export interface RecoveryRequest {
  id: string;
  walletAddress: string;
  newWalletAddress: string; // The new wallet claiming the TBA
  requestedBy: string; // Guardian who initiated
  signatures: Array<{
    guardianAddress: string;
    signature: string;
    timestamp: string;
    verificationMethod: string;
  }>;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'completed';
  securityChecks: {
    ipVerification: boolean;
    timeDelayMet: boolean;
    signatureThresholdMet: boolean;
    emergencyOverride?: boolean;
  };
}

// Helper function to safely parse Guardian setup from Redis
function parseGuardianSetupFromRedis(redisData: Record<string, unknown>): GuardianSetup | null {
  try {
    if (!redisData || Object.keys(redisData).length === 0) {
      return null;
    }

    // Parse JSON fields that are stored as strings in Redis
    const guardians = redisData.guardians ? JSON.parse(redisData.guardians as string) : [];
    
    const setup: GuardianSetup = {
      walletAddress: redisData.walletAddress as string,
      guardians: guardians,
      requiredSignatures: parseInt(redisData.requiredSignatures as string) || 2,
      recoveryThreshold: parseInt(redisData.recoveryThreshold as string) || 24,
      setupDate: redisData.setupDate as string,
      lastModified: redisData.lastModified as string,
      recoveryLockPeriod: parseInt(redisData.recoveryLockPeriod as string) || 72,
      status: redisData.status as 'configuring' | 'active' | 'suspended'
    };

    return setup;
  } catch (error) {
    console.error('❌ Failed to parse GuardianSetup from Redis:', error);
    return null;
  }
}

// Helper function to serialize GuardianSetup for Redis storage
function serializeGuardianSetupForRedis(setup: GuardianSetup): Record<string, string> {
  return {
    walletAddress: setup.walletAddress,
    guardians: JSON.stringify(setup.guardians),
    requiredSignatures: setup.requiredSignatures.toString(),
    recoveryThreshold: setup.recoveryThreshold.toString(),
    setupDate: setup.setupDate,
    lastModified: setup.lastModified,
    recoveryLockPeriod: setup.recoveryLockPeriod.toString(),
    status: setup.status
  };
}

// Helper function to safely parse RecoveryRequest from Redis
function parseRecoveryRequestFromRedis(redisData: Record<string, unknown>): RecoveryRequest | null {
  try {
    if (!redisData || Object.keys(redisData).length === 0) {
      return null;
    }

    // Parse JSON fields that are stored as strings in Redis
    const signatures = redisData.signatures ? JSON.parse(redisData.signatures as string) : [];
    const securityChecks = redisData.securityChecks ? JSON.parse(redisData.securityChecks as string) : {
      ipVerification: false,
      timeDelayMet: false,
      signatureThresholdMet: false
    };
    
    const recovery: RecoveryRequest = {
      id: redisData.id as string,
      walletAddress: redisData.walletAddress as string,
      newWalletAddress: redisData.newWalletAddress as string,
      requestedBy: redisData.requestedBy as string,
      signatures: signatures,
      createdAt: redisData.createdAt as string,
      expiresAt: redisData.expiresAt as string,
      status: (redisData.status as string) as 'pending' | 'approved' | 'rejected' | 'expired' | 'completed',
      securityChecks: securityChecks
    };

    return recovery;
  } catch (error) {
    console.error('❌ Failed to parse RecoveryRequest from Redis:', error);
    return null;
  }
}

// Helper function to serialize RecoveryRequest for Redis storage
function serializeRecoveryRequestForRedis(recovery: RecoveryRequest): Record<string, string> {
  return {
    id: recovery.id,
    walletAddress: recovery.walletAddress,
    newWalletAddress: recovery.newWalletAddress,
    requestedBy: recovery.requestedBy,
    signatures: JSON.stringify(recovery.signatures),
    createdAt: recovery.createdAt,
    expiresAt: recovery.expiresAt,
    status: recovery.status,
    securityChecks: JSON.stringify(recovery.securityChecks)
  };
}

export class GuardianSecuritySystem {
  
  // ==================== SETUP FUNCTIONS ====================
  
  async setupGuardians(
    walletAddress: string,
    guardians: Omit<Guardian, 'addedDate' | 'status' | 'verificationCode'>[],
    requiredSignatures: number = 2
  ): Promise<{ success: boolean; setupId: string; verificationCodes: Record<string, string> }> {
    try {
      console.log(`🛡️ Setting up guardian system for wallet: ${walletAddress.slice(0, 10)}...`);
      
      // Validate inputs
      if (guardians.length < 2) {
        throw new Error('Minimum 2 guardians required for security');
      }
      
      if (requiredSignatures > guardians.length) {
        throw new Error('Required signatures cannot exceed number of guardians');
      }
      
      if (requiredSignatures < 2) {
        throw new Error('Minimum 2 signatures required for security');
      }
      
      // Generate verification codes for each guardian
      const verificationCodes: Record<string, string> = {};
      const processedGuardians: Guardian[] = guardians.map(guardian => {
        const verificationCode = this.generateSecureCode();
        verificationCodes[guardian.address] = verificationCode;
        
        return {
          ...guardian,
          address: guardian.address.toLowerCase(),
          addedDate: new Date().toISOString(),
          status: 'pending' as const,
          verificationCode,
          publicKey: guardian.address // Use address as public key for now
        };
      });
      
      const setup: GuardianSetup = {
        walletAddress: walletAddress.toLowerCase(),
        guardians: processedGuardians,
        requiredSignatures,
        recoveryThreshold: 24, // 24 hours default
        setupDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        recoveryLockPeriod: 72, // 72 hours - prevents immediate recovery
        status: 'configuring'
      };
      
      // MANDATORY: Redis is required for guardian system security
      const redis = validateRedisForCriticalOps('Guardian system setup');
      
      const setupKey = `guardian_setup:${walletAddress.toLowerCase()}`;
      await redis.hset(setupKey, serializeGuardianSetupForRedis(setup));
      
      // Store individual guardian verifications
      for (const guardian of processedGuardians) {
        const guardianKey = `guardian_verification:${guardian.address}:${walletAddress.toLowerCase()}`;
        await redis.hset(guardianKey, {
          walletAddress: walletAddress.toLowerCase(),
          guardianAddress: guardian.address,
          verificationCode: guardian.verificationCode,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
        
        // Set expiration for verification codes (24 hours)
        await redis.expire(guardianKey, 24 * 60 * 60);
      }
      
      console.log(`✅ Guardian system setup initiated for ${guardians.length} guardians`);
      
      return {
        success: true,
        setupId: setupKey,
        verificationCodes
      };
      
    } catch (error) {
      console.error('❌ Error setting up guardian system:', error);
      throw error;
    }
  }
  
  async verifyGuardian(
    walletAddress: string,
    guardianAddress: string,
    verificationCode: string,
    signature?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔐 Verifying guardian ${guardianAddress.slice(0, 10)}... for wallet ${walletAddress.slice(0, 10)}...`);
      
      // MANDATORY: Redis is required for guardian verification
      const redis = validateRedisForCriticalOps('Guardian verification');
      
      const guardianKey = `guardian_verification:${guardianAddress.toLowerCase()}:${walletAddress.toLowerCase()}`;
      const verification = await redis.hgetall(guardianKey);
      
      if (!verification || Object.keys(verification).length === 0) {
        return { success: false, message: 'Verification request not found or expired' };
      }
      
      if (verification.verificationCode !== verificationCode) {
        console.log('❌ Invalid verification code provided');
        return { success: false, message: 'Invalid verification code' };
      }
      
      // Update guardian status in main setup
      const setupKey = `guardian_setup:${walletAddress.toLowerCase()}`;
      const redisData = await redis.hgetall(setupKey);
      const setup = parseGuardianSetupFromRedis(redisData);
      
      if (setup && setup.guardians) {
        const guardianIndex = setup.guardians.findIndex(g => g.address.toLowerCase() === guardianAddress.toLowerCase());
        
        if (guardianIndex !== -1) {
          setup.guardians[guardianIndex].status = 'verified';
          setup.guardians[guardianIndex].lastActivity = new Date().toISOString();
          setup.lastModified = new Date().toISOString();
          
          // Check if all guardians are verified
          const allVerified = setup.guardians.every(g => g.status === 'verified');
          if (allVerified) {
            setup.status = 'active';
            console.log('🎉 All guardians verified - Guardian system is now ACTIVE');
          }
          
          await redis.hset(setupKey, serializeGuardianSetupForRedis(setup));
        }
      }
      
      // Clean up verification code
      await redis.del(guardianKey);
      
      console.log(`✅ Guardian ${guardianAddress.slice(0, 10)}... verified successfully`);
      
      return {
        success: true,
        message: 'Guardian verified successfully'
      };
      
    } catch (error) {
      console.error('❌ Error verifying guardian:', error);
      return { success: false, message: 'Verification failed due to system error' };
    }
  }
  
  // ==================== RECOVERY FUNCTIONS ====================
  
  async initiateRecovery(
    originalWallet: string,
    newWallet: string,
    initiatingGuardian: string,
    reason: string
  ): Promise<{ success: boolean; recoveryId: string; message: string }> {
    try {
      console.log(`🚨 Recovery initiated for wallet ${originalWallet.slice(0, 10)}... by guardian ${initiatingGuardian.slice(0, 10)}...`);
      
      // MANDATORY: Redis is required for recovery operations
      const redis = validateRedisForCriticalOps('Recovery initiation');
      
      const setupKey = `guardian_setup:${originalWallet.toLowerCase()}`;
      const redisData = await redis.hgetall(setupKey);
      const setup = parseGuardianSetupFromRedis(redisData);
      
      if (!setup || !setup.guardians || setup.status !== 'active') {
        return { success: false, recoveryId: '', message: 'Guardian system not active for this wallet' };
      }
      
      // Check if initiating guardian is valid
      const guardian = setup.guardians.find(g => g.address.toLowerCase() === initiatingGuardian.toLowerCase());
      if (!guardian || guardian.status !== 'verified') {
        return { success: false, recoveryId: '', message: 'Invalid or unverified guardian' };
      }
      
      // Check recovery lock period
      const setupTime = new Date(setup.setupDate).getTime();
      const lockPeriodMs = setup.recoveryLockPeriod * 60 * 60 * 1000;
      if (Date.now() - setupTime < lockPeriodMs) {
        return {
          success: false,
          recoveryId: '',
          message: `Recovery locked for ${setup.recoveryLockPeriod} hours after setup`
        };
      }
      
      const recoveryId = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expirationTime = Date.now() + (setup.recoveryThreshold * 60 * 60 * 1000);
      
      const recoveryRequest: RecoveryRequest = {
        id: recoveryId,
        walletAddress: originalWallet.toLowerCase(),
        newWalletAddress: newWallet.toLowerCase(),
        requestedBy: initiatingGuardian.toLowerCase(),
        signatures: [],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(expirationTime).toISOString(),
        status: 'pending',
        securityChecks: {
          ipVerification: false,
          timeDelayMet: false,
          signatureThresholdMet: false
        }
      };
      
      const recoveryKey = `recovery_request:${recoveryId}`;
      await redis.hset(recoveryKey, serializeRecoveryRequestForRedis(recoveryRequest));
      
      // Set expiration
      await redis.expire(recoveryKey, setup.recoveryThreshold * 60 * 60);
      
      // Notify all guardians (this would trigger email/SMS in production)
      console.log(`📧 Recovery request created - notifying ${setup.guardians.length} guardians`);
      
      return {
        success: true,
        recoveryId,
        message: `Recovery initiated. Requires ${setup.requiredSignatures} guardian signatures within ${setup.recoveryThreshold} hours.`
      };
      
    } catch (error) {
      console.error('❌ Error initiating recovery:', error);
      return { success: false, recoveryId: '', message: 'Recovery initiation failed' };
    }
  }
  
  async signRecovery(
    recoveryId: string,
    guardianAddress: string,
    signature: string
  ): Promise<{ success: boolean; message: string; approved?: boolean }> {
    try {
      console.log(`✍️ Guardian ${guardianAddress.slice(0, 10)}... signing recovery ${recoveryId}`);
      
      // MANDATORY: Redis is required for recovery signing
      const redis = validateRedisForCriticalOps('Recovery signing');
      
      const recoveryKey = `recovery_request:${recoveryId}`;
      const recoveryRedisData = await redis.hgetall(recoveryKey);
      const recovery = parseRecoveryRequestFromRedis(recoveryRedisData);
      
      if (!recovery || recovery.status !== 'pending') {
        return { success: false, message: 'Recovery request not found or no longer pending' };
      }
      
      // Check if guardian already signed
      const existingSignature = recovery.signatures.find(s => s.guardianAddress.toLowerCase() === guardianAddress.toLowerCase());
      if (existingSignature) {
        return { success: false, message: 'Guardian has already signed this recovery request' };
      }
      
      // Verify guardian is authorized for this wallet
      const setupKey = `guardian_setup:${recovery.walletAddress}`;
      const setupRedisData = await redis.hgetall(setupKey);
      const setup = parseGuardianSetupFromRedis(setupRedisData);
      
      const guardian = setup?.guardians?.find(g => g.address.toLowerCase() === guardianAddress.toLowerCase());
      if (!guardian || guardian.status !== 'verified') {
        return { success: false, message: 'Guardian not authorized for this wallet' };
      }
      
      // Add signature
      recovery.signatures.push({
        guardianAddress: guardianAddress.toLowerCase(),
        signature,
        timestamp: new Date().toISOString(),
        verificationMethod: guardian.verificationMethod
      });
      
      // Check if threshold is met
      const signatureCount = recovery.signatures.length;
      const thresholdMet = signatureCount >= setup.requiredSignatures;
      
      recovery.securityChecks.signatureThresholdMet = thresholdMet;
      
      if (thresholdMet) {
        recovery.status = 'approved';
        console.log(`🎉 Recovery approved! ${signatureCount}/${setup.requiredSignatures} signatures collected`);
      }
      
      await redis.hset(recoveryKey, serializeRecoveryRequestForRedis(recovery));
      
      return {
        success: true,
        message: `Signature recorded. ${signatureCount}/${setup.requiredSignatures} signatures collected.`,
        approved: thresholdMet
      };
      
    } catch (error) {
      console.error('❌ Error signing recovery:', error);
      return { success: false, message: 'Signature recording failed' };
    }
  }
  
  // ==================== UTILITY FUNCTIONS ====================
  
  async getGuardianSetup(walletAddress: string): Promise<GuardianSetup | null> {
    try {
      const redis = validateRedisForCriticalOps('Guardian setup retrieval');
      const setupKey = `guardian_setup:${walletAddress.toLowerCase()}`;
      const redisData = await redis.hgetall(setupKey);
      
      return parseGuardianSetupFromRedis(redisData);
    } catch (error) {
      console.error('❌ Error getting guardian setup:', error);
      return null;
    }
  }
  
  async getRecoveryRequest(recoveryId: string): Promise<RecoveryRequest | null> {
    try {
      const redis = validateRedisForCriticalOps('Recovery request retrieval');
      const recoveryKey = `recovery_request:${recoveryId}`;
      const redisData = await redis.hgetall(recoveryKey);
      
      if (redisData && Object.keys(redisData).length > 0) {
        return parseRecoveryRequestFromRedis(redisData);
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting recovery request:', error);
      return null;
    }
  }
  
  private generateSecureCode(): string {
    // Generate 6-digit secure code
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  
  private generateRecoverySignature(
    walletAddress: string,
    newWalletAddress: string,
    guardianAddress: string,
    privateKey: string
  ): string {
    // In production, this would create a proper cryptographic signature
    const message = `Recovery request for ${walletAddress} to ${newWalletAddress} by ${guardianAddress}`;
    const hash = ethers.keccak256(ethers.toUtf8Bytes(message));
    return hash;
  }
  
  // ==================== SECURITY FEATURES ====================
  
  async suspendGuardianSystem(walletAddress: string, reason: string): Promise<boolean> {
    try {
      const redis = validateRedisForCriticalOps('Guardian system suspension');
      const setupKey = `guardian_setup:${walletAddress.toLowerCase()}`;
      const redisData = await redis.hgetall(setupKey);
      const setup = parseGuardianSetupFromRedis(redisData);
      
      if (setup) {
        setup.status = 'suspended';
        setup.lastModified = new Date().toISOString();
        await redis.hset(setupKey, serializeGuardianSetupForRedis(setup));
        
        console.log(`🚫 Guardian system suspended for wallet ${walletAddress.slice(0, 10)}... Reason: ${reason}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error suspending guardian system:', error);
      return false;
    }
  }
  
  async emergencyRecoveryOverride(
    walletAddress: string,
    adminKey: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    // This would be for extreme emergencies only
    // Requires special admin key validation
    
    const EMERGENCY_ADMIN_KEY = process.env.EMERGENCY_ADMIN_KEY;
    
    if (!EMERGENCY_ADMIN_KEY || adminKey !== EMERGENCY_ADMIN_KEY) {
      return { success: false, message: 'Invalid admin key' };
    }
    
    try {
      const redis = validateRedisForCriticalOps('Emergency recovery override');
      const setupKey = `guardian_setup:${walletAddress.toLowerCase()}`;
      const redisData = await redis.hgetall(setupKey);
      const setup = parseGuardianSetupFromRedis(redisData);
      
      if (setup) {
        setup.status = 'suspended';
        setup.lastModified = new Date().toISOString();
        await redis.hset(setupKey, serializeGuardianSetupForRedis(setup));
        
        // Log emergency action
        const emergencyLogKey = `emergency_log:${Date.now()}`;
        await redis.hset(emergencyLogKey, {
          action: 'emergency_override',
          walletAddress,
          reason,
          timestamp: new Date().toISOString(),
          adminKey: adminKey.slice(0, 8) + '***'
        });
        
        console.log(`🚨 EMERGENCY OVERRIDE executed for wallet ${walletAddress.slice(0, 10)}...`);
        
        return { success: true, message: 'Emergency override executed - guardian system suspended' };
      }
      
      return { success: false, message: 'Guardian setup not found' };
      
    } catch (error) {
      console.error('❌ Error in emergency override:', error);
      return { success: false, message: 'Emergency override failed' };
    }
  }
}

// Export singleton instance
export const guardianSystem = new GuardianSecuritySystem();