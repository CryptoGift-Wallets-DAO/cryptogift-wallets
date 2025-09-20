import { describe, it, expect } from 'vitest';
import esErrors from '../locales/es/errors.json';
import enErrors from '../locales/en/errors.json';

// Define all error codes used in the application
const ERROR_CODES = {
  wizard: [
    'AUTH_REQUIRED',
    'AUTHENTICATION_REQUIRED',
    'NO_ACCOUNT',
    'FAILED_COMPRESSION',
    'FAILED_LOAD_IMAGE',
    'IPFS_VALIDATION_FAILED',
    'DEVICE_LIMIT_EXCEEDED'
  ],
  claim: [
    'ESCROW_EXPIRED',
    'SIWE_FAILED',
    'INVALID_PASSWORD',
    'CLAIM_FAILED',
    'USER_REJECTED',
    'ALREADY_CLAIMED',
    'NOT_AUTHORIZED',
    'INSUFFICIENT_GAS',
    'SALT_MISMATCH',
    'GIFT_RETURNED',
    'GIFT_CANCELLED'
  ],
  education: [
    'MODULE_NOT_COMPLETED',
    'VERIFICATION_FAILED',
    'SESSION_EXPIRED'
  ],
  transaction: [
    'TX_FAILED',
    'TX_REVERTED',
    'INSUFFICIENT_FUNDS',
    'GAS_ESTIMATION_FAILED',
    'NONCE_MISMATCH',
    'REPLACEMENT_UNDERPRICED'
  ],
  ipfs: [
    'UPLOAD_FAILED',
    'FETCH_FAILED',
    'GATEWAY_ERROR',
    'CID_INVALID'
  ],
  wallet: [
    'CONNECTION_FAILED',
    'WRONG_NETWORK',
    'WALLET_NOT_FOUND',
    'USER_DENIED_ACCESS'
  ]
};

describe('Error Code Mapping', () => {
  describe('Spanish Error Messages', () => {
    Object.entries(ERROR_CODES).forEach(([domain, codes]) => {
      codes.forEach(code => {
        it(`should have Spanish message for ${domain}.${code}`, () => {
          const errorMessage = esErrors.errors[domain]?.[code];
          expect(errorMessage, `Missing Spanish error message for ${domain}.${code}`).toBeDefined();
          expect(typeof errorMessage).toBe('string');
          expect(errorMessage.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('English Error Messages', () => {
    Object.entries(ERROR_CODES).forEach(([domain, codes]) => {
      codes.forEach(code => {
        it(`should have English message for ${domain}.${code}`, () => {
          const errorMessage = enErrors.errors[domain]?.[code];
          expect(errorMessage, `Missing English error message for ${domain}.${code}`).toBeDefined();
          expect(typeof errorMessage).toBe('string');
          expect(errorMessage.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Error Message Parity', () => {
    it('should have the same error codes in both Spanish and English', () => {
      Object.entries(ERROR_CODES).forEach(([domain, codes]) => {
        codes.forEach(code => {
          const hasSpanish = !!esErrors.errors[domain]?.[code];
          const hasEnglish = !!enErrors.errors[domain]?.[code];
          expect(hasSpanish).toBe(hasEnglish);
        });
      });
    });
  });

  describe('Placeholder Validation', () => {
    it('should have matching placeholders in translations with variables', () => {
      const placeholderPattern = /\{(\w+)\}/g;

      Object.entries(ERROR_CODES).forEach(([domain, codes]) => {
        codes.forEach(code => {
          const esMessage = esErrors.errors[domain]?.[code];
          const enMessage = enErrors.errors[domain]?.[code];

          if (esMessage && enMessage) {
            const esPlaceholders = esMessage.match(placeholderPattern) || [];
            const enPlaceholders = enMessage.match(placeholderPattern) || [];

            // Both should have the same placeholders
            expect(esPlaceholders.sort()).toEqual(enPlaceholders.sort());
          }
        });
      });
    });
  });
});

// Helper function to get error message with fallback
export function getErrorMessage(
  code: string,
  domain: string,
  locale: 'es' | 'en' = 'es',
  variables: Record<string, any> = {}
): string {
  const errors = locale === 'en' ? enErrors.errors : esErrors.errors;
  let message = errors[domain]?.[code] || errors.common?.unknownError || 'Unknown error';

  // Replace variables
  Object.entries(variables).forEach(([key, value]) => {
    message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  });

  return message;
}