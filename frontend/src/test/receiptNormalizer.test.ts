/**
 * UNIT TESTS - Receipt Normalizer
 * Tests gasless/userOp receipt normalization functionality
 */

import { 
  normalizeReceipt, 
  normalizeAndValidateReceipt,
  needsNormalization,
  validateNormalizedReceipt
} from '../lib/receiptNormalizer';
import { ethers } from 'ethers';

// Mock environment variables
const mockRpcUrl = 'https://sepolia.base.org';
process.env.NEXT_PUBLIC_RPC_URL = mockRpcUrl;

// Mock ethers provider
jest.mock('ethers', () => ({
  ...jest.requireActual('ethers'),
  JsonRpcProvider: jest.fn().mockImplementation(() => ({
    getTransactionReceipt: jest.fn()
  }))
}));

describe('Receipt Normalizer', () => {
  const validTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const validAddress = '0x1234567890123456789012345678901234567890';
  
  const mockRealReceipt = {
    hash: validTxHash,
    blockNumber: BigInt(1000),
    status: 1,
    gasUsed: BigInt(21000),
    logs: [
      {
        topics: ['0xevent1', '0xparam1'],
        data: '0xdata1',
        address: validAddress
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful provider response
    const mockProvider = new ethers.JsonRpcProvider(mockRpcUrl);
    (mockProvider.getTransactionReceipt as jest.Mock).mockResolvedValue(mockRealReceipt);
  });

  describe('needsNormalization', () => {
    test('Should detect UserOp receipt (has userOpHash)', () => {
      const userOpReceipt = {
        userOpHash: '0xuser123',
        receipt: {
          transactionHash: validTxHash,
          logs: []
        }
      };

      expect(needsNormalization(userOpReceipt)).toBe(true);
    });

    test('Should detect gasless receipt (has nested receipt)', () => {
      const gaslessReceipt = {
        receipt: {
          transactionHash: validTxHash,
          logs: []
        }
      };

      expect(needsNormalization(gaslessReceipt)).toBe(true);
    });

    test('Should detect ThirdWeb gasless (has result wrapper)', () => {
      const thirdWebReceipt = {
        result: {
          transactionHash: validTxHash,
          logs: []
        }
      };

      expect(needsNormalization(thirdWebReceipt)).toBe(true);
    });

    test('Should detect missing logs receipt', () => {
      const incompleteReceipt = {
        transactionHash: validTxHash,
        blockNumber: BigInt(1000)
        // Missing logs
      };

      expect(needsNormalization(incompleteReceipt)).toBe(true);
    });

    test('Should NOT normalize direct receipt with logs', () => {
      const directReceipt = {
        transactionHash: validTxHash,
        blockNumber: BigInt(1000),
        status: 'success',
        gasUsed: BigInt(21000),
        logs: [
          {
            topics: ['0xevent1'],
            data: '0xdata1',
            address: validAddress
          }
        ]
      };

      expect(needsNormalization(directReceipt)).toBe(false);
    });
  });

  describe('normalizeReceipt', () => {
    test('Should normalize UserOp receipt successfully', async () => {
      const userOpReceipt = {
        userOpHash: '0xuser123',
        receipt: {
          transactionHash: validTxHash,
          blockNumber: BigInt(1000),
          status: 1,
          logs: [],
          gasUsed: '21000'
        },
        success: true
      };

      const result = await normalizeReceipt(userOpReceipt);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.realTxHash).toBe(validTxHash);
        expect(result.source).toBe('userOp');
        expect(result.receipt.transactionHash).toBe(validTxHash);
        expect(result.receipt.logs).toHaveLength(1); // From mocked provider
      }
    });

    test('Should normalize gasless receipt successfully', async () => {
      const gaslessReceipt = {
        receipt: {
          transactionHash: validTxHash,
          blockNumber: BigInt(1000),
          logs: []
        }
      };

      const result = await normalizeReceipt(gaslessReceipt);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.realTxHash).toBe(validTxHash);
        expect(result.source).toBe('userOp');
        expect(result.receipt.logs).toHaveLength(1); // From mocked provider
      }
    });

    test('Should normalize ThirdWeb gasless receipt', async () => {
      const thirdWebReceipt = {
        result: {
          transactionHash: validTxHash,
          blockNumber: BigInt(1000)
        }
      };

      const result = await normalizeReceipt(thirdWebReceipt);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.realTxHash).toBe(validTxHash);
        expect(result.source).toBe('gasless');
      }
    });

    test('Should handle direct receipt without normalization', async () => {
      const directReceipt = {
        transactionHash: validTxHash,
        blockNumber: BigInt(1000),
        status: 'success',
        gasUsed: BigInt(21000),
        logs: [
          {
            topics: ['0xevent1'],
            data: '0xdata1',
            address: validAddress
          }
        ]
      };

      const result = await normalizeReceipt(directReceipt);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.realTxHash).toBe(validTxHash);
        expect(result.source).toBe('direct');
        expect(result.receipt.logs).toHaveLength(1);
        expect(result.receipt.logs[0].topics[0]).toBe('0xevent1');
      }
    });

    test('Should fail when no transaction hash found', async () => {
      const invalidReceipt = {
        someField: 'value',
        logs: []
      };

      const result = await normalizeReceipt(invalidReceipt);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Unable to extract real transaction hash');
      }
    });

    test('Should fail when provider returns null receipt', async () => {
      // Mock provider to return null
      const mockProvider = new ethers.JsonRpcProvider(mockRpcUrl);
      (mockProvider.getTransactionReceipt as jest.Mock).mockResolvedValue(null);

      const userOpReceipt = {
        receipt: {
          transactionHash: validTxHash
        }
      };

      const result = await normalizeReceipt(userOpReceipt);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Failed to load real receipt from blockchain');
      }
    });

    test('Should handle null/undefined receipt', async () => {
      const result1 = await normalizeReceipt(null);
      const result2 = await normalizeReceipt(undefined);

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      
      if (!result1.success) {
        expect(result1.error).toContain('Receipt is null or undefined');
      }
    });
  });

  describe('validateNormalizedReceipt', () => {
    test('Should validate correct receipt', () => {
      const validReceipt = {
        transactionHash: validTxHash,
        blockNumber: BigInt(1000),
        status: 'success' as const,
        gasUsed: BigInt(21000),
        logs: [
          {
            topics: ['0xevent1'],
            data: '0xdata1',
            address: validAddress
          }
        ]
      };

      const result = validateNormalizedReceipt(validReceipt);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('Should detect missing transaction hash', () => {
      const invalidReceipt = {
        blockNumber: BigInt(1000),
        status: 'success' as const,
        gasUsed: BigInt(21000),
        logs: []
      } as any;

      const result = validateNormalizedReceipt(invalidReceipt);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing transactionHash');
    });

    test('Should detect invalid transaction hash format', () => {
      const invalidReceipt = {
        transactionHash: '0xinvalid',
        blockNumber: BigInt(1000),
        status: 'success' as const,
        gasUsed: BigInt(21000),
        logs: []
      };

      const result = validateNormalizedReceipt(invalidReceipt);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid transactionHash format');
    });

    test('Should detect missing logs', () => {
      const invalidReceipt = {
        transactionHash: validTxHash,
        blockNumber: BigInt(1000),
        status: 'success' as const,
        gasUsed: BigInt(21000)
      } as any;

      const result = validateNormalizedReceipt(invalidReceipt);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing logs array');
    });

    test('Should detect invalid block number', () => {
      const invalidReceipt = {
        transactionHash: validTxHash,
        blockNumber: BigInt(0),
        status: 'success' as const,
        gasUsed: BigInt(21000),
        logs: []
      };

      const result = validateNormalizedReceipt(invalidReceipt);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid block number');
    });

    test('Should detect invalid log format', () => {
      const invalidReceipt = {
        transactionHash: validTxHash,
        blockNumber: BigInt(1000),
        status: 'success' as const,
        gasUsed: BigInt(21000),
        logs: [
          {
            // Missing topics
            data: '0xdata1',
            address: validAddress
          }
        ]
      } as any;

      const result = validateNormalizedReceipt(invalidReceipt);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Missing or invalid topics array'))).toBe(true);
    });
  });

  describe('normalizeAndValidateReceipt', () => {
    test('Should normalize and validate successfully', async () => {
      const userOpReceipt = {
        receipt: {
          transactionHash: validTxHash,
          blockNumber: BigInt(1000)
        }
      };

      const result = await normalizeAndValidateReceipt(userOpReceipt);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.realTxHash).toBe(validTxHash);
        expect(result.receipt.transactionHash).toBe(validTxHash);
      }
    });

    test('Should fail validation after normalization', async () => {
      // Mock provider to return invalid receipt
      const mockProvider = new ethers.JsonRpcProvider(mockRpcUrl);
      (mockProvider.getTransactionReceipt as jest.Mock).mockResolvedValue({
        hash: 'invalid', // Invalid hash format
        blockNumber: BigInt(1000),
        status: 1,
        gasUsed: BigInt(21000),
        logs: []
      });

      const userOpReceipt = {
        receipt: {
          transactionHash: validTxHash
        }
      };

      const result = await normalizeAndValidateReceipt(userOpReceipt);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Normalized receipt validation failed');
      }
    });

    test('Should handle normalization failure', async () => {
      const invalidReceipt = {
        noValidFields: true
      };

      const result = await normalizeAndValidateReceipt(invalidReceipt);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Unable to extract real transaction hash');
      }
    });
  });

  describe('Edge Cases', () => {
    test('Should handle RPC provider errors', async () => {
      // Mock provider to throw error
      const mockProvider = new ethers.JsonRpcProvider(mockRpcUrl);
      (mockProvider.getTransactionReceipt as jest.Mock).mockRejectedValue(new Error('RPC Error'));

      const userOpReceipt = {
        receipt: {
          transactionHash: validTxHash
        }
      };

      const result = await normalizeReceipt(userOpReceipt);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Receipt normalization failed');
      }
    });

    test('Should handle missing RPC URL environment variable', async () => {
      const originalRpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
      delete process.env.NEXT_PUBLIC_RPC_URL;

      const userOpReceipt = {
        receipt: {
          transactionHash: validTxHash
        }
      };

      const result = await normalizeReceipt(userOpReceipt);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('NEXT_PUBLIC_RPC_URL not configured');
      }

      // Restore environment variable
      process.env.NEXT_PUBLIC_RPC_URL = originalRpcUrl;
    });

    test('Should extract hash from alternative properties', async () => {
      const alternativeReceipt = {
        hash: validTxHash, // Alternative property name
        blockNumber: BigInt(1000)
      };

      const result = await normalizeReceipt(alternativeReceipt);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.realTxHash).toBe(validTxHash);
        expect(result.source).toBe('gasless');
      }
    });
  });
});