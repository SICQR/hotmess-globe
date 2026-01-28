import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// Default reaction emojis
const DEFAULT_REACTIONS = ['❤️', '👍', '🔥', '😂', '😮', '😢', '👏', '🙌'];

// Quick reactions (shown by default)
const QUICK_REACTIONS = ['❤️', '👍', '🔥', '😂'];

// Reaction with count display
function ReactionBadge({ emoji, count, isOwn, onClick, className }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onClick?.(emoji)}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors",
        isOwn 
          ? "bg-[#FF1493]/20 border border-[#FF1493]/50" 
          : "bg-white/10 border border-white/10 hover:bg-white/20",
        className
      )}
    >
      <span className="text-base">{emoji}</span>
      {count > 1 && (
        <span className="text-xs font-bold text-white/80">{count}</span>
      )}
    </motion.button>
  );
}

// Reaction picker popup
function ReactionPicker({ 
  onSelect, 
  onClose, 
  reactions = DEFAULT_REACTIONS,
  className 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      className={cn(
        "absolute z-50 bg-black border-2 border-white p-2 shadow-xl",
        className
      )}
    >
      <div className="flex flex-wrap gap-1 max-w-[200px]">
        {reactions.map((emoji) => (
          <motion.button
            key={emoji}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center text-xl hover:bg-white/10 rounded transition-colors"
          >
            {emoji}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// Quick reaction bar that appears on hover
function QuickReactionBar({ onSelect, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      className={cn(
        "absolute flex items-center gap-1 bg-black/90 border border-white/20 rounded-full px-2 py-1 shadow-lg",
        className
      )}
    >
      {QUICK_REACTIONS.map((emoji) => (
        <motion.button
          key={emoji}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onSelect(emoji)}
          className="w-6 h-6 flex items-center justify-center text-base hover:bg-white/10 rounded-full transition-colors"
        >
          {emoji}
        </motion.button>
      ))}
    </motion.div>
  );
}

// Main message reactions component
export default function MessageReactions({
  messageId,
  reactions = [], // Array of { emoji, userId, userName }
  currentUserId,
  onReactionAdd,
  onReactionRemove,
  position = 'bottom', // 'top', 'bottom', 'left', 'right'
  showQuickBar = true,
  className,
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showQuickReactions, setShowQuickReactions] = useState(false);

  // Group reactions by emoji and count
  const groupedReactions = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) {
      acc[r.emoji] = { count: 0, users: [], hasOwn: false };
    }
    acc[r.emoji].count++;
    acc[r.emoji].users.push(r.userName || r.userId);
    if (r.userId === currentUserId) {
      acc[r.emoji].hasOwn = true;
    }
    return acc;
  }, {});

  const handleReactionClick = useCallback((emoji) => {
    const group = groupedReactions[emoji];
    if (group?.hasOwn) {
      // User already reacted with this emoji, remove it
      onReactionRemove?.(messageId, emoji);
    } else {
      // Add reaction
      onReactionAdd?.(messageId, emoji);
    }
  }, [messageId, groupedReactions, onReactionAdd, onReactionRemove]);

  const handleQuickReaction = useCallback((emoji) => {
    onReactionAdd?.(messageId, emoji);
    setShowQuickReactions(false);
  }, [messageId, onReactionAdd]);

  const positionClasses = {
    top: 'bottom-full mb-1',
    bottom: 'top-full mt-1',
    left: 'right-full mr-1',
    right: 'left-full ml-1',
  };

  return (
    <div 
      className={cn("relative inline-flex flex-wrap gap-1", className)}
      onMouseEnter={() => showQuickBar && setShowQuickReactions(true)}
      onMouseLeave={() => {
        setShowQuickReactions(false);
        if (!showPicker) setShowPicker(false);
      }}
    >
      {/* Existing reactions */}
      {Object.entries(groupedReactions).map(([emoji, data]) => (
        <ReactionBadge
          key={emoji}
          emoji={emoji}
          count={data.count}
          isOwn={data.hasOwn}
          onClick={handleReactionClick}
        />
      ))}

      {/* Add reaction button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowPicker(!showPicker)}
        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
      >
        <Plus className="w-4 h-4 text-white/60" />
      </motion.button>

      {/* Quick reaction bar */}
      <AnimatePresence>
        {showQuickBar && showQuickReactions && !showPicker && (
          <QuickReactionBar 
            onSelect={handleQuickReaction}
            className={positionClasses[position]}
          />
        )}
      </AnimatePresence>

      {/* Full reaction picker */}
      <AnimatePresence>
        {showPicker && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowPicker(false)} 
            />
            <ReactionPicker
              onSelect={handleQuickReaction}
              onClose={() => setShowPicker(false)}
              className={positionClasses[position]}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Animated reaction popup (for when someone else reacts)
export function ReactionPopup({ emoji, userName, onComplete }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.5 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.5 }}
      onAnimationComplete={onComplete}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-black border-2 border-white px-4 py-2 rounded-full shadow-lg"
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{emoji}</span>
        <span className="text-sm text-white/80">
          <span className="font-bold">{userName}</span> reacted
        </span>
      </div>
    </motion.div>
  );
}

// Hook for managing reactions
export function useMessageReactions(initialReactions = []) {
  const [reactions, setReactions] = useState(initialReactions);
  const [reactionPopup, setReactionPopup] = useState(null);

  const addReaction = useCallback((messageId, emoji, userId, userName) => {
    setReactions(prev => [
      ...prev.filter(r => !(r.messageId === messageId && r.userId === userId && r.emoji === emoji)),
      { messageId, emoji, userId, userName, timestamp: new Date().toISOString() }
    ]);
    
    // Show popup for other users' reactions
    if (userId !== 'current-user') {
      setReactionPopup({ emoji, userName });
      setTimeout(() => setReactionPopup(null), 2000);
    }
  }, []);

  const removeReaction = useCallback((messageId, emoji, userId) => {
    setReactions(prev => 
      prev.filter(r => !(r.messageId === messageId && r.userId === userId && r.emoji === emoji))
    );
  }, []);

  const getMessageReactions = useCallback((messageId) => {
    return reactions.filter(r => r.messageId === messageId);
  }, [reactions]);

  return {
    reactions,
    addReaction,
    removeReaction,
    getMessageReactions,
    reactionPopup,
    clearPopup: () => setReactionPopup(null),
  };
}
