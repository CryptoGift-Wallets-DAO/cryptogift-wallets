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

    // FORWARD-ONLY: Get gift mapping with explicit reason codes
    const mappingResult = await getGiftIdFromMapping(tokenId);
    
    // SUCCESS CASE: JSON mapping found
    if (mappingResult.reason === 'json_ok' && mappingResult.giftId) {
      console.log(`✅ JSON mapping found: tokenId ${tokenId} → giftId ${mappingResult.giftId}`);
      
      // Check education requirements using giftId (not tokenId)
      const edu = await checkEducationRequirements(mappingResult.giftId);
      
      if (edu.reason === 'ok') {
        return res.status(200).json({
          success: true,
          hasPassword: true,
          hasEducation: edu.hasEducation,
          giftId: mappingResult.giftId,
          reason: 'education_ok',
          dataSource: 'redis_education',
          educationModules: edu.educationModules
        });
      }
      
      // Education check failed but mapping exists
      console.log(`📋 Education check result for giftId ${mappingResult.giftId}: ${edu.reason}`);
      return res.status(200).json({
        success: true,
        hasPassword: true, // We know there's a password because mapping exists
        hasEducation: false, // Default to false if can't determine
        giftId: mappingResult.giftId,
        reason: `education_${edu.reason}`,
        dataSource: 'mapping_only',
        educationModules: []
      });
    }
    
    // LEGACY INCOMPATIBLE: Explicit failure with clear message
    if (mappingResult.reason === 'legacy_incompatible') {
      console.warn(`⚠️ Legacy format detected: tokenId ${tokenId}`);
      
      return res.status(200).json({
        success: true,
        hasPassword: null, // TRI-STATE: Unknown due to legacy format
        hasEducation: null, // Cannot determine from legacy data
        giftId: null,
        reason: 'legacy_incompatible',
        status: 'unsupported',
        message: 'Token uses legacy format. Password/education detection unavailable.',
        fallback: 'blockchain_required'
      });
    }
    
    // OTHER MAPPING FAILURES: Invalid format, missing, Redis error
    if (mappingResult.reason !== 'json_ok') {
      console.log(`❌ Mapping failed: tokenId ${tokenId} reason=${mappingResult.reason}`);
      
      // Try blockchain fallback for non-legacy failures
      const blockchainData = await getGiftFromBlockchain(tokenId);
      
      if (blockchainData) {
        console.log(`✅ Blockchain fallback success: tokenId ${tokenId} → giftId ${blockchainData.giftId}`);
        
        // Try to check education requirements with the giftId from blockchain
        const edu = await checkEducationRequirements(blockchainData.giftId);
        
        return res.status(200).json({
          success: true,
          hasPassword: true,
          hasEducation: edu.reason === 'ok' ? edu.hasEducation : false,
          giftId: blockchainData.giftId,
          reason: edu.reason === 'ok' ? 'blockchain_with_education' : mappingResult.reason,
          dataSource: 'blockchain_fallback',
          educationModules: edu.reason === 'ok' ? edu.educationModules : []
        });
      }
      
      // Ultimate fallback: secure defaults
      return res.status(200).json({
        success: true,
        hasPassword: null, // TRI-STATE: Unknown due to mapping failure
        hasEducation: null,
        giftId: null,
        reason: mappingResult.reason,
        status: 'error',
        dataSource: 'secure_fallback',
        educationModules: []
      });
    }

  } catch (error: any) {
    console.error('❌ Error checking gift password:', error);
    
    // Default fallback on error (maintains invariant)
    return res.status(200).json({
      success: true,
      hasPassword: null, // TRI-STATE: Unknown due to system error
      hasEducation: null,
      reason: 'error',
      status: 'error',
      dataSource: 'error_fallback',
      error: error.message
    });
  }
}