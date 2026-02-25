/**
 * RadioMode - Cultural Anchor
 *
 * Full-screen immersive radio player for HOTMESS OS.
 * Think Apple Music meets pirate radio station.
 *
 * Wireframe:
 * +------------------------------------------+
 * |                               [Share]    |  Fixed top-right z-10
 * |                                          |
 * |  bg-gradient amber/20 -> 0D0D0D -> black |
 * |                                          |
 * |          H O T M E S S                   |  tracking-widest
 * |            R A D I O                     |
 * |                                          |
 * |        [ LIVE ] or [OFF AIR]             |  Pill badge
 * |        ||||  (waveform bars)             |  CSS anim when playing
 * |   "Wake the Mess with DJ Chaos"          |  italic muted
 * |                                          |
 * |         (( (( [PLAY] )) ))               |  64px amber + pulse rings
 * |         [MUTE]      [===VOL===]          |  mute + range
 * |                                          |  min-h-[60vh]
 * +------------------------------------------+  scroll boundary
 * |  NOW PLAYING                             |
 * |  +--------------------------------------+|
 * |  | artwork  Show Name     [ON AIR]      ||
 * |  |          Host (muted)                ||
 * |  |          Desc (2-line)               ||
 * |  +--------------------------------------+|
 * |  UP NEXT                                 |
 * |  [card] [card] [card]  horiz scroll      |
 * |  PAST SHOWS                              |
 * |  [SoundCloud link card]                  |
 * |  About strip                       pb-8  |
 * +------------------------------------------+
 *
 * States: idle (not playing) | playing (amber glow) | error (toast)
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pause,
  Play,
  Volume2,
  VolumeX,
  Radio,
  Share2,
  ExternalLink,
  X,
  Music,
  ChevronLeft,
} from 'lucide-react';
import { useRadio } from '@/contexts/RadioContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';
import '@/styles/radio-waveform.css';

// -- Static show data (fallback) -----------------------------------------------
interface ShowData {
  id: string;
  name: string;
  host: string;
  time: string;
  emoji: string;
  description: string;
}

const STATIC_SHOWS: ShowData[] = [
  {
    id: 'wake',
    name: 'Wake the Mess',
    host: 'DJ Chaos',
    time: 'Mon-Fri 9am',
    emoji: '\u{1F305}',
    description: 'Start your morning with the hottest beats.',
  },
  {
    id: 'dial',
    name: 'Dial-a-Daddy',
    host: 'Papa Bear',
    time: 'Mon/Wed/Fri 7pm',
    emoji: '\u{1F4DE}',
    description: 'Evening vibes with the community.',
  },
  {
    id: 'hnh',
    name: 'Hand N Hand',
    host: 'The Collective',
    time: 'Sun 8pm',
    emoji: '\u{1F91D}',
    description: 'Sunday deep house session.',
  },
];

const SOUNDCLOUD_URL = 'https://soundcloud.com/rawconvictrecords';

// -- Component ------------------------------------------------------------------

interface RadioModeProps {
  className?: string;
}

export function RadioMode({ className = '' }: RadioModeProps) {
  const { isPlaying, currentShowName, togglePlay, setCurrentShowName, audioRef } = useRadio();
  const navigate = useNavigate();

  // Local UI state
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [shows, setShows] = useState<ShowData[]>(STATIC_SHOWS);
  const [selectedShow, setSelectedShow] = useState<ShowData | null>(null);
  const [activeShowIndex, setActiveShowIndex] = useState(0);

  // Set initial show name on mount
  useEffect(() => {
    if (!currentShowName) {
      setCurrentShowName('HOTMESS RADIO');
    }
  }, [currentShowName, setCurrentShowName]);

  // Sync volume/mute to audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume, audioRef]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = isMuted;
  }, [isMuted, audioRef]);

  // Progressive enhancement: try to fetch from Supabase radio_shows
  useEffect(() => {
    let cancelled = false;

    async function fetchShows() {
      try {
        const { data, error } = await supabase
          .from('radio_shows')
          .select('id, title, host_name, start_time, image_url, description, genre')
          .eq('is_active', true)
          .order('start_time', { ascending: true })
          .limit(10);

        if (error || !data || data.length === 0) {
          // Table doesn't exist or no data -- fall back to static
          return;
        }

        if (!cancelled) {
          const mapped: ShowData[] = data.map((row: Record<string, unknown>) => ({
            id: String(row.id),
            name: String(row.title || ''),
            host: String(row.host_name || ''),
            time: row.start_time
              ? new Date(String(row.start_time)).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : '',
            emoji: String(row.genre || '\u{1F3B6}') === 'house' ? '\u{1F3B5}' : '\u{1F3B6}',
            description: String(row.description || ''),
          }));
          setShows(mapped);
        }
      } catch {
        // Silent fallback to static shows
      }
    }

    fetchShows();
    return () => {
      cancelled = true;
    };
  }, []);

  // Determine which show is "active" based on name match
  useEffect(() => {
    const idx = shows.findIndex((s) => s.name === currentShowName);
    setActiveShowIndex(idx >= 0 ? idx : 0);
  }, [currentShowName, shows]);

  // Mute toggle
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // Volume change
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0) setIsMuted(false);
  }, []);

  // Share
  const handleShare = useCallback(async () => {
    const shareData = {
      title: 'HOTMESS RADIO',
      text: currentShowName
        ? `Listening to ${currentShowName} on HOTMESS RADIO`
        : 'Tune in to HOTMESS RADIO',
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        // Minimal feedback -- no toast context needed
      }
    } catch {
      // User cancelled share or clipboard failed
    }
  }, [currentShowName]);

  // Select show card
  const handleShowTap = useCallback(
    (show: ShowData) => {
      if (selectedShow?.id === show.id) {
        setSelectedShow(null);
      } else {
        setSelectedShow(show);
      }
      setCurrentShowName(show.name);
    },
    [selectedShow, setCurrentShowName]
  );

  // The active show for the Now Playing card
  const nowPlayingShow = shows[activeShowIndex] || shows[0];

  return (
    <div className={`h-full w-full bg-black flex flex-col ${className}`}>
      {/* ---- Fixed share button (top-right) ---- */}
      <div className="fixed top-0 right-0 z-10 p-4 pt-[max(16px,env(safe-area-inset-top))]">
        <button
          onClick={handleShare}
          aria-label="Share radio"
          className="w-10 h-10 rounded-full bg-white/8 flex items-center justify-center active:scale-95 transition-transform focus:ring-2 focus:ring-[#C8962C] focus:outline-none"
        >
          <Share2 className="w-5 h-5 text-white/60" />
        </button>
      </div>

      {/* ---- Fixed back button (top-left) ---- */}
      <div className="fixed top-0 left-0 z-10 p-4 pt-[max(16px,env(safe-area-inset-top))]">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-10 h-10 rounded-full bg-white/8 flex items-center justify-center active:scale-95 transition-transform focus:ring-2 focus:ring-[#C8962C] focus:outline-none"
        >
          <ChevronLeft className="w-5 h-5 text-white/60" />
        </button>
      </div>

      {/* ---- Scrollable content (hero + cards) ---- */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* == HERO SECTION == */}
        <section
          className="relative min-h-[60vh] flex flex-col items-center justify-center px-6 pt-[max(60px,env(safe-area-inset-top))]"
          style={{
            background: isPlaying
              ? 'linear-gradient(to bottom, rgba(200,150,44,0.20) 0%, #0D0D0D 50%, #000000 100%)'
              : 'linear-gradient(to bottom, rgba(200,150,44,0.06) 0%, #0D0D0D 50%, #000000 100%)',
          }}
        >
          {/* Ambient pulse rings -- only when playing */}
          <AnimatePresence>
            {isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={`ring-${i}`}
                    className="absolute rounded-full border border-[#C8962C]"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{
                      scale: [1, 1.5 + i * 0.15, 1],
                      opacity: [0.15, 0, 0.15],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 3,
                      delay: i * 0.6,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    style={{
                      width: 140 + i * 70,
                      height: 140 + i * 70,
                    }}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Stacked wordmark */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative z-10 text-center mb-1"
          >
            <h1
              className="font-black text-3xl text-white tracking-[0.25em] uppercase leading-tight"
              style={
                isPlaying
                  ? { textShadow: '0 0 40px rgba(200,150,44,0.5), 0 0 80px rgba(200,150,44,0.15)' }
                  : undefined
              }
            >
              HOTMESS
            </h1>
            <h1
              className="font-black text-3xl text-white tracking-[0.25em] uppercase leading-tight"
              style={
                isPlaying
                  ? { textShadow: '0 0 40px rgba(200,150,44,0.5), 0 0 80px rgba(200,150,44,0.15)' }
                  : undefined
              }
            >
              RADIO
            </h1>
          </motion.div>

          {/* Live / Off Air badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="relative z-10 mb-5"
          >
            {isPlaying ? (
              <span className="inline-flex items-center gap-1.5 bg-[#C8962C] text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                LIVE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-white/10 text-white/40 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                <span className="w-2 h-2 bg-white/20 rounded-full" />
                OFF AIR
              </span>
            )}
          </motion.div>

          {/* Waveform or radio icon */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="relative z-10 mb-2 h-10 flex items-end justify-center"
          >
            {isPlaying ? (
              <div className="waveform" aria-hidden="true">
                <span className="waveform-bar" />
                <span className="waveform-bar" />
                <span className="waveform-bar" />
                <span className="waveform-bar" />
              </div>
            ) : (
              <Radio className="w-8 h-8 text-white/15" />
            )}
          </motion.div>

          {/* Current show label */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="relative z-10 text-sm text-[#8E8E93] italic mb-6 text-center"
          >
            {nowPlayingShow
              ? `${nowPlayingShow.name} with ${nowPlayingShow.host}`
              : 'HOTMESS RADIO'}
          </motion.p>

          {/* Play / Pause button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 20 }}
            className="relative z-10 mb-5"
          >
            <motion.button
              onClick={togglePlay}
              whileTap={{ scale: 0.92 }}
              aria-label={isPlaying ? 'Pause radio' : 'Play radio'}
              className="w-16 h-16 rounded-full bg-[#C8962C] flex items-center justify-center transition-shadow focus:ring-2 focus:ring-[#C8962C] focus:ring-offset-2 focus:ring-offset-black focus:outline-none"
              style={{
                boxShadow: isPlaying
                  ? '0 0 40px rgba(200,150,44,0.5), 0 0 80px rgba(200,150,44,0.2)'
                  : '0 4px 20px rgba(200,150,44,0.25)',
              }}
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 text-white" />
              ) : (
                <Play className="w-7 h-7 text-white ml-0.5" />
              )}
            </motion.button>
          </motion.div>

          {/* Controls row: mute + volume */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            className="relative z-10 flex items-center gap-4 w-full max-w-[280px]"
          >
            {/* Mute toggle */}
            <button
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute radio' : 'Mute radio'}
              className="w-10 h-10 rounded-full bg-white/8 flex items-center justify-center active:scale-95 transition-transform flex-shrink-0 focus:ring-2 focus:ring-[#C8962C] focus:outline-none"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white/40" />
              ) : (
                <Volume2 className="w-5 h-5 text-white/50" />
              )}
            </button>

            {/* Volume slider */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              aria-label="Volume"
              className="radio-volume-slider flex-1 h-10"
            />
          </motion.div>

          {/* Bottom fade of hero */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-transparent pointer-events-none" />
        </section>

        {/* == NOW PLAYING CARD == */}
        <section className="px-4 pb-5 -mt-4 relative z-[1]">
          <h2 className="text-[11px] font-black text-[#8E8E93] uppercase tracking-widest mb-3">
            Now Playing
          </h2>
          <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden border border-white/5">
            <div className="flex gap-4 p-4">
              {/* Artwork placeholder */}
              <div className="w-20 h-20 rounded-xl flex-shrink-0 bg-gradient-to-br from-[#C8962C]/30 to-[#C8962C]/5 flex items-center justify-center">
                <Music className="w-8 h-8 text-[#C8962C]/60" />
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-bold text-white text-base leading-tight truncate">
                    {nowPlayingShow?.name || 'HOTMESS RADIO'}
                  </p>
                  {isPlaying && (
                    <span className="inline-flex items-center gap-1 bg-[#C8962C]/20 text-[#C8962C] text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex-shrink-0">
                      ON AIR
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#8E8E93] mb-1 truncate">
                  {nowPlayingShow?.host || 'HOTMESS'}
                </p>
                <p className="text-xs text-white/30 leading-relaxed line-clamp-2">
                  {nowPlayingShow?.description || "London's queer community radio station."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* == SCHEDULE STRIP == */}
        <section className="px-4 pb-5">
          <h2 className="text-[11px] font-black text-[#8E8E93] uppercase tracking-widest mb-3">
            Up Next
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {shows.map((show, idx) => {
              const isActive = idx === activeShowIndex;
              return (
                <motion.button
                  key={show.id}
                  onClick={() => handleShowTap(show)}
                  whileTap={{ scale: 0.95 }}
                  className={`flex-shrink-0 w-[120px] rounded-xl p-3 text-left transition-colors ${
                    isActive
                      ? 'bg-[#C8962C]/10 border border-[#C8962C]/60'
                      : 'bg-[#1C1C1E] border border-white/10'
                  }`}
                  aria-label={`Show: ${show.name}, ${show.time}`}
                >
                  <div className="text-2xl mb-1.5">{show.emoji}</div>
                  <p className="font-bold text-xs text-white leading-tight truncate">
                    {show.name}
                  </p>
                  <p className="text-[10px] text-[#8E8E93] mt-0.5 leading-tight">{show.time}</p>
                  <p className="text-[10px] text-white/25 mt-0.5 leading-tight truncate">
                    {show.host}
                  </p>
                </motion.button>
              );
            })}
          </div>

          {/* Expanded show detail panel */}
          <AnimatePresence>
            {selectedShow && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="bg-[#1C1C1E] rounded-xl p-4 mt-3 border border-white/5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-white text-sm">{selectedShow.name}</p>
                      <p className="text-xs text-[#8E8E93]">
                        Hosted by {selectedShow.host} &middot; {selectedShow.time}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedShow(null)}
                      aria-label="Close show details"
                      className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center active:scale-95 transition-transform flex-shrink-0"
                    >
                      <X className="w-4 h-4 text-white/40" />
                    </button>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed">
                    {selectedShow.description}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* == PAST SHOWS (SoundCloud) == */}
        <section className="px-4 pb-5">
          <h2 className="text-[11px] font-black text-[#8E8E93] uppercase tracking-widest mb-3">
            Past Shows
          </h2>
          <a
            href={SOUNDCLOUD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 bg-[#1C1C1E] rounded-2xl p-4 border border-white/5 active:bg-white/5 transition-colors group"
          >
            {/* SoundCloud-style icon */}
            <div className="w-12 h-12 rounded-xl bg-[#FF5500]/10 flex items-center justify-center flex-shrink-0">
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6 text-[#FF5500]"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M1 18V14a1 1 0 1 1 2 0v4a1 1 0 1 1-2 0zM4 18V12a1 1 0 1 1 2 0v6a1 1 0 1 1-2 0zM7 18V10a1 1 0 1 1 2 0v8a1 1 0 1 1-2 0zM10 18V8a1 1 0 1 1 2 0v10a1 1 0 1 1-2 0zM13 18V6h1c3 0 5 2 5.5 4.5H20c2.2 0 4 1.8 4 4s-1.8 4-4 4h-7v-.5z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm leading-tight">
                Listen to past shows
              </p>
              <p className="text-xs text-[#8E8E93] mt-0.5">
                Catch up on SoundCloud
              </p>
            </div>
            <ExternalLink className="w-5 h-5 text-white/20 flex-shrink-0 group-hover:text-white/40 transition-colors" />
          </a>
        </section>

        {/* == ABOUT STRIP == */}
        <section className="px-4 pb-8">
          <div className="bg-[#1C1C1E] rounded-xl p-4 border border-white/5">
            <p className="text-white/40 text-xs leading-relaxed">
              HOTMESS RADIO -- London's queer community station. Music, shows, and voices from
              the mess. Streaming live 24/7 via RadioKing.
            </p>
          </div>
        </section>
      </div>

      {/* ---- Volume slider custom styles ---- */}
      <style>{volumeSliderCSS}</style>
    </div>
  );
}

// -- Volume slider CSS (injected) ------------------------------------------------
// We inline this because it requires pseudo-element selectors that Tailwind can't express
const volumeSliderCSS = `
.radio-volume-slider {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

.radio-volume-slider::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
}

.radio-volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #C8962C;
  margin-top: -6px;
  box-shadow: 0 0 8px rgba(200, 150, 44, 0.4);
}

.radio-volume-slider::-moz-range-track {
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
}

.radio-volume-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #C8962C;
  border: none;
  box-shadow: 0 0 8px rgba(200, 150, 44, 0.4);
}

.radio-volume-slider:focus {
  outline: none;
}

.radio-volume-slider:focus::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px rgba(200, 150, 44, 0.3), 0 0 8px rgba(200, 150, 44, 0.4);
}
`;

export default RadioMode;
