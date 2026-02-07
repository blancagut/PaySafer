# ADMIN READ MODEL — Canonical Read Contract

**Version:** 1.0.0  
**Status:** Authoritative  
**Date:** 2026-02-05  
**Classification:** INTERNAL — ADMIN EYES ONLY  

> ⚠️ **SCOPE**: This document defines **ONLY what administrators can VIEW**. No actions, no mutations, no overrides. For admin actions, see a separate `ADMIN_WRITE_MODEL.md` document.

---

## TABLE OF CONTENTS

1. [Foundational Principles](#1-foundational-principles)
2. [Admin Role Definition & Verification](#2-admin-role-definition--verification)
3. [Global Data Access Rules](#3-global-data-access-rules)
4. [Dashboard Screens Specification](#4-dashboard-screens-specification)
5. [Forbidden Data & PII Minimization](#5-forbidden-data--pii-minimization)
6. [Cross-User Data Isolation](#6-cross-user-data-isolation)
7. [Implementation Requirements](#7-implementation-requirements)

---

## 1. FOUNDATIONAL PRINCIPLES

### 1.1 Read-Only Invariants

| Invariant | Description |
|-----------|-------------|
| **NO MUTATIONS** | Viewing any admin screen MUST NOT trigger any database writes |
| **RLS COMPLIANCE** | All reads MUST go through RLS-enabled policies (no service role for reads) |
| **TRUTH REFLECTION** | Admin UI reflects database state; it does NOT interpret, override, or speculate |
| **AUDIT TRANSPARENCY** | Admins can view audit logs but CANNOT modify them |
| **PII MINIMIZATION** | Only data necessary for admin tasks is exposed |

### 1.2 Authentication & Authorization

```
┌──────────────────────────────────────────────────────────────────┐
│                    ADMIN READ ACCESS FLOW                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   User Request                                                    │
│        │                                                          │
│        ▼                                                          │
│   ┌─────────────────┐                                            │
│   │ Valid JWT Token │──No──▶ DENY ACCESS                         │
│   └────────┬────────┘                                            │
│            │ Yes                                                  │
│            ▼                                                      │
│   ┌─────────────────────────────┐                                │
│   │ profiles.role = 'admin'     │──No──▶ DENY ACCESS             │
│   │ WHERE id = auth.uid()       │                                │
│   └────────┬────────────────────┘                                │
│            │ Yes                                                  │
│            ▼                                                      │
│   ┌─────────────────────────────┐                                │
│   │ profiles.deleted_at IS NULL │──No──▶ DENY ACCESS             │
│   └────────┬────────────────────┘                                │
│            │ Yes                                                  │
│            ▼                                                      │
│      GRANT READ ACCESS                                           │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 1.3 Data Freshness Policy

| Data Type | Freshness | Caching |
|-----------|-----------|---------|
| Transaction list | Live query | No client cache; 30s server cache allowed |
| Transaction detail | Live query | No cache |
| Dispute list | Live query | No client cache; 30s server cache allowed |
| Dispute detail | Live query | No cache |
| Audit logs | Live query | No cache |
| User profiles | Live query | 60s server cache allowed |
| Aggregate stats | Live query | 5-minute cache allowed |

---

## 2. ADMIN ROLE DEFINITION & VERIFICATION

### 2.1 Role Identification

**Admin role is verified via database lookup, NEVER via JWT claims alone.**

```sql
-- Helper function used by RLS (already exists in rls_policies.sql)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND deleted_at IS NULL  -- Soft-deleted admins have no access
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### 2.2 Admin vs Superuser

| Capability | Admin | Superuser (System) |
|------------|-------|-------------------|
| Read all transactions | ✅ | ✅ |
| Read all disputes | ✅ | ✅ |
| Read audit logs | ✅ | ✅ |
| Read user profiles | ✅ | ✅ |
| Bypass RLS | ❌ | ✅ |
| Access payment credentials | ❌ | ✅ (backend only) |
| Direct database modification | ❌ | ✅ |

**Admins are NOT superusers. They operate within RLS boundaries with elevated but scoped permissions.**

---

## 3. GLOBAL DATA ACCESS RULES

### 3.1 Tables Accessible to Admin (READ)

| Table | Admin SELECT | Notes |
|-------|--------------|-------|
| `profiles` | ✅ All records | Via `profiles_select_admin` policy |
| `transactions` | ✅ All records | Via `transactions_select_admin` policy |
| `disputes` | ✅ All records | Via `disputes_select_admin` policy |
| `dispute_messages` | ✅ All records | Via `dispute_messages_select_admin` policy |
| `files` | ✅ All records | Via `files_select_admin` policy |
| `audit_logs` | ✅ All records | Via `audit_logs_select_admin` policy |
| `notifications` | ❌ Own only | User-scoped; admin reads own notifications |

### 3.2 Tables/Data NEVER Accessible to Admin

| Data | Reason |
|------|--------|
| `auth.users` internal fields | Supabase system table; no direct access |
| Raw Stripe API responses | Stored in backend logs only, not database |
| Payment method details (card numbers, CVV) | Never stored; handled by Stripe |
| Bank account numbers | Tokenized via Stripe Connect |
| User passwords / password hashes | Managed by Supabase Auth, never exposed |
| Service role keys | Infrastructure secrets |
| Webhook signing secrets | Infrastructure secrets |

---

## 4. DASHBOARD SCREENS SPECIFICATION

---

### 4.1 SCREEN: Global Transactions List

**Purpose:** Overview of all platform transactions for monitoring and triage.

**URL Pattern:** `/admin` (Transactions Tab)

**Role Access:** `admin` only

**Data Freshness:** Live (30s server cache allowed)

#### Data Source

```sql
-- Primary query (via RLS policy: transactions_select_admin)
SELECT 
  t.id,
  t.description,
  t.amount,
  t.currency,
  t.status,
  t.created_at,
  t.updated_at,
  t.paid_at,
  t.delivered_at,
  t.released_at,
  -- Buyer reference (limited)
  t.buyer_id,
  pb.email AS buyer_email,
  pb.full_name AS buyer_name,
  -- Seller reference (limited)
  t.seller_id,
  t.seller_email,
  ps.full_name AS seller_name,
  -- Dispute indicator
  (SELECT COUNT(*) FROM disputes d WHERE d.transaction_id = t.id) AS dispute_count
FROM transactions t
LEFT JOIN profiles pb ON t.buyer_id = pb.id
LEFT JOIN profiles ps ON t.seller_id = ps.id
ORDER BY t.created_at DESC;
```

#### Visible Fields

| Field | Type | Display Name | Sortable | Filterable |
|-------|------|--------------|----------|------------|
| `id` | UUID | Transaction ID | No | Yes (search) |
| `description` | Text | Description | No | Yes (search) |
| `amount` | Decimal | Amount | Yes | Yes (range) |
| `currency` | Text | Currency | No | Yes (select) |
| `status` | Enum | Status | Yes | Yes (multi-select) |
| `buyer_email` | Text | Buyer | No | Yes (search) |
| `seller_email` | Text | Seller | No | Yes (search) |
| `created_at` | Timestamp | Created | Yes | Yes (date range) |
| `updated_at` | Timestamp | Last Updated | Yes | No |
| `dispute_count` | Integer | Disputes | Yes | Yes (has dispute) |

#### Hidden Fields (NOT displayed in list view)

| Field | Reason |
|-------|--------|
| `metadata` | May contain sensitive data; shown only in detail view |
| `buyer_id` / `seller_id` (raw UUIDs) | Use email/name instead for readability |
| Full profile data | PII minimization; use names only |

#### Sorting Rules

- **Default:** `created_at DESC` (newest first)
- **Allowed:** `created_at`, `updated_at`, `amount`, `status`, `dispute_count`
- **Forbidden:** Sorting by user PII (email, name)

#### Filtering Rules

| Filter | Options |
|--------|---------|
| Status | `draft`, `awaiting_payment`, `in_escrow`, `delivered`, `released`, `cancelled`, `dispute` |
| Date Range | Created date (start/end) |
| Amount Range | Min/Max amount |
| Currency | Dropdown of used currencies |
| Has Dispute | Boolean toggle |
| Search | Partial match on ID, description, buyer email, seller email |

---

### 4.2 SCREEN: Single Transaction Detail View

**Purpose:** Complete view of a single transaction for investigation and audit.

**URL Pattern:** `/admin/transactions/[id]` (not yet implemented - requires new route)

**Role Access:** `admin` only

**Data Freshness:** Live (no cache)

#### Data Source

```sql
-- Transaction details
SELECT 
  t.*,
  pb.email AS buyer_email,
  pb.full_name AS buyer_name,
  pb.avatar_url AS buyer_avatar,
  pb.created_at AS buyer_account_created,
  ps.email AS seller_email,
  ps.full_name AS seller_name,
  ps.avatar_url AS seller_avatar,
  ps.created_at AS seller_account_created
FROM transactions t
LEFT JOIN profiles pb ON t.buyer_id = pb.id
LEFT JOIN profiles ps ON t.seller_id = ps.id
WHERE t.id = :transaction_id;

-- Associated files
SELECT * FROM files 
WHERE reference_type = 'transaction' AND reference_id = :transaction_id;

-- Associated disputes (if any)
SELECT * FROM disputes WHERE transaction_id = :transaction_id;
```

#### Visible Fields

**Transaction Section:**

| Field | Display Name | Notes |
|-------|--------------|-------|
| `id` | Transaction ID | Copyable |
| `description` | Description | Full text |
| `amount` | Amount | Formatted with currency |
| `currency` | Currency | ISO code |
| `status` | Current Status | Badge with color |
| `created_at` | Created | Formatted timestamp |
| `paid_at` | Payment Confirmed | Null if not paid |
| `delivered_at` | Marked Delivered | Null if not delivered |
| `released_at` | Funds Released | Null if not released |
| `updated_at` | Last Modified | Formatted timestamp |
| `metadata` | Metadata | JSON viewer (read-only) |

**Buyer Section:**

| Field | Display Name | Notes |
|-------|--------------|-------|
| `buyer_email` | Email | Visible |
| `buyer_name` | Name | Visible |
| `buyer_avatar` | Avatar | Image thumbnail |
| `buyer_account_created` | Member Since | Date only |

**Seller Section:**

| Field | Display Name | Notes |
|-------|--------------|-------|
| `seller_email` | Invited Email | Original invite |
| `seller_name` | Name | Visible if accepted |
| `seller_avatar` | Avatar | Image thumbnail |
| `seller_account_created` | Member Since | Date only |

**Files Section:**

| Field | Display Name | Notes |
|-------|--------------|-------|
| `file_name` | Filename | Display name |
| `mime_type` | Type | File type icon |
| `file_size` | Size | Formatted bytes |
| `created_at` | Uploaded | Timestamp |
| `uploaded_by` | Uploaded By | User email |

#### Hidden Fields (NEVER visible)

| Field | Reason |
|-------|--------|
| `stripe_payment_intent_id` | Payment system internal |
| `stripe_transfer_id` | Payment system internal |
| User password hashes | Security |
| User phone numbers | PII minimization (unless disputes require) |
| Bank account details | Never stored |

---

### 4.3 SCREEN: Transaction State History Timeline

**Purpose:** Chronological audit trail of all state changes for a transaction.

**URL Pattern:** `/admin/transactions/[id]/history` or embedded in detail view

**Role Access:** `admin` only

**Data Freshness:** Live (no cache)

#### Data Source

```sql
-- State changes from audit_logs
SELECT 
  al.id,
  al.event_type,
  al.actor_id,
  al.actor_role,
  al.old_values->>'status' AS old_status,
  al.new_values->>'status' AS new_status,
  al.old_values,
  al.new_values,
  al.created_at,
  p.email AS actor_email,
  p.full_name AS actor_name
FROM audit_logs al
LEFT JOIN profiles p ON al.actor_id = p.id
WHERE al.target_table = 'transactions'
  AND al.target_id = :transaction_id
ORDER BY al.created_at ASC;
```

#### Visible Fields

| Field | Display Name | Notes |
|-------|--------------|-------|
| `created_at` | Timestamp | Timeline anchor |
| `event_type` | Event | `transaction_created`, `transaction_updated` |
| `old_status` | Previous State | Badge (if state change) |
| `new_status` | New State | Badge (if state change) |
| `actor_role` | Actor Type | `buyer`, `seller`, `admin`, `system` |
| `actor_email` | Actor | Email of human actor; "System" for webhooks |
| `old_values` | Before | Collapsible JSON diff |
| `new_values` | After | Collapsible JSON diff |

#### Hidden Fields

| Field | Reason |
|-------|--------|
| `ip_address` | PII; only for security investigations |
| `user_agent` | PII; only for security investigations |

#### Display Rules

- Timeline displayed chronologically (oldest → newest)
- State changes highlighted with colored badges
- System events (webhooks) shown with "⚙️ System" indicator
- Expandable JSON diff for detailed field changes
- NO editing capability; view-only

---

### 4.4 SCREEN: Escrow & Financial Status View

**Purpose:** Financial overview of transaction amounts, fees, and payout status.

**URL Pattern:** Embedded in transaction detail view OR `/admin/finance`

**Role Access:** `admin` only

**Data Freshness:** Live (no cache)

#### Data Source

```sql
-- Financial summary per transaction
SELECT 
  t.id,
  t.amount AS gross_amount,
  t.currency,
  t.status,
  t.paid_at,
  t.released_at,
  -- Calculate platform fee (example: 3%)
  ROUND(t.amount * 0.03, 2) AS platform_fee,
  ROUND(t.amount * 0.97, 2) AS seller_payout,
  -- Status indicators
  CASE 
    WHEN t.status = 'in_escrow' THEN 'Funds Held'
    WHEN t.status = 'released' THEN 'Payout Complete'
    WHEN t.status = 'cancelled' THEN 'No Funds'
    WHEN t.status IN ('draft', 'awaiting_payment') THEN 'Pending Payment'
    ELSE 'In Process'
  END AS financial_status
FROM transactions t
WHERE t.id = :transaction_id;

-- Aggregate platform stats (for dashboard)
SELECT 
  COUNT(*) AS total_transactions,
  SUM(CASE WHEN status = 'in_escrow' THEN amount ELSE 0 END) AS funds_in_escrow,
  SUM(CASE WHEN status = 'released' THEN amount ELSE 0 END) AS total_released,
  SUM(CASE WHEN status = 'released' THEN amount * 0.03 ELSE 0 END) AS total_fees_collected,
  COUNT(CASE WHEN status = 'dispute' THEN 1 END) AS disputed_transactions
FROM transactions;
```

#### Visible Fields (Per Transaction)

| Field | Display Name | Notes |
|-------|--------------|-------|
| `gross_amount` | Transaction Amount | Original amount |
| `currency` | Currency | ISO code |
| `platform_fee` | Platform Fee | Calculated (3% default) |
| `seller_payout` | Seller Receives | After fee deduction |
| `financial_status` | Status | Human-readable |
| `paid_at` | Payment Date | When funds captured |
| `released_at` | Payout Date | When funds released |

#### Visible Fields (Aggregate Dashboard)

| Field | Display Name | Notes |
|-------|--------------|-------|
| `total_transactions` | Total Transactions | Count |
| `funds_in_escrow` | Funds in Escrow | Current held amount |
| `total_released` | Total Payouts | All-time |
| `total_fees_collected` | Platform Revenue | All-time fees |
| `disputed_transactions` | Active Disputes | Count |

#### Hidden Fields (NEVER visible to admin)

| Field | Reason |
|-------|--------|
| Stripe Payment Intent ID | Internal reference only |
| Stripe Transfer ID | Internal reference only |
| Stripe Customer ID | PII / payment data |
| Bank account last 4 digits | PII |
| Actual payout timing | Stripe internal |

---

### 4.5 SCREEN: Disputes Overview

**Purpose:** List all platform disputes for monitoring, prioritization, and resolution queue.

**URL Pattern:** `/admin` (Disputes Tab)

**Role Access:** `admin` only

**Data Freshness:** Live (30s server cache allowed)

#### Data Source

```sql
SELECT 
  d.id,
  d.reason,
  d.description,
  d.status,
  d.created_at,
  d.updated_at,
  d.resolved_at,
  d.resolved_by,
  d.resolution,
  -- Transaction context
  d.transaction_id,
  t.description AS transaction_description,
  t.amount AS transaction_amount,
  t.currency AS transaction_currency,
  t.status AS transaction_status,
  -- Parties
  d.opened_by,
  opener.email AS opened_by_email,
  opener.full_name AS opened_by_name,
  t.buyer_id,
  buyer.email AS buyer_email,
  t.seller_id,
  seller.email AS seller_email,
  -- Evidence count
  (SELECT COUNT(*) FROM files f WHERE f.reference_type = 'dispute' AND f.reference_id = d.id) AS evidence_count,
  -- Message count
  (SELECT COUNT(*) FROM dispute_messages dm WHERE dm.dispute_id = d.id) AS message_count
FROM disputes d
JOIN transactions t ON d.transaction_id = t.id
JOIN profiles opener ON d.opened_by = opener.id
JOIN profiles buyer ON t.buyer_id = buyer.id
LEFT JOIN profiles seller ON t.seller_id = seller.id
ORDER BY 
  CASE d.status WHEN 'under_review' THEN 0 ELSE 1 END,
  d.created_at DESC;
```

#### Visible Fields

| Field | Display Name | Sortable | Filterable |
|-------|--------------|----------|------------|
| `id` | Dispute ID | No | Yes (search) |
| `reason` | Reason | No | Yes (multi-select) |
| `status` | Status | Yes | Yes (multi-select) |
| `opened_by_email` | Opened By | No | Yes (search) |
| `transaction_amount` | Amount | Yes | Yes (range) |
| `created_at` | Opened | Yes | Yes (date range) |
| `resolved_at` | Resolved | Yes | Yes (date range) |
| `evidence_count` | Evidence | Yes | No |
| `message_count` | Messages | Yes | No |

#### Sorting Rules

- **Default:** `status = 'under_review'` first, then `created_at DESC`
- **Allowed:** `created_at`, `resolved_at`, `transaction_amount`, `evidence_count`, `message_count`

#### Filtering Rules

| Filter | Options |
|--------|---------|
| Status | `under_review`, `resolved`, `closed` |
| Reason | Enum of dispute reasons |
| Date Range | Created/Resolved date (start/end) |
| Amount Range | Transaction amount min/max |
| Has Evidence | Boolean toggle |

---

### 4.6 SCREEN: Single Dispute Detail View

**Purpose:** Complete view of a dispute including all evidence, messages, and timeline.

**URL Pattern:** `/admin/disputes/[id]` (not yet implemented - requires new route)

**Role Access:** `admin` only

**Data Freshness:** Live (no cache)

#### Data Source

```sql
-- Dispute details
SELECT 
  d.*,
  t.id AS transaction_id,
  t.description AS transaction_description,
  t.amount AS transaction_amount,
  t.currency AS transaction_currency,
  t.status AS transaction_status,
  t.created_at AS transaction_created,
  opener.email AS opened_by_email,
  opener.full_name AS opened_by_name,
  buyer.email AS buyer_email,
  buyer.full_name AS buyer_name,
  seller.email AS seller_email,
  seller.full_name AS seller_name
FROM disputes d
JOIN transactions t ON d.transaction_id = t.id
JOIN profiles opener ON d.opened_by = opener.id
JOIN profiles buyer ON t.buyer_id = buyer.id
LEFT JOIN profiles seller ON t.seller_id = seller.id
WHERE d.id = :dispute_id;

-- Evidence files
SELECT 
  f.id,
  f.file_name,
  f.file_size,
  f.mime_type,
  f.storage_path,
  f.created_at,
  p.email AS uploaded_by_email,
  p.full_name AS uploaded_by_name
FROM files f
JOIN profiles p ON f.uploaded_by = p.id
WHERE f.reference_type = 'dispute' AND f.reference_id = :dispute_id
ORDER BY f.created_at ASC;

-- Messages
SELECT 
  dm.id,
  dm.message,
  dm.created_at,
  p.email AS author_email,
  p.full_name AS author_name,
  CASE 
    WHEN p.role = 'admin' THEN 'admin'
    WHEN p.id = t.buyer_id THEN 'buyer'
    WHEN p.id = t.seller_id THEN 'seller'
    ELSE 'unknown'
  END AS author_role
FROM dispute_messages dm
JOIN profiles p ON dm.user_id = p.id
JOIN disputes d ON dm.dispute_id = d.id
JOIN transactions t ON d.transaction_id = t.id
WHERE dm.dispute_id = :dispute_id
ORDER BY dm.created_at ASC;
```

#### Visible Sections

**Dispute Header:**

| Field | Display Name | Notes |
|-------|--------------|-------|
| `id` | Dispute ID | Copyable UUID |
| `status` | Status | Badge with color |
| `reason` | Reason | Category |
| `description` | Description | Full text |
| `created_at` | Opened | Timestamp |
| `updated_at` | Last Activity | Timestamp |
| `resolved_at` | Resolved | Timestamp (if resolved) |
| `resolved_by` | Resolved By | `buyer`, `seller`, `admin` |
| `resolution` | Resolution | Full text (if resolved) |

**Transaction Context:**

| Field | Display Name | Notes |
|-------|--------------|-------|
| `transaction_id` | Transaction | Link to transaction |
| `transaction_description` | Description | Transaction summary |
| `transaction_amount` | Amount | Formatted |
| `transaction_status` | Transaction Status | Current state |

**Parties:**

| Field | Display Name | Notes |
|-------|--------------|-------|
| `opened_by_email` | Dispute Initiator | Who opened dispute |
| `buyer_email` | Buyer | Transaction buyer |
| `seller_email` | Seller | Transaction seller |

**Evidence Timeline:**

| Field | Display Name | Notes |
|-------|--------------|-------|
| `file_name` | Filename | Display name |
| `mime_type` | Type | Icon based on type |
| `file_size` | Size | Formatted bytes |
| `uploaded_by_email` | Uploaded By | Uploader identity |
| `created_at` | Uploaded | Timestamp |
| Preview/Download | Action | Secure presigned URL |

**Message Thread:**

| Field | Display Name | Notes |
|-------|--------------|-------|
| `author_name` | Author | Name with role badge |
| `author_role` | Role | `buyer`, `seller`, `admin` |
| `message` | Message | Full text |
| `created_at` | Time | Timestamp |

---

### 4.7 SCREEN: Audit Log Explorer

**Purpose:** Searchable, filterable view of all platform audit events.

**URL Pattern:** `/admin/audit` (not yet implemented - requires new route)

**Role Access:** `admin` only

**Data Freshness:** Live (no cache)

#### Data Source

```sql
SELECT 
  al.id,
  al.event_type,
  al.actor_id,
  al.actor_role,
  al.target_table,
  al.target_id,
  al.old_values,
  al.new_values,
  al.created_at,
  p.email AS actor_email,
  p.full_name AS actor_name
FROM audit_logs al
LEFT JOIN profiles p ON al.actor_id = p.id
ORDER BY al.created_at DESC
LIMIT 500;
```

#### Visible Fields

| Field | Display Name | Sortable | Filterable |
|-------|--------------|----------|------------|
| `created_at` | Timestamp | Yes | Yes (date range) |
| `event_type` | Event Type | Yes | Yes (multi-select) |
| `actor_role` | Actor Type | Yes | Yes (multi-select) |
| `actor_email` | Actor | No | Yes (search) |
| `target_table` | Target Table | Yes | Yes (multi-select) |
| `target_id` | Target ID | No | Yes (search) |
| `old_values` | Before | No | No |
| `new_values` | After | No | No |

#### Hidden Fields

| Field | Reason |
|-------|--------|
| `ip_address` | PII; visible only in security investigation mode |
| `user_agent` | PII; visible only in security investigation mode |

#### Filtering Rules

| Filter | Options |
|--------|---------|
| Event Type | `transaction_created`, `transaction_updated`, `dispute_opened`, `dispute_updated`, `dispute_resolved`, etc. |
| Actor Role | `buyer`, `seller`, `admin`, `system` |
| Target Table | `transactions`, `disputes`, `profiles` |
| Date Range | Timestamp start/end |
| Target ID | UUID search |
| Actor | Email search |

#### Display Rules

- Paginated (50 records per page)
- JSON diff viewer for `old_values` / `new_values`
- Expandable rows for detailed view
- Export capability (CSV) for compliance
- **NO EDITING** — read-only view always

---

### 4.8 SCREEN: User Profile (Admin-Safe Subset)

**Purpose:** View user account information for support and investigation.

**URL Pattern:** `/admin/users/[id]` (not yet implemented - requires new route)

**Role Access:** `admin` only

**Data Freshness:** Live (60s server cache allowed)

#### Data Source

```sql
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.avatar_url,
  p.role,
  p.created_at,
  p.updated_at,
  p.deleted_at,
  -- Activity stats
  (SELECT COUNT(*) FROM transactions t WHERE t.buyer_id = p.id) AS transactions_as_buyer,
  (SELECT COUNT(*) FROM transactions t WHERE t.seller_id = p.id) AS transactions_as_seller,
  (SELECT COUNT(*) FROM disputes d WHERE d.opened_by = p.id) AS disputes_opened,
  (SELECT SUM(t.amount) FROM transactions t WHERE t.buyer_id = p.id AND t.status = 'released') AS total_spent,
  (SELECT SUM(t.amount * 0.97) FROM transactions t WHERE t.seller_id = p.id AND t.status = 'released') AS total_earned
FROM profiles p
WHERE p.id = :user_id;
```

#### Visible Fields

| Field | Display Name | Notes |
|-------|--------------|-------|
| `id` | User ID | UUID |
| `email` | Email | Verified email |
| `full_name` | Name | Display name |
| `avatar_url` | Avatar | Image |
| `role` | Role | `user` or `admin` |
| `created_at` | Member Since | Account creation |
| `updated_at` | Last Updated | Profile update |
| `deleted_at` | Deleted | Soft-delete timestamp |
| `transactions_as_buyer` | Purchases | Count |
| `transactions_as_seller` | Sales | Count |
| `disputes_opened` | Disputes Opened | Count |
| `total_spent` | Total Spent | Sum of completed purchases |
| `total_earned` | Total Earned | Sum of completed sales (after fees) |

#### Hidden Fields (NEVER visible)

| Field | Reason |
|-------|--------|
| Password hash | Security |
| Phone number | PII minimization |
| Stripe customer ID | Payment internal |
| Stripe connect account ID | Payment internal |
| Bank account details | Never stored |
| Auth tokens | Security |

---

## 5. FORBIDDEN DATA & PII MINIMIZATION

### 5.1 Data NEVER Visible to Admins

| Data Category | Specific Items | Reason |
|---------------|----------------|--------|
| **Payment Credentials** | Card numbers, CVV, expiry | Never stored; Stripe handles |
| **Bank Details** | Account numbers, routing numbers | Tokenized in Stripe |
| **Authentication** | Passwords, hashes, MFA secrets | Security |
| **Infrastructure** | API keys, service role keys, webhook secrets | Infrastructure security |
| **Stripe Internal** | Raw webhook payloads, payment intent secrets | Payment system internal |
| **User Device Info** | IP addresses, user agents (in normal view) | PII; security mode only |

### 5.2 PII Minimization Rules

| Context | Visible | Hidden |
|---------|---------|--------|
| Transaction list | Email, name | Phone, address |
| Dispute view | Email, name | Phone, address |
| User profile | Email, name | Phone, government ID |
| Audit logs | Actor email | IP, user agent (default) |

### 5.3 Data Retention Visibility

Admin can view data only while it exists. Soft-deleted records:
- **Profiles:** Visible with `deleted_at` indicator
- **Transactions:** Never soft-deleted; always visible
- **Disputes:** Never soft-deleted; always visible
- **Audit logs:** Immutable; always visible

---

## 6. CROSS-USER DATA ISOLATION

### 6.1 Isolation Guarantees

| Guarantee | Implementation |
|-----------|----------------|
| Admin cannot see other admin's private data | Same RLS rules apply |
| Admin cannot see auth secrets | Supabase auth isolation |
| Admin cannot impersonate users | No session hijacking capability |
| Admin reads don't affect user sessions | Read operations are stateless |

### 6.2 RLS Policy Verification

All admin reads go through these RLS policies:

```sql
-- Transactions: Admin can see all
CREATE POLICY "transactions_select_admin"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Disputes: Admin can see all
CREATE POLICY "disputes_select_admin"
  ON public.disputes FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Profiles: Admin can see all
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Audit logs: Admin only
CREATE POLICY "audit_logs_select_admin"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());
```

---

## 7. IMPLEMENTATION REQUIREMENTS

### 7.1 Technical Constraints

| Requirement | Implementation |
|-------------|----------------|
| No mutations on read | All queries use SELECT only; no INSERT/UPDATE/DELETE |
| RLS enforcement | Use Supabase client with user JWT, never service role for reads |
| No client-side state mutation | UI reflects server state only |
| Pagination | All list views paginated (max 100 per page) |
| Rate limiting | Admin endpoints rate-limited (100 req/min) |

### 7.2 UI/UX Requirements

| Requirement | Implementation |
|-------------|----------------|
| Read-only indicators | Disabled form fields, "View Only" badges |
| No action buttons on read screens | Separate action screens for mutations |
| Refresh capability | Manual refresh button; no auto-refresh |
| Export capability | CSV/JSON export for audit compliance |
| Responsive design | Mobile-friendly read views |

### 7.3 Audit Trail for Admin Reads

Admin reads are NOT logged to audit_logs (to prevent log pollution). However:
- Admin authentication events are logged by Supabase Auth
- Admin action events (mutations) are logged via triggers
- Access anomalies detected via Supabase logs

---

## APPENDIX A: Screen Implementation Checklist

| Screen | Route | Status | Priority |
|--------|-------|--------|----------|
| Global Transactions List | `/admin` (Transactions Tab) | ✅ Exists | — |
| Single Transaction Detail | `/admin/transactions/[id]` | ❌ Needs Implementation | High |
| Transaction State Timeline | Embedded in detail | ❌ Needs Implementation | High |
| Escrow & Financial View | `/admin` (Stats) + detail | ⚠️ Partial | Medium |
| Disputes Overview | `/admin` (Disputes Tab) | ✅ Exists | — |
| Single Dispute Detail | `/admin/disputes/[id]` | ❌ Needs Implementation | High |
| Audit Log Explorer | `/admin/audit` | ❌ Needs Implementation | High |
| User Profile View | `/admin/users/[id]` | ❌ Needs Implementation | Medium |

---

## APPENDIX B: Allowed vs Forbidden Summary

### ALLOWED for Admin Read

✅ View all transactions (any status, any user)  
✅ View all disputes (any status, any user)  
✅ View all user profiles (limited fields)  
✅ View all audit logs (complete history)  
✅ View all dispute messages  
✅ View all evidence files (secure download)  
✅ View aggregate platform statistics  
✅ Export data for compliance (CSV/JSON)  
✅ Search and filter all lists  
✅ View transaction state history  

### FORBIDDEN for Admin Read

❌ View payment credentials (card, bank)  
❌ View user passwords or auth tokens  
❌ View Stripe internal IDs (in UI)  
❌ View service role keys or secrets  
❌ View other admin's private data  
❌ View raw webhook payloads  
❌ Access Supabase auth system tables  
❌ Bypass RLS policies  
❌ Trigger any mutations via read screens  
❌ Impersonate users  

---

**END OF ADMIN READ MODEL**

*This document is the canonical reference for all admin dashboard read operations. Any deviation requires security review and version update.*
