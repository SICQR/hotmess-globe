/**
 * L2GhostedSheet — Social / Right Now as a sheet overlay
 * 
 * Replaces: /social page navigation
 * Unifies: RightNowModal, RightNowGrid, RightNowManager
 */

import React from 'react';
import { Users, Zap } from 'lucide-react';
import { SheetSection } from './L2SheetContainer';

export default function L2GhostedSheet() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center px-4">
      <div className="relative mb-4">
        <Users className="w-12 h-12 text-white/20" />
        <Zap className="w-6 h-6 text-[#39FF14] absolute -top-1 -right-1" />
      </div>
      <p className="text-white/60 mb-2">Ghosted / Right Now</p>
      <p className="text-white/40 text-sm">
        Social features coming soon...
      </p>
    </div>
  );
}
