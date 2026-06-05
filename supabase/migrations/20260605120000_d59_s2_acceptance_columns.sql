-- D59 S2 — Acceptance landing page columns.
--
-- The recipient lands on /contact/accept/:id, verifies anonymously via the
-- HMAC token, and either:
--   (a) Accepts and confirms their own contact details + channel preference
--       (D59 Recipient Identity Ownership amendment — confirmed_* are SoT
--       for SOS dispatch post-accept), OR
--   (b) Declines, optionally with a brief reason (D60 §C.6 dignified decline).
--
-- Additive only. Reverses cleanly via DROP COLUMN. Safe to apply pre-merge.
--
-- Doctrine:
--   - Safety Constitution — account-free acceptance invariant
--   - D59 §A.1 + §A.5 — consent at acceptance, two-party agreement
--   - D59 Recipient Identity Ownership amendment — confirmed_* > contact_*
--   - D60 §C.6 — dignified decline path
--   - D58 S0 — payload identity (drives confirmed_* dispatch substitution)

ALTER TABLE public.trusted_contacts
  ADD COLUMN IF NOT EXISTS declined_at                timestamptz,
  ADD COLUMN IF NOT EXISTS decline_reason             text,
  ADD COLUMN IF NOT EXISTS confirmed_phone            text,
  ADD COLUMN IF NOT EXISTS confirmed_telegram_handle  text,
  ADD COLUMN IF NOT EXISTS confirmed_whatsapp         text,
  ADD COLUMN IF NOT EXISTS confirmed_email            text,
  ADD COLUMN IF NOT EXISTS channel_preference_order   text[];

-- Acceptance state index — dispatcher filters on accepted_at IS NOT NULL
-- AND declined_at IS NULL. Partial index keeps it tight.
CREATE INDEX IF NOT EXISTS idx_trusted_contacts_accepted_live
  ON public.trusted_contacts (user_id)
  WHERE accepted_at IS NOT NULL AND declined_at IS NULL;

COMMENT ON COLUMN public.trusted_contacts.declined_at IS
  'D59 S2 — when the recipient declined the trusted-contact invitation. '
  'NULL = not declined. Mutually exclusive with accepted_at by application logic.';
COMMENT ON COLUMN public.trusted_contacts.decline_reason IS
  'D59 S2 / D60 §C.6 — optional free-text reason at decline. Max 500 chars enforced at API.';
COMMENT ON COLUMN public.trusted_contacts.confirmed_phone IS
  'D59 Recipient Identity Ownership — phone confirmed BY the recipient at acceptance. '
  'Source of truth for SOS dispatch post-accept. Overrides nominator-supplied contact_phone.';
COMMENT ON COLUMN public.trusted_contacts.confirmed_telegram_handle IS
  'D59 Recipient Identity Ownership — Telegram handle confirmed by recipient. '
  'Used for SOS dispatch ahead of nominator-supplied contact_telegram_handle.';
COMMENT ON COLUMN public.trusted_contacts.confirmed_whatsapp IS
  'D59 Recipient Identity Ownership — WhatsApp confirmed by recipient.';
COMMENT ON COLUMN public.trusted_contacts.confirmed_email IS
  'D59 Recipient Identity Ownership — email confirmed by recipient at acceptance.';
COMMENT ON COLUMN public.trusted_contacts.channel_preference_order IS
  'D59 S2 — ordered array of channels (e.g. {telegram,sms,whatsapp,email}) the '
  'recipient prefers SOS reaches them on. Dispatcher walks in order, stops on first success. '
  'NULL = use system default order.';
