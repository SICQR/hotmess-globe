/**
 * Multi-Profile Personas: Core utility functions
 * - resolveEffectiveProfile: Merges main profile with secondary overrides
 * - canViewerSeeProfile: Evaluates visibility rules
 */

import { getSupabaseServerClients, json } from '../routing/_utils.js';

// Maximum secondary profiles per tier
export const MAX_SECONDARY_PROFILES = {
  basic: 5,
  premium: 10,
  enterprise: 20,
};

// System-defined profile types
export const SYSTEM_PROFILE_TYPES = ['MAIN', 'TRAVEL', 'WEEKEND'];

/**
 * Check if a profile is expired
 * @param {Object} profile - Profile record
 * @returns {boolean}
 */
export const isProfileExpired = (profile) => {
  if (!profile?.expires_at) return false;
  return new Date(profile.expires_at) <= new Date();
};

/**
 * Check if a profile is currently active (active flag and not expired)
 * @param {Object} profile - Profile record
 * @returns {boolean}
 */
export const isProfileActive = (profile) => {
  if (!profile) return false;
  if (profile.deleted_at) return false;
  if (!profile.active) return false;
  if (isProfileExpired(profile)) return false;
  return true;
};

/**
 * Get the main profile for an account
 * @param {Object} params
 * @param {string} params.accountId - The account/auth user ID
 * @param {Object} params.serviceClient - Supabase service client
 * @returns {Promise<Object|null>}
 */
export const getMainProfile = async ({ accountId, serviceClient }) => {
  const { data, error } = await serviceClient
    .from('profiles')
    .select('*')
    .eq('account_id', accountId)
    .eq('kind', 'MAIN')
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    console.error('[getMainProfile] Error:', error);
    return null;
  }
  return data;
};

/**
 * Get the User record for an account (for merging profile data)
 * @param {Object} params
 * @param {string} params.accountId - The account/auth user ID
 * @param {Object} params.serviceClient - Supabase service client
 * @returns {Promise<Object|null>}
 */
export const getUserRecord = async ({ accountId, serviceClient }) => {
  const { data, error } = await serviceClient
    .from('User')
    .select('*')
    .eq('auth_user_id', accountId)
    .maybeSingle();

  if (error) {
    console.error('[getUserRecord] Error:', error);
    return null;
  }
  return data;
};

/**
 * Resolve effective profile by merging main profile data with secondary overrides
 * 
 * @param {Object} params
 * @param {string} params.profileId - The profile ID to resolve
 * @param {Object} params.serviceClient - Supabase service client
 * @returns {Promise<Object|null>} - The effective profile with all fields resolved
 */
export const resolveEffectiveProfile = async ({ profileId, serviceClient }) => {
  // Get the profile
  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .is('deleted_at', null)
    .maybeSingle();

  if (profileError || !profile) {
    console.error('[resolveEffectiveProfile] Profile not found:', profileId, profileError);
    return null;
  }

  // Get the User record for the account (base profile data)
  const userRecord = await getUserRecord({ accountId: profile.account_id, serviceClient });
  if (!userRecord) {
    console.error('[resolveEffectiveProfile] User record not found for account:', profile.account_id);
    return null;
  }

  // For MAIN profiles, just return the user record with profile metadata
  if (profile.kind === 'MAIN') {
    return {
      ...userRecord,
      profile_id: profile.id,
      profile_kind: profile.kind,
      profile_type_key: profile.type_key,
      profile_type_label: profile.type_label || 'Main Profile',
      profile_active: profile.active,
      profile_expires_at: profile.expires_at,
      // Use profile location override if enabled, else user location
      effective_lat: profile.override_location_enabled ? profile.override_location_lat : userRecord.lat,
      effective_lng: profile.override_location_enabled ? profile.override_location_lng : userRecord.lng,
      effective_location_label: profile.override_location_enabled ? profile.override_location_label : userRecord.city,
    };
  }

  // For SECONDARY profiles, get overrides and merge
  const { data: overrides, error: overridesError } = await serviceClient
    .from('profile_overrides')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (overridesError) {
    console.error('[resolveEffectiveProfile] Error fetching overrides:', overridesError);
  }

  const overridesJson = overrides?.overrides_json || {};
  const photosMode = overrides?.photos_mode || 'INHERIT';
  const photosJson = overrides?.photos_json || null;

  // Build effective profile based on inherit_mode
  let effectiveProfile = { ...userRecord };

  switch (profile.inherit_mode) {
    case 'FULL_INHERIT':
      // Use all main profile fields, no overrides except metadata
      break;

    case 'OVERRIDE_FIELDS':
      // Start with main profile, apply specific field overrides
      Object.keys(overridesJson).forEach((key) => {
        if (overridesJson[key] !== undefined && overridesJson[key] !== null) {
          effectiveProfile[key] = overridesJson[key];
        }
      });
      break;

    case 'OVERRIDE_ALL':
      // Still merge (for fields not overridden), but UI treats as independent
      Object.keys(overridesJson).forEach((key) => {
        if (overridesJson[key] !== undefined && overridesJson[key] !== null) {
          effectiveProfile[key] = overridesJson[key];
        }
      });
      break;

    default:
      break;
  }

  // Handle photos based on photos_mode
  let effectivePhotos = effectiveProfile.photos || [];
  if (photosMode === 'REPLACE' && photosJson) {
    effectivePhotos = photosJson;
  } else if (photosMode === 'ADD' && photosJson) {
    effectivePhotos = [...(effectiveProfile.photos || []), ...(photosJson || [])];
  }
  // 'INHERIT' keeps the main profile photos

  // Apply location override if enabled
  const effectiveLat = profile.override_location_enabled ? profile.override_location_lat : effectiveProfile.lat;
  const effectiveLng = profile.override_location_enabled ? profile.override_location_lng : effectiveProfile.lng;
  const effectiveLocationLabel = profile.override_location_enabled 
    ? profile.override_location_label 
    : effectiveProfile.city;

  return {
    ...effectiveProfile,
    photos: effectivePhotos,
    profile_id: profile.id,
    profile_kind: profile.kind,
    profile_type_key: profile.type_key,
    profile_type_label: profile.type_label,
    profile_active: profile.active,
    profile_expires_at: profile.expires_at,
    effective_lat: effectiveLat,
    effective_lng: effectiveLng,
    effective_location_label: effectiveLocationLabel,
  };
};

/**
 * Evaluate if a viewer can see a target profile based on visibility rules
 * 
 * Evaluation order:
 * 1. Deny if profile inactive or expired
 * 2. Allow if viewer is owner (preview mode)
 * 3. Deny if viewer is on blocklist
 * 4. If allowlist has entries, only allow if viewer is on allowlist
 * 5. Evaluate attribute filters (all must pass)
 * 6. Allow only if PUBLIC rule is enabled and filters passed
 * 
 * @param {Object} params
 * @param {string} params.viewerUserId - The viewer's auth user ID
 * @param {Object} params.viewerAttributes - Viewer's attributes for filter matching
 * @param {string} params.targetProfileId - The profile ID to check visibility for
 * @param {Object} params.serviceClient - Supabase service client
 * @returns {Promise<{allowed: boolean, reason: string}>}
 */
export const canViewerSeeProfile = async ({
  viewerUserId,
  viewerAttributes = {},
  targetProfileId,
  serviceClient,
}) => {
  // Get the target profile
  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('*')
    .eq('id', targetProfileId)
    .maybeSingle();

  if (profileError || !profile) {
    return { allowed: false, reason: 'profile_not_found' };
  }

  // 1. Check if profile is deleted
  if (profile.deleted_at) {
    return { allowed: false, reason: 'profile_deleted' };
  }

  // 2. Check if profile is inactive or expired
  if (!isProfileActive(profile)) {
    // Still allow owner to see their own inactive profiles
    if (profile.account_id === viewerUserId) {
      return { allowed: true, reason: 'owner_preview' };
    }
    return { allowed: false, reason: 'profile_inactive_or_expired' };
  }

  // 3. Allow if viewer is owner (preview mode)
  if (profile.account_id === viewerUserId) {
    return { allowed: true, reason: 'owner_preview' };
  }

  // 4. Check blocklist - immediate deny
  const { data: blocklisted, error: blockError } = await serviceClient
    .from('profile_blocklist_users')
    .select('viewer_user_id')
    .eq('profile_id', targetProfileId)
    .eq('viewer_user_id', viewerUserId)
    .maybeSingle();

  if (blockError) {
    console.error('[canViewerSeeProfile] Blocklist check error:', blockError);
  }

  if (blocklisted) {
    return { allowed: false, reason: 'blocked' };
  }

  // 5. Check allowlist - if entries exist, viewer must be on it
  const { data: allowlistEntries, error: allowlistError } = await serviceClient
    .from('profile_allowlist_users')
    .select('viewer_user_id')
    .eq('profile_id', targetProfileId);

  if (allowlistError) {
    console.error('[canViewerSeeProfile] Allowlist check error:', allowlistError);
  }

  const hasAllowlist = allowlistEntries && allowlistEntries.length > 0;
  if (hasAllowlist) {
    const isOnAllowlist = allowlistEntries.some((e) => e.viewer_user_id === viewerUserId);
    if (!isOnAllowlist) {
      return { allowed: false, reason: 'not_on_allowlist' };
    }
    // If on allowlist, skip further checks and allow
    return { allowed: true, reason: 'allowlisted' };
  }

  // 6. Get visibility rules and evaluate
  const { data: rules, error: rulesError } = await serviceClient
    .from('profile_visibility_rules')
    .select('*')
    .eq('profile_id', targetProfileId)
    .eq('enabled', true)
    .order('priority', { ascending: true });

  if (rulesError) {
    console.error('[canViewerSeeProfile] Rules fetch error:', rulesError);
    return { allowed: false, reason: 'rules_error' };
  }

  // Check for PUBLIC rule
  const publicRule = rules?.find((r) => r.rule_type === 'PUBLIC');
  if (!publicRule) {
    return { allowed: false, reason: 'no_public_rule' };
  }

  // 7. Evaluate attribute filters
  const filterRules = rules?.filter((r) => r.rule_type === 'FILTER_VIEWER_ATTRIBUTES') || [];
  
  for (const filterRule of filterRules) {
    const config = filterRule.rule_config || {};
    const filtersPass = evaluateAttributeFilters(config, viewerAttributes);
    if (!filtersPass) {
      return { allowed: false, reason: 'filter_not_matched' };
    }
  }

  // Also check normalized viewer filters table
  const { data: viewerFilters, error: filtersError } = await serviceClient
    .from('profile_viewer_filters')
    .select('*')
    .eq('profile_id', targetProfileId);

  if (filtersError) {
    console.error('[canViewerSeeProfile] Viewer filters fetch error:', filtersError);
  }

  if (viewerFilters && viewerFilters.length > 0) {
    for (const filter of viewerFilters) {
      const matches = evaluateSingleFilter(filter, viewerAttributes);
      if (!matches) {
        return { allowed: false, reason: 'viewer_filter_not_matched' };
      }
    }
  }

  // All checks passed
  return { allowed: true, reason: 'public' };
};

/**
 * Evaluate attribute filters from rule config
 * @param {Object} config - Filter configuration from rule_config
 * @param {Object} viewerAttributes - Viewer's attributes
 * @returns {boolean} - True if all filters pass
 */
const evaluateAttributeFilters = (config, viewerAttributes) => {
  if (!config || Object.keys(config).length === 0) {
    return true; // No filters = pass
  }

  // Location radius filter
  if (config.location_radius_km && viewerAttributes.lat && viewerAttributes.lng) {
    const centerLat = config.center_lat || config.location?.lat;
    const centerLng = config.center_lng || config.location?.lng;
    if (centerLat && centerLng) {
      const distance = haversineDistance(
        viewerAttributes.lat,
        viewerAttributes.lng,
        centerLat,
        centerLng
      );
      if (distance > config.location_radius_km * 1000) {
        return false;
      }
    }
  }

  // Sexual preferences filter
  if (config.sexual_preferences && Array.isArray(config.sexual_preferences)) {
    const viewerPrefs = viewerAttributes.sexual_preferences || viewerAttributes.looking_for || [];
    const viewerPrefsArray = Array.isArray(viewerPrefs) ? viewerPrefs : [viewerPrefs];
    const hasMatch = config.sexual_preferences.some((pref) => viewerPrefsArray.includes(pref));
    if (!hasMatch) {
      return false;
    }
  }

  // Age range filter
  if (config.age_min || config.age_max) {
    const viewerAge = viewerAttributes.age;
    if (viewerAge !== undefined && viewerAge !== null) {
      if (config.age_min && viewerAge < config.age_min) return false;
      if (config.age_max && viewerAge > config.age_max) return false;
    }
  }

  // Tribes filter
  if (config.tribes && Array.isArray(config.tribes)) {
    const viewerTribes = viewerAttributes.tribes || [];
    const viewerTribesArray = Array.isArray(viewerTribes) ? viewerTribes : [viewerTribes];
    const hasMatch = config.tribes.some((tribe) => viewerTribesArray.includes(tribe));
    if (!hasMatch) {
      return false;
    }
  }

  return true;
};

/**
 * Evaluate a single normalized filter
 * @param {Object} filter - Filter record from profile_viewer_filters
 * @param {Object} viewerAttributes - Viewer's attributes
 * @returns {boolean}
 */
const evaluateSingleFilter = (filter, viewerAttributes) => {
  const { attribute, operator, value_json: value } = filter;
  const viewerValue = viewerAttributes[attribute];

  switch (operator) {
    case 'EQ':
      return viewerValue === value;

    case 'NE':
      return viewerValue !== value;

    case 'IN':
      if (Array.isArray(value)) {
        return value.includes(viewerValue);
      }
      return false;

    case 'NOT_IN':
      if (Array.isArray(value)) {
        return !value.includes(viewerValue);
      }
      return true;

    case 'GTE':
      return viewerValue >= value;

    case 'LTE':
      return viewerValue <= value;

    case 'RADIUS_KM':
      if (viewerAttributes.lat && viewerAttributes.lng && value.lat && value.lng && value.radius) {
        const distance = haversineDistance(
          viewerAttributes.lat,
          viewerAttributes.lng,
          value.lat,
          value.lng
        );
        return distance <= value.radius * 1000;
      }
      return true; // Skip if no location data

    default:
      return true;
  }
};

/**
 * Haversine distance calculation in meters
 */
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Validate profile creation/update data
 * @param {Object} data - Profile data to validate
 * @param {boolean} isCreate - Whether this is a create operation
 * @returns {{valid: boolean, errors: string[]}}
 */
export const validateProfileData = (data, isCreate = false) => {
  const errors = [];

  if (isCreate) {
    // Secondary profiles require type_key
    if (data.kind === 'SECONDARY' && !data.type_key) {
      errors.push('type_key is required for secondary profiles');
    }
  }

  // Validate type_label length
  if (data.type_label && data.type_label.length > 50) {
    errors.push('type_label must be 50 characters or less');
  }

  // Validate expires_at is in the future
  if (data.expires_at) {
    const expiryDate = new Date(data.expires_at);
    if (isNaN(expiryDate.getTime())) {
      errors.push('expires_at must be a valid date');
    } else if (expiryDate <= new Date()) {
      errors.push('expires_at must be in the future');
    }
  }

  // Validate inherit_mode
  const validInheritModes = ['FULL_INHERIT', 'OVERRIDE_FIELDS', 'OVERRIDE_ALL'];
  if (data.inherit_mode && !validInheritModes.includes(data.inherit_mode)) {
    errors.push(`inherit_mode must be one of: ${validInheritModes.join(', ')}`);
  }

  // Validate location override
  if (data.override_location_enabled) {
    if (data.override_location_lat === undefined || data.override_location_lat === null) {
      errors.push('override_location_lat is required when override_location_enabled is true');
    }
    if (data.override_location_lng === undefined || data.override_location_lng === null) {
      errors.push('override_location_lng is required when override_location_enabled is true');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Count secondary profiles for an account
 * @param {Object} params
 * @param {string} params.accountId - The account ID
 * @param {Object} params.serviceClient - Supabase service client
 * @returns {Promise<number>}
 */
export const countSecondaryProfiles = async ({ accountId, serviceClient }) => {
  const { count, error } = await serviceClient
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('kind', 'SECONDARY')
    .is('deleted_at', null);

  if (error) {
    console.error('[countSecondaryProfiles] Error:', error);
    return 0;
  }
  return count || 0;
};

/**
 * Get the maximum number of secondary profiles for a user tier
 * @param {string} tier - User's subscription tier
 * @returns {number}
 */
export const getMaxSecondaryProfilesForTier = (tier) => {
  const normalizedTier = String(tier || 'basic').toLowerCase();
  return MAX_SECONDARY_PROFILES[normalizedTier] || MAX_SECONDARY_PROFILES.basic;
};

/**
 * Batch evaluate visibility for multiple profiles
 * Used for discovery grid to avoid N+1 queries
 * 
 * @param {Object} params
 * @param {string} params.viewerUserId - The viewer's auth user ID
 * @param {Object} params.viewerAttributes - Viewer's attributes
 * @param {string[]} params.profileIds - Array of profile IDs to check
 * @param {Object} params.serviceClient - Supabase service client
 * @returns {Promise<Map<string, boolean>>} - Map of profileId -> allowed
 */
export const batchCheckVisibility = async ({
  viewerUserId,
  viewerAttributes = {},
  profileIds,
  serviceClient,
}) => {
  const results = new Map();
  
  if (!profileIds || profileIds.length === 0) {
    return results;
  }

  // Batch fetch profiles
  const { data: profiles, error: profilesError } = await serviceClient
    .from('profiles')
    .select('*')
    .in('id', profileIds)
    .is('deleted_at', null);

  if (profilesError) {
    console.error('[batchCheckVisibility] Profiles fetch error:', profilesError);
    profileIds.forEach((id) => results.set(id, false));
    return results;
  }

  // Batch fetch blocklist entries for viewer
  const { data: blockedEntries } = await serviceClient
    .from('profile_blocklist_users')
    .select('profile_id')
    .in('profile_id', profileIds)
    .eq('viewer_user_id', viewerUserId);

  const blockedProfileIds = new Set((blockedEntries || []).map((e) => e.profile_id));

  // Batch fetch allowlist entries for viewer
  const { data: allowlistEntries } = await serviceClient
    .from('profile_allowlist_users')
    .select('profile_id')
    .in('profile_id', profileIds)
    .eq('viewer_user_id', viewerUserId);

  const allowlistedProfileIds = new Set((allowlistEntries || []).map((e) => e.profile_id));

  // Batch fetch all allowlist counts to check if profiles have allowlists
  const { data: allowlistCounts } = await serviceClient
    .from('profile_allowlist_users')
    .select('profile_id')
    .in('profile_id', profileIds);

  const profilesWithAllowlist = new Set((allowlistCounts || []).map((e) => e.profile_id));

  // Batch fetch visibility rules
  const { data: allRules } = await serviceClient
    .from('profile_visibility_rules')
    .select('*')
    .in('profile_id', profileIds)
    .eq('enabled', true);

  const rulesByProfile = new Map();
  (allRules || []).forEach((rule) => {
    if (!rulesByProfile.has(rule.profile_id)) {
      rulesByProfile.set(rule.profile_id, []);
    }
    rulesByProfile.get(rule.profile_id).push(rule);
  });

  // Evaluate each profile
  for (const profile of profiles || []) {
    const profileId = profile.id;

    // Check inactive/expired
    if (!isProfileActive(profile)) {
      // Allow owner preview
      if (profile.account_id === viewerUserId) {
        results.set(profileId, true);
        continue;
      }
      results.set(profileId, false);
      continue;
    }

    // Owner preview
    if (profile.account_id === viewerUserId) {
      results.set(profileId, true);
      continue;
    }

    // Check blocklist
    if (blockedProfileIds.has(profileId)) {
      results.set(profileId, false);
      continue;
    }

    // Check allowlist
    if (profilesWithAllowlist.has(profileId)) {
      if (allowlistedProfileIds.has(profileId)) {
        results.set(profileId, true);
        continue;
      } else {
        results.set(profileId, false);
        continue;
      }
    }

    // Check for PUBLIC rule
    const rules = rulesByProfile.get(profileId) || [];
    const hasPublicRule = rules.some((r) => r.rule_type === 'PUBLIC');
    if (!hasPublicRule) {
      results.set(profileId, false);
      continue;
    }

    // Evaluate attribute filters (simplified for batch - detailed check done individually if needed)
    const filterRules = rules.filter((r) => r.rule_type === 'FILTER_VIEWER_ATTRIBUTES');
    let filtersPass = true;
    for (const filterRule of filterRules) {
      if (!evaluateAttributeFilters(filterRule.rule_config || {}, viewerAttributes)) {
        filtersPass = false;
        break;
      }
    }

    results.set(profileId, filtersPass);
  }

  return results;
};
