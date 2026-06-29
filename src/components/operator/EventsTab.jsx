/**
 * EventsTab — operator cockpit EVENTS surface.
 * "Your events · tickets": the venue's event-beacons (beacons.venue_id) with
 * live ticket status (sold/cap/revenue). "Manage tickets" opens L2VendorEventSheet
 * (pool CRUD, live guest list, door scan, CSV export). "On the globe": curated
 * pulse_events via venues.pulse_place_id for context.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { CalendarDays, Ticket, ChevronRight } from 'lucide-react';

const GOLD = '#C8962C';

function fmtDate(d) {
  if (!d) return 'Date TBC';
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function EventsTab({ venueId }) {
  const { openSheet } = useSheet();

  const { data, isLoading } = useQuery({
    queryKey: ['operator-events-tickets', venueId],
    enabled: !!venueId,
    queryFn: async () => {
      // Beacons are owner-keyed (owner_id), not venue-keyed (0 beacons carry a
      // venue_id). The operator's events are the beacons THEY own — this unifies
      // venue + promoter: both manage their own beacons.
      const { data: { user } } = await supabase.auth.getUser();
      const ownerId = user?.id;
      const { data: beacons } = ownerId ? await supabase
        .from('beacons')
        .select('id, title, event_start_at, ends_at')
        .eq('owner_id', ownerId)
        .order('event_start_at', { ascending: true }) : { data: [] };

      const ids = (beacons || []).map((b) => b.id);
      let pools = [];
      if (ids.length) {
        const { data: p } = await supabase
          .from('ticket_inventory_pools')
          .select('beacon_id, price, inventory_cap, inventory_sold, is_active, metadata')
          .in('beacon_id', ids);
        pools = p || [];
      }

      const { data: venue } = await supabase
        .from('venues').select('pulse_place_id').eq('id', venueId).maybeSingle();
      let globe = [];
      if (venue?.pulse_place_id) {
        const { data: ge } = await supabase
          .from('pulse_events')
          .select('id, title, event_start_at, image_url')
          .eq('place_id', venue.pulse_place_id)
          .gte('event_end_at', new Date().toISOString())
          .order('event_start_at', { ascending: true })
          .limit(20);
        globe = ge || [];
      }

      const byBeacon = {};
      pools.forEach((p) => {
        const agg = byBeacon[p.beacon_id] || { cap: 0, sold: 0, revenue: 0, pools: 0, external: 0, house: 0, extPlatform: null };
        agg.cap += p.inventory_cap || 0;
        agg.sold += p.inventory_sold || 0;
        agg.revenue += (p.inventory_sold || 0) * (Number(p.price) || 0);
        agg.pools += 1;
        const ext = Number(p.metadata?.external_allocation) || 0;
        const house = Number(p.metadata?.house_capacity) || 0;
        if (ext > agg.external) agg.external = ext;
        if (house > agg.house) agg.house = house;
        if (p.metadata?.external_platform) agg.extPlatform = p.metadata.external_platform;
        byBeacon[p.beacon_id] = agg;
      });

      return { beacons: beacons || [], byBeacon, globe };
    },
  });

  if (isLoading) {
    return <p style={{ color: '#8a857c', textAlign: 'center', padding: 24, fontSize: 13 }}>Loading…</p>;
  }

  const beacons = data?.beacons || [];
  const byBeacon = data?.byBeacon || {};
  const globe = data?.globe || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <p style={{ color: GOLD, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 10px' }}>
          Your events · tickets
        </p>
        {beacons.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 16px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 14 }}>
            <Ticket style={{ width: 26, height: 26, color: '#3a3a44', margin: '0 auto 10px' }} />
            <p style={{ color: '#8a857c', fontSize: 13, margin: 0 }}>No ticketed events yet.</p>
            <p style={{ color: '#55525c', fontSize: 11, marginTop: 4 }}>Drop an event beacon in SIGNALS, then set up its tickets here.</p>
          </div>
        ) : (
          beacons.map((b) => {
            const t = byBeacon[b.id];
            return (
              <button
                key={b.id}
                onClick={() => openSheet('vendor-event', { beaconId: b.id })}
                style={{
                  width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14, padding: 12, marginBottom: 8, cursor: 'pointer',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {b.title || 'Untitled event'}
                  </p>
                  <p style={{ color: '#8a857c', fontSize: 12, margin: '2px 0 0' }}>
                    {fmtDate(b.event_start_at)}
                    {t ? `  ·  ${t.sold}/${t.cap || '\u221e'} HOTMESS  ·  \u00a3${t.revenue.toFixed(0)}` : '  ·  No tickets set'}
                  </p>
                  {t && t.external > 0 && (
                    <p style={{ color: '#55525c', fontSize: 11, margin: '2px 0 0' }}>
                      {`+ ${t.external} on ${t.extPlatform || 'Outsavvy'}`}
                      {t.house > 0 ? `  ·  venue ${t.house}  ·  ${Math.max(0, t.house - (t.cap || 0) - t.external)} unallocated` : ''}
                    </p>
                  )}
                </div>
                <span style={{ color: GOLD, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                  {t ? 'Manage' : 'Set up tickets'}
                </span>
                <ChevronRight style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
              </button>
            );
          })
        )}
      </div>

      {globe.length > 0 && (
        <div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 10px' }}>
            On the globe
          </p>
          {globe.map((ev) => (
            <div key={ev.id} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 10, marginBottom: 8 }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#15151b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {ev.image_url
                  ? <img src={ev.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <CalendarDays style={{ width: 18, height: 18, color: GOLD }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ev.title || 'Untitled'}
                </p>
                <p style={{ color: '#8a857c', fontSize: 11, margin: '2px 0 0' }}>{fmtDate(ev.event_start_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
