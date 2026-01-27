/**
 * StreakIndicator - Compact streak display for header
 * Shows current streak count with flame icon
 */

import React from 'react';
import { Flame } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import { Link } from 'react-router-dom';

export default function StreakIndicator() {
  const { data: checkinData, isLoading } = useQuery({
    queryKey: ['daily-checkin-indicator'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      try {
        // Use maybeSingle() to gracefully handle no rows (returns null instead of error)
        const { data: checkin, error } = await supabase
          .from('user_checkins')
          .select('streak, last_checkin')
          .eq('user_id', user.id)
          .maybeSingle();

        // If table doesn't exist, fail silently
        if (error?.code === '42P01') {
          return { streak: 0, last_checkin: null };
        }

        return checkin || { streak: 0, last_checkin: null };
      } catch {
        // Any fetch error - fail silently
        return { streak: 0, last_checkin: null };
      }
    },
    staleTime: 60000,
    retry: false, // Don't retry on table not found
  });

  if (isLoading || !checkinData) {
    return null;
  }

  const currentStreak = checkinData.streak || 0;
  
  // Check if user can claim today
  const today = new Date().toISOString().split('T')[0];
  const lastCheckin = checkinData.last_checkin?.split('T')[0];
  const canClaim = lastCheckin !== today;

  return (
    <Link
      to="/home"
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all ${
        canClaim
          ? 'bg-gradient-to-r from-[#E62020] to-[#B026FF] text-white hover:scale-105'
          : 'bg-white/10 text-white/60'
      }`}
    >
      <Flame className={`w-4 h-4 ${currentStreak > 0 ? 'text-orange-400' : ''}`} />
      <span className="text-xs font-black">{currentStreak}</span>
      {canClaim && (
        <span className="w-1.5 h-1.5 bg-[#39FF14] rounded-full animate-pulse" />
      )}
    </Link>
  );
}
