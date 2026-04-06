/**
 * MatchOverlay — Celebratory overlay when a mutual Boo is detected
 *
 * Dark full-screen overlay with gold accent. Shows both users' avatars,
 * "It's a match" text, and a "Message" CTA. Dismisses on tap outside
 * or after timeout.
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ghost, MessageCircle, X } from 'lucide-react';

const GOLD = '#C8962C';

interface MatchOverlayProps {
  visible: boolean;
  myAvatarUrl: string | null;
  theirAvatarUrl: string | null;
  theirName: string;
  onMessage: () => void;
  onDismiss: () => void;
}

export function MatchOverlay({
  visible,
  myAvatarUrl,
  theirAvatarUrl,
  theirName,
  onMessage,
  onDismiss,
}: MatchOverlayProps) {
  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

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
              It's a match
            </h2>
            <p className="text-sm text-white/50">
              You and {theirName} both boo'd each other
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
            Send a message
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
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: '#1C1C1E' }}
        >
          <span className="text-xl font-black text-white/20">
            {label.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}

export default MatchOverlay;
