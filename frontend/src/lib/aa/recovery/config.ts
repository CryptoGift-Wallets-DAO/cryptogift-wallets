/**
 * Recovery System Configuration
 * Social recovery with guardians and passkeys (WebAuthn/P256)
 */

// P256VERIFY precompile address on Base (RIP-7212)
export const P256_VERIFY_ADDRESS = '0x0000000000000000000000000000000000000100';

export interface Guardian {
  address: string;
  name: string;
  email?: string;
  addedAt: number;
  lastActivity?: number;
  isActive: boolean;
}

export interface RecoveryRequest {
  id: string;
  initiator: string;
  newOwner: string;
  guardianApprovals: string[];
  requiredApprovals: number;
  createdAt: number;
  executesAt: number; // Timestamp when recovery can be executed
  status: 'pending' | 'ready' | 'executed' | 'cancelled';
  cancelledBy?: string;
  cancelledAt?: number;
}

export interface PasskeyCredential {
  id: string; // Credential ID from WebAuthn
  publicKey: string; // P256 public key
  name: string; // User-friendly name
  createdAt: number;
  lastUsedAt?: number;
  counter: number; // Signature counter for replay protection
  deviceInfo?: string; // Optional device information
}

export interface RecoveryPolicy {
  // Guardian settings
  minGuardians: number; // Minimum number of guardians required
  threshold: number; // n-of-m threshold for recovery
  maxGuardians: number; // Maximum allowed guardians
  
  // Time delays
  recoveryDelay: number; // Delay before recovery execution (seconds)
  cancelWindow: number; // Window to cancel recovery (seconds)
  cooldownPeriod: number; // Cooldown after failed recovery (seconds)
  
  // Passkey settings
  passkeysEnabled: boolean;
  maxPasskeys: number;
  requirePasskeyForRecovery: boolean;
  
  // Security settings
  requireOwnerApproval: boolean; // Owner must approve guardian changes
  notifyOnRecoveryStart: boolean; // Send notifications when recovery starts
  allowEmergencyRecovery: boolean; // Allow bypass with all guardians
}

export const RECOVERY_CONFIG = {
  // Feature flag
  enabled: process.env.NEXT_PUBLIC_FEATURE_RECOVERY === 'on',
  
  // Default policy
  defaultPolicy: {
    minGuardians: 2,
    threshold: 2, // 2-of-3 by default
    maxGuardians: 5,
    recoveryDelay: 86400, // 24 hours
    cancelWindow: 172800, // 48 hours
    cooldownPeriod: 604800, // 7 days
    passkeysEnabled: true,
    maxPasskeys: 3,
    requirePasskeyForRecovery: false,
    requireOwnerApproval: true,
    notifyOnRecoveryStart: true,
    allowEmergencyRecovery: true,
  } as RecoveryPolicy,
  
  // Chain support for P256
  p256Support: {
    // Base and Base Sepolia have P256VERIFY since Fjord upgrade
    8453: true, // Base Mainnet
    84532: true, // Base Sepolia
    // Other chains
    1: false, // Ethereum Mainnet (not yet)
    11155111: false, // Sepolia (not yet)
  },
  
  // WebAuthn configuration
  webauthn: {
    rpName: 'CryptoGift Wallets',
    rpId: typeof window !== 'undefined' ? window.location.hostname : 'cryptogift-wallets.vercel.app',
    timeout: 60000, // 60 seconds
    userVerification: 'preferred' as CredentialMediationRequirement,
    attestation: 'none' as AttestationConveyancePreference,
    authenticatorSelection: {
      authenticatorAttachment: 'platform' as AuthenticatorAttachment,
      requireResidentKey: true,
      residentKey: 'required' as ResidentKeyRequirement,
      userVerification: 'preferred' as UserVerificationRequirement,
    },
  },
  
  // Guardian invitation
  invitation: {
    expiryDays: 7,
    maxPendingInvites: 10,
    requireEmailVerification: false,
  },
  
  // Notification settings
  notifications: {
    guardianAdded: true,
    guardianRemoved: true,
    recoveryInitiated: true,
    recoveryApproved: true,
    recoveryExecuted: true,
    recoveryCancelled: true,
    passkeyAdded: true,
    passkeyRemoved: true,
  },
};

/**
 * Check if P256 is supported on chain
 */
export function isP256Supported(chainId: number): boolean {
  return RECOVERY_CONFIG.p256Support[chainId as keyof typeof RECOVERY_CONFIG.p256Support] || false;
}

/**
 * Validate recovery policy
 */
export function validateRecoveryPolicy(policy: Partial<RecoveryPolicy>): string[] {
  const errors: string[] = [];
  
  if (policy.threshold && policy.minGuardians) {
    if (policy.threshold > policy.minGuardians) {
      errors.push('Threshold cannot exceed minimum guardians');
    }
  }
  
  if (policy.threshold && policy.threshold < 1) {
    errors.push('Threshold must be at least 1');
  }
  
  if (policy.maxGuardians && policy.maxGuardians > 10) {
    errors.push('Maximum 10 guardians allowed');
  }
  
  if (policy.recoveryDelay && policy.recoveryDelay < 3600) {
    errors.push('Recovery delay must be at least 1 hour');
  }
  
  if (policy.cancelWindow && policy.cancelWindow < policy.recoveryDelay!) {
    errors.push('Cancel window must be longer than recovery delay');
  }
  
  return errors;
}

/**
 * Calculate recovery timeline
 */
export function calculateRecoveryTimeline(
  policy: RecoveryPolicy,
  startTime: number = Date.now()
): {
  canExecuteAt: number;
  cancelDeadline: number;
  totalDuration: number;
} {
  const canExecuteAt = startTime + (policy.recoveryDelay * 1000);
  const cancelDeadline = startTime + (policy.cancelWindow * 1000);
  const totalDuration = policy.cancelWindow;
  
  return {
    canExecuteAt,
    cancelDeadline,
    totalDuration,
  };
}

/**
 * Check if recovery can be executed
 */
export function canExecuteRecovery(request: RecoveryRequest): {
  canExecute: boolean;
  reason?: string;
} {
  const now = Date.now();
  
  if (request.status !== 'ready') {
    return { canExecute: false, reason: 'Recovery not ready' };
  }
  
  if (now < request.executesAt) {
    const remaining = Math.ceil((request.executesAt - now) / 1000);
    return { canExecute: false, reason: `Wait ${remaining} seconds` };
  }
  
  return { canExecute: true };
}

/**
 * Check if recovery can be cancelled
 */
export function canCancelRecovery(
  request: RecoveryRequest,
  policy: RecoveryPolicy
): {
  canCancel: boolean;
  reason?: string;
} {
  const now = Date.now();
  const cancelDeadline = request.createdAt + (policy.cancelWindow * 1000);
  
  if (request.status === 'executed') {
    return { canCancel: false, reason: 'Already executed' };
  }
  
  if (request.status === 'cancelled') {
    return { canCancel: false, reason: 'Already cancelled' };
  }
  
  if (now > cancelDeadline) {
    return { canCancel: false, reason: 'Cancel window expired' };
  }
  
  return { canCancel: true };
}