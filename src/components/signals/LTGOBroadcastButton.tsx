/**
 * LTGOBroadcastButton
 *
 * Lets the user broadcast or withdraw a "looking to go out tonight" signal.
 * Calls /api/signals/mine on mount to check active state.
 * Uses browser geolocation for coordinates.
 * No identity shown. No profile exposed.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/components/utils/supabaseClient';

const VIOLET = '#BF5AF2';
const DARK_BG = '#1A1017';
const MUTED = '#8E8E93';

interface ActiveSignal {
  id: string;
  expires_at: string;
  fuzz_radius_m: number;
  area_hint: string | null;
}

function msUntil(isoString: string): number {
  return Math.max(0, new Date(isoString).getTime() - Date.now());
}

function formatCountdown(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m left`;
  return 'expiring…';
}

export default function LTGOBroadcastButton() {
  const [loading, setLoading] = useState(true);
  const [activeSignal, setActiveSignal] = useState<ActiveSignal | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch current signal on mount ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setLoading(false); return; }
        const res = await fetch('/api/signals/mine', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) { setLoading(false); return; }
        const json = await res.json();
        if (!cancelled) {
          if (json.active && json.signal) setActiveSignal(json.signal);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Countdown ticker ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeSignal) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const tick = () => {
      const ms = msUntil(activeSignal.expires_at);
      setCountdown(formatCountdown(ms));
      if (ms === 0) setActiveSignal(null);
    };
    tick();
    timerRef.current = setInterval(tick, 30_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeSignal]);

  // ── Broadcast ─────────────────────────────────────────────────────────────
  const handleBroadcast = useCallback(async () => {
    setError(null);
    setBroadcasting(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
        })
      );
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Sign in to broadcast'); setBroadcasting(false); return; }
      const res = await fetch('/api/signals/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Broadcast failed'); setBroadcasting(false); return; }
      setActiveSignal({
        id: json.id,
        expires_at: json.expires_at,
        fuzz_radius_m: json.fuzz_radius_m,
        area_hint: json.area_hint,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('denied') || msg.includes('PERMISSION')) {
        setError('Enable location to broadcast');
      } else {
        setError('Could not broadcast');
      }
    } finally {
      setBroadcasting(false);
    }
  }, []);

  // ── Withdraw ──────────────────────────────────────────────────────────────
  const handleWithdraw = useCallback(async () => {
    setError(null);
    setWithdrawing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setWithdrawing(false); return; }
      const res = await fetch('/api/signals/withdraw', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setActiveSignal(null);
      else {
        const json = await res.json();
        setError(json.error || 'Withdraw failed');
      }
    } catch {
      setError('Could not withdraw');
    } finally {
      setWithdrawing(false);
    }
  }, []);

  if (loading) return null;

  return (
    <div className="px-5 pb-4">
      <AnimatePresence mode="wait">
        {activeSignal ? (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between rounded-2xl px-4 py-3"
            style={{ background: DARK_BG, border: `1px solid ${VIOLET}44` }}
          >
            <div className="flex items-center gap-3">
              {/* Violet pulse dot */}
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{
                  background: VIOLET,
                  boxShadow: `0 0 8px ${VIOLET}`,
                  animation: 'ltgoPulse 2.2s ease-out infinite',
                }}
              />
              <div>
                <p className="text-white text-sm font-medium leading-tight">You&rsquo;re broadcasting</p>
                <p className="text-[11px]" style={{ color: MUTED }}>{countdown}</p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleWithdraw}
              disabled={withdrawing}
              className="h-8 px-4 rounded-full text-xs font-medium flex-shrink-0 ml-3"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
              aria-label="Withdraw LTGO signal"
            >
              {withdrawing ? 'Withdrawing…' : 'Withdraw'}
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="inactive"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleBroadcast}
              disabled={broadcasting}
              className="w-full h-12 rounded-2xl text-sm font-medium flex items-center justify-center gap-2"
              style={{
                background: broadcasting ? 'rgba(191,90,242,0.25)' : `${VIOLET}22`,
                border: `1px solid ${VIOLET}55`,
                color: broadcasting ? MUTED : VIOLET,
              }}
              aria-label="Broadcast LTGO signal"
            >
              {/* Diamond SVG */}
              {!broadcasting && (
                <svg width="14" height="14" viewBox="-7 -7 14 14" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <rect x="-5" y="-5" width="10" height="10" rx="1.5" fill={VIOLET} transform="rotate(45)" />
                </svg>
              )}
              {broadcasting ? 'Getting location…' : 'Going out tonight?'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      {error && (
        <p className="text-[11px] text-center mt-2" style={{ color: '#FF3B30' }}>{error}</p>
      )}
      {/* CSS for pulse dot animation */}
      <style>{`
        @keyframes ltgoPulse {
          0% { box-shadow: 0 0 0 0 rgba(191,90,242,0.6), 0 0 8px rgba(191,90,242,0.8); }
          70% { box-shadow: 0 0 0 10px rgba(191,90,242,0), 0 0 8px rgba(191,90,242,0.8); }
          100% { box-shadow: 0 0 0 0 rgba(191,90,242,0), 0 0 8px rgba(191,90,242,0.8); }
        }
        @keyframes ltgoBreathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
