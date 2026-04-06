/**
 * GhostedMode V3 — Proximity Grid (/ghosted)
 *
 * Full rewrite. Three tabs: Nearby | Live | Chats.
 * Clean grid, no stacked filters, compact hero banner.
 *
 * Layout:
 * ┌─────────────────────────────────────────┐
 * │  GHOSTED    [Nearby] [Live] [Chats]  ⚙  │  sticky glassmorphic header
 * ├─────────────────────────────────────────┤
 * │  ┌─ Hero Banner (64px) ──────────────┐  │  brand + play btn
 * │  └──────────────────────────────────────┘│
 * │  [Nearby] [Online] [New] [Looking] ...  │  single-row filter chips
 * ├─────────────────────────────────────────┤
 * │  ┌────┐┌────┐┌────┐                    │  3-col grid, GhostedCard
 * │  │ P1 ││ P2 ││ P3 │                    │  tap → ghosted-preview sheet
 * │  └────┘└────┘└────┘                    │
 * │       ... infinite scroll              │
 * │                                         │
 * │       [Share your vibe →]               │  FAB above nav
 * └─────────────────────────────────────────┘
 *
 * Data: useGhostedGrid hook (TanStack Query + Supabase)
 * Auth: supabase.auth.getSession() — no base44
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, Ghost, ArrowRight, MessageCircle, Music, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useSheet } from '@/contexts/SheetContext';
import { supabase } from '@/components/utils/supabaseClient';
import { useRadio } from '@/contexts/RadioContext';
import { useGPS } from '@/hooks/useGPS';
import { useGhostedGrid, type GhostedTab, type ChatThreadItem } from '@/hooks/useGhostedGrid';
import { GhostedCard, type GhostedCardProps } from '@/components/ghosted/GhostedCard';
import { GhostedHeroBanner } from '@/components/ghosted/GhostedHeroBanner';
import { useTaps } from '@/hooks/useTaps';

// ── Brand constants ──────────────────────────────────────────────────────────
const AMBER = '#C8962C';

// ── Tab definitions ──────────────────────────────────────────────────────────
const TABS: { key: GhostedTab; label: string }[] = [
  { key: 'nearby', label: 'Nearby' },
  { key: 'live', label: 'Live' },
  { key: 'chats', label: 'Chats' },
];

// ── Filter chip definitions ──────────────────────────────────────────────────
type ChipKey = 'nearby' | 'online' | 'new' | 'looking' | 'hang' | 'tonight';
const FILTER_CHIPS: { key: ChipKey; label: string }[] = [
  { key: 'nearby', label: 'Nearby' },
  { key: 'online', label: 'Online' },
  { key: 'new', label: 'New' },
  { key: 'looking', label: 'Looking' },
  { key: 'hang', label: 'Hang' },
  { key: 'tonight', label: 'Tonight' },
];

// ── Skeleton grid ────────────────────────────────────────────────────────────
function GhostedSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-1 px-1">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={`skel-${i}`}
          className="aspect-[4/5] rounded-xl bg-white/[0.03] animate-pulse"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.04 }}
        />
      ))}
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────
function GhostedEmpty({ tab }: { tab: GhostedTab }) {
  const messages: Record<GhostedTab, { icon: string; title: string; subtitle: string }> = {
    nearby: {
      icon: '👻',
      title: 'Nobody nearby yet',
      subtitle: 'HOTMESS is growing in your area. Check back later or go live.',
    },
    live: {
      icon: '✨',
      title: 'Nobody live right now',
      subtitle: 'Be the first to share your vibe tonight.',
    },
    chats: {
      icon: '💬',
      title: 'No conversations yet',
      subtitle: 'Boo someone on the grid to start a chat.',
    },
  };

  const msg = messages[tab];

  return (
    <motion.div
      className="flex flex-col items-center justify-center py-20 text-center px-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <span className="text-5xl mb-4">{msg.icon}</span>
      <h2 className="text-lg font-black text-white mb-2">{msg.title}</h2>
      <p className="text-sm text-[#8E8E93] max-w-[260px]">{msg.subtitle}</p>
    </motion.div>
  );
}

// ── Error state ──────────────────────────────────────────────────────────────
function GhostedError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-20 text-center px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Ghost className="w-12 h-12 text-[#FF3B30] mb-4" />
      <h2 className="text-lg font-bold text-white mb-2">Something went wrong</h2>
      <p className="text-sm text-[#8E8E93] mb-6">{message}</p>
      <button
        onClick={onRetry}
        className="h-10 px-6 rounded-xl bg-[#C8962C] text-white font-semibold text-sm active:scale-95 transition-transform"
      >
        Retry
      </button>
    </motion.div>
  );
}

// ── Chat thread row ──────────────────────────────────────────────────────────
function ChatThreadRow({
  thread,
  onTap,
}: {
  thread: ChatThreadItem;
  onTap: (thread: ChatThreadItem) => void;
}) {
  return (
    <motion.button
      className="w-full flex items-center gap-3 px-4 py-3 active:bg-white/5 transition-colors"
      onClick={() => onTap(thread)}
      whileTap={{ scale: 0.98 }}
      aria-label={`Chat with ${thread.participantName}`}
    >
      {/* Avatar */}
      <div className="relative w-12 h-12 rounded-full bg-white/5 overflow-hidden flex-shrink-0">
        {thread.participantAvatar ? (
          <img
            src={thread.participantAvatar}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white/20">
            {thread.participantName.charAt(0).toUpperCase()}
          </div>
        )}
        {thread.isOnline && (
          <span
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#050507]"
            style={{ backgroundColor: '#30D158' }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-sm font-bold text-white truncate">
            {thread.participantName}
          </span>
          {thread.lastMessageAt && (
            <span className="text-[10px] text-white/30 flex-shrink-0 ml-2">
              {formatChatTime(thread.lastMessageAt)}
            </span>
          )}
        </div>
        <p className="text-xs text-white/40 truncate">
          {thread.lastMessage || 'No messages yet'}
        </p>
      </div>

      {/* Unread badge */}
      {thread.unreadCount > 0 && (
        <span
          className="min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-black text-black flex-shrink-0"
          style={{ backgroundColor: AMBER }}
        >
          {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
        </span>
      )}
    </motion.button>
  );
}

function formatChatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

// ── Main Component ───────────────────────────────────────────────────────────

interface GhostedModeProps {
  className?: string;
}

export function GhostedMode({ className = '' }: GhostedModeProps) {
  const navigate = useNavigate();
  const { openSheet } = useSheet();
  const { isPlaying, currentShowName } = useRadio();
  const { position: myPosition } = useGPS();

  // ── Auth email for boo state ────────────────────────────────────────────
  const [myEmail, setMyEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setMyEmail(session?.user?.email ?? null);
    });
  }, []);
  const { isTapped, isMutualBoo } = useTaps(myEmail);

  // ── Tab state ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<GhostedTab>('nearby');
  const [activeChip, setActiveChip] = useState<ChipKey | null>(null);

  // ── Data ─────────────────────────────────────────────────────────────────
  const { cards, chatThreads, isLoading, error, refetch } = useGhostedGrid(
    activeTab,
    myPosition?.lat ?? null,
    myPosition?.lng ?? null,
    activeChip,
  );

  // ── FAB scroll-hide ──────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fabVisible, setFabVisible] = useState(true);
  const lastScrollTop = useRef(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const currentScrollTop = el.scrollTop;
    setFabVisible(!(currentScrollTop > lastScrollTop.current && currentScrollTop > 60));
    lastScrollTop.current = currentScrollTop;
  }, []);

  // ── Card tap → preview sheet ─────────────────────────────────────────────
  const handleCardTap = useCallback(
    (id: string) => {
      openSheet('ghosted-preview', { uid: id });
    },
    [openSheet],
  );

  // ── Chat thread tap ──────────────────────────────────────────────────────
  const handleChatTap = useCallback(
    (thread: ChatThreadItem) => {
      openSheet('chat', {
        thread: thread.id,
        userId: thread.participantId,
        title: `Chat with ${thread.participantName}`,
      });
    },
    [openSheet],
  );

  // ── Unread count for chats tab badge ─────────────────────────────────────
  const totalUnread = useMemo(
    () => chatThreads.reduce((sum, t) => sum + t.unreadCount, 0),
    [chatThreads],
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className={`h-full w-full flex flex-col ${className}`}
      style={{ background: '#050507' }}
    >
      {/* ═══ STICKY HEADER ═══ */}
      <div
        className="sticky top-0 z-30 border-b border-white/5"
        style={{
          background: 'rgba(5,5,7,0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <div className="px-4 pt-[env(safe-area-inset-top)]">
          {/* Top row: wordmark + tabs + filter */}
          <div className="flex items-center justify-between h-12">
            {/* Wordmark */}
            <h1
              className="font-black text-sm tracking-[0.2em] uppercase"
              style={{ color: AMBER }}
            >
              GHOSTED
            </h1>

            {/* Segmented tabs */}
            <div className="flex items-center bg-white/5 rounded-full p-0.5">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key);
                      setActiveChip(null);
                    }}
                    className={`relative h-8 px-4 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                      isActive
                        ? 'text-black'
                        : 'text-white/50'
                    }`}
                    style={isActive ? { backgroundColor: AMBER } : undefined}
                    aria-label={`Show ${tab.label}`}
                    aria-pressed={isActive}
                  >
                    {tab.label}
                    {/* Unread badge on Chats tab */}
                    {tab.key === 'chats' && totalUnread > 0 && !isActive && (
                      <span
                        className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 flex items-center justify-center rounded-full text-black text-[8px] font-black"
                        style={{ backgroundColor: AMBER }}
                      >
                        {totalUnread > 9 ? '9+' : totalUnread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Filter icon (Nearby/Live only) */}
            {activeTab !== 'chats' && (
              <button
                data-testid="ghosted-filter-btn"
                onClick={() => openSheet('filters')}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 active:scale-95 transition-transform"
                aria-label="Open filters"
              >
                <SlidersHorizontal className="w-4 h-4 text-white/60" />
              </button>
            )}

            {/* Spacer for chats tab so layout doesn't shift */}
            {activeTab === 'chats' && <div className="w-9" />}
          </div>

          {/* Filter chips (Nearby tab only) */}
          {activeTab === 'nearby' && (
            <div className="flex gap-1.5 pb-2 pt-1 overflow-x-auto scrollbar-hide -mx-4 px-4">
              {FILTER_CHIPS.map((chip) => {
                const isActive = activeChip === chip.key;
                return (
                  <button
                    key={chip.key}
                    onClick={() => setActiveChip(isActive ? null : chip.key)}
                    className={`flex-shrink-0 h-8 px-4 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                      isActive
                        ? 'text-black border border-transparent'
                        : 'text-white/40 border border-white/5'
                    }`}
                    style={isActive ? { backgroundColor: AMBER } : { backgroundColor: 'rgba(255,255,255,0.03)' }}
                    aria-pressed={isActive}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ SCROLLABLE CONTENT ═══ */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scroll-momentum pb-24 relative z-10"
        onScroll={handleScroll}
      >
        {/* Now Playing strip — display-only, links to /radio */}
        {isPlaying && (
          <button
            onClick={() => navigate('/radio')}
            className="w-full border-b border-white/5 active:opacity-80 transition-opacity"
            style={{ backgroundColor: '#1C1C1E' }}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-[#C8962C]/15 flex items-center justify-center flex-shrink-0">
                <Music className="w-4 h-4 text-[#C8962C]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">On Air</p>
                <p className="text-sm text-white/80 font-bold truncate">{currentShowName || 'HOTMESS Radio'}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
            </div>
          </button>
        )}

        {/* Hero banner (Nearby + Live tabs only) */}
        {activeTab !== 'chats' && <GhostedHeroBanner />}

        {/* Loading state */}
        {isLoading && <GhostedSkeleton />}

        {/* Error state */}
        {!isLoading && error && (
          <GhostedError message={error} onRetry={refetch} />
        )}

        {/* Empty state */}
        {!isLoading && !error && activeTab !== 'chats' && cards.length === 0 && (
          <GhostedEmpty tab={activeTab} />
        )}
        {!isLoading && !error && activeTab === 'chats' && chatThreads.length === 0 && (
          <GhostedEmpty tab="chats" />
        )}

        {/* ═══ GRID (Nearby + Live tabs) ═══ */}
        {!isLoading && !error && activeTab !== 'chats' && cards.length > 0 && (
          <div className="grid grid-cols-3 gap-1 px-1 pt-1">
            {cards.map((card, i) => (
              <GhostedCard
                key={card.id}
                {...card}
                isBood={card.email ? isTapped(card.email, 'boo') : false}
                isMutual={card.email ? isMutualBoo(card.email) : false}
                index={i}
                onTap={handleCardTap}
              />
            ))}
          </div>
        )}

        {/* ═══ CHAT LIST (Chats tab) ═══ */}
        {!isLoading && !error && activeTab === 'chats' && chatThreads.length > 0 && (
          <div className="divide-y divide-white/5">
            {chatThreads.map((thread) => (
              <ChatThreadRow
                key={thread.id}
                thread={thread}
                onTap={handleChatTap}
              />
            ))}
          </div>
        )}
      </div>

      {/* ═══ "SHARE YOUR VIBE" FAB ═══ */}
      <AnimatePresence>
        {fabVisible && activeTab !== 'chats' && (
          <motion.div
            className="fixed z-20 left-1/2 -translate-x-1/2"
            style={{ bottom: 'calc(90px + env(safe-area-inset-bottom, 0px))' }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <button
              onClick={() => openSheet('social', {})}
              className="h-12 px-6 rounded-full flex items-center gap-2 font-bold text-sm text-black shadow-lg active:scale-95 transition-transform"
              style={{
                backgroundColor: AMBER,
                boxShadow: '0 8px 32px rgba(200,150,44,0.35)',
              }}
              aria-label="Share your vibe right now"
            >
              Share your vibe
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default GhostedMode;
