/**
 * usePulseEvents — fetches upcoming events from pulse_events table.
 *
 * pulse_events is the source-of-truth for curated/ingested events
 * (OutOut, manual seeding, etc). The beacons table is a rendering layer
 * for user-dropped signals; events live in pulse_events.
 *
 * Returns events for the next 14 days, sorted by start time.
 * Joins pulse_places to surface venue_name and image fallback for event cards.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

export interface PulseEvent {
  id: string;
  title: string;
  beacon_category: string;
  lat: number;
  lng: number;
  starts_at: string;
  ends_at: string | null;
  place_slug: string | null;
  image_url: string | null;
  venue_name: string | null;
}

export function usePulseEvents() {
  const [events, setEvents] = useState<PulseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const fetchEvents = async () => {
      const now = new Date().toISOString();
      const twoWeeksOut = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('pulse_events')
        .select('id, title, beacon_category, lat, lng, event_start_at, event_end_at, place_slug, image_url, pulse_places(name, image_url)')
        .gte('event_start_at', now)
        .lte('event_start_at', twoWeeksOut)
        .order('event_start_at', { ascending: true })
        .limit(120);

      if (!alive) return;
      if (error) {
        console.warn('[usePulseEvents] fetch failed:', error.message);
        setLoading(false);
        return;
      }

      setEvents(
        (data || [])
          .filter((e: Record<string, unknown>) => Number.isFinite(Number(e.lat)) && Number.isFinite(Number(e.lng)))
          .map((e: Record<string, unknown>) => {
            const place = e.pulse_places as Record<string, unknown> | null;
            return {
              id: String(e.id),
              title: String(e.title || ''),
              beacon_category: String(e.beacon_category || 'event'),
              lat: Number(e.lat),
              lng: Number(e.lng),
              starts_at: String(e.event_start_at),
              ends_at: e.event_end_at ? String(e.event_end_at) : null,
              place_slug: e.place_slug ? String(e.place_slug) : null,
              image_url: (e.image_url as string | null) || (place?.image_url as string | null) || null,
              venue_name: place?.name ? String(place.name) : null,
            };
          })
      );
      setLoading(false);
    };

    fetchEvents();
    return () => { alive = false; };
  }, []);

  return { events, loading };
}
