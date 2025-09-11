#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const LOCALES = ['es', 'en'];
const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

/**
 * Get all keys from a nested object
 */
function getAllKeys(obj, prefix = '') {
  let keys = [];
  
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * Load all translation files for a locale
 */
function loadLocaleMessages(locale) {
  const localeDir = path.join(LOCALES_DIR, locale);
  const messages = {};
  
  if (!fs.existsSync(localeDir)) {
    console.error(`${colors.red}❌ Locale directory not found: ${localeDir}${colors.reset}`);
    return messages;
  }
  
  const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    const filePath = path.join(localeDir, file);
    const namespace = path.basename(file, '.json');
    
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      messages[namespace] = content;
    } catch (error) {
      console.error(`${colors.red}❌ Error loading ${filePath}: ${error.message}${colors.reset}`);
    }
  }
  
  return messages;
}

/**
 * Compare translation keys between locales
 */
function compareTranslations() {
  console.log('🔍 Checking translation keys...\n');
  
  const allMessages = {};
  const allKeys = new Set();
  
  // Load all messages and collect all keys
  for (const locale of LOCALES) {
    allMessages[locale] = loadLocaleMessages(locale);
    
    for (const namespace in allMessages[locale]) {
      const keys = getAllKeys(allMessages[locale][namespace], namespace);
      keys.forEach(key => allKeys.add(key));
    }
  }
  
  // Check for missing keys
  let hasErrors = false;
  const missingKeys = {};
  
  for (const locale of LOCALES) {
    missingKeys[locale] = [];
    
    for (const key of allKeys) {
      const [namespace, ...keyParts] = key.split('.');
      const keyPath = keyParts.join('.');
      
      if (!allMessages[locale][namespace]) {
        missingKeys[locale].push(key);
        continue;
      }
      
      // Check if key exists in this locale
      let current = allMessages[locale][namespace];
      for (const part of keyParts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part];
        } else {
          missingKeys[locale].push(key);
          break;
        }
      }
    }
  }
  
  // Report results
  for (const locale of LOCALES) {
    if (missingKeys[locale].length > 0) {
      hasErrors = true;
      console.log(`${colors.red}❌ Missing keys in ${locale}:${colors.reset}`);
      missingKeys[locale].forEach(key => {
        console.log(`   - ${key}`);
      });
      console.log('');
    } else {
      console.log(`${colors.green}✅ All keys present in ${locale}${colors.reset}`);
    }
  }
  
  // Check for orphaned keys (keys that exist in one locale but not in others)
  console.log('\n🔍 Checking for orphaned keys...\n');
  
  for (const locale of LOCALES) {
    const orphaned = [];
    
    for (const namespace in allMessages[locale]) {
      const keys = getAllKeys(allMessages[locale][namespace], namespace);
      
      for (const key of keys) {
        let isOrphaned = false;
        
        for (const otherLocale of LOCALES) {
          if (otherLocale === locale) continue;
          
          const [ns, ...keyParts] = key.split('.');
          
          if (!allMessages[otherLocale][ns]) {
            isOrphaned = true;
            break;
          }
          
          let current = allMessages[otherLocale][ns];
          for (const part of keyParts) {
            if (!(current && typeof current === 'object' && part in current)) {
              isOrphaned = true;
              break;
            }
            current = current[part];
          }
        }
        
        if (isOrphaned && !orphaned.includes(key)) {
          orphaned.push(key);
        }
      }
    }
    
    if (orphaned.length > 0) {
      console.log(`${colors.yellow}⚠️  Orphaned keys in ${locale} (not in other locales):${colors.reset}`);
      orphaned.forEach(key => {
        console.log(`   - ${key}`);
      });
      console.log('');
    }
  }
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Total unique keys: ${allKeys.size}`);
  
  for (const locale of LOCALES) {
    const totalKeys = Object.values(allMessages[locale])
      .flatMap(ns => getAllKeys(ns))
      .length;
    const missing = missingKeys[locale].length;
    const coverage = totalKeys > 0 ? ((totalKeys / allKeys.size) * 100).toFixed(1) : 0;
    
    console.log(`   ${locale}: ${totalKeys} keys (${coverage}% coverage, ${missing} missing)`);
  }
  
  if (hasErrors) {
    console.log(`\n${colors.red}❌ Translation check failed! Fix missing keys before committing.${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}✅ All translations are in sync!${colors.reset}`);
    process.exit(0);
  }
}

// Run the check
compareTranslations();