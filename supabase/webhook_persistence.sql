-- ============================================================================
-- WEBHOOK PERSISTENCE SCHEMA
-- Multi-Provider, Future-Proof Event Storage
-- ============================================================================
--
-- PURPOSE:
-- This schema persists webhook events BEFORE any processing occurs.
-- It serves as an immutable audit trail and enables async processing.
--
-- DESIGN PRINCIPLES:
-- 1. Provider-agnostic (Stripe, PayPal, future providers)
-- 2. Payload stored as hash only (privacy/compliance)
-- 3. Never auto-delete events
-- 4. Support async/queue-based consumers
--
-- INVARIANTS:
-- - Every verified webhook is persisted
-- - Every persisted webhook has a payload hash
-- - No event is processed before persistence
-- - Failed events are preserved forever
--
-- ============================================================================

-- ============================================================================
-- ENUM: Webhook Provider
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE webhook_provider AS ENUM (
        'stripe',
        'paypal',
        'wise',
        'plaid',
        'internal',
        'test'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- ENUM: Verification Status
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE webhook_verification_status AS ENUM (
        'pending',           -- Not yet verified
        'verified',          -- Signature valid
        'failed',            -- Signature invalid
        'skipped'            -- Verification not applicable (internal events)
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- ENUM: Processing Status
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE webhook_processing_status AS ENUM (
        'pending',           -- Awaiting processing
        'queued',            -- Added to processing queue
        'processing',        -- Currently being processed
        'completed',         -- Successfully processed
        'failed',            -- Processing failed
        'retrying',          -- Scheduled for retry
        'dead_letter',       -- Exceeded retry limit
        'skipped',           -- Intentionally not processed
        'superseded'         -- Replaced by newer event
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLE: webhook_events_v2
-- Enhanced schema for multi-provider support
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_events_v2 (
    -- ========================================================================
    -- IDENTITY
    -- ========================================================================
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- External event ID from provider (e.g., evt_xxx for Stripe)
    -- Combined with provider forms the idempotency key
    event_id VARCHAR(255) NOT NULL,
    
    -- Provider identifier
    provider webhook_provider NOT NULL DEFAULT 'stripe',
    
    -- ========================================================================
    -- EVENT METADATA
    -- ========================================================================
    
    -- Event type (e.g., "payment_intent.succeeded")
    event_type VARCHAR(255) NOT NULL,
    
    -- Provider's API version (for schema compatibility)
    api_version VARCHAR(50),
    
    -- Provider's event creation timestamp
    event_timestamp TIMESTAMPTZ,
    
    -- ========================================================================
    -- VERIFICATION STATE
    -- ========================================================================
    
    verification_status webhook_verification_status NOT NULL DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    verification_error TEXT,
    
    -- ========================================================================
    -- PROCESSING STATE
    -- ========================================================================
    
    processing_status webhook_processing_status NOT NULL DEFAULT 'pending',
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    processing_error TEXT,
    processing_error_code VARCHAR(100),
    
    -- ========================================================================
    -- PAYLOAD SECURITY
    -- ========================================================================
    
    -- SHA-256 hash of raw payload (for integrity & replay detection)
    -- We store hash, NOT the raw payload (privacy/compliance)
    raw_payload_hash VARCHAR(64) NOT NULL,
    
    -- Encrypted payload reference (if needed for reprocessing)
    -- Points to encrypted blob storage, NOT inline storage
    encrypted_payload_ref VARCHAR(255),
    
    -- ========================================================================
    -- REQUEST METADATA
    -- ========================================================================
    
    -- Request ID from provider (for tracing)
    request_id VARCHAR(255),
    
    -- Hash of relevant headers (for debugging)
    headers_hash VARCHAR(64),
    
    -- Source information
    source_ip VARCHAR(45),
    user_agent TEXT,
    
    -- ========================================================================
    -- RETRY & DEAD-LETTER
    -- ========================================================================
    
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 5,
    next_retry_at TIMESTAMPTZ,
    
    -- When moved to dead letter
    dead_letter_at TIMESTAMPTZ,
    dead_letter_reason TEXT,
    
    -- ========================================================================
    -- CONCURRENCY CONTROL
    -- ========================================================================
    
    lock_token UUID,
    lock_acquired_at TIMESTAMPTZ,
    lock_expires_at TIMESTAMPTZ,
    
    -- Optimistic concurrency version
    version INTEGER NOT NULL DEFAULT 1,
    
    -- ========================================================================
    -- AUDIT TRAIL
    -- ========================================================================
    
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- ========================================================================
    -- ASYNC PROCESSING SUPPORT
    -- ========================================================================
    
    -- Queue assignment (for multi-queue architectures)
    queue_name VARCHAR(100),
    queue_priority INTEGER DEFAULT 0,
    queued_at TIMESTAMPTZ,
    
    -- Processor assignment (for debugging)
    processor_id VARCHAR(100),
    
    -- ========================================================================
    -- CONSTRAINTS
    -- ========================================================================
    
    -- Idempotency: unique per provider + event_id
    CONSTRAINT webhook_events_v2_idempotency_key 
        UNIQUE (provider, event_id),
    
    -- Lock integrity
    CONSTRAINT webhook_events_v2_lock_check 
        CHECK (lock_expires_at IS NULL OR lock_expires_at > lock_acquired_at),
    
    -- Retry sanity
    CONSTRAINT webhook_events_v2_retry_check 
        CHECK (retry_count >= 0 AND retry_count <= max_retries + 1)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Idempotency lookup (covered by unique constraint)
CREATE INDEX IF NOT EXISTS idx_webhook_events_v2_lookup 
    ON webhook_events_v2(provider, event_id);

-- Processing queue queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_v2_pending 
    ON webhook_events_v2(processing_status, queue_priority DESC, created_at ASC)
    WHERE processing_status IN ('pending', 'queued');

-- Retry queue
CREATE INDEX IF NOT EXISTS idx_webhook_events_v2_retry 
    ON webhook_events_v2(next_retry_at ASC)
    WHERE processing_status = 'retrying' AND next_retry_at IS NOT NULL;

-- Dead letter monitoring
CREATE INDEX IF NOT EXISTS idx_webhook_events_v2_dead_letter 
    ON webhook_events_v2(dead_letter_at DESC)
    WHERE processing_status = 'dead_letter';

-- Expired locks (for recovery)
CREATE INDEX IF NOT EXISTS idx_webhook_events_v2_expired_locks 
    ON webhook_events_v2(lock_expires_at)
    WHERE lock_token IS NOT NULL;

-- Event type analysis
CREATE INDEX IF NOT EXISTS idx_webhook_events_v2_type 
    ON webhook_events_v2(provider, event_type, created_at DESC);

-- Time-based queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_v2_received 
    ON webhook_events_v2(received_at DESC);

-- Verification failures
CREATE INDEX IF NOT EXISTS idx_webhook_events_v2_verification_failed 
    ON webhook_events_v2(verification_status, created_at DESC)
    WHERE verification_status = 'failed';

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_webhook_events_v2_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS webhook_events_v2_timestamp_trigger ON webhook_events_v2;
CREATE TRIGGER webhook_events_v2_timestamp_trigger
    BEFORE UPDATE ON webhook_events_v2
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_events_v2_timestamp();

-- ============================================================================
-- TABLE: webhook_processing_log
-- Detailed processing history (for debugging & audit)
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_processing_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to the event
    webhook_event_id UUID NOT NULL REFERENCES webhook_events_v2(id),
    
    -- What happened
    action VARCHAR(50) NOT NULL,  -- 'received', 'verified', 'queued', 'processing_started', 'completed', 'failed', 'retried', 'dead_lettered'
    
    -- Previous and new status
    previous_status webhook_processing_status,
    new_status webhook_processing_status,
    
    -- Details
    message TEXT,
    error_details JSONB,
    
    -- Context
    processor_id VARCHAR(100),
    duration_ms INTEGER,
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_processing_log_event 
    ON webhook_processing_log(webhook_event_id, created_at DESC);

-- ============================================================================
-- TABLE: webhook_metrics_hourly
-- Aggregated metrics for monitoring
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_metrics_hourly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Time bucket
    hour_start TIMESTAMPTZ NOT NULL,
    
    -- Provider breakdown
    provider webhook_provider NOT NULL,
    
    -- Counts
    events_received INTEGER NOT NULL DEFAULT 0,
    events_verified INTEGER NOT NULL DEFAULT 0,
    events_verification_failed INTEGER NOT NULL DEFAULT 0,
    events_duplicate INTEGER NOT NULL DEFAULT 0,
    events_processed INTEGER NOT NULL DEFAULT 0,
    events_failed INTEGER NOT NULL DEFAULT 0,
    events_dead_lettered INTEGER NOT NULL DEFAULT 0,
    
    -- Timing (milliseconds)
    avg_processing_time_ms NUMERIC(10, 2),
    max_processing_time_ms INTEGER,
    p50_processing_time_ms INTEGER,
    p95_processing_time_ms INTEGER,
    p99_processing_time_ms INTEGER,
    
    -- By event type
    events_by_type JSONB,
    errors_by_type JSONB,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT webhook_metrics_hourly_unique 
        UNIQUE (hour_start, provider)
);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE webhook_events_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_processing_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_metrics_hourly ENABLE ROW LEVEL SECURITY;

-- Service role: full access
CREATE POLICY webhook_events_v2_service ON webhook_events_v2
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY webhook_processing_log_service ON webhook_processing_log
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY webhook_metrics_hourly_service ON webhook_metrics_hourly
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Admin: read-only for monitoring
CREATE POLICY webhook_events_v2_admin_read ON webhook_events_v2
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY webhook_processing_log_admin_read ON webhook_processing_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- ============================================================================
-- MIGRATION: Copy from webhook_events to webhook_events_v2 (if exists)
-- ============================================================================

-- This is a one-time migration helper. Run manually if needed.
-- DO NOT auto-execute in production.

/*
INSERT INTO webhook_events_v2 (
    event_id,
    provider,
    event_type,
    api_version,
    event_timestamp,
    verification_status,
    verified_at,
    processing_status,
    processing_started_at,
    processing_completed_at,
    processing_error,
    raw_payload_hash,
    source_ip,
    user_agent,
    retry_count,
    max_retries,
    next_retry_at,
    lock_token,
    lock_acquired_at,
    lock_expires_at,
    received_at,
    created_at,
    updated_at
)
SELECT 
    event_id,
    'stripe'::webhook_provider,
    event_type,
    api_version,
    event_timestamp,
    CASE 
        WHEN status IN ('verified', 'processing', 'processed', 'completed') THEN 'verified'::webhook_verification_status
        WHEN status = 'rejected' THEN 'failed'::webhook_verification_status
        ELSE 'pending'::webhook_verification_status
    END,
    CASE WHEN status IN ('verified', 'processing', 'processed', 'completed') THEN created_at ELSE NULL END,
    CASE status
        WHEN 'received' THEN 'pending'::webhook_processing_status
        WHEN 'verified' THEN 'pending'::webhook_processing_status
        WHEN 'processing' THEN 'processing'::webhook_processing_status
        WHEN 'processed' THEN 'completed'::webhook_processing_status
        WHEN 'completed' THEN 'completed'::webhook_processing_status
        WHEN 'failed' THEN 'failed'::webhook_processing_status
        WHEN 'retrying' THEN 'retrying'::webhook_processing_status
        WHEN 'rejected' THEN 'skipped'::webhook_processing_status
        WHEN 'duplicate' THEN 'skipped'::webhook_processing_status
        ELSE 'pending'::webhook_processing_status
    END,
    processing_started_at,
    processing_completed_at,
    error_message,
    payload_hash,
    source_ip,
    user_agent,
    retry_count,
    max_retries,
    next_retry_at,
    lock_token,
    lock_acquired_at,
    lock_expires_at,
    created_at,
    created_at,
    updated_at
FROM webhook_events
ON CONFLICT (provider, event_id) DO NOTHING;
*/
