/**
 * CRYPTOGIFT ESCROW CONTRACT ABI V2 - ZERO CUSTODY ARCHITECTURE
 * Contract: 0x46175CfC233500DA803841DEef7f2816e7A129E0
 * Network: Base Sepolia
 * Version: 2.0.0
 * Updated: 2025-07-27 - ZERO CUSTODY WITH registerGiftMinted
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