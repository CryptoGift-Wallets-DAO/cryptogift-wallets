import type { NextApiRequest, NextApiResponse } from 'next';
import { getContract, readContract } from 'thirdweb';
import { client } from '../../app/client';
import { baseSepolia } from 'thirdweb/chains';
import { getGiftIdFromMapping } from '../../lib/giftMappingStore';
import { getGiftFromBlockchain, checkEducationRequirements } from '../../lib/giftEventReader';
import { getRedisConnection } from '../../lib/redisConfig';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tokenId } = req.query;

  if (!tokenId || typeof tokenId !== 'string') {
    return res.status(400).json({ error: 'Invalid token ID' });
  }

  try {
    console.log(`🔍 Checking if gift ${tokenId} has password...`);

    // Get gift mapping to find actual giftId
    let giftId = await getGiftIdFromMapping(tokenId);
    let dataSource = 'redis';
    
    if (!giftId) {
      console.log(`⚠️ No Redis mapping for token ${tokenId} - trying blockchain fallback...`);
      
      // Try blockchain fallback
      const blockchainData = await getGiftFromBlockchain(tokenId);
      
      if (blockchainData) {
        giftId = blockchainData.giftId;
        dataSource = 'blockchain';
        console.log(`✅ Found gift on blockchain: tokenId ${tokenId} → giftId ${giftId}`);
      } else {
        // Ultimate fallback: use education requirements check
        const educationCheck = await checkEducationRequirements(tokenId);
        
        console.log(`⚠️ No blockchain data for token ${tokenId} - using heuristic`);
        console.log(`📚 Education status: ${educationCheck.hasEducation ? 'YES' : 'NO'} (source: ${educationCheck.source})`);
        
        return res.status(200).json({
          success: true,
          hasPassword: true, // INVARIANT: Always true - password verification happens on-chain
          hasEducation: educationCheck.hasEducation,
          reason: 'fallback_' + educationCheck.source,
          giftId: null,
          educationModules: educationCheck.educationModules
        });
      }
    }

    console.log(`✅ Token ${tokenId} maps to Gift ${giftId}`);

    // PRIMARY: Try new unified education key
    if (giftId) {
      try {
        const redis = getRedisConnection(); // FIX: Use centralized Redis client

        const educationKey = `education:gift:${giftId}`;
        const educationData = await redis.get(educationKey);

        if (educationData) {
          const parsed = JSON.parse(educationData as string);
          console.log('✅ Education data found (new key):', {
            giftId,
            hasEducation: parsed.hasEducation,
            source: 'redis_unified',
            version: parsed.version
          });

          return res.status(200).json({
            success: true,
            hasPassword: true, // INVARIANT: Always true - password verification happens on-chain // INVARIANT: Always true - password verification happens on-chain
            hasEducation: parsed.hasEducation,
            educationModules: parsed.modules,
            giftId,
            dataSource: 'redis_unified',
            version: parsed.version
          });
        }

        // FALLBACK: Try legacy keys (with deprecation warning)
        const legacyKey = `education_modules:${tokenId}`;
        const legacyModules = await redis.get(legacyKey);

        if (legacyModules) {
          console.warn(`⚠️ DEPRECATED: Using legacy key ${legacyKey} - migrate to education:gift:${giftId}`);
          const modules = JSON.parse(legacyModules as string);

          return res.status(200).json({
            success: true,
            hasPassword: true, // INVARIANT: Always true - password verification happens on-chain
            hasEducation: modules.length > 0,
            educationModules: modules,
            giftId,
            dataSource: 'redis_legacy'
          });
        }
      } catch (redisError) {
        console.warn('⚠️ Redis education lookup failed:', redisError);
        // Continue to blockchain fallback
      }
    }

    // Get escrow contract
    const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS;
    if (!escrowAddress) {
      console.error('❌ ESCROW_CONTRACT_ADDRESS not configured');
      return res.status(200).json({
        success: true,
        hasPassword: true, // FIX: Maintain invariant - all gifts have passwords
        hasEducation: false,
        reason: 'no_escrow_config'
      });
    }

    const escrowContract = getContract({
      client,
      chain: baseSepolia,
      address: escrowAddress as `0x${string}`
    });

    // BLOCKCHAIN FALLBACK: Read gift.gate to determine education requirements
    try {
      const gift = await readContract({
        contract: escrowContract,
        method: "function getGift(uint256 giftId) view returns (address creator, address nftContract, uint256 tokenId, uint256 expirationTime, bytes32 passwordHash, string message, uint8 status, address gate)",
        params: [BigInt(giftId)]
      }) as readonly [string, string, bigint, bigint, string, string, number, string];

      const [creator, nftContract, tokenIdFromContract, expirationTime, passwordHash, message, status, gateAddress] = gift;
      
      // gate != 0x0 ⇒ hasEducation = true
      // gate == 0x0 ⇒ hasEducation = false
      const hasEducationOnChain = gateAddress !== '0x0000000000000000000000000000000000000000';
      
      console.log(`📡 BLOCKCHAIN FALLBACK: Gift ${giftId} gate=${gateAddress.slice(0, 10)}... → hasEducation=${hasEducationOnChain}`);
      
      return res.status(200).json({
        success: true,
        hasPassword: true, // INVARIANT: Always true
        hasEducation: hasEducationOnChain,
        educationModules: [], // FIX: Don't assume modules, return empty if not in Redis
        giftId,
        dataSource: 'blockchain_gate',
        gateAddress: gateAddress
      });
      
    } catch (blockchainError) {
      console.error('❌ Blockchain fallback failed:', blockchainError);
      
      // ULTIMATE FALLBACK: No education (secure default)
      console.log(`⚠️ No education data found for token ${tokenId} - using secure fallback`);
      
      return res.status(200).json({
        success: true,
        hasPassword: true, // INVARIANT: Always true
        hasEducation: false, // Secure default
        educationModules: [],
        giftId,
        dataSource: 'fallback_none'
      });
    }

  } catch (error: any) {
    console.error('❌ Error checking gift password:', error);
    
    // Default fallback on error (maintains invariant)
    return res.status(200).json({
      success: true,
      hasPassword: true, // FIX: Maintain invariant - all gifts have passwords
      hasEducation: false,
      reason: 'error',
      error: error.message
    });
  }
}