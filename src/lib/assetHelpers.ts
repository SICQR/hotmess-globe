/**
 * assetHelpers.ts — Shared fallback logic for images across all surfaces
 *
 * One source of truth for fallback rendering rules:
 *   Profile:  ghost silhouette → initials
 *   Music:    disc icon (Disc3 style) → "RCR" label
 *   Market:   contextual icon per engine
 *
 * Import these in components instead of scattering one-off fallback logic.
 */

// ── Profile fallback ─────────────────────────────────────────────────────────

/**
 * Extract 1-2 character initials from a display name.
 * Returns 'HM' if name is empty/missing.
 */
export function getInitials(name: string | null | undefined): string {
  const trimmed = String(name || '').trim();
  if (!trimmed) return 'HM';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

/**
 * Ghost silhouette SVG path for profile fallback.
 * Render inside a 24x24 viewBox with stroke="currentColor".
 */
export const GHOST_SVG_PATH =
  'M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v1a7 7 0 0 0 3 5.75V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3.25A7 7 0 0 0 20 11v-1a8 8 0 0 0-8-8z';

/**
 * Consistent profile fallback colors.
 */
export const PROFILE_FALLBACK = {
  /** Dark gradient for fallback card bg */
  bg: 'linear-gradient(to bottom right, #1C1C1E, #0D0D0D)',
  /** Ghost icon color */
  iconColor: 'rgba(255,255,255,0.15)',
  /** Initials text color */
  initialsColor: 'rgba(255,255,255,0.2)',
} as const;

// ── Music fallback ───────────────────────────────────────────────────────────

/**
 * Consistent music artwork fallback colors.
 * All music surfaces use Disc3 icon + dark gradient.
 */
export const MUSIC_FALLBACK = {
  bg: 'linear-gradient(to bottom right, #1C1C1E, #0D0D0D)',
  iconColor: 'rgba(200,150,44,0.2)',
  labelColor: 'rgba(255,255,255,0.15)',
  label: 'RCR',
} as const;

// ── Market fallback ──────────────────────────────────────────────────────────

/**
 * Market engine icon names (lucide-react) per engine type.
 * Components import the actual icon; this maps the engine to the icon name.
 */
export const MARKET_FALLBACK_ICON = {
  shop: 'ShoppingBag',
  drops: 'Zap',
  preloved: 'Package',
} as const;

export const MARKET_FALLBACK = {
  bg: '#1C1C1E',
  iconColor: 'rgba(255,255,255,0.1)',
} as const;
