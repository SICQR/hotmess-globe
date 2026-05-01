/**
 * HOTMESS v6 — Support Proximity: Helpers
 * Spec: DEV_BRIEF_support-proximity.docx
 *
 * CORE RULE: If support_notifications_enabled is false, this module
 * does nothing. No processing, no scheduling, no logs. Total silence.
 *
 * DECOUPLING RULE: lifestyle_preferences has zero effect here.
 * Only support_preferences.support_notifications_enabled activates the system.
 */

import { supabase } from '@/lib/supabase';

// ── Private field names — stripped from non-owner API responses ───────────────
export const SUPPORT_PRIVATE_FIELDS = [
  'lifestyle_preferences',
  'support_preferences',
];

// ── Notification copy — exact, no variations ─────────────────────────────────
export const SUPPORT_NOTIFICATION_COPY = {
  generic:  'Support nearby tonight · 10 min away',
  detailed: 'AA / NA meeting nearby · 10 min away',
};

// ── Read own support preferences ─────────────────────────────────────────────
export async function getSupportPreferences(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('support_preferences, lifestyle_preferences')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return {
    support: data.support_preferences ?? { support_notifications_enabled: false, support_detail_level: 'generic' },
    lifestyle: data.lifestyle_preferences ?? null,
  };
}

// ── Update support preferences (own profile only) ────────────────────────────
export async function setSupportEnabled(userId, enabled) {
  if (!userId) return;
  const { error } = await supabase
    .from('profiles')
    .update({
      support_preferences: supabase.rpc ? undefined : {},  // handled below
    })
    .eq('id', userId);

  // Use jsonb_set pattern via RPC for safe partial update
  const { error: rpcError } = await supabase.rpc('update_support_preferences', {
    p_user_id: userId,
    p_enabled: enabled,
    p_detail_level: null,  // null = don't change
  });

  return rpcError;
}

export async function setSupportDetailLevel(userId, level) {
  if (!userId || !['generic', 'detailed'].includes(level)) return;
  const { error } = await supabase.rpc('update_support_preferences', {
    p_user_id: userId,
    p_enabled: null,       // null = don't change
    p_detail_level: level,
  });
  return error;
}

// ── Update lifestyle preferences (own profile only, declarative only) ─────────
export async function setLifestylePreferences(userId, prefs) {
  if (!userId || !prefs) return;
  // NEVER trigger any system behaviour here.
  // Write the tag. That is all.
  const { error } = await supabase
    .from('profiles')
    .update({ lifestyle_preferences: prefs })
    .eq('id', userId);
  return error;
}

// ── Strip private fields from a profile object for non-owner views ────────────
export function stripSupportFields(profileRow) {
  if (!profileRow) return profileRow;
  const safe = { ...profileRow };
  delete safe.lifestyle_preferences;
  delete safe.support_preferences;
  return safe;
}

// ── Check if user is within proximity of any active support meeting ───────────
// Returns { nearby: boolean, meeting: object|null } — uses broad radius (2km).
// Approximate location only. No exact coordinates stored.
export async function checkSupportProximity(userId, approxLat, approxLng) {
  // First: bail immediately if not enabled
  const prefs = await getSupportPreferences(userId);
  if (!prefs?.support?.support_notifications_enabled) {
    return { nearby: false, meeting: null };
  }

  // Check if already notified in this window
  const windowKey = _currentWindowKey();
  const { data: existing } = await supabase
    .from('support_notification_log')
    .select('id')
    .eq('user_id', userId)
    .eq('window_key', windowKey)
    .maybeSingle();

  if (existing) return { nearby: false, meeting: null, suppressed: true };

  // Broad radius check — 2km, approximate only
  const RADIUS_KM = 2;
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:00`;
  const dayOfWeek = now.getDay();

  const { data: meetings } = await supabase
    .from('support_meetings')
    .select('id, meeting_type, name, lat, lng, start_time')
    .eq('is_active', true)
    .eq('day_of_week', dayOfWeek);

  if (!meetings?.length) return { nearby: false, meeting: null };

  // Filter by approximate distance
  const nearby = meetings.find(m => {
    const distKm = _approxDistanceKm(approxLat, approxLng, Number(m.lat), Number(m.lng));
    const minutesUntil = _minutesUntilMeeting(currentTime, m.start_time);
    return distKm <= RADIUS_KM && minutesUntil >= 0 && minutesUntil <= 120;
  });

  return { nearby: !!nearby, meeting: nearby ?? null };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _currentWindowKey() {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const hour = now.getHours();
  const slot = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  return `${date}-${slot}`;
}

function _approxDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function _minutesUntilMeeting(currentTimeStr, meetingTimeStr) {
  const [ch, cm] = currentTimeStr.split(':').map(Number);
  const [mh, mm] = meetingTimeStr.split(':').map(Number);
  return (mh * 60 + mm) - (ch * 60 + cm);
}
