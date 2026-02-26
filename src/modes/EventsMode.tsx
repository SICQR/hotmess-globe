/**
 * EventsMode — Full-page events browser
 *
 * Tonight / This Week / All tabs.
 * Event cards with inline RSVP.
 * FAB to open event creation sheet.
 * Replaces the /events → /pulse redirect.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Users, Loader2, Ticket, Plus, Clock } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const FILTERS = ['Tonight', 'This Week', 'All'] as const;
type Filter = typeof FILTERS[number];

function formatEventDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isToday(d)) return `Tonight · ${format(d, 'h:mm a')}`;
  if (isTomorrow(d)) return `Tomorrow · ${format(d, 'h:mm a')}`;
  return format(d, 'EEE d MMM · h:mm a');
}

export default function EventsMode() {
  const [filter, setFilter] = useState<Filter>('Tonight');
  const queryClient = useQueryClient();
  const { openSheet } = useSheet();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events-mode', filter],
    queryFn: async () => {
      const now = new Date();
      let query = supabase
        .from('events')
        .select('*')
        .order('starts_at', { ascending: true })
        .limit(50);

      if (filter === 'Tonight') {
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);
        query = query.gte('starts_at', now.toISOString()).lte('starts_at', todayEnd.toISOString());
      } else if (filter === 'This Week') {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() + 7);
        query = query.gte('starts_at', now.toISOString()).lte('starts_at', weekEnd.toISOString());
      } else {
        query = query.gte('starts_at', now.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
  });

  const { data: rsvps = [] } = useQuery({
    queryKey: ['my-rsvps-mode', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const { data } = await supabase
        .from('event_rsvps')
        .select('event_id')
        .eq('user_email', currentUser.email);
      return (data || []).map((r: { event_id: string }) => r.event_id);
    },
    enabled: !!currentUser?.email,
  });

  const rsvpMutation = useMutation({
    mutationFn: async ({ eventId, going }: { eventId: string; going: boolean }) => {
      if (!currentUser?.email) throw new Error('Log in to RSVP');
      if (going) {
        const { error } = await supabase.from('event_rsvps').insert({
          event_id: eventId,
          user_email: currentUser.email,
          status: 'going',
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('event_rsvps')
          .delete()
          .eq('event_id', eventId)
          .eq('user_email', currentUser.email);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-rsvps-mode'] });
      queryClient.invalidateQueries({ queryKey: ['events-mode'] });
      toast.success('RSVP updated');
    },
    onError: (err: Error) => toast.error(err.message || 'Could not update RSVP'),
  });

  return (
    <div className="h-full w-full bg-black flex flex-col overflow-hidden">
      {/* Hero header */}
      <div className="relative flex-shrink-0">
        <div
          className="h-36 w-full bg-cover bg-center"
          style={{ backgroundImage: 'url(/assets/hero-city.jpg)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-black" />
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div>
            <p className="text-[#C8962C] text-[10px] font-black uppercase tracking-[0.3em]">HOTMESS</p>
            <h1 className="font-black text-2xl text-white leading-tight tracking-tight">
              {filter === 'Tonight' ? 'Happening Tonight' : filter === 'This Week' ? 'This Week' : 'All Events'}
            </h1>
          </div>
          <div className="flex items-center gap-1 bg-[#C8962C]/20 border border-[#C8962C]/30 rounded-full px-2.5 py-1">
            <Clock className="w-2.5 h-2.5 text-[#C8962C]" />
            <span className="text-[#C8962C] text-[10px] font-bold">Live</span>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-white/10 flex-shrink-0 bg-black">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'flex-1 py-3 text-xs font-black uppercase tracking-wider transition-colors',
              filter === f
                ? 'text-[#C8962C] border-b-2 border-[#C8962C]'
                : 'text-white/40 hover:text-white/60'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#1C1C1E] flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-white/10" />
            </div>
            <p className="text-white/60 font-bold text-sm">No events {filter.toLowerCase()}</p>
            <p className="text-white/30 text-xs mt-1">Check back soon or create one</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="divide-y divide-white/5 pb-24">
              {events.map((event: Record<string, unknown>, i: number) => {
                const id = event.id as string;
                const isGoing = rsvps.includes(id);
                return (
                  <motion.div
                    key={id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="p-4 hover:bg-white/5 active:bg-white/8 transition-colors cursor-pointer"
                    onClick={() => openSheet('event', { id })}
                  >
                    <div className="flex gap-3">
                      {/* Thumbnail */}
                      <div className="w-[72px] h-[72px] rounded-xl flex-shrink-0 overflow-hidden bg-gradient-to-br from-[#C8962C]/20 to-[#C8962C]/5">
                        {event.image_url ? (
                          <img
                            src={event.image_url as string}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Ticket className="w-7 h-7 text-white/15" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-white truncate leading-tight">
                          {(event.title || event.name) as string}
                        </p>
                        <p className="text-[11px] text-[#C8962C] mt-0.5 font-semibold">
                          {formatEventDate((event.starts_at || event.date) as string)}
                        </p>
                        {(event.venue || event.location) && (
                          <p className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                            <span className="truncate">{(event.venue || event.location) as string}</span>
                          </p>
                        )}
                        {event.rsvp_count != null && (
                          <p className="text-[10px] text-white/30 flex items-center gap-1 mt-1">
                            <Users className="w-2.5 h-2.5" />
                            {event.rsvp_count as number} going
                          </p>
                        )}
                      </div>

                      {/* RSVP button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          rsvpMutation.mutate({ eventId: id, going: !isGoing });
                        }}
                        disabled={rsvpMutation.isPending}
                        className={cn(
                          'flex-shrink-0 self-start px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all',
                          isGoing
                            ? 'bg-[#00FF87]/15 text-[#00FF87] border border-[#00FF87]/30'
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
          </AnimatePresence>
        )}
      </div>

      {/* Create Event FAB */}
      <button
        onClick={() => openSheet('create-event')}
        className="absolute bottom-24 right-4 w-12 h-12 rounded-full bg-[#C8962C] shadow-[0_0_20px_rgba(200,150,44,0.5)] flex items-center justify-center active:scale-95 transition-transform z-10"
        aria-label="Create event"
      >
        <Plus className="w-5 h-5 text-black" />
      </button>
    </div>
  );
}
