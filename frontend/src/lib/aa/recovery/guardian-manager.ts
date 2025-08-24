/**
 * Guardian Manager
 * Handles guardian invitation, management, and recovery operations
 */

import { RECOVERY_CONFIG, type Guardian, type RecoveryRequest, type RecoveryPolicy } from './config';

/**
 * Guardian storage interface
 */
interface GuardianStorage {
  guardians: Guardian[];
  pendingInvites: Array<{
    id: string;
    guardianEmail: string;
    inviteCode: string;
    expiresAt: number;
    createdAt: number;
  }>;
  recoveryRequests: RecoveryRequest[];
  policy: RecoveryPolicy;
}

/**
 * Get guardian storage for an account
 */
export function getGuardianStorage(account: string): GuardianStorage {
  if (typeof window === 'undefined') {
    return {
      guardians: [],
      pendingInvites: [],
      recoveryRequests: [],
      policy: RECOVERY_CONFIG.defaultPolicy,
    };
  }
  
  const key = `recovery:${account.toLowerCase()}`;
  const stored = localStorage.getItem(key);
  
  if (!stored) {
    return {
      guardians: [],
      pendingInvites: [],
      recoveryRequests: [],
      policy: RECOVERY_CONFIG.defaultPolicy,
    };
  }
  
  try {
    return JSON.parse(stored);
  } catch {
    return {
      guardians: [],
      pendingInvites: [],
      recoveryRequests: [],
      policy: RECOVERY_CONFIG.defaultPolicy,
    };
  }
}

/**
 * Save guardian storage for an account
 */
export function saveGuardianStorage(account: string, storage: GuardianStorage): void {
  if (typeof window === 'undefined') return;
  
  const key = `recovery:${account.toLowerCase()}`;
  localStorage.setItem(key, JSON.stringify(storage));
}

/**
 * Add a guardian to the account
 */
export function addGuardian(
  account: string,
  guardian: Omit<Guardian, 'addedAt' | 'isActive'>
): { success: boolean; error?: string } {
  const storage = getGuardianStorage(account);
  
  // Check if already exists
  if (storage.guardians.some(g => g.address.toLowerCase() === guardian.address.toLowerCase())) {
    return { success: false, error: 'Guardian already exists' };
  }
  
  // Check max guardians
  if (storage.guardians.length >= storage.policy.maxGuardians) {
    return { success: false, error: `Maximum ${storage.policy.maxGuardians} guardians allowed` };
  }
  
  // Add the guardian
  const newGuardian: Guardian = {
    ...guardian,
    address: guardian.address.toLowerCase(),
    addedAt: Date.now(),
    isActive: true,
  };
  
  storage.guardians.push(newGuardian);
  saveGuardianStorage(account, storage);
  
  return { success: true };
}

/**
 * Remove a guardian from the account
 */
export function removeGuardian(
  account: string,
  guardianAddress: string
): { success: boolean; error?: string } {
  const storage = getGuardianStorage(account);
  
  // Check minimum guardians
  const activeGuardians = storage.guardians.filter(g => g.isActive);
  if (activeGuardians.length <= storage.policy.minGuardians) {
    return { success: false, error: `Minimum ${storage.policy.minGuardians} guardians required` };
  }
  
  // Remove the guardian
  storage.guardians = storage.guardians.filter(
    g => g.address.toLowerCase() !== guardianAddress.toLowerCase()
  );
  
  // Remove any approvals from this guardian in pending requests
  storage.recoveryRequests.forEach(request => {
    if (request.status === 'pending') {
      request.guardianApprovals = request.guardianApprovals.filter(
        a => a.toLowerCase() !== guardianAddress.toLowerCase()
      );
    }
  });
  
  saveGuardianStorage(account, storage);
  
  return { success: true };
}

/**
 * Create a recovery request
 */
export function createRecoveryRequest(
  account: string,
  initiator: string,
  newOwner: string
): { success: boolean; requestId?: string; error?: string } {
  const storage = getGuardianStorage(account);
  
  // Check if there's already a pending request
  const pendingRequest = storage.recoveryRequests.find(
    r => r.status === 'pending' || r.status === 'ready'
  );
  
  if (pendingRequest) {
    return { success: false, error: 'Recovery already in progress' };
  }
  
  // Check cooldown period from last cancelled/executed request
  const lastRequest = storage.recoveryRequests
    .filter(r => r.status === 'cancelled' || r.status === 'executed')
    .sort((a, b) => (b.cancelledAt || b.executesAt) - (a.cancelledAt || a.executesAt))[0];
  
  if (lastRequest) {
    const lastActivityTime = lastRequest.cancelledAt || lastRequest.executesAt;
    const cooldownEnd = lastActivityTime + (storage.policy.cooldownPeriod * 1000);
    
    if (Date.now() < cooldownEnd) {
      const remaining = Math.ceil((cooldownEnd - Date.now()) / 1000);
      return { success: false, error: `Cooldown period active. Wait ${remaining} seconds` };
    }
  }
  
  // Create the request
  const requestId = `recovery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const request: RecoveryRequest = {
    id: requestId,
    initiator: initiator.toLowerCase(),
    newOwner: newOwner.toLowerCase(),
    guardianApprovals: [],
    requiredApprovals: storage.policy.threshold,
    createdAt: Date.now(),
    executesAt: Date.now() + (storage.policy.recoveryDelay * 1000),
    status: 'pending',
  };
  
  storage.recoveryRequests.push(request);
  saveGuardianStorage(account, storage);
  
  // Send notifications if enabled
  if (RECOVERY_CONFIG.notifications.recoveryInitiated) {
    notifyRecoveryInitiated(account, request);
  }
  
  return { success: true, requestId };
}

/**
 * Approve a recovery request
 */
export function approveRecoveryRequest(
  account: string,
  requestId: string,
  guardianAddress: string
): { success: boolean; error?: string } {
  const storage = getGuardianStorage(account);
  
  // Find the request
  const request = storage.recoveryRequests.find(r => r.id === requestId);
  if (!request) {
    return { success: false, error: 'Recovery request not found' };
  }
  
  if (request.status !== 'pending') {
    return { success: false, error: 'Request is not pending' };
  }
  
  // Check if guardian exists and is active
  const guardian = storage.guardians.find(
    g => g.address.toLowerCase() === guardianAddress.toLowerCase()
  );
  
  if (!guardian || !guardian.isActive) {
    return { success: false, error: 'Invalid or inactive guardian' };
  }
  
  // Check if already approved
  if (request.guardianApprovals.includes(guardianAddress.toLowerCase())) {
    return { success: false, error: 'Already approved by this guardian' };
  }
  
  // Add approval
  request.guardianApprovals.push(guardianAddress.toLowerCase());
  
  // Update guardian activity
  guardian.lastActivity = Date.now();
  
  // Check if threshold reached
  if (request.guardianApprovals.length >= request.requiredApprovals) {
    request.status = 'ready';
    
    // Send notification
    if (RECOVERY_CONFIG.notifications.recoveryApproved) {
      notifyRecoveryReady(account, request);
    }
  }
  
  saveGuardianStorage(account, storage);
  
  return { success: true };
}

/**
 * Execute a recovery request
 */
export function executeRecoveryRequest(
  account: string,
  requestId: string
): { success: boolean; error?: string } {
  const storage = getGuardianStorage(account);
  
  // Find the request
  const request = storage.recoveryRequests.find(r => r.id === requestId);
  if (!request) {
    return { success: false, error: 'Recovery request not found' };
  }
  
  if (request.status !== 'ready') {
    return { success: false, error: 'Request is not ready for execution' };
  }
  
  // Check if delay period has passed
  if (Date.now() < request.executesAt) {
    const remaining = Math.ceil((request.executesAt - Date.now()) / 1000);
    return { success: false, error: `Wait ${remaining} seconds before execution` };
  }
  
  // Check if within cancel window
  const cancelDeadline = request.createdAt + (storage.policy.cancelWindow * 1000);
  if (Date.now() > cancelDeadline) {
    request.status = 'cancelled';
    request.cancelledAt = Date.now();
    saveGuardianStorage(account, storage);
    return { success: false, error: 'Cancel window expired' };
  }
  
  // Execute the recovery
  request.status = 'executed';
  
  // In production, this would trigger the actual on-chain recovery
  // For now, we just update the status
  
  saveGuardianStorage(account, storage);
  
  // Send notification
  if (RECOVERY_CONFIG.notifications.recoveryExecuted) {
    notifyRecoveryExecuted(account, request);
  }
  
  return { success: true };
}

/**
 * Cancel a recovery request
 */
export function cancelRecoveryRequest(
  account: string,
  requestId: string,
  cancelledBy: string
): { success: boolean; error?: string } {
  const storage = getGuardianStorage(account);
  
  // Find the request
  const request = storage.recoveryRequests.find(r => r.id === requestId);
  if (!request) {
    return { success: false, error: 'Recovery request not found' };
  }
  
  if (request.status === 'executed' || request.status === 'cancelled') {
    return { success: false, error: `Request already ${request.status}` };
  }
  
  // Check if within cancel window
  const cancelDeadline = request.createdAt + (storage.policy.cancelWindow * 1000);
  if (Date.now() > cancelDeadline) {
    return { success: false, error: 'Cancel window expired' };
  }
  
  // Cancel the request
  request.status = 'cancelled';
  request.cancelledBy = cancelledBy.toLowerCase();
  request.cancelledAt = Date.now();
  
  saveGuardianStorage(account, storage);
  
  // Send notification
  if (RECOVERY_CONFIG.notifications.recoveryCancelled) {
    notifyRecoveryCancelled(account, request);
  }
  
  return { success: true };
}

/**
 * Get recovery status for an account
 */
export function getRecoveryStatus(account: string): {
  hasGuardians: boolean;
  guardianCount: number;
  activeRequest?: RecoveryRequest;
  canInitiateRecovery: boolean;
  cooldownRemaining?: number;
} {
  const storage = getGuardianStorage(account);
  const activeGuardians = storage.guardians.filter(g => g.isActive);
  
  // Find active request
  const activeRequest = storage.recoveryRequests.find(
    r => r.status === 'pending' || r.status === 'ready'
  );
  
  // Check cooldown
  let cooldownRemaining: number | undefined;
  const lastRequest = storage.recoveryRequests
    .filter(r => r.status === 'cancelled' || r.status === 'executed')
    .sort((a, b) => (b.cancelledAt || b.executesAt) - (a.cancelledAt || a.executesAt))[0];
  
  if (lastRequest) {
    const lastActivityTime = lastRequest.cancelledAt || lastRequest.executesAt;
    const cooldownEnd = lastActivityTime + (storage.policy.cooldownPeriod * 1000);
    
    if (Date.now() < cooldownEnd) {
      cooldownRemaining = Math.ceil((cooldownEnd - Date.now()) / 1000);
    }
  }
  
  return {
    hasGuardians: activeGuardians.length >= storage.policy.minGuardians,
    guardianCount: activeGuardians.length,
    activeRequest,
    canInitiateRecovery: !activeRequest && !cooldownRemaining && activeGuardians.length >= storage.policy.minGuardians,
    cooldownRemaining,
  };
}

/**
 * Update recovery policy
 */
export function updateRecoveryPolicy(
  account: string,
  updates: Partial<RecoveryPolicy>
): { success: boolean; errors?: string[] } {
  const storage = getGuardianStorage(account);
  
  // Validate the updates
  const errors: string[] = [];
  
  if (updates.threshold !== undefined && updates.threshold > storage.guardians.length) {
    errors.push('Threshold cannot exceed current guardian count');
  }
  
  if (updates.minGuardians !== undefined && updates.minGuardians > storage.guardians.length) {
    errors.push('Minimum guardians cannot exceed current guardian count');
  }
  
  if (errors.length > 0) {
    return { success: false, errors };
  }
  
  // Apply updates
  storage.policy = {
    ...storage.policy,
    ...updates,
  };
  
  saveGuardianStorage(account, storage);
  
  return { success: true };
}

// Notification helpers (placeholders for actual implementation)
function notifyRecoveryInitiated(account: string, request: RecoveryRequest) {
  console.log('[Recovery] Initiated for', account, request);
  // In production: Send email/push notifications to guardians
}

function notifyRecoveryReady(account: string, request: RecoveryRequest) {
  console.log('[Recovery] Ready for execution', account, request);
  // In production: Notify owner about ready recovery
}

function notifyRecoveryExecuted(account: string, request: RecoveryRequest) {
  console.log('[Recovery] Executed', account, request);
  // In production: Notify all parties about executed recovery
}

function notifyRecoveryCancelled(account: string, request: RecoveryRequest) {
  console.log('[Recovery] Cancelled', account, request);
  // In production: Notify about cancellation
}