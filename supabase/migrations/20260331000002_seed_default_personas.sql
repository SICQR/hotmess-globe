-- ============================================================
-- 20260331000002 — Seed default personas for existing users
-- + update trigger to auto-seed for new users
-- ============================================================
-- persona_type constraint: ('main','travel','weekend','custom')

-- 1. Seed a 'main' persona for every user who doesn't have one yet
INSERT INTO public.personas (
  id,
  user_id,
  persona_type,
  display_name,
  is_active,
  is_default,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  au.id,
  'main',
  COALESCE(p.display_name, split_part(au.email, '@', 1), 'Main'),
  true,
  true,
  now(),
  now()
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.personas pe WHERE pe.user_id = au.id
);

-- 2. Update the create_profile_for_user trigger to also seed a default persona
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.personas (
    id,
    user_id,
    persona_type,
    display_name,
    is_active,
    is_default,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    NEW.id,
    'main',
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), 'Main'),
    true,
    true,
    now(),
    now()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
