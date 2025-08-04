/**
 * 🔧 CryptoGift Indexer Configuration
 * Zero-custody blockchain indexing configuration
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration schema with validation
const ConfigSchema = z.object({
  // Blockchain
  chainId: z.number().default(84532),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  deploymentBlock: z.number().min(1),
  
  // RPC endpoints
  rpcHttp: z.string().url(),
  rpcWs: z.string().url(),
  rpcWsFallback: z.string().url().optional(),
  
  // Indexing parameters
  batchBlocks: z.number().min(1).max(10000).default(4000),
  confirmations: z.number().min(1).max(100).default(20),
  reorgLookback: z.number().min(1).max(1000).default(200),
  maxRetries: z.number().min(1).max(10).default(5),
  retryBaseMs: z.number().min(100).max(5000).default(500),
  
  // Database
  databaseUrl: z.string().url(),
  
  // Feature flags
  readFrom: z.enum(['onchain', 'db']).default('onchain'),
  
  // Server
  port: z.number().min(1000).max(65535).default(3001),
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  
  // Monitoring
  healthCheckInterval: z.number().min(1000).max(300000).default(30000),
  maxLagSeconds: z.number().min(10).max(3600).default(120),
  
  // Security
  apiToken: z.string().optional(),
  allowedIps: z.string().optional(),
  enableSecurity: z.boolean().default(false),
});

// Parse and validate configuration
export const config = ConfigSchema.parse({
  // Blockchain
  chainId: parseInt(process.env.CHAIN_ID || '84532'),
  contractAddress: process.env.CONTRACT_ADDRESS || '0x46175CfC233500DA803841DEef7f2816e7A129E0',
  deploymentBlock: parseInt(process.env.DEPLOYMENT_BLOCK || '28915000'),
  
  // RPC
  rpcHttp: process.env.RPC_HTTP,
  rpcWs: process.env.RPC_WS,
  rpcWsFallback: process.env.RPC_WS_FALLBACK,
  
  // Indexing
  batchBlocks: parseInt(process.env.BATCH_BLOCKS || '4000'),
  confirmations: parseInt(process.env.CONFIRMATIONS || '20'),
  reorgLookback: parseInt(process.env.REORG_LOOKBACK || '200'),
  maxRetries: parseInt(process.env.MAX_RETRIES || '5'),
  retryBaseMs: parseInt(process.env.RETRY_BASE_MS || '500'),
  
  // Database
  databaseUrl: process.env.DATABASE_URL,
  
  // Feature flags
  readFrom: process.env.READ_FROM || 'onchain',
  
  // Server
  port: parseInt(process.env.PORT || '3001'),
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Monitoring
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
  maxLagSeconds: parseInt(process.env.MAX_LAG_SECONDS || '120'),
  
  // Security
  apiToken: process.env.API_TOKEN,
  allowedIps: process.env.ALLOWED_IPS,
  enableSecurity: process.env.ENABLE_SECURITY === 'true',
});

// Event signature from contract ABI
export const GIFT_EVENT_SIGNATURE = 'GiftRegisteredFromMint(uint256,address,address,uint256,uint40,address,string,address)';

// Event ABI for parsing
export const GIFT_EVENT_ABI = [
  {
    "type": "event",
    "name": "GiftRegisteredFromMint",
    "inputs": [
      {"name": "giftId", "type": "uint256", "indexed": true},
      {"name": "creator", "type": "address", "indexed": true},
      {"name": "nftContract", "type": "address", "indexed": true},
      {"name": "tokenId", "type": "uint256", "indexed": false},
      {"name": "expiresAt", "type": "uint40", "indexed": false},
      {"name": "gate", "type": "address", "indexed": false},
      {"name": "giftMessage", "type": "string", "indexed": false},
      {"name": "registeredBy", "type": "address", "indexed": false}
    ]
  }
];

export type Config = z.infer<typeof ConfigSchema>;