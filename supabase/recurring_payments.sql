-- ================================================
-- PaySafer 2026: Recurring Payments System
-- ================================================

DO $$ BEGIN
  CREATE TYPE recurrence_frequency AS ENUM ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE recurring_status AS ENUM ('active', 'paused', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Recurring Payments Table ───
CREATE TABLE IF NOT EXISTS recurring_payments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id         UUID NOT NULL REFERENCES auth.users(id),
  recipient_id      UUID NOT NULL REFERENCES auth.users(id),
  amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency          TEXT NOT NULL DEFAULT 'EUR',
  frequency         recurrence_frequency NOT NULL DEFAULT 'monthly',
  description       TEXT,
  status            recurring_status NOT NULL DEFAULT 'active',
  next_execution    TIMESTAMPTZ NOT NULL,
  last_executed_at  TIMESTAMPTZ,
  executions_count  INTEGER NOT NULL DEFAULT 0,
  max_executions    INTEGER, -- NULL = unlimited
  failure_count     INTEGER NOT NULL DEFAULT 0,
  max_failures      INTEGER NOT NULL DEFAULT 3,
  start_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date          DATE, -- NULL = no end date
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT different_users CHECK (sender_id != recipient_id)
);

-- ─── Recurring Payment Executions Log ───
CREATE TABLE IF NOT EXISTS recurring_payment_logs (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_id        UUID NOT NULL REFERENCES recurring_payments(id) ON DELETE CASCADE,
  transfer_id         UUID REFERENCES transfers(id),
  status              TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  amount              NUMERIC(12,2) NOT NULL,
  error_message       TEXT,
  executed_at         TIMESTAMPTZ DEFAULT now()
);

-- ─── Execute a recurring payment ───
CREATE OR REPLACE FUNCTION execute_recurring_payment(p_recurring_id UUID)
RETURNS VOID AS $$
DECLARE
  v_rec RECORD;
  v_transfer_id UUID;
  v_next TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_rec FROM recurring_payments WHERE id = p_recurring_id FOR UPDATE;

  IF v_rec IS NULL OR v_rec.status != 'active' THEN
    RETURN;
  END IF;

  IF v_rec.next_execution > now() THEN
    RETURN; -- Not yet due
  END IF;

  -- Attempt transfer
  BEGIN
    SELECT execute_transfer(
      v_rec.sender_id,
      v_rec.recipient_id,
      v_rec.amount,
      v_rec.currency,
      COALESCE(v_rec.description, 'Recurring payment')
    ) INTO v_transfer_id;

    -- Log success
    INSERT INTO recurring_payment_logs (recurring_id, transfer_id, status, amount)
    VALUES (p_recurring_id, v_transfer_id, 'success', v_rec.amount);

    -- Update recurring record
    v_next := CASE v_rec.frequency
      WHEN 'daily' THEN v_rec.next_execution + INTERVAL '1 day'
      WHEN 'weekly' THEN v_rec.next_execution + INTERVAL '7 days'
      WHEN 'biweekly' THEN v_rec.next_execution + INTERVAL '14 days'
      WHEN 'monthly' THEN v_rec.next_execution + INTERVAL '1 month'
      WHEN 'quarterly' THEN v_rec.next_execution + INTERVAL '3 months'
      WHEN 'yearly' THEN v_rec.next_execution + INTERVAL '1 year'
    END;

    UPDATE recurring_payments SET
      next_execution = v_next,
      last_executed_at = now(),
      executions_count = executions_count + 1,
      failure_count = 0,
      updated_at = now(),
      -- Auto-complete if max reached or end_date passed
      status = CASE
        WHEN v_rec.max_executions IS NOT NULL AND v_rec.executions_count + 1 >= v_rec.max_executions THEN 'completed'::recurring_status
        WHEN v_rec.end_date IS NOT NULL AND v_next::date > v_rec.end_date THEN 'completed'::recurring_status
        ELSE 'active'::recurring_status
      END
    WHERE id = p_recurring_id;

  EXCEPTION WHEN OTHERS THEN
    -- Log failure
    INSERT INTO recurring_payment_logs (recurring_id, status, amount, error_message)
    VALUES (p_recurring_id, 'failed', v_rec.amount, SQLERRM);

    UPDATE recurring_payments SET
      failure_count = failure_count + 1,
      status = CASE WHEN v_rec.failure_count + 1 >= v_rec.max_failures THEN 'failed'::recurring_status ELSE 'active'::recurring_status END,
      updated_at = now()
    WHERE id = p_recurring_id;
  END;
END;
$$ LANGUAGE plpgsql;

-- ─── Process all due recurring payments (call from cron) ───
CREATE OR REPLACE FUNCTION process_due_recurring_payments()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    SELECT id FROM recurring_payments
    WHERE status = 'active' AND next_execution <= now()
    ORDER BY next_execution ASC
    LIMIT 100
  LOOP
    PERFORM execute_recurring_payment(v_rec.id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ─── RLS Policies ───
ALTER TABLE recurring_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurring payments" ON recurring_payments
  FOR SELECT USING (auth.uid() IN (sender_id, recipient_id));

CREATE POLICY "Users can create recurring payments" ON recurring_payments
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Sender can update own recurring payments" ON recurring_payments
  FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "Users can view own recurring logs" ON recurring_payment_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recurring_payments rp
      WHERE rp.id = recurring_payment_logs.recurring_id
        AND auth.uid() IN (rp.sender_id, rp.recipient_id)
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recurring_sender ON recurring_payments(sender_id);
CREATE INDEX IF NOT EXISTS idx_recurring_recipient ON recurring_payments(recipient_id);
CREATE INDEX IF NOT EXISTS idx_recurring_next ON recurring_payments(next_execution) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_recurring_logs_recurring ON recurring_payment_logs(recurring_id);
