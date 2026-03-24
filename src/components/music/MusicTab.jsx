/**
 * MusicTab — Smash Daddys artist page + releases + inline audio
 *
 * Three sections:
 * A) Artist Hero — photo, bio, platform links
 * B) Releases Grid — newest first, tap opens detail sheet
 * C) ReleaseDetailSheet — artwork, tracks, stream/download, platform links
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Download, ChevronDown,
  ChevronUp, Disc3, X, Loader2,
} from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';

const GOLD = '#C8962C';
const CARD = '#1C1C1E';
const LABEL_RED = '#9B1B2A';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms) {
  if (!ms) return '';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
}

function ReleaseBadge({ type }) {
  const colors = {
    SINGLE: 'bg-[#C8962C]/20 text-[#C8962C]',
    EP: 'bg-[#9B1B2A]/20 text-[#FF6B6B]',
    ALBUM: 'bg-white/10 text-white/70',
  };
  return (
    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${colors[type] || colors.SINGLE}`}>
      {type || 'SINGLE'}
    </span>
  );
}

// ── Spotify / SoundCloud icons (inline SVG to avoid new deps) ────────────

function SpotifyIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  );
}

function SoundCloudIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.05-.1-.1-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.172 1.282c.013.06.045.094.104.094.057 0 .09-.037.104-.093l.2-1.283-.2-1.33c-.014-.057-.047-.094-.104-.094m1.8-1.594c-.06 0-.104.05-.112.11l-.217 2.81.217 2.672c.008.06.052.11.112.11.06 0 .104-.05.113-.11l.241-2.672-.241-2.81c-.009-.06-.053-.11-.113-.11m.899-.442c-.07 0-.112.05-.123.116l-.206 3.252.206 2.697c.011.066.053.116.123.116.069 0 .112-.05.122-.116l.227-2.697-.227-3.252c-.01-.066-.053-.116-.122-.116m.899-.192c-.08 0-.121.057-.131.127L3.554 14.4l.189 2.665c.01.075.051.127.131.127.078 0 .121-.052.131-.127l.209-2.665-.209-3.413c-.01-.075-.053-.127-.131-.127m.9-.133c-.088 0-.131.063-.14.138L4.453 14.4l.181 2.637c.009.082.052.138.14.138.088 0 .131-.056.14-.138l.2-2.637-.2-3.482c-.009-.082-.052-.138-.14-.138m.898-.168c-.097 0-.14.068-.148.149l-.172 3.65.172 2.608c.008.086.051.149.148.149.096 0 .14-.063.148-.149l.19-2.608-.19-3.65c-.008-.086-.052-.149-.148-.149m.9-.067c-.107 0-.148.075-.156.16l-.163 3.717.163 2.57c.008.093.05.16.156.16.104 0 .148-.067.156-.16l.18-2.57-.18-3.717c-.008-.093-.052-.16-.156-.16m.899-.065c-.116 0-.157.08-.164.171l-.154 3.782.154 2.53c.007.098.048.171.164.171.114 0 .156-.073.164-.171l.17-2.53-.17-3.782c-.008-.098-.05-.171-.164-.171m2.557-.473c-.173 0-.237.113-.244.215l-.118 4.255.118 2.445c.007.105.071.215.244.215.17 0 .236-.11.243-.215l.13-2.445-.13-4.255c-.007-.105-.073-.215-.243-.215m-1.658.397c-.125 0-.166.087-.172.182l-.145 3.858.145 2.493c.006.098.047.182.172.182.124 0 .166-.084.172-.182l.16-2.493-.16-3.858c-.006-.098-.048-.182-.172-.182m.83-.194c-.135 0-.175.092-.18.193l-.136 4.052.136 2.468c.005.104.045.193.18.193.134 0 .175-.089.18-.193l.15-2.468-.15-4.052c-.005-.104-.046-.193-.18-.193m.829-.157c-.144 0-.183.098-.189.204l-.127 4.209.127 2.43c.006.11.045.204.189.204.143 0 .183-.094.189-.204l.14-2.43-.14-4.209c-.006-.11-.046-.204-.189-.204m2.543-.88c-.27 0-.338.178-.345.34l-.09 5.088.09 2.35c.007.159.075.34.345.34.269 0 .338-.181.344-.34l.098-2.35-.098-5.089c-.006-.159-.075-.34-.344-.34m-.828.72c-.26 0-.329.168-.336.33l-.098 4.368.098 2.38c.007.156.076.33.336.33.259 0 .328-.174.335-.33l.108-2.38-.108-4.369c-.007-.16-.076-.33-.335-.33m-.829-.178c-.251 0-.32.16-.327.32l-.108 4.546.108 2.396c.007.15.076.32.327.32.25 0 .319-.17.327-.32l.118-2.396-.118-4.546c-.008-.16-.077-.32-.327-.32m4.983-.627c-.364 0-.455.233-.46.44l-.07 5.135.07 2.263c.005.2.096.44.46.44.36 0 .455-.24.46-.44l.076-2.263-.076-5.136c-.005-.2-.1-.44-.46-.44m-.828.17c-.354 0-.446.223-.452.43l-.078 4.965.078 2.284c.006.2.098.43.452.43.352 0 .445-.23.451-.43l.085-2.284-.085-4.965c-.006-.2-.099-.43-.451-.43m1.658-.188c-.374 0-.464.243-.468.45l-.061 5.183.061 2.233c.004.207.094.45.468.45.373 0 .463-.243.468-.45l.066-2.233-.066-5.183c-.005-.207-.095-.45-.468-.45m.83-.092c-.384 0-.473.252-.477.46l-.053 5.275.053 2.213c.004.214.093.46.477.46.383 0 .472-.246.477-.46l.058-2.213-.058-5.275c-.005-.214-.094-.46-.477-.46m.828-.134c-.394 0-.481.262-.485.47l-.044 5.41.044 2.193c.004.22.091.47.485.47.393 0 .481-.25.486-.47l.048-2.194-.048-5.409c-.005-.22-.093-.47-.486-.47m2.31 1.17c-.063-.012-.126-.012-.188-.012-.393 0-.482.27-.486.48l-.036 4.264.036 2.173c.004.22.093.48.486.48.127 0 .247-.041.343-.117.16-.124.245-.32.245-.545v-.023l.038-1.968-.038-4.28c-.016-.34-.244-.417-.4-.452"/>
    </svg>
  );
}

// ── Mini Player ──────────────────────────────────────────────────────────────

function MiniPlayer({ track, isPlaying, progress, onToggle }) {
  if (!track) return null;
  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      className="sticky bottom-0 left-0 right-0 z-30 bg-[#0D0D0D]/95 backdrop-blur-xl border-t border-white/8 px-4 py-2"
    >
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        <button
          onClick={onToggle}
          className="w-8 h-8 rounded-full bg-[#C8962C] flex items-center justify-center flex-shrink-0"
        >
          {isPlaying
            ? <Pause className="w-4 h-4 text-black" />
            : <Play className="w-4 h-4 text-black ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/80 truncate font-medium">{track.title}</p>
          <div className="h-0.5 bg-white/10 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-[#C8962C] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Release Detail Sheet ─────────────────────────────────────────────────────

function ReleaseDetailSheet({ release, onClose, currentTrack, isPlaying, onPlayTrack }) {
  if (!release) return null;
  const tracks = release.tracks || [];

  const handleBuy = (price) => {
    console.log(`[MusicTab] Buy clicked — £${price} (Stripe integration pending)`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-end"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative w-full max-h-[85vh] overflow-y-auto rounded-t-3xl bg-[#111113] border-t border-white/10"
      >
        {/* Handle */}
        <div className="sticky top-0 z-10 bg-[#111113] pt-3 pb-2 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pb-8">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>

          {/* Artwork */}
          <div className="aspect-square w-full max-w-[280px] mx-auto rounded-2xl overflow-hidden bg-[#1C1C1E] mb-5">
            {release.artwork_url ? (
              <img src={release.artwork_url} alt={release.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Disc3 className="w-16 h-16 text-white/10" />
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="text-center mb-5">
            <h2 className="text-xl font-black text-white tracking-tight">{release.title}</h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <ReleaseBadge type={release.release_type} />
              {release.genre && (
                <span className="text-[10px] text-white/40 uppercase">{release.genre}</span>
              )}
            </div>
            <div className="flex items-center justify-center gap-3 mt-2 text-[11px] text-white/30">
              {release.release_date && <span>{formatDate(release.release_date)}</span>}
              {release.bpm && <span>{release.bpm} BPM</span>}
              {release.key && <span>{release.key}</span>}
              {release.catalog_number && <span>{release.catalog_number}</span>}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mb-6">
            {release.preview_url && (
              <button
                onClick={() => onPlayTrack({ title: release.title, preview_url: release.preview_url, id: release.id })}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#C8962C] py-3 text-sm font-black text-black"
              >
                {currentTrack?.id === release.id && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                STREAM
              </button>
            )}
            {release.is_downloadable && (
              release.price_gbp > 0 ? (
                <button
                  onClick={() => handleBuy(release.price_gbp)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/8 border border-white/10 py-3 text-sm font-black text-white"
                >
                  <Download className="w-4 h-4" />
                  BUY £{Number(release.price_gbp).toFixed(2)}
                </button>
              ) : release.download_url ? (
                <a
                  href={release.download_url}
                  download
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/8 border border-white/10 py-3 text-sm font-black text-white"
                >
                  <Download className="w-4 h-4" />
                  DOWNLOAD
                </a>
              ) : null
            )}
          </div>

          {/* Platform links */}
          <div className="flex items-center justify-center gap-3 mb-6">
            {release.spotify_url && (
              <a href={release.spotify_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1DB954]/15 text-[#1DB954] text-xs font-bold">
                <SpotifyIcon className="w-4 h-4" /> Spotify
              </a>
            )}
            {release.soundcloud_url && (
              <a href={release.soundcloud_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF5500]/15 text-[#FF5500] text-xs font-bold">
                <SoundCloudIcon className="w-4 h-4" /> SoundCloud
              </a>
            )}
          </div>

          {/* Track listing */}
          {tracks.length > 0 && (
            <div>
              <h3 className="text-xs font-black text-white/40 uppercase tracking-wider mb-3">Tracks</h3>
              <div className="space-y-1">
                {tracks
                  .sort((a, b) => (a.track_number || 0) - (b.track_number || 0))
                  .map((track) => {
                    const isCurrent = currentTrack?.id === track.id;
                    return (
                      <div
                        key={track.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                          isCurrent ? 'bg-[#C8962C]/10' : 'hover:bg-white/5'
                        }`}
                      >
                        <span className="text-xs text-white/25 w-5 text-right font-mono">
                          {track.track_number || '—'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${isCurrent ? 'text-[#C8962C] font-bold' : 'text-white/80'}`}>
                            {track.title}
                          </p>
                          {track.duration_ms && (
                            <p className="text-[10px] text-white/25 mt-0.5">{formatDuration(track.duration_ms)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {track.preview_url && (
                            <button
                              onClick={() => onPlayTrack(track)}
                              className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center"
                            >
                              {isCurrent && isPlaying
                                ? <Pause className="w-3 h-3 text-[#C8962C]" />
                                : <Play className="w-3 h-3 text-white/60 ml-0.5" />}
                            </button>
                          )}
                          {track.is_downloadable && track.download_url && Number(track.price_gbp) === 0 && (
                            <a href={track.download_url} download
                              className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center">
                              <Download className="w-3 h-3 text-white/60" />
                            </a>
                          )}
                          {track.is_downloadable && Number(track.price_gbp) > 0 && (
                            <button
                              onClick={() => handleBuy(track.price_gbp)}
                              className="text-[10px] text-[#C8962C] font-bold px-2"
                            >
                              £{Number(track.price_gbp).toFixed(2)}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main MusicTab ────────────────────────────────────────────────────────────

export default function MusicTab() {
  const [artist, setArtist] = useState(null);
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState(null);

  // Audio state
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);
  const progressInterval = useRef(null);

  // ── Data fetch ──
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data: artistData } = await supabase
          .from('label_artists')
          .select('*')
          .eq('slug', 'smash-daddys')
          .single();

        if (cancelled || !artistData) { setLoading(false); return; }
        setArtist(artistData);

        const { data: releasesData } = await supabase
          .from('label_releases')
          .select('*, tracks(*)')
          .eq('artist_id', artistData.id)
          .eq('is_active', true)
          .order('release_date', { ascending: false });

        if (!cancelled) setReleases(releasesData || []);
      } catch (err) {
        console.error('[MusicTab] Load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Audio controls ──
  const stopProgress = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  const startProgress = useCallback(() => {
    stopProgress();
    progressInterval.current = setInterval(() => {
      const audio = audioRef.current;
      if (audio && audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    }, 250);
  }, [stopProgress]);

  const handlePlayTrack = useCallback((track) => {
    if (!track?.preview_url) return;

    // Same track — toggle
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
        stopProgress();
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
        startProgress();
      }
      return;
    }

    // New track
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    const audio = new Audio(track.preview_url);
    audioRef.current = audio;
    setCurrentTrack(track);
    setProgress(0);
    setIsPlaying(true);

    audio.play().catch(() => setIsPlaying(false));
    startProgress();

    audio.onended = () => {
      setIsPlaying(false);
      setProgress(0);
      stopProgress();
    };
  }, [currentTrack, isPlaying, startProgress, stopProgress]);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      stopProgress();
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      startProgress();
    }
  }, [isPlaying, startProgress, stopProgress]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      stopProgress();
    };
  }, [stopProgress]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen bg-[#050507]">
        <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#050507] pb-40">
      {/* ── Section A: Artist Hero ────────────────────────────────────── */}
      <div className="relative">
        {/* Hero image / gradient */}
        <div className="relative h-64 overflow-hidden">
          {artist?.photo_url ? (
            <img
              src={artist.photo_url}
              alt={artist.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-[#9B1B2A]/30 to-[#050507]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/60 to-transparent" />
        </div>

        {/* Artist info — overlaps hero */}
        <div className="relative -mt-20 px-5 z-10">
          {/* Label badge */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#9B1B2A]" />
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#9B1B2A]">
              Raw Convict Records
            </span>
          </div>

          <h1 className="text-3xl font-black text-white tracking-tight">
            {artist?.name || 'Smash Daddys'}
          </h1>

          {/* Genre tags */}
          {artist?.genres?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {artist.genres.map((g) => (
                <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-white/6 text-white/40 font-medium">
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Bio */}
          {artist?.bio && (
            <div className="mt-3">
              <p className={`text-sm text-white/50 leading-relaxed ${!bioExpanded ? 'line-clamp-2' : ''}`}>
                {artist.bio}
              </p>
              {artist.bio.length > 100 && (
                <button
                  onClick={() => setBioExpanded(!bioExpanded)}
                  className="flex items-center gap-1 mt-1 text-[11px] text-[#C8962C]/60"
                >
                  {bioExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {bioExpanded ? 'Less' : 'More'}
                </button>
              )}
            </div>
          )}

          {/* Platform buttons */}
          <div className="flex items-center gap-3 mt-4">
            {artist?.spotify_url && !artist.spotify_url.includes('PLACEHOLDER') && (
              <a
                href={artist.spotify_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1DB954]/15 text-[#1DB954] text-xs font-bold transition-colors hover:bg-[#1DB954]/25"
              >
                <SpotifyIcon className="w-4 h-4" /> Spotify
              </a>
            )}
            {artist?.soundcloud_url && (
              <a
                href={artist.soundcloud_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF5500]/15 text-[#FF5500] text-xs font-bold transition-colors hover:bg-[#FF5500]/25"
              >
                <SoundCloudIcon className="w-4 h-4" /> SoundCloud
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Section B: Releases Grid ──────────────────────────────────── */}
      <div className="px-5 mt-8">
        <h2 className="text-xs font-black text-white/30 uppercase tracking-[0.15em] mb-4">
          Releases
        </h2>

        {releases.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl bg-[#1C1C1E]/60 border border-white/5 p-8 text-center">
            <Disc3 className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30 font-medium">Music coming soon</p>
            <p className="text-xs text-white/15 mt-1">Follow us on Spotify and SoundCloud</p>
            <div className="flex items-center justify-center gap-3 mt-4">
              {artist?.spotify_url && !artist.spotify_url.includes('PLACEHOLDER') && (
                <a href={artist.spotify_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[#1DB954] text-xs font-bold">
                  <SpotifyIcon className="w-3.5 h-3.5" /> Spotify
                </a>
              )}
              {artist?.soundcloud_url && (
                <a href={artist.soundcloud_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[#FF5500] text-xs font-bold">
                  <SoundCloudIcon className="w-3.5 h-3.5" /> SoundCloud
                </a>
              )}
            </div>
          </div>
        ) : (
          /* Releases grid */
          <div className="grid grid-cols-2 gap-3">
            {releases.map((release) => (
              <button
                key={release.id}
                onClick={() => setSelectedRelease(release)}
                className="text-left rounded-2xl bg-[#1C1C1E]/60 border border-white/5 overflow-hidden transition-transform active:scale-[0.97]"
              >
                {/* Artwork */}
                <div className="aspect-square bg-[#111113] relative">
                  {release.artwork_url ? (
                    <img src={release.artwork_url} alt={release.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Disc3 className="w-10 h-10 text-white/8" />
                    </div>
                  )}
                  {/* Play overlay if preview available */}
                  {release.preview_url && (
                    <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-[#C8962C] flex items-center justify-center shadow-lg">
                      <Play className="w-3.5 h-3.5 text-black ml-0.5" />
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-bold text-white truncate">{release.title}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <ReleaseBadge type={release.release_type} />
                  </div>
                  {release.genre && (
                    <p className="text-[10px] text-white/25 mt-1.5 uppercase">{release.genre}</p>
                  )}
                  {release.release_date && (
                    <p className="text-[10px] text-white/20 mt-0.5">{formatDate(release.release_date)}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Section C: Release Detail Sheet ───────────────────────────── */}
      <AnimatePresence>
        {selectedRelease && (
          <ReleaseDetailSheet
            release={selectedRelease}
            onClose={() => setSelectedRelease(null)}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onPlayTrack={handlePlayTrack}
          />
        )}
      </AnimatePresence>

      {/* ── Mini Player (sticky bottom) ───────────────────────────────── */}
      <AnimatePresence>
        {currentTrack && !selectedRelease && (
          <MiniPlayer
            track={currentTrack}
            isPlaying={isPlaying}
            progress={progress}
            onToggle={togglePlayback}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
