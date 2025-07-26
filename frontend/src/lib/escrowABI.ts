/**
 * CRYPTOGIFT ESCROW CONTRACT ABI
 * Contract: 0xAC398A1da4E7b198f82e6D68d5355e84FF976e01
 * Network: Base Sepolia
 * Updated: 2025-07-26 - Force Vercel rebuild
 */

export const ESCROW_ABI = [
  // Core Escrow Functions
  {
    name: "createGift",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "nftContract", type: "address" },
      { name: "password", type: "string" },
      { name: "salt", type: "bytes32" },
      { name: "timeframe", type: "uint256" },
      { name: "giftMessage", type: "string" },
      { name: "gate", type: "address" }
    ],
    outputs: []
  },
  {
    name: "claimGift",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "giftId", type: "uint256" },
      { name: "password", type: "string" },
      { name: "salt", type: "bytes32" },
      { name: "gateData", type: "bytes" }
    ],
    outputs: []
  },
  {
    name: "claimGiftFor",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "password", type: "string" },
      { name: "salt", type: "string" },
      { name: "recipient", type: "address" }
    ],
    outputs: []
  },
  {
    name: "returnExpiredGift",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" }
    ],
    outputs: []
  },
  
  // View Functions
  {
    name: "canClaimGift",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenId", type: "uint256" }
    ],
    outputs: [
      { name: "canClaim", type: "bool" },
      { name: "timeRemaining", type: "uint256" }
    ]
  },
  {
    name: "getGift",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenId", type: "uint256" }
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "creator", type: "address" },
          { name: "expirationTime", type: "uint96" },
          { name: "nftContract", type: "address" },
          { name: "tokenId", type: "uint256" },
          { name: "passwordHash", type: "bytes32" },
          { name: "status", type: "uint8" }
        ]
      }
    ]
  },
  
  // Time Constants
  {
    name: "FIFTEEN_MINUTES",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    name: "SEVEN_DAYS",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    name: "FIFTEEN_DAYS",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    name: "THIRTY_DAYS",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  
  // Access Control
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    name: "isTrustedForwarder",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "forwarder", type: "address" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  
  // Events
  {
    name: "GiftCreated",
    type: "event",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "nftContract", type: "address", indexed: true },
      { name: "expirationTime", type: "uint256", indexed: false },
      { name: "giftMessage", type: "string", indexed: false }
    ]
  },
  {
    name: "GiftClaimed",
    type: "event",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "claimer", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: true }
    ]
  },
  {
    name: "GiftReturned",
    type: "event",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false }
    ]
  }
] as const;

// Type definitions for better TypeScript support
export interface EscrowGift {
  creator: string;
  expirationTime: bigint;
  nftContract: string;
  tokenId: bigint;
  passwordHash: string;
  status: number; // 0=Active, 1=Claimed, 2=Returned
}

export interface GiftCreatedEvent {
  tokenId: bigint;
  creator: string;
  nftContract: string;
  expirationTime: bigint;
  giftMessage: string;
}

export interface GiftClaimedEvent {
  tokenId: bigint;
  claimer: string;
  recipient: string;
}

export interface GiftReturnedEvent {
  tokenId: bigint;
  creator: string;
  timestamp: bigint;
}

// Contract address constant - TEMPORARY HARDCODED FIX for Vercel env var issue
export const ESCROW_CONTRACT_ADDRESS = "0xAC398A1da4E7b198f82e6D68d5355e84FF976e01";

// Backup environment variable fallback
const ENV_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || process.env.ESCROW_CONTRACT_ADDRESS;

if (!ENV_CONTRACT_ADDRESS) {
  console.warn('⚠️ ESCROW_CONTRACT_ADDRESS not found in environment variables - using hardcoded address');
} else if (ENV_CONTRACT_ADDRESS !== ESCROW_CONTRACT_ADDRESS) {
  console.warn(`⚠️ Environment contract address (${ENV_CONTRACT_ADDRESS}) differs from hardcoded (${ESCROW_CONTRACT_ADDRESS})`);
}