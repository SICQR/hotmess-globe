/**
 * OperatorRoute — access gate + venue resolution for the operator cockpit (/operator).
 *
 * VENDOR axis only. Operator access is decided by operator identity, NOT the
 * consumer membership/profile tier:
 *   - profiles.role === 'admin'              → full operator access (any venue)
 *   - operator_venues row(s)                 → operates those venue(s)
 *   - memberships.tier in (venue, promoter)  → business subscriber (vendor)
 * Everyone else is redirected home.
 *
 * Resolves a venue to manage (explicit ?venue_id wins, else the operator's first
 * linked venue, else for admins the first venue overall) and passes venue_id +
 * the role flag into OperatorPanel.
 */
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/components/utils/supabaseClient';
import OperatorPanel from '@/pages/OperatorPanel';

export default function OperatorRoute() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState({ loading: true, allowed: false, role: 'venue', venueId: null });

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user?.id) {
      setState({ loading: false, allowed: false, role: 'venue', venueId: null });
      return;
    }

    (async () => {
      const [{ data: profile }, { data: opVenues }, { data: memberships }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        supabase.from('operator_venues').select('venue_id').eq('user_id', user.id).is('revoked_at', null),
        supabase.from('memberships').select('tier').eq('user_id', user.id).in('tier', ['venue', 'promoter']),
      ]);

      const isAdmin = profile?.role === 'admin';
      const memTiers = (memberships || []).map((m) => m.tier);
      const linkedVenueIds = (opVenues || []).map((o) => o.venue_id).filter(Boolean);
      const isVendor = isAdmin || linkedVenueIds.length > 0 || memTiers.length > 0;

      if (!isVendor) {
        console.error('[OPDBG] gate DENY', JSON.stringify({ uid: user.id, isAdmin, memTiers, linkedVenueIds }));
        if (!cancelled) setState({ loading: false, allowed: false, role: 'venue', venueId: null });
        return;
      }

      // Resolve which venue to manage.
      const params = new URLSearchParams(window.location.search);
      let venueId = params.get('venue_id') || linkedVenueIds[0] || null;
      if (!venueId && isAdmin) {
        const { data: anyVenue } = await supabase.from('venues').select('id').limit(1).maybeSingle();
        venueId = anyVenue?.id || null;
      }

      // Role from the vendor axis: promoter only when promoter-without-venue.
      const role =
        memTiers.includes('promoter') && !memTiers.includes('venue') && linkedVenueIds.length === 0
          ? 'promoter'
          : 'venue';

      console.error('[OPDBG] gate', JSON.stringify({ uid: user.id, isAdmin, memTiers, linkedVenueIds, venueId, role }));
      if (!cancelled) setState({ loading: false, allowed: true, role, venueId });
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  if (authLoading || state.loading) return null;
  if (!state.allowed) return <Navigate to="/" replace />;
  return <OperatorPanel role={state.role} venueId={state.venueId} />;
}
