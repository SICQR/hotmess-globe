/**
 * EventsTab — the operator cockpit's EVENTS surface.
 * Shows the venue's upcoming events, resolved through venues.pulse_place_id
 * (the operator `venues` table linked to the globe `pulse_places`/`pulse_events`).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import { CalendarDays } from 'lucide-react';

const GOLD = '#C8962C';

export default function EventsTab({ venueId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['operator-events', venueId],
    enabled: !!venueId,
    queryFn: async () => {
      const { data: venue } = await supabase
        .from('venues')
        .select('pulse_place_id, name')
        .eq('id', venueId)
        .maybeSingle();
      if (!venue?.pulse_place_id) return { events: [], venueName: venue?.name };
      const { data: events } = await supabase
        .from('pulse_events')
        .select('id, title, event_start_at, event_end_at, image_url')
        .eq('place_id', venue.pulse_place_id)
        .gte('event_end_at', new Date().toISOString())
        .order('event_start_at', { ascending: true })
        .limit(50);
      return { events: events || [], venueName: venue?.name };
    },
  });

  const events = data?.events || [];

  if (isLoading) {
    return <p style={{ color: '#8a857c', textAlign: 'center', padding: 24, fontSize: 13 }}>Loading events…</p>;
  }
  if (events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 16px' }}>
        <CalendarDays style={{ width: 32, height: 32, color: '#3a3a44', margin: '0 auto 12px' }} />
        <p style={{ color: '#8a857c', fontSize: 13, margin: 0 }}>No upcoming events for this venue.</p>
        <p style={{ color: '#55525c', fontSize: 11, marginTop: 4 }}>Events you list on the globe appear here.</p>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {events.map((ev) => {
        const d = ev.event_start_at ? new Date(ev.event_start_at) : null;
        return (
          <div
            key={ev.id}
            style={{
              display: 'flex', gap: 12, alignItems: 'center',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, padding: 10,
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
              background: '#15151b', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {ev.image_url
                ? <img src={ev.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <CalendarDays style={{ width: 20, height: 20, color: GOLD }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {ev.title || 'Untitled event'}
              </p>
              <p style={{ color: '#8a857c', fontSize: 12, margin: '2px 0 0' }}>
                {d
                  ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                    + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                  : 'Date TBC'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
