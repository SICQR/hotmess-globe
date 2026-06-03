/**
 * Ghosted utilities — mapping, context, distance formatting
 */

export interface GhostedUser {
  id: string;
  name: string;
  avatar: string | null;
  distance: number | null;       // metres
  context: string;
  presenceLabel: string;
  isOnline: boolean;
  isMoving: boolean;
  isAtVenue: boolean;
  isLive: boolean;
  vibe: string | null;
  email: string | null;
  raw: any;                      // original profile data
}

/** Format distance in metres to human string */
export function formatDistance(meters: number | null | undefined): string {
  if (meters == null || meters < 0) return '';
  if (meters < 100) return '<100m';
  if (meters < 1000) return `${Math.round(meters)}m`;
  const km = meters / 1000;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}

/** Derive context string from user data */
function getContext(u: any): string {
  if (u.movement_active || u.is_moving) {
    const eta = u.eta || u.movement_eta || '';
    return eta ? `Moving · ${eta}` : 'Moving';
  }
  if (u.venue_name || u.checkin_venue) {
    return `At ${u.venue_name || u.checkin_venue}`;
  }
  if (u.radio_show || u.is_listening) {
    return 'Listening';
  }
  if (u.rightNow || u.right_now_status) {
    const intent = u.rightNow?.intention || u.right_now_status?.intention || '';
    if (intent) return intent.charAt(0).toUpperCase() + intent.slice(1);
  }
  return 'Nearby';
}

/** Derive presence label for badge/sublabel */
function getPresenceLabel(u: any): string {
  if (u.movement_active || u.is_moving) return 'Moving';
  if (u.venue_name || u.checkin_venue) return 'At venue';
  if (u.rightNow || u.right_now_status) return 'Live';
  if (u.is_online || u.onlineNow) return 'Online';
  const lastSeen = u.last_seen ? new Date(u.last_seen).getTime() : 0;
  if (lastSeen > Date.now() - 30 * 60 * 1000) return 'Recent';
  return '';
}

/** Map raw profile data to GhostedUser for card rendering */
export function mapGhostedUser(u: any): GhostedUser {
  return {
    id: u.authUserId || u.userId || u.id,
    name: u.profileName || u.display_name || 'Anonymous',
    avatar: u.photos?.[0]?.url || u.avatar_url || null,
    distance: u.distance_m ?? u.distance ?? null,
    context: getContext(u),
    presenceLabel: getPresenceLabel(u),
    isOnline: !!(u.is_online || u.onlineNow),
    isMoving: !!(u.movement_active || u.is_moving),
    isAtVenue: !!(u.venue_name || u.checkin_venue),
    isLive: !!(u.rightNow || u.right_now_status),
    vibe: u.vibe || u.rightNow?.intention || u.right_now_status?.intention || null,
    email: u.email || null,
    raw: u,
  };
}
