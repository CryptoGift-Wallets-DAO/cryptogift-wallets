# 🎁 CryptoGift Indexer

Zero-custody blockchain indexer for CryptoGift NFT-Wallet gift mappings. This indexer builds and maintains `tokenId → giftId` mappings off-chain to solve the scalability issues with on-chain event searching.

## 🎯 Problem Solved

The original CryptoGift system searches for `GiftRegisteredFromMint` events with a limited 50k block range (≈1.16 days on Base Sepolia). This creates a **scalability bottleneck** where gifts become "unfindable" after just over a day, resulting in "Gift Not Found" errors.

## 🏗️ Architecture

### Shadow Mode Deployment
- **Feature Flag System**: Toggle between `onchain` and `db` reads via `READ_FROM` environment variable
- **Zero UX Changes**: Identical API, seamless fallback to blockchain if DB fails
- **Gradual Rollout**: A/B testing capabilities for validation
- **Complete Reversibility**: Can switch back to onchain mode instantly

### Core Components
1. **Backfill Engine**: Processes historical events from deployment block to current
2. **Live Streaming**: Real-time event processing via WebSocket + polling fallback  
3. **Reconciliation**: Handles blockchain reorgs and ensures data consistency
4. **API Server**: REST endpoints for lookups, monitoring, and debugging
5. **Dead Letter Queue**: Handles failed events for manual inspection

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon/Supabase recommended for free tier)
- Base Sepolia RPC endpoints (Alchemy/Infura/public RPCs)

### Installation

```bash
# Clone and setup
cd cryptogift-wallets/indexer
npm install

# Copy environment template
cp .env.template .env
# Edit .env with your configuration

# Initialize database
npm run db:migrate

# Start indexer
npm run dev
```

### Environment Variables

```bash
# Required
DATABASE_URL="postgresql://user:pass@host:port/db"
RPC_HTTP="https://sepolia.base.org"
RPC_WS="wss://sepolia.base.org"

# Feature flag (key setting)
READ_FROM=onchain  # or 'db' for database reads

# Optional tuning
BATCH_BLOCKS=4000
CONFIRMATIONS=20
LOG_LEVEL=info
```

## 📊 Usage

### Development Commands

```bash
# Start full indexer + API
npm run dev

# Run backfill only
npm run backfill

# Check status
npm run status

# Test specific mapping
npm run status -- --test 68

# API endpoints (when running)
npm run health        # curl health endpoint
npm run status:api    # curl status endpoint  
TOKEN_ID=68 npm run mapping  # lookup specific token
```

### Production Commands

```bash
# Build and start
npm run build
npm start

# Database operations
npm run db:migrate    # Run migrations
npm run db:reset      # Reset and rebuild schema
```

## 🔍 API Endpoints

| Endpoint | Description | Example |
|----------|-------------|---------|
| `GET /health` | Health check | `curl localhost:3001/health` |
| `GET /status` | Full system status | `curl localhost:3001/status` |
| `GET /mapping/:tokenId` | Lookup gift mapping | `curl localhost:3001/mapping/68` |
| `GET /backfill` | Backfill progress | `curl localhost:3001/backfill` |
| `GET /stream` | Live stream status | `curl localhost:3001/stream` |
| `GET /metrics` | Prometheus metrics | `curl localhost:3001/metrics` |

## 📈 Monitoring

### Status Dashboard
```bash
npm run status
```

Displays:
- 🔗 RPC connectivity (HTTP/WebSocket)
- 🗄️ Database statistics (total mappings, lag, DLQ count)
- 📦 Backfill progress (blocks remaining, ETA)
- 🔄 Reconciliation status (reorg detection)
- ⚙️ Configuration summary

### Key Metrics
- **Indexer Lag**: Time behind blockchain (target: <120s)
- **DLQ Count**: Failed events requiring manual review
- **Backfill Progress**: Historical processing completion
- **Stream Health**: Real-time event processing status

## 🏭 Production Deployment

### Recommended Stack (Free Tier)
- **Database**: [Neon](https://neon.tech) (500MB free)
- **Hosting**: [Render](https://render.com) (750hrs/month free)
- **RPC**: [Alchemy](https://alchemy.com) (300M CU/month free)

### Deployment Steps

1. **Database Setup**
   ```bash
   # Neon/Supabase: Create database, get connection string
   export DATABASE_URL="postgresql://..."
   npm run db:migrate
   ```

2. **RPC Configuration**
   ```bash
   # Get free RPC endpoints
   export RPC_HTTP="https://base-sepolia.g.alchemy.com/v2/YOUR_KEY"
   export RPC_WS="wss://base-sepolia.g.alchemy.com/v2/YOUR_KEY"
   ```

3. **Deploy to Render**
   ```bash
   # Connect GitHub repo to Render
   # Set environment variables in Render dashboard
   # Deploy with: npm run build && npm start
   ```

### Feature Flag Rollout

```bash
# Phase 1: Shadow mode (writes to DB, reads from chain)
READ_FROM=onchain

# Phase 2: A/B testing (validate DB vs chain)
# Use monitoring to compare results

# Phase 3: Full database reads
READ_FROM=db

# Rollback if needed
READ_FROM=onchain
```

## 🛠️ Development

### Architecture Overview

```
┌─────────────────────┐    ┌─────────────────────┐
│   Main App (main.ts)│    │  API Server (api.ts)│
└──────────┬──────────┘    └─────────────────────┘
           │
┌──────────▼──────────────────────────────────────┐
│              Indexer (indexer.ts)              │
├─────────────────┬─────────────────┬─────────────┤
│   Backfill      │   Live Stream   │ Reconcile   │
│ (backfill.ts)   │   (stream.ts)   │(reconcile.ts│
└─────────────────┼─────────────────┼─────────────┘
                  │                 │
┌─────────────────▼─────────────────▼─────────────┐
│           Event Processor (event-processor.ts)  │
└─────────────────┬─────────────────┬─────────────┘
                  │                 │
┌─────────────────▼─────────────────▼─────────────┐
│  Database (database.ts)  │  RPC Client (rpc.ts) │
└──────────────────────────┴─────────────────────┘
```

### Key Files

- **`src/main.ts`**: Entry point, orchestrates startup
- **`src/indexer.ts`**: Main coordinator, manages all processes  
- **`src/backfill.ts`**: Historical event processing
- **`src/stream.ts`**: Real-time event streaming
- **`src/reconcile.ts`**: Reorg handling and consistency checks
- **`src/event-processor.ts`**: Core event parsing logic
- **`src/database.ts`**: PostgreSQL operations
- **`src/rpc.ts`**: Blockchain interaction via Viem
- **`src/api.ts`**: REST API server

### Database Schema

```sql
-- Gift mappings (primary data)
CREATE TABLE gift_mappings (
    token_id TEXT PRIMARY KEY,
    gift_id TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    log_index INTEGER NOT NULL,
    block_number INTEGER NOT NULL,
    block_time TIMESTAMP,
    contract_addr TEXT NOT NULL,
    -- Additional event data
    creator TEXT,
    nft_contract TEXT,
    expires_at INTEGER,
    gate TEXT,
    gift_message TEXT,
    registered_by TEXT
);

-- Indexer checkpoints
CREATE TABLE indexer_checkpoint (
    id TEXT PRIMARY KEY,
    last_block INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Dead letter queue for failed events
CREATE TABLE indexer_dlq (
    id SERIAL PRIMARY KEY,
    tx_hash TEXT NOT NULL,
    log_index INTEGER NOT NULL,
    block_number INTEGER NOT NULL,
    reason TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔧 Configuration

### Indexing Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `BATCH_BLOCKS` | 4000 | Events processed per batch |
| `CONFIRMATIONS` | 20 | Blocks to wait for finality |
| `REORG_LOOKBACK` | 200 | Blocks to check for reorgs |
| `MAX_RETRIES` | 5 | Retry attempts for failed operations |

### Performance Tuning

```bash
# Fast backfill (high RPC usage)
BATCH_BLOCKS=10000
CONFIRMATIONS=10

# Conservative (low RPC usage)  
BATCH_BLOCKS=1000
CONFIRMATIONS=50

# Production balanced
BATCH_BLOCKS=4000
CONFIRMATIONS=20
```

## 🚨 Troubleshooting

### Common Issues

1. **"Gift Not Found" Errors**
   ```bash
   # Check if backfill is complete
   npm run status
   
   # Test specific mapping
   npm run status -- --test 68
   ```

2. **High Indexer Lag**
   ```bash
   # Check RPC connectivity
   curl localhost:3001/health
   
   # Increase batch size
   BATCH_BLOCKS=8000 npm run dev
   ```

3. **DLQ Entries**
   ```sql
   -- Check failed events
   SELECT * FROM indexer_dlq ORDER BY created_at DESC LIMIT 10;
   ```

4. **Database Connection Issues**
   ```bash
   # Test database connectivity
   psql $DATABASE_URL -c "SELECT NOW();"
   ```

### Recovery Procedures

```bash
# Reset and rebuild (destroys data)
npm run db:reset
npm run backfill

# Reprocess specific block range
# (manually update checkpoint, restart)
```

## 📋 Deployment Checklist

- [ ] Database created and migrated (`npm run db:migrate`)
- [ ] RPC endpoints configured and tested
- [ ] Environment variables set correctly
- [ ] Backfill completed (`npm run backfill`)
- [ ] Feature flag set appropriately (`READ_FROM=onchain`)
- [ ] Monitoring endpoints accessible
- [ ] A/B testing plan prepared
- [ ] Rollback plan documented

## 🤝 Integration

### Using with CryptoGift App

1. **Shadow Mode** (safe deployment):
   ```typescript
   // In escrowUtils.ts - add DB fallback
   async function getGiftIdFromTokenId(tokenId: string) {
     try {
       if (config.READ_from === 'db') {
         const response = await fetch(`${INDEXER_URL}/mapping/${tokenId}`);
         if (response.ok) {
           const data = await response.json();
           return data.data.giftId;
         }
       }
       // Fallback to original blockchain search
       return await searchBlockchainForGift(tokenId);
     } catch (error) {
       // Always fallback to blockchain
       return await searchBlockchainForGift(tokenId);
     }
   }
   ```

2. **Full Database Mode**:
   ```typescript
   // Replace blockchain search entirely
   async function getGiftIdFromTokenId(tokenId: string) {
     const response = await fetch(`${INDEXER_URL}/mapping/${tokenId}`);
     if (!response.ok) {
       throw new Error('Gift not found');
     }
     const data = await response.json();
     return data.data.giftId;
   }
   ```

## 📊 Performance

### Expected Metrics
- **Backfill Speed**: ~10,000 blocks/minute (depends on RPC limits)
- **Live Stream Latency**: <10 seconds behind blockchain
- **Database Lookup**: <50ms (O(1) primary key lookup)
- **Memory Usage**: ~100MB (with connection pooling)

### Scalability
- **Current**: Handles Base Sepolia (2s blocks) comfortably
- **Mainnet**: Would require higher RPC tier and DB resources
- **Storage**: ~1KB per gift mapping, ~1GB for 1M gifts

## 🔒 Security

- **Zero-custody**: No private keys or sensitive data stored
- **Read-only**: Database only stores public blockchain data
- **Blockchain Source of Truth**: Always verifiable against chain
- **Graceful Degradation**: Falls back to onchain reads if DB fails

## 📈 Monitoring & Alerting

### Key Alerts
- Indexer lag > 5 minutes
- DLQ entries > 100
- RPC connectivity failures
- Database connection issues

### Prometheus Metrics
```
indexer_running{} 1
indexer_uptime_seconds{} 3600
indexer_total_mappings{} 50000
indexer_lag_seconds{} 30
```

---

**Built for CryptoGift by mbxarts.com** | [Documentation](https://github.com/cryptogift/indexer) | [Issues](https://github.com/cryptogift/indexer/issues)