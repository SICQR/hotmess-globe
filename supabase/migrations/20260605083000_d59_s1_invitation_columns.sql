-- D59 S1 — Invitation dispatcher columns.
-- Additive only. Safe to apply pre-merge. Reverses cleanly via DROP COLUMN.
--
-- Doctrine: Safety Constitution (account-free acceptance), D59 §A.1 +
-- §A.5 (consent at acceptance), D59 Recipient Identity Ownership amendment.

ALTER TABLE public.trusted_contacts
  ADD COLUMN IF NOT EXISTS invitation_sent_at          timestamptz,
  ADD COLUMN IF NOT EXISTS acceptance_token            text,
  ADD COLUMN IF NOT EXISTS acceptance_token_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_trusted_contacts_pending_invite
  ON public.trusted_contacts (user_id)
  WHERE invitation_sent_at IS NULL AND notify_on_sos = true;

CREATE INDEX IF NOT EXISTS idx_trusted_contacts_active_token
  ON public.trusted_contacts (id)
  WHERE acceptance_token IS NOT NULL;

COMMENT ON COLUMN public.trusted_contacts.invitation_sent_at IS
  'D59 S1 — when the invitation was last dispatched. NULL = never invited.';
COMMENT ON COLUMN public.trusted_contacts.acceptance_token IS
  'D59 S1 — HMAC token embedded in the acceptance URL. Verified anonymously at /contact/accept.';
COMMENT ON COLUMN public.trusted_contacts.acceptance_token_expires_at IS
  'D59 S1 — token expiry timestamp. Default 30 days from issue. Re-issued on resend.';
