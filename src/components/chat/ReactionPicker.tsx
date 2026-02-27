/**
 * ReactionPicker — Emoji reaction bar for messages
 *
 * HOTMESS styled reaction picker with 6 emoji options.
 * Appears on long-press of a message bubble.
 */

import { motion } from 'framer-motion';

export const EMOJI_REACTIONS = ['❤️', '😂', '👍', '🔥', '😮', '😢'] as const;

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  currentReaction?: string;
}

export function ReactionPicker({ onSelect, onClose, currentReaction }: ReactionPickerProps) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Picker */}
      <motion.div
        className="absolute bottom-full left-0 mb-2 flex items-center gap-1 px-2 py-1.5 rounded-full bg-[#1C1C1E] border border-white/10 shadow-xl z-50"
        initial={{ scale: 0.5, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.5, opacity: 0, y: 10 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        {EMOJI_REACTIONS.map((emoji) => (
          <motion.button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className={`w-9 h-9 flex items-center justify-center rounded-full text-xl transition-colors ${
              currentReaction === emoji
                ? 'bg-[#C8962C]/20 ring-2 ring-[#C8962C]'
                : 'hover:bg-white/10'
            }`}
            whileTap={{ scale: 0.9 }}
            aria-label={`React with ${emoji}`}
          >
            {emoji}
          </motion.button>
        ))}
      </motion.div>
    </>
  );
}

export default ReactionPicker;
