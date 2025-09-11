#!/usr/bin/env node

/**
 * AUTOMATIC DEBUG LOG CLEANUP SCRIPT
 * Replaces insecure console.log statements in debug files
 * with secure debugLogger calls
 * 
 * Made by mbxarts.com The Moon in a Box property
 */

const fs = require('fs');
const path = require('path');

// Files to clean (from our audit)
const filesToClean = [
  'src/pages/api/debug/fix-mapping.ts',
  'src/pages/api/debug/flow-test.ts',
  'src/pages/api/debug/flow-trace.ts',
  'src/pages/api/debug/forwarder-diagnosis.ts',
  'src/pages/api/debug/image-flow.ts',
  'src/pages/api/debug/image-trace.ts',
  'src/pages/api/debug/metadata.ts',
  'src/pages/api/debug/token-contract-check.ts',
  'src/pages/api/debug/token-numbering-check.ts'
];

// Patterns to replace (sensitive data patterns)
const sensitivePatterns = [
  // TokenId logging
  {
    pattern: /console\.log\(\s*[`"'].*tokenId.*[`"'],?\s*tokenId\s*\)/g,
    replacement: 'debugLogger.tokenCheck(tokenId, contractAddress, { exists: true })'
  },
  {
    pattern: /console\.log\(\s*[`"'].*Token\s+\$\{tokenId\}.*[`"']\s*\)/g,
    replacement: 'debugLogger.tokenCheck(tokenId, contractAddress, { verified: true })'
  },
  // GiftId logging
  {
    pattern: /console\.log\(\s*[`"'].*giftId.*[`"'],?\s*.*giftId.*\)/g,
    replacement: 'debugLogger.giftMapping(tokenId, giftId)'
  },
  // Contract address logging
  {
    pattern: /console\.log\(\s*[`"'].*contract.*[`"'],?\s*.*contract.*\)/g,
    replacement: 'debugLogger.operation("Contract check", { hasContract: true })'
  },
  // Generic error console.log
  {
    pattern: /console\.log\(\s*[`"']❌.*[`"'],?\s*.*error.*\)/g,
    replacement: 'debugLogger.error("Operation", error as Error)'
  },
  // Generic success console.log
  {
    pattern: /console\.log\(\s*[`"']✅.*[`"']\s*\)/g,
    replacement: 'debugLogger.operation("Success", { completed: true })'
  }
];

function cleanFile(filePath) {
  console.log(`🧹 Cleaning ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  
  // Add import if not present
  if (!content.includes("import { debugLogger }")) {
    // Find the last import
    const importLines = content.split('\n').filter(line => line.startsWith('import '));
    if (importLines.length > 0) {
      const lastImportIndex = content.lastIndexOf(importLines[importLines.length - 1]);
      const insertPoint = content.indexOf('\n', lastImportIndex) + 1;
      content = content.slice(0, insertPoint) + 
                "import { debugLogger } from '../../../lib/secureDebugLogger';\n" +
                content.slice(insertPoint);
      hasChanges = true;
    }
  }
  
  // Apply replacements for common sensitive patterns
  let originalContent = content;
  
  // Simple but safe replacements for known patterns
  content = content.replace(/console\.log\(\s*[`"']🔍.*tokenId.*[`"']\s*\)/g, 
    'debugLogger.operation("Token check initiated", { hasTokenId: true })');
  
  content = content.replace(/console\.log\(\s*[`"']📊.*giftCounter.*[`"'],?\s*Number\(giftCounter\)\s*\)/g,
    'debugLogger.contractCall("giftCounter", true)');
    
  content = content.replace(/console\.log\(\s*[`"']✅.*FOUND.*[`"']\s*\)/g,
    'debugLogger.operation("Target found", { success: true })');
    
  content = content.replace(/console\.log\(\s*[`"']❌.*Error.*[`"'],?\s*.*\.message\s*\)/g,
    'debugLogger.error("Operation", error as Error)');
  
  if (content !== originalContent) {
    hasChanges = true;
  }
  
  // Write back if changes were made
  if (hasChanges) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${filePath} cleaned successfully`);
  } else {
    console.log(`ℹ️  ${filePath} - No sensitive patterns found`);
  }
}

// Main execution
console.log('🛡️  Starting debug file cleanup...\n');

for (const file of filesToClean) {
  try {
    if (fs.existsSync(file)) {
      cleanFile(file);
    } else {
      console.log(`⚠️  File not found: ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error cleaning ${file}:`, error.message);
  }
}

console.log('\n🏆 Debug file cleanup completed!');
console.log('🔍 Run "grep -r console.log src/pages/api/debug/" to verify no sensitive logs remain');