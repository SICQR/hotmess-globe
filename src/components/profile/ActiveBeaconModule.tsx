/**
 * ActiveBeaconModule — entity-aware beacon module on a viewed profile.
 *
 * Renders when arriving at `/profile/:userId?beacon=:beaconId` and the
 * beacon row is `status='active' AND ends_at > now()`. Shows compact
 * entity identity, beacon type, optional note, location label, time
 * remaining (mm:ss countdown), and three CTAs: Boo / Message / Report.
 *
 * Doctrine: docs/doctrine/beacon-doctrine.md §12.
 *   - "Beacon active now. Respect the signal. Consent still comes first."
 *   - Quiet states are valid: render NOTHING when no beacon / expired /
 *     loading. Stale must not look live.
 *   - Beacon Identity palette: gold (#C8962C) for venue-state; care cream
 *     (#F4F1E8) for clinic/aftercare.
 *
 * NOTE: 18+ gate / consent flows belong to the CREATE flow, not view.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Ghost, MessageSquare, Flag, MapPin, Clock, Loader2 } from 'lucide-react';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import { supabase } from '@/components/utils/supabaseClient';
import { useTaps } from '@/hooks/useTaps';
import { toast } from 'sonner';

import type { ActiveBeacon } from '@/hooks/useBeaconById';

// ── Beacon Identity palette ──────────────────────────────────────────────────
const AMBER = '#C8962C';
const CARE_CREAM = '#F4F1E8';
const CARE_CATEGORIES = new Set(['clinic', 'aftercare', 'care', 'recovery']);

// ── Type → human-readable label dictionary ───────────────────────────────────
// Keep tight. New beacon types? Update beacon-identity-system.md + this map.
const TYPE_LABELS: Record<string, string> = {
  market: 'Market',
  event: 'Event',
  venue: 'Venue',
  clinic: 'Clinic',
  aftercare: 'Aftercare',
  care: 'Care',
  recovery: 'Recovery',
  radio: 'Radio',
  meetup: 'Meetup',
  scene: 'Scene',
  cruise: 'Cruise',
  hookup: 'Hookup',
  hang: 'Hang',
  explore: 'Explore',
  sos: 'SOS',
};

function typeLabel(t: string | null | undefined): string {
  if (!t) return 'Beacon';
  const k = t.toString().toLowerCase();
  if (TYPE_LABELS[k]) return TYPE_LABELS[k];
  return k.charAt(0).toUpperCase() + k.slice(1);
}

function paletteColor(category: string | null | undefined, type: string | null | undefined): string {
  const c = (category || type || '').toString().toLowerCase();
  if (CARE_CATEGORIES.has(c)) return CARE_CREAM;
  return AMBER;
}

// SACRED INVARIANT #7: no exact tracking, fuzzy ≤200m, no trails.
// Raw lat/lng is NEVER rendered. Prefer human-readable city/slug; if neither
// exists, return a generic placeholder. The map still uses precise coords;
// only the *display* is fuzzed.
function locationLabel(b: ActiveBeacon): string | null {
  // Guard against PostGIS WKB-hex leaking through the .city field.
  const safeCity = (v: unknown) => {
    if (!v || typeof v !== 'string') return null;
    const t = v.trim();
    if (!t) return null;
    if (/^[0-9A-Fa-f]{20,}$/.test(t)) return null;
    return t;
  };
  const c = safeCity(b.city) || safeCity(b.city_slug as unknown);
  if (c) return c;
  // Coords present but no human label — show a generic 'approximate area'
  // instead of the lat/lng pair. Sacred Invariant compliance.
  if (typeof b.geo_lat === 'number' && typeof b.geo_lng === 'number') {
    return 'Approximate area';
  }
  return null;
}

// ── mm:ss formatter — no date-fns dep just for this ─────────────────────────
function formatRemaining(endsAtIso: string, nowMs: number): string {
  const endMs = new Date(endsAtIso).getTime();
  const diffSec = Math.max(0, Math.floor((endMs - nowMs) / 1000));
  if (diffSec >= 3600) {
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    return `${h}h ${String(m).padStart(2, '0')}m`;
  }
  const m = Math.floor(diffSec / 60);
  const s = diffSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export type ActiveBeaconModuleProps = {
  beacon: ActiveBeacon | null | undefined;
  /** Owner id for the beacon — typically the viewed profile's id. */
  ownerId?: string | null;
  /** Optional display name shown in the compact entity row. */
  ownerName?: string | null;
  /**
   * Beacon id from the URL when the row resolves to null (expired /
   * cancelled / wrong owner / not visible). When provided, the component
   * renders the soft "this beacon has faded" hint instead of vanishing
   * silently. Required for the doctrine'd `?beacon=` fallback (UserProfile
   * passes `fadedBeaconId={activeBeacon ? null : beaconId}`). Without
   * destructuring this prop the component threw a ReferenceError at
   * line 117 (`if (!fadedBeaconId)`) every time `beacon` was null while
   * the URL still had `?beacon=`. Phil 2026-05-27 SMASH carousel crash.
   */
  fadedBeaconId?: string | null;
};

export function ActiveBeaconModule({ beacon, ownerId, ownerName, fadedBeaconId }: ActiveBeaconModuleProps) {
  const { openSheet } = useSheet();
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [myUserId, setMyUserId] = useState<string | null>(null);
  // D57 CF-4 fix — Boo button needs pending/booed/mutual visual state. The
  // write itself worked (Phil → Tony 2026-06-04 00:30:53 UTC) but the UI
  // gave zero feedback, so Phil thought it was dead and assumed the entire
  // comms path was broken. Local pending flag drives the spinner; useTaps
  // drives the booed / mutual states.
  const [booPending, setBooPending] = useState(false);

  // Self id for boo (M9 Phil 2026-05-28: handleBoo was a console.log)
  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (alive) setMyUserId(data?.user?.id ?? null);
    });
    return () => { alive = false; };
  }, []);

  const { sendTap, isTapped, isMutualBoo } = useTaps(myUserId);

  // 1Hz tick for the countdown. Hook order must be stable, so we run the
  // timer unconditionally and just skip work when there's no beacon.
  useEffect(() => {
    if (!beacon) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [beacon]);

  const remaining = useMemo(() => {
    if (!beacon) return '';
    return formatRemaining(beacon.ends_at, nowMs);
  }, [beacon, nowMs]);

  // Faded state: ?beacon= was in the URL but the row resolved to null
  // (expired, cancelled, wrong owner, or missing). Per doctrine 2026-05-26,
  // we show a soft "this beacon has faded" hint instead of disappearing,
  // because the user clicked a real-looking link and deserves a signpost.
  if (!beacon) {
    if (!fadedBeaconId) return null;
    return (
      <section
        aria-label="Faded beacon"
        className="mx-4 mt-4 rounded-2xl p-4"
        style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-white/35">
            Beacon faded
          </span>
          <p className="text-[14px] text-white/65 leading-snug">
            This beacon has faded. The signal ended, but you can still view the profile if they're visible to you.
          </p>
        </div>
      </section>
    );
  }
  const endMs = new Date(beacon.ends_at).getTime();
  if (!Number.isFinite(endMs) || endMs <= nowMs) {
    return (
      <section
        aria-label="Faded beacon"
        className="mx-4 mt-4 rounded-2xl p-4"
        style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-white/35">
            Beacon faded
          </span>
          <p className="text-[14px] text-white/65 leading-snug">
            This beacon has faded. The signal ended, but you can still view the profile if they're visible to you.
          </p>
        </div>
      </section>
    );
  }

  const accent = paletteColor(beacon.beacon_category, beacon.type);
  const loc = locationLabel(beacon);

  const handleBoo = async () => {
    // M9 (Phil 2026-05-28): real boo via useTaps.sendTap (was console.log only).
    // D57 CF-4 fix (Phil 2026-06-04): the write was always working — Phil
    // booed Tony at 00:30:53 UTC and the row landed in public.taps. What was
    // missing was the continuity layer: pending → confirmed → state-aware
    // button text. Phil read "no visible change" as "Boo is dead", thought
    // the M8 gate was unreachable, and the whole comms path felt blocked.
    //
    // Now: set pending immediately, read sendTap's return, surface error
    // inline. The button visual state (Boo / sending / Booed / Booed back)
    // is driven by useTaps.isTapped + isMutualBoo so it updates on success
    // without a refetch.
    if (!ownerId || !myUserId || booPending) return;
    setBooPending(true);
    try {
      const result = await sendTap(ownerId, ownerName || 'them');
      if (result?.error) {
        // useTaps already captured to Sentry + analytics. Surface inline
        // (not toast-only — but on a profile route a small toast is the
        // cleanest signal since there is no dedicated error chip slot here).
        toast.error("Couldn't boo. Tap to retry.");
      }
    } catch (e) {
      console.warn('[ActiveBeaconModule] sendTap threw', e);
      toast.error("Couldn't boo. Tap to retry.");
    } finally {
      setBooPending(false);
    }
  };

  const handleMessage = () => {
    if (!ownerId) return;
    // Phil 2026-05-29 hard gate — chat surface is post-mutual-boo only.
    // Pre-mutual taps the Message button = nudge to Boo first, do not open chat.
    // Doctrine 07: monetisation never overrides relational truth; the writing
    // moment must be earned through reciprocity, not surfaced unconditionally.
    if (!isMutualBoo(ownerId)) {
      toast('Boo first. They have to want it back.');
      return;
    }
    openSheet(SHEET_TYPES.CHAT, { userId: ownerId, beaconId: beacon.id });
  };

  const handleReport = async () => {
    const reason = window.confirm(
      'Report this beacon? Use this for safety, harassment, or fake-presence concerns.'
    );
    if (!reason) return;
    try {
      const { data: auth } = await supabase.auth.getUser();
      const reporterId = auth?.user?.id ?? null;
      const { error } = await supabase.from('reports').insert({
        reporter_id: reporterId,
        target_id: beacon.id,
        target_type: 'beacon',
        reason: 'profile_active_beacon_report',
        notes: null,
        status: 'open',
      });
      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[ActiveBeaconModule] report insert failed', error.message);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[ActiveBeaconModule] report failed', e);
    }
  };

  return (
    <section
      aria-label="Active beacon"
      className="mx-4 mt-4 rounded-2xl overflow-hidden"
      style={{ background: '#1C1C1E', border: `1px solid ${accent}33` }}
    >
      {/* Accent rail */}
      <div style={{ height: 2, background: accent }} />

      <div className="p-4 flex flex-col gap-3">
        {/* Identity row + countdown */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
              aria-hidden
            />
            <span
              className="text-[11px] uppercase tracking-[0.12em] font-semibold truncate"
              style={{ color: accent }}
            >
              {typeLabel(beacon.type)}
            </span>
            {ownerName && (
              <span className="text-[12px] text-white/60 truncate">
                · {ownerName}
              </span>
            )}
          </div>
          <div
            className="flex items-center gap-1 text-[12px] tabular-nums"
            style={{ color: accent }}
            aria-live="polite"
          >
            <Clock size={12} aria-hidden />
            <span>{remaining}</span>
          </div>
        </div>

        {/* Title / note */}
        {(beacon.title || beacon.description) && (
          <div className="flex flex-col gap-1">
            {beacon.title && (
              <h3 className="text-[15px] font-semibold text-white leading-snug">
                {beacon.title}
              </h3>
            )}
            {beacon.description && (
              <p className="text-[13px] text-white/70 leading-snug">
                {beacon.description}
              </p>
            )}
          </div>
        )}

        {/* Location */}
        {loc && (
          <div className="flex items-center gap-1.5 text-[12px] text-white/55">
            <MapPin size={12} aria-hidden />
            <span className="truncate">{loc}</span>
          </div>
        )}

        {/* Doctrine microcopy */}
        <p className="text-[11px] leading-snug text-white/45">
          Beacon active now. Respect the signal. Consent still comes first.
        </p>

        {/* CTAs — D57 CF-4 fix (Phil 2026-06-04): Boo button now has
            pending / booed / mutual-booed visual states. Previous build
            kept the same "Boo" label and dark background no matter what,
            so the user got zero feedback that their tap landed; the entire
            comms gate looked broken. */}
        {(() => {
          // Compute Boo button state. ownerId is checked before useTaps
          // returns falsy (it requires both ids), so we guard explicitly.
          const isBooed = !!(ownerId && isTapped(ownerId, 'boo'));
          const isMutual = !!(ownerId && isMutualBoo(ownerId));
          const booBg = booPending
            ? '#2A2A2C'
            : isMutual
              ? accent
              : isBooed
                ? 'rgba(200,150,44,0.18)' // soft gold tint when one-way booed
                : '#2A2A2C';
          const booColor = isMutual ? '#000' : isBooed ? '#C8962C' : 'rgba(255,255,255,0.85)';
          const booLabel = booPending
            ? 'sending'
            : isMutual
              ? 'Booed back'
              : isBooed
                ? 'Booed'
                : 'Boo';
          return (
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            onClick={handleBoo}
            disabled={booPending || !ownerId || !myUserId}
            aria-pressed={isBooed}
            className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-medium active:scale-[0.98] transition-all disabled:cursor-not-allowed"
            style={{ background: booBg, color: booColor, fontWeight: isMutual ? 700 : 500 }}
            aria-label={isMutual ? 'Mutual boo' : isBooed ? "Un-boo this beacon" : "Boo this beacon"}
          >
            {booPending ? (
              <Loader2 size={14} className="animate-spin" aria-hidden />
            ) : (
              <Ghost size={14} aria-hidden style={{ fill: isMutual ? '#000' : isBooed ? '#C8962C' : 'transparent' }} />
            )}
            <span>{booLabel}</span>
          </button>
          <button
            type="button"
            onClick={handleMessage}
            disabled={!ownerId}
            className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-50"
            style={{ background: accent, color: '#000' }}
            aria-label="Message about this beacon"
          >
            <MessageSquare size={14} aria-hidden />
            <span>Message</span>
          </button>
          <button
            type="button"
            onClick={handleReport}
            className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-medium text-white/70 active:scale-[0.98] transition-transform"
            style={{ background: '#2A2A2C' }}
            aria-label="Report this beacon"
          >
            <Flag size={14} aria-hidden />
            <span>Report</span>
          </button>
        </div>
          );
        })()}
      </div>
    </section>
  );
}

export default ActiveBeaconModule;

