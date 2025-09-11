/**
 * UNIT TESTS - Secure Logger
 * Tests críticos para verificar que no se filtren datos sensibles
 */

import { 
  sanitizeString,
  sanitizeObject, 
  auditLogSecurity,
  testSecureLogging,
  SecureLogger,
  SecurityAuditLogger
} from '../lib/secureLogger';

describe('Secure Logger - Critical Security Tests', () => {
  describe('sanitizeString', () => {
    test('Should redact private keys completely', () => {
      const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const text = `Private key: ${privateKey}`;
      
      const sanitized = sanitizeString(text);
      
      expect(sanitized).not.toContain(privateKey);
      expect(sanitized).toContain('[PRIVATEKEY_REDACTED]');
    });
    
    test('Should redact JWT tokens completely', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const text = `JWT token: ${jwt}`;
      
      const sanitized = sanitizeString(text);
      
      expect(sanitized).not.toContain(jwt);
      expect(sanitized).toContain('[JWT_REDACTED]');
    });
    
    test('Should truncate Ethereum addresses safely', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const text = `User address: ${address}`;
      
      const sanitized = sanitizeString(text);
      
      expect(sanitized).not.toContain(address);
      expect(sanitized).toContain('0x1234...7890'); // Truncated format
    });
    
    test('Should truncate transaction hashes', () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const text = `Transaction: ${txHash}`;
      
      const sanitized = sanitizeString(text);
      
      expect(sanitized).not.toContain(txHash);
      expect(sanitized).toContain('0x1234567890...90abcdef'); // Truncated format
    });
    
    test('Should redact API keys in various formats', () => {
      const testCases = [
        'api_key=sk-1234567890abcdef',
        'apiKey: "pk_test_1234567890"',
        'API-KEY = bearer_token_123456'
      ];
      
      testCases.forEach(testCase => {
        const sanitized = sanitizeString(testCase);
        expect(sanitized).toContain('[APIKEY_REDACTED]');
      });
    });
    
    test('Should redact credentials in URLs', () => {
      const urlWithCreds = 'https://user:password@database.example.com/db';
      
      const sanitized = sanitizeString(urlWithCreds);
      
      expect(sanitized).not.toContain('user:password');
      expect(sanitized).toContain('[CREDENTIALS_REDACTED]');
    });
    
    test('Should truncate very long strings', () => {
      const longString = 'a'.repeat(1000);
      
      const sanitized = sanitizeString(longString);
      
      expect(sanitized).toContain('[LONG_STRING_1000_CHARS_TRUNCATED]');
      expect(sanitized).not.toContain(longString);
    });
    
    test('Should preserve safe strings', () => {
      const safeString = 'This is a safe log message with tokenId 123';
      
      const sanitized = sanitizeString(safeString);
      
      expect(sanitized).toBe(safeString);
    });
  });
  
  describe('sanitizeObject', () => {
    test('Should redact sensitive fields by name', () => {
      const sensitiveObject = {
        tokenId: '123',
        password: 'secret123',
        salt: 'randomsalt',
        userAddress: '0x1234567890123456789012345678901234567890',
        publicData: 'This is safe'
      };
      
      const sanitized = sanitizeObject(sensitiveObject);
      
      expect(sanitized.password).toBe('[REDACTED_SENSITIVE_FIELD]');
      expect(sanitized.salt).toBe('[REDACTED_SENSITIVE_FIELD]');
      expect(sanitized.tokenId).toBe('123'); // Not sensitive
      expect(sanitized.publicData).toBe('This is safe');
      expect(sanitized.userAddress).toContain('0x1234...7890'); // Truncated
    });
    
    test('Should handle nested objects recursively', () => {
      const nestedObject = {
        level1: {
          level2: {
            privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            publicInfo: 'safe data'
          },
          password: 'secret'
        },
        normalField: 'normal value'
      };
      
      const sanitized = sanitizeObject(nestedObject);
      
      expect(sanitized.level1.level2.privateKey).toBe('[REDACTED_SENSITIVE_FIELD]');
      expect(sanitized.level1.password).toBe('[REDACTED_SENSITIVE_FIELD]');
      expect(sanitized.level1.level2.publicInfo).toBe('safe data');
      expect(sanitized.normalField).toBe('normal value');
    });
    
    test('Should handle arrays with sensitive data', () => {
      const arrayWithSensitiveData = [
        { tokenId: '1', password: 'secret1' },
        { tokenId: '2', password: 'secret2' },
        'safe string',
        '0x1234567890123456789012345678901234567890'
      ];
      
      const sanitized = sanitizeObject(arrayWithSensitiveData);
      
      expect(sanitized[0].password).toBe('[REDACTED_SENSITIVE_FIELD]');
      expect(sanitized[1].password).toBe('[REDACTED_SENSITIVE_FIELD]');
      expect(sanitized[2]).toBe('safe string');
      expect(sanitized[3]).toContain('0x1234...7890'); // Address truncated
    });
    
    test('Should limit array size to prevent DoS', () => {
      const largeArray = Array(50).fill({ data: 'test' });
      
      const sanitized = sanitizeObject(largeArray);
      
      expect(sanitized.length).toBeLessThanOrEqual(21); // 20 items + truncation notice
      expect(sanitized[sanitized.length - 1]).toContain('MORE_ITEMS');
    });
    
    test('Should limit object field count', () => {
      const largeObject: any = {};
      for (let i = 0; i < 100; i++) {
        largeObject[`field${i}`] = `value${i}`;
      }
      
      const sanitized = sanitizeObject(largeObject);
      
      const fieldCount = Object.keys(sanitized).length;
      expect(fieldCount).toBeLessThanOrEqual(51); // 50 fields + truncation notice
      expect(sanitized['[TRUNCATED]']).toBeDefined();
    });
    
    test('Should prevent infinite recursion', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      
      // Should not throw stack overflow
      expect(() => {
        sanitizeObject(circular);
      }).not.toThrow();
    });
    
    test('Should handle null and undefined safely', () => {
      const testCases = [null, undefined, { nullField: null, undefinedField: undefined }];
      
      testCases.forEach(testCase => {
        expect(() => {
          sanitizeObject(testCase);
        }).not.toThrow();
      });
    });
  });
  
  describe('auditLogSecurity', () => {
    test('Should detect critical security violations', () => {
      const unsafeString = JSON.stringify({
        privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        normalData: 'This is fine'
      });
      
      const audit = auditLogSecurity(unsafeString);
      
      expect(audit.isSecure).toBe(false);
      expect(audit.violations.length).toBeGreaterThan(0);
      expect(audit.violations.some(v => v.severity === 'critical')).toBe(true);
      expect(audit.recommendations).toContain(expect.stringContaining('CRÍTICO'));
    });
    
    test('Should pass audit for sanitized strings', () => {
      const safeString = 'This is a safe log with tokenId 123 and address 0x1234...7890';
      
      const audit = auditLogSecurity(safeString);
      
      expect(audit.isSecure).toBe(true);
      expect(audit.violations.length).toBe(0);
    });
    
    test('Should detect addresses that need truncation', () => {
      const stringWithAddress = 'User address: 0x1234567890123456789012345678901234567890';
      
      const audit = auditLogSecurity(stringWithAddress);
      
      expect(audit.isSecure).toBe(false);
      expect(audit.violations.some(v => v.severity === 'high')).toBe(true);
    });
    
    test('Should provide actionable recommendations', () => {
      const longUnsafeString = 'a'.repeat(1500) + '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      const audit = auditLogSecurity(longUnsafeString);
      
      expect(audit.recommendations.length).toBeGreaterThan(0);
      expect(audit.recommendations.some(r => r.includes('LARGO'))).toBe(true);
    });
  });
  
  describe('SecureLogger Class', () => {
    let logger: SecureLogger;
    let consoleSpy: jest.SpyInstance;
    
    beforeEach(() => {
      logger = new SecureLogger('TEST');
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });
    
    afterEach(() => {
      consoleSpy.mockRestore();
    });
    
    test('Should format messages with timestamp and context', () => {
      logger.info('Test message', { tokenId: '123' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] [TEST] Test message')
      );
    });
    
    test('Should sanitize data in logs automatically', () => {
      const sensitiveData = {
        tokenId: '123',
        password: 'secret123',
        userAddress: '0x1234567890123456789012345678901234567890'
      };
      
      logger.info('Sensitive operation', sensitiveData);
      
      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).not.toContain('secret123');
      expect(logCall).toContain('[REDACTED_SENSITIVE_FIELD]');
      expect(logCall).toContain('0x1234...7890');
    });
    
    test('Should perform automatic security audit on transactions', () => {
      const transactionData = {
        userAddress: '0x1234567890123456789012345678901234567890',
        privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      };
      
      // This should trigger security audit warnings
      logger.transaction('mint', 'start', transactionData);
      
      // Should log transaction without exposing private key
      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).not.toContain('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
    });
    
    test('Should skip debug logs in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const debugLogger = new SecureLogger('TEST');
      debugLogger.debug('Debug message');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });
  });
  
  describe('SecurityAuditLogger', () => {
    let securityLogger: SecurityAuditLogger;
    let consoleSpy: jest.SpyInstance;
    
    beforeEach(() => {
      securityLogger = new SecurityAuditLogger('TEST_SECURITY');
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });
    
    afterEach(() => {
      consoleSpy.mockRestore();
    });
    
    test('Should log security violations with proper context', () => {
      securityLogger.securityViolation('Unauthorized access attempt', '0x1234567890123456789012345678901234567890');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔒 SECURITY [ERROR]:'),
        expect.objectContaining({
          event: 'SECURITY_VIOLATION',
          context: 'TEST_SECURITY'
        })
      );
    });
    
    test('Should sanitize user addresses in security logs', () => {
      const fullAddress = '0x1234567890123456789012345678901234567890';
      
      securityLogger.accessAttempt(fullAddress, 'mint-escrow', false, 'Invalid signature');
      
      const logCall = consoleSpy.mock.calls[0];
      expect(JSON.stringify(logCall)).not.toContain(fullAddress);
      expect(JSON.stringify(logCall)).toContain('0x1234...7890');
    });
  });
  
  describe('Integration Tests', () => {
    test('Should maintain security through complex object structures', () => {
      const complexObject = {
        transaction: {
          hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          user: {
            address: '0x1234567890123456789012345678901234567890',
            credentials: {
              privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
              jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature'
            }
          }
        },
        metadata: {
          tokenId: '123',
          message: 'Safe message'
        }
      };
      
      const sanitized = sanitizeObject(complexObject);
      
      // Verify all sensitive data is properly handled
      expect(JSON.stringify(sanitized)).not.toContain('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
      expect(JSON.stringify(sanitized)).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature');
      expect(sanitized.transaction.user.credentials.privateKey).toBe('[REDACTED_SENSITIVE_FIELD]');
      expect(sanitized.metadata.tokenId).toBe('123'); // Safe data preserved
    });
    
    test('Should handle real-world log patterns', () => {
      const realWorldLog = `
        🎁 MINT SUCCESS: Transaction 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
        User: 0x1234567890123456789012345678901234567890
        TokenId: 123
        Gas used: 21000
        Private key used: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
      `;
      
      const sanitized = sanitizeString(realWorldLog);
      const audit = auditLogSecurity(sanitized);
      
      expect(audit.isSecure).toBe(true);
      expect(sanitized).toContain('TokenId: 123'); // Safe data preserved
      expect(sanitized).not.toContain('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
    });
  });
  
  describe('Performance and Edge Cases', () => {
    test('Should handle large objects without performance issues', () => {
      const largeObject: any = {};
      for (let i = 0; i < 1000; i++) {
        largeObject[`field${i}`] = `value${i}`;
      }
      
      const startTime = Date.now();
      const sanitized = sanitizeObject(largeObject);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
      expect(sanitized).toBeDefined();
    });
    
    test('Should handle deeply nested objects', () => {
      let deepObject: any = { value: 'root' };
      for (let i = 0; i < 10; i++) {
        deepObject = { nested: deepObject, level: i };
      }
      deepObject.secret = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      const sanitized = sanitizeObject(deepObject);
      
      expect(JSON.stringify(sanitized)).not.toContain('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
    });
  });
});