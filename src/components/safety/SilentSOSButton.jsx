/**
 * SilentSOSButton — Apple-Emergency-SOS-style hold-to-fire button.
 *
 * Six visible states (see POLISH_SWEEP_2026-05-18_sos_ux_and_tidy.md §Issue 1):
 *   idle → press_began (haptic + countdown ring) → countdown_complete (haptic + spinner)
 *     → sent (per-channel checkmarks streamed in) → cooldown_60s
 *     → re-press during cooldown → escalation confirmation modal
 *
 * Critical invariant: the safety_events INSERT only happens after the 3-second
 * hold completes. release-to-cancel writes NOTHING to the DB.
 *
 * pointerdown/pointerup chosen over click — click eats the hold gesture on
 * iOS Safari and doesn't give us cancel-on-release. requestAnimationFrame
 * keeps the visual countdown locked to display refresh.
 *
 * Server-side rate limit: 3 SOS events / 1h / user, unless metadata.escalation
 * is true. The escalation flag bypasses the limit AND tags the trusted-contact
 * message as "your contact reports their situation has worsened" so it doesn't
 * read as a duplicate.
 *
 * Brand voice rule: every visible string here is in HOTMESS voice. No
 * "Are you sure?" anywhere. The button speaks like a friend pressed up close.
 *
 * Cowork polish sweep — 2026-05-18 (post real-user-test recording).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Loader2, Check, AlertTriangle, Phone } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { COLOR } from '@/lib/tokens';

const HOLD_MS = 3000;          // hold time before fire
const COOLDOWN_MS = 60 * 1000; // visible cooldown after a successful send
const HAPTIC = (pattern) => { try { if (navigator?.vibrate) navigator.vibrate(pattern); } catch {} };

const CHANNEL_LABELS = { sms: 'SMS', whatsapp: 'WhatsApp', telegram: 'Telegram', email: 'Email', push: 'Push' };

export default function SilentSOSButton() {
  const [phase, setPhase] = useState('idle');
  // 'idle' | 'pressing' | 'sending' | 'sent' | 'cooldown' | 'rate_limited'
  const [progressPct, setProgressPct] = useState(0);
  const [channelResults, setChannelResults] = useState([]); // [{channel, ok}]
  const [error, setError] = useState(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [escalationModal, setEscalationModal] = useState(false);
  const [rateLimitModal, setRateLimitModal] = useState(false);

  const holdStartRef = useRef(null);
  const rafRef = useRef(null);
  const completedRef = useRef(false);
  const cooldownTimerRef = useRef(null);

  const cleanupAnim = () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };

  // Per-press lifecycle ──────────────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    if (phase === 'sending' || phase === 'sent') return;
    if (phase === 'cooldown') { setEscalationModal(true); return; }
    if (phase === 'rate_limited') { setRateLimitModal(true); return; }

    holdStartRef.current = performance.now();
    completedRef.current = false;
    setPhase('pressing');
    setProgressPct(0);
    HAPTIC(15);

    const tick = () => {
      if (!holdStartRef.current) return;
      const elapsed = performance.now() - holdStartRef.current;
      const pct = Math.min((elapsed / HOLD_MS) * 100, 100);
      setProgressPct(pct);
      if (elapsed >= HOLD_MS) {
        completedRef.current = true;
        cleanupAnim();
        fire({ escalation: false });
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [phase]);

  const onPointerUp = useCallback(() => {
    // Release BEFORE countdown completes = cancel. ZERO DB writes.
    if (phase !== 'pressing') return;
    if (completedRef.current) return; // fire path is in flight
    cleanupAnim();
    holdStartRef.current = null;
    setProgressPct(0);
    setPhase('idle');
    HAPTIC(8);
  }, [phase]);

  const onPointerCancel = onPointerUp;
  const onPointerLeave = onPointerUp;

  // Fire path ───────────────────────────────────────────────────────────────
  const fire = useCallback(async ({ escalation }) => {
    setPhase('sending');
    setChannelResults([]);
    setError(null);
    HAPTIC([60, 30, 60]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setError('Not signed in. Re-open the app.'); setPhase('idle'); return; }

      // Best-effort geolocation (5s budget — never block the send on it).
      const coords = await new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p.coords), () => resolve(null), { enableHighAccuracy: true, timeout: 5000 }
        );
      });

      const res = await fetch('/api/safety/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          lat: coords?.latitude ?? null,
          lng: coords?.longitude ?? null,
          trigger: escalation ? 'silent_gesture_escalation' : 'silent_gesture',
          escalation: !!escalation,
        }),
      });

      if (res.status === 429) {
        // Rate-limited (3+ in last hour, no escalation flag).
        setPhase('rate_limited');
        setRateLimitModal(true);
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) { setError(body?.error || `sos_failed_${res.status}`); setPhase('idle'); return; }

      // Stream per-channel results into the UI.
      const attempts = body?.dispatch?.attempts || [];
      const opsAttempts = body?.dispatch?.ops_alert?.attempts || [];
      // design system reset 2026-05-19: drop attempts with no channel name.
      // The previous fallback `'channel'` rendered literally as "CHANNEL" in
      // the chip row because the chip class applies `uppercase`. Better to
      // skip than to show a placeholder badge that means nothing to the user.
      const merged = [...opsAttempts, ...attempts]
        .filter(a => a && typeof a.channel === 'string' && a.channel.length > 0)
        .map(a => ({ channel: a.channel, ok: !!a.ok, skipped: !!a.skipped, error: a.error || null }));
      setChannelResults(merged);
      HAPTIC(120);
      setPhase('sent');
      startCooldown();
    } catch (err) {
      console.error('[SilentSOSButton] fire failed:', err);
      setError(err?.message || 'unknown');
      setPhase('idle');
    }
  }, []);

  const startCooldown = () => {
    setCooldownLeft(COOLDOWN_MS / 1000);
    const started = performance.now();
    const tick = () => {
      const left = Math.max(0, Math.ceil((COOLDOWN_MS - (performance.now() - started)) / 1000));
      setCooldownLeft(left);
      if (left <= 0) { setPhase('cooldown'); return; } // stay in cooldown but allow re-press → escalation modal
      cooldownTimerRef.current = window.setTimeout(tick, 250);
    };
    // We're already "sent" — after 8s drop into the calmer cooldown view.
    cooldownTimerRef.current = window.setTimeout(() => { setPhase('cooldown'); tick(); }, 8000);
  };

  useEffect(() => () => { cleanupAnim(); if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current); }, []);

  // Render ──────────────────────────────────────────────────────────────────
  const fillPct = phase === 'pressing' ? progressPct : (phase === 'sent' || phase === 'cooldown') ? 100 : 0;
  const subtitle = (
    phase === 'idle'         ? 'Hold to send. Release to cancel.' :
    phase === 'pressing'     ? `Hold for ${Math.max(0, Math.ceil((HOLD_MS - (progressPct/100)*HOLD_MS)/1000))}s — release to cancel` :
    phase === 'sending'      ? 'Reaching your people…' :
    phase === 'sent'         ? 'Your contacts know. Stay on the line.' :
    phase === 'cooldown'     ? (cooldownLeft > 0 ? `Press again only if it gets worse · ${cooldownLeft}s` : 'Press again only if it gets worse.') :
    phase === 'rate_limited' ? "You've sent 3 already this hour. Press to confirm escalation." :
    'Hold to send.'
  );

  return (
    <>
      <div className="flex flex-col items-stretch gap-1.5">
        <button
          type="button"
          aria-label="Send silent SOS — press and hold for 3 seconds"
          aria-live="polite"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onPointerLeave={onPointerLeave}
          disabled={phase === 'sending'}
          className="relative overflow-hidden py-3.5 font-bold text-sm rounded-xl flex items-center justify-center gap-2 select-none touch-none"
          style={{
            background: phase === 'sent' || phase === 'cooldown'
              ? 'rgba(48,209,88,0.16)' : 'rgba(255,59,48,0.12)',
            color: phase === 'sent' || phase === 'cooldown' ? COLOR.signal : COLOR.emergency,
            border: `1px solid ${phase === 'sent' || phase === 'cooldown' ? 'rgba(48,209,88,0.30)' : 'rgba(255,59,48,0.25)'}`,
            transition: 'background 200ms ease, color 200ms ease, border 200ms ease',
          }}
        >
          {/* Fill — growing from the bottom while pressed; full while sent. */}
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 pointer-events-none"
            style={{
              height: `${fillPct}%`,
              background: phase === 'sent' || phase === 'cooldown'
                ? 'linear-gradient(to top, rgba(48,209,88,0.32), rgba(48,209,88,0.0))'
                : 'linear-gradient(to top, rgba(255,59,48,0.36), rgba(255,59,48,0.0))',
              transition: phase === 'pressing' ? 'none' : 'height 300ms ease-out',
            }}
          />
          <span className="relative z-10 inline-flex items-center gap-2">
            {phase === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> :
             (phase === 'sent' || phase === 'cooldown') ? <Check className="w-4 h-4" /> :
             <Shield className="w-4 h-4" />}
            {phase === 'sending' ? 'SENDING…' :
             phase === 'sent'    ? 'HELP SIGNAL SENT' :
             phase === 'cooldown' ? 'HELP SIGNAL ACTIVE' :
             'SILENT SOS'}
          </span>
        </button>
        <p className="text-[11px] text-white/45 leading-snug px-1">{subtitle}</p>

        {/* Per-channel delivery chips */}
        <AnimatePresence>
          {(phase === 'sent' || phase === 'cooldown') && channelResults.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-1.5 mt-1 px-0.5"
            >
              {channelResults.map((r, i) => (
                <li key={i} className="text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5"
                  style={{
                    background: r.ok ? 'rgba(48,209,88,0.10)' : r.skipped ? 'rgba(255,255,255,0.06)' : 'rgba(255,59,48,0.10)',
                    color: r.ok ? COLOR.signal : r.skipped ? 'rgba(255,255,255,0.45)' : COLOR.emergency,
                    border: '1px solid currentColor',
                  }}>
                  {r.ok ? '✓' : r.skipped ? '·' : '✗'} {CHANNEL_LABELS[r.channel] || r.channel}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        {/* Crisis lines — always visible after a send. One tap to dial. */}
        {(phase === 'sent' || phase === 'cooldown') && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              { label: 'Samaritans · 116 123', tel: '116123' },
              { label: 'LGBT+ Switchboard · 0300 330 0630', tel: '03003300630' },
              { label: '999', tel: '999' },
            ].map((line) => (
              <a key={line.tel} href={`tel:${line.tel}`}
                className="text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 inline-flex items-center gap-1"
                style={{ background: COLOR.brandTint, color: COLOR.brand, border: `1px solid ${COLOR.brand}40` }}>
                <Phone className="w-2.5 h-2.5" /> {line.label}
              </a>
            ))}
          </div>
        )}

        {error && <p className="text-[11px] text-emergency mt-1">Send failed: {String(error).slice(0, 120)}. Try once more or use the crisis lines above.</p>}
      </div>

      {/* Escalation modal — fires when user re-presses inside cooldown */}
      <AnimatePresence>
        {escalationModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            role="dialog" aria-modal="true" aria-label="Escalation confirmation"
            className="fixed inset-0 z-[400] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setEscalationModal(false); }}>
            <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
              className="w-full max-w-md rounded-2xl bg-bg-elevated border border-white/10 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-emergency mt-0.5" />
                <div className="text-white/85 text-sm leading-relaxed">
                  Help is already on the way. Pressing again will send another set of alerts to your contacts.
                  Only do this if your situation has worsened.
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button onClick={() => { setEscalationModal(false); fire({ escalation: true }); }}
                  className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background: COLOR.emergency, color: 'white' }}>
                  Yes — it's worse. Send again.
                </button>
                <button onClick={() => setEscalationModal(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-white/8 text-white/80">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rate-limit modal */}
      <AnimatePresence>
        {rateLimitModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            role="dialog" aria-modal="true" aria-label="Rate limit"
            className="fixed inset-0 z-[400] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setRateLimitModal(false); }}>
            <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
              className="w-full max-w-md rounded-2xl bg-bg-elevated border border-white/10 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-brand mt-0.5" />
                <div className="text-white/85 text-sm leading-relaxed">
                  You've sent 3 help signals in the last hour. Your people are responding.
                  Confirm escalation only if your situation has worsened, or tap a crisis line below.
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => { setRateLimitModal(false); fire({ escalation: true }); }}
                  className="py-3 rounded-xl font-bold text-sm" style={{ background: COLOR.emergency, color: 'white' }}>
                  Confirm escalation — send again
                </button>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  <a href="tel:116123" className="text-xs rounded-full px-3 py-1.5 inline-flex items-center gap-1" style={{ background: COLOR.brandTint, color: COLOR.brand, border: `1px solid ${COLOR.brand}4D` }}><Phone className="w-3 h-3" /> Samaritans 116 123</a>
                  <a href="tel:03003300630" className="text-xs rounded-full px-3 py-1.5 inline-flex items-center gap-1" style={{ background: COLOR.brandTint, color: COLOR.brand, border: `1px solid ${COLOR.brand}4D` }}><Phone className="w-3 h-3" /> LGBT+ 0300 330 0630</a>
                  <a href="tel:999" className="text-xs rounded-full px-3 py-1.5 inline-flex items-center gap-1" style={{ background: COLOR.brandTint, color: COLOR.brand, border: `1px solid ${COLOR.brand}4D` }}><Phone className="w-3 h-3" /> 999</a>
                </div>
                <button onClick={() => setRateLimitModal(false)} className="py-2.5 rounded-xl font-bold text-xs bg-white/8 text-white/70">Dismiss</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
