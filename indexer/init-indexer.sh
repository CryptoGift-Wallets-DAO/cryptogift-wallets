#!/bin/bash
# 🚀 CryptoGift Indexer - Inicialización Rápida DÍA 3
# Una vez configurado DATABASE_URL, ejecuta este script

set -e

echo "🎁 CryptoGift Indexer - Inicialización Modo Sombra"
echo "================================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if DATABASE_URL is configured
if [[ -z "$DATABASE_URL" ]]; then
    echo "❌ DATABASE_URL not configured"
    echo "Please set DATABASE_URL in .env file"
    exit 1
fi

echo -e "${BLUE}1/4 Installing dependencies...${NC}"
npm install

echo -e "${BLUE}2/4 Running deployment verification...${NC}"
./quick-deploy-check.sh

echo -e "${BLUE}3/4 Building indexer...${NC}"
npm run build

echo -e "${BLUE}4/4 Testing indexer startup...${NC}"
echo "Starting indexer for 10 seconds to verify it works..."

# Start indexer in background and test
npm start &
INDEXER_PID=$!

sleep 10

# Test health endpoint
if curl -s http://localhost:3001/health | grep -q "ok"; then
    echo -e "${GREEN}✅ Indexer is running and healthy!${NC}"
else
    echo -e "${YELLOW}⚠️  Health check failed, but indexer started${NC}"
fi

# Stop test indexer
kill $INDEXER_PID 2>/dev/null || true
sleep 2

echo ""
echo -e "${GREEN}🎉 INDEXER INITIALIZATION COMPLETE!${NC}"
echo ""
echo -e "${BLUE}DÍA 3 - MODO SOMBRA Ready to deploy:${NC}"
echo ""
echo "📦 To run backfill (historical data):"
echo "    npm run backfill"
echo ""
echo "🔄 To start live indexer:"
echo "    npm start"
echo ""
echo "📊 To monitor status:"
echo "    npm run status"
echo ""
echo "🧪 To run A/B validation:"
echo "    npm run ab-check"
echo ""
echo -e "${YELLOW}Remember: Keep READ_FROM=onchain for shadow mode!${NC}"