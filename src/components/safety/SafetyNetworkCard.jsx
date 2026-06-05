/**
 * SafetyNetworkCard — #661-D Home surface (Phil-locked 2026-06-05).
 *
 * Surfaces the user's Active Network Coverage state on Home — not buried in
 * Settings. The card is the only way Coverage moves: users must keep seeing
 * the state to act on it.
 *
 * Reads from get_my_safety_network_summary() (#661-A). Three render states:
 *
 *   NOT_ACTIVE → "You haven't added anyone yet" + [Build Network]
 *   PENDING    → "Waiting for {firstName} to respond" + [View]
 *   ACTIVE     → "{N} accepted contact{s}" + [Manage]
 *
 * Tap routes to /safety/setup (nudge phase) when NOT_ACTIVE, /safety
 * when PENDING or ACTIVE.
 *
 * Doctrine: Amendment A locked — this card NEVER says "SOS unavailable" or
 * implies the safety surface is locked. No fear language. The card is a
 * state mirror, not a guilt trip.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';

const GOLD = '#C8962C';
const CARE = '#3A464D';

export default function SafetyNetworkCard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_my_safety_network_summary');
        if (cancelled) return;
        if (error) {
          // Treat error as not_active so the card still nudges.
          setSummary({ state: 'not_active', total_contacts: 0, accepted_count: 0 });
        } else if (Array.isArray(data) && data.length > 0) {
          setSummary(data[0]);
        } else {
          setSummary({ state: 'not_active', total_contacts: 0, accepted_count: 0 });
        }
      } catch {
        if (!cancelled) {
          setSummary({ state: 'not_active', total_contacts: 0, accepted_count: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Don't render until we know the state — avoids a flash of "Not Active" for
  // users who are actually Active.
  if (loading || !summary) {
    return (
      <div
        className="rounded-xl p-5 mb-3 flex items-center justify-center"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          minHeight: 96,
        }}
      >
        <Loader2 className="w-4 h-4 animate-spin text-white/30" />
      </div>
    );
  }

  const { state, accepted_count = 0, first_contact_name } = summary;
  const firstName = (first_contact_name || '').trim().split(/\s+/)[0] || 'them';

  // ── State 1: NOT_ACTIVE
  if (state === 'not_active') {
    return (
      <button
        onClick={() => navigate('/safety/setup')}
        className="w-full text-left rounded-xl p-5 mb-3 transition-colors hover:bg-white/5"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(200,150,44,0.12)' }}
          >
            <Shield className="w-4 h-4" style={{ color: GOLD }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-white text-sm font-semibold">Safety Network</p>
              <p
                className="text-[10px] uppercase tracking-[0.2em] font-medium"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                Not Active
              </p>
            </div>
            <p className="text-white/60 text-sm leading-relaxed mb-3">
              You haven't added anyone yet.
            </p>
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold" style={{ color: GOLD }}>
                Build Network
              </span>
              <ChevronRight className="w-3.5 h-3.5" style={{ color: GOLD }} />
            </div>
          </div>
        </div>
      </button>
    );
  }

  // ── State 2: PENDING
  if (state === 'pending') {
    return (
      <button
        onClick={() => navigate('/safety')}
        className="w-full text-left rounded-xl p-5 mb-3 transition-colors hover:bg-white/5"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(58,70,77,0.4)' }}
          >
            <Shield className="w-4 h-4 text-white/70" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-white text-sm font-semibold">Safety Network</p>
              <p
                className="text-[10px] uppercase tracking-[0.2em] font-medium"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                Pending
              </p>
            </div>
            <p className="text-white/60 text-sm leading-relaxed mb-3">
              Waiting for {firstName} to respond.
            </p>
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-white/80">View</span>
              <ChevronRight className="w-3.5 h-3.5 text-white/80" />
            </div>
          </div>
        </div>
      </button>
    );
  }

  // ── State 3: ACTIVE
  return (
    <button
      onClick={() => navigate('/safety')}
      className="w-full text-left rounded-xl p-5 mb-3 transition-colors hover:bg-white/5"
      style={{
        background: 'linear-gradient(135deg, rgba(200,150,44,0.06), rgba(200,150,44,0.02))',
        border: '1px solid rgba(200,150,44,0.18)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(200,150,44,0.18)' }}
        >
          <Shield className="w-4 h-4" style={{ color: GOLD }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-white text-sm font-semibold">Safety Network</p>
            <p
              className="text-[10px] uppercase tracking-[0.2em] font-medium"
              style={{ color: GOLD }}
            >
              Active
            </p>
          </div>
          <p className="text-white/70 text-sm leading-relaxed mb-3">
            {accepted_count === 1
              ? '1 accepted contact'
              : `${accepted_count} accepted contacts`}
          </p>
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-white/80">Manage</span>
            <ChevronRight className="w-3.5 h-3.5 text-white/80" />
          </div>
        </div>
      </div>
    </button>
  );
}
