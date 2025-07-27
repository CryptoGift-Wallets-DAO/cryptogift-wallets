/**
 * CRON: Fix Pending Mappings
 * Encuentra y corrige mappings huérfanos/pendientes
 * Ejecuta automáticamente para mantener integridad del sistema
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { readContract } from 'thirdweb';
import { getEscrowContract } from '../../../lib/escrowUtils';
import { storeGiftMapping, getGiftIdFromMapping } from '../../../lib/giftMappingStore';
import { validateMappingWithRetry, findCorrectGiftId } from '../../../lib/mappingValidator';

interface FixMappingResult {
  success: boolean;
  fixed: number;
  errors: number;
  details: Array<{
    giftId: number;
    tokenId: number;
    action: 'fixed' | 'validated' | 'error';
    error?: string;
  }>;
}

/**
 * Escanea gifts recientes en busca de mappings faltantes o incorrectos
 */
async function scanForMappingIssues(maxGiftsToCheck: number = 50): Promise<FixMappingResult> {
  const result: FixMappingResult = {
    success: true,
    fixed: 0,
    errors: 0,
    details: []
  };
  
  try {
    console.log(`🔍 CRON: Scanning last ${maxGiftsToCheck} gifts for mapping issues...`);
    
    // Get current gift counter
    const giftCounter = await readContract({
      contract: getEscrowContract(),
      method: "giftCounter",
      params: []
    });
    
    const totalGifts = Number(giftCounter);
    const startGiftId = Math.max(0, totalGifts - maxGiftsToCheck);
    
    console.log(`📊 CRON: Checking giftIds ${startGiftId} to ${totalGifts - 1} (${totalGifts - startGiftId} gifts)`);
    
    for (let giftId = startGiftId; giftId < totalGifts; giftId++) {
      try {
        // Get gift data from contract
        const giftData = await readContract({
          contract: getEscrowContract(),
          method: "getGift",
          params: [BigInt(giftId)]
        });
        
        const tokenId = Number(giftData[3]);
        const nftContract = giftData[2] as string;
        const creator = giftData[0] as string;
        
        // Skip if this isn't our NFT contract
        if (nftContract.toLowerCase() !== process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS?.toLowerCase()) {
          continue;
        }
        
        console.log(`🔍 Checking giftId ${giftId} → tokenId ${tokenId}`);
        
        // Check if mapping exists and is correct
        const existingMapping = await getGiftIdFromMapping(tokenId.toString());
        
        if (existingMapping === null) {
          // Missing mapping - add it
          console.log(`❌ MISSING: tokenId ${tokenId} has no mapping, fixing...`);
          
          await storeGiftMapping(tokenId, giftId);
          
          // Validate the fix
          const validation = await validateMappingWithRetry(tokenId, giftId, creator, nftContract);
          
          if (validation.valid) {
            console.log(`✅ FIXED: tokenId ${tokenId} → giftId ${giftId}`);
            result.fixed++;
            result.details.push({
              giftId,
              tokenId,
              action: 'fixed'
            });
          } else {
            console.error(`❌ FIX FAILED: ${validation.error}`);
            result.errors++;
            result.details.push({
              giftId,
              tokenId,
              action: 'error',
              error: validation.error
            });
          }
          
        } else if (existingMapping !== giftId) {
          // Incorrect mapping - fix it
          console.log(`❌ INCORRECT: tokenId ${tokenId} maps to ${existingMapping}, should be ${giftId}`);
          
          await storeGiftMapping(tokenId, giftId);
          
          // Validate the fix
          const validation = await validateMappingWithRetry(tokenId, giftId, creator, nftContract);
          
          if (validation.valid) {
            console.log(`✅ CORRECTED: tokenId ${tokenId} → giftId ${giftId} (was ${existingMapping})`);
            result.fixed++;
            result.details.push({
              giftId,
              tokenId,
              action: 'fixed'
            });
          } else {
            console.error(`❌ CORRECTION FAILED: ${validation.error}`);
            result.errors++;
            result.details.push({
              giftId,
              tokenId,
              action: 'error',
              error: validation.error
            });
          }
          
        } else {
          // Mapping is correct
          console.log(`✅ OK: tokenId ${tokenId} → giftId ${giftId}`);
          result.details.push({
            giftId,
            tokenId,
            action: 'validated'
          });
        }
        
        // Rate limiting - small delay to avoid overwhelming RPC
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (giftError) {
        console.error(`❌ Error processing giftId ${giftId}:`, giftError);
        result.errors++;
        result.details.push({
          giftId,
          tokenId: -1,
          action: 'error',
          error: (giftError as Error).message
        });
      }
    }
    
    console.log(`🎯 CRON COMPLETE: Fixed ${result.fixed} mappings, ${result.errors} errors`);
    
    if (result.errors > 0) {
      result.success = false;
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ CRON SCAN ERROR:', error);
    return {
      success: false,
      fixed: 0,
      errors: 1,
      details: [{
        giftId: -1,
        tokenId: -1,
        action: 'error',
        error: (error as Error).message
      }]
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify CRON authentication
  const cronSecret = req.headers['x-cron-secret'];
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized - Invalid CRON secret' 
    });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }
  
  try {
    console.log('🤖 CRON: Starting mapping fix job...');
    
    const maxGifts = parseInt(req.query.maxGifts as string) || 50;
    const result = await scanForMappingIssues(maxGifts);
    
    console.log('📊 CRON RESULT:', {
      success: result.success,
      fixed: result.fixed,
      errors: result.errors,
      checked: result.details.length
    });
    
    return res.status(200).json({
      success: result.success,
      message: `Mapping fix completed: ${result.fixed} fixed, ${result.errors} errors`,
      stats: {
        fixed: result.fixed,
        errors: result.errors,
        checked: result.details.length
      },
      details: result.details.slice(0, 10) // Limit response size
    });
    
  } catch (error) {
    console.error('❌ CRON HANDLER ERROR:', error);
    return res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
}