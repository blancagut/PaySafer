-- ============================================================================
-- WEBHOOK EVENTS TABLE
-- Idempotency, Replay Protection & Concurrency Control
-- ============================================================================
-- 
-- PURPOSE:
-- This table is the SINGLE SOURCE OF TRUTH for webhook event deduplication.
-- It ensures exactly-once semantics in a distributed serverless environment.
--
-- DESIGN PRINCIPLES:
-- 1. Database-enforced uniqueness (not application-level)
-- 2. Pessimistic locking via unique constraints
-- 3. Payload hash for replay attack detection
-- 4. Immutable audit trail
--
-- WHY event_id AND NOT request_id:
-- - request_id changes on every Stripe retry
-- - event_id is stable across retries
-- - event_id is the canonical identifier for idempotency
--
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM: Event Lifecycle States
-- ============================================================================
-- 
-- State Transition Diagram:
--
--   ┌─────────────┐
--   │  RECEIVED   │ ← Initial state (signature verified, event logged)
--   └──────┬──────┘
--          │
--          ▼
--   ┌─────────────┐
--   │  VERIFIED   │ ← Idempotency check passed, ready for processing
--   └──────┬──────┘
--          │
--          ├────────────────┬────────────────┐
--          ▼                ▼                ▼
--   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
--   │  PROCESSED  │  │   FAILED    │  │  REJECTED   │
--   └─────────────┘  └─────────────┘  └─────────────┘
--          │                │
--          │                ▼
--          │         ┌─────────────┐
--          │         │   RETRYING  │ ← Internal retry scheduled
--          │         └─────────────┘
--          │
--          ▼
--   ┌─────────────┐
--   │  COMPLETED  │ ← Terminal success state
--   └─────────────┘
--
-- Parallel path (detected during idempotency check):
--
--   ┌─────────────┐
--   │  DUPLICATE  │ ← Same event_id, same payload hash
--   └─────────────┘
--
--   ┌─────────────┐
--   │ REPLAY_ALERT│ ← Same event_id, DIFFERENT payload hash (SECURITY!)
--   └─────────────┘

CREATE TYPE webhook_event_status AS ENUM (
    'received',      -- Event received and signature verified
    'verified',      -- Idempotency check passed
    'processing',    -- Currently being processed (lock held)
    'processed',     -- Processing completed (placeholder)
    'completed',     -- Terminal success state
    'failed',        -- Processing failed
    'retrying',      -- Scheduled for retry
    'rejected',      -- Rejected (validation failed)
    'duplicate',     -- Duplicate event (same payload)
    'replay_alert'   -- SECURITY: Same ID, different payload
);

-- ============================================================================
-- TABLE: webhook_events
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_events (
    -- Primary key (internal)
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- ========================================================================
    -- IDEMPOTENCY KEY (The critical field)
    -- ========================================================================
    -- This is the Stripe event ID (e.g., "evt_1234567890")
    -- UNIQUE constraint enforces idempotency at database level
    -- Any INSERT with duplicate event_id will fail with unique violation
    event_id VARCHAR(255) NOT NULL,
    
    -- ========================================================================
    -- REPLAY DETECTION
    -- ========================================================================
    -- SHA-256 hash of the raw payload
    -- Used to detect replay attacks where same event_id has different payload
    -- If event_id exists but payload_hash differs → SECURITY ALERT
    payload_hash VARCHAR(64) NOT NULL,
    
    -- ========================================================================
    -- EVENT METADATA (Safe to log)
    -- ========================================================================
    event_type VARCHAR(255) NOT NULL,           -- e.g., "payment_intent.succeeded"
    event_timestamp TIMESTAMPTZ NOT NULL,        -- Stripe's event creation time
    api_version VARCHAR(50),                     -- Stripe API version
    
    -- ========================================================================
    -- PROCESSING STATE
    -- ========================================================================
    status webhook_event_status NOT NULL DEFAULT 'received',
    
    -- ========================================================================
    -- CONCURRENCY CONTROL
    -- ========================================================================
    -- Lock token for distributed locking
    -- NULL = not locked, UUID = locked by that processor
    lock_token UUID,
    lock_acquired_at TIMESTAMPTZ,
    lock_expires_at TIMESTAMPTZ,
    
    -- ========================================================================
    -- AUDIT TRAIL
    -- ========================================================================
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Processing metadata
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    
    -- Error tracking
    error_message TEXT,
    error_code VARCHAR(100),
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    
    -- Request metadata (for debugging)
    source_ip VARCHAR(45),
    user_agent TEXT,
    
    -- ========================================================================
    -- CONSTRAINTS
    -- ========================================================================
    
    -- CRITICAL: Unique constraint on event_id
    -- This is the idempotency guarantee
    CONSTRAINT webhook_events_event_id_unique UNIQUE (event_id),
    
    -- Lock expiry must be after acquisition
    CONSTRAINT webhook_events_lock_expiry_check 
        CHECK (lock_expires_at IS NULL OR lock_expires_at > lock_acquired_at)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast lookup by event_id (covered by unique constraint, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id 
    ON webhook_events(event_id);

-- Find events by status (for monitoring and retry processing)
CREATE INDEX IF NOT EXISTS idx_webhook_events_status 
    ON webhook_events(status);

-- Find events needing retry
CREATE INDEX IF NOT EXISTS idx_webhook_events_retry 
    ON webhook_events(status, next_retry_at) 
    WHERE status = 'retrying' AND next_retry_at IS NOT NULL;

-- Find expired locks (for lock recovery)
CREATE INDEX IF NOT EXISTS idx_webhook_events_expired_locks 
    ON webhook_events(lock_expires_at) 
    WHERE lock_token IS NOT NULL AND lock_expires_at < NOW();

-- Time-based queries for monitoring
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at 
    ON webhook_events(created_at DESC);

-- Event type analysis
CREATE INDEX IF NOT EXISTS idx_webhook_events_type 
    ON webhook_events(event_type, created_at DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_webhook_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER webhook_events_updated_at_trigger
    BEFORE UPDATE ON webhook_events
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_events_updated_at();

-- ============================================================================
-- TABLE: webhook_alerts
-- Security and operational alerts
-- ============================================================================

CREATE TYPE webhook_alert_severity AS ENUM (
    'info',
    'warning',
    'critical',
    'security'
);

CREATE TYPE webhook_alert_type AS ENUM (
    'replay_attack',           -- Same event_id, different payload
    'high_duplicate_volume',   -- Unusual duplicate rate
    'processing_failure',      -- Repeated processing failures
    'lock_timeout',            -- Lock held too long
    'signature_failure_spike', -- Many signature failures
    'unknown_event_type'       -- Unhandled event type
);

CREATE TABLE IF NOT EXISTS webhook_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    alert_type webhook_alert_type NOT NULL,
    severity webhook_alert_severity NOT NULL,
    
    -- Related event (if applicable)
    webhook_event_id UUID REFERENCES webhook_events(id),
    event_id VARCHAR(255),
    
    -- Alert details
    message TEXT NOT NULL,
    details JSONB,
    
    -- Resolution tracking
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    resolution_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_alerts_severity 
    ON webhook_alerts(severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_alerts_unacknowledged 
    ON webhook_alerts(created_at DESC) 
    WHERE acknowledged_at IS NULL;

-- ============================================================================
-- TABLE: webhook_metrics
-- Aggregated metrics for monitoring
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Time bucket (hourly aggregation)
    bucket_start TIMESTAMPTZ NOT NULL,
    bucket_end TIMESTAMPTZ NOT NULL,
    
    -- Counts
    total_received INTEGER NOT NULL DEFAULT 0,
    total_verified INTEGER NOT NULL DEFAULT 0,
    total_duplicates INTEGER NOT NULL DEFAULT 0,
    total_replay_alerts INTEGER NOT NULL DEFAULT 0,
    total_processed INTEGER NOT NULL DEFAULT 0,
    total_failed INTEGER NOT NULL DEFAULT 0,
    total_rejected INTEGER NOT NULL DEFAULT 0,
    
    -- Timing (milliseconds)
    avg_processing_time_ms INTEGER,
    max_processing_time_ms INTEGER,
    p95_processing_time_ms INTEGER,
    
    -- By event type (JSONB for flexibility)
    events_by_type JSONB,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT webhook_metrics_bucket_unique 
        UNIQUE (bucket_start)
);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_metrics ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for webhook processing)
CREATE POLICY webhook_events_service_policy ON webhook_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY webhook_alerts_service_policy ON webhook_alerts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY webhook_metrics_service_policy ON webhook_metrics
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Admins can read (for monitoring dashboards)
CREATE POLICY webhook_events_admin_read ON webhook_events
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY webhook_alerts_admin_read ON webhook_alerts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );
