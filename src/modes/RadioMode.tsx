/**
 * RadioMode - Cultural Anchor
 *
 * Full-screen immersive radio player for HOTMESS OS.
 * Think Apple Music meets pirate radio station.
 *
 * Radio = live broadcast ONLY. Music library lives in /music (MusicTab).
 *
 * Wireframe:
 * +------------------------------------------+
 * | [Back]                         [Share]   |
 * |          H O T M E S S                   |
 * |            R A D I O                     |
 * |        [ON AIR] or [OFF AIR]             |
 * |        ||||  (waveform bars)             |
 * |   "Show Name with Host"                  |
 * |         (( (( [PLAY] )) ))               |
 * |         [MUTE]      [===VOL===]          |
 * +------------------------------------------+
 * |  UP NEXT              [Full Schedule]    |
 * |  [card] [card] [card]  horiz scroll      |
 * |  [Raw Convict Records → /music]          |
 * |  About strip                             |
 * +------------------------------------------+
 *
 * States: idle (not playing) | playing (amber glow) | error (toast)
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pause,
  Play,
  Volume2,
  VolumeX,
  Radio,
  Share2,
  X,
  Music,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { useRadio } from '@/contexts/RadioContext';
import { useNavigate } from 'react-router-dom';
import { useSheet } from '@/contexts/SheetContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { supabase } from '@/components/utils/supabaseClient';
import '@/styles/radio-waveform.css';
import { SoundConsentModal } from '@/components/radio/SoundConsentModal';

// -- Static show data (fallback) -----------------------------------------------
interface ShowData {
  id: string;
  name: string;
  host: string;
  time: string;
  emoji: string;
  image?: string;
  description: string;
  blurb: string;
}

const STATIC_SHOWS: ShowData[] = [
  {
    id: 'wake',
    name: 'Wake the Mess',
    host: 'DJ Chaos',
    time: 'Mon\u2013Fri 7\u201310am',
    emoji: '\u{1F305}',
    image: '/assets/shows/wake-the-mess.jpg',
    description: 'Start your morning with the hottest beats and queer wellness.',
    blurb: 'Coffee, chaos and community. Wake the Mess is London\u2019s queer alarm clock\u2014three hours of bangers, wellness segments and sponsored drops from coffee brands and skincare.',
  },
  {
    id: 'dial',
    name: 'Dial-a-Daddy / Dial-a-Darling',
    host: 'Papa Bear',
    time: 'Mon\u2013Fri 3\u20135pm',
    emoji: '\u{1F4DE}',
    image: '/assets/shows/dial-a-daddy.jpg',
    description: 'Afternoon advice, confessions and community call-ins.',
    blurb: 'The original call-in show. Confessions, dating disasters and daddy advice. Listeners phone in anonymously; Papa Bear keeps it real. Sponsored by HNH MESS.',
  },
  {
    id: 'drive',
    name: 'Drive Time Mess',
    host: 'The Collective',
    time: 'Mon\u2013Fri 5\u20137pm',
    emoji: '\u{1F697}',
    image: '/assets/shows/drive-time-mess.jpg',
    description: 'Rush hour bangers to get you home safe.',
    blurb: 'End-of-day energy for the commute. High tempo, pep talks and a \u201Cget home safe\u201D QR for ride-share discounts. From boardrooms to bar boys.',
  },
  {
    id: 'nights',
    name: 'HOTMESS Nights',
    host: 'SMASH DADDYS',
    time: 'Fri\u2013Sat 7\u201311pm',
    emoji: '\u{1F30C}',
    image: '/assets/shows/hotmess-nights.jpg',
    description: 'Weekend club sets, live DJs and pre-party energy.',
    blurb: 'The main event. SMASH DADDYS takes over with live club sets, guest DJs and a full \u201CLive Now\u201D glow bar on the app. Sponsored by clubs, DJs and drink brands.',
  },
  {
    id: 'hnh',
    name: 'Hand-in-Hand',
    host: 'HNH Collective',
    time: 'Sun 6\u20138pm',
    emoji: '\u{1F91D}',
    image: '/assets/shows/hand-in-hand.jpg',
    description: 'Sunday wind-down. Deep house, mental health check-ins and chill.',
    blurb: 'After the weekend, we regroup. Deep house, mental health check-ins, and gentle vibes with the HNH Collective. Partners: HNH MESS, Uber Eats and mental health allies.',
  },
];

/** Determine the currently scheduled show based on day/time.
 *  Returns the show object or null if no show is on air. */
function getCurrentScheduledShow(shows: ShowData[]): ShowData | null {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const hour = now.getHours();

  // Parse schedule ranges from show.time strings
  const schedules: Array<{ show: ShowData; days: number[]; startH: number; endH: number }> = [
    { show: shows[0], days: [1,2,3,4,5], startH: 7, endH: 10 },    // Wake the Mess Mon-Fri 7-10am
    { show: shows[1], days: [1,2,3,4,5], startH: 15, endH: 17 },   // Dial-a-Daddy Mon-Fri 3-5pm
    { show: shows[2], days: [1,2,3,4,5], startH: 17, endH: 19 },   // Drive Time Mon-Fri 5-7pm
    { show: shows[3], days: [5,6], startH: 19, endH: 23 },          // HOTMESS Nights Fri-Sat 7-11pm
    { show: shows[4], days: [0], startH: 18, endH: 20 },            // Hand-in-Hand Sun 6-8pm
  ];

  for (const s of schedules) {
    if (s.days.includes(day) && hour >= s.startH && hour < s.endH) return s.show;
  }
  return null;
}


// PLAYLIST_TRACKS removed — music lives in /music (MusicTab). Radio = live broadcast only.

// -- Component ------------------------------------------------------------------

interface RadioModeProps {
  className?: string;
}

export function RadioMode({ className = '' }: RadioModeProps) {
  const { isPlaying, currentShowName, togglePlay, setCurrentShowName, audioRef } = useRadio();
  const navigate = useNavigate();
  const { openSheet } = useSheet();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);
  const { pullDistance, isRefreshing, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: handleRefresh,
    scrollRef,
  });

  // Local UI state
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [shows, setShows] = useState<ShowData[]>(STATIC_SHOWS);
  const [selectedShow, setSelectedShow] = useState<ShowData | null>(null);
  const [activeShowIndex, setActiveShowIndex] = useState(0);


  // Determine scheduled show and set initial show name
  const scheduledShow = getCurrentScheduledShow(shows);

  useEffect(() => {
    if (!currentShowName) {
      setCurrentShowName(scheduledShow?.name || 'HOTMESS RADIO');
    }
  }, [currentShowName, setCurrentShowName, scheduledShow?.name]);

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
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-momentum scrollbar-hide" {...pullHandlers}>
        <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

        {/* == HERO SECTION == */}
        <section
          className="relative min-h-[60vh] flex flex-col items-center justify-center px-6 pt-[max(60px,env(safe-area-inset-top))]"
          style={{
            backgroundImage: 'url(/assets/hero-radio.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        >
          {/* Dark overlay for readability */}
          <div
            className="absolute inset-0"
            style={{
              background: isPlaying
                ? 'linear-gradient(to bottom, rgba(0,0,0,0.40) 0%, rgba(13,13,13,0.85) 50%, #000000 100%)'
                : 'linear-gradient(to bottom, rgba(0,0,0,0.60) 0%, rgba(13,13,13,0.90) 50%, #000000 100%)',
            }}
          />
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
            className="relative z-10 text-center mb-2"
          >
            <h1
              className="font-black text-4xl text-white tracking-[0.3em] uppercase leading-none"
              style={
                isPlaying
                  ? { textShadow: '0 0 40px rgba(200,150,44,0.5), 0 0 80px rgba(200,150,44,0.15)' }
                  : undefined
              }
            >
              HOTMESS
            </h1>
            <h1
              className="font-black text-lg tracking-[0.5em] uppercase leading-tight mt-1"
              style={{
                color: '#C8962C',
                ...(isPlaying
                  ? { textShadow: '0 0 30px rgba(200,150,44,0.6), 0 0 60px rgba(200,150,44,0.2)' }
                  : {}),
              }}
            >
              RADIO
            </h1>
          </motion.div>

          {/* Live / Off Air badge + listener count */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="relative z-10 mb-5 flex items-center gap-3"
          >
            {isPlaying ? (
              <span className="inline-flex items-center gap-1.5 bg-[#C8962C] text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                LIVE
              </span>
            ) : scheduledShow ? (
              <span className="inline-flex items-center gap-1.5 bg-[#C8962C]/20 text-[#C8962C] text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                <span className="w-2 h-2 bg-[#C8962C] rounded-full animate-pulse" />
                ON AIR
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-white/10 text-white/40 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                <span className="w-2 h-2 bg-white/20 rounded-full" />
                OFF AIR
              </span>
            )}
            {isPlaying && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/30">
                <span className="w-1.5 h-1.5 bg-[#34C759] rounded-full" />
                Streaming
              </span>
            )}
            {!isPlaying && scheduledShow && (
              <span className="text-[10px] font-semibold text-white/30">
                {scheduledShow.name}
              </span>
            )}
          </motion.div>

          {/* Waveform or radio icon */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="relative z-10 mb-2 h-12 flex items-end justify-center"
          >
            {isPlaying ? (
              <div className="waveform waveform-wide" aria-hidden="true">
                <span className="waveform-bar" />
                <span className="waveform-bar" />
                <span className="waveform-bar" />
                <span className="waveform-bar" />
                <span className="waveform-bar" />
                <span className="waveform-bar" />
                <span className="waveform-bar" />
                <span className="waveform-bar" />
              </div>
            ) : (
              <Radio className="w-8 h-8 text-white/15" />
            )}
          </motion.div>

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

        {/* Now Playing removed — hero already shows current show + ON AIR state */}

        {/* == SCHEDULE STRIP == */}
        <section className="px-4 pb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-black text-[#8E8E93] uppercase tracking-widest">
              Shows
            </h2>
            <button
              onClick={() => openSheet('schedule', {})}
              className="flex items-center gap-1 text-[#C8962C] text-[11px] font-bold uppercase tracking-wider active:opacity-70 transition-opacity"
              aria-label="View full radio schedule"
            >
              <Calendar className="w-3 h-3" />
              Full Schedule
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {shows.map((show, idx) => {
              const isActive = idx === activeShowIndex;
              return (
                <motion.button
                  key={show.id}
                  onClick={() => handleShowTap(show)}
                  whileTap={{ scale: 0.95 }}
                  className={`flex-shrink-0 w-[140px] rounded-2xl overflow-hidden text-left transition-all ${
                    isActive
                      ? 'ring-2 ring-[#C8962C]/60 ring-offset-2 ring-offset-black'
                      : ''
                  }`}
                  aria-label={`Show: ${show.name}, ${show.time}`}
                >
                  {/* Show artwork */}
                  <div className="h-20 relative overflow-hidden">
                    {show.image ? (
                      <img
                        src={show.image}
                        alt={show.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                        }}
                      >
                        <span className="text-3xl">{show.emoji}</span>
                      </div>
                    )}
                    {isActive && (
                      <div className="absolute inset-0 bg-[#C8962C]/20" />
                    )}
                  </div>
                  <div className="bg-[#1C1C1E] p-3 border-t border-white/5">
                    <p className="font-bold text-xs text-white leading-tight truncate">
                      {show.name}
                    </p>
                    <p className="text-[10px] text-[#C8962C] mt-0.5 leading-tight font-semibold">{show.time}</p>
                    <p className="text-[10px] text-white/30 mt-0.5 leading-tight truncate">
                      {show.host}
                    </p>
                  </div>
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
                  {selectedShow.blurb && (
                    <p className="text-xs text-white/30 leading-relaxed mt-2 border-t border-white/5 pt-2">
                      {selectedShow.blurb}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* == RAW CONVICT RECORDS — link to Music tab (single source of truth for releases) == */}
        <section className="px-4 pb-5">
          <button
            onClick={() => navigate('/music')}
            className="w-full flex items-center gap-3 bg-[#1C1C1E] rounded-2xl px-4 py-4 border border-white/5 active:bg-white/5 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-[#9B1B2A]/15 flex items-center justify-center flex-shrink-0">
              <Music className="w-5 h-5 text-[#9B1B2A]" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-white text-sm font-bold">Raw Convict Records</p>
              <p className="text-[#8E8E93] text-[10px]">Releases, stems &amp; more</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
          </button>
        </section>

        {/* Bottom spacer for nav clearance */}
        <div className="h-24" />
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
