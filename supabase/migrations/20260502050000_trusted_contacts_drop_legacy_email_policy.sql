-- Drop the legacy {public} role policy that joined trusted_contacts to auth.jwt() ->> 'email'.
-- It is fully redundant with the three uid-scoped {authenticated} policies, and the email-based
-- match was strictly looser than auth.uid() = user_id. Removing closes that gap.
DROP POLICY IF EXISTS "users can manage own contacts" ON trusted_contacts;
