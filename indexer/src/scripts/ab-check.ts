#!/usr/bin/env node

/**
 * 🔄 A/B Testing Script
 * Compare database vs onchain results for validation
 */

import { initDatabase, closeDatabase, getGiftMapping } from '../database.js';
import { getLogs } from '../rpc.js';
import { processLog } from '../event-processor.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

// A/B Test Configuration
const AB_CONFIG = {
  SAMPLE_SIZE: 100,           // Number of tokenIds to test
  MAX_RETRIES: 3,            // Retries for RPC calls
  RETRY_DELAY_MS: 1000,      // Delay between retries
  BLOCK_RANGE: 50000,        // Blocks to search for comparison
};

// Test Result Interface
interface ABTestResult {
  tokenId: string;
  dbResult: {
    found: boolean;
    giftId?: string;
    blockNumber?: number;
    txHash?: string;
  };
  onchainResult: {
    found: boolean;
    giftId?: string;
    blockNumber?: number;
    txHash?: string;
  };
  match: boolean;
  discrepancy?: string;
}

// A/B Test Summary
interface ABTestSummary {
  totalTests: number;
  matches: number;
  mismatches: number;
  dbOnlyCount: number;
  onchainOnlyCount: number;
  errorCount: number;
  matchPercentage: number;
  results: ABTestResult[];
}

// Run A/B comparison test
async function runABTest(): Promise<ABTestSummary> {
  logger.info('🔄 Starting A/B validation test...');
  
  try {
    // Initialize database
    await initDatabase();
    
    // Get sample tokenIds from database
    const sampleTokenIds = await getSampleTokenIds();
    
    if (sampleTokenIds.length === 0) {
      throw new Error('No tokenIds found in database for testing');
    }
    
    logger.info(`📊 Testing ${sampleTokenIds.length} tokenIds...`);
    
    const results: ABTestResult[] = [];
    let errorCount = 0;
    
    // Test each tokenId
    for (let i = 0; i < sampleTokenIds.length; i++) {
      const tokenId = sampleTokenIds[i];
      
      try {
        logger.debug(`🔍 Testing tokenId ${tokenId} (${i + 1}/${sampleTokenIds.length})`);
        
        const result = await testTokenId(tokenId);
        results.push(result);
        
        // Progress indicator
        if ((i + 1) % 10 === 0) {
          const matches = results.filter(r => r.match).length;
          const percent = ((i + 1) / sampleTokenIds.length * 100).toFixed(1);
          logger.info(`📈 Progress: ${percent}% (${matches}/${i + 1} matches so far)`);
        }
        
      } catch (error) {
        logger.error(`❌ Error testing tokenId ${tokenId}:`, error);
        errorCount++;
        
        // Add error result
        results.push({
          tokenId,
          dbResult: { found: false },
          onchainResult: { found: false },
          match: false,
          discrepancy: `Test error: ${error.message}`
        });
      }
      
      // Small delay to avoid overwhelming RPC
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Calculate summary
    const matches = results.filter(r => r.match).length;
    const mismatches = results.filter(r => !r.match).length;
    const dbOnlyCount = results.filter(r => r.dbResult.found && !r.onchainResult.found).length;
    const onchainOnlyCount = results.filter(r => !r.dbResult.found && r.onchainResult.found).length;
    const matchPercentage = (matches / results.length) * 100;
    
    const summary: ABTestSummary = {
      totalTests: results.length,
      matches,
      mismatches,
      dbOnlyCount,
      onchainOnlyCount,
      errorCount,
      matchPercentage,
      results
    };
    
    return summary;
    
  } finally {
    await closeDatabase();
  }
}

// Get random sample of tokenIds from database
async function getSampleTokenIds(): Promise<string[]> {
  const query = `
    SELECT token_id 
    FROM gift_mappings 
    ORDER BY RANDOM() 
    LIMIT $1
  `;
  
  try {
    const { getPool } = await import('../database.js');
    const result = await getPool().query(query, [AB_CONFIG.SAMPLE_SIZE]);
    return result.rows.map(row => row.token_id);
  } catch (error) {
    logger.error('❌ Failed to get sample tokenIds:', error);
    return [];
  }
}

// Test a specific tokenId against both sources
async function testTokenId(tokenId: string): Promise<ABTestResult> {
  // Get result from database
  const dbResult = await getDbResult(tokenId);
  
  // Get result from onchain search
  const onchainResult = await getOnchainResult(tokenId);
  
  // Compare results
  const match = compareResults(dbResult, onchainResult);
  
  return {
    tokenId,
    dbResult,
    onchainResult,
    match,
    discrepancy: match ? undefined : generateDiscrepancyMessage(dbResult, onchainResult)
  };
}

// Get result from database
async function getDbResult(tokenId: string): Promise<ABTestResult['dbResult']> {
  try {
    const mapping = await getGiftMapping(tokenId);
    
    if (!mapping) {
      return { found: false };
    }
    
    return {
      found: true,
      giftId: mapping.giftId,
      blockNumber: mapping.blockNumber,
      txHash: mapping.txHash
    };
  } catch (error) {
    logger.warn(`⚠️ Database lookup failed for tokenId ${tokenId}:`, error);
    return { found: false };
  }
}

// Get result from onchain search (simplified version)
async function getOnchainResult(tokenId: string): Promise<ABTestResult['onchainResult']> {
  try {
    // Search recent blocks for the event
    const { getCurrentBlockNumber } = await import('../rpc.js');
    const currentBlock = await getCurrentBlockNumber();
    const fromBlock = Math.max(currentBlock - AB_CONFIG.BLOCK_RANGE, config.deploymentBlock);
    
    const logs = await getLogs(fromBlock, currentBlock);
    
    // Find log that contains this tokenId
    for (const log of logs) {
      try {
        const processedEvent = await processLog(log);
        
        if (processedEvent && processedEvent.tokenId === tokenId) {
          return {
            found: true,
            giftId: processedEvent.giftId,
            blockNumber: processedEvent.blockNumber,
            txHash: processedEvent.txHash
          };
        }
      } catch (error) {
        // Skip malformed logs
        continue;
      }
    }
    
    return { found: false };
    
  } catch (error) {
    logger.warn(`⚠️ Onchain lookup failed for tokenId ${tokenId}:`, error);
    return { found: false };
  }
}

// Compare database and onchain results
function compareResults(
  dbResult: ABTestResult['dbResult'],
  onchainResult: ABTestResult['onchainResult']
): boolean {
  // Both not found - match
  if (!dbResult.found && !onchainResult.found) {
    return true;
  }
  
  // One found, other not - mismatch
  if (dbResult.found !== onchainResult.found) {
    return false;
  }
  
  // Both found - compare details
  if (dbResult.found && onchainResult.found) {
    return dbResult.giftId === onchainResult.giftId &&
           dbResult.blockNumber === onchainResult.blockNumber &&
           dbResult.txHash === onchainResult.txHash;
  }
  
  return false;
}

// Generate discrepancy message
function generateDiscrepancyMessage(
  dbResult: ABTestResult['dbResult'],
  onchainResult: ABTestResult['onchainResult']
): string {
  if (dbResult.found && !onchainResult.found) {
    return 'Found in DB but not onchain (possible indexing ahead of search range)';
  }
  
  if (!dbResult.found && onchainResult.found) {
    return 'Found onchain but not in DB (indexing gap or processing error)';
  }
  
  if (dbResult.found && onchainResult.found) {
    const differences = [];
    if (dbResult.giftId !== onchainResult.giftId) {
      differences.push(`giftId: DB=${dbResult.giftId} vs onchain=${onchainResult.giftId}`);
    }
    if (dbResult.blockNumber !== onchainResult.blockNumber) {
      differences.push(`block: DB=${dbResult.blockNumber} vs onchain=${onchainResult.blockNumber}`);
    }
    if (dbResult.txHash !== onchainResult.txHash) {
      differences.push(`tx: DB=${dbResult.txHash} vs onchain=${onchainResult.txHash}`);
    }
    return `Data mismatch: ${differences.join(', ')}`;
  }
  
  return 'Unknown discrepancy';
}

// Display results
function displayResults(summary: ABTestSummary): void {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    A/B TEST RESULTS                         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📊 SUMMARY:`);
  console.log(`   Total Tests: ${summary.totalTests}`);
  console.log(`   Matches: ${summary.matches} (${summary.matchPercentage.toFixed(2)}%)`);
  console.log(`   Mismatches: ${summary.mismatches}`);
  console.log(`   DB Only: ${summary.dbOnlyCount}`);
  console.log(`   Onchain Only: ${summary.onchainOnlyCount}`);
  console.log(`   Errors: ${summary.errorCount}`);
  
  // Pass/Fail determination
  const passThreshold = 98; // 98% match rate required
  const isPassing = summary.matchPercentage >= passThreshold;
  
  console.log(`\n🎯 RESULT: ${isPassing ? '✅ PASSING' : '❌ FAILING'}`);
  console.log(`   Threshold: ${passThreshold}% match rate`);
  console.log(`   Actual: ${summary.matchPercentage.toFixed(2)}%`);
  
  // Show mismatches if any
  if (summary.mismatches > 0) {
    console.log(`\n❌ MISMATCHES (showing first 10):`);
    
    const mismatches = summary.results.filter(r => !r.match).slice(0, 10);
    for (const mismatch of mismatches) {
      console.log(`   TokenId ${mismatch.tokenId}: ${mismatch.discrepancy}`);
    }
    
    if (summary.mismatches > 10) {
      console.log(`   ... and ${summary.mismatches - 10} more`);
    }
  }
  
  console.log('\n');
}

// Handle CLI arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
CryptoGift Indexer - A/B Testing Script

Usage:
  npm run ab-check              Run A/B validation test
  npm run ab-check -- --size 50    Custom sample size
  npm run ab-check -- --help       Show this help

Description:
  This script compares database results with onchain searches
  to validate that the indexer is working correctly.
  
  It randomly samples tokenIds from the database and verifies
  that the same data can be found via blockchain event search.

Options:
  --size <number>    Sample size (default: 100)
  --range <number>   Block search range (default: 50000)
  --help            Show this help message

Examples:
  # Quick test with 20 samples
  npm run ab-check -- --size 20
  
  # Extended test with large range
  npm run ab-check -- --size 200 --range 100000
  `);
  process.exit(0);
}

// Parse arguments
const sizeIndex = args.indexOf('--size');
if (sizeIndex !== -1 && args[sizeIndex + 1]) {
  AB_CONFIG.SAMPLE_SIZE = parseInt(args[sizeIndex + 1]);
}

const rangeIndex = args.indexOf('--range');
if (rangeIndex !== -1 && args[rangeIndex + 1]) {
  AB_CONFIG.BLOCK_RANGE = parseInt(args[rangeIndex + 1]);
}

// Run the test
runABTest().then(summary => {
  displayResults(summary);
  
  // Exit with appropriate code
  const passThreshold = 98;
  const success = summary.matchPercentage >= passThreshold;
  process.exit(success ? 0 : 1);
  
}).catch(error => {
  logger.fatal('💀 A/B test crashed:', error);
  process.exit(1);
});