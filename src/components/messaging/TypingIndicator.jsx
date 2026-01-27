import React from 'react';
import { motion } from 'framer-motion';

/**
 * Typing indicator component showing animated dots
 */
export default function TypingIndicator({ typingUsers, allUsers }) {
  if (Object.keys(typingUsers).length === 0) return null;

  const typingUserName = Object.keys(typingUsers).length === 1
    ? allUsers.find(u => u.email === Object.keys(typingUsers)[0])?.full_name?.split(' ')[0] || 'Someone'
    : `${Object.keys(typingUsers).length} people`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex justify-start"
    >
      <div className="flex gap-3 items-center">
        <div className="w-8 h-8 bg-gradient-to-br from-[#E62020] to-[#B026FF] flex items-center justify-center flex-shrink-0 border-2 border-white">
          <span className="text-xs font-bold">...</span>
        </div>
        <div className="bg-black border-2 border-white px-4 py-2.5">
          <div className="flex gap-1 items-center">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="ml-2 text-xs text-white/60 font-mono uppercase">
              {typingUserName} typing
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
