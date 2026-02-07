# RLS DOMAIN MODEL — AUTHORITATIVE SECURITY CONSTITUTION

**Version:** 1.0.0-FINAL  
**Status:** IMMUTABLE  
**Date:** 2026-02-05  
**Classification:** SECURITY-CRITICAL  

> ⚠️ **WARNING**: This document is the single source of truth for all Row Level Security policies. No RLS policy shall be written that contradicts this model. Any access not explicitly granted herein is **FORBIDDEN**.

---

## TABLE OF CONTENTS

1. [Foundational Principles](#1-foundational-principles)
2. [Role Definitions](#2-role-definitions)
3. [Table Access Model](#3-table-access-model)
4. [Participation Rules](#4-participation-rules)
5. [State-Based Access Controls](#5-state-based-access-controls)
6. [Stripe Webhook Safety Model](#6-stripe-webhook-safety-model)
7. [Forbidden Operations](#7-forbidden-operations)
8. [Audit & Compliance](#8-audit--compliance)

---

## 1. FOUNDATIONAL PRINCIPLES

### 1.1 Default Deny

**ALL access is denied unless explicitly permitted in this document.**

- If a role is not listed for an operation → DENIED
- If a condition is not met → DENIED
- If participation cannot be verified → DENIED
- Ambiguity resolves to DENIAL

### 1.2 Authentication Requirements

| Context | Auth Requirement |
|---------|------------------|
| Frontend requests | Valid JWT with `auth.uid()` present |
| Backend/Webhooks | Service role key (`service_role`) |
| Anonymous | NO ACCESS to any protected table |

### 1.3 Role Hierarchy

```
system (service_role) ─────────────────────────────┐
                                                   │ FULL ACCESS
admin ─────────────────────────────────────────────┤
                                                   │
buyer ────────────────────┐                        │
                          ├─ SCOPED ACCESS ────────┘
seller ───────────────────┘
```

**There is NO role inheritance.** Each role has explicit, enumerated permissions.

---

## 2. ROLE DEFINITIONS

### 2.1 `buyer`

**Definition:** An authenticated user who initiates a transaction as the paying party.

**Identification:**
- `auth.uid()` matches `transactions.buyer_id`
- User record exists in `users` table with valid session

**Trust Level:** LOW (user-controlled input)

### 2.2 `seller`

**Definition:** An authenticated user assigned to fulfill a transaction.

**Identification:**
- `auth.uid()` matches `transactions.seller_id`
- User record exists in `users` table with valid session

**Trust Level:** LOW (user-controlled input)

### 2.3 `admin`

**Definition:** Platform administrator with elevated privileges.

**Identification:**
- `auth.uid()` exists
- `users.role = 'admin'` in users table
- **MUST be verified via database lookup, NOT JWT claims alone**

**Trust Level:** HIGH (platform-controlled)

### 2.4 `system`

**Definition:** Backend services, Stripe webhooks, cron jobs, server-side operations.

**Identification:**
- Request uses `service_role` key
- `auth.role() = 'service_role'`
- **NOT accessible from frontend under any circumstance**

**Trust Level:** ABSOLUTE (infrastructure-controlled)

---

## 3. TABLE ACCESS MODEL

### 3.1 `users` Table

| Operation | buyer | seller | admin | system |
|-----------|-------|--------|-------|--------|
| **SELECT** | ✅ Own record only | ✅ Own record only | ✅ All records | ✅ All records |
| **INSERT** | ❌ FORBIDDEN | ❌ FORBIDDEN | ✅ Allowed | ✅ Allowed |
| **UPDATE** | ✅ Own record, limited fields | ✅ Own record, limited fields | ✅ All records | ✅ All records |
| **DELETE** | ❌ FORBIDDEN | ❌ FORBIDDEN | ✅ Soft delete only | ✅ Soft delete only |

**Field-Level Restrictions for buyer/seller UPDATE:**
- ✅ ALLOWED: `display_name`, `avatar_url`, `phone`, `notification_preferences`
- ❌ FORBIDDEN: `role`, `email`, `created_at`, `id`, `stripe_customer_id`, `stripe_account_id`, `is_verified`, `is_suspended`

**SELECT Visibility Rules:**
- Own record: ALL fields
- Other users (via transaction participation): `id`, `display_name`, `avatar_url`, `is_verified` ONLY
- Admin/System: ALL fields

### 3.2 `transactions` Table

| Operation | buyer | seller | admin | system |
|-----------|-------|--------|-------|--------|
| **SELECT** | ✅ Participant only | ✅ Participant only + STATE GATE | ✅ All records | ✅ All records |
| **INSERT** | ✅ As initiator | ❌ FORBIDDEN | ✅ Allowed | ✅ Allowed |
| **UPDATE** | ✅ Limited by state | ✅ Limited by state | ✅ All records | ✅ All records |
| **DELETE** | ❌ FORBIDDEN | ❌ FORBIDDEN | ❌ FORBIDDEN | ❌ FORBIDDEN |

**CRITICAL RULES:**

1. **Buyer SELECT**: `auth.uid() = transactions.buyer_id`

2. **Seller SELECT**: `auth.uid() = transactions.seller_id` **AND** `status NOT IN ('draft', 'pending_payment')`
   - Seller CANNOT see transaction until escrow is funded

3. **Buyer INSERT**:
   - `buyer_id` MUST equal `auth.uid()`
   - `status` MUST be `'draft'` or `'pending_payment'`
   - `seller_id` CAN be null (invite flow) or valid user ID

4. **Buyer UPDATE** (state-dependent):
   - `draft` → Can update: `title`, `description`, `amount`, `seller_id`, `terms`, `deadline`
   - `pending_payment` → Can update: NOTHING (payment in progress)
   - `funded` → Can update: NOTHING
   - `delivered` → Can trigger: `release_funds` action
   - `disputed` → Can update: NOTHING (dispute controls)
   - `completed`, `refunded`, `cancelled` → IMMUTABLE

5. **Seller UPDATE** (state-dependent):
   - `funded` → Can trigger: `mark_delivered` action
   - `disputed` → Can update: NOTHING (dispute controls)
   - All other states → FORBIDDEN

**DELETE IS FORBIDDEN FOR ALL ROLES. TRANSACTIONS ARE IMMUTABLE RECORDS.**

### 3.3 `disputes` Table

| Operation | buyer | seller | admin | system |
|-----------|-------|--------|-------|--------|
| **SELECT** | ✅ Participant only | ✅ Participant only | ✅ All records | ✅ All records |
| **INSERT** | ✅ On own transaction | ✅ On own transaction | ✅ Allowed | ✅ Allowed |
| **UPDATE** | ✅ Limited fields | ✅ Limited fields | ✅ All records | ✅ All records |
| **DELETE** | ❌ FORBIDDEN | ❌ FORBIDDEN | ❌ FORBIDDEN | ❌ FORBIDDEN |

**Participation Rule:**
- User is participant IF `auth.uid()` equals EITHER:
  - `disputes.initiated_by` (the dispute creator), OR
  - `disputes.transaction_id` → `transactions.buyer_id`, OR
  - `disputes.transaction_id` → `transactions.seller_id`

**INSERT Rules:**
- `initiated_by` MUST equal `auth.uid()`
- User MUST be buyer or seller on the linked transaction
- Transaction `status` MUST be `'funded'` or `'delivered'`
- `status` of new dispute MUST be `'open'`

**UPDATE Rules (buyer/seller):**
- ✅ ALLOWED: `evidence`, `evidence_files` (append only, no removal)
- ❌ FORBIDDEN: `status`, `resolution`, `resolved_at`, `admin_notes`

**UPDATE Rules (admin):**
- ✅ ALLOWED: ALL fields including `status`, `resolution`, `admin_notes`

**DELETE IS FORBIDDEN FOR ALL ROLES. DISPUTES ARE LEGAL RECORDS.**

### 3.4 `audit_logs` Table

| Operation | buyer | seller | admin | system |
|-----------|-------|--------|-------|--------|
| **SELECT** | ❌ FORBIDDEN | ❌ FORBIDDEN | ✅ All records | ✅ All records |
| **INSERT** | ❌ FORBIDDEN | ❌ FORBIDDEN | ✅ Allowed | ✅ Allowed |
| **UPDATE** | ❌ FORBIDDEN | ❌ FORBIDDEN | ❌ FORBIDDEN | ❌ FORBIDDEN |
| **DELETE** | ❌ FORBIDDEN | ❌ FORBIDDEN | ❌ FORBIDDEN | ❌ FORBIDDEN |

**ABSOLUTE RULES:**
- Audit logs are WRITE-ONCE, READ-ADMIN-ONLY
- NO updates permitted under ANY circumstance
- NO deletes permitted under ANY circumstance
- System writes via triggers and backend services
- Admin reads for investigation and compliance

---

## 4. PARTICIPATION RULES

### 4.1 Definition of Participant

A user is a **participant** in a transaction if and only if:

```
is_participant(user_id, transaction_id) :=
    user_id = transaction.buyer_id
    OR
    user_id = transaction.seller_id
```

### 4.2 Definition of Dispute Participant

A user is a **participant** in a dispute if and only if:

```
is_dispute_participant(user_id, dispute_id) :=
    user_id = dispute.initiated_by
    OR
    is_participant(user_id, dispute.transaction_id)
```

### 4.3 Visibility Gates

| User Type | Transaction Visibility | Condition |
|-----------|----------------------|-----------|
| Buyer | Full | Always (if participant) |
| Seller | Full | Only if `status NOT IN ('draft', 'pending_payment')` |
| Seller | None | If `status IN ('draft', 'pending_payment')` |
| Admin | Full | Always |
| System | Full | Always |

**Rationale:** Seller should not see transaction details until buyer has committed funds. This prevents:
- Information leakage before commitment
- Seller acting on uncommitted transactions
- Gaming of the invite/acceptance flow

---

## 5. STATE-BASED ACCESS CONTROLS

### 5.1 Transaction State Machine Reference

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TRANSACTION STATE MACHINE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────┐     ┌─────────────────┐     ┌────────┐                │
│   │  draft  │────▶│ pending_payment │────▶│ funded │                │
│   └─────────┘     └─────────────────┘     └────────┘                │
│        │                   │                   │                     │
│        │                   │                   ▼                     │
│        │                   │            ┌───────────┐                │
│        │                   │            │ delivered │                │
│        │                   │            └───────────┘                │
│        │                   │                   │                     │
│        ▼                   ▼                   ▼                     │
│   ┌───────────┐      ┌──────────┐       ┌───────────┐               │
│   │ cancelled │      │ refunded │       │ completed │               │
│   └───────────┘      └──────────┘       └───────────┘               │
│                                               │                      │
│                      ┌──────────┐             │                      │
│                      │ disputed │◀────────────┘                      │
│                      └──────────┘                                    │
│                           │                                          │
│                           ▼                                          │
│                  ┌─────────────────┐                                 │
│                  │ refunded/completed │                              │
│                  └─────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 State-Based Write Permissions

| State | Buyer Can | Seller Can | Admin Can | System Can |
|-------|-----------|------------|-----------|------------|
| `draft` | Edit details, cancel, submit | Nothing | All | All |
| `pending_payment` | Cancel (before charge) | Nothing | All | All |
| `funded` | Nothing | Mark delivered | All | All |
| `delivered` | Release funds, dispute | Dispute | All | All |
| `disputed` | Add evidence | Add evidence | Resolve | All |
| `completed` | Nothing | Nothing | Audit only | Audit only |
| `refunded` | Nothing | Nothing | Audit only | Audit only |
| `cancelled` | Nothing | Nothing | Audit only | Audit only |

### 5.3 Field Mutability by State

**`draft` state:**
```
MUTABLE by buyer: title, description, amount, seller_id, terms, deadline, metadata
IMMUTABLE: id, buyer_id, created_at, status
```

**`pending_payment` state:**
```
MUTABLE by system: status, stripe_payment_intent_id
IMMUTABLE: ALL other fields
```

**`funded` state:**
```
MUTABLE by seller: status (to 'delivered' only)
MUTABLE by system: status, funded_at, escrow_released_at
IMMUTABLE: ALL other fields for buyer
```

**`delivered` state:**
```
MUTABLE by buyer: status (to 'completed' via release, or 'disputed')
MUTABLE by seller: status (to 'disputed' only)
MUTABLE by system: status, delivered_at, completed_at
```

**`disputed` state:**
```
MUTABLE by admin: status (to 'completed' or 'refunded')
MUTABLE by system: status, resolution metadata
IMMUTABLE: ALL fields for buyer/seller
```

**Terminal states (`completed`, `refunded`, `cancelled`):**
```
IMMUTABLE: ALL fields for ALL roles
EXCEPTION: System may update metadata for compliance/audit
```

---

## 6. STRIPE WEBHOOK SAFETY MODEL

### 6.1 The Webhook Bypass Problem

Stripe webhooks **DO NOT** pass through Supabase Auth. They arrive as:
- Unauthenticated HTTP requests
- Validated by Stripe signature
- Processed by backend/edge functions

**RLS cannot verify webhook identity via `auth.uid()`.**

### 6.2 Webhook Access Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    STRIPE WEBHOOK FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Stripe ──────▶ Backend API ──────▶ Supabase (service_role)    │
│                       │                                          │
│                       ▼                                          │
│              Signature Verified?                                 │
│                    │    │                                        │
│                   YES   NO                                       │
│                    │    │                                        │
│                    ▼    ▼                                        │
│               Process  Reject                                    │
│                    │                                             │
│                    ▼                                             │
│          Use service_role client                                 │
│          (BYPASSES RLS by design)                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Service Role Rules

**Service role (`system`) access:**
- BYPASSES all RLS policies
- Used exclusively by backend services
- NEVER exposed to frontend
- NEVER included in client bundles

**Security Requirements:**
1. `SUPABASE_SERVICE_ROLE_KEY` stored in environment variables only
2. Webhook endpoints validate Stripe signature BEFORE any database operation
3. All service role operations logged to `audit_logs`
4. Service role operations include `actor: 'system'` in audit metadata

### 6.4 What RLS Protects Against

| Threat | RLS Protection |
|--------|----------------|
| Malicious frontend user | ✅ PROTECTED — RLS enforces auth.uid() |
| Forged JWT | ✅ PROTECTED — Supabase validates JWT signature |
| Direct API access without auth | ✅ PROTECTED — RLS denies unauthenticated |
| Forged Stripe webhook | ❌ NOT RLS — Backend signature validation |
| Compromised service role key | ❌ NOT RLS — Infrastructure security |

### 6.5 RLS and `auth.role()` Usage

| Check | When to Use |
|-------|-------------|
| `auth.uid() IS NOT NULL` | Require authenticated user |
| `auth.uid() = table.user_id` | Ownership verification |
| `auth.role() = 'service_role'` | Backend/webhook operations |
| `EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')` | Admin verification |

**NEVER trust JWT custom claims for role elevation without database verification.**

---

## 7. FORBIDDEN OPERATIONS

### 7.1 Absolute Prohibitions

The following operations are **FORBIDDEN under all circumstances**:

| Operation | Reason |
|-----------|--------|
| DELETE on `transactions` | Legal record preservation |
| DELETE on `disputes` | Legal record preservation |
| DELETE on `audit_logs` | Compliance requirement |
| UPDATE on `audit_logs` | Immutable audit trail |
| Anonymous access to any table | Security baseline |
| Buyer UPDATE on `seller_id` after `funded` | Prevents fund redirection |
| Seller access before escrow funded | Information security |
| Role self-elevation | Security fundamental |
| Direct status jumps (e.g., `draft` → `completed`) | State machine integrity |

### 7.2 Role-Specific Prohibitions

**Buyer CANNOT:**
- See other buyers' transactions
- Modify transactions after funding (except release/dispute)
- Access audit logs
- Modify dispute resolution
- Change seller after funding
- Delete any record

**Seller CANNOT:**
- Create transactions
- See transactions before escrow
- Release funds (only buyer can)
- Access audit logs
- Modify dispute resolution
- Delete any record

**Admin CANNOT:**
- Delete transactions
- Delete disputes
- Delete or modify audit logs
- Bypass audit logging

**System CANNOT:**
- Delete audit logs
- Skip audit logging for sensitive operations

---

## 8. AUDIT & COMPLIANCE

### 8.1 Audit Log Requirements

Every significant operation MUST generate an audit log entry:

| Event | Actor | Required Fields |
|-------|-------|-----------------|
| Transaction created | buyer | transaction_id, buyer_id, amount |
| Transaction funded | system | transaction_id, stripe_payment_intent_id |
| Funds released | buyer | transaction_id, released_at |
| Dispute opened | buyer/seller | dispute_id, transaction_id, initiated_by |
| Dispute resolved | admin | dispute_id, resolution, admin_id |
| User role changed | admin | user_id, old_role, new_role, admin_id |
| Refund processed | system | transaction_id, refund_id, amount |

### 8.2 Audit Log Schema Requirements

```
audit_logs:
  - id: UUID (immutable)
  - event_type: STRING (immutable)
  - actor_id: UUID | 'system' (immutable)
  - actor_role: STRING (immutable)
  - target_table: STRING (immutable)
  - target_id: UUID (immutable)
  - old_values: JSONB (immutable)
  - new_values: JSONB (immutable)
  - ip_address: STRING (immutable)
  - user_agent: STRING (immutable)
  - created_at: TIMESTAMP (immutable)
```

### 8.3 Retention Policy

- Audit logs: **PERMANENT** (no deletion policy)
- Transaction records: **PERMANENT**
- Dispute records: **PERMANENT**
- User records: **Soft delete only** (preserve for audit linkage)

---

## APPENDIX A: DECISION MATRIX

Quick reference for "Can X do Y on Z?"

### A.1 Transaction Access

```
Can [ROLE] perform [OPERATION] on transactions?

                    SELECT    INSERT    UPDATE    DELETE
buyer (own)           ✅         ✅        ⚠️*        ❌
buyer (other)         ❌         ❌        ❌         ❌
seller (own, funded)  ✅         ❌        ⚠️*        ❌
seller (own, draft)   ❌         ❌        ❌         ❌
seller (other)        ❌         ❌        ❌         ❌
admin                 ✅         ✅        ✅         ❌
system                ✅         ✅        ✅         ❌

* State-dependent restrictions apply (see Section 5)
```

### A.2 Dispute Access

```
Can [ROLE] perform [OPERATION] on disputes?

                      SELECT    INSERT    UPDATE    DELETE
participant (own)       ✅         ✅        ⚠️*        ❌
participant (other)     ❌         ❌        ❌         ❌
admin                   ✅         ✅        ✅         ❌
system                  ✅         ✅        ✅         ❌

* Evidence only, no status/resolution changes
```

### A.3 Audit Log Access

```
Can [ROLE] perform [OPERATION] on audit_logs?

            SELECT    INSERT    UPDATE    DELETE
buyer         ❌         ❌        ❌         ❌
seller        ❌         ❌        ❌         ❌
admin         ✅         ✅        ❌         ❌
system        ✅         ✅        ❌         ❌
```

---

## APPENDIX B: VERIFICATION CHECKLIST

Before any RLS policy is written, verify:

- [ ] Policy matches this document EXACTLY
- [ ] Default deny is maintained
- [ ] Participation checks use correct columns
- [ ] State checks are included where required
- [ ] Admin role is verified via database, not JWT alone
- [ ] Service role bypass is intentional and documented
- [ ] No DELETE policies on transactions, disputes, or audit_logs
- [ ] No UPDATE policies on audit_logs
- [ ] Audit logging is triggered for the operation

---

## DOCUMENT CONTROL

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0-FINAL | 2026-02-05 | Security Architect | Initial authoritative release |

**This document is FINAL and IMMUTABLE.**

Any proposed changes require:
1. Security review
2. Legal review
3. Formal change request
4. Version increment

---

*End of RLS Domain Model*
