/**
 * useGlobeBPMSync Hook
 * 
 * Syncs the Globe visualization with Radio BPM for audio-reactive effects.
 * Listens to the PersistentPlayer context and adjusts Globe shader parameters.
 * 
 * Part of the HotMess OS Integration - makes the world sync to the music.
 */

import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';

/**
 * Hook to sync Globe with current radio BPM
 * @param {Object} globeRef - Reference to the Globe component
 * @returns {Object} - Current BPM and sync controls
 */
export const useGlobeBPMSync = (globeRef) => {
  const [currentBPM, setCurrentBPM] = useState(128); // Default BPM
  const [isAudioReactive, setIsAudioReactive] = useState(false);
  const [pulseIntensity, setPulseIntensity] = useState(1.0);

  // Fetch current radio track/show to get BPM
  const { data: currentShow } = useQuery({
    queryKey: ['radio-current-show'],
    queryFn: async () => {
      try {
        // Try to get the current show/track
        const shows = await base44.entities.RadioShow?.list();
        if (!Array.isArray(shows) || shows.length === 0) return null;

        // Get the currently playing show (simplified - in production, use actual schedule)
        const now = new Date();
        const currentHour = now.getHours();
        
        // Find show that matches current time
        const activeShow = shows.find((show) => {
          if (!show.schedule) return false;
          const showHour = parseInt(show.schedule.split(':')[0], 10);
          return showHour === currentHour;
        });

        return activeShow || shows[0]; // Fallback to first show
      } catch (error) {
        console.warn('[BPMSync] Failed to fetch radio show:', error);
        return null;
      }
    },
    refetchInterval: 60000, // Check every minute
  });

  // Update BPM when show changes
  useEffect(() => {
    if (currentShow?.bpm) {
      setCurrentBPM(currentShow.bpm);
    }
  }, [currentShow]);

  // Apply BPM sync to Globe
  useEffect(() => {
    if (!globeRef?.current || !isAudioReactive) return;

    // Calculate pulse speed based on BPM
    // BPM to seconds per beat: 60 / BPM
    const beatsPerSecond = currentBPM / 60;
    const pulseSpeed = beatsPerSecond;

    try {
      // Update Globe shader uniforms if available
      if (globeRef.current.updateShaderUniforms) {
        globeRef.current.updateShaderUniforms({
          uTime: performance.now() / 1000,
          uFrequency: pulseSpeed,
          uIntensity: pulseIntensity,
          uBPM: currentBPM,
        });
      }

      // Or update via a method if Globe exposes it
      if (globeRef.current.setPulseSpeed) {
        globeRef.current.setPulseSpeed(pulseSpeed);
      }
    } catch (error) {
      console.error('[BPMSync] Failed to update Globe:', error);
    }
  }, [globeRef, currentBPM, isAudioReactive, pulseIntensity]);

  // Enable/disable audio reactivity
  const toggleAudioReactive = useCallback(() => {
    setIsAudioReactive((prev) => !prev);
  }, []);

  // Set BPM manually (for testing or manual override)
  const setBPM = useCallback((bpm) => {
    if (typeof bpm === 'number' && bpm > 0 && bpm < 300) {
      setCurrentBPM(bpm);
    }
  }, []);

  return {
    currentBPM,
    isAudioReactive,
    pulseIntensity,
    currentShow,
    toggleAudioReactive,
    setBPM,
    setPulseIntensity,
  };
};

export default useGlobeBPMSync;
