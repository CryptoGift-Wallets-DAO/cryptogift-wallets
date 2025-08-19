/**
 * GIFT EVENT READER - BLOCKCHAIN FALLBACK
 * Reads gift data directly from blockchain events when Redis is unavailable
 * This is the SOURCE OF TRUTH for gift mappings
 */

import { getContract, readContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { createThirdwebClient } from 'thirdweb';

// Initialize client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!
});

// Event signature for GiftMinted - removed unused event code

interface GiftMintedEvent {
  tokenId: bigint;
  giftId: bigint;
  creator: string;
  recipient: string;
  passwordHash: string;
  expirationTime: bigint;
}

/**
 * Get gift data directly from blockchain events
 * This is the ultimate fallback when Redis is down
 */
export async function getGiftFromBlockchain(tokenId: string | number): Promise<{
  giftId: number;
  creator: string;
  hasPassword: boolean;
  expirationTime: number;
} | null> {
  try {
    console.log(`🔍 BLOCKCHAIN FALLBACK: Reading events for tokenId ${tokenId}...`);
    
    const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS;
    if (!escrowAddress) {
      console.error('❌ ESCROW_CONTRACT_ADDRESS not configured');
      return null;
    }

    const escrowContract = getContract({
      client,
      chain: baseSepolia,
      address: escrowAddress as `0x${string}`
    });

    // Try to get gift directly by tokenId
    // Most escrow contracts have a mapping tokenId -> giftId
    try {
      // First, try to get the gift counter to know the range
      const giftCounter = await readContract({
        contract: escrowContract,
        method: "function giftCounter() view returns (uint256)",
        params: []
      }) as bigint;

      console.log(`📊 Gift counter: ${giftCounter}`);

      // Search through gifts to find the one with our tokenId
      for (let giftId = 1n; giftId <= giftCounter; giftId++) {
        try {
          const gift = await readContract({
            contract: escrowContract,
            method: "function getGift(uint256 giftId) view returns (address creator, address nftContract, uint256 tokenId, uint256 expirationTime, bytes32 passwordHash, string message, uint8 status)",
            params: [giftId]
          }) as readonly [string, string, bigint, bigint, string, string, number];

          const [creator, nftContract, giftTokenId, expirationTime, passwordHash, message, status] = gift;
          
          // Check if this is our tokenId
          if (giftTokenId.toString() === tokenId.toString()) {
            console.log(`✅ FOUND GIFT ON BLOCKCHAIN: tokenId ${tokenId} → giftId ${giftId}`);
            
            return {
              giftId: Number(giftId),
              creator,
              hasPassword: passwordHash !== '0x0000000000000000000000000000000000000000000000000000000000000000',
              expirationTime: Number(expirationTime)
            };
          }
        } catch (e) {
          // Gift doesn't exist at this ID, continue
          continue;
        }
      }

      console.log(`❌ No gift found on blockchain for tokenId ${tokenId}`);
      return null;

    } catch (error) {
      console.error('❌ Error reading from blockchain:', error);
      return null;
    }

  } catch (error) {
    console.error('❌ Blockchain fallback failed:', error);
    return null;
  }
}

/**
 * Check if a gift has education requirements
 * This checks Redis using the correct giftId-based key
 */
type EduReason = 'ok' | 'missing_requirements' | 'invalid_payload' | 'redis_error';

export async function checkEducationRequirements(giftIdInput: string | number): Promise<{
  hasEducation: boolean;
  educationModules: number[];
  source: 'redis' | 'blockchain' | 'heuristic' | 'fallback_secure';
  reason: EduReason;
}> {
  try {
    // Validate giftId input
    const giftId = parseInt(giftIdInput.toString());
    if (isNaN(giftId) || giftId <= 0) {
      console.error(`❌ Invalid giftId provided: ${giftIdInput}`);
      return { 
        hasEducation: false, 
        educationModules: [], 
        source: 'validation_error' as any,
        reason: 'invalid_payload' 
      };
    }

    // Try to check Redis first if available (support both KV and UPSTASH)
    if (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) {
      const { validateRedisForCriticalOps } = await import('./redisConfig');
      
      try {
        const redis = validateRedisForCriticalOps('Education requirements lookup');
        if (redis) {
          // CRITICAL FIX: Use correct key format with giftId
          const educationKey = `education:gift:${giftId}`;
          console.log(`🔍 EDUCATION LOOKUP: Checking Redis key "${educationKey}" for giftId ${giftId}`);
          const educationDataRaw = await redis.get(educationKey);
          console.log(`📊 EDUCATION RAW DATA:`, { 
            key: educationKey,
            found: !!educationDataRaw,
            type: typeof educationDataRaw,
            dataPreview: educationDataRaw ? JSON.stringify(educationDataRaw).slice(0, 100) + '...' : null
          });
          
          if (educationDataRaw) {
            try {
              // Parse the education data object
              const educationData = typeof educationDataRaw === 'string' 
                ? JSON.parse(educationDataRaw)
                : educationDataRaw;
              
              // Extract modules from the structured data
              const modules = educationData.modules || [];
              console.log(`✅ Education requirements found in Redis for giftId ${giftId}:`, modules);
              
              return {
                hasEducation: modules.length > 0,
                educationModules: modules,
                source: 'redis',
                reason: 'ok'
              };
            } catch (parseError) {
              console.error(`❌ Failed to parse education data for giftId ${giftId}:`, parseError);
              return {
                hasEducation: false,
                educationModules: [],
                source: 'fallback_secure',
                reason: 'invalid_payload'
              };
            }
          } else {
            console.log(`📋 No education requirements found for giftId ${giftId}`);
            return {
              hasEducation: false,
              educationModules: [],
              source: 'fallback_secure',
              reason: 'missing_requirements'
            };
          }
        }
      } catch (redisError) {
        console.warn('⚠️ Redis lookup failed for education requirements:', redisError);
        return {
          hasEducation: false,
          educationModules: [],
          source: 'fallback_secure',
          reason: 'redis_error'
        };
      }
    }
    
    // No Redis configured
    console.warn(`⚠️ No Redis configured for education requirements check (giftId ${giftId})`);
    
    return {
      hasEducation: false,
      educationModules: [],
      source: 'fallback_secure',
      reason: 'redis_error'
    };
    
  } catch (error) {
    console.error('❌ Error checking education requirements:', error);
    
    // Ultimate fallback
    return {
      hasEducation: false,
      educationModules: [],
      source: 'heuristic',
      reason: 'redis_error'
    };
  }
}

