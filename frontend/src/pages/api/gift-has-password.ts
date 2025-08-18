import type { NextApiRequest, NextApiResponse } from 'next';
import { getContract, readContract } from 'thirdweb';
import { client } from '../../app/client';
import { baseSepolia } from 'thirdweb/chains';
import { getGiftIdFromMapping } from '../../lib/giftMappingStore';
import { getGiftFromBlockchain, checkEducationRequirements } from '../../lib/giftEventReader';

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
          hasPassword: true,  // ALWAYS true - all gifts have passwords
          hasEducation: educationCheck.hasEducation,
          reason: 'fallback_' + educationCheck.source,
          giftId: null,
          educationModules: educationCheck.educationModules
        });
      }
    }

    console.log(`✅ Token ${tokenId} maps to Gift ${giftId}`);

    // Get escrow contract
    const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS;
    if (!escrowAddress) {
      console.error('❌ ESCROW_CONTRACT_ADDRESS not configured');
      return res.status(200).json({
        success: true,
        hasPassword: false,
        hasEducation: false,
        reason: 'no_escrow_config'
      });
    }

    const escrowContract = getContract({
      client,
      chain: baseSepolia,
      address: escrowAddress as `0x${string}`
    });

    // Check if gift has password (passwordHash != 0x0)
    const gift = await readContract({
      contract: escrowContract,
      method: "function getGift(uint256 giftId) view returns (address creator, address nftContract, uint256 tokenId, uint256 expirationTime, bytes32 passwordHash, string message, uint8 status)",
      params: [BigInt(giftId)]
    }) as readonly [string, string, bigint, bigint, string, string, number];

    const [creator, nftContract, tokenIdFromContract, expirationTime, passwordHash, message, status] = gift;
    const hasPassword = passwordHash !== '0x0000000000000000000000000000000000000000000000000000000000000000';
    
    // Check for education requirements using multiple sources
    const educationCheck = await checkEducationRequirements(tokenId);
    const hasEducation = educationCheck.hasEducation;
    
    console.log(`📊 Gift ${giftId} requirements:`, {
      tokenId,
      giftId,
      hasPassword,
      hasEducation,
      educationSource: educationCheck.source,
      passwordHash: hasPassword ? passwordHash.slice(0, 10) + '...' : 'none',
      dataSource
    });

    return res.status(200).json({
      success: true,
      hasPassword,
      hasEducation,
      giftId,
      educationModules: educationCheck.educationModules,
      dataSource,
      educationSource: educationCheck.source
    });

  } catch (error: any) {
    console.error('❌ Error checking gift password:', error);
    
    // Default to no password if error
    return res.status(200).json({
      success: true,
      hasPassword: false,
      hasEducation: false,
      reason: 'error',
      error: error.message
    });
  }
}