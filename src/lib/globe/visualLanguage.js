/**
 * HOTMESS Visual Language
 * 
 * Heat = presence (never people)
 * Pulse = time-bound activity
 * Wave = radio energy
 * Sparkle = discovery (safe, generic)
 */

// Visual types and their rendering rules
export const VISUAL_TYPES = {
  HEAT: {
    id: 'heat',
    description: 'Presence aggregated at city/zone level',
    color: { base: '#C8962C', glow: 'rgba(255,20,147,0.4)' },
    animation: 'breathe', // Slow in/out
    minK: 20, // k-anonymity threshold
    neverShows: ['individuals', 'exact_locations', 'movement_trails'],
  },
  PULSE: {
    id: 'pulse',
    description: 'Time-bound activity (events, shows starting)',
    color: { base: '#FFD700', glow: 'rgba(255,215,0,0.4)' },
    animation: 'beat', // Sharp pulse
    duration: { min: 30, max: 180 }, // minutes
    decaysTo: 'HEAT',
  },
  WAVE: {
    id: 'wave',
    description: 'Radio energy spreading from source',
    color: { base: '#00FF88', glow: 'rgba(0,255,136,0.3)' },
    animation: 'ripple', // Outward rings
    source: 'radio_session',
    intensity: { min: 0.1, max: 1.0 },
  },
  SPARKLE: {
    id: 'sparkle',
    description: 'Discovery hint - safe, generic, no specifics',
    color: { base: '#FFFFFF', glow: 'rgba(255,255,255,0.2)' },
    animation: 'twinkle', // Random flicker
    usedWhen: 'cannotRenderDetailed',
    fallback: true,
  },
};

// Animation keyframes for each type
export const ANIMATIONS = {
  breathe: {
    keyframes: [
      { opacity: 0.6, scale: 1 },
      { opacity: 1, scale: 1.1 },
      { opacity: 0.6, scale: 1 },
    ],
    duration: 4000,
    easing: 'ease-in-out',
  },
  beat: {
    keyframes: [
      { opacity: 0.8, scale: 1 },
      { opacity: 1, scale: 1.3 },
      { opacity: 0.8, scale: 1 },
    ],
    duration: 1000,
    easing: 'ease-out',
  },
  ripple: {
    keyframes: [
      { opacity: 0.8, scale: 1 },
      { opacity: 0, scale: 2.5 },
    ],
    duration: 2000,
    easing: 'ease-out',
    repeat: true,
  },
  twinkle: {
    keyframes: [
      { opacity: 0.2 },
      { opacity: 0.8 },
      { opacity: 0.3 },
      { opacity: 0.9 },
      { opacity: 0.2 },
    ],
    duration: 3000,
    easing: 'linear',
    random: true,
  },
};

// Time jitter for safety - never show real-time
export const TIME_JITTER = {
  min: 3 * 60 * 1000,  // 3 minutes minimum delay
  max: 7 * 60 * 1000,  // 7 minutes maximum delay
  apply: (timestamp) => {
    const jitter = TIME_JITTER.min + Math.random() * (TIME_JITTER.max - TIME_JITTER.min);
    return new Date(new Date(timestamp).getTime() - jitter);
  },
};

// Render decision function
export function getVisualType(signal) {
  if (!signal) return VISUAL_TYPES.SPARKLE;
  
  switch (signal.source) {
    case 'radio_session':
    case 'radio_signal':
      return VISUAL_TYPES.WAVE;
    case 'event_start':
    case 'show_start':
    case 'ticket_surge':
      return VISUAL_TYPES.PULSE;
    case 'zone_heat':
    case 'city_heat':
    case 'presence_aggregate':
      return VISUAL_TYPES.HEAT;
    default:
      return VISUAL_TYPES.SPARKLE;
  }
}

// Check if signal meets safety thresholds
export function meetsKAnonymity(signal, threshold) {
  if (!signal?.k_count) return false;
  return signal.k_count >= threshold;
}

// Apply time jitter to signal
export function jitterSignal(signal) {
  if (!signal?.timestamp) return signal;
  return {
    ...signal,
    displayTimestamp: TIME_JITTER.apply(signal.timestamp),
    isJittered: true,
  };
}
