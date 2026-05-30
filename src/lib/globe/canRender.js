/**
 * HOTMESS Frontend Guard
 * Safety gate - nothing renders without passing these checks
 */

const K_THRESHOLDS = {
  WORLD: 100,
  CITY: 50,
  DISTRICT: 20,
  STREET: 10,
  INTIMATE: 5,
};

const MIN_DELAY_SECONDS = 300;

const BLOCKED_CONTENT = [
  'exact_location',
  'individual_position',
  'movement_trail',
  'sexual_intent',
  'personal_identifier',
  'real_time_presence',
  'sos_signal',
  'private_message',
];

export function canRender(tile, zoomLevel, viewerContext = {}) {
  if (!tile) {
    return { canRender: false, reason: 'no_tile_data', fallback: 'sparkle' };
  }

  if (tile.contentType && BLOCKED_CONTENT.includes(tile.contentType)) {
    return { canRender: false, reason: 'blocked_content', fallback: 'sparkle' };
  }

  const zoomKey = getZoomKey(zoomLevel);
  const requiredK = K_THRESHOLDS[zoomKey] || K_THRESHOLDS.CITY;
  
  if ((tile.k_count || 0) < requiredK) {
    return { canRender: false, reason: 'k_below_threshold', fallback: 'sparkle' };
  }

  if (tile.timestamp) {
    const ageSeconds = (Date.now() - new Date(tile.timestamp).getTime()) / 1000;
    if (ageSeconds < MIN_DELAY_SECONDS) {
      return { canRender: false, reason: 'too_recent', fallback: 'sparkle' };
    }
  }

  return { canRender: true, fallback: null };
}

export function filterRenderableTiles(tiles, zoomLevel, viewerContext = {}) {
  return tiles.map(tile => ({
    ...tile,
    ...canRender(tile, zoomLevel, viewerContext),
  }));
}

function getZoomKey(zoom) {
  if (zoom < 3) return 'WORLD';
  if (zoom < 8) return 'CITY';
  if (zoom < 12) return 'DISTRICT';
  if (zoom < 16) return 'STREET';
  return 'INTIMATE';
}

export function safeRender(tile, zoomLevel, renderFn, sparkleFn, viewerContext) {
  const check = canRender(tile, zoomLevel, viewerContext);
  if (check.canRender) return renderFn(tile);
  if (check.fallback === 'sparkle' && sparkleFn) return sparkleFn(tile.center || tile.position);
  return null;
}
