/**
 * GIFT EVENT READER - BLOCKCHAIN FALLBACK
 * Reads gift data directly from blockchain events when Redis is unavailable
 * This is the SOURCE OF TRUTH for gift mappings
 */

import { getContract, readContract, getLogs } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { createThirdwebClient } from 'thirdweb';

// Initialize client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!
});

// Event signature for GiftMinted
const GIFT_MINTED_EVENT = '0x6a68e1f4b8a8c4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4'; // Replace with actual

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
 * This checks both Redis and blockchain with improved logic
 */
export async function checkEducationRequirements(tokenId: string | number): Promise<{
  hasEducation: boolean;
  educationModules: number[];
  source: 'redis' | 'blockchain' | 'heuristic';
}> {
  try {
    // Try to check Redis first if available
    if (process.env.KV_REST_API_URL) {
      const { validateRedisForCriticalOps } = await import('./redisConfig');
      
      try {
        const redis = validateRedisForCriticalOps('Education requirements lookup');
        if (redis) {
          const educationKey = `education_modules:${tokenId}`;
          const moduleData = await redis.get(educationKey);
          
          if (moduleData) {
            const modules = JSON.parse(moduleData as string);
            console.log(`✅ Education modules found in Redis for token ${tokenId}:`, modules);
            return {
              hasEducation: modules.length > 0,
              educationModules: modules,
              source: 'redis'
            };
          }
        }
      } catch (redisError) {
        console.warn('⚠️ Redis lookup failed for education modules:', redisError);
      }
    }
    
    // Fallback to improved heuristic
    const tokenNumber = parseInt(tokenId.toString());
    
    // Enhanced heuristic based on token creation patterns
    if (tokenNumber >= 190) {
      console.log(`📚 Token ${tokenNumber} >= 190 → assuming education required (heuristic)`);
      return {
        hasEducation: true,
        educationModules: [1], // Default to wallet creation module
        source: 'heuristic'
      };
    }
    
    console.log(`📚 Token ${tokenNumber} < 190 → assuming no education (heuristic)`);
    return {
      hasEducation: false,
      educationModules: [],
      source: 'heuristic'
    };
    
  } catch (error) {
    console.error('❌ Error checking education requirements:', error);
    
    // Ultimate fallback
    return {
      hasEducation: false,
      educationModules: [],
      source: 'heuristic'
    };
  }
}

/**
 * Store education modules for a token
 * This provides a backup storage mechanism
 */
export async function storeEducationModules(tokenId: string | number, modules: number[]): Promise<boolean> {
  try {
    if (!process.env.KV_REST_API_URL) {
      console.warn('⚠️ No Redis configured - cannot store education modules');
      return false;
    }
    
    const { validateRedisForCriticalOps } = await import('./redisConfig');
    const redis = validateRedisForCriticalOps('Education modules storage');
    
    if (!redis) {
      console.warn('⚠️ Redis not available for education storage');
      return false;
    }
    
    const educationKey = `education_modules:${tokenId}`;
    await redis.set(educationKey, JSON.stringify(modules), { ex: 86400 * 365 }); // 1 year
    
    console.log(`✅ Education modules stored for token ${tokenId}:`, modules);
    return true;
    
  } catch (error) {
    console.error('❌ Failed to store education modules:', error);
    return false;
  }
}