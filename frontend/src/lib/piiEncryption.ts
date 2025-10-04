/**
 * PII ENCRYPTION UTILITIES
 *
 * Secure handling of Personally Identifiable Information (PII) like emails.
 *
 * Features:
 * - AES-256-GCM encryption for secure storage
 * - HMAC-SHA256 for searchable hashing (deduplication)
 * - Server-side only (uses Node.js crypto)
 *
 * @author CryptoGift Wallets
 */

import crypto from 'crypto';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // AES-GCM requires 16 bytes IV
const AUTH_TAG_LENGTH = 16; // GCM auth tag length
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment
 * CRITICAL: This key must be set in .env and kept secret
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.PII_ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error(
      'PII_ENCRYPTION_KEY not configured. Generate with: ' +
      'node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (keyHex.length !== 64) { // 32 bytes = 64 hex chars
    throw new Error('PII_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  return Buffer.from(keyHex, 'hex');
}

/**
 * Get HMAC secret from environment
 * CRITICAL: This secret must be set in .env and kept secret
 */
function getHmacSecret(): string {
  const secret = process.env.PII_HMAC_SECRET;

  if (!secret) {
    throw new Error(
      'PII_HMAC_SECRET not configured. Generate with: ' +
      'node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (secret.length < 32) {
    throw new Error('PII_HMAC_SECRET must be at least 32 characters');
  }

  return secret;
}

// ============================================================================
// ENCRYPTION FUNCTIONS
// ============================================================================

export interface EncryptedEmail {
  encrypted: string;  // Base64 encoded: IV + AuthTag + Ciphertext
  hmac: string;       // HMAC-SHA256 hex for searching/deduplication
}

/**
 * Encrypt an email address for secure storage
 * Returns both encrypted data and HMAC for searching
 */
export function encryptEmail(email: string): EncryptedEmail {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(
      ENCRYPTION_ALGORITHM,
      getEncryptionKey(),
      iv
    );

    // Encrypt
    let encrypted = cipher.update(normalizedEmail, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Combine: IV + AuthTag + Ciphertext (all base64)
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'base64')
    ]).toString('base64');

    // Generate HMAC for searching
    const hmac = crypto
      .createHmac('sha256', getHmacSecret())
      .update(normalizedEmail)
      .digest('hex');

    return {
      encrypted: combined,
      hmac
    };
  } catch (error) {
    console.error('❌ Email encryption failed:', error);
    throw new Error('Failed to encrypt email');
  }
}

/**
 * Decrypt an email address
 * Returns the original email or null if decryption fails
 */
export function decryptEmail(encryptedData: string): string | null {
  try {
    // Decode base64 combined data
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract components
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    // Create decipher
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      getEncryptionKey(),
      iv
    );

    // Set auth tag
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('❌ Email decryption failed:', error);
    return null;
  }
}

/**
 * Generate HMAC for an email (for searching/deduplication)
 * This is safe to store and use for lookups without revealing the email
 */
export function generateEmailHMAC(email: string): string {
  const normalizedEmail = email.toLowerCase().trim();

  return crypto
    .createHmac('sha256', getHmacSecret())
    .update(normalizedEmail)
    .digest('hex');
}

/**
 * Validate that encryption keys are properly configured
 * Call this on server startup to fail fast if misconfigured
 */
export function validatePIIEncryptionConfig(): boolean {
  try {
    getEncryptionKey();
    getHmacSecret();

    // Test encryption/decryption
    const testEmail = 'test@example.com';
    const encrypted = encryptEmail(testEmail);
    const decrypted = decryptEmail(encrypted.encrypted);

    if (decrypted !== testEmail) {
      throw new Error('Encryption test failed: decrypted value mismatch');
    }

    console.log('✅ PII encryption configured correctly');
    return true;
  } catch (error) {
    console.error('❌ PII encryption configuration error:', error);
    return false;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely encrypt email with fallback
 * Returns encrypted data or undefined if encryption fails (fail-safe)
 */
export function safeEncryptEmail(email: string | undefined): EncryptedEmail | undefined {
  if (!email) return undefined;

  try {
    return encryptEmail(email);
  } catch (error) {
    console.error('⚠️ Safe encrypt failed, returning undefined:', error);
    return undefined;
  }
}

/**
 * Check if email encryption is enabled
 * Returns false if keys are not configured (allows graceful degradation)
 */
export function isPIIEncryptionEnabled(): boolean {
  try {
    getEncryptionKey();
    getHmacSecret();
    return true;
  } catch {
    return false;
  }
}
