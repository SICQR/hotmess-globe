/**
 * surfaceLayers.ts — code companion to D16 (Surface Layer Doctrine).
 *
 * Single source of truth for every floating / sticky / overlay surface in
 * the HOTMESS app. Z-index integers, safe-area offset calcs, and the
 * hide-rules hook all live here. Components import from this file and
 * NEVER hardcode `z-[70]` or `bottom-[150px]` in JSX.
 *
 * Doctrine: docs/doctrine/16-surface-layer-doctrine.md
 *
 * If you find yourself wanting to add a new constant here without first
 * updating D16 §7 — stop. The doctrine is the gate.
 */

import { useLocation } from 'react-router-dom';
import { useSheet } from '@/contexts/SheetContext';

// ─── §1 Z-INDEX REGISTRY ────────────────────────────────────────────────
// Every floating surface in the app picks exactly one of these.
// New entries require updating D16 §1 first.
export const Z_INDEX = {
  MAP: 0,
  MAP_OVERLAY: 10,
  PAGE_CHROME: 30,
  PEEK: 50,
  FAB: 70,
  L2_SHEET_BACKDROP: 79,
  L2_SHEET: 80,
  TOAST: 110,
  INTERRUPT: 200,
} as const;

// ─── §4 SAFE-AREA OFFSET CALCS ──────────────────────────────────────────
// CSS calc() strings — pass directly into style{{ top: OFFSET.TOP_HUD }}
// or className via Tailwind arbitrary value.
export const OFFSET = {
  TOP_HUD:     'calc(env(safe-area-inset-top, 0px) + 12px)',
  TOP_RAIL:    'calc(env(safe-area-inset-top, 0px) + 88px)',
  BOTTOM_NAV_HEIGHT: 56, // px
  // Bottom FAB sits above the 56px bottom nav with 24px breathing room.
  BOTTOM_FAB:  'calc(env(safe-area-inset-bottom, 0px) + 80px)',
} as const;

// ─── §3 HIDE RULES — useSurfaceVisibility hook ──────────────────────────
// Every floating surface reads its hide state from here. This hook is the
// only place hide-logic exists across the app. To add a new rule: update
// D16 §3 first, then extend the surfaces enum here, then the consumer.

export type Surface =
  | 'safety-fab'
  | 'drop-beacon-fab'
  | 'pulse-feedback-fab'
  | 'right-rail'
  | 'beacon-peek'
  | 'cluster-peek';

export interface SurfaceVisibility {
  visible: boolean;
  /** Reason the surface is hidden, for telemetry + console diagnostics. */
  reason: string | null;
}

/**
 * Read the visibility state for a floating surface against the current
 * route + sheet stack + page-specific rules. Components conditionally
 * render based on `visible`.
 *
 * Why a hook and not a static fn: the rules depend on `useLocation`
 * + `useSheet`. Both must subscribe to changes.
 */
export function useSurfaceVisibility(surface: Surface): SurfaceVisibility {
  const { pathname } = useLocation();
  const sheet = useSheet();
  const sheetOpen = !!sheet?.activeSheet;

  // Universal rule: every FAB hides when any L2 sheet is open.
  // The sheet IS the focused surface; no FAB competes with it for attention
  // or for thumb-space on top of the sheet content.
  if (surface.endsWith('-fab') && sheetOpen) {
    return { visible: false, reason: `L2 sheet open (${sheet?.activeSheet})` };
  }

  switch (surface) {
    case 'safety-fab':
      if (pathname === '/safety' || pathname.startsWith('/safety/')) {
        return { visible: false, reason: '/safety route owns its SOS surface' };
      }
      return { visible: true, reason: null };

    case 'drop-beacon-fab':
      // Drop Beacon lives on /pulse only. It is the WRITE action for the
      // person-axis signal taxonomy (D12).
      if (pathname !== '/pulse' && !pathname.startsWith('/pulse')) {
        return { visible: false, reason: 'Drop Beacon is /pulse-only' };
      }
      return { visible: true, reason: null };

    case 'pulse-feedback-fab':
      // #256 fix: feedback button overlapped Ghosted chat icon. Stays hidden
      // on Ghosted. Hidden on /safety because that surface is task-focused.
      if (pathname.startsWith('/ghosted') || pathname.startsWith('/safety')) {
        return { visible: false, reason: 'overlapped page-owned controls' };
      }
      return { visible: true, reason: null };

    case 'right-rail':
      // Right rail hides when L2 sheet is open (sheet covers it visually).
      if (sheetOpen) {
        return { visible: false, reason: `L2 sheet open (${sheet?.activeSheet})` };
      }
      return { visible: true, reason: null };

    case 'beacon-peek':
    case 'cluster-peek':
      // Peek panels dismiss themselves on tap-away; the visibility hook
      // returns true and the component manages its own life.
      return { visible: true, reason: null };

    default:
      return { visible: true, reason: null };
  }
}

// ─── §5 GESTURE TOKEN STRINGS ───────────────────────────────────────────
// Sheets and scroll surfaces apply these as CSS values to prevent Safari
// pull-to-refresh leaks.
export const GESTURE = {
  /** Outer sheet root: contains overscroll inside the sheet. */
  SHEET_ROOT: { overscrollBehavior: 'contain' as const, touchAction: 'pan-y' as const },
  /** Sheet drag handle: framer-motion owns this gesture exclusively. */
  SHEET_HANDLE: { touchAction: 'none' as const },
  /** Scrollable content inside a sheet: vertical pan only. */
  SHEET_SCROLL: { touchAction: 'pan-y' as const, overscrollBehavior: 'contain' as const },
} as const;
