import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Radio as RadioIcon, Calendar, ExternalLink, Play, Pause, Mic2, Rss } from 'lucide-react';
import { schedule } from '../components/radio/radioUtils';
import { useRadio } from '@/contexts/RadioContext';
import BrandBackground from '@/components/ui/BrandBackground';


const SHOWS = [
  { ...schedule.shows[0], accent: '#C8962C', shadow: 'rgba(255,20,147,0.4)',  icon: Mic2  },
  { ...schedule.shows[1], accent: '#00C2E0', shadow: 'rgba(0,217,255,0.4)',   icon: RadioIcon },
  { ...schedule.shows[2], accent: '#C8962C', shadow: 'rgba(176,38,255,0.4)', icon: Rss   },
];

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#C8962C]/20 border border-[#C8962C]/40 text-[#C8962C] text-[10px] font-black uppercase tracking-widest">
      <span className="w-1.5 h-1.5 rounded-full bg-[#C8962C] animate-pulse" />
      LIVE
    </span>
  );
}

/**
 * StreamPlayer — uses RadioContext (single audio element at app level).
 * Never creates its own <audio> element to prevent dual-instance bug.
 */
function StreamPlayer() {
  const { isPlaying, togglePlay, currentShowName } = useRadio();

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center gap-4">
      <button
        onClick={togglePlay}
        className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95"
        style={{ background: '#C8962C', boxShadow: '0 0 24px rgba(255,20,147,0.5)' }}
      >
        {isPlaying
          ? <Pause className="w-6 h-6 text-black" />
          : <Play  className="w-6 h-6 text-black ml-0.5" />
        }
      </button>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-black uppercase tracking-wide text-white">HOTMESS RADIO</p>
          {isPlaying && <LiveBadge />}
        </div>
        <p className="text-xs text-white/40 font-mono">
          {currentShowName || '24/7 · London Queer Nightlife'}
        </p>
      </div>
    </div>
  );
}

function ShowCard({ show, index }) {
  const Icon = show.icon ?? RadioIcon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Link to={`/music/shows/${show.slug}`} className="block group">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 transition-all h-full">
          {/* Colour band */}
          <div
            className="h-32 flex items-center justify-center relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${show.accent}30, ${show.accent}10)` }}
          >
            <div
              className="absolute inset-0 opacity-20"
              style={{ background: `radial-gradient(circle at 30% 50%, ${show.accent}, transparent 70%)` }}
            />
            <Icon
              className="w-16 h-16 relative z-10 transition-transform group-hover:scale-110 duration-300"
              style={{ color: show.accent, filter: `drop-shadow(0 0 16px ${show.shadow})` }}
            />
          </div>
          <div className="p-5">
            <p className="text-base font-black uppercase tracking-wide text-white mb-1 group-hover:text-[#C8962C] transition-colors">
              {show.title}
            </p>
            <p className="text-xs text-white/40 leading-relaxed mb-4">{show.tagline}</p>
            <span
              className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
              style={{ background: `${show.accent}20`, color: show.accent }}
            >
              {show.schedule?.days?.[0] ?? 'Weekly'} · {show.schedule?.time ?? 'See Schedule'}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function Radio() {
  const { togglePlay: openRadio } = useRadio();

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden pb-12 pt-16 px-4">
        <BrandBackground />
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="flex items-center justify-center gap-3 mb-4">
              <RadioIcon
                className="w-10 h-10"
                style={{ color: '#C8962C', filter: 'drop-shadow(0 0 16px rgba(255,20,147,0.6))' }}
              />
              <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight leading-none">
                HOT<span className="text-[#C8962C]">MESS</span> RADIO
              </h1>
            </div>
            <p className="text-white/50 text-base md:text-lg mb-8">
              24/7 · Three shows · One rule: care-first.
            </p>

            {/* Live stream player */}
            <div className="max-w-sm mx-auto mb-6">
              <StreamPlayer />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={openRadio}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-black uppercase text-sm text-black transition-all active:scale-95"
                style={{ background: '#00C2E0', boxShadow: '0 0 20px rgba(0,217,255,0.4)' }}
              >
                <ExternalLink className="w-4 h-4" /> Open Player
              </button>
              <Link
                to={createPageUrl('RadioSchedule')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-black uppercase text-sm text-white border border-white/10 hover:bg-white/5 transition-all"
              >
                <Calendar className="w-4 h-4" /> Schedule
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Shows ─────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <p className="text-[10px] uppercase tracking-[0.35em] font-mono text-white/30 mb-5">Shows</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SHOWS.map((show, i) => <ShowCard key={show.id} show={show} index={i} />)}
        </div>
      </section>

      {/* ── Record Releases ───────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <Link
          to="/music"
          className="flex items-center justify-between w-full px-5 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition-colors"
        >
          <span className="text-[10px] uppercase tracking-[0.35em] font-mono text-white/50">Raw Convict Records releases</span>
          <span className="text-[10px] uppercase tracking-widest font-mono text-[#C8962C]">Explore</span>
        </Link>
      </section>

      {/* ── HNHMESS embed ─────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <p className="text-[10px] uppercase tracking-[0.35em] font-mono text-white/30 mb-4">HNHMESS on SoundCloud</p>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden p-4">
          <iframe
            width="100%"
            height="166"
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%3Atracks%3A2243204375%3Fsecret_token%3Ds-jK7AWO2CQ6t&color=%23C8962C&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false"
            title="HNHMESS SoundCloud"
          />
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 px-4 py-8">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/30 font-mono uppercase tracking-widest">
          {[['Home', createPageUrl('Home')], ['Shop', '/market'], ['Schedule', createPageUrl('RadioSchedule')], ['Features', createPageUrl('RadioFeatures')]].map(([label, to]) => (
            <Link key={label} to={to} className="hover:text-white/60 transition-colors">{label}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
