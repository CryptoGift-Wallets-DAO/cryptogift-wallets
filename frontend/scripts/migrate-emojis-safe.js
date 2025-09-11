#!/usr/bin/env node

/**
 * ENHANCED SAFE Emoji to Lucide Icon Migration Script
 * ===================================================
 * 
 * Enhanced script based on REAL production TypeScript errors.
 * Prevents specific compilation failures that blocked deployment.
 * 
 * ERRORS THIS SCRIPT PREVENTS:
 * - TS1117: Duplicate object properties
 * - TS2322: Lucide components where strings expected
 * - Missing imports causing compilation failures
 * 
 * Usage: node scripts/migrate-emojis-safe.js [component-path]
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

const fs = require('fs');
const path = require('path');

// Enhanced emoji-to-string mappings based on actual fixes
const safeEmojiMappings = {
  // Core icons from our actual migration
  '🎯': 'Target',
  '⚙️': 'Settings',
  '💎': 'Diamond',
  '🔺': 'Triangle',
  '🔵': 'Circle',
  '🛡️': 'Shield',
  '🚀': 'Rocket',
  '📚': 'BookOpen',
  '👛': 'Wallet',
  '⭐': 'Star',
  '✅': 'CheckCircle',
  '🔒': 'Lock',
  '👥': 'Users',
  '📱': 'Smartphone',
  '⚡': 'Zap',
  '📈': 'TrendingUp',
  '🔄': 'RefreshCw',
  '▶️': 'Play',
  '🏆': 'Trophy',
  '💡': 'Lightbulb',
  
  // Curriculum specific (actual mappings used)
  '◆': 'Diamond',
  '▲': 'Triangle',
  '◐': 'Circle',
  '♦': 'Diamond',
  '▼': 'ChevronDown',
  '◉': 'Circle',
  '★': 'Star',
  '✓': 'Check',
};

// Patterns that caused our actual compilation errors
const dangerousPatterns = [
  // Duplicate object properties (TS1117)
  {
    pattern: /(^[\s]*'([^']+)'[\s]*:[\s]*'[^']+',?[\s]*$)([\s\S]*?)(^[\s]*'\2'[\s]*:[\s]*'[^']+',?[\s]*$)/gm,
    description: 'Duplicate object properties (TS1117)',
    severity: 'CRITICAL'
  },
  
  // Lucide components in icon properties (TS2322)
  {
    pattern: /icon:\s*([A-Z][a-zA-Z]+)(?:\s*,|\s*})/g,
    description: 'Lucide component where string expected (TS2322)',
    severity: 'CRITICAL'
  },
  
  // Unused Lucide imports
  {
    pattern: /import\s*{\s*([^}]+)\s*}\s*from\s*['"]lucide-react['"];?/g,
    description: 'Potentially unused Lucide imports',
    severity: 'WARNING'
  },
  
  // Direct Lucide component usage without import
  {
    pattern: /<([A-Z][a-zA-Z]+)\s+className=/g,
    description: 'Direct Lucide usage - check imports',
    severity: 'WARNING'
  }
];

function analyzeFileForErrors(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const analysis = {
    file: filePath,
    errors: [],
    warnings: [],
    suggestions: []
  };
  
  // Check each dangerous pattern
  dangerousPatterns.forEach(({ pattern, description, severity }) => {
    const matches = [...content.matchAll(pattern)];
    
    if (matches.length > 0) {
      const issue = {
        pattern: description,
        severity,
        count: matches.length,
        matches: matches.slice(0, 3).map(match => ({
          text: match[0].trim(),
          index: match.index,
          line: content.substring(0, match.index).split('\n').length
        }))
      };
      
      if (severity === 'CRITICAL') {
        analysis.errors.push(issue);
      } else {
        analysis.warnings.push(issue);
      }
    }
  });
  
  // Check for potential duplicate properties more thoroughly
  const duplicates = findDuplicateProperties(content);
  if (duplicates.length > 0) {
    analysis.errors.push({
      pattern: 'Confirmed duplicate object properties',
      severity: 'CRITICAL',
      count: duplicates.length,
      matches: duplicates
    });
  }
  
  // Generate fix suggestions
  analysis.suggestions = generateFixSuggestions(content, analysis);
  
  return analysis;
}

function findDuplicateProperties(content) {
  const lines = content.split('\n');
  const propertyMap = new Map();
  const duplicates = [];
  
  lines.forEach((line, index) => {
    // Match object property patterns
    const match = line.match(/^\s*'([^']+)'\s*:\s*'[^']+',?\s*$/);
    if (match) {
      const property = match[1];
      if (propertyMap.has(property)) {
        duplicates.push({
          property,
          firstLine: propertyMap.get(property),
          duplicateLine: index + 1,
          text: line.trim()
        });
      } else {
        propertyMap.set(property, index + 1);
      }
    }
  });
  
  return duplicates;
}

function generateFixSuggestions(content, analysis) {
  const suggestions = [];
  
  // Suggest fixes for Lucide components in data
  const lucideInDataPattern = /icon:\s*([A-Z][a-zA-Z]+)/g;
  let match;
  
  while ((match = lucideInDataPattern.exec(content)) !== null) {
    const lucideComponent = match[1];
    const emoji = getEmojiForLucide(lucideComponent);
    
    if (emoji) {
      suggestions.push({
        type: 'replace',
        original: `icon: ${lucideComponent}`,
        fixed: `icon: '${emoji}'`,
        line: content.substring(0, match.index).split('\n').length,
        description: `Replace ${lucideComponent} with emoji string`
      });
    }
  }
  
  return suggestions;
}

function getEmojiForLucide(lucideComponent) {
  const lucideToEmoji = {
    'Target': '🎯',
    'Settings': '⚙️',
    'Diamond': '💎',
    'Triangle': '🔺',
    'Circle': '🔵',
    'Shield': '🛡️',
    'Rocket': '🚀',
    'BookOpen': '📚',
    'Wallet': '👛',
    'Star': '⭐',
    'CheckCircle': '✅',
    'Lock': '🔒',
    'Users': '👥',
    'Smartphone': '📱',
    'Zap': '⚡',
    'TrendingUp': '📈',
    'RefreshCw': '🔄',
    'Play': '▶️',
    'Trophy': '🏆',
    'Lightbulb': '💡',
    'ChevronDown': '🔽',
    'Square': '⬜',
    'Check': '✓',
  };
  
  return lucideToEmoji[lucideComponent] || null;
}

function generateSafetyReport(analyses) {
  console.log('\n' + '🛡️'.repeat(60));
  console.log('🚨 CRITICAL EMOJI MIGRATION SAFETY ANALYSIS 🚨');
  console.log('🛡️'.repeat(60) + '\n');
  
  let totalCriticalErrors = 0;
  let totalWarnings = 0;
  const criticalFiles = [];
  
  analyses.forEach(analysis => {
    if (!analysis) return;
    
    const errorCount = analysis.errors.length;
    const warningCount = analysis.warnings.length;
    
    totalCriticalErrors += errorCount;
    totalWarnings += warningCount;
    
    if (errorCount > 0) {
      criticalFiles.push(analysis.file);
      
      console.log(`\n🚨 CRITICAL ERRORS: ${analysis.file}`);
      console.log('='.repeat(50));
      
      analysis.errors.forEach(error => {
        console.log(`❌ ${error.pattern} (${error.severity})`);
        console.log(`   Count: ${error.count}`);
        
        if (error.matches) {
          error.matches.forEach(match => {
            if (match.line) {
              console.log(`   Line ${match.line}: ${match.text}`);
            } else {
              console.log(`   ${match.property}: Line ${match.firstLine} vs Line ${match.duplicateLine}`);
            }
          });
        }
      });
    }
    
    if (warningCount > 0) {
      console.log(`\n⚠️  WARNINGS: ${analysis.file}`);
      console.log('-'.repeat(30));
      
      analysis.warnings.forEach(warning => {
        console.log(`⚠️  ${warning.pattern}: ${warning.count} instances`);
      });
    }
    
    // Show fix suggestions
    if (analysis.suggestions.length > 0) {
      console.log(`\n🔧 SUGGESTED FIXES: ${analysis.file}`);
      console.log('-'.repeat(30));
      
      analysis.suggestions.forEach(suggestion => {
        console.log(`Line ${suggestion.line}: ${suggestion.original} → ${suggestion.fixed}`);
      });
    }
  });
  
  console.log('\n' + '📊'.repeat(60));
  console.log('MIGRATION SAFETY SUMMARY');
  console.log('📊'.repeat(60));
  console.log(`🚨 Critical errors: ${totalCriticalErrors}`);
  console.log(`⚠️  Warnings: ${totalWarnings}`);
  console.log(`📁 Files with critical errors: ${criticalFiles.length}`);
  
  if (totalCriticalErrors === 0) {
    console.log('\n✅ NO CRITICAL ERRORS! Safe to proceed with migration.');
    console.log('✅ TypeScript compilation should succeed.');
  } else {
    console.log('\n🛑 CRITICAL ERRORS FOUND! DO NOT PROCEED!');
    console.log('\n📋 REQUIRED ACTIONS BEFORE MIGRATION:');
    console.log('1. 🔴 Fix ALL duplicate object properties');
    console.log('2. 🔴 Replace ALL Lucide components with emoji strings in data');
    console.log('3. 🔴 Remove unused Lucide imports');
    console.log('4. 🔴 Run npm run type-check until it passes');
    console.log('5. 🔴 Only then proceed with migration');
    
    console.log('\n📖 FOLLOW THE GUIDE:');
    console.log('📋 EMOJI_TO_LUCIDE_MIGRATION_GUIDE.md');
  }
  
  return { totalCriticalErrors, totalWarnings, criticalFiles };
}

function generateAutoFixScript(analyses) {
  console.log('\n' + '🔧'.repeat(60));
  console.log('AUTO-FIX SCRIPT GENERATOR');
  console.log('🔧'.repeat(60));
  
  const fixCommands = [];
  
  analyses.forEach(analysis => {
    if (!analysis || !analysis.suggestions) return;
    
    analysis.suggestions.forEach(suggestion => {
      if (suggestion.type === 'replace') {
        // Generate safe sed command
        const escapedOriginal = suggestion.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedFixed = suggestion.fixed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        fixCommands.push(
          `# Fix line ${suggestion.line} in ${analysis.file}`,
          `sed -i 's/${escapedOriginal}/${escapedFixed}/g' "${analysis.file}"`
        );
      }
    });
  });
  
  if (fixCommands.length > 0) {
    console.log('\n📝 Auto-fix commands (review before running):');
    console.log('#!/bin/bash');
    console.log('# Auto-generated fix script - REVIEW BEFORE RUNNING');
    fixCommands.forEach(cmd => console.log(cmd));
    
    console.log('\n⚠️  IMPORTANT:');
    console.log('1. Review each command before running');
    console.log('2. Backup your files first');
    console.log('3. Run npm run type-check after each fix');
    console.log('4. Fix duplicate properties manually');
  } else {
    console.log('No auto-fixes available. Manual fixes required.');
  }
}

// Main execution
const targetPath = process.argv[2] || './src';

console.log(`🔍 Running ENHANCED safety analysis on ${targetPath}...`);
console.log('🛡️  Based on REAL production TypeScript errors');

if (!fs.existsSync(targetPath)) {
  console.error(`❌ Path "${targetPath}" does not exist`);
  process.exit(1);
}

const analyses = [];

if (fs.statSync(targetPath).isFile()) {
  // Analyze single file
  const analysis = analyzeFileForErrors(targetPath);
  if (analysis) analyses.push(analysis);
} else {
  // Analyze directory
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
          walkDir(fullPath);
        }
      } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
        const analysis = analyzeFileForErrors(fullPath);
        if (analysis) analyses.push(analysis);
      }
    });
  }
  
  walkDir(targetPath);
}

const summary = generateSafetyReport(analyses);
generateAutoFixScript(analyses);

// Save detailed report
const reportPath = './emoji-migration-safety-report.json';
fs.writeFileSync(reportPath, JSON.stringify(analyses, null, 2));
console.log(`\n💾 Detailed report saved to ${reportPath}`);

console.log('\n🎯 Safety analysis completed!');
console.log('📋 Next: Follow EMOJI_TO_LUCIDE_MIGRATION_GUIDE.md\n');

// Exit with error code if critical issues found
process.exit(summary.totalCriticalErrors > 0 ? 1 : 0);