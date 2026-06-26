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
  const { user, isLoadingAuth: authLoading } = useAuth();
  const [state, setState] = useState({ loading: true, allowed: false, role: 'venue', venueId: null });

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user?.id) {
      setState({ loading: false, allowed: false, role: 'venue', venueId: null });
      return;
    }

    (async () => {
      const [{ data: profile }, { data: opVenues }, { data: memberships }, { count: ownedBeacons }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        supabase.from('operator_venues').select('venue_id').eq('user_id', user.id).is('revoked_at', null),
        supabase.from('memberships').select('tier').eq('user_id', user.id).in('tier', ['venue', 'promoter']),
        // Doctrine (2026-06-24): owning ≥1 beacon makes you an operator, even
        // without a venue link or a venue/promoter membership.
        supabase.from('beacons').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
      ]);

      const isAdmin = profile?.role === 'admin';
      const memTiers = (memberships || []).map((m) => m.tier);
      const linkedVenueIds = (opVenues || []).map((o) => o.venue_id).filter(Boolean);
      const isVendor = isAdmin || linkedVenueIds.length > 0 || memTiers.length > 0 || (ownedBeacons ?? 0) > 0;

      if (!isVendor) {
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

      if (!cancelled) setState({ loading: false, allowed: true, role, venueId });
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  if (authLoading || state.loading) {
    // Opaque full-screen hold so the Home feed never bleeds through the
    // route crossfade while the async access check resolves.
    return <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 50 }} />;
  }
  if (!state.allowed) return <Navigate to="/" replace />;
  return <OperatorPanel role={state.role} venueId={state.venueId} />;
}
