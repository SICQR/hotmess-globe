-- Fix switch_persona RPC: client calls switch_persona({ p_persona_id })
-- Previous migration defined (p_user_id, p_new_persona_id) — wrong signature.
-- This version infers the calling user from auth.uid() so no user_id param needed.

CREATE OR REPLACE FUNCTION public.switch_persona(p_persona_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Deactivate all personas for this user
  UPDATE personas
  SET is_active = false
  WHERE user_id = v_user_id;

  -- Activate the requested persona (only if it belongs to this user)
  UPDATE personas
  SET is_active = true
  WHERE id = p_persona_id
    AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Persona not found or not owned by user';
  END IF;

  -- Log the activation
  INSERT INTO persona_activity (persona_id, action_type)
  VALUES (p_persona_id, 'activated')
  ON CONFLICT DO NOTHING;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.switch_persona(UUID) TO authenticated;
