-- =====================================================
-- SUPPORT TICKETS TABLE
-- Customer support tickets for help chat
-- =====================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Ticket owner
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Ticket details
  subject TEXT NOT NULL DEFAULT 'General Support',
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'waiting_reply', 'resolved', 'closed')
  ),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_created ON public.support_tickets(created_at DESC);

-- Policies
CREATE POLICY "Users can view their own tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets"
  ON public.support_tickets FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- SUPPORT MESSAGES TABLE
-- Messages within a support ticket (user + agent)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Reference to ticket
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  
  -- Message details
  sender_type TEXT NOT NULL DEFAULT 'user' CHECK (
    sender_type IN ('user', 'agent', 'system')
  ),
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  
  -- Metadata (for rich messages, attachments, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Read tracking
  read BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_support_messages_ticket ON public.support_messages(ticket_id);
CREATE INDEX idx_support_messages_created ON public.support_messages(created_at);

-- Policies
CREATE POLICY "Users can view messages in their tickets"
  ON public.support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = support_messages.ticket_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their tickets"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_id
      AND user_id = auth.uid()
    )
  );

-- Enable realtime for support messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
