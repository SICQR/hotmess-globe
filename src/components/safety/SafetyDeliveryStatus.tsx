/**
 * SafetyDeliveryStatus
 *
 * Live status feed for the multi-channel safety dispatcher. Subscribes to
 * `safety_delivery_log` rows for a given event_id via Supabase Realtime and
 * renders one row per (channel, contact) attempt with a colour-coded status
 * badge. Status updates flow through the dispatcher → channel modules → ack
 * endpoint and arrive here without a refresh.
 *
 * Design tokens locked per round-4 brief:
 *   #050507 background, #C8962C gold, #30D158 green (delivered/acked),
 *   #FF2A2A red (failed). Oswald headlines, Barlow body.
 *
 * Used inside the Get Out post-trigger acknowledgement screen.
 */
import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/components/utils/supabaseClient';

type DeliveryRow = {
  id: string;
  channel: 'push' | 'sms' | 'whatsapp' | 'email' | 'voice';
  status: 'queued' | 'sent' | 'delivered' | 'acked' | 'failed' | 'skipped';
  attempted_at: string;
  delivered_at: string | null;
  acked_at: string | null;
  error: string | null;
  trusted_contact_id: string | null;
};

interface Props {
  eventId: string;
  className?: string;
}

const CHANNEL_LABEL: Record<DeliveryRow['channel'], string> = {
  push: 'Push',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  email: 'Email',
  voice: 'Voice',
};

const STATUS_COLOR: Record<DeliveryRow['status'], string> = {
  queued: '#8E8E93',
  sent: '#C8962C',
  delivered: '#30D158',
  acked: '#30D158',
  failed: '#FF2A2A',
  skipped: '#5A5A60',
};

const STATUS_LABEL: Record<DeliveryRow['status'], string> = {
  queued: 'Queued',
  sent: 'Sent',
  delivered: 'Delivered',
  acked: 'Confirmed',
  failed: 'Failed',
  skipped: 'Skipped',
};

const SPRING = { type: 'spring' as const, stiffness: 200, damping: 25 };

export function SafetyDeliveryStatus({ eventId, className = '' }: Props) {
  const [rows, setRows] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      const { data } = await supabase
        .from('safety_delivery_log')
        .select('id, channel, status, attempted_at, delivered_at, acked_at, error, trusted_contact_id')
        .eq('safety_event_id', eventId)
        .order('attempted_at', { ascending: true });
      if (!cancelled && data) {
        setRows(data as DeliveryRow[]);
      }
      if (!cancelled) setLoading(false);
    }

    loadInitial();

    const channel = supabase
      .channel(`safety-delivery-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'safety_delivery_log',
          filter: `safety_event_id=eq.${eventId}`,
        },
        (payload) => {
          if (cancelled) return;
          setRows((prev) => {
            const next = payload.new as DeliveryRow | null;
            const old = payload.old as DeliveryRow | null;
            if (payload.eventType === 'INSERT' && next) {
              if (prev.some((r) => r.id === next.id)) return prev;
              return [...prev, next].sort(
                (a, b) => new Date(a.attempted_at).getTime() - new Date(b.attempted_at).getTime(),
              );
            }
            if (payload.eventType === 'UPDATE' && next) {
              return prev.map((r) => (r.id === next.id ? { ...r, ...next } : r));
            }
            if (payload.eventType === 'DELETE' && old) {
              return prev.filter((r) => r.id !== old.id);
            }
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const summary = useMemo(() => {
    const counts = { delivered: 0, sent: 0, queued: 0, failed: 0, skipped: 0, acked: 0 };
    for (const r of rows) counts[r.status]++;
    return counts;
  }, [rows]);

  const oneAcked = summary.acked > 0;
  const anyDelivered = summary.delivered + summary.acked + summary.sent > 0;

  return (
    <div
      className={className}
      style={{ fontFamily: 'Barlow, system-ui, sans-serif', color: '#fff' }}
      role="status"
      aria-live="polite"
    >
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontFamily: 'Oswald, system-ui, sans-serif',
            fontSize: 14,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#C8962C',
            marginBottom: 6,
          }}
        >
          Help is on the way
        </div>
        <div style={{ fontSize: 13, opacity: 0.7 }}>
          {oneAcked
            ? 'A backup confirmed they got it.'
            : anyDelivered
              ? 'Backups have been notified — waiting for confirmation.'
              : loading
                ? 'Reaching backups…'
                : 'No backups to notify.'}
        </div>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label="Channel delivery status">
        <AnimatePresence initial={false}>
          {rows.map((row) => (
            <motion.li
              key={row.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={SPRING}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                fontSize: 13,
              }}
            >
              <span>{CHANNEL_LABEL[row.channel] ?? row.channel}</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: STATUS_COLOR[row.status] ?? '#8E8E93',
                }}
                aria-label={`${CHANNEL_LABEL[row.channel]} ${STATUS_LABEL[row.status]}`}
              >
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: STATUS_COLOR[row.status] ?? '#8E8E93',
                  }}
                />
                {STATUS_LABEL[row.status] ?? row.status}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

export default SafetyDeliveryStatus;
