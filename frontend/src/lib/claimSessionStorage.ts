/**
 * CLAIM SESSION STORAGE UTILITY
 * Persists claim session data to localStorage for recovery after reload
 * Handles expiration and cleanup automatically
 * 
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */

export interface ClaimSession {
  tokenId: string;
  giftId?: string; // CRITICAL FIX: Real giftId for email/appointment saving
  sessionToken: string;
  salt: string;
  educationGateData?: string;
  requiresEducation: boolean;
  educationModules?: number[];
  currentModuleIndex?: number;
  flowState: 'pre_validation' | 'education' | 'claim' | 'success';
  passwordValidated: boolean;
  educationCompleted: boolean;
  timestamp: number;
  expiresAt: number;
}

const SESSION_KEY_PREFIX = 'cryptogift_claim_session_';
const SESSION_TTL = 3600000; // 1 hour in milliseconds (matches backend)

/**
 * Save claim session to localStorage
 */
export function saveClaimSession(tokenId: string, session: Partial<ClaimSession>): void {
  try {
    if (typeof window === 'undefined') return;
    
    const now = Date.now();
    const fullSession: ClaimSession = {
      tokenId,
      sessionToken: session.sessionToken || '',
      salt: session.salt || '',
      educationGateData: session.educationGateData,
      requiresEducation: session.requiresEducation || false,
      educationModules: session.educationModules,
      currentModuleIndex: session.currentModuleIndex,
      flowState: session.flowState || 'pre_validation',
      passwordValidated: session.passwordValidated || false,
      educationCompleted: session.educationCompleted || false,
      timestamp: now,
      expiresAt: now + SESSION_TTL,
      ...session
    };

    const key = `${SESSION_KEY_PREFIX}${tokenId}`;
    localStorage.setItem(key, JSON.stringify(fullSession));
    
    console.log('💾 Claim session saved:', {
      tokenId,
      flowState: fullSession.flowState,
      passwordValidated: fullSession.passwordValidated,
      educationCompleted: fullSession.educationCompleted,
      expiresAt: new Date(fullSession.expiresAt).toISOString()
    });
  } catch (error) {
    console.warn('⚠️ Failed to save claim session:', error);
  }
}

/**
 * Load claim session from localStorage
 */
export function loadClaimSession(tokenId: string): ClaimSession | null {
  try {
    if (typeof window === 'undefined') return null;
    
    const key = `${SESSION_KEY_PREFIX}${tokenId}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      console.log('📭 No stored session found for token:', tokenId);
      return null;
    }
    
    const session: ClaimSession = JSON.parse(stored);
    const now = Date.now();
    
    // Check if session has expired
    if (session.expiresAt < now) {
      console.log('⏰ Session expired, removing:', {
        tokenId,
        expiredAt: new Date(session.expiresAt).toISOString(),
        currentTime: new Date(now).toISOString()
      });
      clearClaimSession(tokenId);
      return null;
    }
    
    // Session is valid
    const remainingTime = Math.floor((session.expiresAt - now) / 1000 / 60); // minutes
    console.log('✅ Valid session recovered:', {
      tokenId,
      flowState: session.flowState,
      passwordValidated: session.passwordValidated,
      educationCompleted: session.educationCompleted,
      remainingMinutes: remainingTime,
      hasGateData: !!session.educationGateData && session.educationGateData !== '0x'
    });
    
    return session;
  } catch (error) {
    console.warn('⚠️ Failed to load claim session:', error);
    return null;
  }
}

/**
 * Clear claim session from localStorage
 */
export function clearClaimSession(tokenId: string): void {
  try {
    if (typeof window === 'undefined') return;
    
    const key = `${SESSION_KEY_PREFIX}${tokenId}`;
    localStorage.removeItem(key);
    
    console.log('🗑️ Claim session cleared for token:', tokenId);
  } catch (error) {
    console.warn('⚠️ Failed to clear claim session:', error);
  }
}

/**
 * Update specific fields in the session
 */
export function updateClaimSession(tokenId: string, updates: Partial<ClaimSession>): void {
  const existing = loadClaimSession(tokenId);
  if (existing) {
    saveClaimSession(tokenId, {
      ...existing,
      ...updates
    });
  } else {
    // Create new session if doesn't exist
    saveClaimSession(tokenId, updates);
  }
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions(): void {
  try {
    if (typeof window === 'undefined') return;
    
    const now = Date.now();
    const keys = Object.keys(localStorage);
    let cleaned = 0;
    
    keys.forEach(key => {
      if (key.startsWith(SESSION_KEY_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const session: ClaimSession = JSON.parse(stored);
            if (session.expiresAt < now) {
              localStorage.removeItem(key);
              cleaned++;
            }
          }
        } catch (error) {
          // Remove corrupted entries
          localStorage.removeItem(key);
          cleaned++;
        }
      }
    });
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired claim sessions`);
    }
  } catch (error) {
    console.warn('⚠️ Failed to cleanup expired sessions:', error);
  }
}

/**
 * Check if user can skip education (already completed in this session)
 */
export function canSkipEducation(tokenId: string): boolean {
  const session = loadClaimSession(tokenId);
  if (!session) return false;
  
  // Check if education was completed and we have valid gate data
  return session.educationCompleted && 
         !!session.educationGateData && 
         session.educationGateData !== '0x';
}

/**
 * Check if session needs refresh (less than 5 minutes remaining)
 */
export function sessionNeedsRefresh(tokenId: string): boolean {
  const session = loadClaimSession(tokenId);
  if (!session) return true;
  
  const now = Date.now();
  const remainingMs = session.expiresAt - now;
  const fiveMinutes = 5 * 60 * 1000;
  
  return remainingMs < fiveMinutes;
}