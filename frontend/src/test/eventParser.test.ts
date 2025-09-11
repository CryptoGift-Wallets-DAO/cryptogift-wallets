/**
 * UNIT TESTS - Event Parser (GiftRegisteredFromMint)
 * Tests strict filtering and edge cases
 */

import { parseGiftRegisteredFromMintEvent, type EventParseResult } from '../lib/eventParser';
import { ethers } from 'ethers';

// Mock environment variables for testing
process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
process.env.NEXT_PUBLIC_RPC_URL = 'https://sepolia.base.org';

// Mock receipt interfaces
interface MockThirdWebReceipt {
  logs: Array<{
    topics: string[];
    data: string;
    address?: string;
  }>;
  status: 'success' | 'reverted';
  transactionHash: string;
  blockNumber: number;
  gasUsed: bigint;
}

describe('Event Parser - GiftRegisteredFromMint', () => {
  const validEscrowAddress = '0x1234567890123456789012345678901234567890';
  const validNftAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const validCreatorAddress = '0x9999999999999999999999999999999999999999';
  const validRegisteredByAddress = '0x8888888888888888888888888888888888888888';

  // Valid event signature for GiftRegisteredFromMint
  const giftRegisteredFromMintSignature = ethers.id('GiftRegisteredFromMint(uint256,address,address,uint256,uint40,address,string,address)');

  describe('✅ Valid Events', () => {
    test('Should parse valid GiftRegisteredFromMint event with all filters', async () => {
      // Create valid log with proper encoding
      const validLog = {
        address: validEscrowAddress,
        topics: [
          giftRegisteredFromMintSignature,
          ethers.zeroPadValue(ethers.toBeHex(BigInt(1)), 32), // giftId = 1
          ethers.zeroPadValue(validCreatorAddress, 32), // creator (indexed)
          ethers.zeroPadValue(validNftAddress, 32) // nftContract (indexed)
        ],
        data: ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'uint40', 'address', 'string', 'address'],
          [BigInt(123), BigInt(1735574400), validNftAddress, 'Test gift message', validRegisteredByAddress] // tokenId, expiresAt, gate, giftMessage, registeredBy
        )
      };

      const mockReceipt: MockThirdWebReceipt = {
        logs: [validLog],
        status: 'success',
        transactionHash: '0xtest123',
        blockNumber: 1000,
        gasUsed: BigInt(21000)
      };

      const result = await parseGiftRegisteredFromMintEvent(mockReceipt, 123, validNftAddress);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.giftId).toBe(1);
        expect(result.tokenId).toBe(123);
        expect(result.creator.toLowerCase()).toBe(validCreatorAddress.toLowerCase());
        expect(result.nftContract.toLowerCase()).toBe(validNftAddress.toLowerCase());
        expect(result.giftMessage).toBe('Test gift message');
        expect(result.registeredBy.toLowerCase()).toBe(validRegisteredByAddress.toLowerCase());
      }
    });

    test('Should parse event without expectedTokenId filter', async () => {
      const validLog = {
        address: validEscrowAddress,
        topics: [
          giftRegisteredFromMintSignature,
          ethers.zeroPadValue(ethers.toBeHex(BigInt(2)), 32), // giftId = 2
          ethers.zeroPadValue(validCreatorAddress, 32),
          ethers.zeroPadValue(validNftAddress, 32)
        ],
        data: ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'uint40', 'address', 'string', 'address'],
          [BigInt(456), BigInt(1735574400), validNftAddress, 'Another gift', validRegisteredByAddress]
        )
      };

      const mockReceipt: MockThirdWebReceipt = {
        logs: [validLog],
        status: 'success',
        transactionHash: '0xtest456',
        blockNumber: 1001,
        gasUsed: BigInt(21000)
      };

      // No expectedTokenId provided
      const result = await parseGiftRegisteredFromMintEvent(mockReceipt);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.giftId).toBe(2);
        expect(result.tokenId).toBe(456);
      }
    });
  });

  describe('❌ Filter Rejections', () => {
    test('Should reject event from wrong contract address', async () => {
      const wrongContractLog = {
        address: '0xwrongcontract123456789012345678901234567890', // Wrong contract
        topics: [
          giftRegisteredFromMintSignature,
          ethers.zeroPadValue(ethers.toBeHex(BigInt(1)), 32),
          ethers.zeroPadValue(validCreatorAddress, 32),
          ethers.zeroPadValue(validNftAddress, 32)
        ],
        data: ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'uint40', 'address', 'string', 'address'],
          [BigInt(123), BigInt(1735574400), validNftAddress, 'Test gift', validRegisteredByAddress]
        )
      };

      const mockReceipt: MockThirdWebReceipt = {
        logs: [wrongContractLog],
        status: 'success',
        transactionHash: '0xtest789',
        blockNumber: 1002,
        gasUsed: BigInt(21000)
      };

      const result = await parseGiftRegisteredFromMintEvent(mockReceipt, 123, validNftAddress);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('GiftRegisteredFromMint event not found');
      }
    });

    test('Should reject event with tokenId mismatch', async () => {
      const validLog = {
        address: validEscrowAddress,
        topics: [
          giftRegisteredFromMintSignature,
          ethers.zeroPadValue(ethers.toBeHex(BigInt(1)), 32),
          ethers.zeroPadValue(validCreatorAddress, 32),
          ethers.zeroPadValue(validNftAddress, 32)
        ],
        data: ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'uint40', 'address', 'string', 'address'],
          [BigInt(999), BigInt(1735574400), validNftAddress, 'Test gift', validRegisteredByAddress] // tokenId = 999, but expecting 123
        )
      };

      const mockReceipt: MockThirdWebReceipt = {
        logs: [validLog],
        status: 'success',
        transactionHash: '0xtest999',
        blockNumber: 1003,
        gasUsed: BigInt(21000)
      };

      const result = await parseGiftRegisteredFromMintEvent(mockReceipt, 123); // Expecting tokenId 123

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('GiftRegisteredFromMint event not found');
      }
    });

    test('Should reject event with NFT contract mismatch', async () => {
      const wrongNftAddress = '0xwrongnftcontract123456789012345678901234';
      
      const validLog = {
        address: validEscrowAddress,
        topics: [
          giftRegisteredFromMintSignature,
          ethers.zeroPadValue(ethers.toBeHex(BigInt(1)), 32),
          ethers.zeroPadValue(validCreatorAddress, 32),
          ethers.zeroPadValue(wrongNftAddress, 32) // Wrong NFT contract in indexed param
        ],
        data: ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'uint40', 'address', 'string', 'address'],
          [BigInt(123), BigInt(1735574400), wrongNftAddress, 'Test gift', validRegisteredByAddress]
        )
      };

      const mockReceipt: MockThirdWebReceipt = {
        logs: [validLog],
        status: 'success',
        transactionHash: '0xtestABC',
        blockNumber: 1004,
        gasUsed: BigInt(21000)
      };

      const result = await parseGiftRegisteredFromMintEvent(mockReceipt, 123, validNftAddress); // Expecting validNftAddress

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('GiftRegisteredFromMint event not found');
      }
    });

    test('Should reject event with invalid giftId (≤ 0)', async () => {
      const validLog = {
        address: validEscrowAddress,
        topics: [
          giftRegisteredFromMintSignature,
          ethers.zeroPadValue(ethers.toBeHex(BigInt(0)), 32), // giftId = 0 (invalid)
          ethers.zeroPadValue(validCreatorAddress, 32),
          ethers.zeroPadValue(validNftAddress, 32)
        ],
        data: ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'uint40', 'address', 'string', 'address'],
          [BigInt(123), BigInt(1735574400), validNftAddress, 'Test gift', validRegisteredByAddress]
        )
      };

      const mockReceipt: MockThirdWebReceipt = {
        logs: [validLog],
        status: 'success',
        transactionHash: '0xtestDEF',
        blockNumber: 1005,
        gasUsed: BigInt(21000)
      };

      const result = await parseGiftRegisteredFromMintEvent(mockReceipt, 123, validNftAddress);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('GiftRegisteredFromMint event not found');
      }
    });

    test('Should reject event with zero address creator', async () => {
      const validLog = {
        address: validEscrowAddress,
        topics: [
          giftRegisteredFromMintSignature,
          ethers.zeroPadValue(ethers.toBeHex(BigInt(1)), 32),
          ethers.zeroPadValue(ethers.ZeroAddress, 32), // Zero address creator
          ethers.zeroPadValue(validNftAddress, 32)
        ],
        data: ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'uint40', 'address', 'string', 'address'],
          [BigInt(123), BigInt(1735574400), validNftAddress, 'Test gift', validRegisteredByAddress]
        )
      };

      const mockReceipt: MockThirdWebReceipt = {
        logs: [validLog],
        status: 'success',
        transactionHash: '0xtestGHI',
        blockNumber: 1006,
        gasUsed: BigInt(21000)
      };

      const result = await parseGiftRegisteredFromMintEvent(mockReceipt, 123, validNftAddress);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('GiftRegisteredFromMint event not found');
      }
    });
  });

  describe('🚫 Edge Cases', () => {
    test('Should handle empty receipt (no logs)', async () => {
      const emptyReceipt: MockThirdWebReceipt = {
        logs: [],
        status: 'success',
        transactionHash: '0xempty',
        blockNumber: 1007,
        gasUsed: BigInt(21000)
      };

      const result = await parseGiftRegisteredFromMintEvent(emptyReceipt, 123);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('No logs found in transaction receipt');
        expect(result.logsFound).toBe(0);
      }
    });

    test('Should handle receipt with non-matching events', async () => {
      // Different event signature (Transfer event)
      const transferEventSignature = ethers.id('Transfer(address,address,uint256)');
      
      const transferLog = {
        address: validNftAddress,
        topics: [
          transferEventSignature,
          ethers.zeroPadValue(ethers.ZeroAddress, 32),
          ethers.zeroPadValue(validCreatorAddress, 32),
          ethers.zeroPadValue(ethers.toBeHex(BigInt(123)), 32)
        ],
        data: '0x'
      };

      const mockReceipt: MockThirdWebReceipt = {
        logs: [transferLog],
        status: 'success',
        transactionHash: '0xtransfer',
        blockNumber: 1008,
        gasUsed: BigInt(21000)
      };

      const result = await parseGiftRegisteredFromMintEvent(mockReceipt, 123);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('GiftRegisteredFromMint event not found');
        expect(result.logsFound).toBe(1);
      }
    });

    test('Should handle malformed log data', async () => {
      const malformedLog = {
        address: validEscrowAddress,
        topics: [
          giftRegisteredFromMintSignature,
          ethers.zeroPadValue(ethers.toBeHex(BigInt(1)), 32),
          ethers.zeroPadValue(validCreatorAddress, 32),
          ethers.zeroPadValue(validNftAddress, 32)
        ],
        data: '0xinvaliddata' // Malformed data
      };

      const mockReceipt: MockThirdWebReceipt = {
        logs: [malformedLog],
        status: 'success',
        transactionHash: '0xmalformed',
        blockNumber: 1009,
        gasUsed: BigInt(21000)
      };

      const result = await parseGiftRegisteredFromMintEvent(mockReceipt, 123);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('GiftRegisteredFromMint event not found');
      }
    });

    test('Should handle missing escrow contract address env var', async () => {
      // Temporarily remove env var
      const originalAddress = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS;
      delete process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS;

      const validLog = {
        address: validEscrowAddress,
        topics: [
          giftRegisteredFromMintSignature,
          ethers.zeroPadValue(ethers.toBeHex(BigInt(1)), 32),
          ethers.zeroPadValue(validCreatorAddress, 32),
          ethers.zeroPadValue(validNftAddress, 32)
        ],
        data: ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'uint40', 'address', 'string', 'address'],
          [BigInt(123), BigInt(1735574400), validNftAddress, 'Test gift', validRegisteredByAddress]
        )
      };

      const mockReceipt: MockThirdWebReceipt = {
        logs: [validLog],
        status: 'success',
        transactionHash: '0xnoenv',
        blockNumber: 1010,
        gasUsed: BigInt(21000)
      };

      const result = await parseGiftRegisteredFromMintEvent(mockReceipt, 123);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Escrow contract address not configured');
      }

      // Restore env var
      process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS = originalAddress;
    });
  });

  describe('🎯 Multiple Events', () => {
    test('Should find correct event among multiple events', async () => {
      // Create multiple events - should find the matching one
      const wrongGiftLog = {
        address: validEscrowAddress,
        topics: [
          giftRegisteredFromMintSignature,
          ethers.zeroPadValue(ethers.toBeHex(BigInt(1)), 32),
          ethers.zeroPadValue(validCreatorAddress, 32),
          ethers.zeroPadValue(validNftAddress, 32)
        ],
        data: ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'uint40', 'address', 'string', 'address'],
          [BigInt(999), BigInt(1735574400), validNftAddress, 'Wrong gift', validRegisteredByAddress] // Wrong tokenId
        )
      };

      const correctGiftLog = {
        address: validEscrowAddress,
        topics: [
          giftRegisteredFromMintSignature,
          ethers.zeroPadValue(ethers.toBeHex(BigInt(2)), 32), // Different giftId
          ethers.zeroPadValue(validCreatorAddress, 32),
          ethers.zeroPadValue(validNftAddress, 32)
        ],
        data: ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'uint40', 'address', 'string', 'address'],
          [BigInt(123), BigInt(1735574400), validNftAddress, 'Correct gift', validRegisteredByAddress] // Correct tokenId
        )
      };

      const mockReceipt: MockThirdWebReceipt = {
        logs: [wrongGiftLog, correctGiftLog], // Multiple events
        status: 'success',
        transactionHash: '0xmultiple',
        blockNumber: 1011,
        gasUsed: BigInt(21000)
      };

      const result = await parseGiftRegisteredFromMintEvent(mockReceipt, 123, validNftAddress);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.giftId).toBe(2); // Should find the second event with correct tokenId
        expect(result.tokenId).toBe(123);
        expect(result.giftMessage).toBe('Correct gift');
      }
    });
  });
});