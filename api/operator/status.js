/**
 * GET /api/operator/status?venue_id=&event_id=
 * Live stats for the operator panel LIVE tab.
 * Flag: v6_night_operator_panel
 */
import { verifyOperator, supabaseAdmin } from './_verify.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { venue_id, event_id } = req.query;
  if (!venue_id) return res.status(400).json({ error: 'venue_id required' });

  const ctx = await verifyOperator(req, res, venue_id);
  if (!ctx) return;

  const [
    { count: clusterSize },
    { count: rsvpCount },
    { count: scanCount },
    { count: beaconsActive },
    { data: flagRow },
  ] = await Promise.all([
    // Cluster: right_now_posts active at this venue
    supabaseAdmin
      .from('right_now_posts')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venue_id)
      .gt('expires_at', new Date().toISOString()),

    // RSVPs
    event_id
      ? supabaseAdmin
          .from('event_rsvps')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', event_id)
      : Promise.resolve({ count: 0 }),

    // Ticket scans
    event_id
      ? supabaseAdmin
          .from('tickets')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', event_id)
          .not('used_at', 'is', null)
      : Promise.resolve({ count: 0 }),

    // Active beacons
    supabaseAdmin
      .from('beacons')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venue_id)
      .eq('status', 'active'),

    // Feature flag state
    supabaseAdmin
      .from('feature_flags')
      .select('enabled')
      .eq('name', 'v6_night_operator_panel')
      .single(),
  ]);

  if (!flagRow?.enabled) {
    return res.status(403).json({ error: 'Feature not available' });
  }

  // Beacon limit (tier-based)
  const { data: membership } = await supabaseAdmin
    .from('memberships')
    .select('tier')
    .eq('venue_id', venue_id)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
    .catch(() => ({ data: null }));

  const beaconLimits = { mess: 2, hotmess: 2, connected: 5, promoter: 5, venue: 8 };
  const beaconLimit = beaconLimits[membership?.tier] ?? 2;

  // Momentum state (from most recent momentum beacon for this venue)
  const { data: momentumBeacon } = await supabaseAdmin
    .from('beacons')
    .select('beacon_category, intensity')
    .eq('venue_id', venue_id)
    .eq('beacon_category', 'momentum')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
    .catch(() => ({ data: null }));

  const momentumMap = { 0.25: 'EARLY', 0.5: 'LIVE', 0.75: 'PEAK', 1.0: 'WINDING DOWN' };
  const momentumState = momentumMap[momentumBeacon?.intensity] ?? 'LIVE';

  res.status(200).json({
    venue_id,
    event_id: event_id || null,
    cluster_size: clusterSize ?? 0,
    rsvp_count: rsvpCount ?? 0,
    scan_count: scanCount ?? 0,
    beacons_active: beaconsActive ?? 0,
    beacon_limit: beaconLimit,
    momentum_state: momentumState,
    momentum_intensity: momentumBeacon?.intensity ?? 0.5,
    ts: new Date().toISOString(),
  });
}
