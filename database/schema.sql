-- AMS PostgreSQL Schema for Off-Chain Indexing & Explorer
-- This schema mirrors the Hyperledger Fabric state to support rich queries and analytics.

-- 1. USERS Table (Read Replica)
-- Used to join with assets to show "Owned by [Full Name]" instead of IDs.
CREATE TABLE IF NOT EXISTS users (
    id              VARCHAR(64) PRIMARY KEY,
    full_name       VARCHAR(255) NOT NULL,
    identity_number VARCHAR(50),
    role            VARCHAR(50) CHECK (role IN ('Admin', 'Owner', 'Auditor', 'Viewer', 'User')),
    wallet_address  VARCHAR(255),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ASSETS Table (Current World State)
-- Stores the LATEST state of every asset.
CREATE TABLE IF NOT EXISTS assets (
    id              VARCHAR(64) PRIMARY KEY,
    doc_type        VARCHAR(20) DEFAULT 'asset',
    name            VARCHAR(255) NOT NULL,
    asset_type      VARCHAR(50),
    owner           VARCHAR(64), -- Can reference users(id) if strict, but loose coupling is safer for blockchain sync
    value           INTEGER DEFAULT 0,
    status          VARCHAR(50),
    metadata_url    TEXT,
    metadata_hash   CHAR(64),
    viewers         JSONB DEFAULT '[]',     -- Stores list of viewer IDs as JSON Array
    last_tx_id      VARCHAR(64),            -- usage to link back to Fabric Transaction
    updated_at      TIMESTAMP               -- Timestamp from Fabric Block
);

-- Indexes for Explorer Performance
CREATE INDEX idx_assets_owner ON assets(owner);
CREATE INDEX idx_assets_type ON assets(asset_type);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_viewers ON assets USING gin (viewers); -- GIN index for JSONB Array searching

-- 3. ASSET_HISTORY Table (Audit Trail)
-- Stores a permanent record of every state change (Provenance).
CREATE TABLE IF NOT EXISTS asset_history (
    id              SERIAL PRIMARY KEY,
    tx_id           VARCHAR(64) NOT NULL,
    asset_id        VARCHAR(64) REFERENCES assets(id) ON DELETE CASCADE,
    action_type     VARCHAR(50), -- e.g. CREATE, UPDATE, TRANSFER, GRANT_ACCESS
    from_owner      VARCHAR(64),
    to_owner        VARCHAR(64),
    block_number    BIGINT,
    timestamp       TIMESTAMP,
    is_valid        BOOLEAN DEFAULT TRUE,
    
    -- Snapshot of data at that point in time (Optional, but good for "Time Travel" queries)
    asset_snapshot  JSONB
);

-- Index for History Lookups
CREATE INDEX idx_history_asset_id ON asset_history(asset_id);
CREATE INDEX idx_history_tx_id ON asset_history(tx_id);
