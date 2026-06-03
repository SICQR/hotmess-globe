/**
 * GhostedActivityRibbon — Honest pulse of the room above the grid.
 *
 * Two lines:
 *   1. Tone line (only when activity is genuinely low):
 *        "The field is quiet. Signals still moving."
 *      Brand-voice atmospheric admission so the page never lies, never
 *      panics, but says the room is watched-over.
 *
 *   2. Count line:
 *        "● 2 now · 5 today · 69 this week"
 *      Honest aggregates, no fake heat.
 *
 * Phil 2026-06-03 Samui — Ghosted grid revival.
 *
 * Product ruling (Phil, same session):
 *   "If there is only 1 person online, don't fake heat. But do make the
 *   room feel watched-over and alive."
 *
 * Doctrine:
 *   D35 Language Operating System — dry, declarative, no hype.
 *   D17 No silent affordance — render real numbers, no vague "many".
 *   D44 Privacy — only aggregates, never identities.
 */

import React from 'react';
import { supabase } from '@/components/utils/supabaseClient';

interface ActivityCounts {
  onlineNow: number;
  today: number;
  week: number;
}

// Threshold: "the room is quiet" trigger. Below this, surface the tone line.
const QUIET_THRESHOLD_NOW = 2;

// Atmospheric tone lines — rotated deterministically by date so the same
// user sees the same line for one calendar day. Brand voice: restrained,
// watched-over, never apologetic.
const QUIET_LINES = [
  'The field is quiet. Signals still moving.',
  'Quiet room. The night isn\'t done.',
  'Low signal. Eyes still open.',
  'Field hushed. Still listening.',
];

function pickQuietLine(): string {
  const dayKey = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  return QUIET_LINES[dayKey % QUIET_LINES.length];
}

export function GhostedActivityRibbon() {
  const [counts, setCounts] = React.useState<ActivityCounts | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t15 = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const t24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const t7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const [onlineRes, todayRes, weekRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .gt('last_seen', t15),
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .gt('last_seen', t24h),
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .gt('last_seen', t7d),
        ]);

        if (cancelled) return;
        setCounts({
          onlineNow: onlineRes.count || 0,
          today: todayRes.count || 0,
          week: weekRes.count || 0,
        });
      } catch {
        // Non-fatal — ribbon stays empty.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!counts) return null;
  if (counts.week === 0) return null;

  const isQuiet = counts.onlineNow < QUIET_THRESHOLD_NOW;
  const toneLine = isQuiet ? pickQuietLine() : null;

  return (
    <div className="px-3 pt-2 pb-1 select-none">
      {/* Tone line — only when the room is actually quiet. Italic, low-volume,
          says the truth without panic. Reads as nightlife rhythm, not failure. */}
      {toneLine && (
        <div
          className="text-[11px] italic text-white/40 leading-tight mb-1"
          aria-hidden="true"
        >
          {toneLine}
        </div>
      )}

      {/* Count line — three aggregates, never named. The green dot pulses
          only when there's actually someone online; otherwise it's a dim
          cream pip so the row keeps its rhythm. */}
      <div
        className="flex items-center gap-3 text-[10px] font-bold tracking-[0.08em] uppercase"
        aria-label={`${counts.onlineNow} active now, ${counts.today} today, ${counts.week} this week`}
      >
        <span className="flex items-center gap-1.5 text-white/70">
          <span
            aria-hidden="true"
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{
              background: counts.onlineNow > 0 ? '#30D158' : 'rgba(245,238,220,0.25)',
              boxShadow: counts.onlineNow > 0 ? '0 0 4px rgba(48,209,88,0.45)' : undefined,
              animation: counts.onlineNow > 0 ? 'hm-activity-pulse 1.8s ease-in-out infinite' : undefined,
            }}
          />
          <span>{counts.onlineNow} now</span>
        </span>
        <span className="text-white/15">·</span>
        <span className="text-white/50">{counts.today} today</span>
        <span className="text-white/15">·</span>
        <span className="text-white/40">{counts.week} this week</span>
        <style dangerouslySetInnerHTML={{ __html:
          '@keyframes hm-activity-pulse{0%,100%{opacity:.6}50%{opacity:1}}'
        }} />
      </div>
    </div>
  );
}

export default GhostedActivityRibbon;
