/**
 * TicketSuccessPage — post-purchase confirmation (Stripe success_url target).
 * Stripe redirects buyers here after card payment; tickets are issued
 * asynchronously by the webhook, so we briefly poll for the order then offer
 * to open the wallet QR. Replaces the previous 404 on /ticket-success.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Ticket } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';

export default function TicketSuccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { openSheet } = useSheet();
  const sessionId = params.get('session_id');
  const [ticket, setTicket] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const poll = async () => {
      tries += 1;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) setDone(true); return; }
      let q = supabase
        .from('ticket_orders')
        .select('id, beacon_id, qr_token, ticket_state, beacons(title)')
        .eq('user_id', user.id)
        .in('ticket_state', ['issued', 'valid', 'reissued'])
        .order('created_at', { ascending: false })
        .limit(1);
      if (sessionId) q = q.eq('metadata->>stripe_session_id', sessionId);
      const { data } = await q.maybeSingle();
      if (cancelled) return;
      if (data) { setTicket(data); setDone(true); return; }
      if (tries >= 6) { setDone(true); return; }
      setTimeout(poll, 1500);
    };
    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  const T = { gold: '#C8962C', pink: '#FF4F9A', white: '#fff', muted: 'rgba(255,255,255,0.55)' };

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', gap: 18 }}>
      {!done ? (
        <>
          <Loader2 size={36} style={{ color: T.gold, animation: 'spin 1s linear infinite' }} />
          <p style={{ color: T.muted, fontSize: 15 }}>Confirming your ticket…</p>
        </>
      ) : (
        <>
          <CheckCircle2 size={56} style={{ color: '#34C759' }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>You’re in</h1>
          <p style={{ color: T.muted, fontSize: 15, maxWidth: 320, margin: 0 }}>
            {ticket?.beacons?.title
              ? `Your ticket for ${ticket.beacons.title} is confirmed and in your wallet.`
              : 'Payment received — your ticket will appear in your wallet shortly.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320, marginTop: 6 }}>
            {ticket && (
              <button
                onClick={() => openSheet('ticket-market', { mode: 'my-ticket', ticketId: ticket.id })}
                style={{ padding: '14px', borderRadius: 16, background: T.pink, color: '#fff', border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Ticket size={18} /> View my ticket
              </button>
            )}
            <button
              onClick={() => navigate('/pulse')}
              style={{ padding: '14px', borderRadius: 16, background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        </>
      )}
    </div>
  );
}
