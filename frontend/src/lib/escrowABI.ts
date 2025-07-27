/**
 * CRYPTOGIFT ESCROW CONTRACT ABI V2 - ZERO CUSTODY ARCHITECTURE
 * Contract: 0x46175CfC233500DA803841DEef7f2816e7A129E0
 * Network: Base Sepolia
 * Version: 2.0.0
 * Updated: 2025-07-27 - NEW V2 WITH registerGiftMinted FOR ZERO CUSTODY
 */

// Import V2 ABI and exports
export { 
  ESCROW_ABI_V2 as ESCROW_ABI, 
  ESCROW_CONTRACT_ADDRESS_V2 as ESCROW_CONTRACT_ADDRESS 
} from './escrowABIV2';

export type { 
  EscrowGift,
  GiftRegisteredFromMintEvent,
  GiftCreatedEvent,
  GiftClaimedEvent,
  GiftReturnedEvent
} from './escrowABIV2';

// Legacy V1 ABI for backward compatibility (DEPRECATED)
export const ESCROW_ABI_V1 = [
  {
    "type": "constructor",
    "inputs": [{"name": "trustedForwarder", "type": "address", "internalType": "address"}],
    "stateMutability": "nonpayable"
  },
  {"type": "fallback", "stateMutability": "payable"},
  {"type": "receive", "stateMutability": "payable"},
  {
    "type": "function",
    "name": "BASE_COOLDOWN",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint32", "internalType": "uint32"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "DEFAULT_ADMIN_ROLE",
    "inputs": [],
    "outputs": [{"name": "", "type": "bytes32", "internalType": "bytes32"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "DOMAIN_SEPARATOR",
    "inputs": [],
    "outputs": [{"name": "", "type": "bytes32", "internalType": "bytes32"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "EMERGENCY_ROLE",
    "inputs": [],
    "outputs": [{"name": "", "type": "bytes32", "internalType": "bytes32"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "FAILED_COOLDOWN",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint32", "internalType": "uint32"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "FIFTEEN_DAYS",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "FIFTEEN_MINUTES",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "GATE_GAS_LIMIT",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "GATE_MANAGER_ROLE",
    "inputs": [],
    "outputs": [{"name": "", "type": "bytes32", "internalType": "bytes32"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "IMMUTABLE",
    "inputs": [],
    "outputs": [{"name": "", "type": "bool", "internalType": "bool"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "INCENTIVE_PER_ITEM",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_ATTEMPTS",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint8", "internalType": "uint8"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_BATCH_SIZE",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_COOLDOWN",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint32", "internalType": "uint32"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_DAILY_ATTEMPTS",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint32", "internalType": "uint32"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_FAILED_ATTEMPTS",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint32", "internalType": "uint32"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_INCENTIVE_PER_TX",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_GAS_PER_ITEM",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "PAUSER_ROLE",
    "inputs": [],
    "outputs": [{"name": "", "type": "bytes32", "internalType": "bytes32"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "SEVEN_DAYS",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "THIRTY_DAYS",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "VERSION",
    "inputs": [],
    "outputs": [{"name": "", "type": "string", "internalType": "string"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "attemptInfo",
    "inputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "outputs": [
      {"name": "count", "type": "uint32", "internalType": "uint32"},
      {"name": "lastAttempt", "type": "uint32", "internalType": "uint32"},
      {"name": "lockUntil", "type": "uint32", "internalType": "uint32"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "canClaimGift",
    "inputs": [{"name": "giftId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [
      {"name": "canClaim", "type": "bool", "internalType": "bool"},
      {"name": "timeRemaining", "type": "uint256", "internalType": "uint256"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "claimGift",
    "inputs": [
      {"name": "giftId", "type": "uint256", "internalType": "uint256"},
      {"name": "password", "type": "string", "internalType": "string"},
      {"name": "salt", "type": "bytes32", "internalType": "bytes32"},
      {"name": "gateData", "type": "bytes", "internalType": "bytes"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createGift",
    "inputs": [
      {"name": "tokenId", "type": "uint256", "internalType": "uint256"},
      {"name": "nftContract", "type": "address", "internalType": "address"},
      {"name": "password", "type": "string", "internalType": "string"},
      {"name": "salt", "type": "bytes32", "internalType": "bytes32"},
      {"name": "timeframe", "type": "uint256", "internalType": "uint256"},
      {"name": "giftMessage", "type": "string", "internalType": "string"},
      {"name": "gate", "type": "address", "internalType": "address"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "disabledGates",
    "inputs": [{"name": "", "type": "address", "internalType": "address"}],
    "outputs": [{"name": "", "type": "bool", "internalType": "bool"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAttemptInfo",
    "inputs": [{"name": "giftId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [
      {"name": "count", "type": "uint32", "internalType": "uint32"},
      {"name": "lastAttempt", "type": "uint32", "internalType": "uint32"},
      {"name": "lockUntil", "type": "uint32", "internalType": "uint32"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getGift",
    "inputs": [{"name": "giftId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [
      {"name": "creator", "type": "address", "internalType": "address"},
      {"name": "expirationTime", "type": "uint96", "internalType": "uint96"},
      {"name": "nftContract", "type": "address", "internalType": "address"},
      {"name": "tokenId", "type": "uint256", "internalType": "uint256"},
      {"name": "passwordHash", "type": "bytes32", "internalType": "bytes32"},
      {"name": "status", "type": "uint8", "internalType": "uint8"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getGiftMessage",
    "inputs": [{"name": "giftId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [{"name": "", "type": "string", "internalType": "string"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRoleAdmin",
    "inputs": [{"name": "role", "type": "bytes32", "internalType": "bytes32"}],
    "outputs": [{"name": "", "type": "bytes32", "internalType": "bytes32"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "giftCounter",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "giftGateOverride",
    "inputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "outputs": [{"name": "", "type": "address", "internalType": "address"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "giftMessages",
    "inputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "outputs": [{"name": "", "type": "string", "internalType": "string"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "giftNonces",
    "inputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "gifts",
    "inputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "outputs": [
      {"name": "creator", "type": "address", "internalType": "address"},
      {"name": "collection", "type": "address", "internalType": "address"},
      {"name": "gate", "type": "address", "internalType": "address"},
      {"name": "tokenId", "type": "uint96", "internalType": "uint96"},
      {"name": "expiresAt", "type": "uint40", "internalType": "uint40"},
      {"name": "claimed", "type": "bool", "internalType": "bool"},
      {"name": "returned", "type": "bool", "internalType": "bool"},
      {"name": "passHash", "type": "bytes32", "internalType": "bytes32"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "grantRole",
    "inputs": [
      {"name": "role", "type": "bytes32", "internalType": "bytes32"},
      {"name": "account", "type": "address", "internalType": "address"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "hasRole",
    "inputs": [
      {"name": "role", "type": "bytes32", "internalType": "bytes32"},
      {"name": "account", "type": "address", "internalType": "address"}
    ],
    "outputs": [{"name": "", "type": "bool", "internalType": "bool"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hourlyFailedOps",
    "inputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isGiftExpired",
    "inputs": [{"name": "giftId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [{"name": "", "type": "bool", "internalType": "bool"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isTrustedForwarder",
    "inputs": [{"name": "forwarder", "type": "address", "internalType": "address"}],
    "outputs": [{"name": "", "type": "bool", "internalType": "bool"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "maxFailedUserOpsPerHour",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "onERC1155BatchReceived",
    "inputs": [
      {"name": "", "type": "address", "internalType": "address"},
      {"name": "", "type": "address", "internalType": "address"},
      {"name": "tokenIds", "type": "uint256[]", "internalType": "uint256[]"},
      {"name": "", "type": "uint256[]", "internalType": "uint256[]"},
      {"name": "", "type": "bytes", "internalType": "bytes"}
    ],
    "outputs": [{"name": "", "type": "bytes4", "internalType": "bytes4"}],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "onERC1155Received",
    "inputs": [
      {"name": "", "type": "address", "internalType": "address"},
      {"name": "", "type": "address", "internalType": "address"},
      {"name": "", "type": "uint256", "internalType": "uint256"},
      {"name": "", "type": "uint256", "internalType": "uint256"},
      {"name": "", "type": "bytes", "internalType": "bytes"}
    ],
    "outputs": [{"name": "", "type": "bytes4", "internalType": "bytes4"}],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "onERC721Received",
    "inputs": [
      {"name": "", "type": "address", "internalType": "address"},
      {"name": "", "type": "address", "internalType": "address"},
      {"name": "", "type": "uint256", "internalType": "uint256"},
      {"name": "", "type": "bytes", "internalType": "bytes"}
    ],
    "outputs": [{"name": "", "type": "bytes4", "internalType": "bytes4"}],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "pause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "paused",
    "inputs": [],
    "outputs": [{"name": "", "type": "bool", "internalType": "bool"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "paymasterData",
    "inputs": [{"name": "", "type": "address", "internalType": "address"}],
    "outputs": [
      {"name": "dailyAttempts", "type": "uint32", "internalType": "uint32"},
      {"name": "lastResetDay", "type": "uint32", "internalType": "uint32"},
      {"name": "failedAttempts", "type": "uint32", "internalType": "uint32"},
      {"name": "cooldownUntil", "type": "uint32", "internalType": "uint32"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "paymasterMinBalance",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "renounceRole",
    "inputs": [
      {"name": "role", "type": "bytes32", "internalType": "bytes32"},
      {"name": "callerConfirmation", "type": "address", "internalType": "address"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "returnExpiredGift",
    "inputs": [{"name": "giftId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "revokeRole",
    "inputs": [
      {"name": "role", "type": "bytes32", "internalType": "bytes32"},
      {"name": "account", "type": "address", "internalType": "address"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setGateStatus",
    "inputs": [
      {"name": "gate", "type": "address", "internalType": "address"},
      {"name": "disabled", "type": "bool", "internalType": "bool"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "supportsInterface",
    "inputs": [{"name": "interfaceId", "type": "bytes4", "internalType": "bytes4"}],
    "outputs": [{"name": "", "type": "bool", "internalType": "bool"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "trustedForwarder",
    "inputs": [],
    "outputs": [{"name": "", "type": "address", "internalType": "address"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "unpause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "usedSignatures",
    "inputs": [{"name": "", "type": "bytes32", "internalType": "bytes32"}],
    "outputs": [{"name": "", "type": "bool", "internalType": "bool"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "whitelistedMethods",
    "inputs": [{"name": "", "type": "bytes4", "internalType": "bytes4"}],
    "outputs": [{"name": "", "type": "bool", "internalType": "bool"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [
      {"name": "amount", "type": "uint256", "internalType": "uint256"},
      {"name": "to", "type": "address", "internalType": "address"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "GiftClaimed",
    "inputs": [
      {"name": "giftId", "type": "uint256", "indexed": true, "internalType": "uint256"},
      {"name": "claimer", "type": "address", "indexed": true, "internalType": "address"},
      {"name": "recipient", "type": "address", "indexed": true, "internalType": "address"},
      {"name": "gate", "type": "address", "indexed": false, "internalType": "address"},
      {"name": "gateReason", "type": "string", "indexed": false, "internalType": "string"}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GiftCreated",
    "inputs": [
      {"name": "giftId", "type": "uint256", "indexed": true, "internalType": "uint256"},
      {"name": "creator", "type": "address", "indexed": true, "internalType": "address"},
      {"name": "nftContract", "type": "address", "indexed": true, "internalType": "address"},
      {"name": "tokenId", "type": "uint256", "indexed": false, "internalType": "uint256"},
      {"name": "expiresAt", "type": "uint40", "indexed": false, "internalType": "uint40"},
      {"name": "gate", "type": "address", "indexed": false, "internalType": "address"},
      {"name": "giftMessage", "type": "string", "indexed": false, "internalType": "string"}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GiftLockTriggered",
    "inputs": [
      {"name": "giftId", "type": "uint256", "indexed": true, "internalType": "uint256"},
      {"name": "attacker", "type": "address", "indexed": true, "internalType": "address"},
      {"name": "attempts", "type": "uint32", "indexed": false, "internalType": "uint32"},
      {"name": "lockUntil", "type": "uint32", "indexed": false, "internalType": "uint32"}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GiftReturned",
    "inputs": [
      {"name": "giftId", "type": "uint256", "indexed": true, "internalType": "uint256"},
      {"name": "creator", "type": "address", "indexed": true, "internalType": "address"},
      {"name": "returnedBy", "type": "address", "indexed": true, "internalType": "address"},
      {"name": "timestamp", "type": "uint256", "indexed": false, "internalType": "uint256"}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GateStatusChanged",
    "inputs": [
      {"name": "gate", "type": "address", "indexed": true, "internalType": "address"},
      {"name": "disabled", "type": "bool", "indexed": false, "internalType": "bool"},
      {"name": "manager", "type": "address", "indexed": true, "internalType": "address"}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Paused",
    "inputs": [{"name": "account", "type": "address", "indexed": false, "internalType": "address"}],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleAdminChanged",
    "inputs": [
      {"name": "role", "type": "bytes32", "indexed": true, "internalType": "bytes32"},
      {"name": "previousAdminRole", "type": "bytes32", "indexed": true, "internalType": "bytes32"},
      {"name": "newAdminRole", "type": "bytes32", "indexed": true, "internalType": "bytes32"}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleGranted",
    "inputs": [
      {"name": "role", "type": "bytes32", "indexed": true, "internalType": "bytes32"},
      {"name": "account", "type": "address", "indexed": true, "internalType": "address"},
      {"name": "sender", "type": "address", "indexed": true, "internalType": "address"}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleRevoked",
    "inputs": [
      {"name": "role", "type": "bytes32", "indexed": true, "internalType": "bytes32"},
      {"name": "account", "type": "address", "indexed": true, "internalType": "address"},
      {"name": "sender", "type": "address", "indexed": true, "internalType": "address"}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Unpaused",
    "inputs": [{"name": "account", "type": "address", "indexed": false, "internalType": "address"}],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AccessControlBadConfirmation",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AccessControlUnauthorizedAccount",
    "inputs": [
      {"name": "account", "type": "address", "internalType": "address"},
      {"name": "neededRole", "type": "bytes32", "internalType": "bytes32"}
    ]
  },
  {
    "type": "error",
    "name": "AuthorizationExpired",
    "inputs": [{"name": "deadline", "type": "uint256", "internalType": "uint256"}]
  },
  {
    "type": "error",
    "name": "BatchTooLarge",
    "inputs": [
      {"name": "requested", "type": "uint256", "internalType": "uint256"},
      {"name": "maxAllowed", "type": "uint256", "internalType": "uint256"}
    ]
  },
  {
    "type": "error",
    "name": "EnforcedPause",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ExpectedPause",
    "inputs": []
  },
  {
    "type": "error",
    "name": "GateCheckFailed",
    "inputs": [
      {"name": "giftId", "type": "uint256", "internalType": "uint256"},
      {"name": "gate", "type": "address", "internalType": "address"},
      {"name": "reason", "type": "string", "internalType": "string"}
    ]
  },
  {
    "type": "error",
    "name": "GateDisabled",
    "inputs": [{"name": "gate", "type": "address", "internalType": "address"}]
  },
  {
    "type": "error",
    "name": "GiftAlreadyClaimed",
    "inputs": [{"name": "giftId", "type": "uint256", "internalType": "uint256"}]
  },
  {
    "type": "error",
    "name": "GiftAlreadyReturned",
    "inputs": [{"name": "giftId", "type": "uint256", "internalType": "uint256"}]
  },
  {
    "type": "error",
    "name": "GiftExpired",
    "inputs": [
      {"name": "giftId", "type": "uint256", "internalType": "uint256"},
      {"name": "expiredAt", "type": "uint256", "internalType": "uint256"}
    ]
  },
  {
    "type": "error",
    "name": "GiftLocked",
    "inputs": [
      {"name": "giftId", "type": "uint256", "internalType": "uint256"},
      {"name": "unlockTime", "type": "uint256", "internalType": "uint256"}
    ]
  },
  {
    "type": "error",
    "name": "GiftNotExpired",
    "inputs": [
      {"name": "giftId", "type": "uint256", "internalType": "uint256"},
      {"name": "expiresAt", "type": "uint256", "internalType": "uint256"}
    ]
  },
  {
    "type": "error",
    "name": "GiftNotFound",
    "inputs": [{"name": "giftId", "type": "uint256", "internalType": "uint256"}]
  },
  {
    "type": "error",
    "name": "InsufficientGasForBatch",
    "inputs": [
      {"name": "available", "type": "uint256", "internalType": "uint256"},
      {"name": "required", "type": "uint256", "internalType": "uint256"}
    ]
  },
  {
    "type": "error",
    "name": "InvalidGiftMessage",
    "inputs": [{"name": "message", "type": "string", "internalType": "string"}]
  },
  {
    "type": "error",
    "name": "InvalidRecipient",
    "inputs": [{"name": "recipient", "type": "address", "internalType": "address"}]
  },
  {
    "type": "error",
    "name": "InvalidSignature",
    "inputs": [{"name": "hash", "type": "bytes32", "internalType": "bytes32"}]
  },
  {
    "type": "error",
    "name": "InvalidTimeframe",
    "inputs": [{"name": "timeframe", "type": "uint256", "internalType": "uint256"}]
  },
  {
    "type": "error",
    "name": "NotGiftCreator",
    "inputs": [
      {"name": "caller", "type": "address", "internalType": "address"},
      {"name": "creator", "type": "address", "internalType": "address"}
    ]
  },
  {
    "type": "error",
    "name": "PaymasterCooldownActive",
    "inputs": [
      {"name": "user", "type": "address", "internalType": "address"},
      {"name": "cooldownEnd", "type": "uint256", "internalType": "uint256"}
    ]
  },
  {
    "type": "error",
    "name": "PaymasterLimitExceeded",
    "inputs": [
      {"name": "user", "type": "address", "internalType": "address"},
      {"name": "dailyUsed", "type": "uint32", "internalType": "uint32"}
    ]
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "UnauthorizedClaimer",
    "inputs": [
      {"name": "claimer", "type": "address", "internalType": "address"},
      {"name": "required", "type": "address", "internalType": "address"}
    ]
  },
  {
    "type": "error",
    "name": "WrongPassword",
    "inputs": [
      {"name": "giftId", "type": "uint256", "internalType": "uint256"},
      {"name": "attemptsRemaining", "type": "uint8", "internalType": "uint8"}
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
  giftId: bigint;
  creator: string;
  nftContract: string;
  tokenId: bigint;
  expiresAt: bigint;
  gate: string;
  giftMessage: string;
}

export interface GiftClaimedEvent {
  giftId: bigint;
  claimer: string;
  recipient: string;
  gate: string;
  gateReason: string;
}

export interface GiftReturnedEvent {
  giftId: bigint;
  creator: string;
  returnedBy: string;
  timestamp: bigint;
}

// Legacy V1 address for reference
export const ESCROW_CONTRACT_ADDRESS_V1 = '0xAC398A1da4E7b198f82e6D68d5355e84FF976e01';

// Note: Main exports are from escrowABIV2.ts