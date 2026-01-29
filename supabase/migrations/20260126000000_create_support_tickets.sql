-- Support Tickets Migration
-- Creates tables for customer support system

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  admin_response TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints
ALTER TABLE support_tickets
  ADD CONSTRAINT valid_category CHECK (category IN ('general', 'technical', 'billing', 'safety', 'feedback', 'business', 'other')),
  ADD CONSTRAINT valid_status CHECK (status IN ('open', 'in_progress', 'waiting_response', 'resolved', 'closed')),
  ADD CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Create indexes for common queries
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_user_email ON support_tickets(user_email);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);

-- Create ticket_responses table for threaded conversations
CREATE TABLE IF NOT EXISTS ticket_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  responder_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  responder_type TEXT NOT NULL DEFAULT 'user',
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ticket_responses
  ADD CONSTRAINT valid_responder_type CHECK (responder_type IN ('user', 'admin', 'system'));

CREATE INDEX idx_ticket_responses_ticket_id ON ticket_responses(ticket_id);
CREATE INDEX idx_ticket_responses_created_at ON ticket_responses(created_at);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Users can create tickets
CREATE POLICY "Users can create tickets"
  ON support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow anonymous ticket creation (for non-logged in users)
CREATE POLICY "Anonymous can create tickets"
  ON support_tickets
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Admins can update tickets
CREATE POLICY "Admins can update tickets"
  ON support_tickets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- RLS Policies for ticket_responses

-- Users can view responses to their tickets
CREATE POLICY "Users can view own ticket responses"
  ON ticket_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE id = ticket_responses.ticket_id
      AND (
        user_id = auth.uid() OR
        user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

-- Users can add responses to their tickets
CREATE POLICY "Users can respond to own tickets"
  ON ticket_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE id = ticket_responses.ticket_id
      AND (
        user_id = auth.uid() OR
        user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

-- Admins can view all responses
CREATE POLICY "Admins can view all responses"
  ON ticket_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Admins can add responses
CREATE POLICY "Admins can add responses"
  ON ticket_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create function to update ticket timestamp on response
CREATE OR REPLACE FUNCTION update_ticket_on_response()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_tickets
  SET updated_at = NOW()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_ticket_on_response
  AFTER INSERT ON ticket_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_on_response();

-- Add helpful comments
COMMENT ON TABLE support_tickets IS 'Customer support tickets for help requests';
COMMENT ON TABLE ticket_responses IS 'Threaded responses to support tickets';
COMMENT ON COLUMN support_tickets.category IS 'Type of support request: general, technical, billing, safety, feedback, business, other';
COMMENT ON COLUMN support_tickets.status IS 'Current status: open, in_progress, waiting_response, resolved, closed';
COMMENT ON COLUMN support_tickets.priority IS 'Ticket priority: low, normal, high, urgent';
