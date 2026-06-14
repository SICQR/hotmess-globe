/**
 * BellRailIcon — global notification bell, Tier 2 (System) per D16 §10.
 *
 * Phil 2026-06-02 — relocated from TopHUD (where it was hidden on Pulse via
 * !isPulse condition) to the rail layer where it lives on every page,
 * consistent with §10.1's 4-tier matrix.
 *
 * Visual hierarchy per Phil's §10 ratification:
 *  - When unread > 0: subtle pulse animation, persistent gold dot, glow ring
 *  - When idle (no unread): clear, legible, no animation, ambient state
 *  - Distinct from Tier 4 passive icons via stronger glow + size baseline
 *
 * Action contract (§10.2): tap opens L2NotificationInboxSheet
 * State broadcast (§10.2): unread count rendered as badge + pulse + dot
 *
 * Positioning: top-LEFT of viewport, fixed, below safe-area-top.
 * Left side keeps it fully clear of:
 *   - SafetyFAB (top-right, right:16) — non-negotiable safety access
 *   - Globe right rail (top-right, right:4) — which has its own Bell
 *   - GhostedRailButtons (top-right, right:4)
 *
 * Phil 2026-06-14: moved from right:68 (sat next to SafetyFAB at same height,
 * cluttered; also duplicated on /pulse where Globe's rail has its own Bell).
 * Now lives left:16 so no right-rail conflicts on any page.
 *
 * Tonal register (D35 surface-meta when ratified): clarity-first.
 * NOT atmospheric. Notification surfaces need to be operationally trustworthy
 * — see Phil's bell/search distinction (clarity-first vs traversal-atmospheric).
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { useNotifCount } from '@/hooks/useNotifCount';

const GOLD = '#C8962C';

export default function BellRailIcon() {
  const { pathname } = useLocation();
  const { openSheet, activeSheet } = useSheet();
  // Hooks must be called before any conditional return (rules-of-hooks).
  // D16 §10.4 yield-to-sheet check moves below.
  const { notifCount, clearNotifBadge } = useNotifCount();

  // /pulse owns its own Bell RailButton in the Globe right rail (Globe.jsx
  // line ~677). Rendering BellRailIcon there too double-counts the badge and
  // creates two tappable bells pointing to the same sheet. Yield entirely.
  if (pathname === '/pulse' || pathname.startsWith('/pulse/')) return null;

  // D16 §10.4 — rail yields to active sheets.
  if (activeSheet) return null;
  const hasUnread = notifCount > 0;

  const handleTap = () => {
    clearNotifBadge();
    openSheet('notification-inbox');
  };

  return (
    <button
      type="button"
      onClick={handleTap}
      aria-label={hasUnread ? `${notifCount} unread notifications` : 'Notifications'}
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 72px)', // vertically level with SafetyFAB (top-right, same row)
        left: 16, // Phil 2026-06-14: moved from right:68 — left side clears SafetyFAB, Globe rail, and GhostedRailButtons
        zIndex: 160, // above page rail (z:150); below SOSOverlay (z:200+) and SafetyFAB (z:150 but different position)
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: hasUnread ? 'rgba(200,150,44,0.12)' : 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: hasUnread ? `1.5px solid ${GOLD}` : '1px solid rgba(255,255,255,0.12)',
        boxShadow: hasUnread
          ? `0 0 16px rgba(200,150,44,0.45), 0 4px 16px rgba(0,0,0,0.45)`
          : '0 4px 12px rgba(0,0,0,0.4)',
        cursor: 'pointer',
        touchAction: 'manipulation',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* §10.2 state broadcast: subtle pulse when unread */}
      {hasUnread && (
        <motion.span
          aria-hidden
          initial={{ opacity: 0.6, scale: 1 }}
          animate={{ opacity: 0, scale: 1.7 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            inset: -2,
            borderRadius: '50%',
            border: `1.5px solid ${GOLD}`,
            pointerEvents: 'none',
          }}
        />
      )}

      <Bell
        className="w-5 h-5"
        style={{
          color: hasUnread ? GOLD : 'rgba(255,255,255,0.7)',
          filter: hasUnread ? `drop-shadow(0 0 6px rgba(200,150,44,0.6))` : 'none',
        }}
      />

      {/* §10.2 state broadcast: count badge */}
      <AnimatePresence>
        {hasUnread && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 9,
              background: GOLD,
              color: '#050507',
              fontSize: 10,
              fontWeight: 800,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #050507',
              fontFamily: '-apple-system, system-ui, sans-serif',
              letterSpacing: '-0.02em',
            }}
          >
            {notifCount > 99 ? '99+' : notifCount}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

