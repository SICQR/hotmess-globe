/**
 * EventsMode — v6 aligned (Chunk 10)
 *
 * NOW / SOON / LATER tabs replace Tonight / This Week / All.
 * Full-bleed editorial EventCard with TimingTag, IntensityBar, GO + RSVP.
 * GO → setGhostedContext (GlobeContext) + local GhostedPreview bridge.
 * RSVP → event_rsvps upsert + profiles.rsvp_event_id + emitPulse.
 * No flag needed — this is a sealed spec refinement.
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';

import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { useGlobe } from '@/contexts/GlobeContext';
import { toast } from 'sonner';
import { humanizeError } from '@/lib/errorUtils';
import { pushNotify } from '@/lib/pushNotify';
import { AppBanner } from '@/components/banners/AppBanner';

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const T = {
  black: '#000000',
  white: '#FFFFFF',
  gold:  '#C8962C',
  card:  '#0d0d0d',
  muted: 'rgba(255,255,255,0.35)',
  now:   '#C8962C',
  soon:  '#CF3A10',
  later: '#4a4a4a',
  peak:  '#FF3B30',
} as const;

type Tab = 'now' | 'soon' | 'later';
type Momentum = 'UPCOMING' | 'STARTING' | 'LIVE' | 'PEAK' | 'WINDING DOWN';

function momentumColor(m: Momentum): string {
  return ({
    UPCOMING:       T.muted,
    STARTING:       T.soon,
    LIVE:           T.gold,
    PEAK:           T.peak,
    'WINDING DOWN': T.later,
  } as Record<string, string>)[m] ?? T.gold;
}

function computeMomentumIntensity(m: Momentum): number {
  return ({
    UPCOMING:       0.40,
    STARTING:       0.60,
    LIVE:           0.80,
    PEAK:           1.00,
    'WINDING DOWN': 0.50,
  } as Record<string, number>)[m] ?? 0.50;
}

function computeMomentum(event: Record<string, unknown>): Momentum {
  const now     = Date.now();
  const starts  = event.starts_at ? new Date(event.starts_at as string).getTime() : null;
  const ends    = event.ends_at   ? new Date(event.ends_at   as string).getTime() : null;
  if (!starts) return 'UPCOMING';
  if (ends && now > ends)  return 'WINDING DOWN';
  if (now >= starts) {
    const count = (event.rsvp_count as number) ?? 0;
    return count >= 50 ? 'PEAK' : 'LIVE';
  }
  const minsUntil = (starts - now) / 60_000;
  return minsUntil <= 60 ? 'STARTING' : 'UPCOMING';
}

function timingTagText(event: Record<string, unknown>, tab: Tab): string {
  const now    = Date.now();
  const starts = event.starts_at ? new Date(event.starts_at as string) : null;
  if (tab === 'now') {
    if (starts && starts.getTime() < now) {
      const mins = Math.floor((now - starts.getTime()) / 60_000);
      return mins < 60 ? `STARTED ${mins} MIN AGO` : 'LIVE NOW';
    }
    return 'LIVE NOW';
  }
  if (tab === 'soon' && starts) {
    const mins = Math.round((starts.getTime() - now) / 60_000);
    if (mins < 60) return `STARTS IN ${mins} MIN`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `STARTS IN ${h}H${m > 0 ? ` ${m}M` : ''}`;
  }
  if (starts) {
    return starts.toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit',
    }).toUpperCase();
  }
  return 'UPCOMING';
}

// ── MICRO COMPONENTS ──────────────────────────────────────────────────────────
function PulseDot({ color = T.gold, size = 6 }: { color?: string; size?: number }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size }}>
      <motion.span
        animate={{ scale: [1, 2.2, 1], opacity: [0.8, 0, 0.8] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: color, opacity: 0.4,
        }}
      />
      <span style={{
        width: size, height: size, borderRadius: '50%',
        background: color, position: 'relative',
      }} />
    </span>
  );
}

function TimingTag({ text, momentum }: { text: string; momentum: Momentum }) {
  const color = momentumColor(momentum);
  return (
    <div style={{
      position: 'absolute', top: 10, left: 10, zIndex: 2,
      display: 'flex', alignItems: 'center', gap: 5,
      background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)',
      border: `1px solid ${color}44`, padding: '3px 8px',
    }}>
      {(momentum === 'LIVE' || momentum === 'PEAK') && (
        <PulseDot color={color} />
      )}
      <span style={{
        fontSize: '9px', letterSpacing: '0.18em', color,
        fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase',
      }}>
        {text}
      </span>
    </div>
  );
}

function RSVPBadge({ count, momentum }: { count: number; momentum: Momentum }) {
  return (
    <span style={{
      fontSize: '9px', color: T.muted,
      fontFamily: "'Barlow', sans-serif", letterSpacing: '0.08em',
    }}>
      {count} going
      {momentum === 'PEAK' && (
        <span style={{ color: T.peak, marginLeft: 4 }}>· PEAK</span>
      )}
    </span>
  );
}

function IntensityBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 12 }}>
      {[0.25, 0.5, 0.75, 1.0].map((threshold, i) => (
        <div
          key={i}
          style={{
            width: 3, borderRadius: 1, height: 5 + i * 2,
            background: value >= threshold ? color : '#222',
            transition: 'background 0.4s',
          }}
        />
      ))}
    </div>
  );
}

// ── EVENT CARD ────────────────────────────────────────────────────────────────
interface EventCardProps {
  event:   Record<string, unknown>;
  tab:     Tab;
  isGoing: boolean;
  onGo:    (ev: Record<string, unknown>) => void;
  onRsvp:  (ev: Record<string, unknown>) => void;
}

function EventCard({ event, tab, isGoing, onGo, onRsvp }: EventCardProps) {
  const momentum   = computeMomentum(event);
  const mc         = momentumColor(momentum);
  const intensity  = computeMomentumIntensity(momentum);
  const isNow      = tab === 'now';
  const imgUrl     = (event.image_url || event.img) as string | undefined;
  const title      = (event.title || event.name || 'Untitled') as string;
  const venue      = (event.venue_name || event.venue_address || event.venue) as string | undefined;
  const rsvpCount  = (event.rsvp_count as number) ?? 0;
  const liveSignal = event.live_signal as string | undefined;

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      style={{
        position: 'relative', marginBottom: 2, overflow: 'hidden',
        cursor: 'pointer', background: T.card,
        border: momentum === 'PEAK' ? `1px solid ${T.peak}33` : '1px solid transparent',
      }}
    >
      {/* Hero image */}
      <div style={{ position: 'relative', height: isNow ? 300 : 220 }}>
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={title}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              filter: `brightness(${momentum === 'PEAK' ? 0.5 : 0.4}) contrast(1.1)`,
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#111' }} />
        )}

        {/* PEAK pulse overlay */}
        {momentum === 'PEAK' && (
          <motion.div
            animate={{ opacity: [0, 0.15, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: `radial-gradient(ellipse at 50% 50%, ${T.peak} 0%, transparent 70%)`,
            }}
          />
        )}

        <TimingTag text={timingTagText(event, tab)} momentum={momentum} />

        {/* Bottom gradient + info */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)',
          padding: '20px 14px 14px',
        }}>
          {(liveSignal || isNow) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <IntensityBar value={intensity} color={mc} />
              {liveSignal && (
                <span style={{
                  fontSize: '10px', color: mc,
                  fontFamily: "'Barlow', sans-serif", fontStyle: 'italic',
                }}>
                  {liveSignal}
                </span>
              )}
            </div>
          )}

          <h3 style={{
            margin: '0 0 2px',
            fontSize: isNow ? '28px' : '22px', lineHeight: 1,
            fontFamily: "'Oswald', sans-serif",
            color: T.white, textTransform: 'uppercase', letterSpacing: '0.02em',
          }}>
            {title}
          </h3>

          {venue && (
            <p style={{
              margin: '0 0 8px', fontSize: '11px',
              color: T.muted, fontFamily: "'Barlow', sans-serif",
            }}>
              {venue}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <RSVPBadge count={rsvpCount} momentum={momentum} />
            <div style={{ display: 'flex', gap: 6 }}>
              {/* RSVP — secondary CTA */}
              <motion.button
                onClick={(e) => { e.stopPropagation(); onRsvp(event); }}
                whileTap={{ scale: 0.93 }}
                style={{
                  padding: '7px 14px',
                  background: isGoing ? `${T.gold}22` : 'transparent',
                  border: `1px solid ${isGoing ? T.gold : '#333'}`,
                  fontSize: '10px', fontFamily: "'Oswald', sans-serif",
                  letterSpacing: '0.15em',
                  color: isGoing ? T.gold : T.muted,
                  cursor: 'pointer', textTransform: 'uppercase',
                }}
              >
                {isGoing ? '✓ RSVP' : 'RSVP'}
              </motion.button>

              {/* GO — primary CTA for NOW / STARTING */}
              {(isNow || momentum === 'STARTING') && (
                <motion.button
                  onClick={(e) => { e.stopPropagation(); onGo(event); }}
                  whileTap={{ scale: 0.93 }}
                  animate={
                    momentum === 'PEAK'
                      ? { boxShadow: [`0 0 0px ${T.peak}00`, `0 0 16px ${T.peak}88`, `0 0 0px ${T.peak}00`] }
                      : {}
                  }
                  transition={{ duration: 1.6, repeat: Infinity }}
                  style={{
                    padding: '7px 18px',
                    background: momentum === 'PEAK' ? T.peak : T.gold,
                    border: 'none',
                    fontSize: '10px', fontFamily: "'Oswald', sans-serif",
                    letterSpacing: '0.15em', color: T.black,
                    cursor: 'pointer', textTransform: 'uppercase', fontWeight: 700,
                  }}
                >
                  GO
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── TAB STRIP ─────────────────────────────────────────────────────────────────
function TabStrip({
  active, onChange, counts,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  counts: Record<Tab, number>;
}) {
  const tabs: Array<{ id: Tab; label: string; color: string }> = [
    { id: 'now',   label: 'NOW',   color: T.gold },
    { id: 'soon',  label: 'SOON',  color: T.soon },
    { id: 'later', label: 'LATER', color: T.muted },
  ];
  return (
    <div style={{ display: 'flex', background: T.black, borderBottom: '1px solid #1a1a1a' }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            flex: 1, padding: '13px 0',
            background: 'transparent', border: 'none',
            fontFamily: "'Oswald', sans-serif", fontSize: '11px',
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: active === t.id ? t.color : '#333',
            borderBottom: active === t.id ? `2px solid ${t.color}` : '2px solid transparent',
            cursor: 'pointer', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          {t.id === 'now' && counts.now > 0 && <PulseDot color={t.color} size={5} />}
          {t.label}
          {counts[t.id] > 0 && (
            <span style={{
              fontSize: '8px',
              background: active === t.id ? t.color : '#1a1a1a',
              color:      active === t.id ? T.black : '#555',
              padding: '0 4px', borderRadius: 2,
              fontFamily: "'Barlow', sans-serif",
            }}>
              {counts[t.id]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
function EmptyState({ tab }: { tab: Tab }) {
  const heading = tab === 'now'   ? 'Nothing live right now.'
                : tab === 'soon'  ? 'Nothing starting soon.'
                :                   'No upcoming events.';
  const sub     = tab === 'now'   ? "Check SOON for what's starting."
                :                   'Check back later.';
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <p style={{ fontSize: '32px', marginBottom: 8 }}>◌</p>
      <p style={{
        fontFamily: "'Oswald', sans-serif", fontSize: '18px',
        color: T.white, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px',
      }}>
        {heading}
      </p>
      <p style={{
        fontFamily: "'Barlow', sans-serif", fontSize: '12px',
        color: T.muted, fontStyle: 'italic',
      }}>
        {sub}
      </p>
    </div>
  );
}

// ── GHOSTED PREVIEW BRIDGE ────────────────────────────────────────────────────
function GhostedPreview({
  event, onClose,
}: {
  event: Record<string, unknown>;
  onClose: () => void;
}) {
  const venue     = (event.venue_name || event.venue_address || event.venue) as string | undefined;
  const title     = (event.title || event.name || 'Event') as string;
  const rsvpCount = (event.rsvp_count as number) ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 60 }}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#0d0d0d', borderTop: '1px solid #1a1a1a',
          borderRadius: '18px 18px 0 0', padding: '20px 16px 40px',
          maxHeight: '70vh', overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{
          width: 36, height: 3, background: '#222', borderRadius: 2,
          margin: '0 auto 20px',
        }} />

        <p style={{
          margin: '0 0 2px', fontSize: '9px', letterSpacing: '0.2em',
          color: T.gold, fontFamily: "'Oswald', sans-serif",
        }}>
          PEOPLE AT
        </p>
        <h3 style={{
          margin: '0 0 4px', fontSize: '22px',
          fontFamily: "'Oswald', sans-serif",
          color: T.white, textTransform: 'uppercase',
        }}>
          {venue ?? title}
        </h3>
        <p style={{
          margin: '0 0 16px', fontSize: '11px',
          color: T.muted, fontFamily: "'Barlow', sans-serif",
        }}>
          {rsvpCount} going
        </p>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '12px',
            background: T.gold, border: 'none',
            fontFamily: "'Oswald', sans-serif", fontSize: '11px',
            letterSpacing: '0.2em', color: T.black,
            cursor: 'pointer', textTransform: 'uppercase',
          }}
        >
          OPEN GHOSTED HERE
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function EventsMode() {
  const [tab, setTab]                 = useState<Tab>('now');
  const [selectedEvent, setSelectedEvent] = useState<Record<string, unknown> | null>(null);

  const queryClient              = useQueryClient();
  const { openSheet }            = useSheet();
  const { emitPulse, setGhostedContext } = useGlobe();

  // ── Current user ──────────────────────────────────────────────────────────
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // ── Events — single query, partitioned client-side ────────────────────────
  // Fetch all active events: running now OR starting in the future
  const { data: allEvents = [], isLoading } = useQuery({
    queryKey: ['events-mode-v6'],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(); // started up to 12h ago
      const { data, error } = await supabase
        .from('beacons')
        .select('*')
        .eq('kind', 'event')
        .eq('status', 'active')
        .gte('starts_at', cutoff)
        .order('starts_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  // Partition into NOW / SOON / LATER
  const nowIso  = new Date().toISOString();
  const soonIso = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

  const tabEvents = {
    now:   allEvents.filter(e =>
      e.starts_at <= nowIso && (!e.ends_at || e.ends_at > nowIso)
    ),
    soon:  allEvents.filter(e =>
      e.starts_at > nowIso && e.starts_at <= soonIso
    ),
    later: allEvents.filter(e =>
      e.starts_at > soonIso
    ),
  };

  const counts: Record<Tab, number> = {
    now:   tabEvents.now.length,
    soon:  tabEvents.soon.length,
    later: tabEvents.later.length,
  };

  // ── My RSVPs ──────────────────────────────────────────────────────────────
  const { data: rsvps = [] } = useQuery({
    queryKey: ['my-rsvps-mode', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const { data } = await supabase
        .from('event_rsvps')
        .select('event_id')
        .eq('user_email', currentUser.email);
      return (data ?? []).map((r: { event_id: string }) => r.event_id);
    },
    enabled: !!currentUser?.id,
  });

  // ── RSVP mutation ─────────────────────────────────────────────────────────
  const rsvpMutation = useMutation({
    mutationFn: async ({
      event, going,
    }: {
      event: Record<string, unknown>;
      going: boolean;
    }) => {
      if (!currentUser?.email) throw new Error('Log in to RSVP');
      const eventId   = event.id as string;
      const eventName = (event.title || event.name || '') as string;

      if (going) {
        const { error } = await supabase.from('event_rsvps').insert({
          event_id:   eventId,
          user_email: currentUser.email,
          status:     'going',
        });
        if (error) throw error;

        // Globe pulse signal
        emitPulse?.({ type: 'rsvp', metadata: { eventId } });

        // v6 spec: persist active RSVP on profile (best-effort)
        try {
          await supabase
            .from('profiles')
            .update({ rsvp_event_id: eventId, rsvp_event_name: eventName })
            .eq('id', currentUser.id);
        } catch { /* column may not exist yet — non-fatal */ }

        // Notify organiser (fire-and-forget)
        void (async () => {
          try {
            const { data: beacon } = await supabase
              .from('beacons')
              .select('owner_id, metadata')
              .eq('id', eventId)
              .maybeSingle();
            if (!beacon?.owner_id) return;
            const { data: owner } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', beacon.owner_id)
              .maybeSingle();
            if (!owner?.email || owner.email === currentUser.email) return;
            const evTitle = (beacon.metadata as Record<string, string>)?.title || 'your event';
            const { data: me } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('id', currentUser.id)
              .maybeSingle();
            pushNotify({
              emails: [owner.email],
              title:  `${me?.display_name ?? 'Someone'} is going!`,
              body:   `New RSVP for ${evTitle}`,
              tag:    `rsvp-${eventId}`,
              url:    '/pulse',
            });
          } catch { /* best-effort */ }
        })();
      } else {
        const { error } = await supabase
          .from('event_rsvps')
          .delete()
          .eq('event_id', eventId)
          .eq('user_email', currentUser.email);
        if (error) throw error;

        // Clear profile RSVP if this was the active event
        try {
          await supabase
            .from('profiles')
            .update({ rsvp_event_id: null, rsvp_event_name: null })
            .eq('id', currentUser.id)
            .eq('rsvp_event_id', eventId);
        } catch { /* non-fatal */ }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-rsvps-mode'] });
      queryClient.invalidateQueries({ queryKey: ['events-mode-v6'] });
      toast.success('RSVP updated');
    },
    onError: (err: Error) =>
      toast.error(humanizeError(err, 'Could not update RSVP')),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleGo = useCallback((event: Record<string, unknown>) => {
    // Wire venue context for GhostedOverlay
    setGhostedContext({
      mode:       'venue',
      venue_id:   event.venue_id   as string,
      venue_name: (event.venue_name || event.venue) as string,
      event_id:   event.id         as string,
      filter:     'going_or_nearby',
    });
    setSelectedEvent(event);
  }, [setGhostedContext]);

  const handleRsvp = useCallback((event: Record<string, unknown>) => {
    const id = event.id as string;
    rsvpMutation.mutate({ event, going: !rsvps.includes(id) });
  }, [rsvps, rsvpMutation]);

  const events = tabEvents[tab];

  return (
    <div style={{ background: T.black, color: T.white, minHeight: '100%', position: 'relative' }}>
      {/* Dynamic events banner */}
      <AppBanner placement="events_top" variant="strip" />

      {/* Sticky top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #111',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 16px',
      }}>
        <span style={{
          fontFamily: "'Oswald', sans-serif", fontSize: '14px',
          letterSpacing: '0.2em', color: T.white, textTransform: 'uppercase',
        }}>
          EVENTS
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {counts.now > 0 && <PulseDot color={T.gold} size={5} />}
          <span style={{
            fontSize: '10px', color: T.muted,
            fontFamily: "'Barlow', sans-serif",
          }}>
            {counts.now} live now
          </span>
        </div>
      </div>

      {/* Sticky tab strip */}
      <div style={{ position: 'sticky', top: 53, zIndex: 39, background: T.black }}>
        <TabStrip active={tab} onChange={setTab} counts={counts} />
      </div>

      {/* Event list */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 64 }}>
          <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {events.length === 0 ? (
              <EmptyState tab={tab} />
            ) : (
              <div style={{ padding: '2px', paddingBottom: 100 }}>
                {events.map((event) => (
                  <EventCard
                    key={event.id as string}
                    event={event}
                    tab={tab}
                    isGoing={rsvps.includes(event.id as string)}
                    onGo={handleGo}
                    onRsvp={handleRsvp}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Create Event FAB */}
      <button
        onClick={() => openSheet('create-event')}
        className="fixed bottom-24 right-4 w-12 h-12 rounded-full bg-[#C8962C] shadow-[0_0_20px_rgba(200,150,44,0.5)] flex items-center justify-center active:scale-95 transition-transform z-10"
        aria-label="Create event"
      >
        <Plus className="w-5 h-5 text-black" />
      </button>

      {/* GhostedPreview bridge */}
      <AnimatePresence>
        {selectedEvent && (
          <GhostedPreview
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
