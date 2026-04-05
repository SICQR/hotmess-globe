/**
 * GhostedOverlay — contextual people layer over Pulse.
 *
 * Two modes:
 * - Venue: "WHO'S AT EAGLE RIGHT NOW" — tight, 6-12 cards, no scroll
 * - Area:  "AROUND YOU · Near Soho" — 12-24 cards, capped scroll
 *
 * Spatial transitions: venue feels like stepping into the room,
 * area feels like stepping outside. Close returns to same Pulse state.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, ChevronDown, Users, MapPin, Shield } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { useVenuePresence, type GhostedContext, type PresenceUser } from '@/hooks/useVenuePresence';
import { VibeChip } from '@/components/vibe/VibeSelector';
import type { Vibe } from '@/hooks/useVenueVibes';

const AMBER = '#C8962C';

interface GhostedOverlayProps {
  context: GhostedContext;
  onClose: () => void;
  onExpandToNearby?: () => void; // venue mode → expand to area mode
}

export default function GhostedOverlay({ context, onClose, onExpandToNearby }: GhostedOverlayProps) {
  const { openSheet } = useSheet();
  const { data: users = [], isLoading } = useVenuePresence(context);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const isVenue = context.mode === 'venue';
  const maxVisible = isVenue ? 12 : 24;
  const visibleUsers = users.slice(0, maxVisible);

  const handleMessage = useCallback((user: PresenceUser) => {
    openSheet('chat', {
      userId: user.id,
      title: `Chat with ${user.display_name}`,
    });
  }, [openSheet]);

  const handleReveal = useCallback((user: PresenceUser) => {
    openSheet('profile', { uid: user.id });
  }, [openSheet]);

  const handleCardTap = useCallback((userId: string) => {
    setExpandedUserId(prev => prev === userId ? null : userId);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[105] flex flex-col"
    >
      {/* Backdrop — darkened, spatial feel */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'rgba(5,5,7,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      />

      {/* Content — slides up from bottom */}
      <motion.div
        className="relative z-10 flex flex-col h-full"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        {/* Header */}
        <div className="pt-[env(safe-area-inset-top)] px-5 pb-4">
          <div className="flex items-center justify-between mt-4">
            <div className="flex-1">
              <motion.h1
                className="text-lg font-black tracking-[0.15em] uppercase text-white"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 }}
              >
                {isVenue
                  ? `WHO'S AT ${(context.venue_name || 'HERE').toUpperCase()}`
                  : 'AROUND YOU'}
              </motion.h1>
              <motion.p
                className="text-sm text-white/40 mt-0.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.12 }}
              >
                {isVenue
                  ? `${visibleUsers.length} active`
                  : `Near ${getAreaFromContext(context)} · Moving`}
              </motion.p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <X className="w-5 h-5 text-white/50" />
            </button>
          </div>

          {/* Silhouette preview row */}
          {visibleUsers.length > 0 && (
            <motion.div
              className="flex -space-x-1.5 mt-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
            >
              {visibleUsers.slice(0, 10).map((user, i) => (
                <motion.div
                  key={user.id}
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `rgba(200,150,44,${0.06 + i * 0.015})`,
                    border: '1px solid rgba(200,150,44,0.12)',
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.03 }}
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <Users className="w-3.5 h-3.5" style={{ color: `${AMBER}50` }} />
                  )}
                </motion.div>
              ))}
              {visibleUsers.length > 10 && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold"
                  style={{ background: 'rgba(200,150,44,0.12)', color: AMBER, border: '1px solid rgba(200,150,44,0.15)' }}
                >
                  +{visibleUsers.length - 10}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Cards area */}
        <div
          className={`flex-1 px-4 pb-24 ${isVenue ? 'overflow-hidden' : 'overflow-y-auto'}`}
          style={!isVenue ? { maxHeight: 'calc(100vh - 200px)' } : undefined}
        >
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#C8962C]/30 border-t-[#C8962C] rounded-full animate-spin" />
            </div>
          )}

          {!isLoading && visibleUsers.length === 0 && (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Users className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
              <p className="text-white/30 text-sm">
                {isVenue ? 'No one visible here right now' : 'No one nearby right now'}
              </p>
            </motion.div>
          )}

          {/* Presence cards grid */}
          {visibleUsers.length > 0 && (
            <div className={isVenue ? 'space-y-2' : 'grid grid-cols-2 gap-2'}>
              {visibleUsers.map((user, i) => (
                <PresenceCard
                  key={user.id}
                  user={user}
                  index={i}
                  isExpanded={expandedUserId === user.id}
                  onTap={() => handleCardTap(user.id)}
                  onReveal={() => handleReveal(user)}
                  onMessage={() => handleMessage(user)}
                  isVenueMode={isVenue}
                />
              ))}
            </div>
          )}

          {/* Expand to nearby CTA (venue mode only) */}
          {isVenue && onExpandToNearby && visibleUsers.length > 0 && (
            <motion.button
              onClick={onExpandToNearby}
              className="w-full mt-5 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold active:scale-[0.98] transition-transform"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.5)',
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              See more nearby
              <ChevronDown className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Presence Card ──────────────────────────────────────────────────────────

function PresenceCard({
  user,
  index,
  isExpanded,
  onTap,
  onReveal,
  onMessage,
  isVenueMode,
}: {
  user: PresenceUser;
  index: number;
  isExpanded: boolean;
  onTap: () => void;
  onReveal: () => void;
  onMessage: () => void;
  isVenueMode: boolean;
}) {
  return (
    <motion.div
      onClick={onTap}
      className="rounded-xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform"
      style={{
        background: isExpanded ? 'rgba(200,150,44,0.06)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isExpanded ? 'rgba(200,150,44,0.15)' : 'rgba(255,255,255,0.05)'}`,
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: isExpanded ? -2 : 0 }}
      transition={{ delay: index * 0.03, type: 'spring', stiffness: 400, damping: 30 }}
      whileTap={{ scale: 0.97 }}
      layout
    >
      <div className={`p-3 ${isVenueMode ? 'flex items-center gap-3' : ''}`}>
        {/* Avatar */}
        <div
          className={`rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
            isVenueMode ? 'w-11 h-11' : 'w-14 h-14 mx-auto mb-2'
          }`}
          style={{
            background: 'rgba(200,150,44,0.08)',
            border: '1px solid rgba(200,150,44,0.12)',
          }}
        >
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Users className={`${isVenueMode ? 'w-5 h-5' : 'w-6 h-6'}`} style={{ color: `${AMBER}40` }} />
          )}
        </div>

        <div className={isVenueMode ? 'flex-1 min-w-0' : 'text-center'}>
          {/* Context label */}
          <p className="text-white/30 text-[10px] font-medium tracking-wide uppercase">
            {user.context_label}
          </p>

          {/* Distance */}
          {user.distance_m !== null && (
            <p className="text-white/50 text-[11px] font-medium mt-0.5">
              {user.distance_m < 100 ? 'Very close' : `${user.distance_m}m away`}
            </p>
          )}

          {/* Verified badge */}
          {user.is_verified && (
            <div className="flex items-center gap-1 mt-0.5">
              <Shield className="w-2.5 h-2.5" style={{ color: AMBER }} />
              <span className="text-[9px] font-semibold" style={{ color: `${AMBER}80` }}>Verified</span>
            </div>
          )}

          {/* Live vibe chip */}
          {user.vibe && (
            <div className="mt-1">
              <VibeChip vibe={user.vibe as Vibe} />
            </div>
          )}
        </div>
      </div>

      {/* Expanded state: reveal + message CTAs */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="px-3 pb-3 flex gap-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.12 }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onReveal(); }}
              className="flex-1 h-9 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase active:scale-[0.97] transition-transform"
              style={{ background: 'rgba(200,150,44,0.12)', color: AMBER, border: '1px solid rgba(200,150,44,0.2)' }}
            >
              Reveal
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onMessage(); }}
              className="flex-1 h-9 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase active:scale-[0.97] transition-transform"
              style={{ background: AMBER, color: '#000' }}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Message
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getAreaFromContext(ctx: GhostedContext): string {
  // Known London areas
  const areas: [string, number, number][] = [
    ['Soho', 51.5137, -0.1337],
    ['Vauxhall', 51.4861, -0.1228],
    ['Shoreditch', 51.5244, -0.0784],
    ['Dalston', 51.5465, -0.0755],
    ['Camden', 51.5391, -0.1426],
    ['Brixton', 51.4613, -0.1156],
    ['Kings Cross', 51.5308, -0.1238],
  ];

  let closest = 'here';
  let minDist = Infinity;
  for (const [name, lat, lng] of areas) {
    const d = Math.sqrt((ctx.lat - lat) ** 2 + (ctx.lng - lng) ** 2);
    if (d < minDist) {
      minDist = d;
      closest = name;
    }
  }
  return minDist < 0.02 ? closest : 'here';
}
