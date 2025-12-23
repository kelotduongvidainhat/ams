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
    password_hash   VARCHAR(255),
    status          VARCHAR(20) DEFAULT 'Active',
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
    status          VARCHAR(50),
    metadata_url    TEXT,
    metadata_hash   CHAR(64),
    viewers         JSONB DEFAULT '[]',     -- Stores list of viewer IDs as JSON Array
    last_tx_id      VARCHAR(64),            -- usage to link back to Fabric Transaction
    updated_at      TIMESTAMP               -- Timestamp from Fabric Block
);

-- Indexes for Explorer Performance
CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(owner);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_viewers ON assets USING gin (viewers); -- GIN index for JSONB Array searching


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
CREATE INDEX IF NOT EXISTS idx_history_asset_id ON asset_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_history_tx_id ON asset_history(tx_id);
CREATE INDEX IF NOT EXISTS idx_history_timestamp ON asset_history(timestamp DESC); -- For recent transaction queries

-- 4. PENDING_TRANSFERS Table (Multi-Signature Transfers)
-- Stores transfer requests that require approval from both parties
CREATE TABLE IF NOT EXISTS pending_transfers (
    id              SERIAL PRIMARY KEY,
    asset_id        VARCHAR(64) NOT NULL,
    asset_name      VARCHAR(255),
    current_owner   VARCHAR(64) NOT NULL,  -- Must approve (initiator)
    new_owner       VARCHAR(64) NOT NULL,  -- Must approve (recipient)
    status          VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, EXPIRED, EXECUTED
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
    executed_at     TIMESTAMP,
    rejection_reason TEXT
);

-- 5. TRANSFER_SIGNATURES Table (Approval Records)
-- Tracks who has approved each pending transfer
CREATE TABLE IF NOT EXISTS transfer_signatures (
    id              SERIAL PRIMARY KEY,
    pending_transfer_id INT REFERENCES pending_transfers(id) ON DELETE CASCADE,
    signer_id       VARCHAR(64) NOT NULL,
    signer_role     VARCHAR(20) NOT NULL, -- 'CURRENT_OWNER' or 'NEW_OWNER'
    action          VARCHAR(20) NOT NULL, -- 'APPROVED' or 'REJECTED'
    signed_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comment         TEXT,
    UNIQUE(pending_transfer_id, signer_id) -- Each user can only sign once per transfer
);

-- Indexes for Multi-Sig Queries
CREATE INDEX IF NOT EXISTS idx_pending_transfers_current_owner ON pending_transfers(current_owner);
CREATE INDEX IF NOT EXISTS idx_pending_transfers_new_owner ON pending_transfers(new_owner);
CREATE INDEX IF NOT EXISTS idx_pending_transfers_status ON pending_transfers(status);
CREATE INDEX IF NOT EXISTS idx_pending_transfers_expires_at ON pending_transfers(expires_at);
CREATE INDEX IF NOT EXISTS idx_transfer_signatures_pending_id ON transfer_signatures(pending_transfer_id);

-- ================= MARKETPLACE MIGRATION =================
-- Run these if tables already exist

ALTER TABLE users ADD COLUMN IF NOT EXISTS balance DECIMAL(20, 2) DEFAULT 0.0;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS price DECIMAL(20, 2) DEFAULT 0.0;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';


-- 6. SEED DATA (Hybrid Core Architecture)
-- Seed default users with PII since they are now anonymous on-chain
INSERT INTO users (id, full_name, identity_number, role, status) VALUES 
('user01', 'User One', 'ID001', 'User', 'Active'),
('Tomoko', 'Tomoko', 'ID002', 'User', 'Active'),
('Brad', 'Brad', 'ID003', 'User', 'Active'),
('JinSoo', 'Jin Soo', 'ID004', 'User', 'Active'),
('Max', 'Max', 'ID005', 'User', 'Active'),
('Adriana', 'Adriana', 'ID006', 'User', 'Active'),
('Michel', 'Michel', 'ID007', 'User', 'Active'),
('admin', 'System Admin', 'ID000', 'Admin', 'Active'),
('auditor', 'Auditor One', 'ID999', 'Auditor', 'Active')
ON CONFLICT (id) DO NOTHING;

