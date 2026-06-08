/**
 * NextUpCard — full-bleed ritual banners + countdown chips (Phil 2026-06-07).
 * "People synchronize around clocks. If HOTMESS becomes predictable,
 * attendance becomes habitual."
 * Whole banner is the button — no extra CTA chrome, the artwork carries it.
 *
 * slot="next"  → renders ONLY the next chronological ritual (top of Home,
 *                above Safety Network — one poster, not a billboard wall).
 * slot="rest"  → renders the remaining rituals (mounted further down Home,
 *                in Ghosted's world). Safety/Care stay above the fold.
 *
 *   RAW DROP        Thu 8PM   → /music  (radio premiere)
 *   HOTMESS FRIDAY  Fri 9PM   → /pulse  (drop a beacon, see who's out)
 *   HAND N HAND     Sunday    → /music  (coming soon — baked into art)
 * Countdown chip = HTML overlay so art never goes stale. Europe/London clock.
 * Assets: /public/banners/*.webp (1400w, ~130KB each).
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const GOLD = '#C8962C';

type Ritual = {
  key: string;
  img: string;
  alt: string;
  route: string;
  weekday: number | null; // null = no countdown (coming soon)
  hour: number;
  durationMin: number;
};

const RITUALS: Ritual[] = [
  { key: 'rawdrop', img: '/banners/rawdrop-home.webp', alt: 'RAW DROP — new music, first heard here. Thursday 8PM live on HOTMESS Radio', route: '/music', weekday: 4, hour: 20, durationMin: 60 },
  { key: 'friday', img: '/banners/friday-home.webp', alt: 'HOTMESS FRIDAY — the weekend has started. Drop a beacon, see who is out', route: '/pulse', weekday: 5, hour: 21, durationMin: 180 },
  { key: 'hnh', img: '/banners/hnh-home.webp', alt: 'HAND N HAND — the only place to land. Sundays on HOTMESS Radio. Coming soon', route: '/music', weekday: null, hour: 0, durationMin: 0 },
];

function londonNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }));
}

function nextStart(weekday: number, hour: number, durationMin: number, from: Date): Date {
  const d = new Date(from);
  d.setHours(hour, 0, 0, 0);
  let delta = (weekday - d.getDay() + 7) % 7;
  if (delta === 0 && from.getTime() >= d.getTime() + durationMin * 60_000) delta = 7;
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

export default function NextUpCard({ slot = 'next' }: { slot?: 'next' | 'rest' }) {
  const navigate = useNavigate();
  const [now, setNow] = useState<Date>(() => londonNow());

  useEffect(() => {
    const t = setInterval(() => setNow(londonNow()), 30_000);
    return () => clearInterval(t);
  }, []);

  // The next chronological scheduled ritual owns the top slot.
  const scheduled = RITUALS.filter((r) => r.weekday !== null);
  const nextKey = scheduled.reduce((best, r) => {
    const s = nextStart(r.weekday as number, r.hour, r.durationMin, now).getTime();
    return s < best.t ? { k: r.key, t: s } : best;
  }, { k: scheduled[0].key, t: Infinity as number }).k;

  const visible = slot === 'next'
    ? RITUALS.filter((r) => r.key === nextKey)
    : RITUALS.filter((r) => r.key !== nextKey);

  return (
    <div className="space-y-3">
      {visible.map((r) => {
        let chip: React.ReactNode = null;
        if (r.weekday !== null) {
          const start = nextStart(r.weekday, r.hour, r.durationMin, now);
          const live = now.getTime() >= start.getTime() && now.getTime() < start.getTime() + r.durationMin * 60_000;
          chip = (
            <span
              className="absolute bottom-2.5 right-2.5 text-[11px] font-black tracking-[0.14em] uppercase px-2.5 py-1 rounded-full tabular-nums"
              style={live
                ? { background: GOLD, color: '#050507' }
                : { background: 'rgba(5,5,7,0.72)', color: GOLD, border: '1px solid rgba(200,150,44,0.4)', backdropFilter: 'blur(8px)' }}
            >
              {live ? 'ON NOW' : 'in ' + fmtCountdown(start.getTime() - now.getTime())}
            </span>
          );
        }
        return (
          <button
            key={r.key}
            type="button"
            onClick={() => navigate(r.route)}
            aria-label={r.alt}
            className="relative block w-full rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.08)', WebkitTapHighlightColor: 'transparent' }}
          >
            <img src={r.img} alt="" className="block w-full h-auto" loading="lazy" draggable={false} />
            {chip}
          </button>
        );
      })}
    </div>
  );
}
