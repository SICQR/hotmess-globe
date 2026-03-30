/**
 * GhostedAmbientToggle — ambient audio toggle for the Ghosted grid
 *
 * When enabled, plays a low-volume ambient track from Smash Daddys
 * while browsing the proximity grid. Toggle appears in the Ghosted header.
 */

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { supabase } from '@/components/utils/supabaseClient';

const AMBIENT_STORAGE_KEY = 'hm_ghosted_ambient';

export function GhostedAmbientToggle({ className = '' }) {
  const player = useMusicPlayer();
  const [ambientTrack, setAmbientTrack] = useState(null);
  const [isAmbient, setIsAmbient] = useState(false);

  // Load ambient preference
  useEffect(() => {
    const pref = localStorage.getItem(AMBIENT_STORAGE_KEY);
    if (pref === 'on') setIsAmbient(true);
  }, []);

  // Fetch a suitable ambient track (Buddha Bear or similar instrumental)
  useEffect(() => {
    let mounted = true;
    supabase
      .from('label_releases')
      .select('id, title, artwork_url, preview_url, download_url, duration_seconds')
      .eq('is_active', true)
      .ilike('title', '%Buddha Bear%')
      .limit(1)
      .single()
      .then(({ data }) => {
        if (mounted && data) {
          setAmbientTrack({
            ...data,
            artist: 'Smash Daddys',
          });
        }
      });
    return () => { mounted = false; };
  }, []);

  // Auto-play if ambient was on
  useEffect(() => {
    if (isAmbient && ambientTrack && !player.isPlaying) {
      player.playTrack(ambientTrack);
      if (player.setVolume) player.setVolume(0.3); // Low volume for ambient
    }
  }, [isAmbient, ambientTrack]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ambientTrack) return null;

  const toggle = () => {
    const newState = !isAmbient;
    setIsAmbient(newState);
    localStorage.setItem(AMBIENT_STORAGE_KEY, newState ? 'on' : 'off');

    if (newState) {
      player.playTrack(ambientTrack);
      player.setVolume(0.3);
    } else {
      player.stop();
    }
  };

  const isActive = player.currentTrack?.id === ambientTrack.id && player.isPlaying;

  return (
    <button
      onClick={toggle}
      className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
        isActive ? 'bg-[#C8962C]/20' : 'bg-white/5'
      } ${className}`}
      aria-label={isActive ? 'Mute ambient audio' : 'Play ambient audio'}
    >
      {isActive ? (
        <Volume2 className="w-3.5 h-3.5 text-[#C8962C]" />
      ) : (
        <VolumeX className="w-3.5 h-3.5 text-white/30" />
      )}
    </button>
  );
}

export default GhostedAmbientToggle;
