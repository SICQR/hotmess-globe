-- Multi-Profile Personas: Messaging schema updates
-- Add sender_profile_id to messages and create conversation_participants

-- Add sender_profile_id to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS sender_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add recipient_profile_id for routing (optional but useful)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS recipient_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_sender_profile ON public.messages(sender_profile_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_profile ON public.messages(recipient_profile_id);

-- Conversation participants join table
-- Enforces "one persona per participant per conversation"
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_account ON public.conversation_participants(account_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_profile ON public.conversation_participants(profile_id);

-- RLS Policies for conversation_participants
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Participants can see their own conversation bindings
DROP POLICY IF EXISTS conversation_participants_select_own ON public.conversation_participants;
CREATE POLICY conversation_participants_select_own
  ON public.conversation_participants
  FOR SELECT
  TO authenticated
  USING (account_id = auth.uid());

-- Participants can see other participants in their conversations
DROP POLICY IF EXISTS conversation_participants_select_conv ON public.conversation_participants;
CREATE POLICY conversation_participants_select_conv
  ON public.conversation_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id
      AND cp2.account_id = auth.uid()
    )
  );

-- Users can insert their own participation
DROP POLICY IF EXISTS conversation_participants_insert ON public.conversation_participants;
CREATE POLICY conversation_participants_insert
  ON public.conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (account_id = auth.uid());

-- Users can update their own participation (e.g., switch profile in future)
DROP POLICY IF EXISTS conversation_participants_update ON public.conversation_participants;
CREATE POLICY conversation_participants_update
  ON public.conversation_participants
  FOR UPDATE
  TO authenticated
  USING (account_id = auth.uid())
  WITH CHECK (account_id = auth.uid());
