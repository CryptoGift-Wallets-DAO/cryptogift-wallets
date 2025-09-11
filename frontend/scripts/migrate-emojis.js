#!/usr/bin/env node

/**
 * Emoji to Lucide Icon Migration Script
 * =====================================
 * 
 * This script helps identify and migrate emojis to Lucide icons
 * throughout the codebase using the SmartIcon component.
 * 
 * Usage: node scripts/migrate-emojis.js [component-path]
 */

const fs = require('fs');
const path = require('path');

// Common emoji patterns to look for
const emojiPatterns = [
  // Gift & Rewards
  { emoji: '🎁', lucide: 'Gift', category: 'rewards' },
  { emoji: '🏆', lucide: 'Trophy', category: 'rewards' },
  { emoji: '💎', lucide: 'Gem', category: 'rewards' },
  { emoji: '🥇', lucide: 'Medal', category: 'rewards' },
  { emoji: '🏅', lucide: 'Award', category: 'rewards' },
  { emoji: '👑', lucide: 'Crown', category: 'rewards' },
  
  // Navigation
  { emoji: '🚀', lucide: 'Rocket', category: 'navigation' },
  { emoji: '➡️', lucide: 'ArrowRight', category: 'navigation' },
  { emoji: '⬅️', lucide: 'ArrowLeft', category: 'navigation' },
  
  // Status
  { emoji: '✅', lucide: 'CheckCircle', category: 'status' },
  { emoji: '❌', lucide: 'X', category: 'status' },
  { emoji: '⚠️', lucide: 'AlertTriangle', category: 'status' },
  { emoji: '🔥', lucide: 'Flame', category: 'status' },
  { emoji: '⭐', lucide: 'Star', category: 'status' },
  { emoji: '✨', lucide: 'Sparkles', category: 'status' },
  { emoji: '🌟', lucide: 'Star', category: 'status' },
  
  // Wallet & Finance
  { emoji: '👛', lucide: 'Wallet', category: 'finance' },
  { emoji: '💰', lucide: 'Coins', category: 'finance' },
  { emoji: '💵', lucide: 'DollarSign', category: 'finance' },
  { emoji: '🪙', lucide: 'Coins', category: 'finance' },
  { emoji: '💳', lucide: 'CreditCard', category: 'finance' },
  { emoji: '🏦', lucide: 'Building2', category: 'finance' },
  
  // Files & Media
  { emoji: '🖼️', lucide: 'Image', category: 'media' },
  { emoji: '📷', lucide: 'Camera', category: 'media' },
  { emoji: '📁', lucide: 'Folder', category: 'media' },
  { emoji: '📄', lucide: 'FileText', category: 'media' },
  
  // Security
  { emoji: '🔒', lucide: 'Lock', category: 'security' },
  { emoji: '🔓', lucide: 'Unlock', category: 'security' },
  { emoji: '🔐', lucide: 'Key', category: 'security' },
  { emoji: '🛡️', lucide: 'Shield', category: 'security' },
  
  // Education
  { emoji: '🎓', lucide: 'GraduationCap', category: 'education' },
  { emoji: '📚', lucide: 'BookOpen', category: 'education' },
  { emoji: '📖', lucide: 'Book', category: 'education' },
  { emoji: '✏️', lucide: 'PenTool', category: 'education' },
  
  // Technology
  { emoji: '💻', lucide: 'Laptop', category: 'tech' },
  { emoji: '🖥️', lucide: 'Monitor', category: 'tech' },
  { emoji: '📱', lucide: 'Smartphone', category: 'tech' },
  { emoji: '🤖', lucide: 'Bot', category: 'tech' },
  
  // People
  { emoji: '👤', lucide: 'User', category: 'people' },
  { emoji: '👥', lucide: 'Users', category: 'people' },
  
  // Nature & Weather
  { emoji: '☀️', lucide: 'Sun', category: 'nature' },
  { emoji: '🌙', lucide: 'Moon', category: 'nature' },
  { emoji: '☁️', lucide: 'Cloud', category: 'nature' },
  
  // Tools
  { emoji: '🔧', lucide: 'Settings', category: 'tools' },
  { emoji: '⚙️', lucide: 'Settings', category: 'tools' },
  { emoji: '🔍', lucide: 'Search', category: 'tools' },
  { emoji: '🗑️', lucide: 'Trash2', category: 'tools' },
  
  // Misc
  { emoji: '🌐', lucide: 'Globe', category: 'misc' },
  { emoji: '🎯', lucide: 'Target', category: 'misc' },
  { emoji: '🧠', lucide: 'Brain', category: 'misc' },
  { emoji: '💡', lucide: 'Lightbulb', category: 'misc' },
  { emoji: '❤️', lucide: 'Heart', category: 'misc' },
];

function findEmojisInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const findings = [];
  
  emojiPatterns.forEach(pattern => {
    const regex = new RegExp(pattern.emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = content.match(regex);
    
    if (matches) {
      // Find line numbers
      const lines = content.split('\n');
      const lineNumbers = [];
      
      lines.forEach((line, index) => {
        if (line.includes(pattern.emoji)) {
          lineNumbers.push(index + 1);
        }
      });
      
      findings.push({
        emoji: pattern.emoji,
        lucide: pattern.lucide,
        category: pattern.category,
        count: matches.length,
        lines: lineNumbers
      });
    }
  });
  
  return findings;
}

function analyzeDirectory(dirPath) {
  const report = {};
  
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and .git
        if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
          walkDir(fullPath);
        }
      } else if (stat.isFile()) {
        // Only process TypeScript/JavaScript/JSX/TSX files
        if (/\.(ts|tsx|js|jsx)$/.test(file)) {
          const findings = findEmojisInFile(fullPath);
          
          if (findings.length > 0) {
            const relativePath = path.relative(process.cwd(), fullPath);
            report[relativePath] = findings;
          }
        }
      }
    });
  }
  
  walkDir(dirPath);
  return report;
}

function generateMigrationReport(report) {
  console.log('\n' + '='.repeat(80));
  console.log('EMOJI TO LUCIDE ICON MIGRATION REPORT');
  console.log('='.repeat(80) + '\n');
  
  let totalEmojis = 0;
  const categorySummary = {};
  
  Object.entries(report).forEach(([filePath, findings]) => {
    console.log(`\n📁 ${filePath}`);
    console.log('-'.repeat(40));
    
    findings.forEach(finding => {
      console.log(`  ${finding.emoji} → ${finding.lucide} (${finding.count}x) - Lines: ${finding.lines.join(', ')}`);
      totalEmojis += finding.count;
      
      if (!categorySummary[finding.category]) {
        categorySummary[finding.category] = 0;
      }
      categorySummary[finding.category] += finding.count;
    });
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total emojis found: ${totalEmojis}`);
  console.log('\nBy category:');
  
  Object.entries(categorySummary).forEach(([category, count]) => {
    console.log(`  ${category}: ${count}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('MIGRATION STEPS');
  console.log('='.repeat(80));
  console.log('1. Import SmartIcon: import { SmartIcon } from "./ui/SmartIcon";');
  console.log('2. Replace emoji strings with: <SmartIcon icon="🎁" />');
  console.log('3. Or use Lucide directly: import { Gift } from "lucide-react";');
  console.log('4. Test each component after migration');
  console.log('5. Commit changes incrementally\n');
}

// Main execution
const targetPath = process.argv[2] || './src';

if (!fs.existsSync(targetPath)) {
  console.error(`Error: Path "${targetPath}" does not exist`);
  process.exit(1);
}

console.log(`Analyzing ${targetPath} for emoji usage...`);
const report = analyzeDirectory(targetPath);
generateMigrationReport(report);

// Save report to file
const reportPath = './emoji-migration-report.json';
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n✅ Report saved to ${reportPath}\n`);