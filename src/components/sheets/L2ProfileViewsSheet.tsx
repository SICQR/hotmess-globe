/**
 * L2ProfileViewsSheet — Who viewed your profile
 *
 * Shows a list of profiles that viewed you in the last 7 days.
 * Ordered by most recent first.
 * Tap a row to open that profile's sheet.
 *
 * Features:
 *   - Header: "👁 Who Viewed You" + "Last 7 days" subtitle
 *   - Empty state: "No views yet — put yourself out there"
 *   - Avatar (gold border), display_name, city, time ago
 *   - Max 50 rows
 *   - Gold accent #C8962C, dark theme
 */

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Loader2, Eye } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { SheetSection } from './L2SheetContainer';

const AMBER = '#C8962C';
const CARD_BG = '#1C1C1E';

interface ProfileView {
  id: string;
  viewer_id: string;
  viewed_at: string;
  viewer_profile: {
    id: string;
    avatar_url?: string;
    display_name: string;
    city?: string;
  };
}

export default function L2ProfileViewsSheet() {
  const { openSheet } = useSheet();
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  // Fetch profile views (last 7 days, max 50)
  const { data: views = [], isLoading, error } = useQuery({
    queryKey: ['profile-views', userId],
    queryFn: async () => {
      if (!userId) return [];

      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Join profile_views with profiles to get viewer details
      const { data, error } = await supabase
        .from('profile_views')
        .select(`
          id,
          viewer_id,
          viewed_at,
          profiles:viewer_id (
            id,
            avatar_url,
            display_name,
            city
          )
        `)
        .eq('viewed_id', userId)
        .gte('viewed_at', since)
        .order('viewed_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[ProfileViews] Query error:', error);
        return [];
      }

      // Transform the response to flatten the nested profile
      return (data as any[])
        .map((view) => ({
          id: view.id,
          viewer_id: view.viewer_id,
          viewed_at: view.viewed_at,
          viewer_profile: Array.isArray(view.profiles) ? view.profiles[0] : view.profiles,
        }))
        .filter((v) => v.viewer_profile); // Only keep if profile found
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const handleOpenProfile = (viewerId: string, profile: any) => {
    openSheet('profile', {
      id: viewerId,
      email: profile?.email,
    });
  };

  if (isLoading) {
    return (
      <SheetSection>
        <div className="flex justify-center items-center h-32">
          <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
        </div>
      </SheetSection>
    );
  }

  if (error) {
    return (
      <SheetSection>
        <div className="text-center py-8">
          <p className="text-red-400 text-sm">Could not load views</p>
        </div>
      </SheetSection>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <SheetSection>
        <div className="flex items-center gap-2 mb-1">
          <Eye className="w-5 h-5" style={{ color: AMBER }} />
          <h2 className="text-lg font-bold text-white">Who Viewed You</h2>
        </div>
        <p className="text-xs text-white/50">Last 7 days</p>
      </SheetSection>

      {/* Empty state */}
      {views.length === 0 ? (
        <SheetSection>
          <div className="text-center py-12">
            <Eye className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">No views yet</p>
            <p className="text-sm text-white/50">Put yourself out there and connect!</p>
          </div>
        </SheetSection>
      ) : (
        <SheetSection>
          <div className="rounded-2xl overflow-hidden divide-y divide-white/5" style={{ background: CARD_BG }}>
            {views.map((view, idx) => (
              <motion.button
                key={view.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleOpenProfile(view.viewer_id, view.viewer_profile)}
                className="w-full flex items-center gap-3 p-4 active:bg-white/5 transition-colors text-left"
              >
                {/* Avatar */}
                <div
                  className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden border-2 flex items-center justify-center"
                  style={{ borderColor: AMBER }}
                >
                  {view.viewer_profile.avatar_url ? (
                    <img
                      src={view.viewer_profile.avatar_url}
                      alt={view.viewer_profile.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/40 font-bold">
                      {(view.viewer_profile.display_name || '?')[0]}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {view.viewer_profile.display_name || 'Anonymous'}
                  </p>
                  {view.viewer_profile.city && (
                    <p className="text-xs text-white/50 truncate">{view.viewer_profile.city}</p>
                  )}
                  <p className="text-xs text-white/40 mt-0.5">
                    {formatTimeAgo(new Date(view.viewed_at))}
                  </p>
                </div>

                {/* Chevron */}
                <div className="flex-shrink-0 text-white/30">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.button>
            ))}
          </div>
        </SheetSection>
      )}

      {/* Padding */}
      <div className="h-20" />
    </div>
  );
}

/**
 * Format date as "X time ago" (e.g. "2h ago", "1d ago")
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
