/**
 * MusicTab — SMASH DADDYS / RAW CONVICT RECORDS
 *
 * Music = release library ONLY. Radio lives in RadioMode.
 * Sections: Hero → Hot Right Now → Producer Mode → All Releases → Preview/Stem overlays
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, ChevronDown, Disc3, X,
  Crown, FileAudio, Headphones, ExternalLink,
} from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { trackIntent } from '@/lib/notifications/templates';

// ── Brand tokens ─────────────────────────────────────────────────────────────
const GOLD = '#C8962C';
const BG = '#000000';
const CARD = '#1C1C1E';
const LABEL_RED = '#9B1B2A';
const TEAL = '#00C2E0';
const SOUNDCLOUD = '#FF5500';
const SPOTIFY = '#1DB954';
// LIVE_GREEN removed — radio indicator no longer in Music tab

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms) {
  if (!ms) return '';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function formatSeconds(sec) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getTrackAccessLevel(track) {
  if (track.stem_pack_url) return 'stems';
  if (track.download_url || (track.preview_url && !track.is_preview_only)) return 'full';
  if (track.preview_url) return 'preview';
  return 'coming_soon';
}

function getReleaseAccessLevel(release, releaseTracks) {
  if (release.stem_pack_url) return 'stems';
  if (releaseTracks?.some(t => t.stem_pack_url)) return 'stems';
  if (release.download_url || (release.preview_url && !release.is_preview_only)) return 'full';
  if (release.preview_url) return 'preview';
  return 'coming_soon';
}

// ── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ children, color = 'white' }) {
  return (
    <h2
      className="text-xs font-black uppercase tracking-[0.2em] mb-4"
      style={{ color }}
    >
      {children}
    </h2>
  );
}

// ── Platform Link Buttons ────────────────────────────────────────────────────

function PlatformLinks({ release, className = '' }) {
  const links = [
    { url: release?.soundcloud_url, label: 'SoundCloud', color: SOUNDCLOUD },
    { url: release?.spotify_url, label: 'Spotify', color: SPOTIFY },
    { url: release?.apple_music_url, label: 'Apple Music', color: '#FA2D48' },
    { url: release?.beatport_url, label: 'Beatport', color: '#94D500' },
  ].filter(l => l.url);
  if (links.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {links.map(link => (
        <a
          key={link.label}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-white/10 active:scale-95 transition-transform"
          style={{ color: link.color }}
          aria-label={`Open on ${link.label}`}
        >
          <ExternalLink className="w-3 h-3" />
          {link.label}
        </a>
      ))}
    </div>
  );
}

// ── Lyrics Accordion ─────────────────────────────────────────────────────────

function LyricsAccordion({ lyrics }) {
  const [open, setOpen] = useState(false);
  if (!lyrics) return null;

  return (
    <div className="mt-4 border border-white/8 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 active:bg-white/5 transition-colors"
        aria-expanded={open}
        aria-label="Toggle lyrics"
      >
        <span className="text-xs font-bold uppercase text-white/60">Lyrics</span>
        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <pre className="px-4 pb-4 text-xs text-white/50 whitespace-pre-wrap font-sans leading-relaxed">
              {lyrics}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Linked Entity Card ───────────────────────────────────────────────────────

function LinkedEntityCard({ release }) {
  if (!release.linked_entity_type || !release.linked_entity_label) return null;
  const typeColors = { app_feature: GOLD, product: '#9E7D47', brand: LABEL_RED, event: TEAL };
  const color = typeColors[release.linked_entity_type] || GOLD;

  return (
    <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.02] p-4">
      <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">
        This track is about
      </p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
          <ExternalLink className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">{release.linked_entity_label}</p>
          <p className="text-[10px] text-white/40 uppercase">{release.linked_entity_type.replace('_', ' ')}</p>
        </div>
        {release.linked_entity_url && (
          <a
            href={release.linked_entity_url}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-transform"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {release.linked_entity_cta || 'View'}
          </a>
        )}
      </div>
    </div>
  );
}

// ── Stem Pack Stub ───────────────────────────────────────────────────────────

function StemPackStub({ release }) {
  if (!release.stem_pack_url) return null;

  return (
    <div className="mt-4 rounded-xl border border-[#9B1B2A]/20 bg-[#9B1B2A]/5 p-4">
      <div className="flex items-center gap-3">
        <FileAudio className="w-5 h-5 text-[#9B1B2A]" />
        <div className="flex-1">
          <p className="text-xs font-bold text-white">Stem Pack Available</p>
          <p className="text-[10px] text-white/40">
            {release.stem_pack_price_gbp
              ? `£${Number(release.stem_pack_price_gbp).toFixed(2)}`
              : 'Free with membership'}
          </p>
        </div>
        <button
          onClick={() => toast('Stems coming soon')}
          className="px-3 py-1.5 rounded-lg bg-[#9B1B2A] text-[10px] font-bold uppercase text-white active:scale-[0.97] transition-transform"
        >
          Get Stems
        </button>
      </div>
    </div>
  );
}

// ── Member Gate Banner ───────────────────────────────────────────────────────

function MemberGateBanner({ onJoin }) {
  return (
    <div className="rounded-xl border border-[#C8962C]/20 bg-[#C8962C]/5 p-4 flex items-center gap-3">
      <Crown className="w-5 h-5 text-[#C8962C]" />
      <div className="flex-1">
        <p className="text-xs font-bold text-white">Members Only</p>
        <p className="text-[10px] text-white/40">Full tracks, stems, and downloads require membership</p>
      </div>
      <button
        onClick={onJoin}
        className="px-3 py-1.5 rounded-lg bg-[#C8962C] text-[10px] font-black uppercase text-black active:scale-[0.97] transition-transform"
      >
        Join
      </button>
    </div>
  );
}
// ── Release Detail Sheet ─────────────────────────────────────────────────────

function ReleaseDetailSheet({ release, tracks, onClose }) {
  const player = useMusicPlayer();
  const navigate = useNavigate();

  const trackList = tracks.length > 0
    ? tracks.map(t => ({ ...t, artist: 'Smash Daddys', artwork_url: release.artwork_url }))
    : [{
        id: release.id, title: release.title, artist: 'Smash Daddys',
        artwork_url: release.artwork_url, preview_url: release.preview_url,
        download_url: release.download_url, duration_ms: release.duration_ms,
        duration_seconds: release.duration_seconds,
      }];

  const handlePlayTrack = (track, idx) => player.playTrack(track, trackList, idx);
  const handlePlayAll = () => { if (trackList.length > 0) player.playTrack(trackList[0], trackList, 0); };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed inset-0 z-[100] bg-[#0D0D0D] overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#0D0D0D]/90 backdrop-blur-xl border-b border-white/5">
        <button onClick={onClose} className="p-2 -ml-2 w-10 h-10 flex items-center justify-center" aria-label="Close">
          <ChevronDown className="w-5 h-5 text-white/60" />
        </button>
        <span className="text-[10px] font-bold uppercase text-white/30 tracking-widest">
          {release.catalog_number || 'Release'}
        </span>
        <button onClick={onClose} className="p-2 -mr-2 w-10 h-10 flex items-center justify-center" aria-label="Close">
          <X className="w-5 h-5 text-white/60" />
        </button>
      </div>

      <div className="px-4 pb-40">
        {/* Artwork */}
        <div className="mt-4 mx-auto w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden bg-[#1C1C1E] shadow-2xl">
          {release.artwork_url ? (
            <img src={release.artwork_url} alt={release.title} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1C1C1E] to-[#0D0D0D]">
              <Disc3 className="w-14 h-14 text-[#C8962C]/20 mb-2" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/15">RAW CONVICT</span>
            </div>
          )}
        </div>

        {/* Title + meta */}
        <div className="mt-5 text-center">
          <h2 className="text-xl font-black uppercase text-white leading-tight">{release.title}</h2>
          <p className="text-xs text-white/40 mt-1 uppercase">
            Smash Daddys {release.release_type && `\u00b7 ${release.release_type}`}
            {release.genre && ` \u00b7 ${release.genre}`}
            {release.bpm && ` \u00b7 ${release.bpm} BPM`}
          </p>
          {release.key && (
            <p className="text-[10px] text-white/25 mt-0.5">Key: {release.key}</p>
          )}
        </div>

        {/* Play All */}
        <div className="mt-5 flex justify-center">
          <button
            onClick={handlePlayAll}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#C8962C] active:scale-95 transition-transform"
            aria-label="Play all tracks"
          >
            <Play className="w-4 h-4 text-black" fill="black" />
            <span className="text-xs font-black uppercase text-black">Play</span>
          </button>
        </div>

        {/* Track list */}
        {trackList.length > 1 && (
          <div className="mt-6">
            <h3 className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3">Tracks</h3>
            <div className="space-y-1">
              {trackList.map((track, idx) => {
                const isActive = player.currentTrack?.id === track.id;
                const isTrackPlaying = isActive && player.isPlaying;
                return (
                  <button
                    key={track.id}
                    onClick={() => handlePlayTrack(track, idx)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                      isActive ? 'bg-[#C8962C]/10' : 'active:bg-white/5'
                    }`}
                    aria-label={`Play ${track.title}`}
                  >
                    <span className="w-5 text-right text-[10px] text-white/20 font-mono">
                      {isTrackPlaying ? (
                        <Headphones className="w-3.5 h-3.5 text-[#C8962C] inline" />
                      ) : (
                        track.track_number || idx + 1
                      )}
                    </span>
                    <div className="flex-1 min-w-0 text-left">
                      <p className={`text-xs font-bold truncate ${isActive ? 'text-[#C8962C]' : 'text-white/80'}`}>
                        {track.title}
                      </p>
                    </div>
                    <span className="text-[10px] text-white/20">
                      {formatDuration(track.duration_ms) || formatSeconds(track.duration_seconds)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Lyrics */}
        <LyricsAccordion lyrics={release.lyrics} />

        {/* Linked entity */}
        <LinkedEntityCard release={release} />

        {/* Stem pack */}
        {release.stem_pack_url && (
          <div className="mt-4 rounded-xl border border-[#C8962C]/20 bg-[#C8962C]/5 p-4">
            <div className="flex items-center gap-3">
              <FileAudio className="w-5 h-5 text-[#C8962C]" />
              <div className="flex-1">
                <p className="text-xs font-bold text-white">Stem Pack Available</p>
                <p className="text-[10px] text-white/40">
                  {release.stem_pack_price_gbp ? `\u00a3${Number(release.stem_pack_price_gbp).toFixed(2)}` : 'Free'}
                </p>
              </div>
              <button
                onClick={() => console.log('[STEMS] Purchase flow for', release.id)}
                className="px-3 py-1.5 rounded-lg bg-[#C8962C] text-[10px] font-bold uppercase text-black active:scale-95 transition-transform"
              >
                Get Stems
              </button>
            </div>
          </div>
        )}

        {/* Platform links */}
        <PlatformLinks release={release} className="mt-5 justify-center" />
      </div>
    </motion.div>
  );
}

// ── Stem Unlock Sheet ────────────────────────────────────────────────────────

function StemUnlockSheet({ release, onClose }) {
  const navigate = useNavigate();
  const stemTypes = [
    { name: 'Drums', sub: 'Ready for your DAW' },
    { name: 'Bass', sub: 'Ready for your DAW' },
    { name: 'Vocals', sub: 'Ready for your DAW' },
    { name: 'FX', sub: 'Ready for your DAW' },
  ];
  const price = release.stem_pack_price_gbp ? `\u00a3${Number(release.stem_pack_price_gbp).toFixed(2)}` : 'Free';

  // Track stem interest for retention notifications
  useEffect(() => {
    trackIntent({ type: 'stem_view', releaseId: release.id });
  }, [release.id]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end justify-center"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />
      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-h-[85vh] overflow-y-auto rounded-t-3xl bg-[#1C1C1E] px-6 pt-6 pb-10 z-10"
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-6" />

        <h2 className="text-2xl font-black uppercase text-white text-center">
          Unlock the Source
        </h2>
        <p className="text-sm text-white/50 text-center mt-1">
          {release.title} &mdash; Smash Daddys
        </p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#C8962C] text-center mt-2 mb-6">
          Used by DJs. Built for the floor.
        </p>

        {/* What you get */}
        <div className="mb-5">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-3">What you get</p>
          <div className="grid grid-cols-4 gap-3">
            {stemTypes.map(({ name, sub }) => (
              <div key={name} className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white/[0.03] border border-white/5">
                <FileAudio className="w-6 h-6 text-[#C8962C]" />
                <span className="text-[10px] font-bold uppercase text-white/60">{name}</span>
                <span className="text-[7px] text-white/25 leading-tight text-center px-1">{sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* File format */}
        <div className="mb-4 rounded-xl bg-white/[0.02] border border-white/5 px-4 py-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">File format</p>
          <p className="text-xs text-white/70">WAV (24-bit) &middot; Studio quality &middot; Ready to drop into your DAW</p>
        </div>

        {/* Delivery */}
        <div className="mb-4 rounded-xl bg-white/[0.02] border border-white/5 px-4 py-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Delivery</p>
          <p className="text-xs text-white/70">Instant download &middot; Saved to your account &middot; Re-download anytime</p>
        </div>

        {/* License summary */}
        <div className="mb-6 rounded-xl border border-[#9B1B2A]/20 bg-[#9B1B2A]/5 px-4 py-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#9B1B2A] mb-2">HOTMESS Remix License</p>
          <div className="space-y-1.5 text-xs text-white/60">
            <p className="flex items-center gap-2"><span className="text-[#30D158]">{'\u2713'}</span> Remix + DJ use allowed</p>
            <p className="flex items-center gap-2"><span className="text-[#30D158]">{'\u2713'}</span> Share mixes non-commercially</p>
            <p className="flex items-center gap-2"><span className="text-[#FF3B30]">{'\u2717'}</span> No commercial release without upgrade</p>
            <p className="flex items-center gap-2"><span className="text-[#FF3B30]">{'\u2717'}</span> Ownership retained by HOTMESS</p>
          </div>
          <button
            onClick={() => { onClose(); navigate('/legal/remix-license'); }}
            className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[#C8962C] active:opacity-70"
          >
            Read full license &rarr;
          </button>
        </div>

        {/* Buy CTA */}
        <motion.button
          onClick={() => {
            console.log('[STEMS] Purchase:', release.id, price);
            onClose();
          }}
          className="w-full h-12 rounded-xl bg-[#C8962C] text-black font-black uppercase text-sm active:scale-95 transition-transform"
          aria-label={`Buy stems for ${price}`}
          animate={{ boxShadow: ['0 0 0px rgba(200,150,44,0)', '0 0 16px rgba(200,150,44,0.4)', '0 0 0px rgba(200,150,44,0)'] }}
          transition={{ repeat: Infinity, duration: 5 }}
        >
          Buy now {'\u2014'} {price}
        </motion.button>
        <p className="text-center text-[9px] text-white/25 mt-2 mb-1">Secure checkout &middot; Instant delivery</p>

        <button
          onClick={onClose}
          className="w-full mt-2 text-center text-sm text-white/35 py-2 active:text-white/50"
        >
          Save for later
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Preview End Overlay ──────────────────────────────────────────────────────

function PreviewEndOverlay({ onUpgrade, onDismiss, phase = 'end' }) {
  // phase: 'taste' (80% warning) or 'end' (track stopped)
  const isTaste = phase === 'taste';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center px-8"
    >
      <div className="absolute inset-0 bg-black/85" onClick={onDismiss} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-[#1C1C1E] rounded-2xl p-8 text-center max-w-[320px] w-full border border-white/5"
      >
        {isTaste ? (
          <>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#C8962C] mb-2">Preview ending</p>
            <h3 className="text-2xl font-black uppercase text-white">
              This is just a taste
            </h3>
            <p className="text-sm text-white/50 mt-2 mb-6">
              The full drop is waiting.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-2xl font-black uppercase text-white">
              Unlock the Full Drop
            </h3>
            <p className="text-sm text-white/50 mt-2 mb-6">
              No cuts. No limits. Full catalogue.
            </p>
          </>
        )}
        <motion.button
          onClick={onUpgrade}
          className="w-full h-12 rounded-xl bg-[#C8962C] text-black font-black uppercase text-sm active:scale-95 transition-transform"
          animate={{ boxShadow: ['0 0 0px rgba(200,150,44,0)', '0 0 16px rgba(200,150,44,0.4)', '0 0 0px rgba(200,150,44,0)'] }}
          transition={{ repeat: Infinity, duration: 5 }}
        >
          Get full access
        </motion.button>
        <button
          onClick={onDismiss}
          className="w-full mt-3 text-center text-sm text-white/35 py-2 active:text-white/50"
        >
          Save for later
        </button>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MAIN MUSIC TAB ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export default function MusicTab() {
  const navigate = useNavigate();
  const player = useMusicPlayer();
  const scrollRef = useRef(null);

  // Data
  const [artist, setArtist] = useState(null);
  const [releases, setReleases] = useState([]);
  const [allTracks, setAllTracks] = useState([]);      // flat list
  const [tracksByRelease, setTracksByRelease] = useState({}); // release_id -> Track[]
  const [loading, setLoading] = useState(true);

  // UI state
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [stemRelease, setStemRelease] = useState(null); // release for stem sheet
  const [showPreviewEnd, setShowPreviewEnd] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // ── Data fetch ─────────────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    async function load() {
      const [artistRes, relRes, trackRes] = await Promise.all([
        supabase.from('label_artists').select('*').eq('slug', 'smash-daddys').single(),
        supabase.from('label_releases').select('*').eq('is_active', true).order('release_date', { ascending: false }),
        supabase.from('tracks').select('*').order('track_number', { ascending: true }),
      ]);

      if (!mounted) return;

      setArtist(artistRes.data);
      setReleases(relRes.data || []);
      const tks = trackRes.data || [];
      setAllTracks(tks);

      const grouped = {};
      tks.forEach(t => {
        if (!grouped[t.release_id]) grouped[t.release_id] = [];
        grouped[t.release_id].push(t);
      });
      setTracksByRelease(grouped);
      setLoading(false);
    }

    load();
    return () => { mounted = false; };
  }, [reloadKey]);

  // ── Preview end detection (80% taste warning + end conversion) ─────────────

  const [previewPhase, setPreviewPhase] = useState('end'); // 'taste' | 'end'
  const tasteShownRef = useRef(false);

  useEffect(() => {
    if (!player.currentTrack) { tasteShownRef.current = false; return; }
    const access = getTrackAccessLevel(player.currentTrack);
    if (access !== 'preview') return;

    // 80% — "this is just a taste" warning
    if (player.progress > 0.80 && player.progress < 0.95 && player.isPlaying && !tasteShownRef.current) {
      tasteShownRef.current = true;
      setPreviewPhase('taste');
      setShowPreviewEnd(true);
    }
    // Track ended — full conversion overlay
    if (!player.isPlaying && player.progress > 0.95) {
      setPreviewPhase('end');
      setShowPreviewEnd(true);
    }
  }, [player.isPlaying, player.progress, player.currentTrack]);

  // ── Pull to refresh ────────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    setReloadKey(k => k + 1);
  }, []);

  const { pullDistance, isRefreshing, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: handleRefresh,
    scrollRef,
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  // Hot right now: all individual tracks, newest first
  const hotTracks = allTracks
    .filter(t => t.preview_url || t.download_url)
    .slice(0, 12)
    .map(t => {
      const rel = releases.find(r => r.id === t.release_id);
      return { ...t, artist: 'Smash Daddys', artwork_url: t.artwork_url || rel?.artwork_url };
    });

  // Featured drop: first release with artwork
  const featuredRelease = releases[0] || null;

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center" style={{ backgroundColor: BG }}>
        <div className="w-8 h-8 border-2 border-[#C8962C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (releases.length === 0 && allTracks.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: BG }}>
        <div className="w-16 h-16 rounded-2xl bg-[#1C1C1E] flex items-center justify-center mb-4">
          <Disc3 className="w-8 h-8 text-white/10" />
        </div>
        <p className="text-white font-bold text-lg uppercase">No Music Yet</p>
        <p className="text-white/40 text-sm mt-2 max-w-[260px]">
          New releases from Raw Convict Records are on the way. Check back soon.
        </p>
        <button
          onClick={() => navigate('/radio')}
          className="mt-6 h-12 px-8 rounded-xl bg-[#C8962C] text-black font-black text-sm uppercase active:scale-95 transition-transform"
        >
          Listen to Radio
        </button>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="h-full w-full overflow-y-auto overscroll-contain"
      style={{ backgroundColor: BG }}
      {...pullHandlers}
    >
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

      {/* ═══════════════════════════════════════════════════════════════════════
          0. CONTINUE LISTENING — unfinished previews
          ═══════════════════════════════════════════════════════════════════ */}
      {(() => {
        let saved = [];
        try { saved = JSON.parse(localStorage.getItem('hm_saved_tracks') || '[]'); } catch { /* noop */ }
        if (saved.length === 0) return null;
        return (
          <section className="px-6 pt-5 pb-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-3">You left this here</p>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              {saved.slice(0, 4).map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    const track = allTracks.find(at => at.id === t.id);
                    if (track) player.playTrack(track, allTracks, allTracks.indexOf(track));
                  }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl flex-shrink-0 active:scale-[0.97] transition-transform"
                  style={{ background: 'rgba(200,150,44,0.06)', border: '1px solid rgba(200,150,44,0.1)' }}
                >
                  {t.artwork_url ? (
                    <img src={t.artwork_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                      <Disc3 className="w-5 h-5 text-white/20" />
                    </div>
                  )}
                  <div className="text-left min-w-0">
                    <p className="text-xs font-bold text-white truncate max-w-[100px]">{t.title}</p>
                    <p className="text-[10px] text-white/30">{t.artist}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════════
          1. HERO — SMASH DADDYS
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Background — artist photo or dark gradient */}
        {artist?.photo_url ? (
          <div className="absolute inset-0">
            <img
              src={artist.photo_url}
              alt=""
              className="w-full h-full object-cover"
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#000000]/70 via-[#000000]/85 to-[#000000]" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#9B1B2A]/15 via-[#000000] to-[#000000]" />
        )}

        <div className="relative px-6 pt-14 pb-8">
          {/* Label name */}
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#9B1B2A] mb-2">
            Raw Convict Records
          </p>

          {/* Artist name */}
          <h1 className="text-4xl font-black uppercase text-white leading-[0.95] tracking-tight">
            Smash<br />Daddys
          </h1>

          {/* Tagline */}
          <p className="text-sm text-white/50 italic mt-3">
            Built for the floor. No compromise.
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-2.5 mt-6">
            <button
              onClick={() => {
                if (hotTracks.length > 0) player.playTrack(hotTracks[0], hotTracks, 0);
                else if (featuredRelease?.preview_url) {
                  player.playTrack({
                    id: featuredRelease.id, title: featuredRelease.title,
                    artist: 'Smash Daddys', artwork_url: featuredRelease.artwork_url,
                    preview_url: featuredRelease.preview_url,
                  }, [], 0);
                }
              }}
              className="h-11 px-6 rounded-full bg-[#C8962C] text-black font-black text-xs uppercase flex items-center gap-2 active:scale-95 transition-transform"
              aria-label="Listen now"
            >
              <Play className="w-4 h-4" fill="black" />
              Listen Now
            </button>
            {(artist?.soundcloud_url) && (
              <a
                href={artist.soundcloud_url}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 px-5 rounded-full border border-[#FF5500]/40 text-[#FF5500] font-bold text-xs uppercase flex items-center active:scale-95 transition-transform"
                aria-label="Open SoundCloud"
              >
                SoundCloud
              </a>
            )}
            {(artist?.spotify_url) && (
              <a
                href={artist.spotify_url}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 px-5 rounded-full border border-[#1DB954]/40 text-[#1DB954] font-bold text-xs uppercase flex items-center active:scale-95 transition-transform"
                aria-label="Open Spotify"
              >
                Spotify
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          2. PRODUCER MODE — stems / for producers
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="mt-8 mx-6 rounded-2xl border border-[#C8962C]/10 bg-[#C8962C]/[0.03] p-6">
        <h2 className="text-lg font-black uppercase text-white tracking-wide">
          For Producers
        </h2>
        <p className="text-sm text-white/50 mt-1">Unlock the source. Built for the floor.</p>

        {/* Find first release with stems */}
        {(() => {
          const stemRelDoc = releases.find(r => r.stem_pack_url) ||
            releases.find(r => (tracksByRelease[r.id] || []).some(t => t.stem_pack_url));

          if (stemRelDoc) {
            const inlineStemTypes = ['Drums', 'Bass', 'Vocals', 'FX'];
            const price = stemRelDoc.stem_pack_price_gbp
              ? `\u00a3${Number(stemRelDoc.stem_pack_price_gbp).toFixed(2)}`
              : 'Free';

            return (
              <div className="mt-5">
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {inlineStemTypes.map(stem => (
                    <div key={stem} className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <FileAudio className="w-5 h-5 text-[#C8962C]" />
                      <span className="text-[9px] font-bold uppercase text-white/50">{stem}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-white/30 text-center mb-4">WAV 24-bit &middot; Ready to drop into your DAW</p>
                <motion.button
                  onClick={() => setStemRelease(stemRelDoc)}
                  className="w-full h-12 rounded-xl bg-[#C8962C] text-black font-black text-sm uppercase active:scale-95 transition-transform"
                  whileTap={{ scale: 0.97 }}
                >
                  Unlock Stems {'\u2014'} {price}
                </motion.button>
              </div>
            );
          }

          return (
            <p className="text-sm text-white/30 mt-4 italic">
              Stem packs coming soon.
            </p>
          );
        })()}
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          3. ALL RELEASES — horizontal carousel (tap to open detail sheet)
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="mt-10 pl-6 pb-40">
        <SectionHeader>All Releases</SectionHeader>
        <div className="flex gap-3 overflow-x-auto pb-4 pr-6 scrollbar-hide">
          {releases.map(rel => {
            const relTracks = tracksByRelease[rel.id] || [];
            const access = getReleaseAccessLevel(rel, relTracks);
            const isActive = player.currentTrack && (
              player.currentTrack.id === rel.id ||
              relTracks.some(t => t.id === player.currentTrack?.id)
            );
            const isCurrentPlaying = isActive && player.isPlaying;

            return (
              <motion.button
                key={rel.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => setSelectedRelease(rel)}
                className="flex-shrink-0 w-[140px] text-left"
                aria-label={`Open ${rel.title}`}
              >
                {/* Artwork */}
                <div className={`relative w-[140px] h-[140px] rounded-xl overflow-hidden bg-[#1C1C1E] ${
                  access === 'stems' ? 'ring-2 ring-[#C8962C]/50' : ''
                } ${access === 'preview' ? 'opacity-70' : ''}`}>
                  {rel.artwork_url ? (
                    <img src={rel.artwork_url} alt={rel.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1C1C1E] to-[#0D0D0D]">
                      <Disc3 className="w-8 h-8 text-[#C8962C]/30 mb-1" />
                      <span className="text-[8px] font-bold uppercase tracking-widest text-white/15">RCR</span>
                    </div>
                  )}
                  {access === 'preview' && (
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-white/15 text-white/60 backdrop-blur-sm">
                      Preview
                    </span>
                  )}
                  {access === 'stems' && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-[#C8962C]/90 text-black backdrop-blur-sm">
                      Stems
                    </span>
                  )}
                  {isCurrentPlaying && (
                    <div className="absolute bottom-2 left-2 flex items-end gap-0.5 h-3">
                      {[60, 100, 40].map((h, i) => (
                        <span
                          key={i}
                          className="w-[3px] bg-[#C8962C] rounded-full animate-pulse"
                          style={{ height: `${h}%`, animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs font-bold text-white truncate mt-2">{rel.title}</p>
                <p className="text-[10px] text-white/40 truncate">
                  Smash Daddys{rel.genre ? ` · ${rel.genre}` : ''}
                </p>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          OVERLAYS
          ═══════════════════════════════════════════════════════════════════ */}

      {/* Release Detail Sheet */}
      <AnimatePresence>
        {selectedRelease && (
          <ReleaseDetailSheet
            release={selectedRelease}
            tracks={tracksByRelease[selectedRelease.id] || []}
            onClose={() => setSelectedRelease(null)}
          />
        )}
      </AnimatePresence>

      {/* Stem Unlock Sheet */}
      <AnimatePresence>
        {stemRelease && (
          <StemUnlockSheet
            release={stemRelease}
            onClose={() => setStemRelease(null)}
          />
        )}
      </AnimatePresence>

      {/* Preview End Overlay */}
      <AnimatePresence>
        {showPreviewEnd && (
          <PreviewEndOverlay
            phase={previewPhase}
            onUpgrade={() => {
              setShowPreviewEnd(false);
              navigate('/more');
            }}
            onDismiss={() => {
              setShowPreviewEnd(false);
              // Save the track for "You didn't finish this" on homepage
              if (player.currentTrack) {
                try {
                  const saved = JSON.parse(localStorage.getItem('hm_saved_tracks') || '[]');
                  const exists = saved.some(s => s.id === player.currentTrack.id);
                  if (!exists) {
                    saved.unshift({
                      id: player.currentTrack.id,
                      title: player.currentTrack.title,
                      artist: player.currentTrack.artist || 'Smash Daddys',
                      artwork_url: player.currentTrack.artwork_url,
                    });
                    localStorage.setItem('hm_saved_tracks', JSON.stringify(saved.slice(0, 8)));
                  }
                } catch { /* noop */ }
                // Track preview abandon intent for retention push
                trackIntent({ type: 'preview_abandon', trackId: player.currentTrack.id });
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
