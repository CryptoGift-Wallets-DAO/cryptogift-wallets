#!/bin/bash
# 🚀 CryptoGift Indexer - Quick Deployment Check
# Verifica que todas las verificaciones del DÍA 3 estén completas

set -e  # Exit on any error

echo "🎯 CryptoGift Indexer - DÍA 3 Deployment Check"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check functions
check_env() {
    echo -e "${BLUE}📋 Checking environment variables...${NC}"
    
    required_vars=("DATABASE_URL" "RPC_HTTP" "RPC_WS" "CONTRACT_ADDRESS" "DEPLOYMENT_BLOCK")
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            echo -e "${RED}❌ $var not set${NC}"
            exit 1
        else
            echo -e "${GREEN}✅ $var configured${NC}"
        fi
    done
}

check_rpc() {
    echo -e "${BLUE}🔌 Testing RPC connectivity...${NC}"
    
    # Test HTTP RPC
    if curl -s -X POST "$RPC_HTTP" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        --max-time 10 | grep -q "result"; then
        echo -e "${GREEN}✅ HTTP RPC working${NC}"
    else
        echo -e "${RED}❌ HTTP RPC failed${NC}"
        exit 1
    fi
}

check_database() {
    echo -e "${BLUE}🗄️  Testing database connectivity...${NC}"
    
    if psql "$DATABASE_URL" -c "SELECT NOW();" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database connection working${NC}"
    else
        echo -e "${RED}❌ Database connection failed${NC}"
        exit 1
    fi
}

run_migration() {
    echo -e "${BLUE}📦 Running database migration...${NC}"
    
    if npm run db:migrate; then
        echo -e "${GREEN}✅ Database migration successful${NC}"
    else
        echo -e "${RED}❌ Database migration failed${NC}"
        exit 1
    fi
}

check_contract() {
    echo -e "${BLUE}📜 Verifying contract configuration...${NC}"
    
    # Check deployment block is reasonable
    if [[ "$DEPLOYMENT_BLOCK" -lt 28900000 ]] || [[ "$DEPLOYMENT_BLOCK" -gt 30000000 ]]; then
        echo -e "${YELLOW}⚠️  DEPLOYMENT_BLOCK ($DEPLOYMENT_BLOCK) seems unusual${NC}"
    else
        echo -e "${GREEN}✅ DEPLOYMENT_BLOCK looks reasonable${NC}"
    fi
    
    # Check contract address format
    if [[ "$CONTRACT_ADDRESS" =~ ^0x[a-fA-F0-9]{40}$ ]]; then
        echo -e "${GREEN}✅ CONTRACT_ADDRESS format valid${NC}"
    else
        echo -e "${RED}❌ CONTRACT_ADDRESS format invalid${NC}"
        exit 1
    fi
}

status_check() {
    echo -e "${BLUE}📊 Running status check...${NC}"
    
    if npm run status; then
        echo -e "${GREEN}✅ Status check passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Status check failed (expected if indexer not running)${NC}"
    fi
}

# Main execution
echo -e "${BLUE}Starting DÍA 3 verification...${NC}"

# Load environment
if [[ -f .env ]]; then
    source .env
    echo -e "${GREEN}✅ Environment loaded${NC}"
else
    echo -e "${RED}❌ .env file not found${NC}"
    exit 1
fi

# Run all checks
check_env
check_contract
check_rpc
check_database
run_migration
status_check

echo ""
echo -e "${GREEN}🎉 ALL CHECKS PASSED!${NC}"
echo -e "${GREEN}✅ Ready for DÍA 3 - Modo Sombra deployment${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. npm run backfill      # Run historical backfill"
echo "2. npm start             # Start live indexer"
echo "3. npm run ab-check      # Run A/B validation"
echo ""
echo -e "${YELLOW}Monitor with: npm run status${NC}"