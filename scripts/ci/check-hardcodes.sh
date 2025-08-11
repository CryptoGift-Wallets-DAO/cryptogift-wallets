#!/usr/bin/env bash
set -euo pipefail

# CI/CD HARDCODE PREVENTION SCRIPT
# Prevents regression of hardcoded domains, obsolete utils, and User-Agent dependencies
# Made by mbxarts.com The Moon in a Box property
# Co-Author: Godez22

echo "🔍 Running hardcode detection checks..."

# Check if ripgrep is available, fallback to grep if not
if command -v rg &> /dev/null; then
  echo "   Using ripgrep for enhanced performance"
  USE_RIPGREP=true
else
  echo "   Using grep (install ripgrep for better performance)"
  USE_RIPGREP=false
fi

# Check for direct hardcoded domains - NO FALLBACK EXCEPTIONS  
if [ "$USE_RIPGREP" = true ]; then
  HARDCODE_COUNT=$(rg "cryptogift-wallets\.vercel\.app" . --type ts --type tsx --type js --type mjs --count --no-heading | grep -v ".env.example" | grep -v "process\.env\." | grep -v "DEVELOPMENT\.md" | grep -v "README\.md" | grep -v "QUICK_FIX" | grep -v "BICONOMY_SETUP" | grep -v "deploy-contract.js" | grep -v "deploy-script.js" | grep -v "deploy-nft.js" | awk -F: '{sum += $2} END {print sum+0}')
else
  HARDCODE_COUNT=$(grep -r "cryptogift-wallets\.vercel\.app" . --include="*.ts" --include="*.tsx" --include="*.js" --include="*.mjs" --exclude-dir=node_modules --exclude-dir=.git | grep -v ".env.example" | grep -v "process\.env\." | grep -v "DEVELOPMENT\.md" | grep -v "README\.md" | grep -v "QUICK_FIX" | grep -v "BICONOMY_SETUP" | grep -v "deploy-contract.js" | grep -v "deploy-script.js" | grep -v "deploy-nft.js" | wc -l)
fi
if [ $HARDCODE_COUNT -gt 0 ]; then
  echo "❌ FAILED: $HARDCODE_COUNT direct hardcoded domain(s) detected"
  echo "   Use process.env.NEXT_PUBLIC_SITE_URL or window.location.origin instead"
  exit 1
fi

# Check for obsolete encodePath.ts utility
if [ "$USE_RIPGREP" = true ]; then
  ENCODE_PATH_FOUND=$(rg "encodePath\.ts" frontend --quiet && echo "found" || echo "")
else
  ENCODE_PATH_FOUND=$(grep -r "encodePath\.ts" frontend --include="*.ts" --include="*.tsx" --exclude-dir=node_modules 2>/dev/null && echo "found" || echo "")
fi

if [ -n "$ENCODE_PATH_FOUND" ]; then
  echo "❌ FAILED: Obsolete utility detected"
  echo "   Use encodeAllPathSegmentsSafe from encodePathSafe.ts instead"
  exit 1
fi

# Check for User-Agent dependencies in APIs and components  
if [ "$USE_RIPGREP" = true ]; then
  USER_AGENT_FOUND=$(rg "User-Agent" frontend/src --type ts --type tsx --quiet && echo "found" || echo "")
else
  USER_AGENT_FOUND=$(grep -r "User-Agent" frontend/src --include="*.ts" --include="*.tsx" --exclude-dir=node_modules 2>/dev/null && echo "found" || echo "")
fi

if [ -n "$USER_AGENT_FOUND" ]; then
  echo "❌ FAILED: User-Agent dependency detected"
  echo "   Remove User-Agent conditionals for universal compatibility"
  exit 1
fi

# Check for hardcoded API keys in scripts
if [ "$USE_RIPGREP" = true ]; then
  API_KEY_FOUND=$(rg -E "g\.alchemy\.com/v2/[A-Za-z0-9_-]{32}" . --type ts --type js --type mjs --quiet 2>/dev/null && echo "found" || echo "")
else
  API_KEY_FOUND=$(grep -rE "g\.alchemy\.com/v2/[A-Za-z0-9_-]{32}" . --include="*.ts" --include="*.js" --include="*.mjs" --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null && echo "found" || echo "")
fi

if [ -n "$API_KEY_FOUND" ]; then
  echo "❌ FAILED: Hardcoded API key detected"
  echo "   Use environment variables for all credentials"
  exit 1
fi

# Check for double encoding patterns (common regression)
if [ "$USE_RIPGREP" = true ]; then
  DOUBLE_ENCODE_FOUND=$(rg "encodeURIComponent.*encodeURIComponent" frontend/src --quiet 2>/dev/null && echo "found" || echo "")
else
  DOUBLE_ENCODE_FOUND=$(grep -r "encodeURIComponent.*encodeURIComponent" frontend/src --exclude-dir=node_modules 2>/dev/null && echo "found" || echo "")
fi

if [ -n "$DOUBLE_ENCODE_FOUND" ]; then
  echo "❌ FAILED: Double encoding detected"
  echo "   Use single encoding pass with ipfs.ts utilities"
  exit 1
fi

# Check for client-side gateway rotation (should be server-side only)
if [ "$USE_RIPGREP" = true ]; then
  CLIENT_GATEWAY_FOUND=$(rg "IPFS_GATEWAYS.*\[\]" frontend/src/components --quiet 2>/dev/null && echo "found" || echo "")
else
  CLIENT_GATEWAY_FOUND=$(grep -r "IPFS_GATEWAYS.*\[\]" frontend/src/components --exclude-dir=node_modules 2>/dev/null && echo "found" || echo "")
fi

if [ -n "$CLIENT_GATEWAY_FOUND" ]; then
  echo "❌ FAILED: Client-side gateway rotation detected"
  echo "   Gateway selection should be handled by server-side APIs only"
  exit 1
fi

# Check for VERCEL_URL fallbacks in scripts (should fail-fast)
if [ "$USE_RIPGREP" = true ]; then
  SCRIPT_VERCEL_COUNT=$(rg "VERCEL_URL" . --type js --type mjs 2>/dev/null | grep -v ".env.example" | grep -v "getPublicBaseUrl" | wc -l)
else
  SCRIPT_VERCEL_COUNT=$(grep -r "VERCEL_URL" . --include="*.js" --include="*.mjs" --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | grep -v ".env.example" | grep -v "getPublicBaseUrl" | wc -l)
fi
if [ $SCRIPT_VERCEL_COUNT -gt 0 ]; then
  echo "❌ FAILED: VERCEL_URL fallback detected in scripts"
  echo "   Scripts should fail-fast if NEXT_PUBLIC_BASE_URL missing"
  exit 1
fi

# Check for URL literal fallbacks in ternaries
if [ "$USE_RIPGREP" = true ]; then
  URL_FALLBACK_COUNT=$(rg -E "\|\|.*https?://" frontend/src --type ts --type tsx --count-matches 2>/dev/null | awk -F: '{sum += $2} END {print sum+0}')
else
  URL_FALLBACK_COUNT=$(grep -rE "\|\|.*https?://" frontend/src --include="*.ts" --include="*.tsx" --exclude-dir=node_modules 2>/dev/null | grep -v ".env.example" | wc -l)
fi
if [ $URL_FALLBACK_COUNT -gt 0 ]; then
  echo "❌ FAILED: URL literal fallback detected"
  echo "   Use fail-fast pattern instead of URL literals"
  exit 1
fi

echo "✅ All hardcode checks passed!"
echo "   - No hardcoded domains found"
echo "   - No obsolete utilities found" 
echo "   - No User-Agent dependencies found"
echo "   - No double encoding patterns found"
echo "   - No client-side gateway logic found"
echo "   - No VERCEL_URL fallbacks in scripts"
echo "   - No URL literal fallbacks found"