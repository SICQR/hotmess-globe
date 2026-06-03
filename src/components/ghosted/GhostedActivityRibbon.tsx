/**
 * GhostedActivityRibbon — Qualitative atmospheric tone line above the grid.
 *
 * Phil 2026-06-03 Samui — Vitality Slice 1 amendment.
 *
 * Locked product rule: "the app should never show inhouse metrix unless
 * i say. ghosted currently says, 1 now, 5 today and 72 last week" — the
 * v0 ribbon (PR #853) exposed `N now · N today · N this week` numbers.
 * Stripped. The numbers are operational truth, not consumer signal —
 * they advertise low activity to users and to anyone screenshotting the
 * grid. Removed.
 *
 * The ribbon now surfaces ONE thing: a qualitative band that describes
 * the room without naming numbers. Bands are derived from real activity
 * data (so they're never wrong) but expose only the atmosphere, not the
 * arithmetic.
 *
 * Bands (in cream, italic, low volume):
 *   HUSHED   — almost no one active right now → "Field hushed. Still listening."
 *   STEADY   — sane night-time baseline      → "Steady tonight."
 *   FILLING  — meaningful momentum           → "Room's filling."
 *   FULL     — peak activity                 → "Room is full."
 *
 * Doctrine refs:
 *   D17 No silent affordance — the line still says something true.
 *   D35 Language Operating System — caps for state words only; this
 *     line is sentence case, italic, atmospheric.
 *   Internal metrics rule (Phil 2026-06-03) — no counts, no metrics,
 *     no timeline numbers surfaced to consumer view without explicit OK.
 *
 * Future:
 *   - Phil-only "metrics overlay" gated behind dev flag if internal
 *     observation is needed (separate slice, not in this PR).
 */

import React from 'react';
import { supabase } from '@/components/utils/supabaseClient';

type Band = 'HUSHED' | 'STEADY' | 'FILLING' | 'FULL';

const BAND_VARIANTS: Record<Band, string[]> = {
  HUSHED: [
    'Field hushed. Still listening.',
    'Quiet room. The night isn\'t done.',
    'Low signal. Eyes still open.',
    'Field hushed. Still listening.',
  ],
  STEADY: [
    'Steady tonight.',
    'Room\'s holding its own.',
    'Quiet pull. Watch the door.',
  ],
  FILLING: [
    'Room\'s filling.',
    'Pulse picking up.',
    'Pressure rising.',
  ],
  FULL: [
    'Room is full.',
    'Loud night.',
    'The city is awake.',
  ],
};

// Internal-only thresholds. Used to derive the band; NEVER rendered.
// Loose so the band feels true across a wide range of real cohorts.
function bandFromCounts(onlineNow: number, today: number, week: number): Band {
  if (onlineNow >= 25) return 'FULL';
  if (onlineNow >= 10 || today >= 60) return 'FILLING';
  if (onlineNow >= 3 || today >= 15 || week >= 80) return 'STEADY';
  return 'HUSHED';
}

function pickVariant(band: Band): string {
  const list = BAND_VARIANTS[band];
  const dayKey = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  return list[dayKey % list.length];
}

export function GhostedActivityRibbon() {
  const [line, setLine] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t15 = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const t24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const t7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const [onlineRes, todayRes, weekRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }).gt('last_seen', t15),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).gt('last_seen', t24h),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).gt('last_seen', t7d),
        ]);

        if (cancelled) return;
        const band = bandFromCounts(
          onlineRes.count || 0,
          todayRes.count || 0,
          weekRes.count || 0,
        );
        setLine(pickVariant(band));
      } catch {
        // Non-fatal — ribbon stays silent rather than rendering broken state.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!line) return null;

  return (
    <div className="px-3 pt-2 pb-1 select-none">
      <div
        className="text-[11px] italic leading-tight"
        style={{ color: 'rgba(245,238,220,0.45)' }}
        aria-hidden="true"
      >
        {line}
      </div>
    </div>
  );
}

export default GhostedActivityRibbon;
