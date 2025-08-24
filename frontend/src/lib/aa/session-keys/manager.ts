/**
 * Session Keys Manager
 * Handle creation, storage, and validation of session keys
 */

import { 
  SessionPolicy, 
  validateSessionPolicy, 
  isSessionExpired,
  isOperationAllowed,
  SESSION_CONFIG 
} from './config';

// Generate cryptographically secure random bytes
function generateRandomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  }
  return array;
}

// Convert bytes to hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export class SessionKeyManager {
  private sessions: Map<string, SessionPolicy> = new Map();
  private accountSessions: Map<string, Set<string>> = new Map();
  
  constructor() {
    // Load sessions from storage
    this.loadSessions();
    
    // Start cleanup interval
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), 60000); // Every minute
    }
  }
  
  /**
   * Generate ephemeral keypair for session
   */
  async generateSessionKey(): Promise<{
    address: string;
    privateKey: string;
  }> {
    // Generate random private key (32 bytes)
    const privateKeyBytes = generateRandomBytes(32);
    const privateKey = '0x' + bytesToHex(privateKeyBytes);
    
    // Derive address from private key (simplified for demo)
    // In production, use proper elliptic curve derivation
    const addressBytes = generateRandomBytes(20);
    const address = '0x' + bytesToHex(addressBytes);
    
    return {
      address,
      privateKey,
    };
  }
  
  /**
   * Create new session
   */
  async createSession(
    account: string,
    policy: Omit<SessionPolicy, 'sessionId' | 'createdAt' | 'useCount' | 'nonceScope' | 'usedNonces'>
  ): Promise<{ sessionId: string; sessionKey: string; errors?: string[] }> {
    // Validate policy
    const errors = validateSessionPolicy(policy);
    if (errors.length > 0) {
      return { sessionId: '', sessionKey: '', errors };
    }
    
    // Check concurrent sessions limit
    const accountSessionIds = this.accountSessions.get(account) || new Set();
    if (accountSessionIds.size >= SESSION_CONFIG.security.maxConcurrentSessions) {
      return { 
        sessionId: '', 
        sessionKey: '', 
        errors: [`Maximum ${SESSION_CONFIG.security.maxConcurrentSessions} concurrent sessions allowed`] 
      };
    }
    
    // Generate session ID
    const sessionId = 'session_' + Date.now() + '_' + bytesToHex(generateRandomBytes(8));
    
    // Create full policy
    const fullPolicy: SessionPolicy = {
      ...policy,
      sessionId,
      account,
      createdAt: Date.now(),
      useCount: 0,
      nonceScope: sessionId, // Use session ID as nonce scope
      usedNonces: [],
    };
    
    // Store session
    this.sessions.set(sessionId, fullPolicy);
    
    // Track by account
    if (!this.accountSessions.has(account)) {
      this.accountSessions.set(account, new Set());
    }
    this.accountSessions.get(account)!.add(sessionId);
    
    // Persist to storage
    this.saveSessions();
    
    console.log('[SessionKeys] Session created:', {
      sessionId,
      account: account.slice(0, 10) + '...',
      expiresIn: Math.floor((fullPolicy.expiresAt - Date.now()) / 1000) + 's',
    });
    
    return { sessionId, sessionKey: policy.sessionKey };
  }
  
  /**
   * Get session by ID
   */
  getSession(sessionId: string): SessionPolicy | null {
    return this.sessions.get(sessionId) || null;
  }
  
  /**
   * Get all sessions for account
   */
  getAccountSessions(account: string): SessionPolicy[] {
    const sessionIds = this.accountSessions.get(account) || new Set();
    return Array.from(sessionIds)
      .map(id => this.sessions.get(id))
      .filter((s): s is SessionPolicy => s !== undefined)
      .sort((a, b) => b.createdAt - a.createdAt);
  }
  
  /**
   * Get active sessions for account
   */
  getActiveSessions(account: string): SessionPolicy[] {
    return this.getAccountSessions(account)
      .filter(s => !isSessionExpired(s));
  }
  
  /**
   * Use session for operation
   */
  async useSession(
    sessionId: string,
    operation: {
      to: string;
      value: bigint;
      data: string;
      chainId: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }
    
    // Check if operation is allowed
    const validation = isOperationAllowed(session, operation);
    if (!validation.allowed) {
      return { success: false, error: validation.reason };
    }
    
    // Update session usage
    session.lastUsedAt = Date.now();
    session.useCount++;
    
    // Check daily limit
    const dailySpent = await this.getDailySpent(session);
    if (dailySpent + operation.value > session.dailyLimit) {
      return { success: false, error: 'Daily limit exceeded' };
    }
    
    // Save updated session
    this.saveSessions();
    
    console.log('[SessionKeys] Session used:', {
      sessionId,
      operation: operation.data.slice(0, 10),
      value: operation.value.toString(),
    });
    
    return { success: true };
  }
  
  /**
   * Revoke session
   */
  revokeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    
    // Remove from maps
    this.sessions.delete(sessionId);
    const accountSessions = this.accountSessions.get(session.account);
    if (accountSessions) {
      accountSessions.delete(sessionId);
    }
    
    // Update storage
    this.saveSessions();
    
    console.log('[SessionKeys] Session revoked:', sessionId);
    
    return true;
  }
  
  /**
   * Revoke all sessions for account (Kill Switch)
   */
  revokeAllSessions(account: string): number {
    const sessionIds = this.accountSessions.get(account) || new Set();
    let revoked = 0;
    
    for (const sessionId of sessionIds) {
      if (this.revokeSession(sessionId)) {
        revoked++;
      }
    }
    
    console.log('[SessionKeys] All sessions revoked for account:', {
      account: account.slice(0, 10) + '...',
      count: revoked,
    });
    
    return revoked;
  }
  
  /**
   * Get daily spent amount for session
   */
  private async getDailySpent(session: SessionPolicy): Promise<bigint> {
    // In production, track actual spending
    // For demo, return mock value
    const hoursSinceCreation = (Date.now() - session.createdAt) / 3600000;
    const mockDailySpent = session.maxValue * BigInt(Math.floor(hoursSinceCreation));
    return mockDailySpent > session.dailyLimit ? session.dailyLimit : mockDailySpent;
  }
  
  /**
   * Clean up expired sessions
   */
  private cleanup() {
    let cleaned = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      // Remove expired sessions
      if (isSessionExpired(session)) {
        this.sessions.delete(sessionId);
        const accountSessions = this.accountSessions.get(session.account);
        if (accountSessions) {
          accountSessions.delete(sessionId);
        }
        cleaned++;
        continue;
      }
      
      // Remove inactive sessions
      const inactivityMs = SESSION_CONFIG.security.inactivityTimeout * 3600000;
      const lastActivity = session.lastUsedAt || session.createdAt;
      if (Date.now() - lastActivity > inactivityMs) {
        this.sessions.delete(sessionId);
        const accountSessions = this.accountSessions.get(session.account);
        if (accountSessions) {
          accountSessions.delete(sessionId);
        }
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.saveSessions();
      console.log('[SessionKeys] Cleanup completed:', { removed: cleaned });
    }
  }
  
  /**
   * Load sessions from storage
   */
  private loadSessions() {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('aa_sessions');
      if (stored) {
        const data = JSON.parse(stored);
        
        // Rebuild maps
        for (const session of data.sessions) {
          // Convert bigint fields
          session.maxValue = BigInt(session.maxValue || 0);
          session.maxGas = BigInt(session.maxGas || 0);
          session.dailyLimit = BigInt(session.dailyLimit || 0);
          
          this.sessions.set(session.sessionId, session);
          
          if (!this.accountSessions.has(session.account)) {
            this.accountSessions.set(session.account, new Set());
          }
          this.accountSessions.get(session.account)!.add(session.sessionId);
        }
        
        console.log('[SessionKeys] Loaded sessions:', this.sessions.size);
      }
    } catch (error) {
      console.error('[SessionKeys] Failed to load sessions:', error);
    }
  }
  
  /**
   * Save sessions to storage
   */
  private saveSessions() {
    if (typeof window === 'undefined') return;
    
    try {
      const data = {
        sessions: Array.from(this.sessions.values()).map(s => ({
          ...s,
          // Convert bigint to string for JSON
          maxValue: s.maxValue.toString(),
          maxGas: s.maxGas.toString(),
          dailyLimit: s.dailyLimit.toString(),
        })),
      };
      
      localStorage.setItem('aa_sessions', JSON.stringify(data));
    } catch (error) {
      console.error('[SessionKeys] Failed to save sessions:', error);
    }
  }
}

// Singleton instance
let managerInstance: SessionKeyManager | null = null;

/**
 * Get session key manager instance
 */
export function getSessionKeyManager(): SessionKeyManager {
  if (!managerInstance) {
    managerInstance = new SessionKeyManager();
  }
  return managerInstance;
}