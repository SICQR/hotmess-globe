-- MEGA-3 §3.3: simplify personas to MAIN / TRAVEL / AFTERHOURS
-- - rename WEEKEND -> AFTERHOURS
-- - archive CUSTOM (kept in CHECK enum so existing rows stay valid)
-- - drop inheritance from UI; column retained for back-compat reads
-- - load query in PersonaContext now filters archived rows

ALTER TABLE public.personas
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.personas
  DROP CONSTRAINT IF EXISTS personas_persona_type_check;

UPDATE public.personas SET persona_type = 'afterhours' WHERE persona_type = 'weekend';

UPDATE public.personas
   SET archived_at = COALESCE(archived_at, now()),
       is_active   = false
 WHERE persona_type = 'custom' AND archived_at IS NULL;

ALTER TABLE public.personas
  ADD CONSTRAINT personas_persona_type_check
  CHECK (persona_type IN ('main','travel','afterhours','custom'));

CREATE INDEX IF NOT EXISTS idx_personas_archived
  ON public.personas (archived_at) WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_personas_user_active
  ON public.personas (user_id) WHERE archived_at IS NULL;

COMMENT ON COLUMN public.personas.persona_type IS
  'main | travel | afterhours. "custom" is DEPRECATED (existing rows archived; UI no longer offers it).';
COMMENT ON COLUMN public.personas.inherit_from_main IS
  'DEPRECATED 2026-05-07. Inheritance simplified out — each persona is independent. Column retained for back-compat reads only.';
COMMENT ON COLUMN public.personas.archived_at IS
  'Soft-delete timestamp. NULL = active persona. Set automatically when CUSTOM type retired.';
