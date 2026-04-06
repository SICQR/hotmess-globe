/**
 * MusicTab — Smash Daddys / Raw Convict Records music hub
 *
 * Full rewrite (v2) with:
 * - Artist hero + platform links
 * - Releases grid (EPs show track count badge)
 * - ReleaseDetailSheet bottom sheet with:
 *   - Track list with inline play via MusicPlayerContext
 *   - Lyrics accordion (if lyrics exist)
 *   - Stem pack stub (if stem_pack_url)
 *   - Linked entity badges ("THIS TRACK IS ABOUT" cards)
 *   - Member gating (preview 30s for non-members, full for members)
 * - Per-release AppBanner cards (music_card_*)
 * - Banner placements for music_top hero
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, ChevronDown, ChevronUp, Disc3, X, Loader2,
  Lock, Crown, FileAudio, Link2, Headphones,
  Radio as RadioIcon, Calendar,
} from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { AppBanner } from '@/components/banners/AppBanner';
import { fetchBannersByPrefix } from '@/services/AppBannerService';
import { CardMoreButton } from '@/components/ui/CardMoreButton';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';

const GOLD = '#C8962C';
const BG = '#050507';
const CARD = '#1C1C1E';
const LABEL_RED = '#9B1B2A';

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

function PlatformLinks({ release, className = '' }) {
  const links = [
    { url: release.soundcloud_url, label: 'SoundCloud', color: '#FF5500' },
    { url: release.spotify_url, label: 'Spotify', color: '#1DB954' },
    { url: release.apple_music_url, label: 'Apple Music', color: '#FA2D48' },
    { url: release.beatport_url, label: 'Beatport', color: '#94D500' },
  ].filter((l) => l.url);

  if (links.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-white/10 hover:border-white/20 transition-colors"
          style={{ color: link.color }}
        >
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
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <span className="text-xs font-bold uppercase text-white/60">Lyrics</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40" />
        )}
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

  const typeColors = {
    app_feature: '#C8962C',
    product: '#9E7D47',
    brand: '#9B1B2A',
    event: '#00C2E0',
  };

  const color = typeColors[release.linked_entity_type] || GOLD;

  return (
    <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.02] p-4">
      <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">
        This track is about
      </p>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Link2 className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">{release.linked_entity_label}</p>
          <p className="text-[10px] text-white/40 uppercase">{release.linked_entity_type.replace('_', ' ')}</p>
        </div>
        {release.linked_entity_url && (
          <a
            href={release.linked_entity_url}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors"
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

function ReleaseDetailSheet({ release, tracks, onClose, bannerData }) {
  const player = useMusicPlayer();
  const navigate = useNavigate();

  // Auth + membership state
  const [authUser, setAuthUser] = React.useState(null);
  const [isMember, setIsMember] = React.useState(false);
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setAuthUser(user);
      // Check for active membership
      supabase
        .from('memberships')
        .select('status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()
        .then(({ data }) => setIsMember(!!data));
    });
  }, []);

  const handleJoin = () => {
    if (!authUser) {
      // Not logged in → go to onboarding / free signup
      navigate('/');
    } else {
      // Logged in but no membership → go to upgrade
      navigate('/more');
    }
  };

  // Build queue from tracks or single release
  const trackList = tracks.length > 0
    ? tracks.map((t) => ({
        ...t,
        artist: 'Smash Daddys',
        artwork_url: release.artwork_url,
      }))
    : [{
        id: release.id,
        title: release.title,
        artist: 'Smash Daddys',
        artwork_url: release.artwork_url,
        preview_url: release.preview_url,
        download_url: release.download_url,
        duration_ms: release.duration_ms,
        duration_seconds: release.duration_seconds,
      }];

  const handlePlayTrack = (track, idx) => {
    player.playTrack(track, trackList, idx);
  };

  const handlePlayAll = () => {
    if (trackList.length > 0) {
      player.playTrack(trackList[0], trackList, 0);
    }
  };

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
        <button onClick={onClose} className="p-2 -ml-2">
          <ChevronDown className="w-5 h-5 text-white/60" />
        </button>
        <span className="text-[10px] font-bold uppercase text-white/30 tracking-widest">
          {release.catalog_number || 'Release'}
        </span>
        <button onClick={onClose} className="p-2 -mr-2">
          <X className="w-5 h-5 text-white/60" />
        </button>
      </div>

      <div className="px-4 pb-32">
        {/* Artwork */}
        <div className="mt-4 mx-auto w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden bg-[#1C1C1E] shadow-2xl">
          {release.artwork_url ? (
            <img src={release.artwork_url} alt={release.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Disc3 className="w-16 h-16 text-[#9B1B2A]/30" />
            </div>
          )}
        </div>

        {/* Title + meta */}
        <div className="mt-5 text-center">
          <h2 className="text-xl font-black uppercase text-white leading-tight">{release.title}</h2>
          <p className="text-xs text-white/40 mt-1 uppercase">
            Smash Daddys · {release.release_type}
            {release.genre && ` · ${release.genre}`}
            {release.bpm && ` · ${release.bpm} BPM`}
          </p>
          {release.key && (
            <p className="text-[10px] text-white/25 mt-0.5">Key: {release.key}</p>
          )}
        </div>

        {/* Member gate */}
        {release.member_only && !isMember && (
          <div className="mt-4">
            <MemberGateBanner onJoin={handleJoin} />
          </div>
        )}

        {/* Play All button */}
        <div className="mt-5 flex justify-center">
          <button
            onClick={handlePlayAll}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#C8962C] active:scale-[0.95] transition-transform"
          >
            <Play className="w-4 h-4 text-black" fill="black" />
            <span className="text-xs font-black uppercase text-black">
              {release.member_only && !isMember ? 'Preview' : 'Play All'}
            </span>
          </button>
        </div>

        {/* Track list (for EPs / multi-track releases) */}
        {trackList.length > 1 && (
          <div className="mt-6">
            <h3 className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3">
              Tracks
            </h3>
            <div className="space-y-1">
              {trackList.map((track, idx) => {
                const isActive = player.currentTrack?.id === track.id;
                const isTrackPlaying = isActive && player.isPlaying;
                return (
                  <button
                    key={track.id}
                    onClick={() => handlePlayTrack(track, idx)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                      isActive ? 'bg-[#C8962C]/10' : 'hover:bg-white/5'
                    }`}
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
                    {release.member_only && !isMember && (
                      <Lock className="w-3 h-3 text-white/15" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Lyrics */}
        <LyricsAccordion lyrics={release.lyrics} />

        {/* Linked entity ("THIS TRACK IS ABOUT") */}
        <LinkedEntityCard release={release} />

        {/* Stem pack */}
        <StemPackStub release={release} />

        {/* Platform links */}
        <PlatformLinks release={release} className="mt-5 justify-center" />

        {/* Banner card for this release */}
        {bannerData && (
          <div className="mt-5">
            <AppBanner placement={`music_card_${release.catalog_number}`} variant="card" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main MusicTab ────────────────────────────────────────────────────────────

export default function MusicTab() {
  const navigate = useNavigate();
  const [artist, setArtist] = useState(null);
  const [releases, setReleases] = useState([]);
  const [tracks, setTracks] = useState({});       // release_id -> Track[]
  const [loading, setLoading] = useState(true);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [bannerMap, setBannerMap] = useState({});  // catalog -> banner
  const [showMemberCTA, setShowMemberCTA] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const player = useMusicPlayer();
  const scrollRef = useRef(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Fetch upcoming events for cross-link
  useEffect(() => {
    let mounted = true;
    supabase
      .from('beacons')
      .select('id, title, starts_at')
      .or('type.eq.event,kind.eq.event')
      .gte('ends_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(3)
      .then(({ data }) => {
        if (mounted && data?.length) setUpcomingEvents(data);
      });
    return () => { mounted = false; };
  }, []);

  // Fetch data
  useEffect(() => {
    let mounted = true;

    async function load() {
      // Artist
      const { data: artistData } = await supabase
        .from('label_artists')
        .select('*')
        .eq('slug', 'smash-daddys')
        .single();

      // Releases
      const { data: relData } = await supabase
        .from('label_releases')
        .select('*')
        .eq('is_active', true)
        .order('release_date', { ascending: false });

      // Tracks (for EPs)
      const { data: trackData } = await supabase
        .from('tracks')
        .select('*')
        .order('track_number', { ascending: true });

      // Banners for music cards
      const banners = await fetchBannersByPrefix('music_card_');

      if (!mounted) return;

      setArtist(artistData);
      setReleases(relData || []);

      // Group tracks by release_id
      const grouped = {};
      (trackData || []).forEach((t) => {
        if (!grouped[t.release_id]) grouped[t.release_id] = [];
        grouped[t.release_id].push(t);
      });
      setTracks(grouped);

      // Map banners by catalog number extracted from placement
      const bMap = {};
      (banners || []).forEach((b) => {
        const cat = b.placement.replace('music_card_', '');
        bMap[cat] = b;
      });
      setBannerMap(bMap);

      setLoading(false);
    }

    load();
    return () => { mounted = false; };
  }, [reloadKey]);

  const handleRefresh = useCallback(async () => {
    setReloadKey((k) => k + 1);
  }, []);

  const { pullDistance, isRefreshing, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: handleRefresh,
    scrollRef,
  });

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center" style={{ backgroundColor: BG }}>
        <Loader2 className="w-8 h-8 animate-spin text-[#9B1B2A]" />
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full w-full overflow-y-auto overscroll-contain pb-40" style={{ backgroundColor: BG }} {...pullHandlers}>
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      {/* ── Music Top Banner ── */}
      <AppBanner placement="music_top" variant="hero" className="mx-4 mt-4" />

      {/* ── Artist Hero ── */}
      {artist && (
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center gap-4">
            {artist.photo_url ? (
              <img
                src={artist.photo_url}
                alt={artist.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-[#9B1B2A]/30"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-[#9B1B2A]/10 flex items-center justify-center">
                <Disc3 className="w-10 h-10 text-[#9B1B2A]/40" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#9B1B2A]">
                Raw Convict Records
              </p>
              <h1 className="text-2xl font-black uppercase text-white leading-none mt-0.5">
                {artist.name}
              </h1>
              {artist.genres?.length > 0 && (
                <p className="text-[10px] text-white/30 mt-1">
                  {artist.genres.join(' · ')}
                </p>
              )}
            </div>
          </div>

          {artist.bio && (
            <p className="text-xs text-white/50 leading-relaxed mt-4">
              {artist.bio}
            </p>
          )}

          {/* Artist platform links */}
          <div className="flex flex-wrap gap-2 mt-4">
            {artist.soundcloud_url && (
              <a href={artist.soundcloud_url} target="_blank" rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-white/10 text-[#FF5500]">
                SoundCloud
              </a>
            )}
            {artist.spotify_url && (
              <a href={artist.spotify_url} target="_blank" rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-white/10 text-[#1DB954]">
                Spotify
              </a>
            )}
            {artist.apple_music_url && (
              <a href={artist.apple_music_url} target="_blank" rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-white/10 text-[#FA2D48]">
                Apple Music
              </a>
            )}
            {artist.beatport_url && (
              <a href={artist.beatport_url} target="_blank" rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-white/10 text-[#94D500]">
                Beatport
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── Cross-links: Radio + Events ── */}
      <div className="px-4 mt-2 space-y-2 mb-4">
        <button
          onClick={() => navigate('/radio')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl active:scale-[0.98] transition-all"
          style={{ background: '#00C2E010', border: '1px solid #00C2E025' }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#00C2E020' }}>
            <RadioIcon className="w-4 h-4" style={{ color: '#00C2E0' }} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-bold text-white/80">Live Radio</p>
            <p className="text-[10px] text-white/40">HOTMESS RADIO -- tune in now</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: '#00C2E020', color: '#00C2E0' }}>
            LISTEN
          </span>
        </button>
        {upcomingEvents.length > 0 && (
          <button
            onClick={() => navigate('/pulse')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl active:scale-[0.98] transition-all"
            style={{ background: 'rgba(200,150,44,0.06)', border: '1px solid rgba(200,150,44,0.15)' }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,150,44,0.15)' }}>
              <Calendar className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold text-white/80">Upcoming Events</p>
              <p className="text-[10px] text-white/40">{upcomingEvents.length} event{upcomingEvents.length !== 1 ? 's' : ''} near you</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(200,150,44,0.15)', color: GOLD }}>
              VIEW
            </span>
          </button>
        )}
      </div>

      {/* ── Releases ── */}
      <div className="px-4 mt-2">
        {/* Empty state when no releases exist */}
        {releases.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#1C1C1E] flex items-center justify-center mb-4">
              <Disc3 className="w-8 h-8 text-white/10" />
            </div>
            <p className="text-white font-bold text-base">No music yet</p>
            <p className="text-white/40 text-sm mt-1.5 max-w-[260px]">
              New releases from Raw Convict Records and Smash Daddys are on the way. Check back soon.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => navigate('/radio')}
                className="h-10 px-5 rounded-xl bg-[#C8962C] text-black font-bold text-xs active:scale-95 transition-transform"
              >
                Listen to radio
              </button>
              <button
                onClick={() => navigate('/')}
                className="h-10 px-5 rounded-xl border border-white/15 text-white/70 font-bold text-xs active:scale-95 transition-transform"
              >
                Check back soon
              </button>
            </div>
          </div>
        )}
        {/* Helper function to render a single release card */}
        {releases.length > 0 && (() => {
          const renderReleaseCard = (rel) => {
            const isActive = player.currentTrack &&
              (player.currentTrack.id === rel.id ||
               tracks[rel.id]?.some((t) => t.id === player.currentTrack?.id));
            const trackCount = tracks[rel.id]?.length || 0;
            const hasPreview = rel.preview_url && rel.preview_url !== 'PENDING_UPLOAD';

            const handleCardClick = () => {
              if (!hasPreview) {
                setShowMemberCTA(true);
              } else {
                setSelectedRelease(rel);
              }
            };

            return (
              <motion.button
                key={rel.id}
                whileTap={{ scale: 0.97 }}
                onClick={handleCardClick}
                className={`relative overflow-hidden rounded-xl text-left transition-colors ${
                  isActive ? 'ring-1 ring-[#C8962C]/40' : ''
                }`}
                style={{ backgroundColor: CARD }}
              >
                {/* Artwork */}
                <div className="aspect-square w-full bg-[#9B1B2A]/5 relative">
                  {rel.artwork_url ? (
                    <img src={rel.artwork_url} alt={rel.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Disc3 className="w-10 h-10 text-[#9B1B2A]/20" />
                    </div>
                  )}
                  {/* Type badge */}
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-black/60 text-white/60">
                    {rel.release_type}
                  </span>
                  {/* More actions */}
                  <CardMoreButton
                    itemType="release"
                    itemId={rel.id}
                    title={rel.title}
                    className="absolute bottom-2 left-2 z-10"
                  />
                  {/* Track count for EPs */}
                  {trackCount > 1 && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-black bg-[#9B1B2A] text-white">
                      {trackCount} tracks
                    </span>
                  )}
                  {/* Member badge */}
                  {rel.member_only && (
                    <span className="absolute bottom-2 right-2">
                      <Lock className="w-3.5 h-3.5 text-[#C8962C]/60" />
                    </span>
                  )}
                  {/* Locked overlay if no preview */}
                  {!hasPreview && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Lock className="w-8 h-8 text-white/30" />
                    </div>
                  )}
                  {/* Playing indicator */}
                  {isActive && player.isPlaying && (
                    <div className="absolute bottom-2 left-2">
                      <div className="flex items-end gap-0.5 h-3">
                        <span className="w-[3px] bg-[#C8962C] rounded-full animate-pulse" style={{ height: '60%' }} />
                        <span className="w-[3px] bg-[#C8962C] rounded-full animate-pulse" style={{ height: '100%', animationDelay: '0.15s' }} />
                        <span className="w-[3px] bg-[#C8962C] rounded-full animate-pulse" style={{ height: '40%', animationDelay: '0.3s' }} />
                      </div>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-3">
                  <p className="text-xs font-bold text-white truncate">{rel.title}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">
                    {rel.catalog_number}
                    {rel.genre && ` · ${rel.genre}`}
                  </p>
                </div>
              </motion.button>
            );
          };

          // Group releases by catalog number prefix
          const rcrReleases = releases.filter(r => /^(RCR|RAW)/.test(r.catalog_number ?? ''));
          const sdReleases = releases.filter(r => r.catalog_number?.startsWith('SD'));
          const otherReleases = releases.filter(r =>
            !/^(RCR|RAW)/.test(r.catalog_number ?? '') && !r.catalog_number?.startsWith('SD')
          );

          return (
            <>
              {rcrReleases.length > 0 && (
                <>
                  <h2 className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: '#9B1B2A' }}>
                    Raw Convict Records · {rcrReleases.length}
                  </h2>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {rcrReleases.map(renderReleaseCard)}
                  </div>
                </>
              )}
              {sdReleases.length > 0 && (
                <>
                  <h2 className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: '#C8962C' }}>
                    Smash Daddys · {sdReleases.length}
                  </h2>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {sdReleases.map(renderReleaseCard)}
                  </div>
                </>
              )}
              {otherReleases.length > 0 && (
                <>
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">
                    Other Releases · {otherReleases.length}
                  </h2>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {otherReleases.map(renderReleaseCard)}
                  </div>
                </>
              )}
            </>
          );
        })()}
      </div>

      {/* ── Release Detail Sheet ── */}
      <AnimatePresence>
        {selectedRelease && (
          <ReleaseDetailSheet
            release={selectedRelease}
            tracks={tracks[selectedRelease.id] || []}
            onClose={() => setSelectedRelease(null)}
            bannerData={bannerMap[selectedRelease.catalog_number]}
          />
        )}
      </AnimatePresence>

      {/* ── Member CTA Overlay ── */}
      {showMemberCTA && (
        <div style={{
          position: 'fixed', bottom: 83, left: 0, right: 0, zIndex: 50,
          background: 'linear-gradient(to top, #0A0A0A 70%, transparent)',
          padding: '28px 20px 20px', textAlign: 'center',
        }}>
          <p style={{ color: '#F5F5F5', fontWeight: 700, fontSize: 16, margin: '0 0 8px' }}>Members only</p>
          <p style={{ color: 'rgba(245,245,245,0.5)', fontSize: 13, margin: '0 0 16px' }}>
            Join HOTMESS to unlock the full catalogue.
          </p>
          <button onClick={() => navigate('/more')} style={{
            background: '#D4AF37', color: '#0A0A0A', border: 'none', borderRadius: 8,
            padding: '14px 0', fontWeight: 700, fontSize: 14, width: '100%', cursor: 'pointer',
          }}>
            BECOME A MEMBER →
          </button>
          <button onClick={() => setShowMemberCTA(false)} style={{
            background: 'none', border: 'none', color: 'rgba(245,245,245,0.35)',
            fontSize: 13, marginTop: 12, cursor: 'pointer', display: 'block', margin: '12px auto 0',
          }}>
            Keep browsing
          </button>
        </div>
      )}
    </div>
  );
}

