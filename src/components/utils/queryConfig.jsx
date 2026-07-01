// DB-08: profiles reads exclude precise last_lat/last_lng/location (anti-stalking).
import { supabase } from '@/components/utils/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { QUERY_CONFIG } from './constants';

/**
 * Global user cache - prevents redundant API calls
 * Use this hook instead of fetching users in every component
 */
export function useAllUsers() {
  return useQuery({
    queryKey: ['all-users-global'],
    queryFn: async () => {
      try {
        const isAuth = await supabase.auth.getSession().then(r => !!r.data.session);
        if (!isAuth) return [];
        const { data } = await supabase.from('profiles').select('id,role,created_at,updated_at,email,display_name,avatar_url,location_consent_mode,location_consent_granted_at,location_last_updated_at,onboarding_completed,onboarding_completed_at,avatar_type,persona_type,tags,username,active_persona_id,consent_accepted,full_name,age_verified,community_attested_at,public_attributes,has_agreed_terms,has_consented_data,has_consented_gps,is_visible,bio,onboarding_stage,safety_opt_in,last_loc_ts,is_demo,city,referral_code,location_precision,location_radius_km,globe_show_on_map,last_seen,is_online,is_business,is_organizer,business_type,business_name,business_description,website_url,is_verified,verification_level,verified_at,age,gender,looking_for,position,show_distance,allow_messages_from,read_receipts,show_online_status,is_admin,auth_user_id,location_name,profile_type,membership_tier,subscription_tier,loc_accuracy_m,location_consent,location_consent_at,location_area,last_seen_at,lifestyle_preferences,support_preferences,avatar_scan_status,avatar_scan_at,age_verified_at,age_verification_method,auth_method,founding_status,locked_username,username_locked_at,founding_member_waitlist_id,notification_channel,beta_access_until,is_beta_cohort_override,visibility_state,consent_push_intent');
        return data || [];
      } catch (error) {
        console.error('Failed to fetch users:', error);
        return [];
      }
    },
    staleTime: QUERY_CONFIG.USER_STALE_TIME,
    cacheTime: QUERY_CONFIG.USER_CACHE_TIME,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/**
 * Get current authenticated user
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        let { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const { data: profile } = await supabase.from('profiles').select('id,role,created_at,updated_at,email,display_name,avatar_url,location_consent_mode,location_consent_granted_at,location_last_updated_at,cookie_preferences,onboarding_completed,onboarding_completed_at,avatar_type,persona_type,tags,telegram_id,telegram_username,username,active_persona_id,consent_accepted,full_name,phone,age_verified,community_attested_at,pin_code_hash,public_attributes,has_agreed_terms,has_consented_data,has_consented_gps,is_visible,bio,onboarding_stage,safety_opt_in,last_loc_ts,is_demo,city,referral_code,location_precision,location_radius_km,globe_show_on_map,last_seen,is_online,is_business,is_organizer,business_type,business_name,business_description,website_url,is_verified,verification_level,verified_at,age,gender,looking_for,position,show_distance,allow_messages_from,read_receipts,show_online_status,is_admin,auth_user_id,location_name,profile_type,membership_tier,subscription_tier,loc_accuracy_m,stripe_subscription_id,subscription_status,subscription_ends_at,location_consent,location_consent_at,location_area,last_seen_at,lifestyle_preferences,support_preferences,backup_contacts,avatar_scan_status,avatar_scan_at,age_verified_at,age_verification_method,auth_method,founding_status,locked_username,username_locked_at,founding_member_waitlist_id,telegram_chat_id,notification_channel,telegram_link_token,beta_access_until,is_beta_cohort_override,visibility_state,consent_push_intent').eq('id', user.id).maybeSingle();
        return { ...user, ...(profile || {}), auth_user_id: user.id, email: user.email || profile?.email };
      } catch (error) {
        console.error('Failed to fetch current user:', error);
        return null;
      }
    },
    staleTime: 0,
    cacheTime: 0,
    retry: false,
    enabled: true,
  });
}

/**
 * Global beacons cache
 */
export function useAllBeacons() {
  return useQuery({
    queryKey: ['all-beacons-global'],
    queryFn: () => supabase.from('beacons').select('*'),
    staleTime: QUERY_CONFIG.BEACON_STALE_TIME,
    cacheTime: QUERY_CONFIG.BEACON_CACHE_TIME,
  });
}
