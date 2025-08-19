/**
 * MINT ESCROW API
 * Mint NFT + Create Escrow Gift in one atomic operation
 * 
 * 🚨 TEMPORARY STATUS: Gasless transactions temporarily disabled
 * Reason: Focusing on robust gas-paid implementation before re-enabling gasless
 * Status: All transactions use gas-paid method (deployer covers gas costs)
 * To re-enable: Set gaslessTemporarilyDisabled = false in handler function
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction, waitForReceipt, readContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { 
  generateSalt,
  generatePasswordHash,
  getEscrowContract,
  prepareRegisterGiftMintedCall,
  validatePassword,
  validateGiftMessage,
  sanitizeGiftMessage,
  verifyNFTOwnership,
  TIMEFRAME_OPTIONS
} from '../../lib/escrowUtils';
import { createBiconomySmartAccount, sendGaslessTransaction, validateBiconomyConfig } from '../../lib/biconomy';
import { storeNFTMetadata, updateNFTMetadata, createNFTMetadata, getNFTMetadata } from '../../lib/nftMetadataStore';
import { debugLogger } from '../../lib/secureDebugLogger';
import { validateIPFSConfig } from '../../lib/ipfs';
import { verifyJWT, extractTokenFromHeaders } from '../../lib/siweAuth';
import { storeGiftMapping, storeGiftSalt } from '../../lib/giftMappingStore';
import {
  validateTransactionAttempt,
  registerTransactionAttempt,
  markTransactionCompleted,
  markTransactionFailed,
  verifyGaslessTransaction,
  checkRateLimit
} from '../../lib/gaslessValidation';
import { createEscrowMetadata, createDirectMintMetadata } from '../../lib/metadataUpdater';
import { parseGiftEventWithRetry } from '../../lib/eventParser';
import { validateMappingWithRetry } from '../../lib/mappingValidator';
import { Redis } from '@upstash/redis';
import { ESCROW_CONTRACT_ADDRESS } from '../../lib/escrowABI';
import { 
  validateTokenId,
  extractTokenIdFromTransferEvent,
  diagnoseTokenIdZeroIssue,
  TokenIdZeroError
} from '../../lib/tokenIdValidator';
import { executeMintTransaction } from '../../lib/gasPaidTransactions';
import { getPublicBaseUrl } from '../../lib/publicBaseUrl';

/**
 * MULTI-GATEWAY IPFS VALIDATION - SURGICAL FIX
 * Implements exact recommendations from external audit
 * Preserves path, tests multiple gateways, proper method sequence
 */
async function validateIPFSWithMultipleGateways(imageUrl: string): Promise<{
  success: boolean;
  error?: string;
  workingUrl?: string;
  gateway?: string;
  method?: string;
  attempts?: Array<{url: string, method: string, status: number, timing: number}>;
}> {
  const attempts: Array<{url: string, method: string, status: number, timing: number}> = [];
  
  // Step 1: Construct gateway candidates with preserved path  
  // Note: This function is used for both images and metadata validation
  const gatewayUrls = constructGatewayUrls(imageUrl);
  
  console.log('🔍 IPFS VALIDATION: Testing multiple gateways:', {
    originalUrl: imageUrl,
    totalCandidates: gatewayUrls.length,
    gateways: gatewayUrls.map(g => g.gateway)
  });
  
  // Step 2: Smart parallel testing - ThirdWeb first, others in parallel
  const [primaryGateway, ...otherGateways] = gatewayUrls;
  
  // First, test ThirdWeb gateway (most likely to work for recent uploads)
  if (primaryGateway.gateway.includes('thirdweb')) {
    console.log('🎯 Testing primary gateway (ThirdWeb) first...');
    const primaryResult = await testGatewayAccess(primaryGateway.url, primaryGateway.gateway);
    attempts.push(...primaryResult.attempts);
    
    if (primaryResult.success) {
      console.log('✅ Primary gateway succeeded - skipping others');
      return {
        success: true,
        workingUrl: primaryGateway.url,
        gateway: primaryGateway.gateway,
        method: primaryResult.method,
        attempts
      };
    }
    console.log('⚠️ Primary gateway failed - testing others in parallel...');
  }
  
  // If primary failed, test remaining gateways in parallel
  const gatewaysToTest = primaryGateway.gateway.includes('thirdweb') ? otherGateways : gatewayUrls;
  const parallelPromises = gatewaysToTest.map(candidate => 
    testGatewayAccess(candidate.url, candidate.gateway)
      .then(result => ({ ...result, candidate }))
      .catch(error => ({ 
        success: false, 
        attempts: [], 
        candidate, 
        error: error.message 
      }))
  );
  
  // 🔥 FASE 7B FIX: REAL EARLY EXIT with Promise.any + AbortController
  console.log('🏁 Starting TRUE early-exit with Promise.any...');
  
  // Create AbortController to cancel remaining requests when first succeeds
  const abortController = new AbortController();
  
  try {
    // Create promises with abort signal for cancellation
    const racePromises = parallelPromises.map(async (promise, index) => {
      try {
        const result = await promise;
        attempts.push(...result.attempts);
        
        if (result.success) {
          console.log(`🚀 FIRST SUCCESS (gateway ${index}): ${result.candidate.gateway}`);
          // Cancel remaining requests
          abortController.abort();
          return { ...result, candidate: result.candidate, earlyExit: true };
        }
        // If failed, throw to let Promise.any continue
        throw new Error(`Gateway ${index} failed: ${(result as any).error || 'unknown'}`);
      } catch (error) {
        throw new Error(`Gateway ${index} error: ${error.message}`);
      }
    });
    
    // 🎯 Promise.any returns as soon as FIRST promise resolves successfully
    const firstSuccess = await Promise.any(racePromises);
    
    console.log(`✅ PROMISE.ANY SUCCESS: ${firstSuccess.candidate.gateway}`);
    return {
      success: true,
      workingUrl: firstSuccess.candidate.url || firstSuccess.candidate.gateway,
      gateway: firstSuccess.candidate.gateway,
      method: 'method' in firstSuccess ? firstSuccess.method : undefined,
      attempts
    };
    
  } catch (aggregateError) {
    // Promise.any throws AggregateError if ALL promises fail
    console.log('⚠️ All racing promises failed, checking for any successful results...');
    
    // Fallback: check if any parallel promises actually succeeded (race condition edge case)
    const allResults = await Promise.allSettled(parallelPromises);
    for (const result of allResults) {
      if (result.status === 'fulfilled' && result.value.success) {
        console.log(`✅ FALLBACK SUCCESS: ${result.value.candidate.gateway}`);
        attempts.push(...result.value.attempts);
        return {
          success: true,
          workingUrl: result.value.candidate.url,
          gateway: result.value.candidate.gateway,
          method: 'method' in result.value ? result.value.method : undefined,
          attempts
        };
      }
    }
  } finally {
    // Cleanup: Ensure abort controller is triggered
    abortController.abort();
  }
  
  return {
    success: false,
    error: 'All gateways failed validation',
    attempts
  };
}

/**
 * CONSTRUCT GATEWAY URLS - PRESERVE FULL PATH
 * Fixes path loss issue identified in audit
 */
function constructGatewayUrls(imageUrl: string, isMetadata: boolean = false): Array<{url: string, gateway: string}> {
  // 🔥 CRITICAL FIX: Reordered gateways to eliminate ThirdWeb bias per audit
  // Priority based on reliability and performance, not upload source
  const gateways = [
    'https://cloudflare-ipfs.com/ipfs',    // Most reliable first
    'https://ipfs.io/ipfs',                // Standard IPFS gateway
    'https://gateway.pinata.cloud/ipfs',   // Professional gateway
    'https://nftstorage.link/ipfs',        // NFT Storage gateway
    'https://gateway.thirdweb.com/ipfs'    // ThirdWeb last to prevent bias
  ];
  
  if (imageUrl.startsWith('ipfs://')) {
    // CRITICAL FIX: Preserve full path after CID
    const ipfsPath = imageUrl.replace('ipfs://', '');
    const [cid, ...pathParts] = ipfsPath.split('/');
    let fullPath = pathParts.length > 0 ? `/${pathParts.join('/')}` : '';
    
    // 🚨 CRITICAL FIX: Add /metadata.json for metadata files when missing
    if (isMetadata && fullPath === '' && !ipfsPath.includes('/')) {
      fullPath = '/metadata.json';
      console.log('🔧 METADATA FIX: Added /metadata.json to bare CID:', {
        original: imageUrl,
        cid,
        newPath: fullPath
      });
    }
    
    // Encode path segments safely (preserve existing logic)
    const encodedPath = encodeAllPathSegmentsSafe(fullPath);
    
    console.log('🔧 IPFS Path Construction:', {
      original: imageUrl,
      cid,
      pathParts,
      fullPath,
      encodedPath
    });
    
    return gateways.map(gateway => ({
      url: `${gateway}/${cid}${encodedPath}`,
      gateway: gateway.split('/')[2] // Extract domain name
    }));
  } else {
    // CRITICAL FIX: HTTPS URL with IPFS path - extract CID and try all gateways
    // This fixes the upload-validation disconnect for ThirdWeb URLs
    const ipfsMatch = imageUrl.match(/\/ipfs\/([^\/]+)(\/.*)?$/);
    if (ipfsMatch) {
      const [, cid, pathAfterCid = ''] = ipfsMatch;
      console.log('🔧 Converting HTTPS IPFS URL to multiple gateways:', {
        original: imageUrl,
        extractedCid: cid,
        pathAfterCid,
        isMetadata
      });
      
      // 🚨 AUDIT FIX: Add /metadata.json for metadata URLs when missing + encode path
      let finalPath = pathAfterCid;
      if (isMetadata && finalPath === '' && !cid.includes('/')) {
        finalPath = '/metadata.json';
        console.log('🔧 METADATA FIX: Added /metadata.json to HTTPS URL:', {
          original: imageUrl,
          cid,
          newPath: finalPath
        });
      }
      
      // 🚨 AUDIT FIX: Encode path segments to handle spaces and special characters
      const encodedPath = encodeAllPathSegmentsSafe(finalPath);
      
      // Try all gateways with the extracted CID and encoded path
      return gateways.map(gateway => ({
        url: `${gateway}/${cid}${encodedPath}`,
        gateway: gateway.split('/')[2] // Extract domain name  
      }));
    } else {
      // Non-IPFS HTTPS URL, test as-is
      const domain = new URL(imageUrl).hostname;
      return [{
        url: imageUrl,
        gateway: domain
      }];
    }
  }
}

/**
 * TEST GATEWAY ACCESS - PROPER METHOD SEQUENCE
 * Implements exact audit recommendations for HEAD/GET sequence
 */
async function testGatewayAccess(url: string, gateway: string): Promise<{
  success: boolean;
  method?: string;
  attempts: Array<{url: string, method: string, status: number, timing: number}>;
}> {
  const attempts: Array<{url: string, method: string, status: number, timing: number}> = [];
  
  try {
    // 🔥 FASE 7B MEJORA: ThirdWeb gateway optimization - skip HEAD, go direct to GET+Range  
    if (gateway.includes('thirdweb') || url.includes('gateway.thirdweb.com')) {
      console.log('🎯 ThirdWeb gateway detected - skipping HEAD, using GET+Range directly');
    } else {
      // Method 1: HEAD without Range (per audit) - Independent timeout
      console.log(`🔍 Testing HEAD: ${url}`);
      const headStart = Date.now();
      
      const headController = new AbortController();
      const headTimeout = setTimeout(() => headController.abort(), 3000); // FAST PROBING: 3s timeout for quick gateway testing
      
      try {
        
        const headResponse = await fetch(url, {
          method: 'HEAD',
          signal: headController.signal
        });
        
        const headTiming = Date.now() - headStart;
        attempts.push({url, method: 'HEAD', status: headResponse.status, timing: headTiming});
        
        clearTimeout(headTimeout);
        
        if (headResponse.ok) {
          console.log(`✅ HEAD success: ${gateway} (${headTiming}ms)`);
          return { success: true, method: 'HEAD', attempts };
        } else if (headResponse.status === 405 || headResponse.status === 400) {
          console.log(`⚠️ HEAD not supported (${headResponse.status}), trying GET with Range...`);
        }
      } catch (headError) {
        clearTimeout(headTimeout);
        attempts.push({url, method: 'HEAD', status: 0, timing: Date.now() - headStart});
        console.log(`❌ HEAD failed: ${headError.message}`);
      }
    }
    
    // Method 2: GET with Range bytes=0-0 (per audit) - Independent timeout
    console.log(`🔍 Testing GET+Range: ${url}`);
    const getRangeStart = Date.now();
    
    const getRangeController = new AbortController();
    const getRangeTimeout = setTimeout(() => getRangeController.abort(), 3000); // FAST PROBING: 3s timeout for quick gateway testing
    
    try {
      
      const getRangeResponse = await fetch(url, {
        method: 'GET',
        headers: { 'Range': 'bytes=0-0' },
        signal: getRangeController.signal
      });
      
      const getRangeTiming = Date.now() - getRangeStart;
      attempts.push({url, method: 'GET+Range', status: getRangeResponse.status, timing: getRangeTiming});
      
      clearTimeout(getRangeTimeout);
      
      if (getRangeResponse.ok || getRangeResponse.status === 206) {
        console.log(`✅ GET+Range success: ${gateway} (${getRangeTiming}ms)`);
        return { success: true, method: 'GET+Range', attempts };
      }
    } catch (getRangeError) {
      clearTimeout(getRangeTimeout);
      attempts.push({url, method: 'GET+Range', status: 0, timing: Date.now() - getRangeStart});
      console.log(`❌ GET+Range failed: ${getRangeError.message}`);
    }
    
    // Method 3: GET without Range (per audit) - Independent timeout
    console.log(`🔍 Testing GET (no Range): ${url}`);
    const getStart = Date.now();
    
    const getController = new AbortController();
    const getTimeout = setTimeout(() => getController.abort(), 3000); // FAST PROBING: 3s timeout for quick gateway testing
    
    try {
      
      const getResponse = await fetch(url, {
        method: 'GET',
        signal: getController.signal
      });
      
      const getTiming = Date.now() - getStart;
      attempts.push({url, method: 'GET', status: getResponse.status, timing: getTiming});
      
      clearTimeout(getTimeout);
      
      if (getResponse.ok) {
        console.log(`✅ GET success: ${gateway} (${getTiming}ms)`);
        return { success: true, method: 'GET', attempts };
      }
    } catch (getError) {
      clearTimeout(getTimeout);
      attempts.push({url, method: 'GET', status: 0, timing: Date.now() - getStart});
      console.log(`❌ GET failed: ${getError.message}`);
    }
    
  } catch (error) {
    console.log(`❌ Gateway test failed: ${error.message}`);
  }
  
  console.log(`❌ All methods failed for gateway: ${gateway}`);
  return { success: false, attempts };
}

/**
 * ENCODE PATH SEGMENTS SAFELY 
 * Reuse existing logic with orphaned % handling
 */
function encodeAllPathSegmentsSafe(path: string): string {
  if (!path || path === '/') return '';
  
  try {
    const segments = path.split('/').filter(segment => segment.length > 0);
    const encodedSegments = segments.map(segment => {
      try {
        const decoded = decodeURIComponent(segment);
        return encodeURIComponent(decoded);
      } catch {
        return segment.replace(/%(?![0-9A-Fa-f]{2})/g, '%25');
      }
    });
    return '/' + encodedSegments.join('/');
  } catch (error) {
    return path;
  }
}

/**
 * METADATA-SPECIFIC IPFS VALIDATION
 * 🚨 CRITICAL FIX: Handles /metadata.json filename for ThirdWeb uploads
 */
async function validateIPFSMetadata(metadataUrl: string): Promise<{
  success: boolean;
  error?: string;
  workingUrl?: string;
  gateway?: string;
  method?: string;
  attempts?: Array<{url: string, method: string, status: number, timing: number}>;
}> {
  console.log('🔍 METADATA VALIDATION: Testing with /metadata.json handling');
  console.log('📋 Original URL:', metadataUrl);
  
  // Use metadata-specific gateway construction
  const gatewayUrls = constructGatewayUrls(metadataUrl, true); // isMetadata = true
  
  console.log('🌐 Generated metadata gateway URLs:', {
    originalUrl: metadataUrl,
    totalCandidates: gatewayUrls.length,
    gateways: gatewayUrls.map(g => ({ gateway: g.gateway, url: g.url }))
  });
  
  // Use existing gateway testing logic but with metadata-specific URLs
  const attempts: Array<{url: string, method: string, status: number, timing: number}> = [];
  
  // Test ThirdWeb gateway first (most likely to work for recent uploads)
  const [primaryGateway, ...otherGateways] = gatewayUrls;
  
  if (primaryGateway.gateway.includes('thirdweb')) {
    console.log('🎯 Testing primary metadata gateway (ThirdWeb) first...');
    const primaryResult = await testGatewayAccess(primaryGateway.url, primaryGateway.gateway);
    attempts.push(...primaryResult.attempts);
    
    if (primaryResult.success) {
      console.log('✅ Primary metadata gateway succeeded - skipping others');
      return {
        success: true,
        workingUrl: primaryGateway.url,
        gateway: primaryGateway.gateway,
        method: primaryResult.method,
        attempts
      };
    }
    console.log('⚠️ Primary metadata gateway failed - testing others in parallel...');
  }
  
  // Test remaining gateways in parallel
  const gatewaysToTest = primaryGateway.gateway.includes('thirdweb') ? otherGateways : gatewayUrls;
  const parallelPromises = gatewaysToTest.map(candidate => 
    testGatewayAccess(candidate.url, candidate.gateway)
      .then(result => ({ ...result, candidate }))
      .catch(error => ({ 
        success: false, 
        attempts: [], 
        candidate, 
        error: error.message 
      }))
  );
  
  // 🔥 FASE 7B FIX: REAL EARLY EXIT for metadata validation with Promise.any
  console.log('🏁 Starting TRUE early-exit metadata validation...');
  
  const metadataAbortController = new AbortController();
  
  try {
    // Transform promises to throw on failure (required for Promise.any)
    const racePromises = parallelPromises.map(async (promise, index) => {
      try {
        const result = await promise;
        attempts.push(...result.attempts);
        
        if (result.success) {
          console.log(`🚀 FIRST METADATA SUCCESS (gateway ${index}): ${result.candidate.gateway}`);
          // Cancel remaining requests
          metadataAbortController.abort();
          return result;
        }
        // If failed, throw to let Promise.any continue
        throw new Error(`Metadata gateway ${index} failed: ${(result as any).error || 'unknown'}`);
      } catch (error) {
        throw new Error(`Metadata gateway ${index} error: ${error.message}`);
      }
    });
    
    // 🎯 Promise.any returns as soon as FIRST metadata gateway succeeds
    const firstSuccess = await Promise.any(racePromises);
    
    console.log(`✅ PROMISE.ANY METADATA SUCCESS: ${firstSuccess.candidate.gateway}`);
    return {
      success: true,
      workingUrl: firstSuccess.candidate.url,
      gateway: firstSuccess.candidate.gateway,
      method: 'method' in firstSuccess ? firstSuccess.method : undefined,
      attempts
    };
    
  } catch (aggregateError) {
    // Promise.any throws AggregateError if ALL promises fail
    console.log('⚠️ All metadata gateways failed via Promise.any, checking fallback...');
    
    // Fallback: check if any succeeded (race condition edge case)
    const allResults = await Promise.allSettled(parallelPromises);
    for (const result of allResults) {
      if (result.status === 'fulfilled') {
        attempts.push(...result.value.attempts);
        if (result.value.success) {
          console.log(`✅ FALLBACK METADATA SUCCESS: ${result.value.candidate.gateway}`);
          return {
            success: true,
            workingUrl: result.value.candidate.url,
            gateway: result.value.candidate.gateway,
            method: 'method' in result.value ? result.value.method : undefined,
            attempts
          };
        }
      }
    }
  } finally {
    // Cleanup: Ensure abort controller is triggered
    metadataAbortController.abort();
  }
  
  // All gateways failed
  const errorDetails = gatewaysToTest.map(candidate => 
    `${candidate.gateway}: failed`
  ).join(', ');
  
  console.log('❌ All metadata gateways failed:', errorDetails);
  
  return {
    success: false,
    error: `All gateways failed validation: ${errorDetails}`,
    attempts
  };
}

/**
 * ENHANCED VALIDATION: Validates both metadata JSON and image field within it
 * This addresses audit finding #4: superficial validation
 */
async function validateIPFSMetadataAndImage(metadataUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔍 METADATA + IMAGE VALIDATION: Starting comprehensive validation');
    console.log('📋 MetadataURL:', metadataUrl);
    
    // Step 1: Validate metadata JSON accessibility with ENHANCED IPFS propagation retry
    let metadataValidation;
    let attempts = 0;
    const maxAttempts = 6; // INCREASED: More attempts for better propagation handling
    
    while (attempts < maxAttempts) {
      // 🚨 CRITICAL FIX: Use metadata-specific validation with /metadata.json handling
      metadataValidation = await validateIPFSMetadata(metadataUrl);
      
      if (metadataValidation.success) {
        console.log(`✅ Metadata validation succeeded on attempt ${attempts + 1}`);
        break;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        // ENHANCED: Exponential backoff for better IPFS propagation
        const delaySeconds = Math.min(4 + (attempts * 2), 12); // 4s, 6s, 8s, 10s, 12s
        console.log(`⏳ Metadata validation failed (attempt ${attempts}), retrying in ${delaySeconds}s for IPFS propagation...`);
        console.log(`🌐 IPFS Propagation: Allowing more time for metadata to propagate across gateways`);
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
      }
    }
    
    if (!metadataValidation.success) {
      return {
        success: false,
        error: `Metadata JSON not accessible after ${maxAttempts} attempts: ${metadataValidation.error}`
      };
    }
    
    console.log('✅ Metadata JSON accessible, now fetching content to validate image field');
    
    // Step 2: Download and parse metadata JSON
    let metadataJson;
    try {
      const response = await fetch(metadataValidation.workingUrl!, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000)  // FAST PROBING: 3s timeout for quick validation
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      metadataJson = await response.json();
      console.log('📋 Metadata JSON parsed successfully:', { 
        hasImage: !!metadataJson.image,
        hasName: !!metadataJson.name,
        imageField: metadataJson.image?.substring(0, 50) + '...'
      });
    } catch (fetchError) {
      return {
        success: false,
        error: `Failed to fetch/parse metadata JSON: ${fetchError.message}`
      };
    }
    
    // Step 3: Validate image field exists and is valid
    if (!metadataJson.image) {
      return {
        success: false,
        error: 'Metadata JSON missing required "image" field'
      };
    }
    
    // Step 4: Validate image accessibility via IPFS gateways
    console.log('🔍 CHECKING IMAGE URL from metadata:', metadataJson.image);
    
    // 🚨 CRITICAL FIX: Clean image URL if it has double ipfs:// prefix
    let cleanImageUrl = metadataJson.image;
    if (cleanImageUrl.startsWith('ipfs://ipfs://')) {
      cleanImageUrl = cleanImageUrl.replace('ipfs://ipfs://', 'ipfs://');
      console.log('🔧 FIXED double ipfs:// prefix in image URL:', {
        original: metadataJson.image,
        cleaned: cleanImageUrl
      });
    }
    
    const imageValidation = await validateIPFSWithMultipleGateways(cleanImageUrl);
    if (!imageValidation.success) {
      return {
        success: false,
        error: `Image from metadata not accessible: ${imageValidation.error}`
      };
    }
    
    console.log('✅ COMPREHENSIVE VALIDATION SUCCESS: Both metadata and image are accessible');
    return { success: true };
    
  } catch (error) {
    console.error('❌ METADATA+IMAGE VALIDATION SYSTEM ERROR:', error);
    return {
      success: false,
      error: `Comprehensive validation error: ${error.message}`
    };
  }
}

/**
 * ORIGINAL FUNCTION - NOW CALLS NEW IMPLEMENTATION
 * Maintains backward compatibility
 */
async function validateIPFSImageAccess(imageUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔍 IPFS VALIDATION: Checking image accessibility:', imageUrl);
    console.log('🔍 DETAILED URL ANALYSIS:', {
      original: imageUrl,
      startsWithIpfs: imageUrl.startsWith('ipfs://'),
      includesThirdweb: imageUrl.includes('thirdweb'),
      urlLength: imageUrl.length,
      protocol: imageUrl.split('://')[0]
    });
    
    // Check IPFS configuration
    const ipfsConfig = validateIPFSConfig();
    console.log('📋 IPFS Config:', ipfsConfig);
    
    if (!ipfsConfig.nftStorage && !ipfsConfig.thirdweb) {
      return {
        success: false,
        error: 'No IPFS providers configured. Cannot validate image accessibility.'
      };
    }
    
    // FIX: Gateway validation with proper path preservation and method selection
    const validationResult = await validateIPFSWithMultipleGateways(imageUrl);
    
    if (validationResult.success) {
      console.log('✅ IPFS validation successful:', {
        originalUrl: imageUrl,
        workingUrl: validationResult.workingUrl,
        gateway: validationResult.gateway,
        method: validationResult.method,
        attempts: validationResult.attempts
      });
      return { success: true };
    } else {
      console.log('❌ IPFS validation failed after all attempts:', validationResult);
      return {
        success: false,
        error: `Image not accessible via any gateway: ${validationResult.error}`
      };
    }
  } catch (error) {
    console.error('❌ IPFS VALIDATION SYSTEM ERROR:', error);
    return {
      success: false,
      error: `Validation system error: ${error.message}`
    };
  }
}

// Helper function: Store metadata with robust retry logic
async function storeMetadataWithRetry(metadata: any, maxRetries: number = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📦 Metadata storage attempt ${attempt}/${maxRetries}`);
      
      await storeNFTMetadata(metadata);
      
      // CRITICAL: Verify storage immediately
      console.log(`🔍 Verifying metadata storage for ${metadata.contractAddress}:${metadata.tokenId}`);
      const verification = await getNFTMetadata(metadata.contractAddress, metadata.tokenId);
      
      if (verification) {
        console.log(`✅ Metadata stored and verified successfully on attempt ${attempt}`);
        return;
      } else {
        throw new Error('Verification failed - metadata not found after storage');
      }
      
    } catch (error: any) {
      console.warn(`⚠️ Metadata storage attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = 2000 * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Failed to store and verify metadata after ${maxRetries} attempts`);
}

// Types
interface MintEscrowRequest {
  metadataUri: string;
  recipientAddress?: string; // If not provided, uses neutral custody
  password: string;
  timeframeDays: keyof typeof TIMEFRAME_OPTIONS;
  giftMessage: string;
  creatorAddress: string; // For tracking and returns
  gasless?: boolean;
  educationModules?: number[]; // Optional education requirements
}

interface MintEscrowResponse {
  success: boolean;
  tokenId?: string;
  transactionHash?: string;
  escrowTransactionHash?: string;
  giftLink?: string;
  salt?: string;
  passwordHash?: string;
  expirationTime?: number;
  nonce?: string;
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
  error?: string;
  gasless?: boolean;
}

// Initialize ThirdWeb client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!
});

// Initialize Redis client for salt persistence
let redis: any = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      enableAutoPipelining: false,
      retry: false,
    });
    console.log('✅ Redis initialized for salt persistence');
  } else {
    console.warn('⚠️ Redis not configured for salt persistence');
  }
} catch (error) {
  console.error('❌ Redis initialization failed:', error);
}

// Store salt for later retrieval during claim
async function storeSalt(tokenId: string, salt: string): Promise<void> {
  if (!redis) {
    console.warn('⚠️ Cannot store salt: Redis not available');
    return;
  }
  
  try {
    // Store salt with expiration (90 days max)
    const key = `escrow:salt:${tokenId}`;
    await redis.setex(key, 90 * 24 * 60 * 60, salt); // 90 days TTL
    console.log('💾 Salt stored for token:', tokenId);
  } catch (error) {
    console.error('❌ Failed to store salt:', error);
  }
}

// Retrieve salt for claim process
async function getSalt(tokenId: string): Promise<string | null> {
  if (!redis) {
    console.warn('⚠️ Cannot retrieve salt: Redis not available');
    return null;
  }
  
  try {
    const key = `escrow:salt:${tokenId}`;
    const salt = await redis.get(key);
    console.log('🔍 Salt retrieved for token:', tokenId, salt ? 'Found' : 'Not found');
    return salt;
  } catch (error) {
    console.error('❌ Failed to retrieve salt:', error);
    return null;
  }
}

// JWT Authentication middleware
function authenticate(req: NextApiRequest): { success: boolean; address?: string; error?: string } {
  try {
    // Extract JWT token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeaders(authHeader);
    
    if (!token) {
      console.warn('⚠️ No JWT token provided in Authorization header');
      return { 
        success: false, 
        error: 'Authentication required. Please provide a valid JWT token.' 
      };
    }
    
    // Verify JWT token
    const payload = verifyJWT(token);
    if (!payload) {
      console.warn('⚠️ Invalid or expired JWT token');
      return { 
        success: false, 
        error: 'Invalid or expired authentication token. Please sign in again.' 
      };
    }
    
    console.log('✅ JWT authentication successful:', {
      address: payload.address.slice(0, 10) + '...',
      exp: new Date(payload.exp * 1000).toISOString()
    });
    
    return { 
      success: true, 
      address: payload.address 
    };
    
  } catch (error: any) {
    console.error('❌ JWT authentication error:', error);
    return { 
      success: false, 
      error: 'Authentication verification failed' 
    };
  }
}

// Enhanced gasless minting with anti-double minting
async function mintNFTEscrowGasless(
  to: string,
  tokenURI: string,
  password: string,
  timeframeDays: number,
  giftMessage: string,
  creatorAddress: string,
  publicBaseUrl: string,
  educationModules?: number[]
): Promise<{
  success: boolean;
  tokenId?: string;
  giftId?: number; // CRITICAL: Add giftId to return type
  transactionHash?: string;
  escrowTransactionHash?: string;
  salt?: string;
  passwordHash?: string;
  nonce?: string;
  error?: string;
  details?: string;
}> {
  let transactionNonce = '';
  let passwordHash: string | undefined;
  let actualGiftId: number; // Declare giftId variable in scope
  
  try {
    console.log('🚀 MINT ESCROW GASLESS: Starting atomic operation with anti-double minting');
    
    // Step 1: Rate limiting check
    const rateLimit = checkRateLimit(creatorAddress);
    if (!rateLimit.allowed) {
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.`);
    }
    
    console.log('✅ Rate limit check passed. Remaining: ', rateLimit.remaining);
    
    // Step 2: Anti-double minting validation
    const escrowConfig = { password, timeframe: timeframeDays, giftMessage };
    const validation = await validateTransactionAttempt(creatorAddress, tokenURI, 0, escrowConfig);
    
    if (!validation.valid) {
      throw new Error(validation.reason || 'Transaction validation failed');
    }
    
    transactionNonce = validation.nonce;
    console.log('✅ Anti-double minting validation passed. Nonce:', transactionNonce.slice(0, 10) + '...');
    
    // Step 2.5: ENHANCED IPFS VALIDATION with PROPAGATION RETRY - METADATA + IMAGE 
    console.log('🔍 ENHANCED VALIDATION: Starting comprehensive metadata + image validation with retry');
    console.log('🚀 Enhancement: Validates JSON metadata + image field + handles IPFS propagation delays'); 
    console.log('🔍 MetadataURI for validation:', tokenURI);
    
    // ENHANCED VALIDATION with IPFS propagation retry: Check metadata JSON + image field
    const ipfsValidation = await validateIPFSMetadataAndImage(tokenURI);
    if (!ipfsValidation.success) {
      console.error('❌ IPFS VALIDATION FAILED:', ipfsValidation.error);
      
      // FAIL-FAST: No bypasses - if image is not accessible, mint should fail
      return {
        success: false,
        error: `IPFS_VALIDATION_FAILED: Image not accessible via any IPFS gateway. ${ipfsValidation.error}. Solution: Ensure image is properly uploaded and propagated to IPFS gateways.`
      };
    } else {
      console.log('✅ IPFS validation passed - image accessible via gateways');
    }
    
    // Step 3: Register transaction attempt
    await registerTransactionAttempt(creatorAddress, transactionNonce, tokenURI, 0, escrowConfig);
    
    // Step 4: Generate salt (password passed directly to contract)
    const salt = generateSalt();
    // NOTE: Contract generates hash internally with all parameters (password, salt, giftId, address, chainId)
    
    // Secure logging - never expose actual crypto values
    console.log('🔐 Cryptographic data generated successfully');
    
    // Step 5: Validate Biconomy configuration for gasless
    if (!validateBiconomyConfig()) {
      throw new Error('Biconomy gasless configuration is incomplete. Check environment variables.');
    }
    
    // Step 6: Create Biconomy smart account for true gasless transactions
    console.log('🔧 Creating Biconomy smart account for gasless minting...');
    const smartAccount = await createBiconomySmartAccount(process.env.PRIVATE_KEY_DEPLOY!);
    
    // Step 7: Get NFT contract
    const nftContract = getContract({
      client,
      chain: baseSepolia,
      address: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!
    });
    
    // Step 8: HOTFIX - Mint to target address (creator for escrow, direct recipient for direct mints)
    console.log(`🎨 Preparing gasless mint NFT to target: ${to}...`);
    console.log(`🔍 Target recipient: ${to}`);
    console.log(`🔍 Backend deployer: ${creatorAddress}`);
    
    // CRITICAL FIX: Use placeholder tokenURI for initial mint, will be updated after extraction  
    const baseUrl = publicBaseUrl;
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_SITE_URL or VERCEL_URL required');
    }
    const placeholderTokenURI = `${baseUrl}/api/nft-metadata/placeholder`;
    console.log(`🔍 Using placeholder tokenURI for gasless mint: ${placeholderTokenURI}`);
    
    const mintTransaction = prepareContractCall({
      contract: nftContract,
      method: "function mintTo(address to, string memory tokenURI) external",
      params: [to, placeholderTokenURI] // Use placeholder, update after tokenId extraction
    });
    
    // Step 9: Execute gasless mint transaction through Biconomy
    console.log('🚀 Executing gasless mint transaction...');
    const mintResult = await sendGaslessTransaction(smartAccount, mintTransaction);
    
    console.log('✅ NFT minted, transaction hash:', mintResult.transactionHash);
    
    // Step 8: Extract token ID from mint transaction
    const mintReceipt = await waitForReceipt({
      client,
      chain: baseSepolia,
      transactionHash: mintResult.transactionHash as `0x${string}`
    });
    
    // CRITICAL: Verify transaction succeeded
    if (mintReceipt.status !== 'success') {
      throw new Error(`Mint transaction failed with status: ${mintReceipt.status}`);
    }
    
    console.log('✅ Mint transaction confirmed successful');
    console.log('🔍 FORCED DEBUG: About to extract token ID - checking deployment');
    console.log('🔍 FORCED DEBUG: Mint result hash:', mintResult.transactionHash);
    let tokenId: string | null = null;
    
    // ROBUST TOKEN ID EXTRACTION - NO SILENT FAILURES
    const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    
    console.log('🔍 Starting robust token ID extraction...');
    
    try {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const receipt = await provider.getTransactionReceipt(mintResult.transactionHash);
      
      if (!receipt) {
        throw new Error(`No transaction receipt found for hash: ${mintResult.transactionHash}`);
      }
      
      console.log(`🔍 Examining ${receipt.logs.length} logs for Transfer event...`);
      
      // Find Transfer event with strict validation
      const transferLog = receipt.logs.find(log => {
        const isCorrectContract = log.address.toLowerCase() === process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!.toLowerCase();
        const isTransferEvent = log.topics[0] === transferEventSignature;
        const hasEnoughTopics = log.topics.length >= 4;
        
        console.log(`🔍 Log check - Contract: ${isCorrectContract}, Event: ${isTransferEvent}, Topics: ${hasEnoughTopics} (${log.topics.length})`);
        
        return isCorrectContract && isTransferEvent && hasEnoughTopics;
      });
      
      if (!transferLog) {
        throw new Error(`No valid Transfer event found in transaction ${mintResult.transactionHash}. Found ${receipt.logs.length} logs but none matched Transfer pattern.`);
      }
      
      // Use enhanced tokenId extraction with comprehensive validation
      const tokenIdValidation = extractTokenIdFromTransferEvent(transferLog);
      
      if (!tokenIdValidation.success) {
        console.error('❌ ENHANCED TOKEN ID EXTRACTION FAILED:', tokenIdValidation.error);
        
        // Run diagnostic to understand the issue
        const diagnostic = await diagnoseTokenIdZeroIssue(
          Array.from(receipt.logs || []),
          process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!
        );
        
        console.error('🔍 DIAGNOSTIC RESULTS:', diagnostic);
        
        throw new TokenIdZeroError(
          `Enhanced tokenId extraction failed: ${tokenIdValidation.error}`,
          tokenIdValidation.source,
          tokenIdValidation.rawValue,
          diagnostic
        );
      }
      
      tokenId = tokenIdValidation.tokenId!;
      console.log('✅ ENHANCED TOKEN ID EXTRACTION SUCCESS:', tokenId);
      
    } catch (error) {
      console.error('❌ Transfer event extraction failed:', error);
      // NO FALLBACK - Fail fast and clear
      throw new Error(`Token ID extraction failed: ${error.message}. This prevents double minting and ensures data integrity.`);
    }
    
    if (!tokenId) {
      throw new Error('Failed to extract token ID from mint transaction');
    }
    
    // Initialize escrow transaction hash variable
    let escrowTransactionHash: string | undefined;
    
    // Check if this is an escrow mint (password provided) or direct mint (no password)
    const isEscrowMint = !!password;
    
    if (isEscrowMint) {
      // V2 ZERO CUSTODY: NFT minted directly to escrow, register gift with registerGiftMinted
      console.log('🔒 ESCROW MINT V2: NFT minted directly to escrow, registering gift with registerGiftMinted...');
      
      console.log('🔍 DEBUG: Using escrow contract address V2:', ESCROW_CONTRACT_ADDRESS ? 'Set' : 'Missing');
      console.log('🔍 DEBUG: Token ID extracted from mint:', tokenId);
      console.log('🔍 DEBUG: Token ID type:', typeof tokenId);
      console.log('🔍 DEBUG: Creator address:', creatorAddress ? 'Set' : 'Missing');
      console.log('✅ V2: Using registerGiftMinted for zero-custody escrow');
      
      // CRITICAL FIX: Verify NFT ownership BEFORE calling registerGiftMinted to prevent race condition
      console.log('🔍 PRE-CHECK: Verifying NFT is owned by escrow before registration...');
      
      const ownershipResult = await verifyNFTOwnership(
        process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
        tokenId,
        ESCROW_CONTRACT_ADDRESS!,
        10, // Increased max attempts from 5 to 10
        2000 // Increased delay from 1000ms to 2000ms for gas-paid transactions
      );
      
      if (!ownershipResult.success) {
        console.error('❌ CRITICAL: NFT ownership verification failed - this will cause registerGiftMinted to fail');
        console.error('❌ ERROR DETAILS:', {
          expectedOwner: ESCROW_CONTRACT_ADDRESS,
          actualOwner: ownershipResult.actualOwner,
          error: ownershipResult.error
        });
        throw new Error(`RACE CONDITION DETECTED: ${ownershipResult.error || 'NFT ownership verification failed'}`);
      }
      
      // CRITICAL: Validate gate configuration BEFORE proceeding
      let gateAddress: string;
      
      if (educationModules && educationModules.length > 0) {
        // TEMPORARY FALLBACK: Use env var or fallback to deployed contract
        const gateEnvVar = process.env.SIMPLE_APPROVAL_GATE_ADDRESS || process.env.NEXT_PUBLIC_SIMPLE_APPROVAL_GATE_ADDRESS;
        
        if (!gateEnvVar || gateEnvVar === '0x0000000000000000000000000000000000000000') {
          console.warn('⚠️ GATE_MISSING: Education modules requested but gate not configured - using fallback');
          throw new Error('GATE_MISSING: Education features temporarily unavailable - SimpleApprovalGate address not configured');
        }
        
        // Validar que es una dirección válida
        if (!ethers.isAddress(gateEnvVar)) {
          throw new Error('GATE_INVALID: Invalid approval gate address configuration');
        }
        
        gateAddress = ethers.getAddress(gateEnvVar); // Normalize with checksum
        console.log(`✅ Gate validated for education requirements: ${gateAddress.slice(0, 10)}...`);
      } else {
        gateAddress = '0x0000000000000000000000000000000000000000'; // No gate for gifts without education
      }
      
      // CRITICAL DEBUG: Log tokenId before registerGiftMinted call
      console.log('🔍 CRITICAL DEBUG - BEFORE registerGiftMinted:', {
        tokenId: tokenId,
        tokenIdType: typeof tokenId,
        tokenIdBigInt: BigInt(tokenId).toString(),
        contract: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!.slice(0,10) + '...',
        creator: creatorAddress.slice(0,10) + '...',
        timeframeDays,
        giftMessageLength: giftMessage.length,
        gateAddress: gateAddress === '0x0000000000000000000000000000000000000000' ? 'NO_GATE' : gateAddress.slice(0, 10) + '...',
        hasEducation: educationModules && educationModules.length > 0
      });
      
      const registerGiftTransaction = prepareRegisterGiftMintedCall(
        tokenId,
        process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
        creatorAddress, // ← NEW: Pass original creator address
        password,
        salt,
        timeframeDays,
        giftMessage,
        gateAddress // ← NEW: Pass gate address based on education requirements
      );
      
      console.log('🚀 Executing gasless gift registration...');
      const escrowResult = await sendGaslessTransaction(smartAccount, registerGiftTransaction);
      
      const escrowReceipt = await waitForReceipt({
        client,
        chain: baseSepolia,
        transactionHash: escrowResult.transactionHash as `0x${string}`
      });
      
      // CRITICAL: Verify gift registration succeeded
      if (escrowReceipt.status !== 'success') {
        throw new Error(`Gift registration failed with status: ${escrowReceipt.status}`);
      }
      
      console.log('✅ Gift registered successfully in escrow V2 contract');
      
      // RACE CONDITION FIX: IMMEDIATE WAIT-AND-VERIFY PATTERN
      console.log('🔍 CRITICAL: Wait-and-verify gift registration immediately...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s for blockchain state update
      
      // RACE CONDITION FIX: Verify that registerGiftMinted actually created the gift
      console.log('🔍 RACE CONDITION VERIFICATION: Confirming gift was registered correctly...');
      try {
        const escrowContract = getEscrowContract();
        const giftCounter = await readContract({
          contract: escrowContract,
          method: "giftCounter",
          params: []
        });
        console.log(`✅ VERIFICATION: Current gift counter: ${giftCounter}`);
        
        if (Number(giftCounter) > 0) {
          const latestGift = await readContract({
            contract: escrowContract,
            method: "getGift",
            params: [BigInt(giftCounter)]
          });
          
          // Desestructurar tupla ThirdWeb v5 - fixed type assertion
          const [creator, , , giftTokenId, , giftStatus] = latestGift as readonly [string, bigint, string, bigint, `0x${string}`, number];
          
          console.log('✅ VERIFICATION: Latest gift registered:', {
            creator,
            tokenId: giftTokenId.toString(),
            status: giftStatus
          });
          
          // CRITICAL VALIDATION: Ensure tokenId matches what we sent
          const expectedTokenIdNum = Number(tokenId);
          const storedTokenIdNum = Number(giftTokenId);
          if (storedTokenIdNum !== expectedTokenIdNum) {
            console.error('🚨 CRITICAL VALIDATION FAILED:', {
              sentTokenId: expectedTokenIdNum,
              storedTokenId: storedTokenIdNum,
              giftId: Number(giftCounter),
              creator: latestGift[0].slice(0,10) + '...'
            });
            throw new Error(`VALIDATION FAILED: registerGiftMinted stored tokenId ${storedTokenIdNum} but we sent ${expectedTokenIdNum}. This is a critical contract state corruption.`);
          }
          
          console.log('✅ CRITICAL VALIDATION SUCCESS: tokenId stored correctly in contract');
        }
      } catch (verificationError) {
        console.warn('⚠️ VERIFICATION FAILED (but gift registration succeeded):', verificationError);
      }
      
      // DETERMINISTIC SOLUTION: Parse giftId from transaction receipt events
      console.log('🔍 PARSING: Extracting giftId from transaction receipt...');
      
      // Handle gasless vs gas-paid receipt formats
      const receiptForParsing = escrowResult.receipt || escrowReceipt;
      console.log('🔧 RECEIPT TYPE:', {
        hasNormalizedReceipt: !!escrowResult.receipt,
        userOpHash: escrowResult.userOpHash?.slice(0, 20) + '...' || 'N/A',
        realTxHash: receiptForParsing.transactionHash?.slice(0, 20) + '...',
        logsCount: receiptForParsing.logs?.length || 0
      });
      
      const eventResult = await parseGiftEventWithRetry(
        receiptForParsing,
        tokenId,
        process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!
      );
      
      if (!eventResult.success) {
        console.error('❌ EVENT PARSE FAILED:', eventResult.success === false ? eventResult.error : 'Unknown error');
        throw new Error(`Failed to extract giftId from transaction: ${eventResult.success === false ? eventResult.error : 'Unknown error'}`);
      }
      
      actualGiftId = eventResult.giftId;
      console.log(`✅ DETERMINISTIC: tokenId ${tokenId} → giftId ${actualGiftId} (from event)`);
      
      // Generate password hash now that we have the giftId
      passwordHash = generatePasswordHash(
        password,
        salt,
        actualGiftId,
        ESCROW_CONTRACT_ADDRESS!,
        84532 // Base Sepolia chain ID
      );
      
      // Store the mapping deterministically with education metadata
      try {
        await storeGiftMapping(
          tokenId, 
          actualGiftId, 
          process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
          parseInt(process.env.NEXT_PUBLIC_CHAIN_ID!),
          {
            educationModules: educationModules || [],
            creator: creatorAddress,
            createdAt: Date.now(),
            salt: salt
        });
        console.log(`✅ MAPPING STORED: tokenId ${tokenId} → giftId ${actualGiftId} with education modules:`, {
          hasEducation: educationModules && educationModules.length > 0,
          moduleCount: educationModules?.length || 0,
          policyHash: educationModules?.length ? ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify([...educationModules].sort((a, b) => a - b)))).slice(0, 10) + '...' : 'none'
        });
        
        // CRITICAL: Store the original mint salt for claim validation
        try {
          await storeGiftSalt(actualGiftId, salt);
          console.log(`✅ SALT STORED: giftId ${actualGiftId} → ${salt.slice(0, 10)}... (FIXES CLAIM VALIDATION)`);
        } catch (saltError) {
          console.error(`❌ CRITICAL: Salt storage failed for giftId ${actualGiftId}:`, saltError);
          // Don't fail the whole mint, but log this as critical
          debugLogger.operation('Salt storage failed during gasless mint', {
            tokenId,
            giftId: actualGiftId,
            error: saltError instanceof Error ? saltError.message : 'Unknown error'
          });
        }
        
        // VALIDATION: Verify the mapping is correct (increased retries for race condition)
        const validation = await validateMappingWithRetry(
          tokenId,
          actualGiftId,
          creatorAddress,
          process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
          6 // Increased from 3 to 6 retries for race condition recovery
        );
        
        if (!validation.valid) {
          console.error('❌ MAPPING VALIDATION FAILED:', validation.error);
          console.error('⚠️ CONTINUING MINT: Mapping stored but validation failed - education detection may be impacted');
          // DON'T THROW: Let mint complete even if validation fails
          debugLogger.operation('Mapping validation failed but continuing mint', {
            tokenId,
            giftId: actualGiftId,
            validationError: validation.error,
            educationModules: educationModules || []
          });
        } else {
          console.log('✅ MAPPING VALIDATED: Contract data confirms correct mapping');
        }
        
      } catch (mappingError) {
        console.error('❌ Failed to store/validate gift mapping:', mappingError);
        // CRITICAL: Don't fail the entire mint, but log this as a severe issue
        debugLogger.operation('CRITICAL: Gift mapping storage/validation failed', {
          tokenId,
          giftId: actualGiftId,
          error: (mappingError as Error).message,
          stack: (mappingError as Error).stack,
          educationModules: educationModules || [],
          severity: 'CRITICAL'
        });
        
        // Store error in response for monitoring but continue with mint
        console.error('🚨 MAPPING FAILURE - Education detection will not work for this gift!');
        // Don't throw - let the mint complete but track the issue
      }
      
      // Step 11: Verify NFT is in escrow contract (should already be there from direct mint)
      console.log('🔍 Verifying NFT is in escrow contract (V2 direct mint)...');
      const providerPostGasless = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const nftContractABIPostGasless = ["function ownerOf(uint256 tokenId) view returns (address)"];
      const nftContractCheckPostGasless = new ethers.Contract(
        process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
        nftContractABIPostGasless,
        providerPostGasless
      );
      
      const actualOwner = await nftContractCheckPostGasless.ownerOf(tokenId);
      console.log('🔍 Actual NFT owner after escrow creation:', actualOwner);
      console.log('🔍 Expected escrow address:', ESCROW_CONTRACT_ADDRESS ? 'Set' : 'Missing');
      
      if (actualOwner.toLowerCase() !== ESCROW_CONTRACT_ADDRESS?.toLowerCase()) {
        throw new Error(`CRITICAL: NFT was not transferred to escrow contract. Expected: ${ESCROW_CONTRACT_ADDRESS}, Got: ${actualOwner}`);
      }
      
      console.log('✅ VERIFIED: NFT successfully transferred to escrow contract');
      
      // Set escrow transaction hash for response
      escrowTransactionHash = escrowResult.transactionHash;
      
    } else {
      // DIRECT MINT: NFT was minted directly to creator, no escrow needed
      console.log('🎯 DIRECT MINT: NFT minted directly to creator, no escrow transfer needed');
      escrowTransactionHash = undefined; // No escrow transaction for direct mints
    }
    
    // Step 12: Verify mint transaction on-chain
    const mintVerification = await verifyGaslessTransaction(
      mintResult.transactionHash,
      creatorAddress,
      tokenId
    );
    
    if (!mintVerification.verified) {
      throw new Error(`Mint transaction verification failed: ${mintVerification.error}`);
    }
    
    // Step 13: Verify escrow transaction if there was one
    if (escrowTransactionHash) {
      const escrowVerification = await verifyGaslessTransaction(
        escrowTransactionHash,
        creatorAddress,
        tokenId
      );
      
      if (!escrowVerification.verified) {
        console.warn('⚠️ Escrow verification failed but mint succeeded:', escrowVerification.error);
      }
    }
    
    // Step 14: Store salt for later claim process
    await storeSalt(tokenId, salt);
    
    // Step 15: Mark transaction as completed
    await markTransactionCompleted(transactionNonce, escrowTransactionHash || mintResult.transactionHash);
    
    console.log('🎉 Enhanced gasless mint completed with verification');
    console.log('📊 Final result:', {
      tokenId,
      mintTxHash: mintResult.transactionHash,
      escrowTxHash: escrowTransactionHash,
      isEscrow: !!escrowTransactionHash,
      nftOwner: escrowTransactionHash ? 'ESCROW_CONTRACT' : 'CREATOR_WALLET'
    });
    
    return {
      success: true,
      tokenId,
      giftId: actualGiftId, // CRITICAL FIX: Return giftId to enable education requirements storage
      transactionHash: mintResult.transactionHash,
      escrowTransactionHash: escrowTransactionHash,
      salt,
      passwordHash,
      nonce: transactionNonce
    };
    
  } catch (error: any) {
    console.error('❌ Enhanced gasless escrow mint failed:', error);
    console.error('❌ Full error details:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
      step: 'mintNFTEscrowGasless'
    });
    
    // Mark transaction as failed if nonce was generated
    if (transactionNonce) {
      await markTransactionFailed(transactionNonce, error.message);
    }
    
    // CLEANUP: Release any locks on failure
    try {
      const requestIdKey = `request:${transactionNonce}`;
      const requestId = await redis?.get(requestIdKey);
      if (requestId) {
        await redis?.del(`mint_lock:${requestId}`);
        await redis?.del(requestIdKey);
        console.log('🧹 Cleaned up locks for failed gasless transaction');
      }
    } catch (cleanupError) {
      console.warn('⚠️ Failed to cleanup locks:', cleanupError);
    }
    
    return {
      success: false,
      error: `Gasless escrow mint failed: ${error.message || 'Unknown error'}`,
      nonce: transactionNonce,
      details: error.stack?.substring(0, 500) // Truncated stack trace for debugging
    };
  }
}

// Direct mint (skip escrow) - mints directly to creator wallet
async function mintNFTDirectly(
  to: string,
  tokenURI: string,
  giftMessage: string,
  creatorAddress: string,
  publicBaseUrl: string  // REQUIRED: Explicit injection instead of req?
): Promise<{
  success: boolean;
  tokenId?: string;
  transactionHash?: string;
  message?: string;
  error?: string;
}> {
  try {
    console.log('🎯 DIRECT MINT: Starting direct mint to creator wallet (skip escrow)');
    console.log('🎯 Target address:', to ? 'Set' : 'Missing');
    
    // Validate Biconomy configuration for gasless
    if (!validateBiconomyConfig()) {
      throw new Error('Biconomy gasless configuration is incomplete. Check environment variables.');
    }
    
    // Create Biconomy smart account for gasless direct minting
    console.log('🔧 Creating Biconomy smart account for gasless direct minting...');
    const smartAccount = await createBiconomySmartAccount(process.env.PRIVATE_KEY_DEPLOY!);
    
    // Get NFT contract
    const nftContract = getContract({
      client,
      chain: baseSepolia,
      address: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!
    });
    
    // Prepare mint transaction for gasless execution
    console.log(`🎨 Preparing gasless direct mint NFT to creator: ${to}...`);
    
    // CRITICAL FIX: Use IPFS tokenURI directly for proper wallet/BaseScan display
    // SOLVES: Images not appearing in wallets/BaseScan due to HTTP tokenURI instead of IPFS
    console.log(`🔍 Using IPFS tokenURI for direct mint: ${tokenURI}`);
    console.log(`🔍 IPFS tokenURI validation: ${tokenURI.startsWith('ipfs://') ? '✅ IPFS' : '❌ NOT IPFS'}`);
    
    const mintTransaction = prepareContractCall({
      contract: nftContract,
      method: "function mintTo(address to, string memory tokenURI) external",
      params: [to, tokenURI] // Use actual IPFS URI for proper wallet display
    });
    
    // Execute gasless direct mint transaction
    console.log('🚀 Executing gasless direct mint transaction...');
    const mintResult = await sendGaslessTransaction(smartAccount, mintTransaction);
    
    console.log('✅ NFT minted directly, transaction hash:', mintResult.transactionHash);
    
    // Wait for transaction confirmation
    const mintReceipt = await waitForReceipt({
      client,
      chain: baseSepolia,
      transactionHash: mintResult.transactionHash as `0x${string}`
    });
    
    // Verify transaction succeeded
    if (mintReceipt.status !== 'success') {
      throw new Error(`Direct mint transaction failed with status: ${mintReceipt.status}`);
    }
    
    console.log('✅ Direct mint transaction confirmed successful');
    
    // Extract token ID using same logic as escrow mint
    let tokenId: string | null = null;
    const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    
    try {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const receipt = await provider.getTransactionReceipt(mintResult.transactionHash);
      
      if (receipt) {
        for (const log of receipt.logs) {
          if (
            log.address.toLowerCase() === process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!.toLowerCase() &&
            log.topics[0] === transferEventSignature &&
            log.topics.length >= 4
          ) {
            tokenId = BigInt(log.topics[3]).toString();
            console.log('🎯 Token ID extracted from Transfer event (direct):', tokenId);
            break;
          }
        }
      }
    } catch (error) {
      console.error('❌ Transfer event extraction failed for direct mint:', error);
      // NO FALLBACK - Fail fast and clear to prevent double minting
      throw new Error(`Token ID extraction failed: ${error.message}. This prevents double minting and ensures data integrity.`);
    }
    
    if (!tokenId) {
      throw new Error('Failed to extract token ID from direct mint transaction');
    }
    
    console.log('🎉 Direct mint completed successfully - NFT delivered to creator wallet');
    
    return {
      success: true,
      tokenId,
      transactionHash: mintResult.transactionHash,
      message: `NFT minted directly to your wallet (skip escrow). Token ID: ${tokenId}`
    };
    
  } catch (error: any) {
    console.error('❌ Direct mint failed:', error);
    return {
      success: false,
      error: error.message || 'Direct mint failed'
    };
  }
}

// Gas-paid fallback for escrow minting - Real implementation without Biconomy
async function mintNFTEscrowGasPaid(
  to: string,
  tokenURI: string,
  password: string,
  timeframeDays: number,
  giftMessage: string,
  creatorAddress: string,
  publicBaseUrl: string,  // REQUIRED: Explicit injection instead of req?
  educationModules?: number[]
): Promise<{
  success: boolean;
  tokenId?: string;
  giftId?: number; // CRITICAL: Add giftId to return type
  transactionHash?: string;
  escrowTransactionHash?: string;
  salt?: string;
  passwordHash?: string;
  error?: string;
  details?: string;
}> {
  let transactionNonce = '';
  let passwordHash: string | undefined;
  let actualGiftIdGasPaid: number; // Declare giftId variable in scope
  
  try {
    // PROTOCOL V2 TYPE C: Validate publicBaseUrl early (no broken URLs)
    if (!publicBaseUrl || !publicBaseUrl.startsWith('http')) {
      throw new Error(`Invalid publicBaseUrl: ${publicBaseUrl}. Must be a valid HTTP/HTTPS URL.`);
    }
    
    console.log('💰 MINT ESCROW GAS-PAID: Starting atomic operation (deployer pays gas)');
    console.log('🌐 Using validated publicBaseUrl:', publicBaseUrl);
    
    // Step 1: Rate limiting check
    const rateLimit = checkRateLimit(creatorAddress);
    if (!rateLimit.allowed) {
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.`);
    }
    
    console.log('✅ Rate limit check passed. Remaining: ', rateLimit.remaining);
    
    // Step 2: Anti-double minting validation
    const escrowConfig = { password, timeframe: timeframeDays, giftMessage };
    const validation = await validateTransactionAttempt(creatorAddress, tokenURI, 0, escrowConfig);
    
    if (!validation.valid) {
      throw new Error(validation.reason || 'Transaction validation failed');
    }
    
    transactionNonce = validation.nonce;
    console.log('✅ Anti-double minting validation passed. Nonce:', transactionNonce.slice(0, 10) + '...');
    
    // Step 2.5: ENHANCED IPFS VALIDATION with PROPAGATION RETRY - METADATA + IMAGE 
    console.log('🔍 ENHANCED VALIDATION: Starting comprehensive metadata + image validation with retry');
    console.log('🚀 Enhancement: Validates JSON metadata + image field + handles IPFS propagation delays'); 
    console.log('🔍 MetadataURI for validation:', tokenURI);
    
    // ENHANCED VALIDATION with IPFS propagation retry: Check metadata JSON + image field
    const ipfsValidation = await validateIPFSMetadataAndImage(tokenURI);
    if (!ipfsValidation.success) {
      console.error('❌ IPFS VALIDATION FAILED:', ipfsValidation.error);
      
      // FAIL-FAST: No bypasses - if image is not accessible, mint should fail
      return {
        success: false,
        error: `IPFS_VALIDATION_FAILED: Image not accessible via any IPFS gateway. ${ipfsValidation.error}. Solution: Ensure image is properly uploaded and propagated to IPFS gateways.`
      };
    } else {
      console.log('✅ IPFS validation passed - image accessible via gateways');
    }
    
    // Step 3: Register transaction attempt
    await registerTransactionAttempt(creatorAddress, transactionNonce, tokenURI, 0, escrowConfig);
    
    // Step 4: Generate salt (password passed directly to contract)
    const salt = generateSalt();
    // NOTE: Contract generates hash internally with all parameters (password, salt, giftId, address, chainId)
    
    // Secure logging - never expose actual crypto values
    console.log('🔐 Cryptographic data generated successfully');
    
    // Step 5: Create deployer account for gas-paid transactions
    const deployerAccount = privateKeyToAccount({
      client,
      privateKey: process.env.PRIVATE_KEY_DEPLOY!
    });
    
    console.log('🔑 Using deployer account for gas-paid transactions:', deployerAccount.address.slice(0, 10) + '...');
    
    // Step 6: Get NFT contract
    const nftContract = getContract({
      client,
      chain: baseSepolia,
      address: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!
    });
    
    // Determine if this is an escrow mint (password provided) or direct mint (no password)
    const isEscrowMint = !!password;
    
    // Step 7: V2 ZERO CUSTODY - Mint directly to escrow contract for escrow mints
    const targetAddress = isEscrowMint ? ESCROW_CONTRACT_ADDRESS! : to;
    console.log(`🎨 Preparing gas-paid mint NFT with V2 zero-custody architecture...`);
    console.log(`🔍 Target recipient: ${targetAddress}`);
    console.log(`🔍 Is escrow mint: ${isEscrowMint}`);
    console.log(`🔍 Backend deployer: ${creatorAddress}`);
    
    // CRITICAL FIX: Use IPFS tokenURI directly for proper wallet/BaseScan display
    // SOLVES: Images not appearing in wallets/BaseScan due to HTTP tokenURI instead of IPFS
    console.log(`🔍 Using IPFS tokenURI for on-chain storage: ${tokenURI}`);
    console.log(`🔍 IPFS tokenURI validation: ${tokenURI.startsWith('ipfs://') ? '✅ IPFS' : '❌ NOT IPFS'}`);
    
    const mintTransaction = prepareContractCall({
      contract: nftContract,
      method: "function mintTo(address to, string memory tokenURI) external",
      params: [targetAddress, tokenURI] // Use actual IPFS URI for proper wallet display
    });
    
    // Step 8: Execute gas-paid mint transaction using deployer account
    console.log('🚀 Executing gas-paid mint transaction (deployer pays)...');
    const mintResult = await sendTransaction({
      transaction: mintTransaction,
      account: deployerAccount
    });
    
    console.log('✅ NFT minted with gas-paid transaction:', mintResult.transactionHash);
    
    // Step 9: Wait for mint confirmation
    const mintReceipt = await waitForReceipt({
      client,
      chain: baseSepolia,
      transactionHash: mintResult.transactionHash
    });
    
    // CRITICAL: Verify transaction succeeded
    if (mintReceipt.status !== 'success') {
      throw new Error(`Mint transaction failed with status: ${mintReceipt.status}`);
    }
    
    console.log('✅ Mint transaction confirmed successful');
    console.log('🔍 FORCED DEBUG: About to extract token ID - checking deployment');
    console.log('🔍 FORCED DEBUG: Mint result hash:', mintResult.transactionHash);
    let tokenId: string | null = null;
    
    // ROBUST TOKEN ID EXTRACTION - NO SILENT FAILURES
    const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    
    console.log('🔍 Starting robust token ID extraction...');
    
    try {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const receipt = await provider.getTransactionReceipt(mintResult.transactionHash);
      
      if (!receipt) {
        throw new Error(`No transaction receipt found for hash: ${mintResult.transactionHash}`);
      }
      
      console.log(`🔍 Examining ${receipt.logs.length} logs for Transfer event...`);
      
      // Find Transfer event with strict validation
      const transferLog = receipt.logs.find(log => {
        const isCorrectContract = log.address.toLowerCase() === process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!.toLowerCase();
        const isTransferEvent = log.topics[0] === transferEventSignature;
        const hasEnoughTopics = log.topics.length >= 4;
        
        console.log(`🔍 Log check - Contract: ${isCorrectContract}, Event: ${isTransferEvent}, Topics: ${hasEnoughTopics} (${log.topics.length})`);
        
        return isCorrectContract && isTransferEvent && hasEnoughTopics;
      });
      
      if (!transferLog) {
        throw new Error(`No valid Transfer event found in transaction ${mintResult.transactionHash}. Found ${receipt.logs.length} logs but none matched Transfer pattern.`);
      }
      
      // Use enhanced tokenId extraction with comprehensive validation
      const tokenIdValidation = extractTokenIdFromTransferEvent(transferLog);
      
      if (!tokenIdValidation.success) {
        console.error('❌ ENHANCED TOKEN ID EXTRACTION FAILED:', tokenIdValidation.error);
        
        // Run diagnostic to understand the issue
        const diagnostic = await diagnoseTokenIdZeroIssue(
          Array.from(receipt.logs || []),
          process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!
        );
        
        console.error('🔍 DIAGNOSTIC RESULTS:', diagnostic);
        
        throw new TokenIdZeroError(
          `Enhanced tokenId extraction failed: ${tokenIdValidation.error}`,
          tokenIdValidation.source,
          tokenIdValidation.rawValue,
          diagnostic
        );
      }
      
      tokenId = tokenIdValidation.tokenId!;
      console.log('✅ ENHANCED TOKEN ID EXTRACTION SUCCESS:', tokenId);
      
    } catch (error) {
      console.error('❌ Transfer event extraction failed:', error);
      // NO FALLBACK - Fail fast and clear
      throw new Error(`Token ID extraction failed: ${error.message}. This prevents double minting and ensures data integrity.`);
    }
    
    if (!tokenId) {
      throw new Error('Failed to extract token ID from mint transaction');
    }
    
    // CRITICAL FIX: Update metadata with real tokenId (ERROR 3 SOLUTION)
    console.log('📝 METADATA UPDATE (GAS-PAID): Creating final metadata with real tokenId:', tokenId);
    
    try {
      // 🔥 FASE 7D CRITICAL SEMANTIC FIX: tokenURI contains METADATA CID, not image CID
      // The previous assumption was completely wrong - tokenURI = metadata CID by NFT standards
      // We need to EXTRACT imageIpfsCid FROM the existing metadata JSON, not assume tokenURI is image
      
      let actualImageCid = '';
      let metadataUri = tokenURI; // tokenURI should contain metadata CID
      
      console.log('📋 SEMANTIC CORRECTION: tokenURI contains metadata, extracting image CID from it');
      
      // 🔥 FASE 7D: Add debug logging for this critical fix
      try {
        const { addMintLog } = await import('./debug/mint-logs');
        await addMintLog('INFO', 'FASE_7D_SEMANTIC_FIX', {
          message: 'Extracting image CID from metadata (not using tokenURI as image)',
          tokenURI: tokenURI.substring(0, 50) + '...',
          previousAssumption: 'tokenURI = image CID (WRONG)',
          correctSemantics: 'tokenURI = metadata CID, extract image from JSON'
        });
      } catch (logError) {
        console.log('⚠️ Debug logging failed (non-critical):', logError.message);
      }
      
      // 🔥 FASE 7D FIX: Extract image CID from existing metadata JSON
      try {
        // Convert tokenURI to fetchable URL and get the metadata JSON
        const { pickGatewayUrl } = await import('../../utils/ipfs');
        const metadataUrl = await pickGatewayUrl(tokenURI);
        
        console.log(`🔍 Fetching existing metadata to extract image CID: ${metadataUrl}`);
        
        const metadataResponse = await fetch(metadataUrl);
        if (metadataResponse.ok) {
          const existingMetadata = await metadataResponse.json();
          console.log('📋 Existing metadata loaded:', {
            name: existingMetadata.name,
            hasImage: !!existingMetadata.image,
            imageUrl: existingMetadata.image ? existingMetadata.image.substring(0, 50) + '...' : 'none'
          });
          
          // Extract image CID from the metadata
          if (existingMetadata.image) {
            if (existingMetadata.image.startsWith('ipfs://')) {
              actualImageCid = existingMetadata.image.replace('ipfs://', '');
              console.log('✅ Extracted image CID from metadata:', actualImageCid.substring(0, 30) + '...');
            } else if (existingMetadata.image.includes('/ipfs/')) {
              // Extract CID from HTTPS gateway URL
              const match = existingMetadata.image.match(/\/ipfs\/([^\/\?]+)/);
              if (match) {
                actualImageCid = match[1];
                console.log('✅ Extracted image CID from HTTPS gateway URL:', actualImageCid.substring(0, 30) + '...');
              }
            }
          }
        }
        
        if (!actualImageCid) {
          throw new Error('Could not extract image CID from existing metadata');
        }
        
        // 🔥 FASE 7D: Log successful extraction for debugging
        try {
          const { addMintLog } = await import('./debug/mint-logs');
          await addMintLog('SUCCESS', 'FASE_7D_IMAGE_CID_EXTRACTED', {
            message: 'Successfully extracted correct image CID from metadata JSON',
            extractedImageCid: actualImageCid.substring(0, 30) + '...',
            tokenURI: tokenURI.substring(0, 50) + '...',
            semanticsFixed: 'tokenURI (metadata) → JSON → image field → CID'
          });
        } catch (logError) {
          // Non-critical logging failure
        }
        
      } catch (extractError) {
        console.error('❌ Failed to extract image CID from metadata:', extractError.message);
        throw new Error(`Cannot update metadata: Failed to extract image CID from tokenURI metadata: ${extractError.message}`);
      }
      
      // Create new metadata with the real tokenId and correct image CID
      let metadataUpdateResult;
      
      if (isEscrowMint) {
        // Create escrow-specific metadata
        const timeConstantsMap = {
          [TIMEFRAME_OPTIONS.FIFTEEN_MINUTES]: 'FIFTEEN_MINUTES',
          [TIMEFRAME_OPTIONS.SEVEN_DAYS]: 'SEVEN_DAYS', 
          [TIMEFRAME_OPTIONS.FIFTEEN_DAYS]: 'FIFTEEN_DAYS',
          [TIMEFRAME_OPTIONS.THIRTY_DAYS]: 'THIRTY_DAYS'
        };
        
        // Calculate expiration time for metadata
        const timeConstants = {
          [TIMEFRAME_OPTIONS.FIFTEEN_MINUTES]: 900,
          [TIMEFRAME_OPTIONS.SEVEN_DAYS]: 604800,
          [TIMEFRAME_OPTIONS.FIFTEEN_DAYS]: 1296000,
          [TIMEFRAME_OPTIONS.THIRTY_DAYS]: 2592000
        };
        
        const currentTime = Math.floor(Date.now() / 1000);
        const expirationTime = currentTime + timeConstants[timeframeDays];
        
        console.log('🔒 Creating escrow metadata with real tokenId and image CID');
        
        // CRITICAL DEBUG: Log specific timeframe details for 7-day issue
        console.log('🔍 TIMEFRAME DEBUG:', {
          timeframeDaysInput: timeframeDays,
          timeframeDaysType: typeof timeframeDays,
          timeConstantsMapKeys: Object.keys(timeConstantsMap),
          mappedValue: timeConstantsMap[timeframeDays],
          timeframeDaysString: String(timeframeDays),
          allMapping: timeConstantsMap
        });
        
        metadataUpdateResult = await createEscrowMetadata(
          tokenId,
          actualImageCid, // 🔥 FASE 7D CRITICAL FIX: Now using ACTUAL image CID, not metadata CID
          giftMessage,
          creatorAddress,
          expirationTime,
          timeConstantsMap[timeframeDays] || 'UNKNOWN'
        );
      } else {
        // Create direct mint metadata
        console.log('🎯 Creating direct mint metadata with real tokenId and image CID');
        metadataUpdateResult = await createDirectMintMetadata(
          tokenId,
          actualImageCid, // 🔥 FASE 7D CRITICAL FIX: Now using ACTUAL image CID, not metadata CID
          giftMessage,
          creatorAddress
        );
      }
      
      if (metadataUpdateResult.success && metadataUpdateResult.metadataUrl) {
        console.log('✅ METADATA UPDATED (GAS-PAID): Real tokenId metadata created:', {
          tokenId,
          newMetadataCid: metadataUpdateResult.metadataCid,
          newMetadataUrl: metadataUpdateResult.metadataUrl,
          originalTokenURI: tokenURI
        });
        
        // 🔥 CRITICAL FIX ERROR #2: Store metadata in Redis BEFORE updateTokenURI to ensure availability
        console.log('💾 PRE-STORING metadata in Redis BEFORE tokenURI update...');
        await storeMetadataInRedisEarly(metadataUpdateResult, tokenId, actualImageCid, giftMessage, creatorAddress, isEscrowMint, mintResult.transactionHash);
        
        // CRITICAL FIX: Update tokenURI on contract with correct metadata
        console.log('🔄 UPDATING CONTRACT TOKEN URI with real tokenId metadata...');
        
        // Get NFT contract (moved outside try for retry access)
        const nftContract = getContract({
          client,
          chain: baseSepolia,
          address: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!
        });
        
        // Get deployer account for contract update (moved outside try for retry access)
        const deployerAccount = privateKeyToAccount({
          client,
          privateKey: process.env.PRIVATE_KEY_DEPLOY!
        });
        
        // UNIVERSAL COMPATIBILITY FIX: Use BaseScan-optimized endpoint for maximum compatibility
        const contractAddress = process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!;
        
        // CRITICAL VALIDATION: Ensure publicBaseUrl is safe for tokenURI generation
        if (!publicBaseUrl || publicBaseUrl.includes('localhost') || publicBaseUrl.includes('127.0.0.1')) {
          throw new Error(`CRITICAL: Invalid publicBaseUrl for tokenURI generation: ${publicBaseUrl}. This would create broken NFTs. Set NEXT_PUBLIC_BASE_URL to your production URL in environment variables`);
        }
        
        if (!publicBaseUrl.startsWith('https://')) {
          console.warn('⚠️ WARNING: tokenURI should use HTTPS for maximum compatibility');
        }
        
        // 🔥 CRITICAL FIX ERROR #3: Use DIRECT IPFS metadata URL instead of self-call endpoint
        // This prevents recursion and placeholder loops by pointing directly to IPFS
        const directIpfsUrl = metadataUpdateResult.metadataUrl; // Use IPFS metadata directly
        
        console.log('🔒 VALIDATION PASSED: Using direct IPFS metadata to prevent self-call recursion');
        console.log('🌐 Original Base URL (NOT USED):', publicBaseUrl);
        console.log('🔗 Direct IPFS tokenURI:', directIpfsUrl);
        
        try {
          
          console.log('🌐 UNIVERSAL FIX: Using DIRECT IPFS metadata URL for tokenURI');
          console.log(`📍 Direct IPFS URL: ${directIpfsUrl}`);
          console.log(`🚫 NO LONGER USING self-call endpoint to prevent recursion`);
          
          // 🔥 CRITICAL FIX: Verify token exists on-chain before updating tokenURI
          console.log('🔍 VERIFYING token exists on-chain before tokenURI update...');
          await verifyTokenExists(nftContract, tokenId);
          
          // 🔧 FASE 5D FIX: Validate FINAL metadata propagation BEFORE updateTokenURI
          console.log('🔍 VALIDATING final metadata propagation before on-chain update...');
          try {
            const { pickGatewayUrl } = await import('../../utils/ipfs');
            const validationUrl = await pickGatewayUrl(metadataUpdateResult.metadataUrl);
            console.log(`🎯 Validation URL selected: ${validationUrl}`);
            
            const validationResponse = await fetch(validationUrl, {
              method: 'GET',
              signal: AbortSignal.timeout(5000) // 5s timeout for validation
            });
            
            if (!validationResponse.ok) {
              throw new Error(`Validation failed: ${validationResponse.status}`);
            }
            
            const validationJson = await validationResponse.json();
            // CRITICAL FIX: Don't require tokenId in metadata since upload.ts creates generic metadata
            // The tokenId is added during the mint process, not in the original upload
            if (!validationJson.name || !validationJson.image) {
              throw new Error(`Final metadata missing required fields: name=${!!validationJson.name}, image=${!!validationJson.image}`);
            }
            
            console.log('✅ FINAL metadata validation passed - ready for on-chain update');
            console.log(`🔍 Confirmed name: ${validationJson.name}`);
            console.log(`🖼️ Confirmed image: ${validationJson.image ? validationJson.image.substring(0, 50) + '...' : 'missing'}`);
            
            // 🚨 BASESCAN VALIDATION: Ensure metadata AND image are accessible on ipfs.io or cloudflare
            console.log('🔍 BASESCAN VALIDATION: Ensuring metadata/image accessibility for explorers...');
            
            // Extract metadata CID from IPFS URL
            const metadataCid = metadataUpdateResult.metadataUrl.replace('ipfs://', '');
            
            // Extract image CID from metadata
            let imageCid = '';
            if (validationJson.image && validationJson.image.startsWith('ipfs://')) {
              imageCid = validationJson.image.replace('ipfs://', '');
            }
            
            // Priority gateways for BaseScan compatibility
            const basescanGateways = [
              'https://ipfs.io/ipfs/',
              'https://cloudflare-ipfs.com/ipfs/'
            ];
            
            // Validation with 4 retries and exponential backoff
            const validateWithRetries = async (cid: string, resourceType: string) => {
              const maxRetries = 4;
              let lastError: Error | null = null;
              
              for (let attempt = 1; attempt <= maxRetries; attempt++) {
                console.log(`🔄 BaseScan validation attempt ${attempt}/${maxRetries} for ${resourceType}...`);
                
                for (const gateway of basescanGateways) {
                  try {
                    const url = `${gateway}${cid}`;
                    const response = await fetch(url, {
                      method: 'HEAD',
                      signal: AbortSignal.timeout(3000) // 3s timeout per request
                    });
                    
                    if (response.ok || response.status === 206) {
                      console.log(`✅ ${resourceType} accessible on ${gateway.split('/')[2]}`);
                      return true; // Success - resource is accessible
                    }
                  } catch (error) {
                    lastError = error as Error;
                    // Continue to next gateway
                  }
                }
                
                // All gateways failed this attempt
                if (attempt < maxRetries) {
                  const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 4000); // Exponential backoff: 1s, 2s, 4s
                  console.log(`⏳ Waiting ${backoffMs}ms before retry ${attempt + 1}...`);
                  await new Promise(resolve => setTimeout(resolve, backoffMs));
                }
              }
              
              // All retries exhausted
              throw new Error(`${resourceType} not accessible on ipfs.io or cloudflare after ${maxRetries} retries: ${lastError?.message}`);
            };
            
            // Validate metadata.json accessibility
            await validateWithRetries(`${metadataCid}/metadata.json`, 'Metadata');
            
            // Validate image accessibility (if IPFS format)
            if (imageCid) {
              await validateWithRetries(imageCid, 'Image');
            }
            
            console.log('✅ BASESCAN VALIDATION COMPLETE: Both metadata and image are accessible');
            
          } catch (validationError) {
            console.error('❌ FINAL metadata validation FAILED:', validationError.message);
            // FAIL-FAST: Don't update tokenURI if final metadata isn't ready
            throw new Error(`Cannot update tokenURI: Final metadata validation failed - ${validationError.message}. Metadata must be accessible via IPFS before updating on-chain tokenURI.`);
          }
          
          // 🔥 CRITICAL FIX ERROR #3: Use direct IPFS URL (no timestamping needed for IPFS)
          console.log(`🔄 Using direct IPFS URL (immutable, no cache busting needed): ${directIpfsUrl}`);
          
          // Prepare updateTokenURI transaction with DIRECT IPFS URL
          const updateURITransaction = prepareContractCall({
            contract: nftContract,
            method: "function updateTokenURI(uint256 tokenId, string memory uri) external",
            params: [BigInt(tokenId), directIpfsUrl] // Use direct IPFS URL to prevent self-call recursion
          });
          
          // Execute update transaction
          const updateResult = await sendTransaction({
            transaction: updateURITransaction,
            account: deployerAccount
          });
          
          console.log('📨 TokenURI update transaction sent:', updateResult.transactionHash);
          
          // Wait for update confirmation with fail-fast
          const updateReceipt = await waitForReceipt({
            client,
            chain: baseSepolia,
            transactionHash: updateResult.transactionHash
          });
          
          if (updateReceipt.status === 'success') {
            console.log('✅ TOKEN URI UPDATED ON CONTRACT (DIRECT IPFS):', {
              tokenId,
              newTokenURI: directIpfsUrl,
              updateTxHash: updateResult.transactionHash
            });
            
            // 🔥 FASE 7F: Emit EIP-4906 MetadataUpdate event for wallets/explorers
            try {
              console.log('📢 Emitting EIP-4906 MetadataUpdate event...');
              
              const metadataUpdateEvent = prepareContractCall({
                contract: nftContract,
                method: "function emitMetadataUpdate(uint256 tokenId) external",
                params: [BigInt(tokenId)]
              });
              
              const eventResult = await sendTransaction({
                transaction: metadataUpdateEvent,
                account: deployerAccount
              });
              
              console.log('📢 MetadataUpdate event emitted:', eventResult.transactionHash);
              
              // Optional: wait for event confirmation (non-blocking)
              waitForReceipt({
                client,
                chain: baseSepolia,
                transactionHash: eventResult.transactionHash
              }).then(eventReceipt => {
                console.log('✅ MetadataUpdate event confirmed:', eventReceipt.status);
              }).catch(eventError => {
                console.log('⚠️ MetadataUpdate event confirmation failed (non-critical):', eventError.message);
              });
              
            } catch (eventError) {
              // EIP-4906 event emission is non-critical, don't fail the mint
              console.log('⚠️ EIP-4906 MetadataUpdate event failed (non-critical):', eventError.message);
            }
          } else {
            // FAIL-FAST: Status failure is critical for BaseScan compatibility
            throw new Error(`TokenURI update failed: receipt status=${updateReceipt.status}`);
          }
          
        } catch (updateError: any) {
          console.error(`❌ TokenURI update attempt 1 failed: ${updateError.message}`);
          
          // RETRY LOGIC: One retry with backoff for race conditions
          try {
            console.log(`🔁 Attempting TokenURI update retry after 1s backoff...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Verify token exists before retry
            const tokenExists = await readContract({
              contract: nftContract,
              method: "function ownerOf(uint256 tokenId) view returns (address)",
              params: [BigInt(tokenId)]
            });
            
            if (!tokenExists) {
              throw new Error(`Token ${tokenId} does not exist for URI update`);
            }
            
            // Retry the update
            const retryTransaction = prepareContractCall({
              contract: nftContract,
              method: "function updateTokenURI(uint256 tokenId, string memory uri) external",
              params: [BigInt(tokenId), directIpfsUrl] // Use direct IPFS URL in retry too
            });
            
            const retryResult = await sendTransaction({
              transaction: retryTransaction,
              account: deployerAccount
            });
            
            const retryReceipt = await waitForReceipt({
              client,
              chain: baseSepolia,
              transactionHash: retryResult.transactionHash
            });
            
            if (retryReceipt.status === 'success') {
              console.log('✅ TOKEN URI RETRY SUCCESS:', {
                tokenId,
                newTokenURI: directIpfsUrl,
                retryTxHash: retryResult.transactionHash
              });
              
              // 🔥 FASE 7F: Emit EIP-4906 MetadataUpdate event after successful retry
              try {
                console.log('📢 Emitting EIP-4906 MetadataUpdate event (retry success)...');
                
                const metadataUpdateEvent = prepareContractCall({
                  contract: nftContract,
                  method: "function emitMetadataUpdate(uint256 tokenId) external",
                  params: [BigInt(tokenId)]
                });
                
                const eventResult = await sendTransaction({
                  transaction: metadataUpdateEvent,
                  account: deployerAccount
                });
                
                console.log('📢 MetadataUpdate event emitted (retry):', eventResult.transactionHash);
                
              } catch (eventError) {
                // EIP-4906 event emission is non-critical, don't fail the mint
                console.log('⚠️ EIP-4906 MetadataUpdate event failed (retry, non-critical):', eventError.message);
              }
            } else {
              // CRITICAL FAILURE: Both attempts failed
              throw new Error(`TokenURI update failed after retry: receipt status=${retryReceipt.status}`);
            }
            
          } catch (retryError: any) {
            console.error(`💥 CRITICAL: TokenURI update failed after retry: ${retryError.message}`);
            // FAIL-FAST: Surface the error to caller - NFT will have incorrect URI for BaseScan
            throw new Error(`Failed to update TokenURI for BaseScan compatibility: ${retryError.message}`);
          }
        }
        
      } else {
        console.error('❌ METADATA UPDATE FAILED (GAS-PAID):', metadataUpdateResult.error);
        // FAIL-FAST: updateTokenURI is critical for BaseScan compatibility
        throw new Error(`TokenURI update failed: ${metadataUpdateResult.error}. Manual tokenURI update required.`);
      }

      // 🔧 FASE 5B CRITICAL FIX: Store FINAL metadata in Redis (not temporal)
      // This was moved here to use metadataUpdateResult.metadataUrl (final) instead of metadataUri (temporal)
      try {
        console.log('💾 Storing FINAL NFT metadata for wallet display...');
        
        // 🚨 CRITICAL FIX: Extract CIDs from FINAL metadata, not temporal
        let finalImageIpfsCid = '';
        let finalMetadataIpfsCid = '';
        
        const finalMetadataUrl = metadataUpdateResult.metadataUrl;
        console.log('🎯 Using FINAL metadata URL:', finalMetadataUrl);
        
        try {
          // Extract metadata CID from FINAL metadataUrl (handles both HTTPS and ipfs://)
          if (finalMetadataUrl && finalMetadataUrl.startsWith('ipfs://')) {
            finalMetadataIpfsCid = finalMetadataUrl.replace('ipfs://', '');
            console.log('✅ FINAL METADATA CID EXTRACTED from ipfs://:', {
              fullFinalUrl: finalMetadataUrl.substring(0, 50) + '...',
              extractedFinalCid: finalMetadataIpfsCid.substring(0, 30) + '...'
            });
          } else if (finalMetadataUrl && finalMetadataUrl.includes('/ipfs/')) {
            // Extract CID from HTTPS gateway URL: https://gateway.thirdweb.com/ipfs/QmXXX
            const match = finalMetadataUrl.match(/\/ipfs\/(.+)$/);
            if (match) {
              finalMetadataIpfsCid = match[1];
              console.log('✅ FINAL METADATA CID EXTRACTED from HTTPS gateway:', {
                fullFinalUrl: finalMetadataUrl.substring(0, 50) + '...',
                extractedFinalCid: finalMetadataIpfsCid.substring(0, 30) + '...'
              });
            } else {
              throw new Error(`Could not extract CID from gateway URL: ${finalMetadataUrl}`);
            }
          } else {
            throw new Error(`Final metadataUrl is neither IPFS nor gateway format: ${finalMetadataUrl}`);
          }
          
          // 🌐 FASE 5C FIX: Multi-gateway fetch with early-exit (not single ipfs.io)
          console.log('🌐 Fetching FINAL metadata JSON with multi-gateway strategy...');
          
          // Use our robust multi-gateway system
          const { pickGatewayUrl } = await import('../../utils/ipfs');
          const optimalGatewayUrl = await pickGatewayUrl(`ipfs://${finalMetadataIpfsCid}`);
          console.log(`🎯 Optimal gateway selected: ${optimalGatewayUrl}`);
          
          const finalMetadataResponse = await fetch(optimalGatewayUrl);
          
          if (finalMetadataResponse.ok) {
            const finalMetadataJson = await finalMetadataResponse.json();
            console.log('📋 Final metadata JSON preview:', {
              name: finalMetadataJson.name,
              tokenId: finalMetadataJson.tokenId || 'missing',
              hasImage: !!finalMetadataJson.image
            });
            
            if (finalMetadataJson.image && finalMetadataJson.image.startsWith('ipfs://')) {
              finalImageIpfsCid = finalMetadataJson.image.replace('ipfs://', '');
              console.log('✅ FINAL IMAGE CID EXTRACTED from final metadata JSON:', {
                extractedFinalImageCid: finalImageIpfsCid.substring(0, 30) + '...'
              });
            } else {
              // 🔥 CRITICAL FALLBACK: Use actualImageCid from upload if JSON image field is missing/invalid
              console.log('⚠️ Final metadata JSON missing valid image field, using upload actualImageCid as fallback');
              console.log('🔧 Upload data for fallback:', {
                hasActualImageCid: !!actualImageCid,
                actualImageCidValue: actualImageCid?.substring(0, 30) + '...',
                originalJsonImage: finalMetadataJson.image
              });
              
              if (actualImageCid) {
                finalImageIpfsCid = actualImageCid.replace('ipfs://', '');
                console.log('✅ FALLBACK: Using actualImageCid from upload:', {
                  fallbackImageCid: finalImageIpfsCid.substring(0, 30) + '...'
                });
              } else {
                throw new Error(`No valid image field in final metadata JSON and no actualImageCid fallback available. JSON image: ${finalMetadataJson.image}, Upload actualImageCid: ${actualImageCid}`);
              }
            }
          } else {
            throw new Error(`Failed to fetch final metadata: ${finalMetadataResponse.status}`);
          }
          
          // Store FINAL metadata in Redis
          console.log('💾 Storing FINAL metadata with tokenId and correct CIDs...');
          
          // Determine the final owner of the NFT  
          const finalOwner = creatorAddress; // Simplified - use creator address
          
          // Create complete attributes array including escrow-specific data
          const baseAttributes = [
            { trait_type: "Token ID", value: tokenId },
            { trait_type: "Creation Date", value: new Date().toISOString() },
            { trait_type: "Platform", value: "CryptoGift Wallets" },
            { trait_type: "Gift Type", value: isEscrowMint ? "Temporal Escrow" : "Direct Mint" },
            { trait_type: "Creator", value: creatorAddress.slice(0, 10) + '...' }
          ];

          // Add escrow-specific attributes for escrow mints
          if (isEscrowMint) {
            console.log('🔒 ADDING ESCROW ATTRIBUTES FOR METAMASK COMPATIBILITY');
            baseAttributes.push(
              { trait_type: "Gift Type", value: "Temporal Escrow" },
              { trait_type: "Security", value: "Password Protected" }
            );
          }
          
          const finalNftMetadata = createNFTMetadata({
            contractAddress: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
            tokenId: tokenId,
            name: `CryptoGift NFT #${tokenId}`,
            description: giftMessage || "Un regalo cripto único creado con amor",
            imageIpfsCid: finalImageIpfsCid,    // From FINAL metadata
            metadataIpfsCid: finalMetadataIpfsCid, // From FINAL metadata  
            attributes: baseAttributes,
            mintTransactionHash: mintResult.transactionHash,
            owner: finalOwner,
            creatorWallet: creatorAddress
          });
          
          // Store with retry logic
          await storeMetadataWithRetry(finalNftMetadata, 3);
          console.log('✅ FINAL NFT metadata stored successfully with correct tokenId and CIDs');
          
        } catch (finalMetadataError) {
          console.error('❌ CRITICAL: Failed to extract CIDs from FINAL metadata:', finalMetadataError.message);
          
          // FAIL-FAST: Don't continue with broken metadata
          throw new Error(`FINAL metadata processing failed: ${finalMetadataError.message}`);
        }
        
      } catch (metadataStoreError) {
        console.error('❌ Failed to store FINAL NFT metadata:', metadataStoreError);
        throw new Error(`FINAL metadata storage failed: ${metadataStoreError.message}`);
      }
      
    } catch (metadataError) {
      console.error('❌ METADATA UPDATE ERROR (GAS-PAID):', metadataError);
      // FAIL-FAST: Propagate updateTokenURI failures
      throw new Error(`Critical TokenURI update failure: ${metadataError instanceof Error ? metadataError.message : 'Unknown error'}. Manual tokenURI update required.`);
    }
    
    // Initialize escrow transaction hash variable
    let escrowTransactionHash: string | undefined;
    
    if (isEscrowMint) {
      // ESCROW MINT V2: NFT minted directly to escrow, register gift with registerGiftMinted
      console.log('🔒 ESCROW MINT V2: NFT minted directly to escrow, registering gift...');
      
      // CRITICAL FIX: Verify NFT ownership BEFORE calling registerGiftMinted to prevent race condition
      console.log('🔍 PRE-CHECK: Verifying NFT is owned by escrow before registration...');
      
      const ownershipResult = await verifyNFTOwnership(
        process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
        tokenId,
        ESCROW_CONTRACT_ADDRESS!,
        10, // Increased max attempts from 5 to 10
        2000 // Increased delay from 1000ms to 2000ms for gas-paid transactions
      );
      
      if (!ownershipResult.success) {
        console.error('❌ CRITICAL: NFT ownership verification failed - this will cause registerGiftMinted to fail');
        console.error('❌ ERROR DETAILS:', {
          expectedOwner: ESCROW_CONTRACT_ADDRESS,
          actualOwner: ownershipResult.actualOwner,
          error: ownershipResult.error
        });
        throw new Error(`RACE CONDITION DETECTED: ${ownershipResult.error || 'NFT ownership verification failed'}`);
      }
      
      // V2 ZERO CUSTODY: Use registerGiftMinted for direct mint-to-escrow
      console.log('✅ V2 ZERO CUSTODY: Using registerGiftMinted (NFT already in escrow)');
      
      // CRITICAL: Validate gate configuration BEFORE proceeding (gas-paid)
      let gateAddress: string;
      
      if (educationModules && educationModules.length > 0) {
        // TEMPORARY FALLBACK: Use env var or fallback to deployed contract
        const gateEnvVar = process.env.SIMPLE_APPROVAL_GATE_ADDRESS || process.env.NEXT_PUBLIC_SIMPLE_APPROVAL_GATE_ADDRESS;
        
        if (!gateEnvVar || gateEnvVar === '0x0000000000000000000000000000000000000000') {
          console.warn('⚠️ GATE_MISSING (GAS-PAID): Education modules requested but gate not configured');
          
          throw new Error('GATE_MISSING: Education features temporarily unavailable - SimpleApprovalGate address not configured');
        }
        
        // Validar que es una dirección válida
        if (!ethers.isAddress(gateEnvVar)) {
          throw new Error('GATE_INVALID: Invalid approval gate address configuration');
        }
        
        gateAddress = ethers.getAddress(gateEnvVar); // Normalize with checksum
        console.log(`✅ Gate validated for education requirements (GAS-PAID): ${gateAddress.slice(0, 10)}...`);
      } else {
        gateAddress = '0x0000000000000000000000000000000000000000'; // No gate for gifts without education
      }
      
      // CRITICAL DEBUG: Log tokenId before registerGiftMinted call (gas-paid)
      console.log('🔍 CRITICAL DEBUG - BEFORE registerGiftMinted (GAS-PAID):', {
        tokenId: tokenId,
        tokenIdType: typeof tokenId,
        tokenIdBigInt: BigInt(tokenId).toString(),
        contract: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!.slice(0,10) + '...',
        creator: creatorAddress.slice(0,10) + '...',
        timeframeDays,
        giftMessageLength: giftMessage.length,
        gateAddress: gateAddress === '0x0000000000000000000000000000000000000000' ? 'NO_GATE' : gateAddress.slice(0, 10) + '...',
        hasEducation: educationModules && educationModules.length > 0
      });
      
      const registerGiftTransaction = prepareRegisterGiftMintedCall(
        tokenId,
        process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
        creatorAddress, // Original creator
        password,
        salt,
        timeframeDays,
        giftMessage,
        gateAddress // ← NEW: Pass gate address based on education requirements
      );
      
      console.log('🚀 Executing gas-paid gift registration...');
      const escrowResult = await sendTransaction({
        transaction: registerGiftTransaction,
        account: deployerAccount
      });
      
      const escrowReceipt = await waitForReceipt({
        client,
        chain: baseSepolia,
        transactionHash: escrowResult.transactionHash
      });
      
      // CRITICAL: Verify escrow creation succeeded
      if (escrowReceipt.status !== 'success') {
        throw new Error(`Escrow gift creation failed with status: ${escrowReceipt.status}`);
      }
      
      console.log('✅ Gift registered successfully in escrow V2 contract with gas-paid transaction');
      
      // RACE CONDITION FIX: IMMEDIATE WAIT-AND-VERIFY PATTERN (gas-paid)
      console.log('🔍 CRITICAL: Wait-and-verify gift registration immediately (gas-paid)...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s for blockchain state update
      
      // RACE CONDITION FIX: Verify that registerGiftMinted actually created the gift
      console.log('🔍 RACE CONDITION VERIFICATION: Confirming gift was registered correctly (gas-paid)...');
      try {
        const escrowContract = getEscrowContract();
        const giftCounter = await readContract({
          contract: escrowContract,
          method: "giftCounter",
          params: []
        });
        console.log(`✅ VERIFICATION (GAS-PAID): Current gift counter: ${giftCounter}`);
        
        if (Number(giftCounter) > 0) {
          const latestGift = await readContract({
            contract: escrowContract,
            method: "getGift",
            params: [BigInt(giftCounter)]
          });
          console.log('✅ VERIFICATION (GAS-PAID): Latest gift registered:', {
            creator: latestGift[0],
            tokenId: latestGift[3].toString(),
            status: latestGift[5]
          });
          
          // CRITICAL VALIDATION: Ensure tokenId matches what we sent (gas-paid)
          const expectedTokenIdNum = Number(tokenId);
          const storedTokenIdNum = Number(latestGift[3]);
          if (storedTokenIdNum !== expectedTokenIdNum) {
            console.error('🚨 CRITICAL VALIDATION FAILED (GAS-PAID):', {
              sentTokenId: expectedTokenIdNum,
              storedTokenId: storedTokenIdNum,
              giftId: Number(giftCounter),
              creator: latestGift[0].slice(0,10) + '...'
            });
            throw new Error(`VALIDATION FAILED (GAS-PAID): registerGiftMinted stored tokenId ${storedTokenIdNum} but we sent ${expectedTokenIdNum}. This is a critical contract state corruption.`);
          }
          
          console.log('✅ CRITICAL VALIDATION SUCCESS (GAS-PAID): tokenId stored correctly in contract');
        }
      } catch (verificationError) {
        console.warn('⚠️ VERIFICATION FAILED (but gift registration succeeded):', verificationError);
      }
      
      // Step: Verify NFT is in escrow contract (should already be there from direct mint)
      console.log('🔍 Verifying NFT is in escrow contract (V2 direct mint)...');
      const providerPostGasPaid = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const nftContractABIPostGasPaid = ["function ownerOf(uint256 tokenId) view returns (address)"];
      const nftContractCheckPostGasPaid = new ethers.Contract(
        process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
        nftContractABIPostGasPaid,
        providerPostGasPaid
      );
      
      const actualOwner = await nftContractCheckPostGasPaid.ownerOf(tokenId);
      console.log('🔍 Actual NFT owner after gift registration:', actualOwner);
      console.log('🔍 Expected escrow address:', ESCROW_CONTRACT_ADDRESS ? 'Set' : 'Missing');
      
      if (actualOwner.toLowerCase() !== ESCROW_CONTRACT_ADDRESS?.toLowerCase()) {
        throw new Error(`CRITICAL: NFT was not transferred to escrow contract. Expected: ${ESCROW_CONTRACT_ADDRESS}, Got: ${actualOwner}`);
      }
      
      console.log('✅ VERIFIED: NFT successfully in escrow contract (V2 zero-custody)');
      
      // DETERMINISTIC SOLUTION: Parse giftId from transaction receipt events (gas-paid)
      console.log('🔍 PARSING (GAS-PAID): Extracting giftId from transaction receipt...');
      
      // Normalize the ThirdWeb receipt to our parser format
      const normalizedGasPaidReceipt = {
        transactionHash: escrowReceipt.transactionHash,
        status: escrowReceipt.status,
        blockNumber: Number(escrowReceipt.blockNumber),
        gasUsed: escrowReceipt.gasUsed,
        logs: escrowReceipt.logs.map((log: any) => ({
          topics: log.topics || [],
          data: log.data || '0x',
          address: log.address
        }))
      };
      
      const eventResultGasPaid = await parseGiftEventWithRetry(
        normalizedGasPaidReceipt,
        tokenId,
        process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!
      );
      
      if (!eventResultGasPaid.success) {
        console.error('❌ EVENT PARSE FAILED (GAS-PAID):', eventResultGasPaid.success === false ? eventResultGasPaid.error : 'Unknown error');
        throw new Error(`Failed to extract giftId from gas-paid transaction: ${eventResultGasPaid.success === false ? eventResultGasPaid.error : 'Unknown error'}`);
      }
      
      actualGiftIdGasPaid = eventResultGasPaid.giftId;
      console.log(`✅ DETERMINISTIC (GAS-PAID): tokenId ${tokenId} → giftId ${actualGiftIdGasPaid} (from event)`);
      
      // Generate password hash now that we have the giftId
      passwordHash = generatePasswordHash(
        password,
        salt,
        actualGiftIdGasPaid,
        ESCROW_CONTRACT_ADDRESS!,
        84532 // Base Sepolia chain ID
      );
      
      // Store the mapping deterministically (gas-paid) with education metadata
      try {
        await storeGiftMapping(
          tokenId, 
          actualGiftIdGasPaid, 
          process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
          parseInt(process.env.NEXT_PUBLIC_CHAIN_ID!),
          {
            educationModules: educationModules || [],
            creator: creatorAddress,
            createdAt: Date.now(),
          salt: salt
        });
        console.log(`✅ MAPPING STORED (GAS-PAID): tokenId ${tokenId} → giftId ${actualGiftIdGasPaid} with education modules:`, {
          hasEducation: educationModules && educationModules.length > 0,
          moduleCount: educationModules?.length || 0,
          policyHash: educationModules?.length ? ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify([...educationModules].sort((a, b) => a - b)))).slice(0, 10) + '...' : 'none'
        });
        
        // CRITICAL: Store the original mint salt for claim validation (gas-paid)
        try {
          await storeGiftSalt(actualGiftIdGasPaid, salt);
          console.log(`✅ SALT STORED (GAS-PAID): giftId ${actualGiftIdGasPaid} → ${salt.slice(0, 10)}... (FIXES CLAIM VALIDATION)`);
        } catch (saltError) {
          console.error(`❌ CRITICAL: Salt storage failed for giftId ${actualGiftIdGasPaid}:`, saltError);
          // Don't fail the whole mint, but log this as critical
          debugLogger.operation('Salt storage failed during gas-paid mint', {
            tokenId,
            giftId: actualGiftIdGasPaid,
            error: saltError instanceof Error ? saltError.message : 'Unknown error'
          });
        }
        
        // VALIDATION: Verify the mapping is correct (gas-paid, increased retries for race condition)
        const validationGasPaid = await validateMappingWithRetry(
          tokenId,
          actualGiftIdGasPaid,
          creatorAddress,
          process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
          6 // Increased from 3 to 6 retries for race condition recovery
        );
        
        if (!validationGasPaid.valid) {
          console.error('❌ MAPPING VALIDATION FAILED (GAS-PAID):', validationGasPaid.error);
          console.error('⚠️ CONTINUING MINT: Gas-paid mapping stored but validation failed - education detection may be impacted');
          // DON'T THROW: Let mint complete even if validation fails
          debugLogger.operation('Gas-paid mapping validation failed but continuing mint', {
            tokenId,
            giftId: actualGiftIdGasPaid,
            validationError: validationGasPaid.error,
            educationModules: educationModules || []
          });
        } else {
          console.log('✅ MAPPING VALIDATED (GAS-PAID): Contract data confirms correct mapping');
        }
        
      } catch (mappingError) {
        console.error('❌ Failed to store/validate gift mapping (gas-paid):', mappingError);
        // CRITICAL: Don't fail the entire mint, but log this as a severe issue
        debugLogger.operation('CRITICAL: Gas-paid gift mapping storage/validation failed', {
          tokenId,
          giftId: actualGiftIdGasPaid,
          error: (mappingError as Error).message,
          stack: (mappingError as Error).stack,
          educationModules: educationModules || [],
          severity: 'CRITICAL'
        });
        
        // Store error in response for monitoring but continue with mint
        console.error('🚨 GAS-PAID MAPPING FAILURE - Education detection will not work for this gift!');
        // Don't throw - let the mint complete but track the issue
      }
      
      // Set escrow transaction hash for response
      escrowTransactionHash = escrowResult.transactionHash;
      
    } else {
      // DIRECT MINT: NFT was minted directly to creator, no escrow needed
      console.log('🎯 DIRECT MINT: NFT minted directly to creator, no escrow transfer needed');
      escrowTransactionHash = undefined;
    }
    
    // Step: Store salt for later claim process
    await storeSalt(tokenId, salt);
    
    // Step: Mark transaction as completed
    await markTransactionCompleted(transactionNonce, escrowTransactionHash || mintResult.transactionHash);
    
    console.log('🎉 Gas-paid escrow mint completed successfully');
    console.log('📊 Final result:', {
      tokenId,
      mintTxHash: mintResult.transactionHash,
      escrowTxHash: escrowTransactionHash,
      isEscrow: !!escrowTransactionHash,
      nftOwner: escrowTransactionHash ? 'ESCROW_CONTRACT' : 'CREATOR_WALLET'
    });
    
    return {
      success: true,
      tokenId,
      giftId: actualGiftIdGasPaid, // CRITICAL FIX: Return giftId to enable education requirements storage
      transactionHash: mintResult.transactionHash,
      escrowTransactionHash: escrowTransactionHash,
      salt,
      passwordHash
    };
    
  } catch (error: any) {
    console.error('❌ Gas-paid escrow mint failed:', error);
    console.error('❌ Full error details:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
      step: 'mintNFTEscrowGasPaid'
    });
    
    // Mark transaction as failed if nonce was generated
    if (transactionNonce) {
      await markTransactionFailed(transactionNonce, error.message);
    }
    
    return {
      success: false,
      error: `Gas-paid escrow mint failed: ${error.message || 'Unknown error'}`,
      details: error.stack?.substring(0, 500)
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MintEscrowResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }
  
  try {
    // Authenticate request using JWT
    const authResult = authenticate(req);
    if (!authResult.success) {
      return res.status(401).json({ 
        success: false, 
        error: authResult.error || 'Unauthorized' 
      });
    }
    
    const authenticatedAddress = authResult.address!;
    console.log('🔐 Request authenticated for address:', authenticatedAddress.slice(0, 10) + '...');
    
    // PROTOCOL V2 TYPE C: Resolve publicBaseUrl once for all operations (no req? fragility)
    const publicBaseUrl = getPublicBaseUrl(req);
    console.log('🌐 Public base URL resolved:', publicBaseUrl);
    
    // Enhanced environment variable validation with detailed logging
    const requiredEnvVars = {
      PRIVATE_KEY_DEPLOY: process.env.PRIVATE_KEY_DEPLOY,
      NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS,
      ESCROW_CONTRACT_ADDRESS: ESCROW_CONTRACT_ADDRESS,
      NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS,
      NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
      NEXT_PUBLIC_TW_CLIENT_ID: process.env.NEXT_PUBLIC_TW_CLIENT_ID
    };
    
    console.log('🔍 Environment variables check:', {
      PRIVATE_KEY_DEPLOY: !!process.env.PRIVATE_KEY_DEPLOY,
      NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS: !!process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS,
      ESCROW_CONTRACT_ADDRESS: !!ESCROW_CONTRACT_ADDRESS,
      NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS: !!process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS,
      NEXT_PUBLIC_RPC_URL: !!process.env.NEXT_PUBLIC_RPC_URL,
      NEXT_PUBLIC_TW_CLIENT_ID: !!process.env.NEXT_PUBLIC_TW_CLIENT_ID,
      configStatus: 'Environment variables loaded'
    });
    
    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars);
      return res.status(500).json({ 
        success: false, 
        error: `Server configuration error: Missing ${missingVars.join(', ')}` 
      });
    }
    
    console.log('✅ Environment validation passed for mint-escrow API');
    
    // Parse and validate request body
    const {
      metadataUri,
      recipientAddress,
      password,
      timeframeDays,
      giftMessage,
      creatorAddress,
      gasless = false, // 🚨 TEMPORARILY DISABLED: Gasless flow disabled to focus on robust gas-paid implementation
      educationModules = [] // Optional education requirements
    }: MintEscrowRequest = req.body;
    
    // 🚨 TEMPORARY GASLESS DISABLE: Force gas-paid for system robustness
    const gaslessTemporarilyDisabled = true;
    const finalGasless = gaslessTemporarilyDisabled ? false : gasless;
    
    if (gasless && gaslessTemporarilyDisabled) {
      console.log('⚠️ GASLESS TEMPORARILY DISABLED: Redirecting to robust gas-paid implementation');
      console.log('📋 Reason: Focusing on gas-paid robustness before re-enabling gasless features');
    }
    
    // Validation - password is optional for direct minting (skip escrow)
    if (!metadataUri || !giftMessage || !creatorAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: metadataUri, giftMessage, creatorAddress' 
      });
    }
    
    // Verify that authenticated address matches the creatorAddress in request
    if (authenticatedAddress.toLowerCase() !== creatorAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only create gifts from your authenticated wallet address'
      });
    }
    
    // Determine if this is escrow or direct mint
    const isEscrowMint = !!password;
    const isDirectMint = !password;
    
    // For escrow mints, password is required and must be valid
    if (isEscrowMint) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ 
          success: false, 
          error: passwordValidation.message 
        });
      }
    }
    
    // For direct mint (skip escrow), password is not required
    if (isDirectMint) {
      console.log('🚀 DIRECT MINT MODE: Skip escrow enabled, minting directly to creator');
    }
    
    const messageValidation = validateGiftMessage(giftMessage);
    if (!messageValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: messageValidation.message 
      });
    }
    
    // Sanitize gift message to prevent XSS
    const sanitizedGiftMessage = sanitizeGiftMessage(giftMessage);
    
    // For escrow mints, timeframe is required and must be valid
    if (isEscrowMint && !(timeframeDays in TIMEFRAME_OPTIONS)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid timeframe option' 
      });
    }
    
    // Derive deployer address from private key for neutral custody
    const deployerAccount = privateKeyToAccount({
      client,
      privateKey: process.env.PRIVATE_KEY_DEPLOY!
    });
    
    // Determine target address and timeframe based on mint type
    let targetAddress: string;
    let timeframeIndex: number | undefined;
    
    if (isDirectMint) {
      // Direct mint: Always mint to creator (skip escrow)
      targetAddress = creatorAddress;
      timeframeIndex = undefined; // No timeframe needed for direct mints
      console.log('🎯 DIRECT MINT TARGET:', targetAddress.slice(0, 10) + '...');
    } else {
      // V2 ZERO CUSTODY: Mint directly to escrow contract, use registerGiftMinted
      targetAddress = ESCROW_CONTRACT_ADDRESS || '';
      timeframeIndex = TIMEFRAME_OPTIONS[timeframeDays];
      console.log('🔒 ESCROW MINT TARGET (V2 ZERO CUSTODY - direct to escrow):', targetAddress.slice(0, 10) + '...');
      
      if (!ESCROW_CONTRACT_ADDRESS) {
        throw new Error('ESCROW_CONTRACT_ADDRESS not configured');
      }
      console.log('✅ ESCROW CONTRACT ADDRESS V2:', ESCROW_CONTRACT_ADDRESS);
    }
    
    console.log('🎁 MINT ESCROW REQUEST:', {
      timeframe: timeframeDays,
      requestedGasless: gasless,
      finalGasless: finalGasless,
      gaslessStatus: gaslessTemporarilyDisabled ? 'DISABLED_FOR_ROBUSTNESS' : 'ENABLED',
      recipientAddress: targetAddress.slice(0, 10) + '...',
      messageLength: giftMessage.length,
      escrowContract: ESCROW_CONTRACT_ADDRESS?.slice(0, 10) + '...',
      nftContract: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS?.slice(0, 10) + '...',
      hasRpcUrl: !!process.env.NEXT_PUBLIC_RPC_URL
    });
    
    // Choose minting strategy based on escrow vs direct mint
    let result;
    
    if (isDirectMint) {
      console.log('🎯 DIRECT MINT: Bypassing escrow, minting directly to creator');
      result = await mintNFTDirectly(
        targetAddress,
        metadataUri,
        sanitizedGiftMessage,
        creatorAddress,
        publicBaseUrl
      );
      // Direct mints are always gasless from user perspective (deployer pays)
      result.gasless = true;
    } else {
      // Escrow mint - use finalGasless (which respects temporary disable)
      if (finalGasless && !gaslessTemporarilyDisabled) {
        console.log('🚀 Attempting gasless escrow mint...');
        result = await mintNFTEscrowGasless(
          targetAddress,
          metadataUri,
          password,
          timeframeIndex!,
          sanitizedGiftMessage,
          creatorAddress,
          publicBaseUrl,
          educationModules
        );
        
        // If gasless fails, fallback to gas-paid
        if (!result.success) {
          console.log('⚠️ Gasless failed, attempting gas-paid fallback...');
          result = await mintNFTEscrowGasPaid(
            targetAddress,
            metadataUri,
            password,
            timeframeIndex!,
            sanitizedGiftMessage,
            creatorAddress,
            publicBaseUrl,
            educationModules
          );
          result.gasless = false;
        } else {
          result.gasless = true;
        }
      } else {
        // Either gasless was not requested OR gasless is temporarily disabled
        const reason = gaslessTemporarilyDisabled ? 
          'GASLESS TEMPORARILY DISABLED for system robustness - using gas-paid' : 
          'Gas-paid mint requested by user';
        console.log(`💰 ${reason}`);
        
        result = await mintNFTEscrowGasPaid(
          targetAddress,
          metadataUri,
          password,
          timeframeIndex!,
          sanitizedGiftMessage,
          creatorAddress,
          publicBaseUrl,
          educationModules
        );
        result.gasless = false;
      }
    }
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Escrow mint failed'
      });
    }
    
    // Calculate expiration time (only for escrow mints)
    let expirationTime: number | undefined;
    let giftLink: string | undefined;
    
    if (isEscrowMint && timeframeIndex !== undefined) {
      const timeConstants = {
        [TIMEFRAME_OPTIONS.FIFTEEN_MINUTES]: 900,    // 15 minutes
        [TIMEFRAME_OPTIONS.SEVEN_DAYS]: 604800,      // 7 days
        [TIMEFRAME_OPTIONS.FIFTEEN_DAYS]: 1296000,   // 15 days
        [TIMEFRAME_OPTIONS.THIRTY_DAYS]: 2592000     // 30 days
      };
      
      const currentTime = Math.floor(Date.now() / 1000);
      expirationTime = currentTime + timeConstants[timeframeIndex];
      
      // Generate gift link for escrow mints
      const baseUrl = req.headers.host ? `https://${req.headers.host}` : '';
      giftLink = `${baseUrl}/gift/claim/${result.tokenId}`;
    } else {
      // Direct mints don't have expiration or gift links
      expirationTime = undefined;
      giftLink = undefined;
    }
    
    // Get current rate limit status
    const finalRateLimit = checkRateLimit(creatorAddress);
    
    const logMessage = isDirectMint ? 'DIRECT MINT SUCCESS' : 'ENHANCED ESCROW MINT SUCCESS';
    console.log(`🎉 ${logMessage}:`, {
      mintType: isDirectMint ? 'DIRECT' : 'ESCROW',
      tokenId: result.tokenId,
      gasless: result.gasless,
      transactionHash: result.transactionHash,
      escrowTransactionHash: result.escrowTransactionHash,
      nonce: result.nonce?.slice(0, 10) + '...',
      message: result.message,
      rateLimit: finalRateLimit
    });
    
    // Build response based on mint type
    const responseData: any = {
      success: true,
      tokenId: result.tokenId,
      transactionHash: result.transactionHash,
      gasless: result.gasless,
      rateLimit: {
        remaining: finalRateLimit.remaining,
        resetTime: finalRateLimit.resetTime
      }
    };
    
    // Add gasless status message if user requested gasless but it was disabled
    if (gasless && gaslessTemporarilyDisabled && !result.gasless) {
      responseData.gaslessDisabledMessage = "⚠️ Gasless transactions are temporarily disabled to ensure system robustness. Your transaction was processed using gas-paid method (deployer covers gas costs).";
      responseData.gaslessStatus = "temporarily_disabled";
    }
    
    if (isEscrowMint) {
      // Add escrow-specific fields
      responseData.escrowTransactionHash = result.escrowTransactionHash;
      responseData.giftLink = giftLink;
      responseData.salt = result.salt;
      responseData.passwordHash = result.passwordHash;
      responseData.expirationTime = expirationTime;
      responseData.nonce = result.nonce;
    } else {
      // Add direct mint specific message
      responseData.message = result.message || `NFT minted directly to your wallet. Token ID: ${result.tokenId}`;
      responseData.directMint = true;
    }

    // 🚨 OBSOLETE BLOCK REMOVED: Old temporal metadata storage moved to after metadataUpdateResult
    // The new logic stores FINAL metadata (with tokenId) instead of temporal metadata
    
    // Store education requirements if provided
    if (educationModules && educationModules.length > 0 && result.giftId !== undefined) {
      try {
        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL!,
          token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        });
        
        // NEW: Unified education key with versioned payload
        const educationKey = `education:gift:${result.giftId}`;
        
        // DETERMINISTIC HASH: Sort modules for stable hash
        const sortedModules = [...educationModules].sort((a, b) => a - b);
        const deterministicPayload = JSON.stringify(sortedModules, Object.keys(sortedModules).sort());
        
        const educationData = {
          hasEducation: true,
          profileId: educationModules.length > 0 ? 1 : 0, // 1=basic, 2=advanced, etc
          version: 1, // For invalidating old signatures
          modules: sortedModules, // Always sorted for consistency
          policyHash: ethers.keccak256(ethers.toUtf8Bytes(deterministicPayload)),
          tokenId: result.tokenId,
          giftId: result.giftId,
          createdAt: new Date().toISOString()
        };

        await redis.setex(educationKey, 90 * 24 * 60 * 60, JSON.stringify(educationData));

        // Log securely (hash only, no PII)
        console.log('✅ Education requirements stored:', {
          giftId: result.giftId,
          hasEducation: true,
          policyHash: educationData.policyHash.slice(0, 10) + '...',
          version: educationData.version
        });
        
        // SECURE EDUCATION AUDIT - no module content exposed
        console.log('📚 EDUCATION AUDIT:', {
          giftId: result.giftId,
          hasEducation: educationModules?.length > 0,
          policyHash: ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify([...educationModules].sort((a, b) => a - b)))).slice(0, 10) + '...',
          source: 'redis_unified',
          version: 1,
          timestamp: new Date().toISOString()
        });
        debugLogger.operation('Education requirements stored', {
          giftId: result.giftId,
          tokenId: result.tokenId,
          moduleCount: educationModules.length,
          policyHash: ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify([...educationModules].sort((a, b) => a - b)))).slice(0, 10) + '...'
        });
      } catch (error) {
        console.warn('⚠️ Failed to store education requirements:', error);
        // Non-critical error - continue with response
      }
    }
    
    return res.status(200).json(responseData);
    
  } catch (error: any) {
    console.error('💥 MINT ESCROW API ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

// 🔥 CRITICAL FIX ERROR #2: Store metadata in Redis early to prevent permanent placeholder
async function storeMetadataInRedisEarly(
  metadataUpdateResult: any, 
  tokenId: string, 
  actualImageCid: string, 
  giftMessage: string,
  creatorAddress: string,
  isEscrowMint: boolean,
  mintTransactionHash: string
): Promise<void> {
  try {
    console.log('💾 Early Redis storage: Extracting metadata CIDs...');
    
    // Extract metadata CID from FINAL metadataUrl
    let finalMetadataIpfsCid = '';
    let finalImageIpfsCid = '';
    
    const finalMetadataUrl = metadataUpdateResult.metadataUrl;
    
    if (finalMetadataUrl && finalMetadataUrl.startsWith('ipfs://')) {
      finalMetadataIpfsCid = finalMetadataUrl.replace('ipfs://', '');
    } else if (finalMetadataUrl && finalMetadataUrl.includes('/ipfs/')) {
      const match = finalMetadataUrl.match(/\/ipfs\/(.+)$/);
      if (match) {
        finalMetadataIpfsCid = match[1];
      }
    }
    
    // Use actualImageCid as fallback since we have it available
    finalImageIpfsCid = actualImageCid?.replace('ipfs://', '') || '';
    
    console.log('✅ Early Redis storage: CIDs extracted:', {
      metadataCid: finalMetadataIpfsCid.substring(0, 20) + '...',
      imageCid: finalImageIpfsCid.substring(0, 20) + '...'
    });
    
    // Create metadata for Redis storage
    const baseAttributes = [
      { trait_type: "Token ID", value: tokenId },
      { trait_type: "Creation Date", value: new Date().toISOString() },
      { trait_type: "Platform", value: "CryptoGift Wallets" },
      { trait_type: "Gift Type", value: isEscrowMint ? "Temporal Escrow" : "Direct Mint" },
      { trait_type: "Creator", value: creatorAddress.slice(0, 10) + '...' }
    ];
    
    if (isEscrowMint) {
      baseAttributes.push(
        { trait_type: "Security", value: "Password Protected" }
      );
    }
    
    const finalNftMetadata = createNFTMetadata({
      contractAddress: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
      tokenId: tokenId,
      name: `CryptoGift NFT #${tokenId}`,
      description: giftMessage || "Un regalo cripto único creado con amor",
      imageIpfsCid: finalImageIpfsCid,
      metadataIpfsCid: finalMetadataIpfsCid,
      attributes: baseAttributes,
      mintTransactionHash: mintTransactionHash,
      owner: creatorAddress,
      creatorWallet: creatorAddress
    });
    
    await storeMetadataWithRetry(finalNftMetadata, 3);
    console.log('✅ Early Redis storage: Metadata stored successfully before tokenURI update');
    
  } catch (error) {
    console.error('❌ Early Redis storage failed:', error);
    // Don't throw - we'll try again later in the normal flow
    console.log('⚠️ Early storage failed, will retry in normal flow');
  }
}

// 🔥 CRITICAL FIX: Verify token exists on-chain before updating tokenURI
async function verifyTokenExists(nftContract: any, tokenId: string, maxRetries: number = 5): Promise<void> {
  console.log(`🔍 Verifying token ${tokenId} exists on-chain (max ${maxRetries} attempts)...`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Attempt ${attempt}/${maxRetries}: Checking token existence...`);
      
      // Try to read the owner of the token
      const owner = await readContract({
        contract: nftContract,
        method: "function ownerOf(uint256 tokenId) view returns (address)",
        params: [BigInt(tokenId)]
      });
      
      if (owner && owner !== '0x0000000000000000000000000000000000000000') {
        console.log(`✅ Token ${tokenId} exists on-chain, owner: ${owner}`);
        return; // Success!
      } else {
        throw new Error(`Token exists but has zero address owner: ${owner}`);
      }
      
    } catch (error) {
      console.log(`⏳ Attempt ${attempt}/${maxRetries} failed: ${(error as Error).message}`);
      
      if (attempt === maxRetries) {
        throw new Error(`Token ${tokenId} does not exist on-chain after ${maxRetries} attempts. Last error: ${(error as Error).message}`);
      }
      
      // Wait with exponential backoff: 1s, 2s, 4s, 8s
      const delayMs = Math.pow(2, attempt - 1) * 1000;
      console.log(`⏳ Waiting ${delayMs}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}
