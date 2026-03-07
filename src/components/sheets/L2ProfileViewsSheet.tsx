/**
 * L2ProfileViewsSheet — Who viewed your profile
 *
 * Shows a list of profiles that viewed you in the last 7 days.
 * Ordered by most recent first. Tap a row to open their profile sheet.
 *
 * Data model: profile_views uses viewer_id / viewed_id (UUID-based, references auth.users.id).
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

interface ViewRow {
  id: string;
  viewer_id: string;
  viewed_at: string;
  // Profile data joined in second query
  profile?: {
    id: string;
    avatar_url?: string;
    display_name?: string;
    city?: string;
  };
}

export default function L2ProfileViewsSheet() {
  const { openSheet } = useSheet();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) setUserId(user.id);
    });
  }, []);

  // Step 1: Fetch profile_views rows for this user (last 7 days)
  const { data: views = [], isLoading, error } = useQuery<ViewRow[]>({
    queryKey: ['profile-views', userId],
    queryFn: async () => {
      if (!userId) return [];

      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: rawViews, error: viewsError } = await supabase
        .from('profile_views')
        .select('id, viewer_id, viewed_at')
        .eq('viewed_id', userId)
        .gte('viewed_at', since)
        .order('viewed_at', { ascending: false })
        .limit(50);

      if (viewsError) {
        console.error('[ProfileViews] Query error:', viewsError);
        return [];
      }
      if (!rawViews?.length) return [];

      // Step 2: Fetch profile data for viewer UUIDs
      // profiles.id = auth.users.id = profile_views.viewer_id
      const viewerIds = [...new Set(rawViews.map((v) => v.viewer_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, avatar_url, display_name, city')
        .in('id', viewerIds);

      const profileById: Record<string, any> = {};
      for (const p of profiles ?? []) {
        if (p.id) profileById[p.id] = p;
      }

      return rawViews.map((v) => ({
        ...v,
        profile: profileById[v.viewer_id],
      }));
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const handleOpenProfile = (viewerId: string) => {
    openSheet('profile', { uid: viewerId });
  };

  if (isLoading) {
    return (
      <SheetSection>
        <div className="flex justify-center items-center h-32">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: AMBER }} />
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
          <div
            className="rounded-2xl overflow-hidden divide-y divide-white/5"
            style={{ background: CARD_BG }}
          >
            {views.map((view, idx) => {
              const displayName = view.profile?.display_name || 'Unknown';
              const avatarUrl = view.profile?.avatar_url;
              const city = view.profile?.city;
              const initial = displayName[0]?.toUpperCase() ?? '?';

              return (
                <motion.button
                  key={view.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => handleOpenProfile(view.viewer_id)}
                  className="w-full flex items-center gap-3 p-4 active:bg-white/5 transition-colors text-left"
                >
                  {/* Avatar */}
                  <div
                    className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden border-2"
                    style={{ borderColor: AMBER }}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/60 font-bold text-lg">
                        {initial}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                    {city && <p className="text-xs text-white/50 truncate">{city}</p>}
                    <p className="text-xs text-white/40 mt-0.5">
                      {formatTimeAgo(new Date(view.viewed_at))}
                    </p>
                  </div>

                  {/* Chevron */}
                  <svg
                    className="w-4 h-4 flex-shrink-0 text-white/30"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </motion.button>
              );
            })}
          </div>
        </SheetSection>
      )}

      {/* Bottom padding */}
      <div className="h-20" />
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}
