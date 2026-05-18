-- Item 11 — multichannel trusted_contacts schema (Cowork audit 2026-05-18).
-- Applied to prod via Supabase management API in the same session.
-- Repo file added retroactively for snapshot parity.

ALTER TABLE public.trusted_contacts
  ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS contact_telegram_handle TEXT,
  ADD COLUMN IF NOT EXISTS contact_telegram_chat_id BIGINT,
  ADD COLUMN IF NOT EXISTS preferred_channel TEXT
    CHECK (preferred_channel IS NULL OR preferred_channel IN ('sms','whatsapp','telegram','email','all')),
  ADD COLUMN IF NOT EXISTS channels_enabled JSONB
    DEFAULT '{"sms": true, "whatsapp": false, "telegram": false, "email": false}'::jsonb;
