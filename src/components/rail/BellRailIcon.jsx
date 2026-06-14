/**
 * BellRailIcon — global notification bell, Tier 2 (System) per D16 §10.
 *
 * Phil 2026-06-14 — repositioned from right:68 (cluttered next to SafetyFAB,
 * appeared in same horizontal band as stories row on Ghosted, duplicated on
 * Pulse where Globe rail already has its own Bell). Now:
 *   - Yields on /pulse (Globe rail handles it there)
 *   - Yields on /ghosted (stories row + SafetyFAB conflict at same height)
 *   - Positioned left:16 so it never touches the right-rail cluster
 *
 * Action contract (§10.2): tap opens L2NotificationInboxSheet
 * State broadcast (§10.2): unread count rendered as badge + pulse + dot
 *
 * Positioning: top-LEFT of viewport, fixed. Left side clears SafetyFAB,
 * Globe right rail (which has its own Bell), and GhostedRailButtons.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useSheet } from '@/contexts/SheetContext';
import { useNotifCount } from '@/hooks/useNotifCount';

const GOLD = '#C8962C';

export default function BellRailIcon() {
  const { pathname } = useLocation();
  const { openSheet, activeSheet } = useSheet();
  const { notifCount, clearNotifBadge } = useNotifCount();

  // /pulse: Globe rail has its own Bell RailButton — don't double-render.
  if (pathname === '/pulse' || pathname.startsWith('/pulse/')) return null;

  // /ghosted: stories row + SafetyFAB fill top area at same height.
  // Bell at top:72 was visually part of the story circles row.
  // Message count lives on the MessageCircle FAB (bottom-right) instead.
  if (pathname === '/ghosted' || pathname.startsWith('/ghosted/')) return null;

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
        top: 'calc(env(safe-area-inset-top, 0px) + 72px)',
        left: 16,
        zIndex: 160,
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
