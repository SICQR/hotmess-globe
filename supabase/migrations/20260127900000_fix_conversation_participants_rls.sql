-- Fix infinite recursion in conversation_participants RLS policy
-- The previous policy referenced the same table in a subquery, causing recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS conversation_participants_select_conv ON public.conversation_participants;

-- Create a security definer function to check participation without triggering RLS
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id
    AND account_id = auth.uid()
  )
$$;

-- Recreate the policy using the security definer function
-- This avoids recursion because the function bypasses RLS
CREATE POLICY conversation_participants_select_conv
  ON public.conversation_participants
  FOR SELECT
  TO authenticated
  USING (
    public.is_conversation_participant(conversation_id)
  );

-- Also grant execute on the function
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID) TO authenticated;

-- Update the user's own select policy to use direct check (more efficient)
DROP POLICY IF EXISTS conversation_participants_select_own ON public.conversation_participants;
CREATE POLICY conversation_participants_select_own
  ON public.conversation_participants
  FOR SELECT
  TO authenticated
  USING (account_id = auth.uid());
