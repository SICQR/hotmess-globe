-- ============================================================================
-- DB-08 (CRITICAL) — Stop profiles.last_lat/last_lng/location leaking cross-user
-- CORRECTED after live verification: column-level REVOKE is a NO-OP while a
-- table-level SELECT grant exists (Postgres privileges are additive). The fix is
-- REVOKE table SELECT, then GRANT SELECT on ONLY the safe columns.
-- Verified in a rolled-back prod txn: has_column_privilege(authenticated,last_lat)=false,
-- display_name/other columns still readable.
-- Inherits: sacred-invariant #2/#3, 48-spatial-identity-exposure. Fixes DB-08.
-- ----------------------------------------------------------------------------
-- *** SEQUENCING — MANDATORY ***  Deploy the client change FIRST (queryConfig.jsx
-- stops profiles.select('*'), uses the explicit safe column list) BEFORE this runs,
-- else select('*') throws "permission denied for column last_lat" for all users.
-- ============================================================================

REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (
  id,role,created_at,updated_at,email,display_name,avatar_url,location_consent_mode,
  location_consent_granted_at,location_last_updated_at,cookie_preferences,onboarding_completed,
  onboarding_completed_at,avatar_type,persona_type,tags,telegram_id,telegram_username,username,
  active_persona_id,consent_accepted,full_name,phone,age_verified,community_attested_at,pin_code_hash,
  public_attributes,has_agreed_terms,has_consented_data,has_consented_gps,is_visible,bio,onboarding_stage,
  safety_opt_in,last_loc_ts,is_demo,city,referral_code,location_precision,location_radius_km,globe_show_on_map,
  last_seen,is_online,is_business,is_organizer,business_type,business_name,business_description,website_url,
  is_verified,verification_level,verified_at,age,gender,looking_for,position,show_distance,allow_messages_from,
  read_receipts,show_online_status,is_admin,auth_user_id,location_name,profile_type,membership_tier,
  subscription_tier,loc_accuracy_m,stripe_subscription_id,subscription_status,subscription_ends_at,
  location_consent,location_consent_at,location_area,last_seen_at,lifestyle_preferences,support_preferences,
  backup_contacts,avatar_scan_status,avatar_scan_at,age_verified_at,age_verification_method,auth_method,
  founding_status,locked_username,username_locked_at,founding_member_waitlist_id,telegram_chat_id,
  notification_channel,telegram_link_token,beta_access_until,is_beta_cohort_override,visibility_state,consent_push_intent
) ON public.profiles TO anon, authenticated;

-- last_lat, last_lng, location are intentionally OMITTED -> precise coords no longer
-- returnable via PostgREST. Owner's own coords come from device GPS / presence path; if
-- a self-read is needed, add a SECDEF get_my_location() scoped to auth.uid().
-- DB-09 (follow-up): email/phone/pin_code_hash/stripe/telegram are still granted above to
-- avoid breaking the email-keyed grid; minimise them in the DB-09 profiles_card refactor.

-- VERIFY: as authenticated user B, SELECT last_lat FROM profiles WHERE id<>auth.uid()
--   -> permission denied for column last_lat (i.e. blocked).
