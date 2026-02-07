# ADMIN UX SAFEGUARDS — Human Error Prevention Model

**Version:** 1.0.0  
**Status:** Authoritative  
**Date:** 2026-02-05  
**Classification:** UX DESIGN SPECIFICATION  

> ⚠️ **PURPOSE**: This document defines HOW the admin UI behaves to prevent human error. Backend enforcement exists; the UI must reinforce it. Make the correct action obvious and the dangerous action hard.

---

## TABLE OF CONTENTS

1. [Core UX Principles](#1-core-ux-principles)
2. [Risk Level Classification](#2-risk-level-classification)
3. [Confirmation Flow Patterns](#3-confirmation-flow-patterns)
4. [Action-Specific UX Rules](#4-action-specific-ux-rules)
5. [Button State Matrix](#5-button-state-matrix)
6. [Error State Handling](#6-error-state-handling)
7. [Forbidden UX Patterns](#7-forbidden-ux-patterns)
8. [Visual Design Standards](#8-visual-design-standards)
9. [Accessibility Requirements](#9-accessibility-requirements)

---

## 1. CORE UX PRINCIPLES

### 1.1 The Two Modes

| Mode | Context | UX Goal |
|------|---------|---------|
| **Calm Mode** | Read-only, browsing, investigating | Efficient, fast, low friction |
| **Alert Mode** | Any mutation, any action | Deliberate, clear, high friction |

**Rule:** The UI MUST clearly signal when transitioning from Calm → Alert mode.

### 1.2 Friction Gradient

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FRICTION GRADIENT                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   LOW FRICTION                              HIGH FRICTION            │
│   ◄────────────────────────────────────────────────────────►        │
│                                                                      │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│   │  View   │  │  Note   │  │ Freeze  │  │ Refund  │  │ Termin- │  │
│   │  Data   │  │  Add    │  │ Account │  │ Funds   │  │  ate    │  │
│   └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘  │
│                                                                      │
│   No confirm   1 confirm    2 confirms   2 confirms   3 confirms    │
│                              + reason     + reason     + reason      │
│                                          + delay      + delay        │
│                                                       + witness      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Guiding Principles

| Principle | Description | Implementation |
|-----------|-------------|----------------|
| **Obvious Defaults** | Safe action should be visually prominent | Primary button = safe; Danger button = subdued |
| **Progressive Disclosure** | Dangerous options revealed only when needed | Destructive actions in expandable sections |
| **Reversibility Awareness** | User always knows if action is reversible | Clear badges: "Reversible" vs "IRREVERSIBLE" |
| **Forced Comprehension** | User must prove they understood | Type confirmation phrases |
| **No Muscle Memory** | Dangerous actions should not be memorizable | Vary button positions, add friction |
| **Audit Visibility** | User knows they're being logged | "This action will be logged" visible |

### 1.4 Information Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│  ADMIN ACTION SCREEN LAYOUT                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  1. CONTEXT PANEL (Read-Only)                                 │  │
│  │     - Transaction/Dispute summary                             │  │
│  │     - Current state badge                                     │  │
│  │     - Timeline of events                                      │  │
│  │     - Parties involved                                        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  2. EVIDENCE PANEL (Read-Only)                                │  │
│  │     - Uploaded files                                          │  │
│  │     - Message history                                         │  │
│  │     - Audit trail                                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  3. ACTION PANEL (Mutations)                     ⚠️ ALERT MODE │  │
│  │     - Available actions based on state                        │  │
│  │     - Risk level indicators                                   │  │
│  │     - Disabled actions with explanations                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. RISK LEVEL CLASSIFICATION

### 2.1 Risk Level Definitions

| Level | Color | Icon | Criteria | Friction Required |
|-------|-------|------|----------|-------------------|
| **LOW** | Gray | `ℹ️` | No financial impact, reversible, internal only | Single click |
| **MEDIUM** | Yellow | `⚠️` | User-visible impact, reversible | 1 confirmation + reason |
| **HIGH** | Orange | `🔶` | Financial impact OR irreversible | 2 confirmations + reason + delay |
| **CRITICAL** | Red | `🔴` | Financial + irreversible + user impact | 3 confirmations + type phrase + delay |

### 2.2 Action Risk Classification

| Action | Risk Level | Reversible | Financial | User Notified |
|--------|------------|------------|-----------|---------------|
| View transaction | — | — | No | No |
| View audit logs | — | — | No | No |
| Add internal note | LOW | Yes | No | No |
| Add dispute message | MEDIUM | No* | No | Yes |
| Freeze account (temp) | MEDIUM | Yes | Indirect | Yes |
| Unfreeze account | LOW | Yes | No | Yes |
| Withdraw dispute | HIGH | No | Yes | Yes |
| Resolve dispute (buyer) | CRITICAL | No | Yes | Yes |
| Resolve dispute (seller) | CRITICAL | No | Yes | Yes |
| Resolve dispute (partial) | CRITICAL | No | Yes | Yes |
| Manual refund | CRITICAL | No | Yes | Yes |
| Manual completion | CRITICAL | No | Yes | Yes |
| Freeze account (extended) | HIGH | Yes | Indirect | Yes |
| Modify user role | HIGH | Yes | No | Yes |
| Terminate account | CRITICAL | No | Indirect | Yes |

*Messages can be followed up but not edited/deleted

### 2.3 Risk Level Visual Treatment

```
┌─────────────────────────────────────────────────────────────────────┐
│  RISK LEVEL BADGES                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  LOW:      ┌──────────────────┐                                     │
│            │ ℹ️ Low Risk       │  Gray background, subtle            │
│            └──────────────────┘                                     │
│                                                                      │
│  MEDIUM:   ┌──────────────────┐                                     │
│            │ ⚠️ Medium Risk    │  Yellow background, visible         │
│            └──────────────────┘                                     │
│                                                                      │
│  HIGH:     ┌──────────────────┐                                     │
│            │ 🔶 High Risk      │  Orange background, prominent       │
│            └──────────────────┘                                     │
│                                                                      │
│  CRITICAL: ┌──────────────────┐                                     │
│            │ 🔴 CRITICAL       │  Red background, pulsing border     │
│            └──────────────────┘                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. CONFIRMATION FLOW PATTERNS

### 3.1 Pattern: Single Confirmation (LOW/MEDIUM Risk)

```
┌─────────────────────────────────────────────────────────────────────┐
│  SINGLE CONFIRMATION FLOW                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User clicks action button                                          │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │  MODAL: Confirm Action                                  │        │
│  │                                                         │        │
│  │  ⚠️ You are about to: [Action Description]              │        │
│  │                                                         │        │
│  │  This will:                                             │        │
│  │  • [Effect 1]                                           │        │
│  │  • [Effect 2]                                           │        │
│  │                                                         │        │
│  │  ┌─────────────────────────────────────────────────┐   │        │
│  │  │ Reason (required):                              │   │        │
│  │  │ [________________________________]              │   │        │
│  │  │                              Min 20 characters  │   │        │
│  │  └─────────────────────────────────────────────────┘   │        │
│  │                                                         │        │
│  │  [ Cancel ]                    [ Confirm Action ]       │        │
│  │   (primary)                      (secondary)            │        │
│  │                                                         │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**UI Rules:**
- Cancel button is PRIMARY (left, emphasized)
- Confirm button is SECONDARY (right, subdued)
- Confirm button DISABLED until reason meets minimum length
- Modal cannot be dismissed by clicking outside
- ESC key = Cancel (safe default)

---

### 3.2 Pattern: Double Confirmation (HIGH Risk)

```
┌─────────────────────────────────────────────────────────────────────┐
│  DOUBLE CONFIRMATION FLOW                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User clicks action button                                          │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │  STEP 1: Initial Warning                                │        │
│  │                                                         │        │
│  │  🔶 HIGH RISK ACTION                                    │        │
│  │                                                         │        │
│  │  You are about to: [Action Description]                 │        │
│  │                                                         │        │
│  │  ┌─────────────────────────────────────────────────┐   │        │
│  │  │ ⚠️ WARNING                                       │   │        │
│  │  │ This action [is irreversible / has financial    │   │        │
│  │  │ impact / will notify users]                     │   │        │
│  │  └─────────────────────────────────────────────────┘   │        │
│  │                                                         │        │
│  │  Affected:                                              │        │
│  │  • Transaction: TXN-ABC123 ($500.00)                   │        │
│  │  • Buyer: john@example.com                             │        │
│  │  • Seller: jane@example.com                            │        │
│  │                                                         │        │
│  │  [ Cancel ]                    [ I Understand, Continue ]│       │
│  │                                                         │        │
│  └─────────────────────────────────────────────────────────┘        │
│           │                                                          │
│           ▼ (after 3 second delay)                                  │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │  STEP 2: Justification & Final Confirm                  │        │
│  │                                                         │        │
│  │  🔶 Confirm: [Action Name]                              │        │
│  │                                                         │        │
│  │  ┌─────────────────────────────────────────────────┐   │        │
│  │  │ Justification (required):                       │   │        │
│  │  │ [                                               │   │        │
│  │  │                                                 │   │        │
│  │  │                                                 │   │        │
│  │  │ ]                            Min 50 characters  │   │        │
│  │  └─────────────────────────────────────────────────┘   │        │
│  │                                                         │        │
│  │  ☑️ I have reviewed all evidence for this case          │        │
│  │  ☑️ I understand this action will be logged             │        │
│  │                                                         │        │
│  │  [ Go Back ]                   [ Execute Action ]       │        │
│  │                                  (disabled for 5s)      │        │
│  │                                                         │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**UI Rules:**
- Step 1 → Step 2 requires 3 second wait (no skip)
- Execute button disabled for 5 seconds after Step 2 loads
- Both checkboxes REQUIRED before button enables
- Justification minimum 50 characters
- Progress indicator shows "Step 1 of 2" / "Step 2 of 2"

---

### 3.3 Pattern: Triple Confirmation with Typed Phrase (CRITICAL Risk)

```
┌─────────────────────────────────────────────────────────────────────┐
│  TRIPLE CONFIRMATION FLOW                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User clicks action button                                          │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │  STEP 1: Severity Warning                               │        │
│  │                                                         │        │
│  │  🔴 CRITICAL: IRREVERSIBLE ACTION                       │        │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │        │
│  │                                                         │        │
│  │  You are about to: RESOLVE DISPUTE - FULL REFUND        │        │
│  │                                                         │        │
│  │  ┌─────────────────────────────────────────────────┐   │        │
│  │  │ 🚨 THIS ACTION CANNOT BE UNDONE                  │   │        │
│  │  │                                                  │   │        │
│  │  │ • $500.00 will be returned to buyer              │   │        │
│  │  │ • Seller will receive $0.00                      │   │        │
│  │  │ • Transaction will be permanently closed         │   │        │
│  │  │ • Both parties will be notified immediately      │   │        │
│  │  └─────────────────────────────────────────────────┘   │        │
│  │                                                         │        │
│  │  [ Cancel - Keep Dispute Open ]     [ I Understand ]    │        │
│  │       (primary, green)               (secondary, gray)  │        │
│  │                                                         │        │
│  └─────────────────────────────────────────────────────────┘        │
│           │                                                          │
│           ▼ (after 5 second delay)                                  │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │  STEP 2: Evidence Review Attestation                    │        │
│  │                                                         │        │
│  │  Before proceeding, confirm you have reviewed:          │        │
│  │                                                         │        │
│  │  ☐ Buyer's dispute reason and evidence (3 files)        │        │
│  │  ☐ Seller's response and evidence (1 file)              │        │
│  │  ☐ Transaction timeline and payment records             │        │
│  │  ☐ Message history between parties                      │        │
│  │  ☐ Previous disputes involving these users (0 found)    │        │
│  │                                                         │        │
│  │  ┌─────────────────────────────────────────────────┐   │        │
│  │  │ Detailed Justification (required):              │   │        │
│  │  │ [                                               │   │        │
│  │  │                                                 │   │        │
│  │  │                                                 │   │        │
│  │  │                                                 │   │        │
│  │  │ ]                          Min 100 characters   │   │        │
│  │  └─────────────────────────────────────────────────┘   │        │
│  │                                                         │        │
│  │  [ Go Back ]                        [ Continue ]        │        │
│  │                                                         │        │
│  └─────────────────────────────────────────────────────────┘        │
│           │                                                          │
│           ▼ (after 5 second delay)                                  │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │  STEP 3: Final Confirmation - Type to Confirm           │        │
│  │                                                         │        │
│  │  🔴 FINAL STEP: Confirm Refund                          │        │
│  │                                                         │        │
│  │  To confirm this irreversible action, type:             │        │
│  │                                                         │        │
│  │  ┌─────────────────────────────────────────────────┐   │        │
│  │  │                                                 │   │        │
│  │  │   REFUND $500.00 TO BUYER                       │   │        │
│  │  │                                                 │   │        │
│  │  └─────────────────────────────────────────────────┘   │        │
│  │                                                         │        │
│  │  Type the phrase exactly:                               │        │
│  │  ┌─────────────────────────────────────────────────┐   │        │
│  │  │ [_________________________________________]     │   │        │
│  │  └─────────────────────────────────────────────────┘   │        │
│  │                                                         │        │
│  │  ☑️ I take responsibility for this decision             │        │
│  │                                                         │        │
│  │  This action will be logged with your identity:         │        │
│  │  Admin: admin@secureescrow.me (ID: adm_123)            │        │
│  │                                                         │        │
│  │  [ Cancel Entire Process ]      [ Execute Refund ]      │        │
│  │                                   (disabled until       │        │
│  │                                    phrase matches)      │        │
│  │                                                         │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**UI Rules:**
- 5 second delay between each step (15 seconds minimum total)
- All checkboxes in Step 2 REQUIRED
- Typed phrase must match EXACTLY (case-sensitive)
- Execute button only enables when phrase matches AND checkbox checked
- Cancel at any step returns to transaction view
- Browser back button = Cancel (with confirmation)
- Session timeout = Cancel (must restart)

---

### 3.4 Pattern: Cooldown Timer

For CRITICAL actions, implement post-click cooldown:

```
┌─────────────────────────────────────────────────────────────────────┐
│  COOLDOWN TIMER                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  After clicking "Execute Refund":                                   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │                                                         │        │
│  │           ⏳ Processing in 10 seconds...                │        │
│  │                                                         │        │
│  │           ████████░░░░░░░░░░░░  8s remaining           │        │
│  │                                                         │        │
│  │           [ Cancel Now ]                                │        │
│  │                                                         │        │
│  │  You can cancel until the timer completes.             │        │
│  │                                                         │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                      │
│  After timer completes:                                             │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │                                                         │        │
│  │           ✅ Refund Processed Successfully              │        │
│  │                                                         │        │
│  │           Transaction TXN-ABC123 has been refunded.    │        │
│  │           $500.00 will be returned to buyer within     │        │
│  │           5-10 business days.                          │        │
│  │                                                         │        │
│  │           Audit Log ID: AUD-789XYZ                     │        │
│  │                                                         │        │
│  │           [ View Transaction ]  [ Back to Dashboard ]   │        │
│  │                                                         │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Cooldown Durations:**
| Risk Level | Cooldown |
|------------|----------|
| HIGH | 5 seconds |
| CRITICAL | 10 seconds |

---

## 4. ACTION-SPECIFIC UX RULES

### 4.1 Dispute Resolution: Favor Buyer (Full Refund)

| Property | Value |
|----------|-------|
| **Risk Level** | 🔴 CRITICAL |
| **Confirmation Pattern** | Triple + Typed Phrase |
| **Cooldown** | 10 seconds |
| **Minimum Justification** | 100 characters |
| **Required Checkboxes** | Evidence reviewed (5), Responsibility |
| **Typed Phrase** | `REFUND $[amount] TO BUYER` |

**Warning Text:**
```
🚨 IRREVERSIBLE ACTION

You are about to refund $500.00 to the buyer.

This will:
• Return all funds to buyer's original payment method
• Seller will receive nothing from this transaction
• Transaction will be permanently marked as "Refunded"
• Both parties will be notified immediately
• This decision CANNOT be reversed

Refund processing takes 5-10 business days via Stripe.
```

**Button States:**
- Before confirmation: `Resolve: Refund to Buyer` (red outline, not filled)
- During confirmation: Steps 1-3 as shown above
- After success: Button hidden, status badge shown

---

### 4.2 Dispute Resolution: Favor Seller (Release Funds)

| Property | Value |
|----------|-------|
| **Risk Level** | 🔴 CRITICAL |
| **Confirmation Pattern** | Triple + Typed Phrase |
| **Cooldown** | 10 seconds |
| **Minimum Justification** | 100 characters |
| **Required Checkboxes** | Evidence reviewed (5), Responsibility |
| **Typed Phrase** | `RELEASE $[amount] TO SELLER` |

**Warning Text:**
```
🚨 IRREVERSIBLE ACTION

You are about to release $485.00 to the seller.
(Original: $500.00, Platform Fee: $15.00)

This will:
• Transfer funds to seller's connected account
• Buyer will NOT receive a refund
• Transaction will be permanently marked as "Completed"
• Both parties will be notified immediately
• This decision CANNOT be reversed

Payout processing takes 2-3 business days via Stripe.
```

---

### 4.3 Dispute Resolution: Partial Split

| Property | Value |
|----------|-------|
| **Risk Level** | 🔴 CRITICAL |
| **Confirmation Pattern** | Triple + Typed Phrase |
| **Cooldown** | 10 seconds |
| **Minimum Justification** | 150 characters (extra for rationale) |
| **Required Checkboxes** | Evidence reviewed (5), Split rationale, Responsibility |
| **Typed Phrase** | `SPLIT $[total]: $[buyer_amount] BUYER / $[seller_amount] SELLER` |
| **Additional Requirement** | Amounts must sum correctly (validated in real-time) |

**Additional UI Element:**
```
┌─────────────────────────────────────────────────────────────────┐
│  SPLIT CALCULATOR                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Total in Escrow: $500.00                                       │
│                                                                  │
│  Buyer Receives:  $[  300.00  ]  ────────────●────── 60%        │
│  Seller Receives: $[  200.00  ]  ──────●────────────  40%       │
│                                                                  │
│  ✓ Amounts balance correctly                                    │
│                                                                  │
│  Platform Fee: $15.00 (deducted from seller portion)            │
│  Seller Net:   $185.00                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4.4 Manual Refund (Non-Dispute)

| Property | Value |
|----------|-------|
| **Risk Level** | 🔴 CRITICAL |
| **Confirmation Pattern** | Triple + Typed Phrase |
| **Cooldown** | 10 seconds |
| **Minimum Justification** | 100 characters |
| **Required Fields** | Refund reason (dropdown), Evidence reference |
| **Typed Phrase** | `REFUND $[amount] - [REASON_CODE]` |

**Refund Reason Dropdown:**
- `FRAUD_PREVENTION` - Fraud detected
- `POLICY_VIOLATION` - Seller policy violation
- `SELLER_REQUEST` - Seller requested cancellation
- `BUYER_REQUEST_APPROVED` - Buyer request approved
- `PLATFORM_ERROR` - Platform error compensation

**Warning Text (varies by reason):**
```
🚨 ADMINISTRATIVE REFUND

You are initiating a refund OUTSIDE the dispute process.

Reason: Fraud Prevention
Transaction: TXN-ABC123

This will:
• Return $500.00 to buyer immediately
• Mark transaction as "Refunded"
• Seller will be notified of administrative action
• This will appear in the seller's account history
• Action is logged for compliance review

⚠️ Seller was not given opportunity to dispute.
   Ensure this is justified and documented.
```

---

### 4.5 Manual Completion (Force Release)

| Property | Value |
|----------|-------|
| **Risk Level** | 🔴 CRITICAL |
| **Confirmation Pattern** | Triple + Typed Phrase |
| **Cooldown** | 10 seconds |
| **Minimum Justification** | 75 characters |
| **Required Fields** | Completion reason, Buyer contact attempts |
| **Typed Phrase** | `COMPLETE TXN-[ID] RELEASE TO SELLER` |

**Pre-check Display:**
```
┌─────────────────────────────────────────────────────────────────┐
│  PRE-COMPLETION CHECKS                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✅ Delivery marked: 14 days ago                                │
│  ✅ Inspection period: EXPIRED (11 days ago)                    │
│  ✅ No active dispute                                           │
│  ⚠️ Buyer last active: 12 days ago                              │
│  ✅ Seller tracking provided: Yes                               │
│                                                                  │
│  Buyer Contact Attempts (required):                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ How many times did support contact the buyer?              │ │
│  │ [ 3 ▼]  Email: 2  Phone: 1  In-App: 0                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4.6 Freeze Account

| Property | Value |
|----------|-------|
| **Risk Level (< 30 days)** | ⚠️ MEDIUM |
| **Risk Level (≥ 30 days)** | 🔶 HIGH |
| **Confirmation Pattern** | Double (temp) / Triple (extended) |
| **Cooldown** | 5 seconds |
| **Minimum Justification** | 50 characters |
| **Required Fields** | Freeze reason, Duration, Review date |

**Duration Selector:**
```
┌─────────────────────────────────────────────────────────────────┐
│  FREEZE DURATION                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ○ 24 hours    - Minor violation investigation                  │
│  ○ 7 days      - Standard investigation period                  │
│  ○ 14 days     - Extended investigation                         │
│  ● 30 days     - Serious violation (requires Level 2)           │
│  ○ 90 days     - Regulatory hold (requires Level 2)             │
│  ○ Indefinite  - Until manual review (requires Level 2)         │
│                                                                  │
│  Auto-unfreeze date: March 7, 2026                              │
│  Review reminder will be sent to you on: March 5, 2026          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Impact Warning:**
```
⚠️ ACCOUNT FREEZE IMPACT

User: john@example.com

Current Activity:
• 2 transactions in escrow (total: $1,250.00)
• 0 pending payouts
• Last login: 2 hours ago

Freeze will:
• Block new transaction creation
• Block accepting seller invitations
• Allow existing transactions to complete normally
• User CAN still log in and view history
• User WILL be notified via email
```

---

### 4.7 Unfreeze Account

| Property | Value |
|----------|-------|
| **Risk Level** | ℹ️ LOW |
| **Confirmation Pattern** | Single |
| **Cooldown** | None |
| **Minimum Justification** | 30 characters |

**Simple Confirmation:**
```
┌─────────────────────────────────────────────────────────────────┐
│  UNFREEZE ACCOUNT                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User: john@example.com                                         │
│  Frozen since: February 1, 2026 (4 days)                        │
│  Frozen by: admin@secureescrow.me                               │
│  Reason: Fraud investigation                                    │
│                                                                  │
│  Unfreeze reason:                                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ [Investigation complete, no violation found_____________] │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [ Cancel ]                              [ Unfreeze Account ]   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4.8 Add Internal Note

| Property | Value |
|----------|-------|
| **Risk Level** | ℹ️ LOW |
| **Confirmation Pattern** | None (inline save) |
| **Cooldown** | None |
| **Minimum Length** | 10 characters |

**Inline UI:**
```
┌─────────────────────────────────────────────────────────────────┐
│  INTERNAL NOTES (Admin Only - Not Visible to Users)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Add note...                                                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                              [ Save Note ]       │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  📝 Feb 5, 2026 2:30 PM - admin@secureescrow.me                 │
│     Contacted seller via phone. Confirmed shipping delay due    │
│     to carrier backlog. Expected delivery by Feb 8.             │
│                                                                  │
│  📝 Feb 3, 2026 10:15 AM - admin@secureescrow.me                │
│     Buyer reported non-delivery. Opened investigation.          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4.9 Terminate Account

| Property | Value |
|----------|-------|
| **Risk Level** | 🔴 CRITICAL |
| **Confirmation Pattern** | Triple + Typed Phrase + Compliance Reference |
| **Cooldown** | 15 seconds |
| **Minimum Justification** | 150 characters |
| **Required Fields** | Compliance ticket, Legal review (if applicable), Termination reason |
| **Typed Phrase** | `TERMINATE ACCOUNT [email]` |
| **Approval Level** | Level 3 (must be pre-approved) |

**Pre-termination Checklist:**
```
┌─────────────────────────────────────────────────────────────────┐
│  🔴 ACCOUNT TERMINATION CHECKLIST                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User: fraudster@example.com                                    │
│                                                                  │
│  ☐ No active transactions in escrow                             │
│    ❌ BLOCKED: User has 1 transaction in escrow ($750.00)       │
│       → Must resolve or refund before termination               │
│                                                                  │
│  ☐ No pending payouts                                           │
│    ✅ CLEAR: No pending payouts                                 │
│                                                                  │
│  ☐ Compliance ticket approved                                   │
│    ┌──────────────────────────────────────────────────────────┐ │
│    │ Compliance Ticket #: [CT-2026-____]                      │ │
│    └──────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ☐ Legal review completed (if required)                         │
│    ○ Not required  ● Required                                   │
│    ┌──────────────────────────────────────────────────────────┐ │
│    │ Legal Reference #: [LR-2026-____]                        │ │
│    └──────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [ Cannot Proceed - Active Transactions ]                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. BUTTON STATE MATRIX

### 5.1 Transaction State → Button Visibility

| Button | draft | awaiting_payment | in_escrow | delivered | dispute | released | refunded | cancelled |
|--------|-------|------------------|-----------|-----------|---------|----------|----------|-----------|
| View Details | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Add Note | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manual Refund | 🚫 | 🚫 | ✅ | ✅ | 🚫¹ | 🚫 | 🚫 | 🚫 |
| Manual Complete | 🚫 | 🚫 | 🚫 | ✅² | 🚫 | 🚫 | 🚫 | 🚫 |
| Resolve → Buyer | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | 🚫 | 🚫 | 🚫 |
| Resolve → Seller | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | 🚫 | 🚫 | 🚫 |
| Resolve → Partial | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | 🚫 | 🚫 | 🚫 |
| Withdraw Dispute | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | 🚫 | 🚫 | 🚫 |

**Legend:**
- ✅ = Enabled and visible
- 🚫 = Hidden (not shown at all)
- ¹ = Must use dispute resolution for disputed transactions
- ² = Only if inspection period expired AND no dispute

### 5.2 Disabled Button Explanations

When a button is visible but disabled, ALWAYS show explanation:

```
┌─────────────────────────────────────────────────────────────────┐
│  DISABLED BUTTON EXAMPLES                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  [ Manual Complete ]  (disabled)                           │ │
│  │                                                            │ │
│  │  ⓘ Cannot complete: Inspection period still active        │ │
│  │    Expires in: 2 days, 4 hours                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  [ Resolve Dispute ]  (disabled)                           │ │
│  │                                                            │ │
│  │  ⓘ Cannot resolve: Transaction not in dispute state       │ │
│  │    Current state: In Escrow                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  [ Terminate Account ]  (disabled)                         │ │
│  │                                                            │ │
│  │  ⓘ Cannot terminate: User has active transactions         │ │
│  │    In escrow: 2 ($1,500.00)                               │ │
│  │    Resolve or refund these first.                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Button Visual Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│  BUTTON STYLING BY ACTION TYPE                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SAFE ACTIONS (Cancel, Go Back, View):                          │
│  ┌─────────────────────┐                                        │
│  │      Cancel         │  Primary style (filled, prominent)     │
│  └─────────────────────┘                                        │
│                                                                  │
│  NEUTRAL ACTIONS (Add Note, Send Message):                      │
│  ┌─────────────────────┐                                        │
│  │    Add Note         │  Secondary style (outline)             │
│  └─────────────────────┘                                        │
│                                                                  │
│  MODERATE RISK (Freeze, Unfreeze):                              │
│  ┌─────────────────────┐                                        │
│  │  ⚠️ Freeze Account  │  Warning style (yellow/orange outline) │
│  └─────────────────────┘                                        │
│                                                                  │
│  DANGEROUS ACTIONS (Refund, Complete, Resolve):                 │
│  ┌─────────────────────┐                                        │
│  │  🔴 Issue Refund    │  Danger style (red outline, NOT filled)│
│  └─────────────────────┘                                        │
│                                                                  │
│  ⚠️ NEVER use filled red buttons for destructive actions.       │
│     Outline only - reduces accidental clicks.                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Button Position Rules

| Rule | Rationale |
|------|-----------|
| Safe action (Cancel) = LEFT | Eye tracks left-to-right; safe option seen first |
| Dangerous action = RIGHT | Requires deliberate mouse movement |
| In confirmation modals, swap positions randomly | Prevents muscle memory |
| Never stack vertically with danger on top | Prevents accidental clicks |

---

## 6. ERROR STATE HANDLING

### 6.1 Error Display Patterns

**403 Forbidden:**
```
┌─────────────────────────────────────────────────────────────────┐
│  🚫 ACTION NOT PERMITTED                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  You don't have permission to perform this action.              │
│                                                                  │
│  Reason: This action requires Senior Admin approval             │
│                                                                  │
│  Your role: Standard Admin                                      │
│  Required: Senior Admin (Level 2)                               │
│                                                                  │
│  What you can do:                                               │
│  • Request approval from a Senior Admin                         │
│  • Document your justification in the ticket                    │
│                                                                  │
│  [ Close ]                        [ Request Approval ]          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**409 Conflict:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ STATE CONFLICT                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  This action cannot be completed because the transaction        │
│  state has changed.                                             │
│                                                                  │
│  Expected state: Dispute (under_review)                         │
│  Current state:  Released (completed)                           │
│                                                                  │
│  This may have happened because:                                │
│  • Another admin resolved this dispute                          │
│  • The system auto-completed the transaction                    │
│  • The dispute was withdrawn                                    │
│                                                                  │
│  [ Refresh and Review ]                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**422 Validation Error:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ❌ VALIDATION ERROR                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Your input could not be processed:                             │
│                                                                  │
│  • Justification: Must be at least 100 characters               │
│    (currently 67 characters)                                    │
│                                                                  │
│  • Split amounts: Must equal total escrow amount                │
│    Buyer: $300.00 + Seller: $150.00 = $450.00                  │
│    Expected: $500.00                                            │
│                                                                  │
│  [ Fix and Retry ]                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**500 Internal Error:**
```
┌─────────────────────────────────────────────────────────────────┐
│  🔴 SYSTEM ERROR                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  An unexpected error occurred. Your action was NOT completed.   │
│                                                                  │
│  ⚠️ IMPORTANT: Do not retry immediately.                        │
│                                                                  │
│  Error Reference: ERR-2026-0205-143022-ABC                      │
│                                                                  │
│  What happened:                                                 │
│  The system encountered an error while processing your request. │
│  No changes were made to the transaction.                       │
│                                                                  │
│  What to do:                                                    │
│  1. Wait 30 seconds before retrying                             │
│  2. Refresh the page to see current state                       │
│  3. If error persists, contact engineering with the reference   │
│                                                                  │
│  [ Copy Error Reference ]              [ Refresh Page ]         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**503 Service Unavailable (Stripe Down):**
```
┌─────────────────────────────────────────────────────────────────┐
│  ⏳ PAYMENT SERVICE UNAVAILABLE                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  The payment processor (Stripe) is temporarily unavailable.     │
│                                                                  │
│  Your action: Issue Refund ($500.00)                            │
│  Status: QUEUED - Will process automatically when available     │
│                                                                  │
│  ⚠️ Do NOT retry this action manually.                          │
│                                                                  │
│  The system will:                                               │
│  • Automatically retry every 5 minutes                          │
│  • Notify you when the refund is processed                      │
│  • Mark the transaction after successful processing             │
│                                                                  │
│  Queue Reference: Q-2026-0205-143022                            │
│  Estimated processing: Within 1 hour                            │
│                                                                  │
│  [ View Queue Status ]                 [ Close ]                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Idempotent Retry Handling

**Already Completed (200 OK - Idempotent):**
```
┌─────────────────────────────────────────────────────────────────┐
│  ℹ️ ACTION ALREADY COMPLETED                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  This action has already been performed.                        │
│                                                                  │
│  Dispute Resolution: Refund to Buyer                            │
│  Completed by: admin@secureescrow.me                            │
│  Completed at: Feb 5, 2026 2:28 PM (2 minutes ago)             │
│                                                                  │
│  No duplicate action was taken.                                 │
│                                                                  │
│  [ View Transaction ]                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Loading & Processing States

```
┌─────────────────────────────────────────────────────────────────┐
│  LOADING STATES                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SUBMITTING:                                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  [ ◐ Processing Refund... ]  (button disabled, spinning)  │ │
│  │                                                            │ │
│  │  ⚠️ Do not close this window or navigate away             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  PROCESSING (with progress):                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Processing Refund                                         │ │
│  │  ████████████░░░░░░░░░░░░░░░░░  Step 2 of 3               │ │
│  │                                                            │ │
│  │  ✓ Validating request                                     │ │
│  │  ◐ Contacting payment processor...                        │ │
│  │  ○ Updating transaction record                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  PAGE NAVIGATION BLOCKED:                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  ⚠️ Action in Progress                                     │ │
│  │                                                            │ │
│  │  A critical action is being processed.                    │ │
│  │  Leaving this page may cause issues.                      │ │
│  │                                                            │ │
│  │  [ Stay on Page ]              [ Leave Anyway ]           │ │
│  │    (recommended)                  (not recommended)        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. FORBIDDEN UX PATTERNS

### 7.1 Absolutely Forbidden

| Pattern | Why Forbidden | Required Alternative |
|---------|---------------|---------------------|
| **One-click destructive action** | No confirmation = accidents | Minimum single confirmation modal |
| **Bulk irreversible actions** | Multiplied error impact | Individual review required |
| **Silent failures** | User doesn't know state | Always show error feedback |
| **Auto-submit on Enter** | Accidental submission | Require button click |
| **Filled red "Delete" buttons** | Too easy to click | Outline style only |
| **Danger button on left** | Conflicts with safe-left pattern | Always right side |
| **Timeout auto-confirm** | Forces action under pressure | User must actively confirm |
| **Hidden confirmation skips** | Power users bypass safety | No skip options |
| **Keyboard shortcuts for danger** | Muscle memory accidents | Mouse-only for critical |
| **Mobile swipe-to-delete** | Too easy on touch | Tap + confirm only |

### 7.2 Forbidden Flows

**❌ FORBIDDEN: Direct Delete**
```
User clicks "Refund" → Funds immediately returned
```

**✅ REQUIRED: Confirmed Delete**
```
User clicks "Refund" → Warning modal → Justification → Confirm → Cooldown → Execute
```

---

**❌ FORBIDDEN: Bulk Selection + Single Action**
```
☑️ Transaction 1 ($500)
☑️ Transaction 2 ($750)
☑️ Transaction 3 ($300)

[ Refund All Selected ]  ← FORBIDDEN
```

**✅ REQUIRED: Individual Processing**
```
Transactions requiring attention:

Transaction 1 ($500) - [ Review & Refund ]
Transaction 2 ($750) - [ Review & Refund ]  
Transaction 3 ($300) - [ Review & Refund ]

Each requires individual confirmation flow.
```

---

**❌ FORBIDDEN: Silent State Change**
```
Refund processed.  ← No indication of what happened
```

**✅ REQUIRED: Explicit Feedback**
```
✅ Refund Successful

Transaction: TXN-ABC123
Amount: $500.00
Recipient: john@example.com
Audit Log: AUD-789XYZ
Estimated arrival: 5-10 business days

Both parties have been notified.
```

---

### 7.3 Forbidden Shortcuts

| Shortcut | Status | Reason |
|----------|--------|--------|
| `Ctrl+Enter` to submit | ❌ Forbidden | Accidental submission |
| `Y` to confirm | ❌ Forbidden | Too easy |
| Double-click to confirm | ❌ Forbidden | Accidental double-click |
| `Esc` to confirm | ❌ Forbidden | Wrong semantic |
| `Esc` to cancel | ✅ Allowed | Safe default |
| `Tab` + `Enter` | ⚠️ Prevented | Focus trap in modals |

---

## 8. VISUAL DESIGN STANDARDS

### 8.1 Color Coding

| Context | Color | Hex | Usage |
|---------|-------|-----|-------|
| Safe / Confirm Cancel | Green | `#22C55E` | Cancel buttons, success states |
| Neutral / Info | Blue | `#3B82F6` | View, Info, Secondary actions |
| Warning / Caution | Yellow/Amber | `#F59E0B` | Medium risk, attention needed |
| Danger / Critical | Red | `#EF4444` | High/Critical risk actions |
| Disabled | Gray | `#9CA3AF` | Unavailable actions |
| Terminal State | Purple | `#8B5CF6` | Completed, Refunded, Cancelled |

### 8.2 Typography for Warnings

```css
/* Warning Text Styles */
.warning-critical {
  font-weight: 700;
  font-size: 1.125rem;
  color: #DC2626;  /* red-600 */
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.warning-detail {
  font-weight: 400;
  font-size: 0.875rem;
  color: #6B7280;  /* gray-500 */
  line-height: 1.5;
}

.irreversible-badge {
  background: #FEE2E2;  /* red-100 */
  color: #991B1B;        /* red-800 */
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 600;
  font-size: 0.75rem;
}
```

### 8.3 Animation Guidelines

| Animation | Usage | Duration |
|-----------|-------|----------|
| Modal fade-in | All confirmation modals | 200ms |
| Button disable pulse | During cooldown | 1s loop |
| Progress bar | Multi-step processing | Continuous |
| Shake on error | Invalid input | 300ms |
| Border pulse (critical) | Critical risk badge | 2s loop |

**❌ Forbidden Animations:**
- Auto-dismissing success toasts for critical actions (must require click)
- Instant transitions (always have slight delay for comprehension)
- Distracting animations during confirmation (focus on content)

### 8.4 Iconography

| Icon | Meaning | Usage |
|------|---------|-------|
| `ℹ️` / `Info` | Low risk, informational | Notes, view actions |
| `⚠️` / `AlertTriangle` | Medium risk, caution | Freeze, moderate changes |
| `🔶` / `AlertOctagon` | High risk, significant | Role changes, extended freeze |
| `🔴` / `XCircle` | Critical risk, irreversible | Refunds, completions, termination |
| `✅` / `CheckCircle` | Success | Action completed |
| `❌` / `XCircle` | Error/Forbidden | Failed action, blocked |
| `🔒` / `Lock` | Locked/Immutable | Terminal states |
| `⏳` / `Clock` | Processing/Waiting | Cooldown, loading |

---

## 9. ACCESSIBILITY REQUIREMENTS

### 9.1 Keyboard Navigation

| Context | Behavior |
|---------|----------|
| Modal open | Focus trapped within modal |
| Tab order | Safe option first, danger last |
| Escape key | Always = Cancel (safe) |
| Enter key | Activates focused button only (no auto-submit) |

### 9.2 Screen Reader Announcements

```html
<!-- Risk Level Announcement -->
<span role="alert" aria-live="assertive">
  Warning: This is a critical risk action that cannot be undone.
</span>

<!-- Countdown Announcement -->
<span role="timer" aria-live="polite">
  Action will be available in 5 seconds.
</span>

<!-- Error Announcement -->
<span role="alert" aria-live="assertive">
  Error: Action failed. Transaction state has changed.
</span>
```

### 9.3 ARIA Labels

```html
<!-- Danger Button -->
<button 
  aria-label="Issue refund of $500 to buyer - this action is irreversible"
  aria-describedby="refund-warning"
>
  Issue Refund
</button>
<span id="refund-warning" class="sr-only">
  This will permanently refund $500.00 to the buyer. 
  The seller will receive nothing. This cannot be undone.
</span>

<!-- Disabled Button -->
<button 
  disabled
  aria-disabled="true"
  aria-describedby="disable-reason"
>
  Manual Complete
</button>
<span id="disable-reason">
  Disabled: Inspection period still active. Expires in 2 days.
</span>
```

### 9.4 Color Contrast

All text must meet WCAG 2.1 AA standards:
- Normal text: 4.5:1 contrast ratio minimum
- Large text (18pt+): 3:1 contrast ratio minimum
- UI components: 3:1 contrast ratio minimum

**❌ Do not rely on color alone** — always pair with icons and text.

---

## APPENDIX A: Complete Confirmation Flow Reference

| Action | Risk | Steps | Delay | Justification | Typed Phrase |
|--------|------|-------|-------|---------------|--------------|
| Add Note | LOW | 0 | 0s | 10 chars | — |
| Unfreeze | LOW | 1 | 0s | 30 chars | — |
| Add Message | MEDIUM | 1 | 0s | 20 chars | — |
| Freeze (temp) | MEDIUM | 2 | 3s | 50 chars | — |
| Freeze (extended) | HIGH | 2 | 5s | 75 chars | — |
| Withdraw Dispute | HIGH | 2 | 5s | 50 chars | — |
| Modify Role | HIGH | 2 | 5s | 50 chars | — |
| Resolve → Buyer | CRITICAL | 3 | 10s | 100 chars | ✅ |
| Resolve → Seller | CRITICAL | 3 | 10s | 100 chars | ✅ |
| Resolve → Partial | CRITICAL | 3 | 10s | 150 chars | ✅ |
| Manual Refund | CRITICAL | 3 | 10s | 100 chars | ✅ |
| Manual Complete | CRITICAL | 3 | 10s | 75 chars | ✅ |
| Terminate | CRITICAL | 3 | 15s | 150 chars | ✅ |

---

## APPENDIX B: Implementation Checklist

### Per-Action Checklist

For each admin action, verify:

- [ ] Risk level badge displayed
- [ ] Correct confirmation pattern implemented
- [ ] Justification field with minimum length validation
- [ ] Cooldown timer (if required)
- [ ] Typed phrase (if CRITICAL)
- [ ] Cancel button is PRIMARY (left, prominent)
- [ ] Confirm button is SECONDARY (right, subdued)
- [ ] Disabled state shows explanation
- [ ] Success feedback is explicit
- [ ] Error feedback is actionable
- [ ] Audit log reference shown on success
- [ ] Loading state prevents double-submit
- [ ] Browser back/close is blocked during processing

### Page-Level Checklist

For each admin page, verify:

- [ ] Read-only sections clearly separated from action sections
- [ ] Context displayed before actions
- [ ] All buttons follow visual hierarchy
- [ ] Keyboard navigation is safe (Esc = Cancel)
- [ ] Screen reader announcements for state changes
- [ ] Color is not the only indicator
- [ ] No one-click destructive actions exist
- [ ] No bulk irreversible actions exist

---

**END OF ADMIN UX SAFEGUARDS**

*This document governs all admin interface behavior. Deviations require UX review and security approval.*
