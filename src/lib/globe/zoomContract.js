/**
 * GLOBE ZOOM CONTRACT - Hard contract between design, data, rendering
 */

export const ZOOM_LEVELS = {
  WORLD: { level: 0, range: [0, 3], renders: ['heat_continents', 'city_pulses'], unlocks: ['city_tap'], labels: false },
  CITY: { level: 1, range: [3, 8], renders: ['district_glow', 'zone_boundaries'], unlocks: ['feed_overlays'], labels: false },
  DISTRICT: { level: 2, range: [8, 12], renders: ['zone_textures', 'street_heat'], unlocks: ['now_signals'], labels: false },
  STREET: { level: 3, range: [12, 16], renders: ['silhouettes', 'venue_motion', 'beacons'], unlocks: ['venue_cards'], labels: 'on_hover' },
  INTIMATE: { level: 4, range: [16, 20], renders: ['context_cards', 'full_detail'], unlocks: ['cta_buttons', 'go_now'], labels: 'visible' }
};

export function getZoomLevel(zoom) {
  for (const [key, config] of Object.entries(ZOOM_LEVELS)) {
    if (zoom >= config.range[0] && zoom < config.range[1]) return { key, ...config };
  }
  return { key: 'INTIMATE', ...ZOOM_LEVELS.INTIMATE };
}

export function shouldRender(feature, zoom) {
  return getZoomLevel(zoom).renders.includes(feature);
}

export function isUnlocked(feature, zoom) {
  return getZoomLevel(zoom).unlocks.includes(feature);
}

export const VISIBILITY_RULES = {
  earned: { minZoom: 8 },
  time_gated: { minZoom: 8, requiresPeakWindow: true },
  signal_only: { minZoom: 12, requiresActiveSignal: true },
  always: { minZoom: 3 },
  safety_override: { minZoom: 0, priority: 'highest' }
};

export default ZOOM_LEVELS;
