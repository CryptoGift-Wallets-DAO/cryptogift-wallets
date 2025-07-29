#!/bin/bash
# 🛡️ Secure Feature Generator - CryptoGift Wallets (Wrapper)
# This script delegates to the versioned template in templates/secure-features/

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_SCRIPT="$SCRIPT_DIR/../templates/secure-features/create-secure-feature.sh"

if [ -f "$TEMPLATE_SCRIPT" ]; then
    echo "🔄 Delegating to versioned template generator..."
    exec "$TEMPLATE_SCRIPT" "$@"
else
    echo "❌ ERROR: Versioned template generator not found at $TEMPLATE_SCRIPT"
    echo "📋 Please ensure templates/secure-features/create-secure-feature.sh exists"
    exit 1
fi