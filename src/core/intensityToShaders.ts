/**
 * HOTMESS OS — Intensity to Shaders
 * 
 * Maps beacon intensity values to shader uniforms.
 * Single source of truth for visual behavior.
 */

import type { BeaconType } from './beacons';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ShaderUniforms {
  // Base color (RGB 0-1)
  color: [number, number, number];
  // Pulse speed (Hz)
  pulseSpeed: number;
  // Pulse amplitude (0-1, how much to vary opacity)
  pulseAmplitude: number;
  // Base opacity (0-1)
  baseOpacity: number;
  // Glow radius multiplier
  glowRadius: number;
  // Z-index priority (higher = on top)
  zPriority: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLOR PALETTE (exact hex → RGB)
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS: Record<BeaconType, [number, number, number]> = {
  SAFETY: [1.0, 0.165, 0.165],     // #FF2A2A - Emergency red
  SOCIAL: [0.224, 1.0, 0.078],     // #39FF14 - Lime green
  EVENT: [0.0, 0.851, 1.0],        // #00D9FF - Cyan
  MARKET: [1.0, 0.843, 0.0],       // #FFD700 - Gold
  RADIO: [0.69, 0.149, 1.0],       // #C8962C - Purple
};

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL HIERARCHY (hard-coded)
// ═══════════════════════════════════════════════════════════════════════════════

const Z_PRIORITY: Record<BeaconType, number> = {
  SAFETY: 100,  // Always on top
  SOCIAL: 40,
  EVENT: 30,
  MARKET: 20,
  RADIO: 10,
};

// ═══════════════════════════════════════════════════════════════════════════════
// INTENSITY → UNIFORMS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert beacon type + intensity to shader uniforms
 */
export function intensityToUniforms(
  type: BeaconType,
  intensity: number
): ShaderUniforms {
  const clamped = Math.max(0, Math.min(1, intensity));

  // Base configuration by type
  const color = COLORS[type];
  const zPriority = Z_PRIORITY[type];

  // SAFETY: Always maximum urgency
  if (type === 'SAFETY') {
    return {
      color,
      pulseSpeed: 4.0, // Fast urgent pulse
      pulseAmplitude: 0.5,
      baseOpacity: 1.0,
      glowRadius: 2.0,
      zPriority,
    };
  }

  // RADIO: Pulse synced to BPM-derived intensity
  if (type === 'RADIO') {
    return {
      color,
      pulseSpeed: 1.0 + clamped * 2.0, // 1-3 Hz based on BPM
      pulseAmplitude: 0.3,
      baseOpacity: 0.7 + clamped * 0.3,
      glowRadius: 1.0 + clamped * 0.5,
      zPriority,
    };
  }

  // EVENT: Intensity = RSVP density
  if (type === 'EVENT') {
    return {
      color,
      pulseSpeed: 0.5 + clamped * 1.0, // Busier events pulse faster
      pulseAmplitude: 0.2 + clamped * 0.2,
      baseOpacity: 0.4 + clamped * 0.5,
      glowRadius: 0.8 + clamped * 0.6,
      zPriority,
    };
  }

  // SOCIAL: Fixed intensity, subtle pulse
  if (type === 'SOCIAL') {
    return {
      color,
      pulseSpeed: 0.8,
      pulseAmplitude: 0.15,
      baseOpacity: 0.6 + clamped * 0.3,
      glowRadius: 0.7 + clamped * 0.3,
      zPriority,
    };
  }

  // MARKET: Steady, attention-grabbing
  return {
    color,
    pulseSpeed: 0.6,
    pulseAmplitude: 0.2,
    baseOpacity: 0.5 + clamped * 0.4,
    glowRadius: 0.6 + clamped * 0.4,
    zPriority,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISTANCE ATTENUATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Modify opacity based on distance from viewer
 * Distance affects visibility, NOT existence
 */
export function distanceAttenuation(
  baseOpacity: number,
  distanceKm: number,
  maxDistanceKm: number = 50
): number {
  if (distanceKm >= maxDistanceKm) return 0;
  
  // Smooth falloff
  const t = distanceKm / maxDistanceKm;
  const falloff = 1 - t * t; // Quadratic falloff
  
  return baseOpacity * falloff;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLUSTER INTENSITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Combine multiple beacon intensities for clustering
 * Simple sum with soft cap
 */
export function clusterIntensity(intensities: number[]): number {
  if (intensities.length === 0) return 0;
  if (intensities.length === 1) return intensities[0];
  
  const sum = intensities.reduce((a, b) => a + b, 0);
  // Soft cap at 1.5 to allow "hot" clusters
  return Math.min(1.5, sum / Math.sqrt(intensities.length));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHADER SNIPPETS (GLSL)
// ═══════════════════════════════════════════════════════════════════════════════

export const SHADER_VERTEX = /* glsl */ `
  attribute float aIntensity;
  attribute vec3  aColor;
  varying float vIntensity;
  varying vec3  vColor;

  void main() {
    vIntensity = aIntensity;
    vColor = aColor;

    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const SHADER_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying float vIntensity;
  varying vec3  vColor;

  void main() {
    // Soft pulse: 0.2..1.0 scaled by intensity
    float pulse = 0.6 + 0.4 * sin(uTime * (2.0 + 6.0 * vIntensity));
    float alpha = clamp(0.25 + 0.75 * vIntensity, 0.0, 1.0) * pulse;

    gl_FragColor = vec4(vColor, alpha);
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY: HEX TO RGB
// ═══════════════════════════════════════════════════════════════════════════════

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
