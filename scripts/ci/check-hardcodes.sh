#!/usr/bin/env bash
set -euo pipefail

# CI/CD HARDCODE PREVENTION SCRIPT
# Prevents regression of hardcoded domains, obsolete utils, and User-Agent dependencies
# Made by mbxarts.com The Moon in a Box property
# Co-Author: Godez22

echo "🔍 Running hardcode detection checks..."

# Check for direct hardcoded domains (simplified check)
HARDCODE_COUNT=$(grep -r "cryptogift-wallets\.vercel\.app" frontend/src --exclude-dir=logs --exclude-dir=.next --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "|| '" | grep -v "process\.env\." | wc -l)
if [ $HARDCODE_COUNT -gt 0 ]; then
  echo "❌ FAILED: $HARDCODE_COUNT direct hardcoded domain(s) detected"
  echo "   Use process.env.NEXT_PUBLIC_SITE_URL or window.location.origin instead"
  exit 1
fi

# Check for obsolete encodePath.ts utility
if grep -r "encodePath\.ts" frontend 2>/dev/null; then
  echo "❌ FAILED: Obsolete utility detected"
  echo "   Use encodeAllPathSegmentsSafe from encodePathSafe.ts instead"
  exit 1
fi

# Check for User-Agent dependencies in metadata APIs
if grep -r "User-Agent" frontend/src/pages/api 2>/dev/null; then
  echo "❌ FAILED: User-Agent dependency in APIs detected"
  echo "   Remove User-Agent conditionals for universal compatibility"
  exit 1
fi

# Check for double encoding patterns (common regression)
if grep -r "encodeURIComponent.*encodeURIComponent" frontend/src 2>/dev/null; then
  echo "❌ FAILED: Double encoding detected"
  echo "   Use single encoding pass with ipfs.ts utilities"
  exit 1
fi

# Check for client-side gateway rotation (should be server-side only)
if grep -r "IPFS_GATEWAYS.*\[\]" frontend/src/components 2>/dev/null; then
  echo "❌ FAILED: Client-side gateway rotation detected"
  echo "   Gateway selection should be handled by server-side APIs only"
  exit 1
fi

echo "✅ All hardcode checks passed!"
echo "   - No hardcoded domains found"
echo "   - No obsolete utilities found" 
echo "   - No User-Agent dependencies found"
echo "   - No double encoding patterns found"
echo "   - No client-side gateway logic found"