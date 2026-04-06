ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_business boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_organizer boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS business_description text,
  ADD COLUMN IF NOT EXISTS website_url text;
