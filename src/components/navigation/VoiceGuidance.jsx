/**
 * VoiceGuidance Component
 * 
 * Provides text-to-speech navigation instructions using Web Speech API.
 */

import { useEffect, useRef, useCallback } from 'react';
import { getManeuverLabel, isTurnManeuver, isArrivalManeuver } from './ManeuverIcon';

// Pre-announcement distances (in meters)
const PRE_ANNOUNCE_DISTANCES = [500, 200, 100, 50];

// Check if Web Speech API is available
export const isVoiceSupported = () => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

// Format distance for voice announcement
const formatDistanceForVoice = (meters) => {
  if (!Number.isFinite(meters)) return '';
  if (meters < 100) return `${Math.round(meters / 10) * 10} meters`;
  if (meters < 1000) return `${Math.round(meters / 50) * 50} meters`;
  const km = meters / 1000;
  if (km < 2) return `${km.toFixed(1)} kilometers`;
  return `${Math.round(km)} kilometers`;
};

// Build announcement text for a step
const buildAnnouncement = (step, distanceToTurn, isPreAnnounce = false) => {
  if (!step) return null;
  
  const instruction = step.instruction || getManeuverLabel(step.maneuver);
  
  if (isArrivalManeuver(step.maneuver)) {
    return 'You have arrived at your destination';
  }
  
  if (isPreAnnounce && distanceToTurn) {
    const distanceText = formatDistanceForVoice(distanceToTurn);
    return `In ${distanceText}, ${instruction.toLowerCase()}`;
  }
  
  return instruction;
};

export function useVoiceGuidance({
  enabled = false,
  currentStep,
  distanceToTurn,
  isArrived = false,
  rate = 1.0,
  pitch = 1.0,
  volume = 1.0,
}) {
  const lastAnnouncedStepRef = useRef(null);
  const lastPreAnnounceDistRef = useRef(null);
  const synthRef = useRef(null);

  // Initialize speech synthesis
  useEffect(() => {
    if (!isVoiceSupported()) return;
    synthRef.current = window.speechSynthesis;
    
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Speak function
  const speak = useCallback((text) => {
    if (!enabled || !text || !synthRef.current) return;
    
    // Cancel any ongoing speech
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    
    // Try to get a good voice
    const voices = synthRef.current.getVoices();
    const englishVoice = voices.find(v => 
      v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Samantha'))
    ) || voices.find(v => v.lang.startsWith('en'));
    
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    synthRef.current.speak(utterance);
  }, [enabled, rate, pitch, volume]);

  // Stop speaking
  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  }, []);

  // Announce step changes
  useEffect(() => {
    if (!enabled || !currentStep) return;
    
    const stepKey = `${currentStep.index}-${currentStep.instruction}`;
    
    // Don't repeat the same step announcement
    if (lastAnnouncedStepRef.current === stepKey) return;
    
    lastAnnouncedStepRef.current = stepKey;
    lastPreAnnounceDistRef.current = null; // Reset pre-announce tracking
    
    const announcement = buildAnnouncement(currentStep, null, false);
    if (announcement) {
      speak(announcement);
    }
  }, [enabled, currentStep, speak]);

  // Pre-announcements based on distance
  useEffect(() => {
    if (!enabled || !currentStep || !distanceToTurn) return;
    if (!isTurnManeuver(currentStep.maneuver)) return;
    
    // Find the appropriate pre-announce distance threshold
    const threshold = PRE_ANNOUNCE_DISTANCES.find(d => 
      distanceToTurn <= d + 20 && distanceToTurn >= d - 20
    );
    
    if (!threshold) return;
    
    // Don't repeat the same pre-announcement
    if (lastPreAnnounceDistRef.current === threshold) return;
    
    // Only announce if we're approaching (getting closer)
    lastPreAnnounceDistRef.current = threshold;
    
    const announcement = buildAnnouncement(currentStep, distanceToTurn, true);
    if (announcement) {
      speak(announcement);
    }
  }, [enabled, currentStep, distanceToTurn, speak]);

  // Arrival announcement
  useEffect(() => {
    if (!enabled || !isArrived) return;
    speak('You have arrived at your destination');
  }, [enabled, isArrived, speak]);

  return {
    speak,
    stop,
    isSupported: isVoiceSupported(),
  };
}

// Component wrapper for imperative voice control
export function VoiceGuidance({
  enabled,
  currentStep,
  distanceToTurn,
  isArrived,
  rate,
  pitch,
  volume,
}) {
  useVoiceGuidance({
    enabled,
    currentStep,
    distanceToTurn,
    isArrived,
    rate,
    pitch,
    volume,
  });

  return null; // This is a headless component
}

export default VoiceGuidance;
