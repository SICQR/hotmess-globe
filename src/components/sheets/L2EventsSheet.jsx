/**
 * L2EventsSheet — Native events sheet
 *
 * Shows event listings with filter tabs and inline RSVP.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import { Calendar, MapPin, Users, Loader2, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, isToday, isTomorrow } from 'date-fns';
import { useSheet } from '@/contexts/SheetContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const FILTERS = ['Tonight', 'This Week', 'All'];

export default function L2EventsSheet() {
  const [filter, setFilter] = useState('Tonight');
  const queryClient = useQueryClient();
  const { openSheet } = useSheet();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      return { ...user, ...(profile || {}), auth_user_id: user.id, email: user.email || profile?.email };
    },
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events-sheet', filter],
    queryFn: async () => {
      try {
        const now = new Date();
        let rangeEnd = null;

        if (filter === 'Tonight') {
          rangeEnd = new Date(now);
          rangeEnd.setHours(23, 59, 59, 999);
        } else if (filter === 'This Week') {
          rangeEnd = new Date(now);
          rangeEnd.setDate(rangeEnd.getDate() + 7);
        }

        // Query beacons table
        let beaconQuery = supabase
          .from('beacons')
          .select('*')
          .eq('kind', 'event')
          .gte('starts_at', now.toISOString())
          .order('starts_at', { ascending: true })
          .limit(50);
        if (rangeEnd) beaconQuery = beaconQuery.lte('starts_at', rangeEnd.toISOString());

        // Query pulse_events table (127 curated upcoming events)
        let peQuery = supabase
          .from('pulse_events')
          .select('*')
          .gte('event_start_at', now.toISOString())
          .order('event_start_at', { ascending: true })
          .limit(50);
        if (rangeEnd) peQuery = peQuery.lte('event_start_at', rangeEnd.toISOString());

        const [{ data: beaconData }, { data: peData }] = await Promise.all([beaconQuery, peQuery]);

        // Normalise pulse_events to beacon shape
        const normalised = (peData || []).map(e => ({
          ...e,
          starts_at:   e.event_start_at,
          ends_at:     e.event_end_at,
          title:       e.title,
          venue_name:  e.place_slug,
          _source:     'pulse',
        }));

        const merged = [...(beaconData || []), ...normalised];
        merged.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
        return merged;
      } catch {
        return [];
      }
    },
    refetchInterval: 60000,
  });

  const { data: rsvps = [] } = useQuery({
    queryKey: ['my-rsvps', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      try {
        const { data } = await supabase
          .from('event_rsvps')
          .select('event_id')
          .eq('user_email', currentUser.email);
        return (data || []).map(r => r.event_id);
      } catch {
        return [];
      }
    },
    enabled: !!currentUser?.email,
  });

  const rsvpMutation = useMutation({
    mutationFn: async ({ eventId, going }) => {
      if (!currentUser?.email) throw new Error('Log in to RSVP');
      if (going) {
        await supabase.from('event_rsvps').insert({
          event_id: eventId,
          user_email: currentUser.email,
          status: 'going',
        });
      } else {
        await supabase.from('event_rsvps').delete()
          .eq('event_id', eventId)
          .eq('user_email', currentUser.email);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-rsvps']);
      queryClient.invalidateQueries(['events-sheet']);
      toast.success('RSVP updated');
    },
    onError: (err) => toast.error(err.message || 'Could not update RSVP'),
  });

  const formatEventDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isToday(d)) return `Tonight · ${format(d, 'h:mm a')}`;
    if (isTomorrow(d)) return `Tomorrow · ${format(d, 'h:mm a')}`;
    return format(d, 'EEE d MMM · h:mm a');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <h2 className="font-black uppercase text-sm tracking-wider flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#C8962C]" />
          Events
        </h2>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-white/10">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-colors ${
              filter === f
                ? 'text-[#C8962C] border-b-2 border-[#C8962C]'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Calendar className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No events {filter.toLowerCase()}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {events.map((event, i) => {
              const isGoing = rsvps.includes(event.id);
              return (
                <motion.div
                  key={event.id || i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex gap-3">
                    {/* Event image */}
                    <div
                      className="w-16 h-16 rounded-xl flex-shrink-0 bg-gradient-to-br from-[#C8962C]/20 to-[#C8962C]/20 overflow-hidden"
                    >
                      {event.image_url ? (
                        <img src={event.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Ticket className="w-6 h-6 text-white/20" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-white truncate">{event.title || event.event_title}</p>
                      <p className="text-[11px] text-[#C8962C] mt-0.5">
                        {formatEventDate(event.starts_at || event.event_start)}
                      </p>
                      {(event.venue_name || event.venue_address) && (
                        <p className="text-[11px] text-white/40 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          {event.venue_name || event.venue_address}
                        </p>
                      )}
                      {event.rsvp_count != null && (
                        <p className="text-[11px] text-white/30 flex items-center gap-1 mt-1">
                          <Users className="w-2.5 h-2.5" />
                          {event.rsvp_count} going
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => rsvpMutation.mutate({ eventId: event.id, going: !isGoing })}
                      disabled={rsvpMutation.isPending}
                      className={cn(
                        'flex-shrink-0 self-start px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-colors',
                        isGoing
                          ? 'bg-[#00FF87]/20 text-[#00FF87] border border-[#00FF87]/30'
                          : 'bg-[#C8962C]/20 text-[#C8962C] border border-[#C8962C]/30 hover:bg-[#C8962C]/30'
                      )}
                    >
                      {isGoing ? '✓ Going' : 'RSVP'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

