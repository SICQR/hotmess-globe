/**
 * RadioShowPage — /music/shows/:showId
 *
 * Phil 2026-06-03 — closes the dead end the radio sheet's show cards created
 * (they used to toggle a ring, then briefly navigated to a route that didn't
 * exist; now they land here).
 *
 * Shows: name, host, schedule line, tagline, full blurb. Each carries a
 * COMING SOON atmospheric banner because no show is broadcasting yet —
 * D55 rule, no fake live state. Tone is HOTMESS register, not radio-station-app.
 *
 * Single CTA: open the RADIO PLAYER sheet (the live stream). No share, no
 * subscribe, no fake stats, no "next episode" countdown. The show breathes
 * on the page; the listener can tap into the stream if they want to hear
 * what's actually airing right now.
 *
 * If :showId doesn't match anything, a clean empty state with a Back to
 * Radio CTA. No 404 page, no surprise.
 *
 * Show data is intentionally imported via a thin shared module today
 * (`@/lib/data/radioShows`) to keep the substrate single-primitive (D53
 * §1.4) ahead of consolidating L2ScheduleSheet and RadioMode on the same
 * source.
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Radio as RadioIcon, Clock } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { RADIO_SHOWS } from '@/lib/data/radioShows';

const GOLD = '#C8962C';

export default function RadioShowPage() {
  const { showId } = useParams<{ showId: string }>();
  const navigate = useNavigate();
  const { openSheet } = useSheet();

  const show = RADIO_SHOWS.find((s) => s.id === showId);

  if (!show) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 text-center">
        <RadioIcon className="w-10 h-10 text-white/20 mb-4" />
        <p className="text-white/55 text-sm font-bold uppercase tracking-wider mb-2">
          Show not found
        </p>
        <p className="text-white/35 text-xs mb-8 max-w-xs">
          The show you're looking for isn't on the schedule yet.
        </p>
        <button
          onClick={() => navigate('/radio')}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-[0.15em] text-white/85 border border-white/10 hover:border-[#C8962C]/40 hover:text-white hover:bg-white/5 transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Radio
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Back chevron — contextual return to /radio (NOT navigate(-1), which
          can land anywhere). User came here from a show card; back goes to
          the surface that surfaced it. */}
      <button
        onClick={() => navigate('/radio')}
        aria-label="Back to Radio"
        className="fixed top-0 left-0 z-20 m-4 mt-[max(16px,env(safe-area-inset-top))] w-10 h-10 rounded-full bg-white/8 backdrop-blur-md flex items-center justify-center active:scale-95 transition-transform"
      >
        <ChevronLeft className="w-5 h-5 text-white/60" />
      </button>

      {/* Hero — typography-led, no photo overlay (luxury brutalism) */}
      <section className="relative px-6 pt-[max(96px,env(safe-area-inset-top))] pb-10 text-center">
        {/* Subtle gold breath behind the title */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at center 35%, rgba(200,150,44,0.10) 0%, transparent 60%)',
          }}
          aria-hidden
        />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative z-10"
        >
          {/* Coming Soon atmospheric pill — D55 register, NOT retail urgency */}
          <span
            className="inline-flex items-center gap-1.5 mb-5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.25em] border"
            style={{
              background: 'rgba(200,150,44,0.10)',
              borderColor: 'rgba(200,150,44,0.45)',
              color: GOLD,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: GOLD, opacity: 0.7 }}
            />
            Coming Soon
          </span>

          <div className="text-4xl mb-4" aria-hidden>
            {show.emoji}
          </div>

          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-[1.0] mb-3">
            {show.name}
          </h1>

          <p
            className="text-[12px] font-black uppercase tracking-[0.25em] mb-2"
            style={{ color: GOLD }}
          >
            with {show.host}
          </p>

          <p className="inline-flex items-center gap-1.5 text-white/45 text-[11px] font-semibold mb-8">
            <Clock className="w-3.5 h-3.5" />
            {show.time}
          </p>

          {/* Listen Live CTA — opens the radio player sheet (the live stream,
              honest: not "play this show", just "tune into the room"). */}
          <div>
            <button
              onClick={() => openSheet('radio-player', {})}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.2em] text-black active:scale-95 transition-transform"
              style={{
                background: GOLD,
                boxShadow: '0 0 20px rgba(200,150,44,0.35)',
              }}
            >
              <RadioIcon className="w-4 h-4" />
              Tune into HOTMESS Radio
            </button>
          </div>
        </motion.div>
      </section>

      {/* Show context — tagline + blurb */}
      <section className="px-6 pb-16 max-w-2xl mx-auto">
        <p className="text-white/75 text-base md:text-lg leading-snug mb-5 text-center">
          {show.description}
        </p>

        <div className="border-t border-white/8 pt-6">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em] mb-3">
            About the show
          </p>
          <p className="text-white/55 text-[14px] leading-relaxed">{show.blurb}</p>
        </div>

        {/* Quiet line that names the reality without lying about state */}
        <p className="text-white/30 text-[11px] text-center font-mono mt-10">
          Live broadcasts begin when the schedule goes live. Until then,
          HOTMESS Radio runs a continuous stream.
        </p>
      </section>
    </div>
  );
}
