-- 🎯 CryptoGift Indexer Schema V1.0
-- Purpose: Store tokenId → giftId mappings for zero-custody NFT gift system
-- Network: Base Sepolia (84532)
-- Contract: 0x46175CfC233500DA803841DEef7f2816e7A129E0

-- ========================================
-- 1. Main Mapping Table (Core Functionality) - HARDENED
-- ========================================
CREATE TABLE IF NOT EXISTS gift_mappings (
  -- Composite key for multi-contract support (future-proofing)
  contract_addr  TEXT NOT NULL CHECK (length(contract_addr) = 42 AND contract_addr ~ '^0x[0-9a-fA-F]{40}$'),
  token_id       TEXT NOT NULL CHECK (length(token_id) > 0 AND length(token_id) <= 78), -- uint256 string
  
  -- Gift mapping data with validation
  gift_id        TEXT NOT NULL CHECK (length(gift_id) > 0 AND length(gift_id) <= 78),
  
  -- Event metadata with strict validation
  tx_hash        TEXT NOT NULL CHECK (length(tx_hash) = 66 AND tx_hash ~ '^0x[0-9a-fA-F]{64}$'),
  log_index      INTEGER NOT NULL CHECK (log_index >= 0),
  block_number   BIGINT NOT NULL CHECK (block_number > 28914999), -- Must be after deployment
  block_hash     TEXT CHECK (block_hash IS NULL OR (length(block_hash) = 66 AND block_hash ~ '^0x[0-9a-fA-F]{64}$')),
  block_time     TIMESTAMPTZ,
  
  -- Additional event data with validation
  creator        TEXT CHECK (creator IS NULL OR (length(creator) = 42 AND creator ~ '^0x[0-9a-fA-F]{40}$')),
  nft_contract   TEXT CHECK (nft_contract IS NULL OR (length(nft_contract) = 42 AND nft_contract ~ '^0x[0-9a-fA-F]{40}$')),
  expires_at     BIGINT CHECK (expires_at IS NULL OR expires_at > 0),
  gate           TEXT CHECK (gate IS NULL OR (length(gate) = 42 AND gate ~ '^0x[0-9a-fA-F]{40}$')),
  gift_message   TEXT CHECK (gift_message IS NULL OR length(gift_message) <= 1000), -- Reasonable limit
  registered_by  TEXT CHECK (registered_by IS NULL OR (length(registered_by) = 42 AND registered_by ~ '^0x[0-9a-fA-F]{40}$')),
  
  -- Timestamps
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Primary key: contract + token_id for multi-contract support
  PRIMARY KEY (contract_addr, token_id)
);

-- ========================================
-- 2. Indexer State Management - ENHANCED
-- ========================================
CREATE TABLE IF NOT EXISTS indexer_checkpoint (
  id             TEXT PRIMARY KEY,      -- 'backfill', 'stream', 'reconcile'
  last_block     BIGINT NOT NULL,
  last_block_hash TEXT CHECK (last_block_hash IS NULL OR (length(last_block_hash) = 66 AND last_block_hash ~ '^0x[0-9a-fA-F]{64}$')),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- 2b. Leader Election (Advisory Locks)
-- ========================================
CREATE TABLE IF NOT EXISTS indexer_locks (
  resource_name  TEXT PRIMARY KEY,      -- 'indexer', 'backfill', 'stream'
  holder_id      TEXT NOT NULL,
  acquired_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL,
  metadata       JSONB
);

-- ========================================
-- 3. Pending Events (Crash Recovery)
-- ========================================
CREATE TABLE IF NOT EXISTS pending_events (
  tx_hash        TEXT NOT NULL CHECK (length(tx_hash) = 66 AND tx_hash ~ '^0x[0-9a-fA-F]{64}$'),
  log_index      INTEGER NOT NULL CHECK (log_index >= 0),
  block_number   BIGINT NOT NULL CHECK (block_number > 28914999),
  block_hash     TEXT CHECK (block_hash IS NULL OR (length(block_hash) = 66 AND block_hash ~ '^0x[0-9a-fA-F]{64}$')),
  log_data       JSONB NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (tx_hash, log_index)
);

-- ========================================
-- 4. Dead Letter Queue (Error Handling)
-- ========================================
CREATE TABLE IF NOT EXISTS indexer_dlq (
  id             BIGSERIAL PRIMARY KEY,
  tx_hash        TEXT NOT NULL,
  log_index      INTEGER NOT NULL,
  block_number   BIGINT NOT NULL,
  reason         TEXT NOT NULL,
  payload        JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- 5. Performance Indexes - ENHANCED
-- ========================================

-- Prevent duplicate events (idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS ux_map_txlog
  ON gift_mappings (tx_hash, log_index);

-- Block range queries (monitoring)
CREATE INDEX IF NOT EXISTS ix_map_block 
  ON gift_mappings (block_number);

-- Reverse lookup: giftId → tokenId (multi-contract aware)
CREATE INDEX IF NOT EXISTS ix_map_gift  
  ON gift_mappings (contract_addr, gift_id);

-- Creator lookups (normalized)
CREATE INDEX IF NOT EXISTS ix_map_creator
  ON gift_mappings (lower(creator)) WHERE creator IS NOT NULL;

-- NFT contract lookups (normalized)
CREATE INDEX IF NOT EXISTS ix_map_nft_contract
  ON gift_mappings (lower(nft_contract)) WHERE nft_contract IS NOT NULL;

-- Time-based queries
CREATE INDEX IF NOT EXISTS ix_map_created_at
  ON gift_mappings (created_at);

-- Block hash for reorg detection
CREATE INDEX IF NOT EXISTS ix_map_block_hash
  ON gift_mappings (block_number, block_hash);

-- Pending events cleanup
CREATE INDEX IF NOT EXISTS ix_pending_created
  ON pending_events (created_at);

CREATE INDEX IF NOT EXISTS ix_pending_block
  ON pending_events (block_number);

-- DLQ monitoring
CREATE INDEX IF NOT EXISTS ix_dlq_block
  ON indexer_dlq (block_number);

CREATE INDEX IF NOT EXISTS ix_dlq_created
  ON indexer_dlq (created_at);

-- ========================================
-- 5. Triggers for Auto-Update
-- ========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_gift_mappings_modtime 
  BEFORE UPDATE ON gift_mappings 
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ========================================
-- 7. Initial Data (Enhanced Checkpoints)
-- ========================================

-- Initialize separate checkpoints for better diagnostics
INSERT INTO indexer_checkpoint (id, last_block) 
VALUES 
  ('backfill', 28915000),
  ('stream', 28915000),
  ('reconcile', 28915000)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 7. Views for Monitoring
-- ========================================

-- Indexer health status
CREATE OR REPLACE VIEW indexer_status AS
SELECT 
  c.last_block,
  (EXTRACT(EPOCH FROM NOW()) - EXTRACT(EPOCH FROM c.updated_at))::INT AS lag_seconds,
  (SELECT COUNT(*) FROM gift_mappings) AS total_mappings,
  (SELECT COUNT(*) FROM indexer_dlq) AS dlq_count,
  (SELECT MAX(block_number) FROM gift_mappings) AS latest_mapped_block,
  (SELECT MIN(block_number) FROM gift_mappings) AS earliest_mapped_block
FROM indexer_checkpoint c
WHERE c.id = 'backfill';

-- Recent activity
CREATE OR REPLACE VIEW recent_mappings AS
SELECT 
  token_id,
  gift_id,
  block_number,
  creator,
  created_at
FROM gift_mappings 
ORDER BY created_at DESC 
LIMIT 100;

-- Error summary
CREATE OR REPLACE VIEW dlq_summary AS
SELECT 
  reason,
  COUNT(*) as count,
  MIN(created_at) as first_occurrence,
  MAX(created_at) as last_occurrence
FROM indexer_dlq 
GROUP BY reason 
ORDER BY count DESC;

-- ========================================
-- Migration Complete
-- ========================================

-- Success marker
INSERT INTO indexer_checkpoint (id, last_block) 
VALUES ('migration-001', EXTRACT(EPOCH FROM NOW())::BIGINT) 
ON CONFLICT (id) DO UPDATE SET last_block = EXCLUDED.last_block;