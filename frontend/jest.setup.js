/**
 * Jest Setup Configuration
 * Global test environment setup for CryptoGift Wallets
 */

// Polyfills for Node.js environment
import { TextEncoder, TextDecoder } from 'util';

// Global polyfills
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_CHAIN_ID = '84532';
process.env.NEXT_PUBLIC_RPC_URL = 'https://base-sepolia.g.alchemy.com/v2/test';
process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS = '0x1234567890123456789012345678901234567890';
process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS = '0x0987654321098765432109876543210987654321';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-32-chars';
process.env.ADMIN_API_TOKEN = 'test-admin-token';
process.env.CRON_SECRET = 'test-cron-secret';

// Mock Redis/KV for testing
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  incr: jest.fn(),
  ttl: jest.fn()
};

// Mock Vercel KV
jest.mock('@vercel/kv', () => ({
  kv: mockRedis
}));

// Mock Upstash Redis
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(() => mockRedis)
}));

// Don't mock ethers globally - let tests that need real ethers import it
// Only mock specific provider instances when needed in individual tests

// Mock thirdweb
jest.mock('thirdweb', () => ({
  createThirdwebClient: jest.fn(() => ({ clientId: 'test' })),
  getContract: jest.fn(() => ({
    read: jest.fn(),
    write: jest.fn(),
    events: {
      getEvents: jest.fn(() => Promise.resolve([]))
    }
  })),
  prepareContractCall: jest.fn(),
  sendTransaction: jest.fn(() => Promise.resolve({
    transactionHash: '0xtest123',
    receipt: {
      blockNumber: BigInt(12345),
      gasUsed: BigInt(21000)
    }
  }))
}));

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    query: {},
    pathname: '/',
    route: '/',
    asPath: '/'
  })
}));

// Mock console methods for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
global.mockWalletAddress = '0x1234567890123456789012345678901234567890';
global.mockTokenId = 1;
global.mockTransactionHash = '0xtest123456789';

// Extend Jest matchers (if needed)
expect.extend({
  toBeValidEthereumAddress(received) {
    const pass = /^0x[a-fA-F0-9]{40}$/.test(received);
    return {
      message: () => `expected ${received} to be a valid Ethereum address`,
      pass
    };
  }
});