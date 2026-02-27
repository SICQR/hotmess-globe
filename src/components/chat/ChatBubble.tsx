import React, { useState } from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { ReactionPicker, EMOJI_REACTIONS } from './ReactionPicker';
import { useLongPress } from '@/features/profilesGrid/useLongPress';

type Props = {
  content: string;
  timestamp: string;
  isMe: boolean;
  isRead?: boolean;
  senderName?: string;
  senderAvatar?: string;
  reactions?: Record<string, string>; // userId -> emoji
  currentUserId?: string;
  onReact?: (emoji: string) => void;
  onRemoveReaction?: () => void;
};

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  if (isToday) return time;
  if (isYesterday) return `Yesterday ${time}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

export function ChatBubble({ 
  content, 
  timestamp, 
  isMe, 
  isRead, 
  senderName, 
  senderAvatar,
  reactions,
  currentUserId,
  onReact,
  onRemoveReaction,
}: Props) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  
  // Get my current reaction (if any)
  const myReaction = currentUserId && reactions ? reactions[currentUserId] : undefined;
  
  // Count reactions by emoji
  const reactionCounts = reactions
    ? Object.values(reactions).reduce((acc, emoji) => {
        acc[emoji] = (acc[emoji] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    : {};
  
  const hasReactions = Object.keys(reactionCounts).length > 0;
  
  // Long-press handler for reaction picker
  const { isLongPressActive, handlers: longPressHandlers } = useLongPress({
    delayMs: 400,
  });
  
  // Open picker when long press activates
  React.useEffect(() => {
    if (isLongPressActive && onReact) {
      setShowReactionPicker(true);
    }
  }, [isLongPressActive, onReact]);
  
  const handleReact = (emoji: string) => {
    if (emoji === myReaction) {
      onRemoveReaction?.();
    } else {
      onReact?.(emoji);
    }
    setShowReactionPicker(false);
  };

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2 relative`}>
      {!isMe && senderAvatar && (
        <img 
          src={senderAvatar} 
          alt={senderName || ''} 
          className="w-8 h-8 rounded-full mr-2 object-cover shrink-0"
        />
      )}
      
      <div className={`max-w-[75%] ${isMe ? 'order-1' : ''} relative`}>
        {!isMe && senderName && (
          <p className="text-xs text-white/50 mb-0.5 ml-1">{senderName}</p>
        )}
        
        <div
          {...longPressHandlers}
          className={`px-4 py-2.5 rounded-2xl cursor-pointer select-none ${
            isMe
              ? 'bg-[#C8962C] text-white rounded-br-sm'
              : 'bg-[#1C1C1E] text-white rounded-bl-sm'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        </div>
        
        {/* Reaction badges */}
        {hasReactions && (
          <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <span
                key={emoji}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/10 text-xs"
              >
                <span>{emoji}</span>
                {count > 1 && <span className="text-white/60">{count}</span>}
              </span>
            ))}
          </div>
        )}

        <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] text-white/40">{formatTime(timestamp)}</span>
          {isMe && (
            isRead
              ? <CheckCheck className="w-3 h-3 text-white/70" />
              : <Check className="w-3 h-3 text-white/40" />
          )}
        </div>
        
        {/* Reaction picker (appears on long-press) */}
        <AnimatePresence>
          {showReactionPicker && onReact && (
            <ReactionPicker
              onSelect={handleReact}
              onClose={() => setShowReactionPicker(false)}
              currentReaction={myReaction}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ChatBubble;
