/**
 * SearchRailIcon — Tier 2 (System) per D16 §10, Pulse only.
 *
 * Phil 2026-06-02 P0.3 — search relocates from the Pulse top-bar input to a
 * rail icon. Per D35 §13.4 search is `world_traversal` not utility lookup,
 * and the overlay it opens must arrive with living context (recent crossings,
 * tonight's hotspots), not a blank enterprise field.
 *
 * Action (§10.2): tap opens the search overlay sheet (kind: 'search').
 * State broadcast (§10.2): pulse-tier intent indicator if active filters or
 * recent traversal exist; for now the icon broadcasts only its tier presence.
 *
 * D35 §13.4 compliance is owned by the search overlay component itself
 * (L2SearchSheet). This icon's job is to be a clear traversal entry point.
 *
 * Positioned below the Bell (Tier 2) on Pulse. Hidden on every other page —
 * the rail tier matrix in D16 §10.1 puts Search at Tier 2 but with a
 * Pulse-only mount because traversal-as-feature is a Pulse-specific surface.
 */

import React from 'react';
import { Search } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';

const GOLD = '#C8962C';

export default function SearchRailIcon({ top = 116 }) {
  const { openSheet, activeSheet } = useSheet();
  // D16 §10.4 — rail yields to active sheets. See BellRailIcon for full
  // explanation. Search is Tier 2 but still yields because pip collision is
  // the failure mode being prevented, regardless of tier.
  if (activeSheet) return null;

  const handleTap = () => {
    openSheet('search');
  };

  return (
    <button
      type="button"
      onClick={handleTap}
      aria-label="Search the night"
      style={{
        position: 'fixed',
        top: `calc(env(safe-area-inset-top, 0px) + ${top}px)`,
        right: 12,
        zIndex: 160, // Tier 2 — same tier as Bell
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        cursor: 'pointer',
        touchAction: 'manipulation',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <Search
        className="w-5 h-5"
        style={{ color: 'rgba(255,255,255,0.75)' }}
      />
    </button>
  );
}
