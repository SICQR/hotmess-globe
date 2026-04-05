/**
 * LiveModeOverlay — Full overlay component for LIVE MODE.
 *
 * Wireframe:
 * ┌─────────────────────────────────────────┐
 * │  LIVE NOW              total    [X]     │  Header (sticky, safe-area)
 * │  {nearbyCount} nearby . {venueCount} at │  Subline
 * ├─────────────────────────────────────────┤
 * │  [Eagle 4] [Soho 8] [Radio 3]          │  Context chips (h-scroll)
 * ├─────────────────────────────────────────┤
 * │  ┌───────┐ ┌───────┐                   │  2-col card grid (venue)
 * │  │ Card  │ │ Card  │                   │  or list (area)
 * │  └───────┘ └───────┘                   │
 * │                                         │
 * │  [Empty state if no users]              │
 * └─────────────────────────────────────────┘
 *
 * Z-index: 110 (above sheets, below interrupts)
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, MessageCircle, Navigation, MapPin, Shield, Radio } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { useLiveMode } from '@/contexts/LiveModeContext';
import { useLiveMoment, type LiveUser, type ContextChip } from '@/hooks/useLiveMoment';
import { motionTokens, useReducedMotion } from '@/lib/motionTokens';

const AMBER = '#C8962C';
const TEAL = '#00C2E0';
const MUTED = '#8E8E93';

// ── Presence state → display config ──────────────────────────────────────────

const PRESENCE_CONFIG: Record<string, { dot: string; label: string }> = {
  at_venue: { dot: '#30D158', label: 'At venue' },
  listening: { dot: TEAL, label: 'Listening' },
  nearby: { dot: AMBER, label: 'Nearby' },
  moving: { dot: '#FF9500', label: 'Moving' },
  aftercare: { dot: '#AF52DE', label: 'Aftercare' },
};

// ── Main component ───────────────────────────────────────────────────────────

export default function LiveModeOverlay() {
  const { isLive, liveContext, exitLive } = useLiveMode();
  const { openSheet } = useSheet();
  const { data, isLoading } = useLiveMoment(liveContext);
  const reduced = useReducedMotion();
  const [activeChipId, setActiveChipId] = useState<string | null>(null);

  if (!isLive || !liveContext) return null;

  const moment = data ?? {
    total: 0, nearbyCount: 0, venueCount: 0, movingCount: 0, radioCount: 0,
    users: [], contextChips: [],
  };

  // Filter users by active chip
  const filteredUsers = activeChipId
    ? moment.users.filter(u => {
        if (activeChipId.startsWith('venue-')) {
          const venueName = activeChipId.replace('venue-', '');
          return u.contextLine === `At ${venueName}`;
        }
        if (activeChipId.startsWith('radio-')) {
          return u.presenceState === 'listening';
        }
        return true;
      })
    : moment.users;

  // Headline based on context type
  const headline = (() => {
    switch (liveContext.type) {
      case 'venue': return `WHO'S AT ${(liveContext.venueName || 'HERE').toUpperCase()}`;
      case 'area': return 'AROUND YOU';
      case 'radio': return 'LISTENING NOW';
      default: return 'LIVE NOW';
    }
  })();

  // Subline counts
  const subParts: string[] = [];
  if (moment.nearbyCount > 0) subParts.push(`${moment.nearbyCount} nearby`);
  if (moment.venueCount > 0) subParts.push(`${moment.venueCount} at venues`);
  if (moment.movingCount > 0) subParts.push(`${moment.movingCount} moving`);
  if (moment.radioCount > 0) subParts.push(`${moment.radioCount} listening`);
  const subline = subParts.join(' \u00B7 ') || 'Scanning...';

  const isVenueLayout = liveContext.type === 'venue';

  // ── Action handlers ────────────────────────────────────────────────────────

  const handlePing = useCallback((user: LiveUser) => {
    openSheet('chat', { userId: user.id, prefill: '\uD83D\uDC4B' });
  }, [openSheet]);

  const handlePullUp = useCallback((user: LiveUser) => {
    openSheet('profile', { uid: user.id });
  }, [openSheet]);

  const handleMeetHalfway = useCallback((user: LiveUser) => {
    openSheet('profile', { uid: user.id });
  }, [openSheet]);

  const handleAction = useCallback((user: LiveUser) => {
    switch (user.primaryAction) {
      case 'ping': return handlePing(user);
      case 'pull_up': return handlePullUp(user);
      case 'meet_halfway': return handleMeetHalfway(user);
    }
  }, [handlePing, handlePullUp, handleMeetHalfway]);

  const handleChipTap = useCallback((chip: ContextChip) => {
    setActiveChipId(prev => prev === chip.id ? null : chip.id);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[110] flex flex-col"
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'rgba(5,5,7,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      />

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col h-full"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="pt-[env(safe-area-inset-top)] px-5 pb-3">
          <div className="flex items-center justify-between mt-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <motion.span
                  className="w-2 h-2 rounded-full"
                  style={{ background: '#30D158' }}
                  {...(reduced ? {} : motionTokens.statusDotPulse)}
                />
                <motion.h1
                  className="text-lg font-black tracking-[0.15em] uppercase text-white"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 }}
                >
                  {headline}
                </motion.h1>
              </div>
              <motion.div
                className="flex items-center gap-2 mt-1.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.12 }}
              >
                <span className="text-2xl font-black text-white">{moment.total}</span>
                <span className="text-sm text-white/40">in your moment</span>
              </motion.div>
              <motion.p
                className="text-xs mt-1"
                style={{ color: MUTED }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.16 }}
              >
                {subline}
              </motion.p>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={exitLive}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              aria-label="Exit Live Mode"
            >
              <X className="w-5 h-5 text-white/50" />
            </motion.button>
          </div>
        </div>

        {/* ── Context Chips Strip ─────────────────────────────────────────── */}
        {moment.contextChips.length > 0 && (
          <div className="px-5 pb-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {moment.contextChips.map((chip) => {
                const isActive = activeChipId === chip.id;
                const chipColor = chip.type === 'radio' ? TEAL : AMBER;
                return (
                  <motion.button
                    key={chip.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleChipTap(chip)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0 transition-colors"
                    style={{
                      background: isActive ? `${chipColor}20` : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${isActive ? `${chipColor}40` : 'rgba(255,255,255,0.06)'}`,
                    }}
                    aria-label={`Filter: ${chip.label} (${chip.count})`}
                    aria-pressed={isActive}
                  >
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: chipColor }}
                      {...(reduced ? {} : motionTokens.statusDotPulse)}
                    />
                    <span
                      className="text-xs font-bold"
                      style={{ color: isActive ? chipColor : 'rgba(255,255,255,0.5)' }}
                    >
                      {chip.label}
                    </span>
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: isActive ? chipColor : 'rgba(255,255,255,0.3)' }}
                    >
                      {chip.count}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Cards Area ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 pb-24">
          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#C8962C]/30 border-t-[#C8962C] rounded-full animate-spin" />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && filteredUsers.length === 0 && (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Users className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p className="text-white/30 text-base font-semibold">
                No one in your moment right now.
              </p>
              <p className="text-white/15 text-sm mt-2">
                Check back later or go live.
              </p>
            </motion.div>
          )}

          {/* User cards grid */}
          {filteredUsers.length > 0 && (
            <motion.div
              className={isVenueLayout ? 'grid grid-cols-2 gap-3' : 'space-y-2'}
              initial="initial"
              animate="animate"
              variants={{
                animate: { transition: { staggerChildren: reduced ? 0 : 0.04 } },
              }}
            >
              {filteredUsers.map((user, i) => (
                <LiveUserCard
                  key={user.id}
                  user={user}
                  index={i}
                  isVenueLayout={isVenueLayout}
                  onAction={() => handleAction(user)}
                  reduced={reduced}
                />
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── LiveUserCard ─────────────────────────────────────────────────────────────

function LiveUserCard({
  user,
  index,
  isVenueLayout,
  onAction,
  reduced,
}: {
  user: LiveUser;
  index: number;
  isVenueLayout: boolean;
  onAction: () => void;
  reduced: boolean;
}) {
  const config = PRESENCE_CONFIG[user.presenceState] || PRESENCE_CONFIG.nearby;

  const actionLabels: Record<string, string> = {
    ping: 'Ping',
    pull_up: 'Pull Up',
    meet_halfway: 'Meet',
  };

  const ActionIcon = user.primaryAction === 'ping'
    ? MessageCircle
    : user.primaryAction === 'pull_up'
      ? MapPin
      : Navigation;

  if (isVenueLayout) {
    // 2-column grid card
    return (
      <motion.div
        variants={reduced ? {} : motionTokens.fadeUpSm}
        className="rounded-xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="p-3 flex flex-col items-center text-center">
          {/* Avatar */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden mb-2"
            style={{
              background: `${AMBER}10`,
              border: `2px solid ${config.dot}30`,
            }}
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Users className="w-6 h-6" style={{ color: `${AMBER}40` }} />
            )}
          </div>

          {/* Status dot + context */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: config.dot }}
            />
            <p className="text-white text-xs font-bold truncate max-w-[100px]">
              {user.contextLine}
            </p>
          </div>

          {/* Secondary line */}
          {user.secondaryLine && (
            <p className="text-[10px] truncate max-w-[100px]" style={{ color: MUTED }}>
              {user.secondaryLine}
            </p>
          )}

          {/* Vibe chip */}
          {user.vibe && (
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full mt-1.5"
              style={{ background: `${AMBER}15`, color: AMBER }}
            >
              {user.vibe}
            </span>
          )}

          {/* Verified */}
          {user.isVerified && (
            <div className="flex items-center gap-0.5 mt-1">
              <Shield className="w-2.5 h-2.5" style={{ color: AMBER }} />
              <span className="text-[8px] font-bold" style={{ color: `${AMBER}80` }}>Verified</span>
            </div>
          )}

          {/* Action button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={(e) => { e.stopPropagation(); onAction(); }}
            className="mt-2 w-full h-8 rounded-lg flex items-center justify-center gap-1 text-[11px] font-bold"
            style={{ background: AMBER, color: '#000' }}
            aria-label={`${actionLabels[user.primaryAction]} ${user.displayName}`}
          >
            <ActionIcon className="w-3 h-3" />
            {actionLabels[user.primaryAction]}
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // List layout (area/global/radio mode)
  return (
    <motion.div
      variants={reduced ? {} : motionTokens.fadeUpSm}
      className="rounded-xl overflow-hidden flex items-center gap-3 p-3"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Avatar */}
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{
          background: `${AMBER}10`,
          border: `2px solid ${config.dot}30`,
        }}
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Users className="w-5 h-5" style={{ color: `${AMBER}40` }} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: config.dot }}
          />
          <p className="text-white text-sm font-bold truncate">{user.contextLine}</p>
          {user.isVerified && (
            <Shield className="w-3 h-3 flex-shrink-0" style={{ color: AMBER }} />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {user.secondaryLine && (
            <p className="text-[11px] truncate" style={{ color: MUTED }}>{user.secondaryLine}</p>
          )}
          {user.distanceM !== null && (
            <p className="text-[11px] flex-shrink-0" style={{ color: MUTED }}>
              {user.distanceM < 100 ? 'Very close' : `${user.distanceM}m`}
            </p>
          )}
        </div>
        {user.vibe && (
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block"
            style={{ background: `${AMBER}15`, color: AMBER }}
          >
            {user.vibe}
          </span>
        )}
      </div>

      {/* Action button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onAction}
        className="h-9 px-3 rounded-lg flex items-center justify-center gap-1 text-[11px] font-bold flex-shrink-0"
        style={{ background: AMBER, color: '#000' }}
        aria-label={`${actionLabels[user.primaryAction]} ${user.displayName}`}
      >
        <ActionIcon className="w-3.5 h-3.5" />
        {actionLabels[user.primaryAction]}
      </motion.button>
    </motion.div>
  );
}
