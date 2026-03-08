/**
 * TelegramPanel — HOTMESS OS branded Telegram community entry point.
 *
 * Opens as a bottom-sheet-style panel. Handles:
 *   1. Standard "join community" — tap → deep-link to Telegram group
 *   2. Bot-referral flow — if hm_tg_token is in localStorage the user
 *      arrived via the Telegram bot. We surface that context here.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TELEGRAM_DOMAIN,
  TELEGRAM_HTTP_URL,
  chooseTelegramLinks,
  openTelegramGroup,
} from './telegramLinks';

const AMBER  = '#C8962C';
const CARD   = '#1C1C1E';
const BG     = '#050507';
const MUTED  = '#8E8E93';
const TG_BLUE = '#2AABEE';

export type TelegramPanelProps = {
  open: boolean;
  onClose: () => void;
};

// ── Focus trap helpers ────────────────────────────────────────────────────────
const getFocusableElements = (root: HTMLElement): HTMLElement[] => {
  const sel = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', '[tabindex]:not([tabindex="-1"])',
  ].join(',');
  return Array.from(root.querySelectorAll<HTMLElement>(sel)).filter((el) => {
    const s = window.getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none';
  });
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function TelegramPanel({ open, onClose }: TelegramPanelProps) {
  const panelRef         = useRef<HTMLDivElement>(null);
  const closeButtonRef   = useRef<HTMLButtonElement>(null);
  const lastActiveRef    = useRef<HTMLElement | null>(null);
  const bodyOverflowRef  = useRef('');
  const [fromBot, setFromBot] = useState(false);
  const [tgUser, setTgUser]   = useState<string | null>(null);

  const linkChoice = useMemo(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    return chooseTelegramLinks(ua);
  }, []);

  // Detect bot referral
  useEffect(() => {
    const token = localStorage.getItem('hm_tg_token');
    const user  = localStorage.getItem('hm_tg_user');
    if (token) { setFromBot(true); setTgUser(user); }
  }, []);

  // Body scroll lock + focus management
  useEffect(() => {
    if (!open) return;
    lastActiveRef.current    = document.activeElement as HTMLElement;
    bodyOverflowRef.current  = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      document.body.style.overflow = bodyOverflowRef.current;
      lastActiveRef.current?.focus?.();
    };
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleJoin = () => {
    openTelegramGroup();
    onClose();
  };

  const handleTrapKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key !== 'Tab') return;
    const root = panelRef.current;
    if (!root) return;
    const focusables = getFocusableElements(root);
    if (!focusables.length) { e.preventDefault(); return; }
    const first = focusables[0];
    const last  = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey) { if (!active || active === first) { e.preventDefault(); last.focus(); } return; }
    if (active === last) { e.preventDefault(); first.focus(); }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[160]" role="dialog" aria-modal="true" aria-label="Join HOTMESS on Telegram">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onMouseDown={onClose}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            onKeyDown={handleTrapKeyDown}
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl overflow-hidden"
            style={{ background: BG, borderTop: `1px solid rgba(200,150,44,0.2)` }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="px-5 pt-2 pb-4 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: AMBER }}>
                  HOTMESS COMMUNITY
                </p>
                <h2 className="font-black text-xl text-white leading-tight">Join the feed.</h2>
                {fromBot ? (
                  <p className="text-sm mt-1" style={{ color: MUTED }}>
                    {tgUser ? `Welcome, @${tgUser} 👋` : 'Welcome from Telegram 👋'}
                  </p>
                ) : (
                  <p className="text-sm mt-1" style={{ color: MUTED }}>
                    Real-time scene updates, events & drops.
                  </p>
                )}
              </div>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center mt-1"
                style={{ background: 'rgba(255,255,255,0.08)' }}
                aria-label="Close"
              >
                <span className="text-white/70 text-sm leading-none">✕</span>
              </button>
            </div>

            {/* Bot referral context pill */}
            {fromBot && (
              <div className="mx-5 mb-3 px-4 py-3 rounded-2xl flex items-center gap-3"
                style={{ background: `${TG_BLUE}15`, border: `1px solid ${TG_BLUE}30` }}>
                <span className="text-xl">✈️</span>
                <div>
                  <p className="text-white font-bold text-sm">You came from the bot</p>
                  <p className="text-[11px]" style={{ color: MUTED }}>
                    Your account is linked. Hit Join to land in the group.
                  </p>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="mx-5 mb-4 flex gap-3">
              {[
                { label: 'Members', value: '2.4k+' },
                { label: 'Events posted', value: 'Weekly' },
                { label: 'Active nights', value: '7/7' },
              ].map(({ label, value }) => (
                <div key={label} className="flex-1 rounded-2xl p-3 text-center" style={{ background: CARD }}>
                  <p className="font-black text-base text-white">{value}</p>
                  <p className="text-[9px] uppercase tracking-wide mt-0.5" style={{ color: MUTED }}>{label}</p>
                </div>
              ))}
            </div>

            {/* What you get */}
            <div className="mx-5 mb-4 rounded-2xl overflow-hidden" style={{ background: CARD }}>
              {[
                { emoji: '🔔', text: 'First to know about events & drops' },
                { emoji: '📍', text: 'Real-time scene reports from the city' },
                { emoji: '🎵', text: 'Show alerts from HOTMESS RADIO' },
                { emoji: '🤝', text: 'Community-only offers & codes' },
              ].map(({ emoji, text }, i, arr) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
                  <span className="text-lg w-6 text-center flex-shrink-0">{emoji}</span>
                  <p className="text-white/80 text-sm">{text}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="px-5 pb-4 flex flex-col gap-2.5">
              <button
                onClick={handleJoin}
                className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-opacity active:opacity-80"
                style={{ background: TG_BLUE, color: '#fff' }}
              >
                Open in Telegram →
              </button>
              <p className="text-center text-[10px]" style={{ color: MUTED }}>
                Group: <span className="font-bold">@{TELEGRAM_DOMAIN}</span> · {linkChoice.isMobile ? 'Opens Telegram app' : TELEGRAM_HTTP_URL}
              </p>
            </div>

            {/* Safe area */}
            <div className="h-safe-area-inset-bottom" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
