/**
 * L2ProfileSheet — Profile as a sheet overlay
 * 
 * Replaces: /profile page navigation
 * TODO: Extract content from Profile.jsx (1,219 lines)
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { Loader2, User } from 'lucide-react';
import { SheetSection } from './L2SheetContainer';

export default function L2ProfileSheet({ email, uid }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['profile-sheet', email, uid],
    queryFn: async () => {
      if (email) {
        const users = await base44.entities.User.filter({ email });
        return users?.[0] || null;
      }
      if (uid) {
        const users = await base44.entities.User.filter({ auth_user_id: uid });
        return users?.[0] || null;
      }
      // Current user
      return await base44.auth.me();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#FF1493] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <User className="w-12 h-12 text-white/20 mb-4" />
        <p className="text-white/60">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Avatar & Name */}
      <SheetSection>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center overflow-hidden">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-black text-white">
                {user.full_name?.[0] || user.username?.[0] || '?'}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{user.full_name || user.username}</h2>
            {user.username && (
              <p className="text-[#00D9FF] text-sm">@{user.username}</p>
            )}
            {user.city && (
              <p className="text-white/40 text-sm">{user.city}</p>
            )}
          </div>
        </div>
      </SheetSection>

      {/* Bio */}
      {user.bio && (
        <SheetSection title="About">
          <p className="text-white/80 text-sm">{user.bio}</p>
        </SheetSection>
      )}

      {/* Stats */}
      <SheetSection title="Stats">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-2xl font-black text-[#FFEB3B]">{user.xp || 0}</p>
            <p className="text-xs text-white/40">XP</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-2xl font-black text-[#00D9FF]">
              {Math.floor((user.xp || 0) / 1000) + 1}
            </p>
            <p className="text-xs text-white/40">Level</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-2xl font-black text-[#39FF14]">{user.events_attended || 0}</p>
            <p className="text-xs text-white/40">Events</p>
          </div>
        </div>
      </SheetSection>

      {/* TODO: Add tabs for Events, Vault, etc. */}
      <SheetSection>
        <p className="text-white/40 text-xs text-center">
          Full profile view coming soon...
        </p>
      </SheetSection>
    </div>
  );
}
