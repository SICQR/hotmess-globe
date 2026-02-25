/**
 * Typing Indicator Component
 * 
 * Real-time typing indicators using Supabase presence
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/components/utils/supabaseClient';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPING INDICATOR DISPLAY
// =============================================================================

export function TypingIndicator({ 
  typingUsers = [], 
  className 
}) {
  if (typingUsers.length === 0) return null;

  const text = typingUsers.length === 1
    ? `${typingUsers[0]} is typing`
    : typingUsers.length === 2
    ? `${typingUsers[0]} and ${typingUsers[1]} are typing`
    : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className={cn("flex items-center gap-2 text-sm text-white/60", className)}
      >
        {/* Animated dots */}
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 bg-[#C8962C] rounded-full"
              animate={{
                y: [0, -4, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
        <span>{text}</span>
      </motion.div>
    </AnimatePresence>
  );
}

// =============================================================================
// TYPING PRESENCE HOOK
// =============================================================================

/**
 * Hook to manage typing state and broadcast to other users
 * 
 * @param {string} channelName - Unique channel name (e.g., thread ID)
 * @param {string} userId - Current user ID
 * @param {string} userName - Current user display name
 * @returns {{ isTyping: boolean, startTyping: () => void, stopTyping: () => void, typingUsers: string[] }}
 */
export function useTypingPresence(channelName, userId, userName) {
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const channelRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const TYPING_TIMEOUT = 3000; // Stop showing after 3 seconds of no activity

  // Set up presence channel
  useEffect(() => {
    if (!channelName || !userId) return;

    // Create presence channel
    channelRef.current = supabase.channel(`typing:${channelName}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // Handle presence sync
    channelRef.current
      .on('presence', { event: 'sync' }, () => {
        const state = channelRef.current.presenceState();
        const users = [];
        
        for (const [key, presences] of Object.entries(state)) {
          if (key !== userId) {
            presences.forEach(presence => {
              if (presence.typing && presence.name) {
                users.push(presence.name);
              }
            });
          }
        }
        
        setTypingUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Someone started typing
        if (key !== userId) {
          newPresences.forEach(presence => {
            if (presence.typing && presence.name) {
              setTypingUsers(prev => 
                prev.includes(presence.name) ? prev : [...prev, presence.name]
              );
            }
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // Someone stopped typing
        if (key !== userId) {
          leftPresences.forEach(presence => {
            if (presence.name) {
              setTypingUsers(prev => prev.filter(name => name !== presence.name));
            }
          });
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track our presence (not typing initially)
          await channelRef.current.track({
            user_id: userId,
            name: userName,
            typing: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [channelName, userId, userName]);

  // Start typing
  const startTyping = useCallback(() => {
    if (!channelRef.current) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Update presence if not already typing
    if (!isTyping) {
      setIsTyping(true);
      channelRef.current.track({
        user_id: userId,
        name: userName,
        typing: true,
        online_at: new Date().toISOString(),
      });
    }

    // Auto-stop after timeout
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, TYPING_TIMEOUT);
  }, [isTyping, userId, userName]);

  // Stop typing
  const stopTyping = useCallback(() => {
    if (!channelRef.current) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setIsTyping(false);
    channelRef.current.track({
      user_id: userId,
      name: userName,
      typing: false,
      online_at: new Date().toISOString(),
    });
  }, [userId, userName]);

  return {
    isTyping,
    startTyping,
    stopTyping,
    typingUsers,
  };
}

// =============================================================================
// TYPING INPUT WRAPPER
// =============================================================================

/**
 * Wrapper component that automatically tracks typing in an input
 */
export function TypingAwareInput({
  channelName,
  userId,
  userName,
  children,
  onTypingChange,
  className
}) {
  const { startTyping, stopTyping, typingUsers } = useTypingPresence(
    channelName,
    userId,
    userName
  );

  // Notify parent of typing users
  useEffect(() => {
    onTypingChange?.(typingUsers);
  }, [typingUsers, onTypingChange]);

  const handleKeyDown = () => {
    startTyping();
  };

  const handleBlur = () => {
    stopTyping();
  };

  return (
    <div 
      className={className}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      {children}
      {typingUsers.length > 0 && (
        <TypingIndicator typingUsers={typingUsers} className="mt-2 px-2" />
      )}
    </div>
  );
}

// =============================================================================
// SIMPLE TYPING DOTS (standalone animation)
// =============================================================================

export function TypingDots({ className, color = '#C8962C' }) {
  return (
    <div className={cn("flex gap-1 items-center", className)}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
          animate={{
            y: [0, -4, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// MESSAGE BUBBLE WITH TYPING
// =============================================================================

export function TypingBubble({ userName, className }) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
        {userName?.[0] || '?'}
      </div>
      <div className="px-4 py-3 bg-white/10 rounded-2xl rounded-tl-none">
        <TypingDots />
      </div>
    </div>
  );
}

export default TypingIndicator;
