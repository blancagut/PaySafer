# ADMIN ACTION & OVERRIDE MODEL — Canonical Write Contract

**Version:** 1.0.0  
**Status:** Authoritative  
**Date:** 2026-02-05  
**Classification:** SECURITY-CRITICAL — RESTRICTED ACCESS  

> ⚠️ **CRITICAL**: This document defines the **ONLY** actions administrators may perform. Any action not explicitly listed here is **FORBIDDEN**. Admin ≠ god mode. Every action is auditable, justified, and constrained.

---

## TABLE OF CONTENTS

1. [Foundational Principles](#1-foundational-principles)
2. [Action Definitions](#2-action-definitions)
3. [Dispute Resolution Actions](#3-dispute-resolution-actions)
4. [Financial Override Actions](#4-financial-override-actions)
5. [Account Management Actions](#5-account-management-actions)
6. [Administrative Record Actions](#6-administrative-record-actions)
7. [Forbidden Actions](#7-forbidden-actions)
8. [Failure Handling & Error Responses](#8-failure-handling--error-responses)
9. [Audit Log Mapping](#9-audit-log-mapping)
10. [Approval Workflow Reference](#10-approval-workflow-reference)

---

## 1. FOUNDATIONAL PRINCIPLES

### 1.1 Core Invariants (NEVER Violate)

| Invariant | Description | Enforcement |
|-----------|-------------|-------------|
| **Terminal Immutability** | `completed`, `refunded`, `cancelled` states CANNOT be changed | Database trigger + API guard |
| **Single Disbursement** | Funds can only be released ONCE (to buyer OR seller) | State machine constraint |
| **Audit Completeness** | Every admin action generates immutable audit log | Trigger + API middleware |
| **Justification Required** | No admin action succeeds without written justification | API validation |
| **No Silent Success** | Every action produces visible outcome (notification/log) | API contract |

### 1.2 Admin Power Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ADMIN APPROVAL LEVELS                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   LEVEL 1: Standard Admin (role = 'admin')                          │
│   ├── Dispute resolution (favor buyer OR seller)                    │
│   ├── Internal notes                                                │
│   ├── Account freeze (temporary, < 30 days)                         │
│   └── Dispute message responses                                     │
│                                                                      │
│   LEVEL 2: Senior Admin (role = 'admin' + senior_admin = true)      │
│   ├── All Level 1 actions                                           │
│   ├── Manual completion (non-disputed transactions)                 │
│   ├── Manual refund (non-disputed, pre-terminal)                    │
│   ├── Account freeze (extended, > 30 days)                          │
│   └── User role modification (non-admin)                            │
│                                                                      │
│   LEVEL 3: Compliance Review (Legal + Finance sign-off required)    │
│   ├── Chargebacks (requires Stripe process)                         │
│   ├── Regulatory freezes                                            │
│   ├── Account termination                                           │
│   └── Admin role assignment                                         │
│                                                                      │
│   FORBIDDEN (No level can perform):                                  │
│   ├── Modify terminal states                                        │
│   ├── Delete transactions/disputes/audit logs                       │
│   ├── Access payment credentials                                    │
│   └── Bypass Stripe for fund movement                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Action Execution Flow

```
Admin Request
     │
     ▼
┌──────────────────────┐
│ 1. Authenticate JWT  │──▶ Invalid? → 401 Unauthorized
└──────────────────────┘
     │ Valid
     ▼
┌──────────────────────┐
│ 2. Verify Admin Role │──▶ Not Admin? → 403 Forbidden
│    (database check)  │
└──────────────────────┘
     │ Admin
     ▼
┌──────────────────────┐
│ 3. Check Approval    │──▶ Insufficient? → 403 Forbidden
│    Level Required    │    "Action requires Level N approval"
└──────────────────────┘
     │ Sufficient
     ▼
┌──────────────────────┐
│ 4. Validate          │──▶ Missing? → 400 Bad Request
│    Justification     │    "Justification required (min N chars)"
└──────────────────────┘
     │ Valid
     ▼
┌──────────────────────┐
│ 5. Check             │──▶ Failed? → 409 Conflict
│    Preconditions     │    "Cannot [action]: [reason]"
└──────────────────────┘
     │ Met
     ▼
┌──────────────────────┐
│ 6. Execute Action    │──▶ Failed? → 500 Internal Error
│    (within TX)       │    + Alert engineering
└──────────────────────┘
     │ Success
     ▼
┌──────────────────────────────────────┐
│ 7. Create Audit Log (same TX)        │
└──────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│ 8. Send Notifications (async)        │
└──────────────────────────────────────┘
     │
     ▼
200 OK / 201 Created
```

---

## 2. ACTION DEFINITIONS

### 2.1 Action Specification Format

Each action is defined with:

| Field | Description |
|-------|-------------|
| **Action ID** | Unique identifier (snake_case) |
| **Name** | Human-readable name |
| **Description** | What this action does |
| **Approval Level** | 1 (Standard), 2 (Senior), 3 (Compliance) |
| **Target** | Table(s) affected |
| **Preconditions** | Required state before action |
| **State Transition** | Allowed from → to states |
| **Forbidden Transitions** | Explicitly blocked state changes |
| **Justification** | Minimum length, required fields |
| **Notifications** | Who gets notified and how |
| **Audit Event** | Event type logged |

### 2.2 Complete Action Registry

| Action ID | Name | Level | Target |
|-----------|------|-------|--------|
| `resolve_dispute_favor_buyer` | Resolve Dispute (Buyer Wins) | 1 | disputes, transactions |
| `resolve_dispute_favor_seller` | Resolve Dispute (Seller Wins) | 1 | disputes, transactions |
| `resolve_dispute_partial` | Resolve Dispute (Partial Refund) | 2 | disputes, transactions |
| `withdraw_dispute` | Withdraw Dispute (Resume Transaction) | 1 | disputes, transactions |
| `manual_refund` | Manual Refund (Pre-Terminal) | 2 | transactions |
| `manual_completion` | Manual Completion (Non-Disputed) | 2 | transactions |
| `freeze_account` | Freeze User Account | 1/2 | profiles |
| `unfreeze_account` | Unfreeze User Account | 1 | profiles |
| `add_internal_note` | Add Internal Note | 1 | transactions, disputes, profiles |
| `add_dispute_message` | Add Admin Message to Dispute | 1 | dispute_messages |
| `modify_user_role` | Change User Role | 2/3 | profiles |
| `terminate_account` | Terminate Account (Soft Delete) | 3 | profiles |

---

## 3. DISPUTE RESOLUTION ACTIONS

---

### 3.1 ACTION: `resolve_dispute_favor_buyer`

**Name:** Resolve Dispute — Buyer Wins (Full Refund)

**Description:** Admin reviews dispute evidence and rules in favor of the buyer. Escrow funds are returned to buyer's original payment method.

**Approval Level:** 1 (Standard Admin)

**Target Tables:**
- `disputes` (status, resolution, resolved_by, resolved_at)
- `transactions` (status → `refunded`)

**Preconditions:**

| Condition | Check | Error if Failed |
|-----------|-------|-----------------|
| Transaction exists | `transaction_id IS NOT NULL` | 404 Not Found |
| Dispute exists | `dispute.status = 'under_review'` | 409: Dispute not open |
| Transaction in dispute | `transaction.status = 'dispute'` | 409: Transaction not disputed |
| Not already resolved | `dispute.resolved_at IS NULL` | 409: Already resolved |
| Admin is authenticated | `is_admin() = true` | 403 Forbidden |

**Allowed State Transition:**

```
transactions.status: 'dispute' → 'refunded'
disputes.status: 'under_review' → 'resolved'
```

**Forbidden Transitions:**

| From | To | Reason |
|------|-----|--------|
| `completed` | `refunded` | Terminal state immutable |
| `cancelled` | `refunded` | Terminal state immutable |
| `refunded` | `refunded` | Already terminal |
| `draft` | `refunded` | No funds to refund |
| `awaiting_payment` | `refunded` | No funds captured |

**Justification Requirements:**

| Field | Required | Minimum | Example |
|-------|----------|---------|---------|
| `justification` | ✅ Yes | 50 chars | "Buyer provided tracking showing item never shipped. Seller unresponsive for 7 days." |
| `evidence_reviewed` | ✅ Yes | Boolean | `true` |
| `resolution_summary` | ✅ Yes | 20 chars | "Non-delivery confirmed" |

**Notifications:**

| Recipient | Method | Template |
|-----------|--------|----------|
| Buyer | Email + In-App | `dispute_resolved_buyer_wins` |
| Seller | Email + In-App | `dispute_resolved_seller_loses` |

**Audit Event:**

```json
{
  "event_type": "dispute_resolved",
  "actor_role": "admin",
  "target_table": "disputes",
  "target_id": "<dispute_id>",
  "new_values": {
    "status": "resolved",
    "resolution": "buyer_wins",
    "outcome": "full_refund",
    "justification": "...",
    "resolved_by": "admin",
    "resolved_at": "<timestamp>"
  },
  "related": {
    "transaction_id": "<transaction_id>",
    "transaction_status_change": "dispute → refunded"
  }
}
```

**State Machine Mapping:**

Per `transaction_state_machine.md` Section 2.1:
> `disputed` → `refunded` | Admin | Admin rules in favor of buyer | Evidence reviewed

---

### 3.2 ACTION: `resolve_dispute_favor_seller`

**Name:** Resolve Dispute — Seller Wins (Release Funds)

**Description:** Admin reviews dispute evidence and rules in favor of the seller. Escrow funds are released to seller minus platform fee.

**Approval Level:** 1 (Standard Admin)

**Target Tables:**
- `disputes` (status, resolution, resolved_by, resolved_at)
- `transactions` (status → `released`)

**Preconditions:**

| Condition | Check | Error if Failed |
|-----------|-------|-----------------|
| Transaction exists | `transaction_id IS NOT NULL` | 404 Not Found |
| Dispute exists | `dispute.status = 'under_review'` | 409: Dispute not open |
| Transaction in dispute | `transaction.status = 'dispute'` | 409: Transaction not disputed |
| Not already resolved | `dispute.resolved_at IS NULL` | 409: Already resolved |
| Admin is authenticated | `is_admin() = true` | 403 Forbidden |

**Allowed State Transition:**

```
transactions.status: 'dispute' → 'released'
disputes.status: 'under_review' → 'resolved'
```

**Forbidden Transitions:**

| From | To | Reason |
|------|-----|--------|
| `completed` | `released` | Already released |
| `refunded` | `released` | Terminal; funds already returned |
| `cancelled` | `released` | No funds in escrow |

**Justification Requirements:**

| Field | Required | Minimum | Example |
|-------|----------|---------|---------|
| `justification` | ✅ Yes | 50 chars | "Seller provided delivery confirmation with signature. Buyer acknowledged receipt in messages." |
| `evidence_reviewed` | ✅ Yes | Boolean | `true` |
| `resolution_summary` | ✅ Yes | 20 chars | "Delivery confirmed" |

**Notifications:**

| Recipient | Method | Template |
|-----------|--------|----------|
| Seller | Email + In-App | `dispute_resolved_seller_wins` |
| Buyer | Email + In-App | `dispute_resolved_buyer_loses` |

**Audit Event:**

```json
{
  "event_type": "dispute_resolved",
  "actor_role": "admin",
  "target_table": "disputes",
  "target_id": "<dispute_id>",
  "new_values": {
    "status": "resolved",
    "resolution": "seller_wins",
    "outcome": "funds_released",
    "justification": "...",
    "resolved_by": "admin",
    "resolved_at": "<timestamp>"
  },
  "related": {
    "transaction_id": "<transaction_id>",
    "transaction_status_change": "dispute → released"
  }
}
```

**State Machine Mapping:**

Per `transaction_state_machine.md` Section 2.1:
> `disputed` → `completed` | Admin | Admin rules in favor of seller | Evidence reviewed

---

### 3.3 ACTION: `resolve_dispute_partial`

**Name:** Resolve Dispute — Partial Refund

**Description:** Admin rules for a partial resolution: part of funds to buyer, remainder to seller. Requires Level 2 approval due to complexity.

**Approval Level:** 2 (Senior Admin)

**Target Tables:**
- `disputes` (status, resolution, resolved_by, resolved_at)
- `transactions` (status → `released`, metadata with split details)

**Preconditions:**

| Condition | Check | Error if Failed |
|-----------|-------|-----------------|
| Transaction exists | `transaction_id IS NOT NULL` | 404 Not Found |
| Dispute exists | `dispute.status = 'under_review'` | 409: Dispute not open |
| Transaction in dispute | `transaction.status = 'dispute'` | 409: Transaction not disputed |
| Split amounts valid | `refund_amount + seller_amount = escrow_amount` | 400: Amounts don't balance |
| Refund amount > 0 | `refund_amount > 0` | 400: Use full resolution instead |
| Seller amount > 0 | `seller_amount > 0` | 400: Use full refund instead |
| Admin is senior | `is_senior_admin() = true` | 403: Requires senior admin |

**Allowed State Transition:**

```
transactions.status: 'dispute' → 'released'
disputes.status: 'under_review' → 'resolved'
```

**Justification Requirements:**

| Field | Required | Minimum | Example |
|-------|----------|---------|---------|
| `justification` | ✅ Yes | 100 chars | "Item received but damaged. Seller shipped correctly but carrier mishandled. Splitting 60/40 as compromise." |
| `evidence_reviewed` | ✅ Yes | Boolean | `true` |
| `resolution_summary` | ✅ Yes | 20 chars | "Partial refund 60/40" |
| `refund_amount` | ✅ Yes | Decimal | `60.00` |
| `seller_amount` | ✅ Yes | Decimal | `40.00` |
| `split_rationale` | ✅ Yes | 30 chars | "Carrier damage, shared liability" |

**Notifications:**

| Recipient | Method | Template |
|-----------|--------|----------|
| Buyer | Email + In-App | `dispute_resolved_partial_buyer` |
| Seller | Email + In-App | `dispute_resolved_partial_seller` |

**Audit Event:**

```json
{
  "event_type": "dispute_resolved",
  "actor_role": "admin",
  "target_table": "disputes",
  "target_id": "<dispute_id>",
  "new_values": {
    "status": "resolved",
    "resolution": "partial",
    "outcome": "split_funds",
    "refund_amount": 60.00,
    "seller_amount": 40.00,
    "justification": "...",
    "resolved_by": "admin",
    "resolved_at": "<timestamp>"
  }
}
```

**⚠️ Payment Processor Note:**

Partial refunds require **TWO** Stripe operations:
1. Partial refund to buyer via original payment intent
2. Reduced transfer to seller's connected account

Both must succeed atomically or the action must be rolled back.

---

### 3.4 ACTION: `withdraw_dispute`

**Name:** Withdraw Dispute — Resume Transaction

**Description:** Admin withdraws a dispute (rare case) to allow transaction to continue. Used when dispute was opened in error or parties reached agreement.

**Approval Level:** 1 (Standard Admin)

**Target Tables:**
- `disputes` (status → `closed`)
- `transactions` (status → `in_escrow` or `delivered`)

**Preconditions:**

| Condition | Check | Error if Failed |
|-----------|-------|-----------------|
| Dispute exists | `dispute.status = 'under_review'` | 409: Dispute not open |
| Transaction in dispute | `transaction.status = 'dispute'` | 409: Transaction not disputed |
| Mutual consent obtained | `consent_documented = true` | 400: Requires party consent |
| Both parties active | Neither party frozen | 409: Party account frozen |

**Allowed State Transition:**

```
transactions.status: 'dispute' → 'in_escrow' (if not delivered)
transactions.status: 'dispute' → 'delivered' (if was delivered)
disputes.status: 'under_review' → 'closed'
```

**Justification Requirements:**

| Field | Required | Minimum | Example |
|-------|----------|---------|---------|
| `justification` | ✅ Yes | 50 chars | "Both parties confirmed misunderstanding resolved. Buyer wants to proceed with transaction." |
| `consent_documented` | ✅ Yes | Boolean | `true` |
| `return_state` | ✅ Yes | Enum | `in_escrow` or `delivered` |

**Notifications:**

| Recipient | Method | Template |
|-----------|--------|----------|
| Buyer | Email + In-App | `dispute_withdrawn_transaction_continues` |
| Seller | Email + In-App | `dispute_withdrawn_transaction_continues` |

**State Machine Mapping:**

Per `transaction_state_machine.md` Section 2.1:
> `disputed` → `in_escrow` | Admin | Dispute withdrawn, transaction continues | Rare case

---

## 4. FINANCIAL OVERRIDE ACTIONS

---

### 4.1 ACTION: `manual_refund`

**Name:** Manual Refund (Non-Dispute)

**Description:** Admin initiates refund for transaction NOT in dispute. Used for cancellations, fraud prevention, or policy violations.

**Approval Level:** 2 (Senior Admin)

**Target Tables:**
- `transactions` (status → `refunded`)

**Preconditions:**

| Condition | Check | Error if Failed |
|-----------|-------|-----------------|
| Transaction exists | `transaction_id IS NOT NULL` | 404 Not Found |
| Has funds to refund | `status IN ('in_escrow', 'delivered')` | 409: No funds in escrow |
| Not in dispute | `status != 'dispute'` | 409: Use dispute resolution |
| Not terminal | `status NOT IN ('released', 'refunded', 'cancelled')` | 409: Transaction is terminal |
| Senior admin | `is_senior_admin() = true` | 403: Requires senior admin |

**Allowed State Transition:**

```
transactions.status: 'in_escrow' → 'refunded'
transactions.status: 'delivered' → 'refunded'
```

**Forbidden Transitions:**

| From | To | Reason |
|------|-----|--------|
| `draft` | `refunded` | No funds captured |
| `awaiting_payment` | `refunded` | No funds captured |
| `released` | `refunded` | Funds already disbursed |
| `refunded` | `refunded` | Already refunded |
| `cancelled` | `refunded` | No funds to refund |
| `dispute` | `refunded` | Must use dispute resolution |

**Justification Requirements:**

| Field | Required | Minimum | Example |
|-------|----------|---------|---------|
| `justification` | ✅ Yes | 100 chars | "Seller account flagged for fraud. Multiple buyer complaints. Refunding proactively to protect buyer." |
| `refund_reason` | ✅ Yes | Enum | `fraud_prevention`, `policy_violation`, `seller_request`, `buyer_request_approved`, `platform_error` |
| `evidence_reference` | Conditional | String | Reference to support ticket or fraud report |

**Notifications:**

| Recipient | Method | Template |
|-----------|--------|----------|
| Buyer | Email + In-App | `transaction_refunded_by_admin` |
| Seller | Email + In-App | `transaction_refunded_seller_notice` |

**⚠️ Stripe Integration:**

```
1. Call Stripe Refund API with original payment_intent
2. Wait for refund confirmation
3. Only then update transaction status
4. If Stripe fails → rollback, alert engineering
```

**Audit Event:**

```json
{
  "event_type": "manual_refund",
  "actor_role": "admin",
  "target_table": "transactions",
  "target_id": "<transaction_id>",
  "old_values": { "status": "in_escrow" },
  "new_values": { 
    "status": "refunded",
    "refund_reason": "fraud_prevention",
    "refund_initiated_by": "admin",
    "refund_at": "<timestamp>"
  }
}
```

---

### 4.2 ACTION: `manual_completion`

**Name:** Manual Completion (Force Release)

**Description:** Admin forces transaction to complete, releasing funds to seller. Used when buyer is unresponsive after delivery confirmation.

**Approval Level:** 2 (Senior Admin)

**Target Tables:**
- `transactions` (status → `released`)

**Preconditions:**

| Condition | Check | Error if Failed |
|-----------|-------|-----------------|
| Transaction exists | `transaction_id IS NOT NULL` | 404 Not Found |
| Delivery submitted | `status = 'delivered'` | 409: Delivery not confirmed |
| Not in dispute | No open dispute | 409: Has open dispute |
| Inspection period expired | `delivered_at + 3 days < NOW()` | 409: Inspection period active |
| Not terminal | `status NOT IN ('released', 'refunded', 'cancelled')` | 409: Transaction is terminal |
| Senior admin | `is_senior_admin() = true` | 403: Requires senior admin |

**Allowed State Transition:**

```
transactions.status: 'delivered' → 'released'
```

**Forbidden Transitions:**

| From | To | Reason |
|------|-----|--------|
| `draft` | `released` | Must go through full flow |
| `awaiting_payment` | `released` | No funds captured |
| `in_escrow` | `released` | Must be delivered first |
| `dispute` | `released` | Must resolve dispute first |
| Any terminal | `released` | Terminal states immutable |

**Justification Requirements:**

| Field | Required | Minimum | Example |
|-------|----------|---------|---------|
| `justification` | ✅ Yes | 75 chars | "Buyer unresponsive for 14 days after delivery. Seller provided tracking confirmation. Auto-release triggered." |
| `completion_reason` | ✅ Yes | Enum | `buyer_unresponsive`, `inspection_expired`, `seller_request_approved` |
| `buyer_contact_attempts` | ✅ Yes | Integer | `3` (number of contact attempts) |

**Notifications:**

| Recipient | Method | Template |
|-----------|--------|----------|
| Seller | Email + In-App | `funds_released_admin_completion` |
| Buyer | Email + In-App | `transaction_completed_notice` |

**⚠️ Stripe Integration:**

```
1. Calculate seller payout (amount - platform_fee)
2. Create Stripe Transfer to seller's connected account
3. Wait for transfer confirmation
4. Update transaction status
5. If Stripe fails → rollback, alert engineering
```

---

## 5. ACCOUNT MANAGEMENT ACTIONS

---

### 5.1 ACTION: `freeze_account`

**Name:** Freeze User Account

**Description:** Temporarily suspend user's ability to create or participate in transactions. Does NOT affect existing completed transactions.

**Approval Level:** 
- Level 1: Temporary freeze (< 30 days)
- Level 2: Extended freeze (≥ 30 days)

**Target Tables:**
- `profiles` (add `frozen_at`, `frozen_by`, `frozen_reason`, `frozen_until`)

**Preconditions:**

| Condition | Check | Error if Failed |
|-----------|-------|-----------------|
| User exists | `profile_id IS NOT NULL` | 404 Not Found |
| Not already frozen | `frozen_at IS NULL` | 409: Already frozen |
| Not an admin | `user.role != 'admin'` | 403: Cannot freeze admin |
| No active escrow (warning) | Check for `in_escrow` transactions | Warning: Has active transactions |

**Effects:**

| Action | Effect |
|--------|--------|
| New transactions | BLOCKED — Cannot create |
| Accept invitations | BLOCKED — Cannot become seller |
| Existing in-progress | CONTINUES — Can complete/dispute |
| Login | ALLOWED — Can view history |
| Withdrawals | BLOCKED — If seller with pending |

**Justification Requirements:**

| Field | Required | Minimum | Example |
|-------|----------|---------|---------|
| `justification` | ✅ Yes | 50 chars | "Multiple fraud reports from buyers. Account under investigation." |
| `freeze_reason` | ✅ Yes | Enum | `fraud_investigation`, `policy_violation`, `legal_request`, `user_request` |
| `freeze_duration_days` | ✅ Yes | Integer | `14` |
| `review_date` | ✅ Yes | Date | Date when freeze will be reviewed |

**Notifications:**

| Recipient | Method | Template |
|-----------|--------|----------|
| Frozen User | Email | `account_frozen_notice` |
| Active Counterparties | Email | `counterparty_account_frozen` (if has active transactions) |

**Audit Event:**

```json
{
  "event_type": "account_frozen",
  "actor_role": "admin",
  "target_table": "profiles",
  "target_id": "<user_id>",
  "new_values": {
    "frozen_at": "<timestamp>",
    "frozen_by": "<admin_id>",
    "frozen_reason": "fraud_investigation",
    "frozen_until": "<timestamp>",
    "justification": "..."
  }
}
```

---

### 5.2 ACTION: `unfreeze_account`

**Name:** Unfreeze User Account

**Description:** Remove account freeze, restoring full platform access.

**Approval Level:** 1 (Standard Admin)

**Target Tables:**
- `profiles` (clear freeze fields, add `unfrozen_at`, `unfrozen_by`)

**Preconditions:**

| Condition | Check | Error if Failed |
|-----------|-------|-----------------|
| User exists | `profile_id IS NOT NULL` | 404 Not Found |
| Currently frozen | `frozen_at IS NOT NULL` | 409: Not frozen |
| Investigation complete | `freeze_investigation_closed = true` | 409: Investigation pending |

**Justification Requirements:**

| Field | Required | Minimum | Example |
|-------|----------|---------|---------|
| `justification` | ✅ Yes | 30 chars | "Investigation complete. No violation found." |
| `unfreeze_reason` | ✅ Yes | Enum | `investigation_cleared`, `freeze_expired`, `appeal_approved`, `admin_discretion` |

**Notifications:**

| Recipient | Method | Template |
|-----------|--------|----------|
| User | Email + In-App | `account_unfrozen_notice` |

---

### 5.3 ACTION: `modify_user_role`

**Name:** Modify User Role

**Description:** Change a user's role between `user` and `admin`.

**Approval Level:**
- Level 2: Demote admin → user
- Level 3: Promote user → admin (requires compliance sign-off)

**Target Tables:**
- `profiles` (role field)

**Preconditions:**

| Condition | Check | Error if Failed |
|-----------|-------|-----------------|
| User exists | `profile_id IS NOT NULL` | 404 Not Found |
| Not self | `target_id != auth.uid()` | 403: Cannot modify own role |
| Valid role | `new_role IN ('user', 'admin')` | 400: Invalid role |
| Compliance approval (if admin) | Level 3 sign-off | 403: Requires compliance |

**Forbidden:**

- Self-elevation (admin cannot make themselves "super admin")
- Creating roles beyond `user` / `admin`
- Removing the last admin

**Justification Requirements:**

| Field | Required | Minimum | Example |
|-------|----------|---------|---------|
| `justification` | ✅ Yes | 50 chars | "New support team member. Background check completed." |
| `role_change_reason` | ✅ Yes | Enum | `new_hire`, `promotion`, `termination`, `policy_violation` |
| `compliance_ticket` | If → admin | String | Reference to compliance approval |

**Notifications:**

| Recipient | Method | Template |
|-----------|--------|----------|
| User | Email | `role_changed_notice` |
| All Admins | Email | `admin_role_change_alert` (if new admin) |

---

### 5.4 ACTION: `terminate_account`

**Name:** Terminate Account (Soft Delete)

**Description:** Permanently disable user account. Soft delete preserves records for audit. Used for severe violations.

**Approval Level:** 3 (Compliance Review Required)

**Target Tables:**
- `profiles` (set `deleted_at`, retain all data)

**Preconditions:**

| Condition | Check | Error if Failed |
|-----------|-------|-----------------|
| User exists | `profile_id IS NOT NULL` | 404 Not Found |
| Not an admin | `user.role != 'admin'` | 403: Admins require special process |
| No active escrow | No `in_escrow` or `delivered` transactions | 409: Has active transactions |
| Compliance approved | Level 3 sign-off documented | 403: Requires compliance |
| Legal review (if needed) | For regulatory cases | 403: Requires legal |

**Effects:**

| Action | Effect |
|--------|--------|
| Login | BLOCKED — Account disabled |
| Data retention | PRESERVED — For audit/legal |
| Transaction history | PRESERVED — Linked to tombstone |
| Future registration | BLOCKED — Email blacklisted |

**Justification Requirements:**

| Field | Required | Minimum | Example |
|-------|----------|---------|---------|
| `justification` | ✅ Yes | 100 chars | "Confirmed fraud scheme. Legal notified. Account terminated per compliance directive CT-2026-0042." |
| `termination_reason` | ✅ Yes | Enum | `fraud_confirmed`, `legal_requirement`, `severe_policy_violation`, `user_request` |
| `compliance_ticket` | ✅ Yes | String | `CT-2026-0042` |
| `legal_review_ref` | Conditional | String | If legal involvement |

**Notifications:**

| Recipient | Method | Template |
|-----------|--------|----------|
| User | Email | `account_terminated_notice` |
| Compliance | Internal | Termination confirmation |

---

## 6. ADMINISTRATIVE RECORD ACTIONS

---

### 6.1 ACTION: `add_internal_note`

**Name:** Add Internal Admin Note

**Description:** Add internal-only note to transaction, dispute, or user profile. Notes are NOT visible to users.

**Approval Level:** 1 (Standard Admin)

**Target Tables:**
- `admin_notes` (new table) or JSON field on target

**Preconditions:**

| Condition | Check | Error if Failed |
|-----------|-------|-----------------|
| Target exists | Record found | 404 Not Found |
| Admin authenticated | `is_admin() = true` | 403 Forbidden |

**Schema (if new table):**

```sql
CREATE TABLE admin_notes (
  id UUID PRIMARY KEY,
  target_type TEXT NOT NULL, -- 'transaction', 'dispute', 'profile'
  target_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_pinned BOOLEAN DEFAULT false
);
```

**Justification Requirements:**

| Field | Required | Minimum | Example |
|-------|----------|---------|---------|
| `note` | ✅ Yes | 10 chars | "Contacted seller via phone. Confirmed shipping delay." |
| `note_category` | Optional | Enum | `investigation`, `support`, `compliance`, `general` |

**Notifications:** None (internal only)

**Audit Event:**

```json
{
  "event_type": "admin_note_added",
  "actor_role": "admin",
  "target_table": "admin_notes",
  "new_values": {
    "target_type": "transaction",
    "target_id": "<id>",
    "note": "...",
    "created_by": "<admin_id>"
  }
}
```

---

### 6.2 ACTION: `add_dispute_message`

**Name:** Add Admin Message to Dispute

**Description:** Send a message in the dispute thread as admin. Visible to both parties.

**Approval Level:** 1 (Standard Admin)

**Target Tables:**
- `dispute_messages`

**Preconditions:**

| Condition | Check | Error if Failed |
|-----------|-------|-----------------|
| Dispute exists | `dispute_id IS NOT NULL` | 404 Not Found |
| Dispute open | `dispute.status = 'under_review'` | 409: Dispute closed |
| Admin authenticated | `is_admin() = true` | 403 Forbidden |

**Message Constraints:**

| Constraint | Value |
|------------|-------|
| Min length | 20 characters |
| Max length | 5000 characters |
| Attachments | Up to 5 files, 10MB each |

**Justification Requirements:**

| Field | Required | Minimum | Example |
|-------|----------|---------|---------|
| `message` | ✅ Yes | 20 chars | "We've reviewed the evidence. Please provide tracking number to proceed." |

**Notifications:**

| Recipient | Method | Template |
|-----------|--------|----------|
| Both Parties | Email + In-App | `dispute_admin_message` |

---

## 7. FORBIDDEN ACTIONS

### 7.1 Actions Admins Can NEVER Perform

| Forbidden Action | Reason | Error Response |
|------------------|--------|----------------|
| **Modify terminal states** | `completed`, `refunded`, `cancelled` are immutable | 409: Terminal state immutable |
| **Delete transactions** | Legal record preservation | 403: Transactions cannot be deleted |
| **Delete disputes** | Legal record preservation | 403: Disputes cannot be deleted |
| **Delete/modify audit logs** | Compliance requirement | 403: Audit logs immutable |
| **Access payment credentials** | PCI compliance; handled by Stripe | 403: No credential access |
| **Direct fund transfer** | Must use Stripe APIs | 403: Direct transfer forbidden |
| **Impersonate users** | Security violation | 403: Impersonation forbidden |
| **Bypass Stripe** | Payment processor constraints | 403: Payment processor required |
| **Skip justification** | Audit requirement | 400: Justification required |
| **Self-role elevation** | Security fundamental | 403: Cannot modify own role |
| **Create money** | Financial integrity | 403: Cannot create funds |
| **Modify transaction amounts** | After payment, amounts locked | 409: Amount immutable |
| **Change buyer/seller** | After escrow, parties locked | 409: Parties immutable |
| **Backdate timestamps** | Audit integrity | 403: Cannot modify timestamps |
| **Bulk actions without review** | Each case needs individual review | 403: Bulk action forbidden |

### 7.2 Actions That LOOK Possible But Are Forbidden

| Deceptive Action | Why It Seems Possible | Why It's Forbidden |
|------------------|----------------------|-------------------|
| **Refund after completion** | "Admin can override" | Funds disbursed to seller; Stripe cannot recall |
| **Complete after refund** | "Fix a mistake" | Buyer already refunded; no funds in escrow |
| **Cancel escrow transaction** | "User requested" | Must use refund flow; `cancelled` is for pre-payment only |
| **Instant refund** | "Urgent case" | Stripe processing takes 5-10 business days |
| **Partial refund + completion** | "Split the difference" | Only ONE disbursement per transaction |
| **Force seller payout** | "Seller needs money" | Requires transaction completion flow |
| **Remove dispute evidence** | "Privacy request" | Evidence is legal record |
| **Edit dispute messages** | "Typo correction" | Messages are immutable |
| **Un-complete transaction** | "Reversal needed" | Terminal state; create chargeback instead |
| **Change fee after payment** | "Fee miscalculated" | Fees locked at payment time |

### 7.3 Legal & Processor Constraints

| Constraint | Source | Implication |
|------------|--------|-------------|
| **Chargeback handling** | Card networks (Visa/MC) | Must follow dispute process; cannot ignore |
| **Refund window** | Stripe (180 days) | Cannot refund after 180 days |
| **KYC requirements** | AML regulations | Must freeze if KYC fails |
| **Tax reporting** | IRS 1099-K | Cannot modify amounts retroactively |
| **Data retention** | GDPR/CCPA | Cannot delete within retention period |
| **Right to erasure** | GDPR | Can soft-delete after retention; not hard delete |

---

## 8. FAILURE HANDLING & ERROR RESPONSES

### 8.1 HTTP Status Code Reference

| Status | Meaning | When Used |
|--------|---------|-----------|
| `200 OK` | Success | Action completed |
| `201 Created` | Resource created | Note added, message sent |
| `400 Bad Request` | Invalid input | Missing justification, invalid amounts |
| `401 Unauthorized` | Not authenticated | No valid JWT |
| `403 Forbidden` | Not permitted | Not admin, insufficient level, forbidden action |
| `404 Not Found` | Resource missing | Transaction/dispute/user not found |
| `409 Conflict` | State conflict | Wrong state, already resolved, terminal |
| `422 Unprocessable` | Business logic failure | Amounts don't balance, invalid transition |
| `500 Internal Error` | System failure | Database error, Stripe failure |
| `503 Service Unavailable` | Dependency down | Stripe unavailable |

### 8.2 Error Response Format

```json
{
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Cannot resolve dispute: transaction already completed",
    "details": {
      "current_state": "released",
      "attempted_action": "resolve_dispute_favor_buyer",
      "transaction_id": "txn_abc123",
      "dispute_id": "dsp_xyz789"
    },
    "suggestions": [
      "Transaction is already terminal",
      "Consider creating chargeback record if reversal needed"
    ]
  },
  "request_id": "req_123456789",
  "timestamp": "2026-02-05T14:30:00Z"
}
```

### 8.3 Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | Authentication required |
| `ADMIN_REQUIRED` | 403 | Admin role required |
| `LEVEL_REQUIRED` | 403 | Higher approval level needed |
| `FORBIDDEN_ACTION` | 403 | Action explicitly forbidden |
| `NOT_FOUND` | 404 | Target resource not found |
| `INVALID_STATE` | 409 | Current state doesn't allow action |
| `TERMINAL_STATE` | 409 | Cannot modify terminal state |
| `ALREADY_RESOLVED` | 409 | Dispute already resolved |
| `MISSING_JUSTIFICATION` | 400 | Justification required |
| `INVALID_AMOUNT` | 400 | Amounts don't balance |
| `STRIPE_ERROR` | 500/503 | Payment processor error |
| `DB_ERROR` | 500 | Database operation failed |

### 8.4 Logging Requirements

**Every admin action attempt MUST log:**

```json
{
  "timestamp": "2026-02-05T14:30:00Z",
  "request_id": "req_123456789",
  "action": "resolve_dispute_favor_buyer",
  "admin_id": "admin_abc123",
  "target": {
    "type": "dispute",
    "id": "dsp_xyz789"
  },
  "status": "rejected",  // or "success"
  "error_code": "TERMINAL_STATE",
  "justification_provided": true,
  "justification_length": 87,
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0..."
}
```

### 8.5 Alerting Thresholds

| Condition | Alert Level | Recipients |
|-----------|-------------|------------|
| 5+ failed actions by same admin in 1 hour | WARNING | Admin lead |
| Terminal state modification attempt | WARNING | Security team |
| 10+ actions on same target in 1 hour | WARNING | Admin lead |
| Stripe API failure | CRITICAL | Engineering |
| Database transaction failure | CRITICAL | Engineering |
| Unauthorized access attempt | CRITICAL | Security team |
| Bulk action attempt | CRITICAL | Security + Legal |

---

## 9. AUDIT LOG MAPPING

### 9.1 Action → Audit Event Mapping

| Action | Audit Event Type | Logged Fields |
|--------|-----------------|---------------|
| `resolve_dispute_favor_buyer` | `dispute_resolved` | dispute_id, resolution=buyer_wins, transaction_status_change |
| `resolve_dispute_favor_seller` | `dispute_resolved` | dispute_id, resolution=seller_wins, transaction_status_change |
| `resolve_dispute_partial` | `dispute_resolved` | dispute_id, resolution=partial, split_amounts |
| `withdraw_dispute` | `dispute_withdrawn` | dispute_id, return_state |
| `manual_refund` | `manual_refund` | transaction_id, refund_reason, amount |
| `manual_completion` | `manual_completion` | transaction_id, completion_reason |
| `freeze_account` | `account_frozen` | user_id, freeze_reason, duration |
| `unfreeze_account` | `account_unfrozen` | user_id, unfreeze_reason |
| `modify_user_role` | `role_changed` | user_id, old_role, new_role |
| `terminate_account` | `account_terminated` | user_id, termination_reason |
| `add_internal_note` | `admin_note_added` | target_type, target_id, note_preview |
| `add_dispute_message` | `dispute_message_sent` | dispute_id, message_preview |

### 9.2 Audit Log Entry Structure

```sql
INSERT INTO audit_logs (
  id,
  event_type,
  actor_id,
  actor_role,
  target_table,
  target_id,
  old_values,
  new_values,
  ip_address,
  user_agent,
  created_at
) VALUES (
  uuid_generate_v4(),
  'dispute_resolved',
  '<admin_uuid>',
  'admin',
  'disputes',
  '<dispute_uuid>',
  '{"status": "under_review"}'::jsonb,
  '{"status": "resolved", "resolution": "buyer_wins", "justification": "..."}'::jsonb,
  '<ip>',
  '<user_agent>',
  NOW()
);
```

### 9.3 Audit Log Retention

| Category | Retention | Reason |
|----------|-----------|--------|
| Transaction events | PERMANENT | Financial records |
| Dispute events | PERMANENT | Legal records |
| Account events | PERMANENT | Compliance |
| Admin actions | PERMANENT | Audit trail |
| Failed attempts | 7 years | Security |

---

## 10. APPROVAL WORKFLOW REFERENCE

### 10.1 Level 1 Actions (Standard Admin)

**Can perform immediately:**
- Resolve dispute (buyer/seller wins)
- Withdraw dispute
- Freeze account (< 30 days)
- Unfreeze account
- Add internal notes
- Add dispute messages

### 10.2 Level 2 Actions (Senior Admin)

**Requires `senior_admin = true` flag:**
- Resolve dispute (partial)
- Manual refund
- Manual completion
- Freeze account (≥ 30 days)
- Modify user role (demote admin)

### 10.3 Level 3 Actions (Compliance Review)

**Requires documented approval from Legal + Finance:**
- Promote user to admin
- Terminate account
- Regulatory freezes
- Chargeback responses

### 10.4 Approval Documentation

Level 3 actions require:
```json
{
  "compliance_ticket": "CT-2026-0042",
  "legal_review": "LR-2026-0018",  // if applicable
  "finance_approval": "FA-2026-0099",  // if financial impact
  "approvers": [
    {"name": "Jane Doe", "role": "Compliance Officer", "date": "2026-02-04"},
    {"name": "John Smith", "role": "Legal Counsel", "date": "2026-02-04"}
  ]
}
```

---

## APPENDIX A: Quick Reference Card

### Dispute Resolution

| Situation | Action | Level |
|-----------|--------|-------|
| Buyer clearly right | `resolve_dispute_favor_buyer` | 1 |
| Seller clearly right | `resolve_dispute_favor_seller` | 1 |
| Shared fault | `resolve_dispute_partial` | 2 |
| Opened in error | `withdraw_dispute` | 1 |

### Financial Overrides

| Situation | Action | Level |
|-----------|--------|-------|
| Fraud detected (pre-completion) | `manual_refund` | 2 |
| Buyer unresponsive (post-delivery) | `manual_completion` | 2 |
| Post-completion reversal needed | **Cannot** — contact Stripe for chargeback | N/A |

### Account Actions

| Situation | Action | Level |
|-----------|--------|-------|
| Suspicious activity | `freeze_account` | 1 |
| Investigation cleared | `unfreeze_account` | 1 |
| Confirmed fraud | `terminate_account` | 3 |
| New admin hire | `modify_user_role` | 3 |

---

## APPENDIX B: State Machine Compliance Matrix

| Action | From States | To State | State Machine Reference |
|--------|-------------|----------|------------------------|
| `resolve_dispute_favor_buyer` | `dispute` | `refunded` | §2.1: disputed → refunded |
| `resolve_dispute_favor_seller` | `dispute` | `released` | §2.1: disputed → completed |
| `resolve_dispute_partial` | `dispute` | `released` | §2.1: disputed → completed (partial) |
| `withdraw_dispute` | `dispute` | `in_escrow`/`delivered` | §2.1: disputed → in_escrow |
| `manual_refund` | `in_escrow`, `delivered` | `refunded` | §2.1: in_escrow → refunded (admin) |
| `manual_completion` | `delivered` | `released` | §2.1: delivered → completed |

---

**END OF ADMIN ACTION MODEL**

*This document is the canonical reference for all admin-initiated actions. Any deviation requires security review, legal review, and version update.*
