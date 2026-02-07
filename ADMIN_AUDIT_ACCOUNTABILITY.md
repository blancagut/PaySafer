# ADMIN AUDIT & ACCOUNTABILITY LAYER — Compliance & Legal Defensibility

**Version:** 1.0.0  
**Status:** Authoritative  
**Date:** 2026-02-05  
**Classification:** COMPLIANCE-CRITICAL — LEGAL HOLD CAPABLE  
**Compliance Frameworks:** SOX, PCI-DSS 4.0, SOC 2 Type II, GDPR Article 30

> ⚠️ **LEGAL NOTICE**: This document defines the audit and accountability system that makes all admin actions legally defensible. Audit logs are immutable, permanent, and designed to survive regulatory examination and litigation discovery.

---

## TABLE OF CONTENTS

1. [Foundational Principles](#1-foundational-principles)
2. [Audit Event Schema](#2-audit-event-schema)
3. [Action-to-Audit Mapping](#3-action-to-audit-mapping)
4. [Storage & Retention](#4-storage--retention)
5. [Access Control](#5-access-control)
6. [User Notification Requirements](#6-user-notification-requirements)
7. [Oversight & Review Processes](#7-oversight--review-processes)
8. [Anomaly Detection & Alerting](#8-anomaly-detection--alerting)
9. [Forbidden Operations](#9-forbidden-operations)
10. [Legal & Compliance Integration](#10-legal--compliance-integration)

---

## 1. FOUNDATIONAL PRINCIPLES

### 1.1 Audit Invariants

| Invariant | Description | Enforcement |
|-----------|-------------|-------------|
| **No Action Without Record** | Every admin action generates an audit log | Database trigger + API middleware |
| **No Record Without Actor** | Every audit log has attributed actor | NOT NULL constraint + validation |
| **Immutability** | Audit logs cannot be modified or deleted | No UPDATE/DELETE policies + triggers |
| **Completeness** | All fields captured at time of action | Synchronous logging in same transaction |
| **Permanence** | Logs outlive users, admins, and transactions | No cascade delete, no expiration |
| **Attributability** | Every action traceable to specific human | UUID actor linkage + session correlation |
| **Non-Repudiation** | Actor cannot deny performing action | Cryptographic session binding |

### 1.2 Compliance Framework Alignment

| Framework | Requirement | How We Comply |
|-----------|-------------|---------------|
| **SOX Section 404** | Internal controls over financial reporting | Immutable audit trail, segregation of duties |
| **PCI-DSS 10.x** | Track all access to cardholder data | All admin access logged, 1-year retention |
| **SOC 2 CC6.1** | Logical access controls | Role-based access, audit logging |
| **GDPR Article 30** | Records of processing activities | Complete data lineage in logs |
| **SOC 2 CC7.2** | System monitoring | Real-time anomaly detection |

### 1.3 Chain of Custody

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AUDIT CHAIN OF CUSTODY                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Admin Action                                                       │
│        │                                                             │
│        ▼                                                             │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │ 1. ACTION INITIATED                                     │       │
│   │    • Actor ID captured from JWT                         │       │
│   │    • Session ID captured                                │       │
│   │    • Request ID generated (UUID v7 - time-ordered)      │       │
│   │    • IP address captured                                │       │
│   │    • User agent captured                                │       │
│   │    • Timestamp captured (server-side, UTC)              │       │
│   └─────────────────────────────────────────────────────────┘       │
│        │                                                             │
│        ▼                                                             │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │ 2. PRE-ACTION STATE CAPTURED                            │       │
│   │    • Current state of target entity                     │       │
│   │    • Snapshot stored as JSON                            │       │
│   └─────────────────────────────────────────────────────────┘       │
│        │                                                             │
│        ▼                                                             │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │ 3. ACTION EXECUTED                                      │       │
│   │    • Within database transaction                        │       │
│   │    • Audit log INSERT in same transaction               │       │
│   │    • Both succeed or both fail (atomic)                 │       │
│   └─────────────────────────────────────────────────────────┘       │
│        │                                                             │
│        ▼                                                             │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │ 4. POST-ACTION STATE CAPTURED                           │       │
│   │    • New state of target entity                         │       │
│   │    • Snapshot stored as JSON                            │       │
│   │    • Diff computed and stored                           │       │
│   └─────────────────────────────────────────────────────────┘       │
│        │                                                             │
│        ▼                                                             │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │ 5. AUDIT LOG COMMITTED                                  │       │
│   │    • Transaction committed                              │       │
│   │    • Log ID returned                                    │       │
│   │    • Immutable from this point                          │       │
│   └─────────────────────────────────────────────────────────┘       │
│        │                                                             │
│        ▼                                                             │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │ 6. ASYNC NOTIFICATIONS                                  │       │
│   │    • User notifications queued                          │       │
│   │    • Notification references audit log ID               │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. AUDIT EVENT SCHEMA

### 2.1 Core Schema Definition

```sql
-- ============================================================================
-- AUDIT_LOGS TABLE — IMMUTABLE COMPLIANCE RECORD
-- ============================================================================
-- 
-- This table is the single source of truth for all administrative actions.
-- NO UPDATE OR DELETE OPERATIONS ARE PERMITTED UNDER ANY CIRCUMSTANCE.
-- 
-- Compliance: SOX 404, PCI-DSS 10.2, SOC 2 CC6.1, GDPR Article 30
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  -- ═══════════════════════════════════════════════════════════════════════
  -- PRIMARY IDENTIFIER (Immutable)
  -- ═══════════════════════════════════════════════════════════════════════
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Time-ordered ID for efficient range queries (UUID v7 compatible)
  sequence_id BIGINT GENERATED ALWAYS AS IDENTITY,
  
  -- ═══════════════════════════════════════════════════════════════════════
  -- EVENT CLASSIFICATION (Immutable)
  -- ═══════════════════════════════════════════════════════════════════════
  event_type TEXT NOT NULL,                    -- e.g., 'dispute_resolved'
  event_category TEXT NOT NULL,                -- e.g., 'DISPUTE', 'TRANSACTION', 'ACCOUNT'
  event_severity TEXT NOT NULL DEFAULT 'INFO', -- 'INFO', 'WARNING', 'CRITICAL'
  
  -- ═══════════════════════════════════════════════════════════════════════
  -- ACTOR ATTRIBUTION (Immutable) — WHO did this?
  -- ═══════════════════════════════════════════════════════════════════════
  actor_id UUID,                               -- NULL only for system events
  actor_email TEXT,                            -- Denormalized for permanence
  actor_role TEXT NOT NULL,                    -- 'admin', 'senior_admin', 'system'
  actor_session_id UUID,                       -- Links to auth session
  
  -- ═══════════════════════════════════════════════════════════════════════
  -- TARGET IDENTIFICATION (Immutable) — WHAT was affected?
  -- ═══════════════════════════════════════════════════════════════════════
  target_table TEXT NOT NULL,                  -- e.g., 'transactions', 'disputes'
  target_id UUID NOT NULL,                     -- Primary key of affected record
  target_secondary_id UUID,                    -- Related entity (e.g., dispute → transaction)
  
  -- ═══════════════════════════════════════════════════════════════════════
  -- STATE CAPTURE (Immutable) — WHAT changed?
  -- ═══════════════════════════════════════════════════════════════════════
  old_values JSONB,                            -- State before action (NULL for creates)
  new_values JSONB,                            -- State after action (NULL for deletes)
  changed_fields TEXT[],                       -- List of modified field names
  
  -- ═══════════════════════════════════════════════════════════════════════
  -- JUSTIFICATION (Immutable) — WHY was this done?
  -- ═══════════════════════════════════════════════════════════════════════
  justification TEXT,                          -- Admin's stated reason
  justification_category TEXT,                 -- Categorized reason code
  evidence_reviewed BOOLEAN DEFAULT false,     -- Attestation for disputes
  approval_reference TEXT,                     -- Ticket/approval ID if required
  
  -- ═══════════════════════════════════════════════════════════════════════
  -- CORRELATION IDS (Immutable) — HOW does this relate to other events?
  -- ═══════════════════════════════════════════════════════════════════════
  request_id UUID NOT NULL,                    -- Unique per API request
  correlation_id UUID,                         -- Groups related events
  parent_event_id UUID REFERENCES audit_logs(id), -- For multi-step actions
  
  -- ═══════════════════════════════════════════════════════════════════════
  -- REQUEST CONTEXT (Immutable) — WHERE did this come from?
  -- ═══════════════════════════════════════════════════════════════════════
  ip_address INET,                             -- Client IP (may be proxy)
  user_agent TEXT,                             -- Browser/client identifier
  origin_url TEXT,                             -- Referring page
  api_endpoint TEXT,                           -- API route called
  api_method TEXT,                             -- HTTP method
  
  -- ═══════════════════════════════════════════════════════════════════════
  -- OUTCOME (Immutable) — WHAT was the result?
  -- ═══════════════════════════════════════════════════════════════════════
  outcome TEXT NOT NULL DEFAULT 'success',     -- 'success', 'failure', 'partial'
  error_code TEXT,                             -- If failed
  error_message TEXT,                          -- If failed
  
  -- ═══════════════════════════════════════════════════════════════════════
  -- FINANCIAL IMPACT (Immutable) — For SOX compliance
  -- ═══════════════════════════════════════════════════════════════════════
  financial_impact BOOLEAN DEFAULT false,      -- Does this affect money movement?
  amount_affected DECIMAL(12, 2),              -- Dollar amount (if applicable)
  currency TEXT,                               -- Currency code
  
  -- ═══════════════════════════════════════════════════════════════════════
  -- USER NOTIFICATION (Immutable) — WHO was notified?
  -- ═══════════════════════════════════════════════════════════════════════
  users_notified UUID[],                       -- Array of user IDs notified
  notification_sent_at TIMESTAMPTZ,            -- When notification dispatched
  notification_template TEXT,                  -- Template used
  
  -- ═══════════════════════════════════════════════════════════════════════
  -- TIMESTAMPS (Immutable)
  -- ═══════════════════════════════════════════════════════════════════════
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- ═══════════════════════════════════════════════════════════════════════
  -- INTEGRITY (Immutable)
  -- ═══════════════════════════════════════════════════════════════════════
  checksum TEXT,                               -- SHA-256 of critical fields
  
  -- ═══════════════════════════════════════════════════════════════════════
  -- CONSTRAINTS
  -- ═══════════════════════════════════════════════════════════════════════
  CONSTRAINT valid_event_category CHECK (
    event_category IN ('TRANSACTION', 'DISPUTE', 'ACCOUNT', 'SYSTEM', 'SECURITY', 'COMPLIANCE')
  ),
  CONSTRAINT valid_severity CHECK (
    event_severity IN ('INFO', 'WARNING', 'CRITICAL')
  ),
  CONSTRAINT valid_outcome CHECK (
    outcome IN ('success', 'failure', 'partial', 'pending')
  ),
  CONSTRAINT valid_actor_role CHECK (
    actor_role IN ('admin', 'senior_admin', 'system', 'compliance', 'unknown')
  ),
  CONSTRAINT actor_required_for_non_system CHECK (
    actor_role = 'system' OR actor_id IS NOT NULL
  )
);

-- Performance indexes
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_table, target_id, created_at DESC);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type, created_at DESC);
CREATE INDEX idx_audit_logs_correlation ON audit_logs(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX idx_audit_logs_request ON audit_logs(request_id);
CREATE INDEX idx_audit_logs_financial ON audit_logs(financial_impact, created_at DESC) WHERE financial_impact = true;
CREATE INDEX idx_audit_logs_sequence ON audit_logs(sequence_id);
```

### 2.2 Field Classification

#### Required Fields (NOT NULL)

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `id` | UUID | Unique identifier | Auto-generated |
| `event_type` | TEXT | Action performed | Application code |
| `event_category` | TEXT | Classification | Application code |
| `actor_role` | TEXT | Role of performer | JWT + database lookup |
| `target_table` | TEXT | Affected table | Application code |
| `target_id` | UUID | Affected record | Application code |
| `request_id` | UUID | API request identifier | Request middleware |
| `outcome` | TEXT | Result of action | Application code |
| `created_at` | TIMESTAMPTZ | When logged | Database (NOW()) |

#### Conditionally Required Fields

| Field | Required When | Validation |
|-------|--------------|------------|
| `actor_id` | `actor_role != 'system'` | Database constraint |
| `justification` | Any mutation action | Application validation |
| `amount_affected` | `financial_impact = true` | Application validation |
| `error_code` | `outcome = 'failure'` | Application validation |
| `approval_reference` | Level 3 actions | Application validation |

#### Optional Fields

| Field | When Populated | Purpose |
|-------|----------------|---------|
| `old_values` | UPDATE operations | Before state |
| `new_values` | INSERT/UPDATE operations | After state |
| `parent_event_id` | Multi-step actions | Event linking |
| `correlation_id` | Related events | Event grouping |
| `ip_address` | Frontend requests | Forensics |
| `user_agent` | Frontend requests | Forensics |

### 2.3 Immutability Fields

**ALL FIELDS ARE IMMUTABLE AFTER INSERT.**

```sql
-- Trigger to prevent ANY modification to audit logs
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'AUDIT_IMMUTABLE: Audit logs cannot be modified. Event ID: %', OLD.id
      USING ERRCODE = 'restrict_violation';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'AUDIT_IMMUTABLE: Audit logs cannot be deleted. Event ID: %', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();
```

### 2.4 Checksum Generation

```sql
-- Generate integrity checksum for critical fields
CREATE OR REPLACE FUNCTION generate_audit_checksum()
RETURNS TRIGGER AS $$
BEGIN
  NEW.checksum := encode(
    sha256(
      (
        COALESCE(NEW.event_type, '') ||
        COALESCE(NEW.actor_id::text, 'SYSTEM') ||
        COALESCE(NEW.target_table, '') ||
        COALESCE(NEW.target_id::text, '') ||
        COALESCE(NEW.old_values::text, '') ||
        COALESCE(NEW.new_values::text, '') ||
        COALESCE(NEW.justification, '') ||
        NEW.created_at::text
      )::bytea
    ),
    'hex'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_checksum
  BEFORE INSERT ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION generate_audit_checksum();
```

---

## 3. ACTION-TO-AUDIT MAPPING

### 3.1 Complete Audit Event Catalog

#### 3.1.1 Dispute Actions

| Action | Event Type | Category | Severity | Financial |
|--------|------------|----------|----------|-----------|
| Resolve dispute (buyer wins) | `dispute_resolved_buyer` | DISPUTE | CRITICAL | Yes |
| Resolve dispute (seller wins) | `dispute_resolved_seller` | DISPUTE | CRITICAL | Yes |
| Resolve dispute (partial) | `dispute_resolved_partial` | DISPUTE | CRITICAL | Yes |
| Withdraw dispute | `dispute_withdrawn` | DISPUTE | WARNING | Yes |
| Add dispute message | `dispute_message_sent` | DISPUTE | INFO | No |

#### 3.1.2 Transaction Actions

| Action | Event Type | Category | Severity | Financial |
|--------|------------|----------|----------|-----------|
| Manual refund | `transaction_manual_refund` | TRANSACTION | CRITICAL | Yes |
| Manual completion | `transaction_manual_complete` | TRANSACTION | CRITICAL | Yes |
| View transaction (sensitive) | `transaction_viewed` | TRANSACTION | INFO | No |

#### 3.1.3 Account Actions

| Action | Event Type | Category | Severity | Financial |
|--------|------------|----------|----------|-----------|
| Freeze account | `account_frozen` | ACCOUNT | WARNING | Indirect |
| Unfreeze account | `account_unfrozen` | ACCOUNT | INFO | No |
| Modify user role | `account_role_changed` | ACCOUNT | CRITICAL | No |
| Terminate account | `account_terminated` | ACCOUNT | CRITICAL | Indirect |

#### 3.1.4 Administrative Actions

| Action | Event Type | Category | Severity | Financial |
|--------|------------|----------|----------|-----------|
| Add internal note | `admin_note_added` | SYSTEM | INFO | No |
| Export data | `data_exported` | COMPLIANCE | WARNING | No |
| View audit logs | `audit_logs_accessed` | SECURITY | INFO | No |

#### 3.1.5 Security Events

| Event | Event Type | Category | Severity | Auto-Generated |
|-------|------------|----------|----------|----------------|
| Admin login | `admin_login` | SECURITY | INFO | Yes |
| Admin logout | `admin_logout` | SECURITY | INFO | Yes |
| Failed login attempt | `admin_login_failed` | SECURITY | WARNING | Yes |
| Session timeout | `admin_session_expired` | SECURITY | INFO | Yes |
| Permission denied | `permission_denied` | SECURITY | WARNING | Yes |
| Invalid action attempt | `invalid_action_attempted` | SECURITY | WARNING | Yes |

### 3.2 Detailed Audit Event Specifications

---

#### EVENT: `dispute_resolved_buyer`

**Trigger:** Admin resolves dispute in favor of buyer (full refund)

**Audit Record:**

```json
{
  "id": "aud_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "sequence_id": 1234567,
  "event_type": "dispute_resolved_buyer",
  "event_category": "DISPUTE",
  "event_severity": "CRITICAL",
  
  "actor_id": "adm_98765432-1abc-def0-1234-567890abcdef",
  "actor_email": "admin@secureescrow.me",
  "actor_role": "admin",
  "actor_session_id": "sess_abcd1234-5678-90ef-ghij-klmnopqrstuv",
  
  "target_table": "disputes",
  "target_id": "dsp_11111111-2222-3333-4444-555555555555",
  "target_secondary_id": "txn_66666666-7777-8888-9999-000000000000",
  
  "old_values": {
    "status": "under_review",
    "resolved_at": null,
    "resolved_by": null,
    "resolution": null
  },
  "new_values": {
    "status": "resolved",
    "resolved_at": "2026-02-05T14:30:00.000Z",
    "resolved_by": "admin",
    "resolution": "buyer_wins"
  },
  "changed_fields": ["status", "resolved_at", "resolved_by", "resolution"],
  
  "justification": "Buyer provided tracking showing item never shipped. Seller unresponsive for 7 days despite 3 contact attempts.",
  "justification_category": "NON_DELIVERY",
  "evidence_reviewed": true,
  "approval_reference": null,
  
  "request_id": "req_aaaabbbb-cccc-dddd-eeee-ffffffffffff",
  "correlation_id": "corr_12121212-3434-5656-7878-909090909090",
  "parent_event_id": null,
  
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "origin_url": "https://admin.secureescrow.me/disputes/dsp_11111111",
  "api_endpoint": "/api/admin/disputes/resolve",
  "api_method": "POST",
  
  "outcome": "success",
  "error_code": null,
  "error_message": null,
  
  "financial_impact": true,
  "amount_affected": 500.00,
  "currency": "USD",
  
  "users_notified": [
    "usr_buyer123-4567-8901-2345-678901234567",
    "usr_seller99-8765-4321-0987-654321098765"
  ],
  "notification_sent_at": "2026-02-05T14:30:05.000Z",
  "notification_template": "dispute_resolved_buyer_wins",
  
  "created_at": "2026-02-05T14:30:00.123Z",
  "checksum": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
}
```

**Linked Records:**

| Related Record | Relationship | Audit Event |
|----------------|--------------|-------------|
| Transaction | Updated | `transaction_status_changed` |
| Stripe Refund | Created | `stripe_refund_initiated` |
| Buyer Notification | Sent | `notification_sent` |
| Seller Notification | Sent | `notification_sent` |

---

#### EVENT: `transaction_manual_refund`

**Trigger:** Admin initiates refund outside dispute process

**Audit Record:**

```json
{
  "id": "aud_refund12-3456-7890-abcd-ef1234567890",
  "event_type": "transaction_manual_refund",
  "event_category": "TRANSACTION",
  "event_severity": "CRITICAL",
  
  "actor_id": "adm_senior99-1abc-def0-1234-567890abcdef",
  "actor_email": "senior.admin@secureescrow.me",
  "actor_role": "senior_admin",
  
  "target_table": "transactions",
  "target_id": "txn_66666666-7777-8888-9999-000000000000",
  
  "old_values": {
    "status": "in_escrow",
    "refunded_at": null
  },
  "new_values": {
    "status": "refunded",
    "refunded_at": "2026-02-05T15:00:00.000Z"
  },
  
  "justification": "Seller account flagged for fraud. Multiple buyer complaints (Tickets: SUP-1234, SUP-1235, SUP-1236). Refunding proactively.",
  "justification_category": "FRAUD_PREVENTION",
  "evidence_reviewed": true,
  
  "financial_impact": true,
  "amount_affected": 750.00,
  "currency": "USD",
  
  "outcome": "success",
  "created_at": "2026-02-05T15:00:00.456Z"
}
```

---

#### EVENT: `account_frozen`

**Trigger:** Admin freezes user account

**Audit Record:**

```json
{
  "id": "aud_freeze12-3456-7890-abcd-ef1234567890",
  "event_type": "account_frozen",
  "event_category": "ACCOUNT",
  "event_severity": "WARNING",
  
  "actor_id": "adm_98765432-1abc-def0-1234-567890abcdef",
  "actor_email": "admin@secureescrow.me",
  "actor_role": "admin",
  
  "target_table": "profiles",
  "target_id": "usr_suspect99-8765-4321-0987-654321098765",
  
  "old_values": {
    "frozen_at": null,
    "frozen_by": null,
    "frozen_reason": null
  },
  "new_values": {
    "frozen_at": "2026-02-05T16:00:00.000Z",
    "frozen_by": "adm_98765432-1abc-def0-1234-567890abcdef",
    "frozen_reason": "fraud_investigation",
    "frozen_until": "2026-02-19T16:00:00.000Z"
  },
  
  "justification": "Multiple fraud reports from buyers (3 reports in 7 days). Initiating investigation per policy FP-102.",
  "justification_category": "FRAUD_INVESTIGATION",
  
  "financial_impact": false,
  "outcome": "success",
  
  "users_notified": ["usr_suspect99-8765-4321-0987-654321098765"],
  "notification_template": "account_frozen_notice",
  
  "created_at": "2026-02-05T16:00:00.789Z"
}
```

---

#### EVENT: `permission_denied`

**Trigger:** Admin attempts action without sufficient permissions (auto-generated)

**Audit Record:**

```json
{
  "id": "aud_denied12-3456-7890-abcd-ef1234567890",
  "event_type": "permission_denied",
  "event_category": "SECURITY",
  "event_severity": "WARNING",
  
  "actor_id": "adm_standard1-1abc-def0-1234-567890abcdef",
  "actor_email": "junior.admin@secureescrow.me",
  "actor_role": "admin",
  
  "target_table": "profiles",
  "target_id": "usr_target123-4567-8901-2345-678901234567",
  
  "old_values": null,
  "new_values": {
    "attempted_action": "terminate_account",
    "required_level": 3,
    "actor_level": 1,
    "denial_reason": "Action requires compliance approval"
  },
  
  "justification": null,
  
  "ip_address": "192.168.1.200",
  "user_agent": "Mozilla/5.0...",
  "api_endpoint": "/api/admin/accounts/terminate",
  "api_method": "POST",
  
  "outcome": "failure",
  "error_code": "LEVEL_REQUIRED",
  "error_message": "This action requires Level 3 (Compliance) approval",
  
  "financial_impact": false,
  "users_notified": [],
  
  "created_at": "2026-02-05T17:00:00.123Z"
}
```

---

### 3.3 Correlation ID Usage

Correlation IDs group related audit events:

```
┌─────────────────────────────────────────────────────────────────────┐
│  CORRELATION EXAMPLE: Dispute Resolution                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  correlation_id: corr_12121212-3434-5656-7878-909090909090          │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Event 1: dispute_resolved_buyer                               │  │
│  │ sequence_id: 1001                                             │  │
│  │ target: disputes/dsp_111                                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                          │                                           │
│                          ▼                                           │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Event 2: transaction_status_changed                           │  │
│  │ sequence_id: 1002                                             │  │
│  │ target: transactions/txn_666                                  │  │
│  │ parent_event_id: Event 1 ID                                   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                          │                                           │
│                          ▼                                           │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Event 3: stripe_refund_initiated                              │  │
│  │ sequence_id: 1003                                             │  │
│  │ target: transactions/txn_666                                  │  │
│  │ parent_event_id: Event 2 ID                                   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                          │                                           │
│                          ▼                                           │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Event 4: notification_sent (buyer)                            │  │
│  │ sequence_id: 1004                                             │  │
│  │ target: notifications/ntf_aaa                                 │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                          │                                           │
│                          ▼                                           │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Event 5: notification_sent (seller)                           │  │
│  │ sequence_id: 1005                                             │  │
│  │ target: notifications/ntf_bbb                                 │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Query all related events:**
```sql
SELECT * FROM audit_logs 
WHERE correlation_id = 'corr_12121212-3434-5656-7878-909090909090'
ORDER BY sequence_id ASC;
```

---

## 4. STORAGE & RETENTION

### 4.1 Storage Rules

| Rule | Specification | Enforcement |
|------|---------------|-------------|
| **Append-Only** | INSERT only; no UPDATE or DELETE | Database triggers |
| **Same Transaction** | Audit log and action in single transaction | Application code |
| **Atomic Commit** | Both succeed or both fail | Database transaction |
| **No Truncation** | Table cannot be truncated | REVOKE TRUNCATE |
| **No Drop** | Table cannot be dropped | REVOKE DROP |
| **Backup Required** | Daily encrypted backups | Infrastructure |

### 4.2 Retention Policy

| Data Type | Retention Period | Legal Basis |
|-----------|------------------|-------------|
| Financial transactions | **PERMANENT** | SOX, Tax law |
| Dispute records | **PERMANENT** | Legal liability |
| Audit logs (financial) | **PERMANENT** | SOX 404 |
| Audit logs (non-financial) | **7 years minimum** | SOC 2, best practice |
| Security events | **7 years minimum** | PCI-DSS 10.7 |
| Login/logout events | **3 years minimum** | SOC 2 |
| Failed access attempts | **7 years minimum** | Security forensics |

### 4.3 Archival Process

```
┌─────────────────────────────────────────────────────────────────────┐
│  AUDIT LOG ARCHIVAL (After 2 Years)                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Hot Storage (< 90 days)                                           │
│   • Primary database                                                │
│   • Full query capability                                           │
│   • Real-time access                                                │
│                                                                      │
│   Warm Storage (90 days - 2 years)                                  │
│   • Partitioned tables                                              │
│   • Indexed but compressed                                          │
│   • Slower queries acceptable                                       │
│                                                                      │
│   Cold Storage (2+ years)                                           │
│   • Encrypted archive (AES-256)                                     │
│   • Immutable cloud storage (AWS S3 Glacier, Azure Archive)         │
│   • Legal hold capable                                              │
│   • Retrieval within 24 hours                                       │
│                                                                      │
│   ⚠️ NO DATA IS EVER DELETED                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.4 Backup Requirements

| Requirement | Specification |
|-------------|---------------|
| Frequency | Every 6 hours |
| Type | Incremental with daily full |
| Encryption | AES-256 at rest |
| Location | Geographically separate region |
| Retention | Same as source data |
| Testing | Monthly restore verification |
| RTO | 4 hours |
| RPO | 6 hours |

---

## 5. ACCESS CONTROL

### 5.1 Audit Log Access Matrix

| Role | Read All | Read Own | Export | Search | No Access |
|------|----------|----------|--------|--------|-----------|
| Standard Admin | ✅ | ✅ | ❌ | ✅ | — |
| Senior Admin | ✅ | ✅ | ✅ | ✅ | — |
| Compliance | ✅ | ✅ | ✅ | ✅ | — |
| System | ✅ | — | ✅ | ✅ | — |
| Regular User | ❌ | ❌ | ❌ | ❌ | ✅ |

### 5.2 Field-Level Access Control

| Field | Standard Admin | Senior Admin | Compliance |
|-------|----------------|--------------|------------|
| All standard fields | ✅ | ✅ | ✅ |
| `ip_address` | ❌ (masked) | ✅ | ✅ |
| `user_agent` | ❌ (masked) | ✅ | ✅ |
| `checksum` | ❌ (hidden) | ❌ (hidden) | ✅ |
| Actor email (other admins) | ❌ (masked) | ✅ | ✅ |

### 5.3 Query Restrictions

```sql
-- Standard Admin View (masks sensitive data)
CREATE VIEW admin_audit_logs AS
SELECT 
  id,
  sequence_id,
  event_type,
  event_category,
  event_severity,
  -- Mask other admin identities
  CASE 
    WHEN actor_id = auth.uid() THEN actor_email
    ELSE '***@secureescrow.me'
  END AS actor_email,
  actor_role,
  target_table,
  target_id,
  old_values,
  new_values,
  justification,
  -- Mask IP address
  CASE 
    WHEN actor_id = auth.uid() THEN ip_address::text
    ELSE regexp_replace(ip_address::text, '\d+$', 'xxx')
  END AS ip_address,
  outcome,
  financial_impact,
  amount_affected,
  created_at
FROM audit_logs
WHERE public.is_admin();

-- Senior Admin View (full access)
CREATE VIEW senior_admin_audit_logs AS
SELECT * FROM audit_logs
WHERE public.is_senior_admin();
```

### 5.4 Export Controls

| Export Type | Who Can Export | Approval Required | Logged |
|-------------|----------------|-------------------|--------|
| Single record | Senior Admin | No | Yes |
| Date range (< 30 days) | Senior Admin | No | Yes |
| Date range (≥ 30 days) | Compliance | Yes | Yes |
| Full export | Compliance | Legal approval | Yes |
| Litigation hold | Legal only | Court order | Yes |

---

## 6. USER NOTIFICATION REQUIREMENTS

### 6.1 Notification Matrix

| Admin Action | Notify User | Notification Type | Timing |
|--------------|-------------|-------------------|--------|
| Dispute resolved (buyer wins) | Both parties | Email + In-App | Immediate |
| Dispute resolved (seller wins) | Both parties | Email + In-App | Immediate |
| Dispute resolved (partial) | Both parties | Email + In-App | Immediate |
| Dispute withdrawn | Both parties | Email + In-App | Immediate |
| Manual refund | Both parties | Email + In-App | Immediate |
| Manual completion | Both parties | Email + In-App | Immediate |
| Account frozen | Affected user | Email | Immediate |
| Account unfrozen | Affected user | Email | Immediate |
| Account terminated | Affected user | Email | Immediate |
| Role changed | Affected user | Email | Immediate |
| Add dispute message | Both parties | Email + In-App | Immediate |
| Add internal note | ❌ None | — | — |
| View transaction | ❌ None | — | — |

### 6.2 Notification Content Requirements

#### Financial Impact Notifications

**REQUIRED elements:**
- Transaction ID
- Amount affected
- Action taken
- Reason summary (from justification)
- Expected timeline (e.g., refund in 5-10 days)
- Support contact information
- Dispute/appeal process (if applicable)

**FORBIDDEN elements:**
- Admin's personal email
- Admin's full name (use "SecureEscrow Support Team")
- Internal ticket references
- Other user's personal information

#### Example: Dispute Resolution Notification (Buyer Wins)

```
Subject: Your Dispute Has Been Resolved — Refund Approved

Dear [Buyer Name],

Your dispute for transaction [TXN-ABC123] has been reviewed and resolved.

RESOLUTION: Refund Approved
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Transaction Details:
• Transaction ID: TXN-ABC123
• Amount: $500.00 USD
• Original Purchase Date: January 15, 2026

Resolution Summary:
After reviewing the evidence provided by both parties, we have 
determined that the item was not delivered as described. A full 
refund has been approved.

What Happens Next:
• Your refund of $500.00 will be processed to your original 
  payment method
• Estimated arrival: 5-10 business days
• You will receive a confirmation when the refund is complete

Questions?
Contact our support team at support@secureescrow.me
Reference this case: CASE-2026-0205-1430

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SecureEscrow Trust & Safety Team
This decision was made by our trained support team after careful review.
```

### 6.3 Notification Audit Trail

Every notification generates its own audit event:

```json
{
  "event_type": "notification_sent",
  "event_category": "SYSTEM",
  "target_table": "notifications",
  "target_id": "ntf_aaa111-2222-3333-4444-555555555555",
  "new_values": {
    "recipient_id": "usr_buyer123-4567-8901-2345-678901234567",
    "recipient_email": "buyer@example.com",
    "template": "dispute_resolved_buyer_wins",
    "channel": "email",
    "correlation_id": "corr_12121212-3434-5656-7878-909090909090",
    "sent_at": "2026-02-05T14:30:05.000Z",
    "delivery_status": "sent"
  }
}
```

---

## 7. OVERSIGHT & REVIEW PROCESSES

### 7.1 Periodic Review Schedule

| Review Type | Frequency | Reviewer | Scope |
|-------------|-----------|----------|-------|
| Daily Activity Summary | Daily | Admin Lead | All admin actions |
| Financial Impact Review | Weekly | Finance | All `financial_impact = true` |
| Account Action Review | Weekly | Compliance | Freezes, terminations, role changes |
| Dispute Resolution Audit | Monthly | Legal | Random 10% sample |
| Full Audit Trail Review | Quarterly | External Auditor | Complete audit |
| Access Pattern Analysis | Monthly | Security | Anomaly detection |

### 7.2 Daily Activity Summary Report

**Auto-generated daily at 00:00 UTC:**

```
═══════════════════════════════════════════════════════════════════
ADMIN ACTIVITY SUMMARY — February 5, 2026
═══════════════════════════════════════════════════════════════════

OVERVIEW
────────────────────────────────────────────────────────────────────
Total Admin Actions:     47
Financial Impact:        12
Disputes Resolved:       8
Accounts Frozen:         2
Accounts Unfrozen:       1
Failed Attempts:         3

BY ADMIN
────────────────────────────────────────────────────────────────────
admin@secureescrow.me         │ 28 actions │ $4,250.00 affected
senior.admin@secureescrow.me  │ 15 actions │ $12,500.00 affected
compliance@secureescrow.me    │ 4 actions  │ $0.00 affected

CRITICAL ACTIONS (Require Review)
────────────────────────────────────────────────────────────────────
1. [14:30] Dispute DSP-111 resolved → Buyer ($500.00)
   Admin: admin@secureescrow.me
   Justification: "Buyer provided tracking showing item never shipped..."
   
2. [15:00] Manual Refund TXN-666 ($750.00)
   Admin: senior.admin@secureescrow.me
   Justification: "Seller account flagged for fraud..."
   
3. [16:00] Account Frozen USR-999
   Admin: admin@secureescrow.me
   Justification: "Multiple fraud reports..."

ANOMALIES DETECTED
────────────────────────────────────────────────────────────────────
⚠️ admin@secureescrow.me: 28 actions (above average of 15)
⚠️ 3 failed permission attempts by junior.admin@secureescrow.me

═══════════════════════════════════════════════════════════════════
Report ID: RPT-2026-0205-0000
Generated: 2026-02-06T00:00:00Z
═══════════════════════════════════════════════════════════════════
```

### 7.3 Monthly Dispute Resolution Audit

**Process:**
1. Random selection of 10% of resolved disputes
2. For each selected dispute:
   - Verify evidence was reviewed
   - Verify justification is adequate
   - Verify outcome is consistent with evidence
   - Verify notifications were sent
   - Verify financial records match

**Audit Checklist:**

| Check | Pass/Fail | Notes |
|-------|-----------|-------|
| Evidence reviewed checkbox = true | | |
| Justification ≥ minimum length | | |
| Justification addresses key facts | | |
| Outcome matches evidence | | |
| Both parties notified | | |
| Financial records reconcile | | |
| No policy violations | | |

### 7.4 Escalation Paths

```
┌─────────────────────────────────────────────────────────────────────┐
│  ESCALATION MATRIX                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Severity: LOW (Info events, routine actions)                       │
│  ├── Review: Daily summary                                          │
│  └── Escalation: None required                                      │
│                                                                      │
│  Severity: WARNING (Access denied, account freezes)                 │
│  ├── Review: Within 24 hours                                        │
│  ├── Reviewer: Admin Lead                                           │
│  └── Escalation: If pattern detected → Security Team                │
│                                                                      │
│  Severity: CRITICAL (Financial impact, terminations)                │
│  ├── Review: Within 4 hours                                         │
│  ├── Reviewer: Compliance + Finance                                 │
│  └── Escalation: Any irregularity → Legal + Executive               │
│                                                                      │
│  Anomaly Detected (Automated)                                       │
│  ├── Alert: Immediate (Slack/PagerDuty)                            │
│  ├── Reviewer: Security Team                                        │
│  └── Escalation: Confirmed threat → Incident Response               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. ANOMALY DETECTION & ALERTING

### 8.1 Anomaly Detection Rules

| Rule ID | Condition | Severity | Alert |
|---------|-----------|----------|-------|
| ANO-001 | Admin actions > 2x daily average | WARNING | Slack |
| ANO-002 | Financial actions > $50,000/day by single admin | CRITICAL | PagerDuty |
| ANO-003 | > 5 failed permission attempts in 1 hour | WARNING | Slack + Email |
| ANO-004 | Action on own account | CRITICAL | Immediate |
| ANO-005 | Action outside business hours (configurable) | INFO | Daily report |
| ANO-006 | Same target modified > 3 times in 1 hour | WARNING | Slack |
| ANO-007 | Bulk similar actions (> 10 same type in 1 hour) | WARNING | Slack |
| ANO-008 | Terminal state modification attempt | CRITICAL | PagerDuty |
| ANO-009 | Admin accessing other admin's records frequently | WARNING | Security review |
| ANO-010 | Geographic anomaly (login from new location) | WARNING | Email to admin |

### 8.2 Automated Alert Templates

**ANO-002: High Financial Impact**

```
🚨 ALERT: High Financial Impact Detected

Admin: senior.admin@secureescrow.me
Date: February 5, 2026
Total Financial Impact: $52,340.00 (threshold: $50,000)

Actions:
1. 14:30 - Manual Refund $12,500 (TXN-AAA)
2. 15:15 - Dispute Resolution $8,000 (DSP-BBB)
3. 16:00 - Manual Refund $15,000 (TXN-CCC)
4. 16:45 - Manual Refund $16,840 (TXN-DDD)

Required: Finance review within 4 hours
Alert ID: ALT-2026-0205-1645-ANO002
```

### 8.3 Alert Response Requirements

| Alert Severity | Response Time | Responder | Documentation |
|----------------|---------------|-----------|---------------|
| INFO | 24 hours | Admin Lead | Daily report |
| WARNING | 4 hours | Admin Lead + Security | Incident ticket |
| CRITICAL | 1 hour | Security + Compliance + Legal | Full incident report |

### 8.4 Alert Audit Trail

Alerts themselves are logged:

```json
{
  "event_type": "anomaly_alert_generated",
  "event_category": "SECURITY",
  "event_severity": "WARNING",
  "target_table": "audit_logs",
  "new_values": {
    "alert_rule": "ANO-002",
    "alert_description": "High financial impact detected",
    "triggered_by_admin": "adm_senior99-...",
    "threshold_value": 50000.00,
    "actual_value": 52340.00,
    "alert_channels": ["pagerduty", "slack"],
    "alert_id": "ALT-2026-0205-1645-ANO002"
  }
}
```

---

## 9. FORBIDDEN OPERATIONS

### 9.1 What Cannot Be Logged

| Data Type | Reason | Alternative |
|-----------|--------|-------------|
| Full credit card numbers | PCI-DSS | Log last 4 digits only |
| CVV/CVC codes | PCI-DSS | Never stored |
| Full bank account numbers | Security | Log last 4 digits only |
| User passwords | Security | Never logged |
| Password reset tokens | Security | Log occurrence only |
| API keys | Security | Log key prefix only |
| Session tokens | Security | Log session ID only |
| Webhook signing secrets | Security | Never logged |
| Other admin's justifications | Privacy | Masked unless senior admin |

### 9.2 What Cannot Be Modified

| Record Type | Modification | Enforcement |
|-------------|--------------|-------------|
| Audit logs | ANY field | Database trigger |
| Event timestamps | created_at | Database default |
| Actor attribution | actor_id, actor_role | NOT NULL constraint |
| Checksums | checksum | Computed field |
| Sequence IDs | sequence_id | GENERATED ALWAYS |
| Correlation IDs | After creation | Application logic |

### 9.3 What Cannot Be Deleted

| Record Type | Deletion | Enforcement |
|-------------|----------|-------------|
| Audit logs | ALL records | Database trigger |
| Transaction records | ALL records | No DELETE policy |
| Dispute records | ALL records | No DELETE policy |
| User profiles | Hard delete | Soft delete only |
| Notification records | ALL records | No DELETE policy |
| Archived data | ALL records | Immutable storage |

### 9.4 Enforcement Mechanisms

```sql
-- Prevent any modification to audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the attempt before rejecting
  INSERT INTO security_events (
    event_type,
    attempted_operation,
    target_table,
    target_id,
    actor_id,
    ip_address,
    blocked_at
  ) VALUES (
    'AUDIT_MODIFICATION_BLOCKED',
    TG_OP,
    'audit_logs',
    COALESCE(OLD.id, NEW.id),
    auth.uid(),
    inet_client_addr(),
    NOW()
  );
  
  RAISE EXCEPTION 'SECURITY_VIOLATION: Audit logs are immutable. This attempt has been logged. Event ID: %, Operation: %',
    COALESCE(OLD.id, NEW.id), TG_OP
    USING ERRCODE = 'restrict_violation';
    
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke dangerous permissions
REVOKE DELETE ON audit_logs FROM PUBLIC;
REVOKE UPDATE ON audit_logs FROM PUBLIC;
REVOKE TRUNCATE ON audit_logs FROM PUBLIC;
REVOKE DROP ON audit_logs FROM PUBLIC;
```

---

## 10. LEGAL & COMPLIANCE INTEGRATION

### 10.1 Litigation Hold Capability

When legal hold is required:

```sql
-- Legal hold flag (cannot be cleared without legal approval)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN DEFAULT false;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS legal_hold_reference TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS legal_hold_date TIMESTAMPTZ;

-- Function to apply legal hold
CREATE OR REPLACE FUNCTION apply_legal_hold(
  p_correlation_id UUID,
  p_legal_reference TEXT,
  p_authorized_by TEXT
)
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- Only compliance role can apply holds
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('compliance', 'admin') 
    AND is_legal_authorized = true
  ) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Only authorized compliance personnel can apply legal holds';
  END IF;
  
  UPDATE audit_logs SET
    legal_hold = true,
    legal_hold_reference = p_legal_reference,
    legal_hold_date = NOW()
  WHERE correlation_id = p_correlation_id
    OR target_id IN (
      SELECT target_id FROM audit_logs WHERE correlation_id = p_correlation_id
    );
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  -- Log the legal hold application
  INSERT INTO audit_logs (
    event_type,
    event_category,
    event_severity,
    actor_id,
    actor_role,
    target_table,
    target_id,
    new_values,
    request_id
  ) VALUES (
    'legal_hold_applied',
    'COMPLIANCE',
    'CRITICAL',
    auth.uid(),
    'compliance',
    'audit_logs',
    p_correlation_id,
    jsonb_build_object(
      'legal_reference', p_legal_reference,
      'authorized_by', p_authorized_by,
      'records_affected', affected_count
    ),
    gen_random_uuid()
  );
  
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 10.2 Regulatory Export Formats

| Regulator | Format | Fields Included | Encryption |
|-----------|--------|-----------------|------------|
| SOX Auditor | CSV + PDF | All non-PCI | AES-256 |
| PCI-DSS Auditor | JSON | Security events only | AES-256 |
| Court Order | Full database dump | As ordered | AES-256 + Legal custody |
| GDPR Data Request | JSON | User-specific only | TLS + Password |
| Internal Audit | Interactive UI | All fields | Role-based |

### 10.3 Evidence Package Generation

For disputes and legal matters:

```json
{
  "evidence_package": {
    "generated_at": "2026-02-05T18:00:00Z",
    "generated_by": "compliance@secureescrow.me",
    "legal_reference": "CASE-2026-0205-001",
    
    "transaction": {
      "id": "txn_66666666-7777-8888-9999-000000000000",
      "full_record": { /* complete transaction data */ },
      "state_history": [ /* all state changes */ ]
    },
    
    "dispute": {
      "id": "dsp_11111111-2222-3333-4444-555555555555",
      "full_record": { /* complete dispute data */ },
      "messages": [ /* all dispute messages */ ],
      "evidence_files": [ /* file references */ ]
    },
    
    "audit_trail": [
      /* All audit_logs with this correlation_id */
    ],
    
    "notifications": [
      /* All notifications sent to parties */
    ],
    
    "admin_actions": [
      /* All admin actions on this case */
    ],
    
    "integrity": {
      "package_checksum": "sha256:...",
      "individual_checksums": { /* per-record */ },
      "chain_verified": true
    }
  }
}
```

### 10.4 Compliance Reporting Queries

```sql
-- SOX: All financial impact actions in date range
SELECT 
  created_at,
  event_type,
  actor_email,
  target_id,
  amount_affected,
  currency,
  justification,
  outcome
FROM audit_logs
WHERE financial_impact = true
  AND created_at BETWEEN '2026-01-01' AND '2026-03-31'
ORDER BY created_at;

-- PCI-DSS: All access to payment-related records
SELECT 
  created_at,
  event_type,
  actor_email,
  target_table,
  target_id,
  ip_address,
  outcome
FROM audit_logs
WHERE target_table IN ('transactions', 'payments', 'refunds')
  AND created_at >= NOW() - INTERVAL '1 year'
ORDER BY created_at DESC;

-- GDPR: All actions affecting specific user
SELECT * FROM audit_logs
WHERE target_id = 'usr_12345...'
   OR new_values->>'affected_user_id' = 'usr_12345...'
   OR 'usr_12345...' = ANY(users_notified)
ORDER BY created_at;
```

---

## APPENDIX A: Audit Event Type Reference

### Complete Event Type Catalog

| Event Type | Category | Severity | Financial | Requires Justification |
|------------|----------|----------|-----------|----------------------|
| `dispute_resolved_buyer` | DISPUTE | CRITICAL | Yes | Yes (100 chars) |
| `dispute_resolved_seller` | DISPUTE | CRITICAL | Yes | Yes (100 chars) |
| `dispute_resolved_partial` | DISPUTE | CRITICAL | Yes | Yes (150 chars) |
| `dispute_withdrawn` | DISPUTE | WARNING | Yes | Yes (50 chars) |
| `dispute_message_sent` | DISPUTE | INFO | No | No |
| `transaction_manual_refund` | TRANSACTION | CRITICAL | Yes | Yes (100 chars) |
| `transaction_manual_complete` | TRANSACTION | CRITICAL | Yes | Yes (75 chars) |
| `transaction_viewed` | TRANSACTION | INFO | No | No |
| `account_frozen` | ACCOUNT | WARNING | Indirect | Yes (50 chars) |
| `account_unfrozen` | ACCOUNT | INFO | No | Yes (30 chars) |
| `account_role_changed` | ACCOUNT | CRITICAL | No | Yes (50 chars) |
| `account_terminated` | ACCOUNT | CRITICAL | Indirect | Yes (150 chars) |
| `admin_note_added` | SYSTEM | INFO | No | No |
| `data_exported` | COMPLIANCE | WARNING | No | Yes (30 chars) |
| `audit_logs_accessed` | SECURITY | INFO | No | No |
| `admin_login` | SECURITY | INFO | No | No |
| `admin_logout` | SECURITY | INFO | No | No |
| `admin_login_failed` | SECURITY | WARNING | No | No |
| `admin_session_expired` | SECURITY | INFO | No | No |
| `permission_denied` | SECURITY | WARNING | No | No |
| `invalid_action_attempted` | SECURITY | WARNING | No | No |
| `anomaly_alert_generated` | SECURITY | WARNING | No | No |
| `legal_hold_applied` | COMPLIANCE | CRITICAL | No | Yes (Reference) |
| `notification_sent` | SYSTEM | INFO | No | No |

---

## APPENDIX B: Implementation Checklist

### Per-Action Checklist

For each admin action, verify:

- [ ] Audit event type defined
- [ ] Required fields captured
- [ ] Actor attribution complete
- [ ] Correlation ID assigned
- [ ] Old values captured (for updates)
- [ ] New values captured
- [ ] Justification captured
- [ ] Financial impact flagged correctly
- [ ] User notifications logged
- [ ] Checksum generated

### System-Level Checklist

- [ ] Immutability triggers active
- [ ] No DELETE policies on audit_logs
- [ ] No UPDATE policies on audit_logs
- [ ] Daily backup verified
- [ ] Retention policy documented
- [ ] Access control matrix enforced
- [ ] Anomaly detection rules active
- [ ] Alert channels configured
- [ ] Export procedures documented
- [ ] Legal hold capability tested

---

## APPENDIX C: Glossary

| Term | Definition |
|------|------------|
| **Actor** | The human or system that performed an action |
| **Correlation ID** | UUID linking related audit events |
| **Financial Impact** | Action that affects money movement |
| **Immutable** | Cannot be changed after creation |
| **Legal Hold** | Preservation requirement for litigation |
| **Non-Repudiation** | Actor cannot deny performing action |
| **Request ID** | Unique identifier for a single API request |
| **Sequence ID** | Auto-incrementing ID for ordering |
| **Target** | The database record affected by an action |

---

**END OF ADMIN AUDIT & ACCOUNTABILITY LAYER**

*This document is the canonical reference for audit and compliance. It is designed to withstand regulatory examination, legal discovery, and security audits. Any deviation requires Legal, Compliance, and Security approval.*
