/**
 * UNIT TESTS - Token ID Validator
 * Tests críticos para prevenir tokenId=0 y validación de Transfer events
 */

import { 
  extractTokenIdFromTransferEvent, 
  validateTokenId, 
  diagnoseTokenIdZeroIssue,
  TokenIdZeroError,
  assertValidTokenId
} from '../lib/tokenIdValidator';

describe('Token ID Validator - Critical Tests', () => {
  const validTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const validAddress = '0x1234567890123456789012345678901234567890';
  
  describe('extractTokenIdFromTransferEvent', () => {
    test('Should extract valid tokenID from Transfer event', () => {
      const transferLog = {
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer signature
          '0x0000000000000000000000000000000000000000000000000000000000000000', // from (zero address)
          '0x000000000000000000000000' + validAddress.slice(2), // to address
          '0x0000000000000000000000000000000000000000000000000000000000000001' // tokenId = 1
        ],
        data: '0x',
        address: validAddress
      };
      
      const result = extractTokenIdFromTransferEvent(transferLog);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.tokenId).toBe('1');
        expect(result.source).toBe('transfer_event');
      }
    });
    
    test('Should reject tokenId=0 (CRITICAL)', () => {
      const transferLog = {
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x000000000000000000000000' + validAddress.slice(2),
          '0x0000000000000000000000000000000000000000000000000000000000000000' // tokenId = 0
        ],
        data: '0x',
        address: validAddress
      };
      
      const result = extractTokenIdFromTransferEvent(transferLog);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('TokenId cannot be 0');
        expect(result.error).toContain('CRITICAL');
      }
    });
    
    test('Should reject negative tokenId', () => {
      const transferLog = {
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x000000000000000000000000' + validAddress.slice(2),
          '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' // -1 in two's complement
        ],
        data: '0x',
        address: validAddress
      };
      
      const result = extractTokenIdFromTransferEvent(transferLog);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('cannot be negative');
      }
    });
    
    test('Should handle invalid Transfer event structure', () => {
      const invalidLog = {
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          '0x0000000000000000000000000000000000000000000000000000000000000000'
          // Missing topics[2] and topics[3]
        ],
        data: '0x',
        address: validAddress
      };
      
      const result = extractTokenIdFromTransferEvent(invalidLog);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid Transfer event structure');
      }
    });
    
    test('Should handle malformed hex data', () => {
      const malformedLog = {
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x000000000000000000000000' + validAddress.slice(2),
          '0xinvalidhexadata' // Invalid hex
        ],
        data: '0x',
        address: validAddress
      };
      
      const result = extractTokenIdFromTransferEvent(malformedLog);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Failed to convert tokenId to BigInt');
      }
    });
  });
  
  describe('validateTokenId', () => {
    test('Should validate string tokenId', () => {
      const result = validateTokenId('123', 'user_input');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.tokenId).toBe('123');
      }
    });
    
    test('Should validate number tokenId', () => {
      const result = validateTokenId(456, 'user_input');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.tokenId).toBe('456');
      }
    });
    
    test('Should validate bigint tokenId', () => {
      const result = validateTokenId(BigInt(789), 'contract_state');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.tokenId).toBe('789');
      }
    });
    
    test('Should reject tokenId=0 (CRITICAL)', () => {
      const testCases = [0, '0', BigInt(0)];
      
      testCases.forEach(testCase => {
        const result = validateTokenId(testCase, 'user_input');
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('TokenId cannot be 0');
          expect(result.error).toContain('CRITICAL');
        }
      });
    });
    
    test('Should reject negative tokenId', () => {
      const result = validateTokenId(-1, 'user_input');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('cannot be negative');
      }
    });
    
    test('Should reject null/undefined', () => {
      const nullResult = validateTokenId(null, 'user_input');
      const undefinedResult = validateTokenId(undefined, 'user_input');
      
      expect(nullResult.success).toBe(false);
      expect(undefinedResult.success).toBe(false);
    });
    
    test('Should reject non-numeric strings', () => {
      const result = validateTokenId('abc123', 'user_input');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not a valid number');
      }
    });
    
    test('Should reject floating point numbers', () => {
      const result = validateTokenId(123.45, 'user_input');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('must be integer');
      }
    });
  });
  
  describe('diagnoseTokenIdZeroIssue', () => {
    test('Should diagnose no Transfer events', async () => {
      const emptyLogs = [];
      const nftContract = validAddress;
      
      const diagnosis = await diagnoseTokenIdZeroIssue(emptyLogs, nftContract);
      
      expect(diagnosis.findings).toContainEqual(
        expect.objectContaining({
          source: 'transfer_events',
          status: 'error',
          message: expect.stringContaining('No Transfer events found')
        })
      );
      
      expect(diagnosis.diagnosis).toContain('CRITICAL');
    });
    
    test('Should diagnose valid Transfer event', async () => {
      const validLogs = [
        {
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            '0x0000000000000000000000000000000000000000000000000000000000000000',
            '0x000000000000000000000000' + validAddress.slice(2),
            '0x0000000000000000000000000000000000000000000000000000000000000001'
          ],
          data: '0x',
          address: validAddress
        }
      ];
      
      const diagnosis = await diagnoseTokenIdZeroIssue(validLogs, validAddress);
      
      expect(diagnosis.findings).toContainEqual(
        expect.objectContaining({
          source: 'transfer_events',
          status: 'ok'
        })
      );
      
      expect(diagnosis.findings).toContainEqual(
        expect.objectContaining({
          source: 'transfer_event_0',
          status: 'ok',
          message: expect.stringContaining('Valid tokenId')
        })
      );
    });
    
    test('Should diagnose tokenId=0 in Transfer event', async () => {
      const invalidLogs = [
        {
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            '0x0000000000000000000000000000000000000000000000000000000000000000',
            '0x000000000000000000000000' + validAddress.slice(2),
            '0x0000000000000000000000000000000000000000000000000000000000000000' // tokenId = 0
          ],
          data: '0x',
          address: validAddress
        }
      ];
      
      const diagnosis = await diagnoseTokenIdZeroIssue(invalidLogs, validAddress);
      
      expect(diagnosis.findings).toContainEqual(
        expect.objectContaining({
          source: 'transfer_event_0',
          status: 'error',
          message: expect.stringContaining('Transfer event validation failed')
        })
      );
      
      expect(diagnosis.diagnosis).toContain('CRITICAL');
      expect(diagnosis.diagnosis).toContain('Mint transaction failed');
    });
  });
  
  describe('TokenIdZeroError', () => {
    test('Should create TokenIdZeroError with context', () => {
      const error = new TokenIdZeroError(
        'TokenId is zero',
        'transfer_event',
        { tokenId: 0 },
        { diagnostic: 'test' }
      );
      
      expect(error.name).toBe('TokenIdZeroError');
      expect(error.message).toBe('TokenId is zero');
      expect(error.source).toBe('transfer_event');
      expect(error.rawValue).toEqual({ tokenId: 0 });
      expect(error.diagnostic).toEqual({ diagnostic: 'test' });
    });
  });
  
  describe('assertValidTokenId', () => {
    test('Should return valid tokenId for valid input', () => {
      const result = assertValidTokenId('123', 'test_context');
      expect(result).toBe('123');
    });
    
    test('Should throw TokenIdZeroError for invalid input', () => {
      expect(() => {
        assertValidTokenId(0, 'test_context');
      }).toThrow(TokenIdZeroError);
      
      expect(() => {
        assertValidTokenId(0, 'test_context');
      }).toThrow('Invalid tokenId in test_context');
    });
    
    test('Should throw for null/undefined', () => {
      expect(() => {
        assertValidTokenId(null, 'test_context');
      }).toThrow(TokenIdZeroError);
      
      expect(() => {
        assertValidTokenId(undefined, 'test_context');
      }).toThrow(TokenIdZeroError);
    });
  });
  
  describe('Edge Cases and Integration', () => {
    test('Should handle very large tokenId', () => {
      const largeTokenId = BigInt('999999999999999999999');
      const result = validateTokenId(largeTokenId, 'contract_state');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.tokenId).toBe('999999999999999999999');
      }
    });
    
    test('Should handle astronomically large tokenId', () => {
      // Beyond reasonable NFT tokenId range
      const astronomicalTokenId = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      
      const transferLog = {
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x000000000000000000000000' + validAddress.slice(2),
          '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
        ],
        data: '0x',
        address: validAddress
      };
      
      const result = extractTokenIdFromTransferEvent(transferLog);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('unreasonably large');
      }
    });
    
    test('Should maintain source context through validation', () => {
      const sources = ['transfer_event', 'user_input', 'contract_state'] as const;
      
      sources.forEach(source => {
        const result = validateTokenId('123', source);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.source).toBe(source);
        }
      });
    });
  });
});