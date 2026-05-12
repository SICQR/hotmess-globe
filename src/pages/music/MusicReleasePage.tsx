/**
 * MusicReleasePage — /music/release/:id
 *
 * Dynamic per-release detail page. Share-friendly URL, SEO-discoverable.
 * Pulls release + tracks + artist from Supabase. Renders hero artwork,
 * track list with play buttons (wired to MusicPlayer context), paid stem
 * pack offer (only when stem_pack_price_gbp > 0), platform links.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Pause,
  Disc3,
  ExternalLink,
  Lock,
  Share2,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

const GOLD = '#C8962C';
const BG = '#050507';
const CARD = '#1C1C1E';

type Release = {
  id: string;
  title: string;
  artist_slug?: string | null;
  artwork_url: string | null;
  release_date: string | null;
  genre: string | null;
  preview_url: string | null;
  download_url: string | null;
  stem_pack_url: string | null;
  stem_pack_price_gbp: number | null;
  is_preview_only?: boolean | null;
  lyrics?: string | null;
  soundcloud_url?: string | null;
  spotify_url?: string | null;
  apple_music_url?: string | null;
  beatport_url?: string | null;
  description?: string | null;
};

type Track = {
  id: string;
  release_id: string;
  title: string;
  track_number: number | null;
  duration_seconds: number | null;
  artwork_url: string | null;
  preview_url: string | null;
  download_url: string | null;
  stem_pack_url: string | null;
  stem_pack_price_gbp: number | null;
  is_preview_only?: boolean | null;
};

type Artist = {
  slug: string;
  name: string;
  bio?: string | null;
  avatar_url?: string | null;
};

function fmtTime(sec: number | null | undefined): string {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MusicReleasePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const player = useMusicPlayer();

  const [release, setRelease] = useState<Release | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!id) return;
    (async () => {
      setLoading(true);
      setNotFound(false);
      const [relRes, trackRes] = await Promise.all([
        supabase.from('label_releases').select('*').eq('id', id).maybeSingle(),
        supabase.from('tracks').select('*').eq('release_id', id).order('track_number', { ascending: true }),
      ]);
      if (!mounted) return;
      if (!relRes.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const rel = relRes.data as Release;
      setRelease(rel);
      setTracks((trackRes.data as Track[]) || []);

      if (rel.artist_slug) {
        const artistRes = await supabase
          .from('label_artists')
          .select('slug, name, bio, avatar_url')
          .eq('slug', rel.artist_slug)
          .maybeSingle();
        if (mounted && artistRes.data) setArtist(artistRes.data as Artist);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [id]);

  function handlePlayTrack(t: Track) {
    const playable = t.preview_url || t.download_url;
    if (!playable) return;
    const isCurrent = player.currentTrack?.id === t.id;
    if (isCurrent) {
      player.togglePlayPause?.();
      return;
    }
    // Play this track + queue the rest of the release (playable tracks only)
    const queue = tracks
      .map(track => ({
        id: track.id,
        title: track.title,
        artist: artist?.name || 'Smash Daddys',
        artwork_url: track.artwork_url || release?.artwork_url || null,
        preview_url: track.preview_url,
        download_url: track.download_url,
        duration_seconds: track.duration_seconds,
      }))
      .filter(item => item.preview_url || item.download_url);
    const startIndex = Math.max(0, queue.findIndex(item => item.id === t.id));
    player.playTrack?.(queue[startIndex], queue, startIndex);
  }

  function handleShare() {
    const url = `https://hotmessldn.com/music/release/${id}`;
    if (navigator.share) {
      void navigator.share({ title: release?.title || 'HOTMESS', url });
    } else {
      void navigator.clipboard.writeText(url);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ backgroundColor: BG }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (notFound || !release) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: BG }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: CARD }}>
          <Disc3 className="w-8 h-8 text-white/10" />
        </div>
        <p className="text-white font-black text-lg uppercase">Release Not Found</p>
        <p className="text-white/40 text-sm mt-2 max-w-[260px]">This release may have been removed or the link is wrong.</p>
        <button
          onClick={() => navigate('/music/library')}
          className="mt-6 h-12 px-8 rounded-xl font-black text-sm uppercase active:scale-95 transition-transform"
          style={{ backgroundColor: GOLD, color: '#000' }}
        >
          Back to Library
        </button>
      </div>
    );
  }

  const releaseYear = (release.release_date || '').slice(0, 4) || null;

  const platformLinks = [
    { url: release.soundcloud_url, label: 'SoundCloud', color: '#FF7700' },
    { url: release.spotify_url,    label: 'Spotify',    color: '#1DB954' },
    { url: release.apple_music_url, label: 'Apple Music', color: '#FA2D48' },
    { url: release.beatport_url,   label: 'Beatport',   color: '#94D500' },
  ].filter(l => !!l.url);

  return (
    <div className="min-h-screen w-full pb-40" style={{ backgroundColor: BG }}>
      {/* Hero artwork */}
      <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
        {release.artwork_url ? (
          <img src={release.artwork_url} alt={release.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1C1C1E,#0D0D0D)' }}>
            <Disc3 className="w-20 h-20 text-[#C8962C]/20" />
          </div>
        )}
        {/* Top bar overlay */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10 pointer-events-none">
          <button onClick={() => navigate(-1)} className="pointer-events-auto w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform" aria-label="Back">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <button onClick={handleShare} className="pointer-events-auto w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform" aria-label="Share">
            <Share2 className="w-4 h-4 text-white" />
          </button>
        </div>
        {/* Bottom gradient + title */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-20" style={{ background: 'linear-gradient(to top, rgba(5,5,7,0.98) 0%, rgba(5,5,7,0.4) 70%, transparent 100%)' }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: GOLD }}>
            {releaseYear ? `${releaseYear} · ` : ''}{release.genre || 'HOTMESS Music'}
          </p>
          <h1 className="text-3xl font-black uppercase text-white leading-tight tracking-tight">{release.title}</h1>
          <p className="text-sm text-white/60 mt-1">{artist?.name || 'Smash Daddys'}</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 -mt-2 relative z-20">
        {/* Play all */}
        {tracks.length > 0 && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => tracks[0] && handlePlayTrack(tracks[0])}
            className="w-full h-14 rounded-xl flex items-center justify-center gap-2 font-black uppercase text-sm tracking-widest active:scale-95 transition-transform shadow-[0_8px_32px_rgba(200,150,44,0.3)]"
            style={{ backgroundColor: GOLD, color: '#000' }}
          >
            <Play className="w-4 h-4 fill-black" />
            Play
          </motion.button>
        )}

        {/* Track list */}
        {tracks.length > 0 && (
          <div className="mt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Tracks</p>
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: CARD }}>
              {tracks.map((t, i) => {
                const isCurrent = player.currentTrack?.id === t.id;
                const isPlaying = isCurrent && player.isPlaying;
                const playable = !!(t.preview_url || t.download_url);
                return (
                  <button
                    key={t.id}
                    onClick={() => handlePlayTrack(t)}
                    disabled={!playable}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${i > 0 ? 'border-t border-white/5' : ''} ${playable ? 'active:bg-white/5' : 'opacity-50'}`}
                    aria-label={`Play ${t.title}`}
                  >
                    <div className="w-7 h-7 flex items-center justify-center text-[11px] font-bold text-white/40 flex-shrink-0">
                      {isCurrent ? (
                        isPlaying ? <Pause className="w-4 h-4" style={{ color: GOLD }} /> : <Play className="w-4 h-4" style={{ color: GOLD }} />
                      ) : playable ? (
                        <span>{t.track_number || i + 1}</span>
                      ) : (
                        <Lock className="w-3 h-3" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${isCurrent ? 'text-[#C8962C]' : 'text-white'}`}>
                        {t.title}
                      </p>
                      {t.is_preview_only && (
                        <p className="text-[9px] uppercase tracking-widest text-white/40">Preview only</p>
                      )}
                    </div>
                    {t.duration_seconds && (
                      <span className="text-[11px] text-white/30 tabular-nums">{fmtTime(t.duration_seconds)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Description */}
        {release.description && (
          <div className="mt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">About</p>
            <p className="text-sm text-white/70 leading-relaxed">{release.description}</p>
          </div>
        )}

        {/* Lyrics */}
        {release.lyrics && (
          <div className="mt-6">
            <button
              onClick={() => setShowLyrics(v => !v)}
              className="flex items-center justify-between w-full py-2"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Lyrics</p>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: GOLD }}>
                {showLyrics ? 'Hide' : 'Show'}
              </p>
            </button>
            {showLyrics && (
              <pre className="mt-2 text-sm text-white/70 leading-relaxed whitespace-pre-wrap font-sans">
                {release.lyrics}
              </pre>
            )}
          </div>
        )}

        {/* Platform links */}
        {platformLinks.length > 0 && (
          <div className="mt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Listen elsewhere</p>
            <div className="flex flex-wrap gap-2">
              {platformLinks.map(link => (
                <a
                  key={link.label}
                  href={link.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider border border-white/10 active:scale-95 transition-transform"
                  style={{ color: link.color }}
                >
                  <ExternalLink className="w-3 h-3" />
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Artist credit */}
        {artist && (
          <div className="mt-8 pt-6 border-t border-white/5 flex items-center gap-3">
            {artist.avatar_url ? (
              <img src={artist.avatar_url} alt={artist.name} className="w-12 h-12 rounded-full object-cover" loading="lazy" />
            ) : (
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: CARD }}>
                <Disc3 className="w-5 h-5 text-white/20" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-white/30">Artist</p>
              <p className="text-sm font-bold text-white truncate">{artist.name}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
