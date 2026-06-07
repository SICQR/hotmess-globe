/**
 * NextUpCard — the clock the week runs on (Phil 2026-06-07).
 * "People synchronize around clocks. If HOTMESS becomes predictable,
 * attendance becomes habitual."
 * Static weekly ritual schedule — no fetch, no push. Always visible on Home.
 *   Thursday 8PM       — RAW DROP (RAW CONVICT release + radio premiere)
 *   Friday 9PM–midnight — HOTMESS FRIDAY (beacons + radio live)
 * Times are Europe/London wall clock.
 */
import React, { useEffect, useState } from 'react';

const GOLD = '#C8962C';

type Ritual = { label: string; when: string; weekday: number; hour: number; durationMin: number };

const RITUALS: Ritual[] = [
  { label: 'RAW DROP', when: 'Thursday 8PM', weekday: 4, hour: 20, durationMin: 60 },
  { label: 'HOTMESS FRIDAY', when: 'Friday 9PM–midnight', weekday: 5, hour: 21, durationMin: 180 },
];

function londonNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }));
}

function nextStart(r: Ritual, from: Date): Date {
  const d = new Date(from);
  d.setHours(r.hour, 0, 0, 0);
  let delta = (r.weekday - d.getDay() + 7) % 7;
  if (delta === 0 && from.getTime() >= d.getTime() + r.durationMin * 60_000) delta = 7;
  d.setDate(d.getDate() + delta);
  return d;
}

function fmtCountdown(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const min = m % 60;
  if (d > 0) return d + 'd ' + h + 'h';
  if (h > 0) return h + 'h ' + min + 'm';
  return min + 'm';
}

export default function NextUpCard() {
  const [now, setNow] = useState<Date>(() => londonNow());

  useEffect(() => {
    const t = setInterval(() => setNow(londonNow()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'rgba(200,150,44,0.06)', border: '1px solid rgba(200,150,44,0.25)' }}
    >
      {RITUALS.map((r, i) => {
        const start = nextStart(r, now);
        const live = now.getTime() >= start.getTime() && now.getTime() < start.getTime() + r.durationMin * 60_000;
        return (
          <div
            key={r.label}
            className={'flex items-center justify-between' + (i > 0 ? ' mt-3 pt-3' : '')}
            style={i > 0 ? { borderTop: '1px solid rgba(255,255,255,0.08)' } : undefined}
          >
            <div>
              <div className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: GOLD }}>
                {live ? r.label : 'Next ' + r.label}
              </div>
              <div className="text-sm font-medium text-white mt-0.5">{r.when}</div>
            </div>
            <div className="text-right">
              {live ? (
                <span
                  className="text-[11px] font-black tracking-[0.18em] uppercase px-2 py-1 rounded-full"
                  style={{ background: GOLD, color: '#050507' }}
                >
                  On now
                </span>
              ) : (
                <span className="text-xs tabular-nums" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {'in ' + fmtCountdown(start.getTime() - now.getTime())}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
