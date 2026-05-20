/**
 * TrustedContactStatus — named real-time acknowledgement feed.
 *
 * Brief: "User must see, in real time: who has opened the alert, who has
 * acknowledged, who is responding. Example: 'Daddy opened your alert.' —
 * this dramatically reduces panic."
 *
 * Haptic doctrine (Phil v1.0):
 *   - Gentle double pulse on transition into delivered / acked. Only fires
 *     on TRANSITION (status change), never on the initial load and never on
 *     every realtime tick. "Someone is here."
 *
 * Builds on the existing SafetyDeliveryStatus component (which already
 * subscribes to safety_delivery_log realtime) by:
 *   1. Looking up the latest open safety_events row for the current user
 *   2. Joining trusted_contacts → contact_name + relationship for friendly
 *      copy ("Daddy", "Friend", etc) rather than channel-only chips
 *   3. Surfacing the most-recent acknowledgement as a single calm line.
 *
 * Mounts only while a SOS event is unresolved. Self-unmounts on resolution.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Eye, MessageCircle } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { gentleDoublePulse } from '@/lib/safety/haptics';

const TOKENS = {
  gold: '#C8962C',
  care: '#3A464D',
  green: '#30D158',
};

const RELATIONSHIP_TITLE = {
  daddy: 'Daddy',
  friend: 'Friend',
  flatmate: 'Flatmate',
  family: 'Family',
  partner: 'Partner',
  roommate: 'Flatmate',
  club_contact: 'Club Contact',
  emergency: 'Emergency',
};

function titleForContact(c) {
  if (!c) return 'Your contact';
  const rel = c.relationship && RELATIONSHIP_TITLE[c.relationship];
  return c.contact_name || rel || 'Your contact';
}

const ACK_STATUSES = new Set(['delivered', 'acked']);

export default function TrustedContactStatus({ userId }) {
  const [eventId, setEventId] = useState(null);
  const [deliveryRows, setDeliveryRows] = useState([]);
  const [contactsById, setContactsById] = useState({});
  // Per-contact best status from the previous render; used to detect
  // transitions for the gentle double pulse so we never spam haptics.
  const prevStatusRef = useRef(new Map());
  // Don't fire the haptic on the FIRST load — only on live transitions.
  const initialLoadedRef = useRef(false);

  // Find the latest unresolved event for this user.
  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    initialLoadedRef.current = false;
    prevStatusRef.current = new Map();
    (async () => {
      const { data } = await supabase
        .from('safety_events')
        .select('id, created_at, resolved_at, resolution')
        .eq('user_id', userId)
        .is('resolved_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setEventId(data?.id ?? null);
    })();

    const ch = supabase
      .channel(`tcs-events-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'safety_events',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (!cancelled && payload?.new?.id) setEventId(payload.new.id);
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'safety_events',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (cancelled) return;
        if (payload?.new?.resolved_at) setEventId(null);
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [userId]);

  // Load trusted contacts once (small list) so we can name acks.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('trusted_contacts')
        .select('id, contact_name, relationship')
        .eq('user_id', userId);
      if (!cancelled && data) {
        const map = {};
        data.forEach((c) => { map[c.id] = c; });
        setContactsById(map);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Subscribe to delivery log for the current event.
  useEffect(() => {
    if (!eventId) { setDeliveryRows([]); return undefined; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('safety_delivery_log')
        .select('id, channel, status, attempted_at, delivered_at, acked_at, trusted_contact_id')
        .eq('safety_event_id', eventId)
        .order('attempted_at', { ascending: true });
      if (!cancelled && data) {
        setDeliveryRows(data);
        // First snapshot landed — seed prevStatusRef so the next realtime
        // event that changes a row will be a true transition.
        const seed = new Map();
        data.forEach((r) => {
          if (r.trusted_contact_id) {
            const prev = seed.get(r.trusted_contact_id);
            if (!prev || rankStatus(r.status) > rankStatus(prev)) {
              seed.set(r.trusted_contact_id, r.status);
            }
          }
        });
        prevStatusRef.current = seed;
        initialLoadedRef.current = true;
      }
    })();
    const ch = supabase
      .channel(`tcs-delivery-${eventId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'safety_delivery_log',
        filter: `safety_event_id=eq.${eventId}`,
      }, (payload) => {
        if (cancelled) return;
        setDeliveryRows((prev) => {
          const next = payload.new;
          if (payload.eventType === 'INSERT' && next) {
            if (prev.some((r) => r.id === next.id)) return prev;
            return [...prev, next];
          }
          if (payload.eventType === 'UPDATE' && next) {
            return prev.map((r) => r.id === next.id ? { ...r, ...next } : r);
          }
          return prev;
        });
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [eventId]);

  // Aggregate per-contact best status.
  const perContact = useMemo(() => {
    const map = new Map();
    deliveryRows.forEach((r) => {
      if (!r.trusted_contact_id) return;
      const prev = map.get(r.trusted_contact_id);
      if (!prev || rankStatus(r.status) > rankStatus(prev.status)) {
        map.set(r.trusted_contact_id, r);
      }
    });
    return Array.from(map.entries()).map(([id, row]) => ({
      contact: contactsById[id],
      contactId: id,
      status: row.status,
      acked_at: row.acked_at,
      delivered_at: row.delivered_at,
    }));
  }, [contactsById, deliveryRows]);

  // ── Haptic: gentle double pulse on first transition into delivered/acked.
  useEffect(() => {
    if (!initialLoadedRef.current) return;
    let firedThisTick = false;
    perContact.forEach((r) => {
      const prevStatus = prevStatusRef.current.get(r.contactId);
      const becameAck = ACK_STATUSES.has(r.status) && !ACK_STATUSES.has(prevStatus);
      if (becameAck && !firedThisTick) {
        gentleDoublePulse();
        firedThisTick = true; // one pulse per tick max, never stacked
      }
      prevStatusRef.current.set(r.contactId, r.status);
    });
  }, [perContact]);

  // Most recent ack — for the headline ("Daddy opened your alert.")
  const headline = useMemo(() => {
    const opened = perContact
      .filter((r) => ACK_STATUSES.has(r.status))
      .sort((a, b) => {
        const at = new Date(a.acked_at || a.delivered_at || 0).getTime();
        const bt = new Date(b.acked_at || b.delivered_at || 0).getTime();
        return bt - at;
      })[0];
    if (!opened) return null;
    const name = titleForContact(opened.contact);
    if (opened.status === 'acked') return `${name} acknowledged your alert.`;
    return `${name} opened your alert.`;
  }, [perContact]);

  if (!eventId) return null;

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      aria-live="polite"
      className="rounded-2xl border p-4"
      style={{
        background: 'rgba(48,209,88,0.04)',
        borderColor: 'rgba(48,209,88,0.25)',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-4 h-4" style={{ color: TOKENS.green }} />
        <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: TOKENS.green }}>
          Help is on the way
        </p>
      </div>
      <p className="text-base font-bold text-white leading-snug">
        {headline ?? 'Reaching your people…'}
      </p>

      {perContact.length > 0 && (
        <ul className="mt-3 space-y-1.5" role="list">
          <AnimatePresence initial={false}>
            {perContact.map((r) => {
              const name = titleForContact(r.contact);
              const label = (
                r.status === 'acked'     ? `${name} — on the way` :
                r.status === 'delivered' ? `${name} — opened` :
                r.status === 'sent'      ? `${name} — sent` :
                r.status === 'queued'    ? `${name} — reaching` :
                r.status === 'failed'    ? `${name} — failed` :
                r.status === 'skipped'   ? `${name} — skipped` :
                `${name} — ${r.status}`
              );
              const Icon = r.status === 'acked' ? MessageCircle : Eye;
              const tone = ACK_STATUSES.has(r.status) ? TOKENS.green
                          : r.status === 'failed' ? '#FF3B30'
                          : 'rgba(255,255,255,0.55)';
              return (
                <motion.li
                  key={r.contactId ?? name}
                  layout
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-[12px]"
                  style={{ color: tone }}
                >
                  <Icon className="w-3 h-3" />
                  <span>{label}</span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </motion.section>
  );
}

function rankStatus(s) {
  return ({ queued: 0, sent: 1, delivered: 2, acked: 3, failed: -1, skipped: -2 }[s] ?? 0);
}
