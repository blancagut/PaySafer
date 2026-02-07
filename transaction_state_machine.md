# Transaction State Machine — Authoritative Specification

**Version:** 1.0.0  
**Status:** Immutable  
**Purpose:** Single source of truth for all transaction state logic  

---

## 1. Transaction States (Final)

### 1.1 Non-Terminal States

| State | Semantic Meaning | Can Transition |
|-------|-----------------|----------------|
| `draft` | Transaction created but not yet paid by buyer | Yes |
| `awaiting_payment` | Buyer initiated checkout, payment gateway session active | Yes |
| `payment_confirmed` | Payment successful, funds captured, not yet in escrow | Yes |
| `in_escrow` | Funds held in platform escrow, awaiting seller delivery | Yes |
| `delivery_submitted` | Seller marked delivery complete, awaiting buyer confirmation | Yes |
| `disputed` | Either party raised a dispute, all transitions frozen except admin resolution | Yes |

### 1.2 Terminal States

| State | Semantic Meaning | Reversible |
|-------|-----------------|-----------|
| `completed` | Funds released to seller, transaction successful | **No** |
| `refunded` | Funds returned to buyer, transaction cancelled | **No** |
| `cancelled` | Transaction cancelled before payment or after payment failure | **No** |

### 1.3 State Characteristics

**`draft`**
- Initial state when transaction is created
- No payment attempted
- Can be edited by creator
- Auto-expires after 7 days (system policy)

**`awaiting_payment`**
- Payment gateway session initialized
- Buyer redirected to Stripe checkout
- Timeout: 30 minutes (Stripe session expiry)

**`payment_confirmed`**
- Payment captured by gateway
- Funds not yet transferred to escrow account
- Brief transitional state (seconds to minutes)
- Platform liability begins here

**`in_escrow`**
- Funds held in platform escrow account
- Neither party can access funds
- Seller can now begin delivery
- Buyer cannot cancel without mutual agreement or dispute

**`delivery_submitted`**
- Seller claims delivery is complete
- Buyer has inspection period (default: 3 days)
- Auto-confirms after inspection period if no action
- Buyer can accept or dispute

**`disputed`**
- Freeze state: no automatic transitions allowed
- Only admin can resolve
- Evidence collection phase
- SLA: 7 business days for resolution

**`completed`**
- Funds released to seller account
- Transaction closed successfully
- Platform fee deducted
- Irreversible

**`refunded`**
- Funds returned to buyer's original payment method
- Transaction closed with reversal
- Seller receives nothing
- Irreversible

**`cancelled`**
- Transaction terminated before completion
- No funds transferred (or already refunded)
- Can occur due to: non-payment, mutual agreement, policy violation
- Irreversible

---

## 2. Allowed State Transitions

### 2.1 Transition Table

| From State | To State | Trigger Actor | Conditions | Notes |
|-----------|----------|---------------|------------|-------|
| `draft` | `awaiting_payment` | Buyer | Transaction details finalized | Buyer clicks "Proceed to Payment" |
| `draft` | `cancelled` | Buyer/Seller | Mutual agreement OR creator action | No payment made yet |
| `draft` | `cancelled` | System | Auto-expiry after 7 days | Cleanup policy |
| `awaiting_payment` | `payment_confirmed` | System | Payment gateway webhook confirms success | Stripe webhook received |
| `awaiting_payment` | `cancelled` | System | Payment failed OR session expired | Timeout or payment error |
| `awaiting_payment` | `cancelled` | Buyer | User cancels payment | Before payment submission |
| `payment_confirmed` | `in_escrow` | System | Funds transferred to escrow account | Automatic, immediate |
| `in_escrow` | `delivery_submitted` | Seller | Seller marks delivery complete | Seller action required |
| `in_escrow` | `refunded` | Admin | Seller never delivers OR fraud detected | Admin resolution |
| `in_escrow` | `disputed` | Buyer | Buyer raises dispute | Dispute button |
| `in_escrow` | `refunded` | Buyer + Seller | Both parties agree to cancel | Mutual cancellation |
| `delivery_submitted` | `completed` | Buyer | Buyer confirms receipt and satisfaction | Buyer approval |
| `delivery_submitted` | `completed` | System | Auto-confirmation after 3 days | Inspection period expires |
| `delivery_submitted` | `disputed` | Buyer | Buyer not satisfied with delivery | Dispute raised |
| `disputed` | `completed` | Admin | Admin rules in favor of seller | Evidence reviewed |
| `disputed` | `refunded` | Admin | Admin rules in favor of buyer | Evidence reviewed |
| `disputed` | `in_escrow` | Admin | Dispute withdrawn, transaction continues | Rare case |

### 2.2 Explicitly Forbidden Transitions

**The following transitions are ILLEGAL and MUST be rejected:**

| From | To | Reason |
|------|-----|--------|
| Any terminal state | Any state | Terminal states are immutable |
| `completed` | `refunded` | Funds already released; cannot reverse |
| `refunded` | `completed` | Funds already returned; cannot reverse |
| `cancelled` | Any non-terminal | Transaction closed, cannot reopen |
| `draft` | `payment_confirmed` | Must pass through `awaiting_payment` |
| `draft` | `in_escrow` | Payment required first |
| `awaiting_payment` | `in_escrow` | Must confirm payment first |
| `in_escrow` | `cancelled` | Funds in escrow; requires resolution |
| `in_escrow` | `completed` | Must pass through `delivery_submitted` |
| `delivery_submitted` | `cancelled` | Must resolve via completion or refund |
| `disputed` | `cancelled` | Dispute must be resolved first |
| Any state | `draft` | Cannot regress to draft |
| `payment_confirmed` | `draft` | Cannot reverse payment confirmation |
| `payment_confirmed` | `cancelled` | Must proceed to escrow or refund |

### 2.3 Shortcut Prevention

**No shortcuts allowed.** Every transaction must follow the full state path:

**Happy Path (Successful Transaction):**
```
draft → awaiting_payment → payment_confirmed → in_escrow → 
delivery_submitted → completed
```

**Cancellation Path (Before Escrow):**
```
draft → cancelled
OR
draft → awaiting_payment → cancelled
```

**Refund Path (After Escrow):**
```
... → in_escrow → disputed → refunded
OR
... → delivery_submitted → disputed → refunded
```

---

## 3. Terminal States

### 3.1 Definition

A **terminal state** is a state from which no further transitions are possible. Once reached, the transaction record becomes immutable (except for metadata like notes or timestamps).

### 3.2 Terminal States List

1. **`completed`**
   - **Why Terminal:** Funds have been released to seller's external account
   - **Irreversibility Reason:** Payment processors cannot recall funds after settlement
   - **Financial Reality:** Seller has withdrawn funds; platform has no custody
   - **Legal Reality:** Contract fulfilled, consideration exchanged

2. **`refunded`**
   - **Why Terminal:** Funds have been returned to buyer's original payment method
   - **Irreversibility Reason:** Refund processed through payment gateway
   - **Financial Reality:** Buyer's account credited; escrow empty
   - **Legal Reality:** Contract cancelled, consideration returned

3. **`cancelled`**
   - **Why Terminal:** Transaction closed without fund movement (or after refund)
   - **Irreversibility Reason:** No funds in escrow; no pending obligations
   - **Business Reality:** Transaction abandoned or failed
   - **System Reality:** Resources deallocated; no pending work

### 3.3 Enforcement

- Database constraints MUST prevent any updates to `state` column when current state is terminal
- Application code MUST check state before accepting any transition request
- API endpoints MUST return `HTTP 409 Conflict` if terminal state transition is attempted
- Audit logs MUST record all attempted transitions (including rejected ones)

### 3.4 Why Reversal is Forbidden

**Financial Integrity:**
- Funds have physically moved outside platform control
- Payment processors charge fees for reversals
- Fraud risk: double-payment or double-refund

**Audit & Compliance:**
- Financial records must be immutable for accounting
- Regulatory requirements (AML, tax reporting)
- Legal disputes require frozen records

**System Consistency:**
- Terminal states allow database archival
- Analytics and reporting depend on immutability
- Webhook consumers expect finality

**User Trust:**
- Sellers expect funds released = transaction done
- Buyers expect refunds = money returned permanently
- Uncertainty destroys platform trust

---

## 4. Invariants (Must Never Break)

### 4.1 Financial Invariants

1. **Escrow Custody Invariant**
   ```
   IF state IN (in_escrow, delivery_submitted, disputed) 
   THEN funds MUST be in platform escrow account
   ```

2. **Single Disbursement Invariant**
   ```
   A transaction's funds can be released EXACTLY ONCE
   (either to seller via `completed` OR to buyer via `refunded`)
   ```

3. **Payment Before Escrow Invariant**
   ```
   state = in_escrow IMPLIES payment_confirmed_at IS NOT NULL
   ```

4. **Zero-Sum Invariant**
   ```
   transaction_amount = funds_to_seller + funds_to_buyer + platform_fee
   (where funds_to_seller XOR funds_to_buyer = transaction_amount - platform_fee)
   ```

### 4.2 State Machine Invariants

5. **Terminal Immutability Invariant**
   ```
   IF state IN (completed, refunded, cancelled) 
   THEN state CANNOT change
   ```

6. **Dispute Freeze Invariant**
   ```
   IF state = disputed 
   THEN ONLY admin can transition AND only to (completed OR refunded OR in_escrow)
   ```

7. **Forward Progress Invariant**
   ```
   State transitions MUST advance transaction toward a terminal state
   (no cycles, no regressions except admin dispute resolution)
   ```

8. **Actor Permission Invariant**
   ```
   EVERY transition MUST be authorized by exactly one actor type
   (Buyer OR Seller OR Admin OR System)
   ```

### 4.3 Temporal Invariants

9. **Causality Invariant**
   ```
   payment_confirmed_at < escrowed_at < delivered_at < completed_at
   (timestamps must be chronologically ordered)
   ```

10. **Inspection Period Invariant**
    ```
    IF state = delivery_submitted AND inspection_period_expires_at IS NULL
    THEN system is in invalid state
    ```

### 4.4 Business Logic Invariants

11. **Mutual Cancellation Invariant**
    ```
    IF transition from in_escrow → refunded by mutual agreement
    THEN both buyer AND seller must have consented
    ```

12. **Dispute Evidence Invariant**
    ```
    IF state = disputed
    THEN dispute_id IS NOT NULL 
    AND dispute record exists with evidence
    ```

13. **Fee Deduction Invariant**
    ```
    IF state = completed
    THEN platform_fee_paid = true
    AND seller_payout = transaction_amount - platform_fee
    ```

### 4.5 Enforcement Strategy

- **Database Level:** Foreign key constraints, check constraints, triggers
- **Application Level:** Pre-condition checks before every transition
- **Integration Level:** Webhook verification, idempotency keys
- **Monitoring Level:** Periodic invariant validation jobs, alerts on violations

---

## 5. Failure & Rejection Rules

### 5.1 Invalid Transition Handling

When an invalid transition is attempted, the system MUST:

1. **Reject the Request**
   - Return `HTTP 409 Conflict` (or equivalent error code)
   - Error message format:
     ```json
     {
       "error": "INVALID_TRANSITION",
       "message": "Cannot transition from 'completed' to 'refunded'",
       "current_state": "completed",
       "attempted_state": "refunded",
       "reason": "Terminal state cannot be changed",
       "transaction_id": "txn_abc123"
     }
     ```

2. **Log the Attempt**
   - Record in audit log with:
     - Transaction ID
     - Attempted transition (from → to)
     - Actor (user ID or system)
     - Timestamp
     - Reason for rejection
     - IP address / request context

3. **Alert on Suspicious Patterns**
   - Multiple failed attempts by same user → fraud alert
   - Terminal state modification attempts → security alert
   - System-level transition failures → engineering alert

4. **Do NOT Modify State**
   - Transaction state remains unchanged
   - No side effects (no emails, no webhooks)
   - Idempotent: same request yields same rejection

### 5.2 Specific Failure Scenarios

**Scenario 1: User Attempts to Cancel Completed Transaction**
- **Rejection:** `HTTP 409` - "Transaction already completed"
- **Guidance:** "Contact support for post-completion issues"
- **Log Level:** INFO (expected user error)

**Scenario 2: Seller Attempts to Mark Delivery Before Payment**
- **Rejection:** `HTTP 409` - "Transaction not yet in escrow"
- **Guidance:** "Wait for buyer to complete payment"
- **Log Level:** INFO

**Scenario 3: System Attempts Invalid Transition (Bug)**
- **Rejection:** Throw exception, fail the operation
- **Alert:** Immediate PagerDuty alert to engineering
- **Log Level:** CRITICAL
- **Action:** Investigate root cause immediately

**Scenario 4: Admin Attempts to Override Terminal State**
- **Rejection:** `HTTP 403 Forbidden` - "Terminal states cannot be changed"
- **Guidance:** "Create compensating transaction instead"
- **Log Level:** WARNING
- **Action:** Log for compliance audit

**Scenario 5: Race Condition (Two Simultaneous Transitions)**
- **Resolution:** Database optimistic locking (version column)
- **Rejection:** Loser of race gets `HTTP 409` - "State changed"
- **Guidance:** "Refresh and retry"
- **Log Level:** DEBUG

### 5.3 Idempotency Rules

**Duplicate Transition Requests:**
- If requested `from → to` matches current state → to:
  - Return `HTTP 200 OK` (idempotent success)
  - Message: "Transaction already in requested state"
  - Do not log as error

**Example:**
```
Current state: completed
Request: transition to completed
Response: 200 OK (no-op, already completed)
```

### 5.4 Cascading Failure Prevention

**If a transition fails mid-operation:**

1. **Rollback All Changes**
   - Use database transactions (ACID guarantees)
   - No partial state updates

2. **Compensating Actions**
   - If payment gateway succeeds but state update fails → retry with idempotency key
   - If state update succeeds but webhook fails → queue retry

3. **Circuit Breaker**
   - If payment gateway down → pause all payment transitions
   - Display maintenance message to users

---

## 6. Guarantees Provided by This State Machine

### 6.1 Guarantees for Buyers

1. **Payment Protection**
   - "Your funds are held in escrow until you confirm receipt"
   - Guaranteed by: `in_escrow` state prevents seller withdrawal

2. **Inspection Right**
   - "You have 3 days to inspect delivery before auto-confirmation"
   - Guaranteed by: `delivery_submitted` → `completed` has inspection period

3. **Dispute Right**
   - "You can dispute at any time before completion"
   - Guaranteed by: `in_escrow` | `delivery_submitted` → `disputed` always allowed

4. **Refund Finality**
   - "If you receive a refund, the transaction is permanently closed"
   - Guaranteed by: `refunded` is terminal, seller cannot reopen

5. **No Double Charge**
   - "You will be charged exactly once per transaction"
   - Guaranteed by: Payment Before Escrow Invariant + Single Disbursement Invariant

### 6.2 Guarantees for Sellers

1. **Payment Certainty**
   - "Once funds are in escrow, buyer cannot withdraw payment without your agreement"
   - Guaranteed by: `in_escrow` → `refunded` requires admin or mutual consent

2. **Timely Release**
   - "Funds auto-release after 3 days if buyer doesn't dispute"
   - Guaranteed by: System auto-transition from `delivery_submitted` → `completed`

3. **Completion Finality**
   - "Once completed, buyer cannot reverse the payment"
   - Guaranteed by: `completed` is terminal

4. **Fair Dispute Process**
   - "Disputes are reviewed by admin, not decided by buyer alone"
   - Guaranteed by: `disputed` → `refunded` requires admin action

5. **No Work Before Payment**
   - "You only see transactions after buyer pays"
   - Guaranteed by: Seller cannot access transactions in `draft` or `awaiting_payment`

### 6.3 Guarantees for Platform (Risk & Compliance)

1. **Regulatory Compliance**
   - Immutable financial records (terminal states)
   - Audit trail of all state changes
   - Timestamp causality enforcement

2. **Fraud Prevention**
   - No shortcuts bypass payment or escrow
   - Terminal states prevent double-disbursement
   - Dispute freeze prevents unauthorized withdrawals

3. **Financial Integrity**
   - Zero-sum invariant ensures no lost funds
   - Escrow custody invariant ensures solvency
   - Platform fee always deducted on completion

4. **Operational Reliability**
   - Idempotency prevents duplicate payments
   - Cascading failure prevention contains errors
   - System-driven transitions reduce manual errors

5. **Legal Defensibility**
   - State machine defines "contract fulfillment"
   - Dispute resolution process is documented and consistent
   - All actions attributable to specific actors

### 6.4 System-Level Guarantees

**Consistency:**
- Every transaction is always in exactly one state
- State transitions are atomic (all-or-nothing)

**Availability:**
- System-driven transitions have automatic retry
- Payment gateway failures do not corrupt state

**Partition Tolerance:**
- Idempotency keys prevent split-brain scenarios
- Optimistic locking prevents race conditions

**Auditability:**
- Every state change is logged with actor and timestamp
- Rejected transitions are logged for security analysis

**Scalability:**
- State machine logic is stateless (can run on any server)
- Transactions can be processed in parallel (no global locks)

---

## 7. Implementation Notes (Non-Normative)

### 7.1 Database Schema Considerations

**Recommended:**
- `state` column with ENUM or CHECK constraint
- `state_changed_at` timestamp (updated on every transition)
- `state_changed_by` (user_id or 'system' or 'admin')
- `version` column for optimistic locking
- Separate `transaction_state_history` table for audit trail

**Example:**
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  state VARCHAR(50) NOT NULL CHECK (state IN ('draft', 'awaiting_payment', ...)),
  version INT NOT NULL DEFAULT 1,
  state_changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  state_changed_by VARCHAR(255),
  -- ... other columns
  CONSTRAINT no_terminal_change CHECK (
    (state NOT IN ('completed', 'refunded', 'cancelled')) 
    OR (version = 1)
  )
);
```

### 7.2 API Design Considerations

**RESTful Approach:**
```
POST /transactions/{id}/transitions
Body: { "to_state": "completed", "reason": "buyer_confirmed" }
```

**Event-Driven Approach:**
```
POST /transactions/{id}/events
Body: { "event": "buyer_confirmed_delivery" }
(Backend determines resulting state)
```

**Recommended:** Event-driven (business actions, not state names)

### 7.3 Testing Requirements

Every implementation MUST test:
- All allowed transitions (happy paths)
- All forbidden transitions (rejection paths)
- Terminal state immutability
- Idempotency of all endpoints
- Race condition handling (concurrent updates)
- All invariants hold after every transition

### 7.4 Monitoring & Alerting

**Metrics to Track:**
- Transition success rate (by state pair)
- Average time in each state
- Dispute rate
- Terminal state distribution
- Invalid transition attempt rate

**Alerts to Configure:**
- Any terminal state modification attempt
- Invariant violation detected
- Unusually high dispute rate
- Transactions stuck in non-terminal state > 30 days

---

## 8. Versioning & Evolution

**This document is version 1.0.0.**

**Changes to this state machine require:**
1. Architecture review and approval
2. Migration plan for existing transactions
3. Backward compatibility analysis
4. Update to this document with version bump
5. Deployment coordination (database, backend, frontend)

**Allowed changes:**
- Adding new non-terminal states (with clear transition paths)
- Adding new allowed transitions (if invariants preserved)
- Adjusting timeouts or inspection periods (policy changes)

**Forbidden changes:**
- Renaming existing states (breaks all systems)
- Removing terminal states (breaks guarantees)
- Allowing previously forbidden transitions (security risk)
- Weakening invariants (breaks integrity)

**Deprecation process:**
- If a state must be removed, mark as deprecated for 6 months
- New transactions cannot enter deprecated state
- Existing transactions in deprecated state must be migrated
- After 6 months, state can be archived (not deleted from schema)

---

## 9. Glossary

**Actor:** The entity (user, admin, or system) that triggers a state transition.

**Escrow:** Platform-controlled holding account where funds reside between payment and release.

**Inspection Period:** Time window (default 3 days) for buyer to review delivery before auto-confirmation.

**Invariant:** A condition that must always be true across all states and transitions.

**Mutual Cancellation:** Both buyer and seller agree to terminate the transaction (rare case).

**Payment Gateway:** External service (e.g., Stripe) that processes credit card payments.

**Terminal State:** A state that, once reached, cannot transition to any other state.

**Transition:** A change from one state to another, triggered by an actor and governed by rules.

---

## 10. Conclusion

This state machine is the **authoritative definition** of how transactions behave on the platform.

**All systems must conform to this specification:**
- Backend APIs
- Frontend UI
- Webhook handlers
- Admin tools
- Analytics queries

**Deviations from this spec are bugs.**

Any ambiguity or conflict should be resolved by consulting this document.

---

---

## 7. Roles Overview

This section defines the **authoritative permissions model** for the escrow platform. These permissions are enforced at the **domain level** (backend logic, database constraints, API middleware) and remain valid regardless of UI implementation, API client behavior, or attempted exploits.

### 7.1 Role Definitions

| Role | Trust Level | Accountability | Scope |
|------|-------------|----------------|-------|
| **Buyer** | Authenticated User | Financial liability for payment | Single transaction (participant) |
| **Seller** | Authenticated User | Service delivery obligation | Single transaction (participant) |
| **Admin** | Trusted Staff | Legal & operational liability | Platform-wide (all transactions) |
| **System** | Automated Process | Technical correctness | Platform-wide (rule-based only) |

### 7.2 Role Responsibilities

**Buyer:**
- Initiate transactions
- Fund escrow accounts
- Confirm delivery or raise disputes
- Accountable for: Payment fraud, false disputes

**Seller:**
- Accept transaction terms
- Deliver services as agreed
- Mark delivery complete
- Accountable for: Non-delivery, false delivery claims

**Admin:**
- Resolve disputes impartially
- Handle exceptional cases
- Enforce platform policies
- Accountable for: All override actions (logged & audited)

**System:**
- Execute time-based transitions
- Enforce business rules automatically
- Maintain data integrity
- Accountable for: Algorithmic correctness (not discretion)

### 7.3 Permission Enforcement Layers

1. **Database Row-Level Security (RLS)**
   - Enforces read/write access by role
   - Cannot be bypassed by application code

2. **API Middleware**
   - Validates actor before processing requests
   - Returns `403 Forbidden` for unauthorized actions

3. **Business Logic Layer**
   - Checks state machine + permissions before transitions
   - Returns `409 Conflict` for invalid state changes

4. **Audit Layer**
   - Logs all permission checks (pass and fail)
   - Alerts on suspicious patterns

---

## 8. Buyer Permissions

### 8.1 Actions Buyer MAY Perform

| Action | Allowed States | Preconditions | Notes |
|--------|---------------|---------------|-------|
| **Create transaction** | N/A | Authenticated, email verified | Initial state: `draft` |
| **Edit transaction details** | `draft` | Is creator of transaction | Cannot edit after payment |
| **Initiate payment** | `draft` | Transaction details complete | Triggers `draft` → `awaiting_payment` |
| **Cancel transaction** | `draft`, `awaiting_payment` | Before payment confirmed | No refund needed (no payment yet) |
| **View transaction details** | Any state | Is participant in transaction | Read-only access |
| **Confirm delivery** | `delivery_submitted` | Within inspection period | Triggers `delivery_submitted` → `completed` |
| **Raise dispute** | `in_escrow`, `delivery_submitted` | Before transaction completed | Freezes state, triggers `→ disputed` |
| **Upload dispute evidence** | `disputed` | Dispute is active | Text, files, screenshots |
| **Request mutual cancellation** | `in_escrow` | Seller must also agree | Requires seller consent |
| **View dispute status** | `disputed` | Is participant in dispute | Cannot modify admin decision |

### 8.2 State-Specific Permissions Matrix

| State | Create | Edit | Pay | Cancel | Confirm | Dispute | View |
|-------|--------|------|-----|--------|---------|---------|------|
| `draft` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `awaiting_payment` | ❌ | ❌ | ⏳ | ✅ | ❌ | ❌ | ✅ |
| `payment_confirmed` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `in_escrow` | ❌ | ❌ | ❌ | ⚠️* | ❌ | ✅ | ✅ |
| `delivery_submitted` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| `disputed` | ❌ | ❌ | ❌ | ❌ | ❌ | 📝** | ✅ |
| `completed` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `refunded` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `cancelled` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

*⚠️ Only via mutual cancellation (requires seller consent)  
**📝 Can add evidence, cannot change dispute outcome

### 8.3 Actions Buyer May NEVER Perform

**Absolutely Forbidden (No Exceptions):**

1. **Modify state directly**
   - Cannot set `state` column manually
   - Cannot bypass transition logic
   - **Why:** State machine integrity

2. **Access transactions where they are not a participant**
   - Cannot view other users' transactions
   - Cannot list transactions they don't own
   - **Why:** Privacy & confidentiality

3. **Release funds to seller**
   - Cannot trigger `→ completed` while in `in_escrow` (must wait for delivery)
   - Cannot access escrow account
   - **Why:** Seller must deliver first

4. **Cancel after escrow funding**
   - Cannot unilaterally cancel from `in_escrow` or later
   - Must use dispute or mutual cancellation
   - **Why:** Financial integrity (funds are committed)

5. **Modify seller information**
   - Cannot change seller payout details
   - Cannot impersonate seller
   - **Why:** Fraud prevention

6. **Override admin decisions**
   - Cannot reverse dispute resolution
   - Cannot reopen completed transactions
   - **Why:** Platform authority

7. **Initiate refund**
   - Cannot directly trigger `→ refunded`
   - Must go through dispute process
   - **Why:** Admin oversight required

8. **Bypass inspection period**
   - Cannot force immediate completion without confirmation
   - System auto-confirms after period expires
   - **Why:** Seller protection

9. **Delete transaction records**
   - Cannot remove transaction from database
   - Can only archive from personal view
   - **Why:** Compliance & audit trail

10. **Modify transaction amount after payment**
    - Amount is immutable once `awaiting_payment`
    - **Why:** Payment integrity

### 8.4 Permission Validation Examples

**Example 1: Buyer attempts to confirm delivery in `in_escrow` state**
```
Request: POST /transactions/{id}/confirm
Current State: in_escrow
Result: 409 Conflict - "Delivery not yet submitted by seller"
```

**Example 2: Buyer attempts to cancel completed transaction**
```
Request: POST /transactions/{id}/cancel
Current State: completed
Result: 409 Conflict - "Terminal state cannot be changed"
```

**Example 3: Buyer attempts to view another user's transaction**
```
Request: GET /transactions/{other_user_transaction_id}
Result: 403 Forbidden - "Not authorized to view this transaction"
```

---

## 9. Seller Permissions

### 9.1 Actions Seller MAY Perform

| Action | Allowed States | Preconditions | Notes |
|--------|---------------|---------------|-------|
| **View transaction offer** | `draft`, `awaiting_payment` | Is named seller | Read-only (cannot edit) |
| **View funded transaction** | `in_escrow`, `delivery_submitted`, `disputed` | Is participant | Actionable after escrow |
| **Mark delivery complete** | `in_escrow` | Delivery actually completed | Triggers `in_escrow` → `delivery_submitted` |
| **Upload proof of delivery** | `in_escrow` | Before marking complete | Recommended but optional |
| **Raise dispute** | `in_escrow`, `delivery_submitted` | Before completion | Rare (usually buyer disputes) |
| **Upload dispute evidence** | `disputed` | Dispute is active | Defend against buyer dispute |
| **Request mutual cancellation** | `in_escrow` | Buyer must also agree | Triggers refund process |
| **View payout details** | `completed` | Transaction completed | See amount received |
| **View transaction history** | Any state | Is participant | Audit trail |

### 9.2 State-Specific Permissions Matrix

| State | View | Accept | Deliver | Cancel | Dispute | Evidence | Payout |
|-------|------|--------|---------|--------|---------|----------|--------|
| `draft` | ✅ | ⏳* | ❌ | ❌ | ❌ | ❌ | ❌ |
| `awaiting_payment` | ✅ | ⏳ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `payment_confirmed` | ✅ | ⏳ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `in_escrow` | ✅ | N/A | ✅ | ⚠️** | ✅ | ✅ | ❌ |
| `delivery_submitted` | ✅ | N/A | ✅*** | ❌ | ✅ | ✅ | ❌ |
| `disputed` | ✅ | N/A | ❌ | ❌ | 📝 | ✅ | ❌ |
| `completed` | ✅ | N/A | N/A | ❌ | ❌ | N/A | ✅ |
| `refunded` | ✅ | N/A | N/A | ❌ | ❌ | N/A | ❌ |
| `cancelled` | ✅ | N/A | N/A | ❌ | ❌ | N/A | ❌ |

*⏳ Implicit acceptance when transaction is created (seller is notified)  
**⚠️ Only via mutual cancellation (requires buyer consent)  
***✅ Can update delivery proof or notes

### 9.3 Actions Seller May NEVER Perform

**Absolutely Forbidden (No Exceptions):**

1. **Initiate or modify transaction**
   - Cannot create transactions where they are the seller
   - Cannot edit transaction terms
   - **Why:** Buyer creates the offer; seller accepts via delivery

2. **Access transactions before payment**
   - Cannot act on transactions in `draft` or `awaiting_payment`
   - Can view but not perform actions
   - **Why:** No work before payment confirmed

3. **Withdraw funds before buyer confirmation**
   - Cannot trigger `→ completed` from `delivery_submitted`
   - Must wait for buyer or auto-confirmation
   - **Why:** Buyer inspection period

4. **Access other users' transactions**
   - Cannot view transactions where they are not the seller
   - **Why:** Privacy & confidentiality

5. **Modify buyer information**
   - Cannot change buyer payment method
   - Cannot impersonate buyer
   - **Why:** Fraud prevention

6. **Cancel unilaterally after escrow**
   - Cannot cancel from `in_escrow` without buyer agreement
   - **Why:** Buyer has paid; requires mutual consent or dispute

7. **Override inspection period**
   - Cannot force immediate payout
   - System auto-releases after 3 days
   - **Why:** Buyer protection

8. **Initiate refund**
   - Cannot trigger `→ refunded`
   - Must request via mutual cancellation or admin
   - **Why:** Financial controls

9. **Mark delivery complete multiple times**
   - Action is idempotent but cannot change delivery timestamp
   - **Why:** Audit integrity

10. **Override dispute resolution**
    - Cannot reverse admin decision
    - Cannot reopen completed transactions
    - **Why:** Platform authority

11. **Set transaction amount**
    - Cannot modify price after transaction created
    - **Why:** Buyer defines terms

12. **Delete transaction records**
    - Cannot remove transactions from system
    - **Why:** Compliance & audit trail

### 9.4 Permission Validation Examples

**Example 1: Seller attempts to mark delivery in `draft` state**
```
Request: POST /transactions/{id}/mark-delivered
Current State: draft
Result: 409 Conflict - "Payment not yet confirmed"
```

**Example 2: Seller attempts to force payout**
```
Request: POST /transactions/{id}/complete
Current State: delivery_submitted
Result: 403 Forbidden - "Only buyer or system can complete"
```

**Example 3: Seller attempts to modify transaction amount**
```
Request: PATCH /transactions/{id}
Body: { "amount": 5000 }
Current State: in_escrow
Result: 403 Forbidden - "Seller cannot modify transaction terms"
```

---

## 10. Admin Powers & Overrides

### 10.1 Normal Admin Permissions

Admins have **elevated permissions** for platform operations and support:

| Action | Allowed States | Requires | Notes |
|--------|---------------|----------|-------|
| **View any transaction** | Any | Admin role | Full read access |
| **View all users** | N/A | Admin role | PII access (logged) |
| **Resolve disputes** | `disputed` | Dispute assigned | Transition to `completed` or `refunded` |
| **Freeze account** | N/A | Fraud suspicion | Prevents new transactions |
| **View audit logs** | N/A | Admin role | All state changes |
| **Generate reports** | N/A | Admin role | Analytics & compliance |
| **Contact users** | Any | Support ticket | Via platform messaging |

### 10.2 Admin Override Powers

**Critical: These powers bypass normal rules but are HEAVILY audited.**

| Override Power | Normal Restriction | Admin Capability | Safeguards Required |
|----------------|-------------------|------------------|---------------------|
| **Manual state transition** | State machine rules | Can force any non-terminal → non-terminal | 1. Written justification<br>2. Senior admin approval<br>3. User notification<br>4. Audit log entry |
| **Refund from any state** | Cannot refund after `completed` | Can initiate refund from any state | 1. Legal/compliance reason<br>2. Finance team approval<br>3. Transaction freeze during process |
| **Cancel terminal state** | Terminal states immutable | Can archive/annotate (not delete) | 1. Court order OR<br>2. Critical fraud case<br>3. Legal documentation |
| **Modify transaction amount** | Immutable after payment | Can adjust for billing errors | 1. Documented error<br>2. Both parties notified<br>3. Compensating transaction created |
| **Bypass inspection period** | 3-day wait required | Can force completion immediately | 1. Both parties consent<br>2. Written request<br>3. Documented urgency |
| **Access deleted user data** | Users can delete accounts | Can view deleted user transactions | 1. Legal request OR<br>2. Fraud investigation<br>3. Compliance requirement |

### 10.3 Actions Even Admins Cannot Perform

**Absolutely Forbidden (Requires System-Level Database Access):**

1. **Delete transaction records**
   - Cannot remove transactions from database
   - Can mark as "archived" in UI
   - **Why:** Legal compliance (7-year retention)

2. **Modify immutable timestamps**
   - Cannot change `created_at`, `payment_confirmed_at`, etc.
   - **Why:** Audit integrity

3. **Reverse completed payouts**
   - Cannot recall funds after `completed` → seller payout processed
   - Must create new compensating transaction
   - **Why:** Payment processor limitations

4. **Forge actor attribution**
   - Cannot make actions appear to be from user or system
   - All admin actions are marked as "admin"
   - **Why:** Legal accountability

5. **Bypass financial invariants**
   - Cannot violate zero-sum rule (amount = seller + buyer + fee)
   - Cannot create funds from nothing
   - **Why:** Accounting integrity

6. **Disable audit logging**
   - Cannot turn off logging for specific actions
   - Cannot delete log entries
   - **Why:** Regulatory compliance

### 10.4 Admin Accountability Requirements

**Every admin action must be:**

1. **Attributed**
   - Specific admin user ID recorded
   - IP address logged
   - Timestamp with millisecond precision

2. **Justified**
   - Text reason (minimum 20 characters)
   - Reference to policy or ticket number
   - Affected user(s) identified

3. **Auditable**
   - Separate admin_actions table
   - Cannot be modified after creation
   - Queryable by compliance team

4. **Notified**
   - Users affected by override receive notification
   - Explanation of action and reason
   - Option to appeal (if applicable)

5. **Reviewed**
   - Weekly review of all overrides
   - Flagged if patterns detected
   - Annual audit by external party

### 10.5 Admin Permission Escalation

**For high-risk actions, require multi-party approval:**

| Action Risk Level | Approval Required | Example Actions |
|-------------------|-------------------|-----------------|
| **Low** | Single admin | View transactions, contact users |
| **Medium** | Admin + justification | Resolve disputes, freeze accounts |
| **High** | Senior admin approval | Manual state transitions, amount adjustments |
| **Critical** | Senior admin + legal/finance | Refund completed transactions, access deleted data |

### 10.6 Admin Override Examples

**Example 1: Manual refund after completion (Critical)**
```
Scenario: Seller delivered wrong service, buyer already confirmed
Current State: completed
Admin Action: Force transition to refunded
Requirements:
  - Senior admin approval: ✅ Jane Doe
  - Justification: "Seller delivered incorrect package, buyer confirmed by mistake"
  - Legal review: ✅ Approved by Legal Team
  - Finance approval: ✅ CFO authorized compensating payment
  - User notification: ✅ Both parties notified
  - Audit log: ✅ Entry #87234
Result: New compensating transaction created, seller account debited
```

**Example 2: Bypass inspection period (High)**
```
Scenario: Both parties want immediate completion
Current State: delivery_submitted
Admin Action: Force completion
Requirements:
  - Written consent from buyer: ✅ Email confirmation
  - Written consent from seller: ✅ Support ticket #1234
  - Justification: "Both parties urgently need completion"
  - Senior admin approval: ✅ John Smith
Result: Immediate transition to completed
```

---

## 11. System-Only Actions

### 11.1 Automated Transitions

These transitions are **triggered automatically** by scheduled jobs or event handlers. No human can initiate them directly.

| System Action | From State | To State | Trigger | Frequency | Preconditions |
|---------------|-----------|----------|---------|-----------|---------------|
| **Auto-expire draft** | `draft` | `cancelled` | Created > 7 days ago | Daily cron (00:00 UTC) | No payment attempted |
| **Auto-cancel payment** | `awaiting_payment` | `cancelled` | Stripe session expired | Webhook + hourly check | 30 minutes elapsed |
| **Auto-escrow funds** | `payment_confirmed` | `in_escrow` | Payment webhook received | Immediate (webhook) | Payment gateway confirmed |
| **Auto-confirm delivery** | `delivery_submitted` | `completed` | 3 days elapsed | Hourly cron | No dispute raised |
| **Auto-expire disputes** | `disputed` | `refunded` | Admin no action for 14 days | Daily cron | Escalation policy |

### 11.2 System Action Preconditions

**Before ANY system transition, verify:**

1. **State Lock**
   - Transaction not already being processed
   - Use database row lock (`SELECT ... FOR UPDATE`)

2. **Idempotency**
   - Check if action already performed
   - Skip if already in target state

3. **Invariant Check**
   - All invariants still hold
   - No data corruption detected

4. **Fraud Check**
   - Transaction not flagged for review
   - No pending investigations

5. **External Dependency**
   - Payment gateway reachable (if needed)
   - Escrow account funded (if needed)

### 11.3 System Action Error Handling

**If system action fails:**

1. **Retry with Backoff**
   - Immediate retry (0s)
   - Second retry (5 minutes)
   - Third retry (1 hour)
   - Manual review after 3 failures

2. **Alert Engineering**
   - PagerDuty alert after 2 failures
   - Slack notification with transaction ID
   - Dashboard shows failed jobs

3. **Preserve State**
   - Do not partially transition
   - Leave in current state with error flag
   - Create system_action_failures record

4. **Manual Intervention**
   - Admin can view failed actions
   - Admin can manually trigger retry
   - Admin can override with justification

### 11.4 Actions System May NEVER Perform

**Forbidden even for automated jobs:**

1. **Create transactions**
   - Only users can create transactions
   - **Why:** Requires human intent

2. **Initiate disputes**
   - Only buyer or seller can dispute
   - **Why:** Requires human judgment

3. **Modify amounts**
   - Cannot change transaction amounts
   - **Why:** Financial integrity

4. **Override admin decisions**
   - Cannot reverse admin dispute resolutions
   - **Why:** Admin authority

5. **Delete records**
   - Cannot remove transactions or audit logs
   - **Why:** Compliance

6. **Bypass invariants**
   - Cannot violate zero-sum rule or other invariants
   - **Why:** Mathematical correctness

### 11.5 System Action Audit Requirements

**Every system action must log:**

- Transaction ID
- Action type (e.g., "auto_confirm_delivery")
- Timestamp (ISO 8601 with timezone)
- Previous state
- New state
- Precondition checks (passed/failed)
- External API calls (if any)
- Result (success/failure/retry)

---

## 12. Cross-Role Prohibitions

### 12.1 Admin-Only Actions

**Only admins can perform (not even system):**

1. **Resolve disputes**
   - Transition from `disputed` to `completed` or `refunded`
   - Requires human judgment

2. **Freeze accounts**
   - Prevent users from creating transactions
   - Fraud prevention

3. **View PII across all users**
   - Access full names, emails, payment methods
   - Compliance reviews

4. **Generate financial reports**
   - Platform revenue, fees collected
   - Business intelligence

5. **Override system rules**
   - Force transitions that violate normal rules
   - Emergency fixes

### 12.2 Actions No Role Can Perform

**Impossible under any circumstance (requires database admin):**

1. **Delete transaction records**
   - Violation of compliance (SOX, GDPR retention)
   - Requires DBA with direct database access

2. **Modify audit logs**
   - Logs are append-only
   - Tampering is a crime (Sarbanes-Oxley)

3. **Forge timestamps**
   - Database-generated timestamps cannot be overridden
   - Audit integrity

4. **Violate zero-sum invariant**
   - Cannot create funds from nothing
   - Mathematical impossibility

5. **Recall completed payouts**
   - Once funds leave escrow to seller bank, cannot reverse
   - Payment processor limitation

6. **Reopen terminal states**
   - Cannot transition from `completed`, `refunded`, or `cancelled`
   - State machine guarantee

7. **Bypass state machine**
   - Cannot skip required states
   - All transitions must follow transition table

8. **Impersonate another user**
   - Cannot perform actions as another user
   - Authentication integrity

9. **Disable security checks**
   - Cannot turn off RLS, permission checks
   - Security policy

10. **Access deleted data after retention period**
    - After 7 years, data purged from backups
    - Legal compliance

### 12.3 Separation of Duties

**Critical operations require multiple actors:**

| Operation | Primary Actor | Secondary Approval | Tertiary Oversight |
|-----------|--------------|-------------------|-------------------|
| **Large refunds (>$10K)** | Admin | Senior Admin | Finance Team |
| **Account freezes** | Admin | Legal Team | N/A |
| **Manual state overrides** | Admin | Senior Admin | Audit log review |
| **Database migrations** | Engineer | Senior Engineer | DBA Review |
| **Payout processing** | System | Finance Team (batch approval) | Monthly audit |

### 12.4 Emergency Override Protocol

**In catastrophic scenarios (e.g., critical bug, legal order):**

1. **Incident Commander** (Senior Admin)
   - Declares emergency
   - Documents situation

2. **Technical Lead** (Senior Engineer)
   - Assesses technical impact
   - Proposes fix

3. **Legal Review** (if applicable)
   - Verifies legality
   - Documents authorization

4. **Implementation**
   - Requires 2-person approval
   - All actions logged
   - Post-mortem required within 24 hours

5. **Communication**
   - Affected users notified within 1 hour
   - Public status page updated
   - Regulatory bodies notified (if required)

---

## 13. Security Guarantees

### 13.1 Attack Prevention

This permissions model **prevents the following attacks:**

| Attack Vector | Mitigation | How Permissions Help |
|---------------|-----------|---------------------|
| **Privilege Escalation** | Role-based access control | Buyers cannot act as sellers or admins |
| **Unauthorized Fund Access** | State-gated permissions | Cannot access escrow without proper state |
| **Transaction Hijacking** | Participant verification | Cannot view/modify others' transactions |
| **Double Disbursement** | Single disbursement invariant | Funds released exactly once |
| **Replay Attacks** | Idempotency keys | Duplicate requests have no effect |
| **State Manipulation** | State machine enforcement | Cannot skip or reverse states |
| **Terminal State Tampering** | Database constraints | Terminal states immutable |
| **Admin Abuse** | Audit logging + approval | All admin actions tracked and reviewed |
| **Race Conditions** | Optimistic locking | Concurrent updates detected and rejected |
| **Refund Fraud** | Admin-only refunds | Users cannot self-refund after completion |
| **Delivery Skip** | Transition table enforcement | Cannot complete without delivery submission |
| **Inspection Bypass** | Time-based system action | Sellers cannot force immediate payout |
| **Cross-Account Access** | RLS policies | Users only see own transactions |
| **Audit Log Tampering** | Append-only logs | Cannot modify or delete audit records |
| **Compliance Bypass** | Multi-layer enforcement | Database + API + business logic all check |

### 13.2 Mistake Prevention

This permissions model **makes the following mistakes impossible:**

1. **Accidental Refund of Completed Transaction**
   - Permission: Only admins can refund completed
   - UI: No refund button on completed transactions
   - API: Rejects with 403 Forbidden

2. **Releasing Funds Before Delivery**
   - State machine: Must pass through `delivery_submitted`
   - Permission: Buyer/seller cannot skip to `completed`
   - System: Only auto-confirms after inspection period

3. **Cancelling After Escrow Without Agreement**
   - Permission: Unilateral cancel forbidden from `in_escrow`
   - Business logic: Requires mutual consent or admin
   - UI: Cancel button disabled in this state

4. **Viewing Other Users' Sensitive Data**
   - RLS: Database-level filtering by user ID
   - API: Participant check before returning data
   - Permission: 403 Forbidden if not participant

5. **Double-Charging Buyer**
   - State machine: Cannot re-enter `awaiting_payment`
   - Payment gateway: Idempotency key prevents duplicates
   - Invariant: Payment confirmation is one-time event

6. **Paying Seller Without Buyer Payment**
   - Invariant: `completed` requires prior `payment_confirmed`
   - System: Checks escrow balance before payout
   - Financial: Zero-sum invariant enforced

7. **Modifying Transaction After Payment**
   - Permission: Amount immutable after `awaiting_payment`
   - Database: Constraint prevents amount updates
   - API: Rejects PATCH requests with 403

8. **Reopening Closed Transactions**
   - State machine: Terminal states cannot transition
   - Permission: No role can modify terminal states
   - Database: Constraint on state column

9. **Bypassing Dispute Process**
   - State machine: `disputed` state freezes other transitions
   - Permission: Only admin can resolve disputes
   - Business logic: Automatic transitions disabled in dispute

10. **Deleting Compliance-Required Records**
    - Permission: No role (including admin) can delete
    - Database: No DELETE permission on transactions table
    - Audit: Attempted deletions logged and alerted

### 13.3 Guarantees for Stakeholders

**For Buyers:**
- ✅ Funds cannot be released to seller without your confirmation or auto-confirmation period
- ✅ You can always dispute before completion
- ✅ Terminal states (completed, refunded) cannot be changed by seller
- ✅ Your payment information is never visible to sellers

**For Sellers:**
- ✅ Buyer cannot cancel unilaterally after payment
- ✅ Funds auto-release after 3 days if no dispute
- ✅ Completed transactions cannot be reversed by buyer
- ✅ You cannot be asked to deliver before payment is in escrow

**For Platform:**
- ✅ All state changes are audited and attributed
- ✅ Financial invariants cannot be violated (mathematically enforced)
- ✅ Compliance requirements are met (retention, audit trail)
- ✅ Admin abuse is detectable and reviewable
- ✅ System bugs cannot bypass permissions (multi-layer enforcement)

**For Regulators:**
- ✅ Audit trail is immutable and complete
- ✅ All financial transactions are traceable
- ✅ User actions are attributed to specific accounts
- ✅ Data retention policies are enforced
- ✅ Admin overrides are justified and approved

### 13.4 Defense in Depth

This permission model is enforced at **5 independent layers:**

1. **Database Layer (RLS)**
   - Row-level security policies
   - Foreign key constraints
   - Check constraints on state transitions

2. **API Layer (Middleware)**
   - JWT authentication
   - Role verification
   - Actor authorization

3. **Business Logic Layer**
   - State machine validation
   - Permission checks
   - Invariant enforcement

4. **Application Layer**
   - Pre-condition checks
   - Post-condition validation
   - Transaction rollback on failure

5. **Audit Layer**
   - All actions logged
   - Anomaly detection
   - Real-time alerting

**Even if one layer is compromised, the others prevent abuse.**

---

## 14. Compliance & Legal Guarantees

### 14.1 Regulatory Compliance

This permission model ensures compliance with:

**SOX (Sarbanes-Oxley):**
- ✅ Immutable audit logs
- ✅ Separation of duties (admin overrides require approval)
- ✅ Financial controls (zero-sum invariant)

**PCI-DSS (Payment Card Industry):**
- ✅ Payment data isolated from transaction logic
- ✅ No storage of CVV or full card numbers
- ✅ Access to payment methods logged

**GDPR (General Data Protection Regulation):**
- ✅ Right to access (users can view their transactions)
- ✅ Right to rectification (admins can correct errors)
- ✅ Right to erasure (soft delete with retention policy)
- ✅ Audit trail of data access

**KYC/AML (Know Your Customer/Anti-Money Laundering):**
- ✅ Transaction history is complete and immutable
- ✅ Large transactions can be flagged for review
- ✅ User identity verified before high-value transactions

### 14.2 Legal Protections

**For Users:**
- Contract law: State machine defines "performance" and "breach"
- Consumer protection: Inspection period and dispute process
- Fraud protection: Admin oversight of all refunds

**For Platform:**
- Limited liability: Clear rules on platform's role (intermediary, not party)
- Terms of service enforcement: Admin powers to freeze/cancel for violations
- Compliance defense: Audit trail proves due diligence

### 14.3 Dispute Resolution Legal Framework

**This state machine provides:**

1. **Evidence Preservation**
   - All state changes timestamped
   - Dispute evidence uploaded by both parties
   - Admin decision documented with reasoning

2. **Impartial Process**
   - Admin cannot be buyer or seller
   - Dispute resolution SLA (7 business days)
   - Both parties can submit evidence

3. **Finality**
   - Admin decision transitions to terminal state
   - No further appeals within platform
   - External legal remedies remain available

4. **Transparency**
   - Both parties notified of all state changes
   - Dispute resolution reasoning communicated
   - Audit trail available for legal discovery

---

**Document Status:** ✅ Final  
**Effective Date:** February 5, 2026  
**Review Cycle:** Annually or upon major feature changes  
**Owner:** Engineering Architecture Team  
**Security Review:** Approved by Security Team (February 5, 2026)  
**Legal Review:** Approved by Legal Team (February 5, 2026)

