/**
 * Passkey Manager
 * WebAuthn implementation for passkeys with P256 support
 */

import { RECOVERY_CONFIG, type PasskeyCredential, isP256Supported } from './config';

/**
 * Passkey storage interface
 */
interface PasskeyStorage {
  credentials: PasskeyCredential[];
  lastUsedId?: string;
}

/**
 * Get passkey storage for an account
 */
export function getPasskeyStorage(account: string): PasskeyStorage {
  if (typeof window === 'undefined') {
    return { credentials: [] };
  }
  
  const key = `passkeys:${account.toLowerCase()}`;
  const stored = localStorage.getItem(key);
  
  if (!stored) {
    return { credentials: [] };
  }
  
  try {
    return JSON.parse(stored);
  } catch {
    return { credentials: [] };
  }
}

/**
 * Save passkey storage for an account
 */
export function savePasskeyStorage(account: string, storage: PasskeyStorage): void {
  if (typeof window === 'undefined') return;
  
  const key = `passkeys:${account.toLowerCase()}`;
  localStorage.setItem(key, JSON.stringify(storage));
}

/**
 * Check if WebAuthn is supported
 */
export function isWebAuthnSupported(): boolean {
  if (typeof window === 'undefined') return false;
  
  return !!(
    window.PublicKeyCredential &&
    window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable &&
    window.PublicKeyCredential.isConditionalMediationAvailable
  );
}

/**
 * Create a new passkey
 */
export async function createPasskey(
  account: string,
  name: string,
  chainId: number
): Promise<{ success: boolean; credential?: PasskeyCredential; error?: string }> {
  // Check WebAuthn support
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'WebAuthn not supported on this device' };
  }
  
  // Check P256 support for chain
  if (!isP256Supported(chainId)) {
    return { success: false, error: `Chain ${chainId} does not support P256 verification` };
  }
  
  const storage = getPasskeyStorage(account);
  
  // Check max passkeys
  if (storage.credentials.length >= RECOVERY_CONFIG.defaultPolicy.maxPasskeys) {
    return { 
      success: false, 
      error: `Maximum ${RECOVERY_CONFIG.defaultPolicy.maxPasskeys} passkeys allowed` 
    };
  }
  
  try {
    // Check platform authenticator availability
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) {
      return { success: false, error: 'No platform authenticator available' };
    }
    
    // Generate challenge
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    
    // Create credential options
    const createOptions: CredentialCreationOptions = {
      publicKey: {
        challenge,
        rp: {
          name: RECOVERY_CONFIG.webauthn.rpName,
          id: RECOVERY_CONFIG.webauthn.rpId,
        },
        user: {
          id: new TextEncoder().encode(account),
          name: account,
          displayName: `Wallet ${account.slice(0, 6)}...${account.slice(-4)}`,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256 (P-256)
        ],
        authenticatorSelection: RECOVERY_CONFIG.webauthn.authenticatorSelection,
        timeout: RECOVERY_CONFIG.webauthn.timeout,
        attestation: RECOVERY_CONFIG.webauthn.attestation,
        excludeCredentials: storage.credentials.map(cred => ({
          id: base64ToBuffer(cred.id),
          type: 'public-key' as PublicKeyCredentialType,
        })),
      },
    };
    
    // Create the credential
    const credential = await navigator.credentials.create(createOptions) as PublicKeyCredential;
    
    if (!credential || !credential.response) {
      return { success: false, error: 'Failed to create credential' };
    }
    
    const response = credential.response as AuthenticatorAttestationResponse;
    
    // Extract public key from attestation using the correct method
    const publicKeyData = response.getPublicKey ? response.getPublicKey() : null;
    if (!publicKeyData) {
      return { success: false, error: 'Failed to get public key from response' };
    }
    const publicKey = extractPublicKey(publicKeyData);
    if (!publicKey) {
      return { success: false, error: 'Failed to extract public key' };
    }
    
    // Create passkey record
    const passkeyCred: PasskeyCredential = {
      id: bufferToBase64(credential.rawId),
      publicKey,
      name,
      createdAt: Date.now(),
      counter: 0,
      deviceInfo: getDeviceInfo(),
    };
    
    // Save to storage
    storage.credentials.push(passkeyCred);
    savePasskeyStorage(account, storage);
    
    // Send notification if enabled
    if (RECOVERY_CONFIG.notifications.passkeyAdded) {
      console.log('[Passkey] Added:', passkeyCred.name);
    }
    
    return { success: true, credential: passkeyCred };
  } catch (error: any) {
    console.error('[Passkey] Creation failed:', error);
    
    // Handle specific errors
    if (error.name === 'NotAllowedError') {
      return { success: false, error: 'User cancelled or timeout' };
    }
    if (error.name === 'InvalidStateError') {
      return { success: false, error: 'Credential already exists' };
    }
    
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Authenticate with passkey
 */
export async function authenticateWithPasskey(
  account: string,
  credentialId?: string
): Promise<{ success: boolean; signature?: string; error?: string }> {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'WebAuthn not supported' };
  }
  
  const storage = getPasskeyStorage(account);
  
  if (storage.credentials.length === 0) {
    return { success: false, error: 'No passkeys registered' };
  }
  
  try {
    // Generate challenge
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    
    // Get request options
    const requestOptions: CredentialRequestOptions = {
      publicKey: {
        challenge,
        rpId: RECOVERY_CONFIG.webauthn.rpId,
        timeout: RECOVERY_CONFIG.webauthn.timeout,
        userVerification: RECOVERY_CONFIG.webauthn.authenticatorSelection.userVerification,
        allowCredentials: credentialId
          ? [
              {
                id: base64ToBuffer(credentialId),
                type: 'public-key' as PublicKeyCredentialType,
              },
            ]
          : storage.credentials.map(cred => ({
              id: base64ToBuffer(cred.id),
              type: 'public-key' as PublicKeyCredentialType,
            })),
      },
    };
    
    // Get the assertion
    const assertion = await navigator.credentials.get(requestOptions) as PublicKeyCredential;
    
    if (!assertion || !assertion.response) {
      return { success: false, error: 'Authentication failed' };
    }
    
    const response = assertion.response as AuthenticatorAssertionResponse;
    
    // Find the credential
    const credId = bufferToBase64(assertion.rawId);
    const credential = storage.credentials.find(c => c.id === credId);
    
    if (!credential) {
      return { success: false, error: 'Unknown credential' };
    }
    
    // Update counter and last used
    credential.counter++;
    credential.lastUsedAt = Date.now();
    storage.lastUsedId = credential.id;
    savePasskeyStorage(account, storage);
    
    // Extract signature
    const signature = bufferToHex(response.signature);
    
    return { success: true, signature };
  } catch (error: any) {
    console.error('[Passkey] Authentication failed:', error);
    
    if (error.name === 'NotAllowedError') {
      return { success: false, error: 'User cancelled or timeout' };
    }
    
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Remove a passkey
 */
export function removePasskey(
  account: string,
  credentialId: string
): { success: boolean; error?: string } {
  const storage = getPasskeyStorage(account);
  
  const index = storage.credentials.findIndex(c => c.id === credentialId);
  if (index === -1) {
    return { success: false, error: 'Passkey not found' };
  }
  
  // Remove the credential
  storage.credentials.splice(index, 1);
  
  // Update last used if needed
  if (storage.lastUsedId === credentialId) {
    delete storage.lastUsedId;
  }
  
  savePasskeyStorage(account, storage);
  
  // Send notification if enabled
  if (RECOVERY_CONFIG.notifications.passkeyRemoved) {
    console.log('[Passkey] Removed:', credentialId);
  }
  
  return { success: true };
}

/**
 * Get passkey status for an account
 */
export function getPasskeyStatus(account: string): {
  supported: boolean;
  hasPasskeys: boolean;
  passkeyCount: number;
  lastUsedId?: string;
  canAddMore: boolean;
} {
  const storage = getPasskeyStorage(account);
  const maxPasskeys = RECOVERY_CONFIG.defaultPolicy.maxPasskeys;
  
  return {
    supported: isWebAuthnSupported(),
    hasPasskeys: storage.credentials.length > 0,
    passkeyCount: storage.credentials.length,
    lastUsedId: storage.lastUsedId,
    canAddMore: storage.credentials.length < maxPasskeys,
  };
}

/**
 * Verify passkey signature (for recovery)
 */
export async function verifyPasskeySignature(
  account: string,
  credentialId: string,
  signature: string,
  challenge: string
): Promise<boolean> {
  const storage = getPasskeyStorage(account);
  const credential = storage.credentials.find(c => c.id === credentialId);
  
  if (!credential) {
    return false;
  }
  
  // In production, this would verify the signature using the P256VERIFY precompile
  // For now, we just check that the credential exists
  console.log('[Passkey] Verify signature for:', credential.name);
  
  return true;
}

// Helper functions

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function extractPublicKey(publicKeyBuffer: ArrayBuffer | null): string | null {
  if (!publicKeyBuffer) return null;
  
  try {
    // Parse COSE public key
    // This is a simplified version - in production, use a proper COSE parser
    const bytes = new Uint8Array(publicKeyBuffer);
    
    // Look for the x coordinate (usually at offset 2)
    // P-256 public keys are 65 bytes (0x04 + 32 bytes X + 32 bytes Y)
    let xStart = -1;
    for (let i = 0; i < bytes.length - 32; i++) {
      if (bytes[i] === 0x58 && bytes[i + 1] === 0x20) {
        xStart = i + 2;
        break;
      }
    }
    
    if (xStart === -1) return null;
    
    // Extract X and Y coordinates
    const x = bytes.slice(xStart, xStart + 32);
    const y = bytes.slice(xStart + 32, xStart + 64);
    
    // Return as hex string (0x04 indicates uncompressed)
    // Convert Uint8Array to ArrayBuffer for bufferToHex
    return '0x04' + bufferToHex(x.buffer as ArrayBuffer) + bufferToHex(y.buffer as ArrayBuffer);
  } catch (error) {
    console.error('[Passkey] Failed to extract public key:', error);
    return null;
  }
}

function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  
  // Detect device type
  if (/iPhone|iPad|iPod/.test(ua)) {
    return 'iOS Device';
  }
  if (/Android/.test(ua)) {
    return 'Android Device';
  }
  if (/Mac/.test(ua)) {
    return 'macOS';
  }
  if (/Windows/.test(ua)) {
    return 'Windows';
  }
  if (/Linux/.test(ua)) {
    return 'Linux';
  }
  
  return 'Unknown Device';
}