/**
 * L2ChatSheet — Messages as a sheet overlay
 * 
 * Replaces: /social/inbox page navigation
 * TODO: Extract from Messages.jsx + ChatThread.jsx
 */

import React from 'react';
import { MessageCircle } from 'lucide-react';
import { SheetSection } from './L2SheetContainer';

export default function L2ChatSheet({ thread }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center px-4">
      <MessageCircle className="w-12 h-12 text-white/20 mb-4" />
      <p className="text-white/60 mb-2">Chat Sheet</p>
      <p className="text-white/40 text-sm">
        {thread ? `Thread: ${thread}` : 'Messages coming soon...'}
      </p>
    </div>
  );
}
