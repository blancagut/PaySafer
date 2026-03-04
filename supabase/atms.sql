-- ─── ATM Locations ───
-- Stores partner ATM locations for the ATM finder feature.

CREATE TABLE IF NOT EXISTS public.atms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  network TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  free_withdrawal BOOLEAN DEFAULT false,
  fee DECIMAL(6, 2) DEFAULT 0,
  currency TEXT DEFAULT 'AED',
  hours TEXT DEFAULT '24/7',
  features TEXT[] DEFAULT '{}',
  rating DECIMAL(2, 1) DEFAULT 4.0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_atms_active ON public.atms(active);
CREATE INDEX IF NOT EXISTS idx_atms_location ON public.atms(lat, lng);

-- RLS  (public read, admin write)
ALTER TABLE public.atms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active ATMs"
  ON public.atms FOR SELECT
  USING (active = true);

-- ─── Seed Data (Dubai area) ───

INSERT INTO public.atms (name, network, address, lat, lng, free_withdrawal, fee, currency, hours, features, rating) VALUES
  ('ENBD ATM', 'Emirates NBD', 'Dubai Mall, Financial Center Road, Downtown Dubai', 25.1972, 55.2744, true, 0, 'AED', '24/7', ARRAY['Cardless','Deposit','Multi-currency'], 4.8),
  ('ADCB ATM', 'ADCB', 'Souk Al Bahar, Old Town Island, Downtown Dubai', 25.1960, 55.2755, true, 0, 'AED', '24/7', ARRAY['Cardless','Deposit'], 4.5),
  ('Mashreq ATM', 'Mashreq', 'Boulevard Plaza, Sheikh Mohammed bin Rashid Blvd', 25.1925, 55.2721, true, 0, 'AED', '24/7', ARRAY['Multi-currency'], 4.3),
  ('FAB ATM', 'First Abu Dhabi Bank', 'Burj Vista Tower 1, Sheikh Zayed Road', 25.1935, 55.2640, false, 5, 'AED', '24/7', ARRAY['Deposit'], 4.1),
  ('RAK Bank ATM', 'RAK Bank', 'City Walk, Phase 2, Al Wasl', 25.2070, 55.2607, false, 10, 'AED', '6 AM - 12 AM', ARRAY[]::TEXT[], 3.9),
  ('DIB ATM', 'Dubai Islamic Bank', 'Business Bay Metro Station', 25.1860, 55.2680, true, 0, 'AED', '24/7', ARRAY['Cardless','Multi-currency'], 4.4),
  ('CBD Exchange ATM', 'CBD', 'Al Fahidi Metro Station, Bur Dubai', 25.2545, 55.2960, true, 0, 'AED/USD', '24/7', ARRAY['Multi-currency','Deposit'], 4.6),
  ('HSBC ATM', 'HSBC', 'DIFC Gate Village, Building 3', 25.2140, 55.2800, false, 15, 'AED/USD/EUR', '24/7', ARRAY['Multi-currency'], 4.2)
ON CONFLICT DO NOTHING;
