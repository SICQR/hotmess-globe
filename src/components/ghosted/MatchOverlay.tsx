/**
 * MatchOverlay — Celebratory overlay when a mutual Boo is detected
 *
 * Dark full-screen overlay with gold accent. Shows both users' avatars,
 * "It's a match" text, and a "Message" CTA. Dismisses on tap outside
 * or after timeout.
 *
 * Chunk 19 (B5): Silent prefetch of chat thread + Wingman at 1.2s while
 * overlay is visible. When user taps "Send a Message" the composer is
 * already loaded with starters. Spec: HOTMESS-Chat-Messaging-SEALED.docx §2.
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ghost, MessageCircle, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';

const GOLD = '#C8962C';

interface MatchOverlayProps {
  visible: boolean;
  myAvatarUrl: string | null;
  theirAvatarUrl: string | null;
  theirName: string;
  theirId: string;
  onMessage: () => void;
  onDismiss: () => void;
}

/**
 * silentPrefetchChat — Loads the chat thread + Wingman suggestions into
 * React Query cache so the composer is ready before the user taps.
 * Fire-and-forget. Never throws.
 */
async function silentPrefetchChat(theirId: string, queryClient: ReturnType<typeof useQueryClient>) {
  try {
    // 1. Prime thread messages into cache
    queryClient.prefetchQuery({
      queryKey: ['chat-thread', theirId],
      queryFn:  () =>
        supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${theirId},receiver_id.eq.${theirId}`)
          .order('created_at', { ascending: false })
          .limit(20)
          .then(({ data }) => data ?? []),
      staleTime: 30_000,
    });

    // 2. Prime Wingman suggestions into cache
    queryClient.prefetchQuery({
      queryKey: ['wingman', theirId],
      queryFn:  () =>
        fetch('/api/ai/wingman', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ targetUserId: theirId, messageCount: 0 }),
        }).then(r => r.ok ? r.json() : null),
      staleTime: 60_000,
    });
  } catch { /* silent — never block the overlay */ }
}

export function MatchOverlay({
  visible,
  myAvatarUrl,
  theirAvatarUrl,
  theirName,
  theirId,
  onMessage,
  onDismiss,
}: MatchOverlayProps) {
  const queryClient  = useQueryClient();
  const prefetchedRef = useRef(false);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  // Chunk 19 (B5): Silent prefetch at 1.2s — spec §2
  useEffect(() => {
    if (!visible || !theirId || prefetchedRef.current) return;
    const timer = setTimeout(() => {
      prefetchedRef.current = true;
      silentPrefetchChat(theirId, queryClient);
    }, 1200);
    return () => clearTimeout(timer);
  }, [visible, theirId, queryClient]);

  // Reset prefetch flag when overlay closes
  useEffect(() => {
    if (!visible) prefetchedRef.current = false;
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ background: 'rgba(5,5,7,0.92)', backdropFilter: 'blur(24px)' }}
          onClick={onDismiss}
        >
          {/* Close */}
          <button
            onClick={onDismiss}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white/50" />
          </button>

          {/* Avatars */}
          <motion.div
            className="flex items-center gap-4 mb-8"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring', damping: 15 }}
          >
            <Avatar url={myAvatarUrl} label="You" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', damping: 12 }}
            >
              <Ghost className="w-8 h-8" style={{ color: GOLD }} />
            </motion.div>
            <Avatar url={theirAvatarUrl} label={theirName} />
          </motion.div>

          {/* Text */}
          <motion.div
            className="text-center mb-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">
              IT'S A MATCH
            </h2>
            <p className="text-[11px] font-black text-white/50 uppercase tracking-[0.2em]">
              YOU AND {theirName.toUpperCase()} BOTH BOO'D EACH OTHER
            </p>
          </motion.div>

          {/* CTA */}
          <motion.button
            className="h-14 px-10 rounded-2xl font-black text-sm uppercase tracking-wider text-black flex items-center gap-2 active:scale-95 transition-transform"
            style={{ backgroundColor: GOLD, boxShadow: `0 8px 32px ${GOLD}40` }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={(e) => {
              e.stopPropagation();
              onMessage();
            }}
          >
            <MessageCircle className="w-5 h-5" />
            SEND A MESSAGE
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Avatar({ url, label }: { url: string | null; label: string }) {
  return (
    <div
      className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0"
      style={{ border: `3px solid ${GOLD}` }}
    >
      {url ? (
        <img src={url} alt={label} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-white/10 flex items-center justify-center">
          <Ghost className="w-8 h-8 text-white/30" />
        </div>
      )}
    </div>
  );
}
