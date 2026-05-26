/**
 * beaconIconFactory.ts
 *
 * Rasterises HOTMESS beacon glyphs into Mapbox sprite images at MAP scale.
 *
 * Spec (from Beacon Identity System):
 *   - Map scale = 44 CSS px. Retina source bitmap = 88 px (×2).
 *   - Circular dark fill: radial gradient #1A1611 → #0A0905.
 *   - 1.25 CSS px ring (= 2.5 source px) at the disc edge.
 *   - Glyph centred, ~22 CSS px (= 44 source px), uses `currentColor`.
 *   - Soft halo behind the disc (alpha 0.18 → 0, ~12 CSS px wider).
 *   - State 'venue' → gold #C8962C ring + glyph.
 *   - State 'care'  → off-white #F4F1E8 ring + glyph.
 *
 * -------------------------------------------------------------------------
 * Lifecycle visual states (Sacred Invariant #4 — "Stale data must not
 * masquerade as live") and Invariant #5 — "Signals always expire":
 *
 *   "Every signal carries lifecycle state (created → active → decaying →
 *    stale → expired → removed) and visibility reflects it."
 *
 * Three render states are produced per category:
 *   - 'active'   — full saturation gold/care, halo at 0.18 alpha.
 *   - 'decaying' — disc + glyph at ~75% alpha, ring still crisp, halo dim
 *                  (0.10 alpha). The eye reads "still live, weakening".
 *   - 'stale'    — disc + glyph at ~45% alpha, ring DASHED + dim (0.5 alpha),
 *                  no halo. The eye reads "was a thing, isn't now."
 *
 * `expired` is NOT rendered — expired beacons are removed from the source
 * data (signal-economics-spec.md → Signal lifecycle).
 *
 * The default `lifecycleState` is `'active'`, so all existing callers
 * (and the layer-stack `match` expressions keyed on `hm-beacon-<cat>`)
 * continue to work unchanged. New state variants register under
 * `hm-beacon-<cat>--decaying` and `hm-beacon-<cat>--stale`.
 *
 * See: docs/governance/sacred-invariants.md (rules 4, 5)
 *      docs/governance/signal-economics-spec.md ("Signal lifecycle")
 * -------------------------------------------------------------------------
 */

import type mapboxgl from 'mapbox-gl';
import { BEACON_GLYPHS, type BeaconCategory } from './beaconGlyphs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIZE = 88;                 // source-bitmap size (44 CSS px @2x)
const CENTER = SIZE / 2;         // 44
const DISC_RADIUS = 22 * 2;      // 44 source px — disc reaches 22 CSS px radius? No: disc diameter = 44 CSS px, radius = 22 CSS px ⇒ 44 src px.
// Actually map-scale beacon is 44 CSS px total (diameter). So disc radius = 22 CSS px = 44 src px.
// But we also need padding for the halo within the 88×88 bitmap — so shrink disc slightly:
const DISC_R = 40;               // 40 src px radius = 20 CSS px, leaves 4 CSS px for halo on each side
const RING_WIDTH = 1.25 * 2;     // 2.5 src px stroke
const HALO_EXTRA = 12;           // halo extends 12 src px (= 6 CSS px) past the disc edge

const FILL_INNER = '#1A1611';
const FILL_OUTER = '#0A0905';

const COLOR_VENUE = '#C8962C';
const COLOR_CARE  = '#F4F1E8';

// ---------------------------------------------------------------------------
// Lifecycle state
// ---------------------------------------------------------------------------

/**
 * Visual lifecycle state of a beacon as drawn on the map.
 *
 * - `active`   — fresh signal, full visual weight.
 * - `decaying` — past freshness peak, visibly weakening.
 * - `stale`    — past relevance threshold, drained — "was, isn't now".
 *
 * `expired` is intentionally absent — expired beacons must be removed from
 * the source data, never rendered as a ghost.
 */
export type BeaconLifecycleState = 'active' | 'decaying' | 'stale';

const ALL_LIFECYCLE_STATES: BeaconLifecycleState[] = ['active', 'decaying', 'stale'];

interface LifecycleStyle {
  /** Multiplier on disc fill alpha (1.0 = opaque). */
  discAlpha: number;
  /** Multiplier on glyph + ring colour alpha. */
  glyphAlpha: number;
  /** Alpha of the ring stroke (independent of glyph — `decaying` keeps a crisp edge). */
  ringAlpha: number;
  /** Peak halo alpha — 0 means no halo at all. */
  haloAlpha: number;
  /** Optional dash pattern in source-pixel units (88px canvas). */
  ringDash?: number[];
}

const LIFECYCLE_STYLES: Record<BeaconLifecycleState, LifecycleStyle> = {
  active:   { discAlpha: 1.00, glyphAlpha: 1.00, ringAlpha: 1.00, haloAlpha: 0.18 },
  decaying: { discAlpha: 0.75, glyphAlpha: 0.75, ringAlpha: 1.00, haloAlpha: 0.10 },
  stale:    { discAlpha: 0.45, glyphAlpha: 0.45, ringAlpha: 0.50, haloAlpha: 0.00, ringDash: [6, 4] },
};

// ---------------------------------------------------------------------------
// Public: icon id
// ---------------------------------------------------------------------------

/**
 * Icon image id used in the Mapbox sprite map.
 *
 * - `active` (default): `hm-beacon-<cat>` — UNCHANGED, preserves all existing
 *   layer-stack `match` expressions.
 * - `decaying`: `hm-beacon-<cat>--decaying`
 * - `stale`:    `hm-beacon-<cat>--stale`
 */
export function beaconIconId(
  category: BeaconCategory,
  lifecycleState: BeaconLifecycleState = 'active',
): string {
  const base = `hm-beacon-${category}`;
  return lifecycleState === 'active' ? base : `${base}--${lifecycleState}`;
}

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

function makeCanvas(size: number): AnyCanvas | null {
  if (!isBrowser()) return null;
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      return new OffscreenCanvas(size, size);
    } catch {
      // fall through
    }
  }
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function get2d(canvas: AnyCanvas): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null {
  const ctx = canvas.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  return ctx;
}

// ---------------------------------------------------------------------------
// Glyph SVG → data URL
// ---------------------------------------------------------------------------

/** Pull inner contents out of a `<svg ...>...</svg>` string (or return as-is if no wrapper). */
function extractSvgInner(svg: string): string {
  const open = svg.indexOf('<svg');
  if (open < 0) return svg;
  const gt = svg.indexOf('>', open);
  if (gt < 0) return svg;
  const close = svg.lastIndexOf('</svg>');
  if (close < 0) return svg.slice(gt + 1);
  return svg.slice(gt + 1, close);
}

function buildGlyphSvgDocument(innerSvg: string, color: string): string {
  // Wrap so currentColor resolves to the requested CSS color.
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" ` +
    `viewBox="-32 -32 64 64" style="color:${color}">` +
    innerSvg +
    `</svg>`
  );
}

function svgToDataUrl(svg: string): string {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.decoding = 'async';
    img.src = url;
  });
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function drawHalo(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  color: string,
  peakAlpha: number,
): void {
  if (peakAlpha <= 0) return;
  const cx = CENTER;
  const cy = CENTER;
  const inner = DISC_R;
  const outer = DISC_R + HALO_EXTRA;
  const grad = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
  // Pull alpha-tinted color (#RRGGBB → rgba)
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  grad.addColorStop(0, `rgba(${r},${g},${b},${peakAlpha})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, outer, 0, Math.PI * 2);
  ctx.fill();
}

function drawDisc(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  alpha: number,
): void {
  const cx = CENTER;
  const cy = CENTER;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, DISC_R);
  grad.addColorStop(0, FILL_INNER);
  grad.addColorStop(1, FILL_OUTER);
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(Math.round(cx), Math.round(cy), DISC_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = prev;
}

function drawRing(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  color: string,
  alpha: number,
  dash?: number[],
): void {
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = RING_WIDTH;
  if (dash && dash.length > 0 && typeof (ctx as any).setLineDash === 'function') {
    (ctx as any).setLineDash(dash);
  } else if (typeof (ctx as any).setLineDash === 'function') {
    (ctx as any).setLineDash([]);
  }
  ctx.beginPath();
  // Stroke is centred on the path, so radius is disc - half stroke for crisp edge.
  ctx.arc(
    Math.round(CENTER),
    Math.round(CENTER),
    DISC_R - RING_WIDTH / 2,
    0,
    Math.PI * 2,
  );
  ctx.stroke();
  if (typeof (ctx as any).setLineDash === 'function') {
    (ctx as any).setLineDash([]);
  }
  ctx.globalAlpha = prev;
}

function drawGlyph(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  img: HTMLImageElement,
  alpha: number,
): void {
  // Image is already the full 88×88 SVG with the viewBox handling glyph centring.
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  ctx.globalAlpha = prev;
}

// ---------------------------------------------------------------------------
// Public: async build (real implementation)
// ---------------------------------------------------------------------------

/** Async variant — required because SVG → Image is async. Returns null off-browser.
 *  @param category       which beacon glyph to rasterise
 *  @param lifecycleState visual lifecycle tier (default 'active' — full saturation) */
export async function buildBeaconIconAsync(
  category: BeaconCategory,
  lifecycleState: BeaconLifecycleState = 'active',
): Promise<ImageData | null> {
  if (!isBrowser()) return null;

  const glyph = BEACON_GLYPHS[category];
  if (!glyph) return null;

  const color = glyph.state === 'venue' ? COLOR_VENUE : COLOR_CARE;
  const style = LIFECYCLE_STYLES[lifecycleState] ?? LIFECYCLE_STYLES.active;

  const canvas = makeCanvas(SIZE);
  if (!canvas) return null;
  const ctx = get2d(canvas);
  if (!ctx) return null;

  // Background layers first
  ctx.clearRect(0, 0, SIZE, SIZE);
  drawHalo(ctx, color, style.haloAlpha);
  drawDisc(ctx, style.discAlpha);
  drawRing(ctx, color, style.ringAlpha, style.ringDash);

  // Rasterise the glyph SVG
  const innerSvg = extractSvgInner(glyph.svg);
  const svgDoc = buildGlyphSvgDocument(innerSvg, color);
  const url = svgToDataUrl(svgDoc);

  try {
    const img = await loadImage(url);
    drawGlyph(ctx, img, style.glyphAlpha);
  } catch {
    // If the SVG fails to load we still return the disc — better than nothing.
  }

  const imgData = ctx.getImageData(0, 0, SIZE, SIZE);
  return imgData;
}

// ---------------------------------------------------------------------------
// Public: sync build (best-effort; glyph omitted because rasterising SVG is async)
// ---------------------------------------------------------------------------

/** Build an ImageData for a single beacon icon at map scale (88×88 source = 44 CSS px @2x).
 *  Renders: outer soft halo, dark radial fill, 1.25 (×2) px ring, centred glyph.
 *  Ring + glyph colour comes from the BeaconGlyph.state ('venue' → gold #C8962C, 'care' → #F4F1E8).
 *  NOTE: synchronous form draws the disc + ring only; glyph requires `buildBeaconIconAsync`.
 *  Returns null when run in a non-browser environment so callers can skip safely.
 *  @param category       which beacon glyph to rasterise
 *  @param lifecycleState visual lifecycle tier (default 'active' — full saturation) */
export function buildBeaconIcon(
  category: BeaconCategory,
  lifecycleState: BeaconLifecycleState = 'active',
): ImageData | null {
  if (!isBrowser()) return null;

  const glyph = BEACON_GLYPHS[category];
  if (!glyph) return null;

  const color = glyph.state === 'venue' ? COLOR_VENUE : COLOR_CARE;
  const style = LIFECYCLE_STYLES[lifecycleState] ?? LIFECYCLE_STYLES.active;

  const canvas = makeCanvas(SIZE);
  if (!canvas) return null;
  const ctx = get2d(canvas);
  if (!ctx) return null;

  ctx.clearRect(0, 0, SIZE, SIZE);
  drawHalo(ctx, color, style.haloAlpha);
  drawDisc(ctx, style.discAlpha);
  drawRing(ctx, color, style.ringAlpha, style.ringDash);

  return ctx.getImageData(0, 0, SIZE, SIZE);
}

// ---------------------------------------------------------------------------
// Public: register all icons on a Mapbox map
// ---------------------------------------------------------------------------

const ALL_CATEGORIES: BeaconCategory[] = [
  'gym',
  'club',
  'sauna',
  'leather',
  'cafe',
  'clinic',
  'aftercare',
  'cruising',
  'market',
];

/** Register all 27 icons on a Mapbox map instance via map.addImage — 9 categories
 *  × 3 lifecycle states (active / decaying / stale). Idempotent — skips any id
 *  already registered. Sprites are registered at pixelRatio: 2 for retina. */
export function registerBeaconIcons(map: mapboxgl.Map): void {
  if (!isBrowser()) return;
  if (!map || typeof (map as any).addImage !== 'function') return;

  const tasks: Array<{ cat: BeaconCategory; state: BeaconLifecycleState }> = [];
  for (const cat of ALL_CATEGORIES) {
    for (const state of ALL_LIFECYCLE_STATES) {
      tasks.push({ cat, state });
    }
  }

  // Fire-and-forget: each icon is added when its SVG decodes.
  void Promise.all(
    tasks.map(async ({ cat, state }) => {
      const id = beaconIconId(cat, state);
      try {
        if (typeof (map as any).hasImage === 'function' && (map as any).hasImage(id)) {
          return;
        }
        const imageData = await buildBeaconIconAsync(cat, state);
        if (!imageData) return;
        // Re-check just before adding, in case another caller raced us.
        if (typeof (map as any).hasImage === 'function' && (map as any).hasImage(id)) {
          return;
        }
        (map as any).addImage(
          id,
          {
            width: SIZE,
            height: SIZE,
            data: new Uint8Array(imageData.data.buffer),
          } as any,
          { pixelRatio: 2 },
        );
      } catch {
        // Swallow — one bad icon shouldn't break the map.
      }
    }),
  );
}
