/**
 * L2SocialSheet — Native social activity feed in a sheet
 *
 * Shows activity from people you follow + nearby posts.
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/components/utils/supabaseClient';
import { Heart, MapPin, Loader2, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useSheet } from '@/contexts/SheetContext';

const TABS = ['Feed', 'Nearby'];

const ACTION_LABELS = {
  post_like: '❤️ liked your post',
  post_comment: '💬 commented on your post',
  follow: '➕ started following you',
  event_rsvp: '📅 is going to an event',
  beacon_checkin: '📍 checked in nearby',
};

export default function L2SocialSheet() {
  const [tab, setTab] = useState('Feed');
  const { openSheet } = useSheet();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  // Social feed — activity from followed users
  const { data: feedItems = [], isLoading: feedLoading } = useQuery({
    queryKey: ['social-feed', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      try {
        const { data } = await supabase
          .from('activity_feed')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(40);
        return data || [];
      } catch {
        // Fallback: show follows as activity
        try {
          const follows = await base44.entities.UserFollow.filter({ follower_email: currentUser.email });
          return follows.map(f => ({
            id: f.id,
            action_type: 'follow',
            actor_name: f.followed_name || f.followed_email,
            actor_avatar: f.followed_avatar_url,
            actor_email: f.followed_email,
            created_at: f.created_date,
          }));
        } catch {
          return [];
        }
      }
    },
    enabled: !!currentUser?.email,
    refetchInterval: 30000,
  });

  // Nearby users
  const { data: nearbyUsers = [], isLoading: nearbyLoading } = useQuery({
    queryKey: ['nearby-users'],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email, city')
          .eq('is_online', true)
          .limit(20);
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: tab === 'Nearby',
    refetchInterval: 60000,
  });

  const isLoading = tab === 'Feed' ? feedLoading : nearbyLoading;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <h2 className="font-black uppercase text-sm tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#C8962C]" />
          Social
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-colors ${
              tab === t
                ? 'text-[#C8962C] border-b-2 border-[#C8962C]'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
          </div>
        ) : tab === 'Feed' ? (
          feedItems.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Heart className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/40 text-sm">Follow people to see their activity</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {feedItems.map((item, i) => (
                <motion.div
                  key={item.id || i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C8962C] to-[#C8962C] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.actor_avatar ? (
                      <img src={item.actor_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-black text-white">
                        {(item.actor_name || '?')[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">
                      <span className="font-bold">{item.actor_name || 'Someone'}</span>{' '}
                      <span className="text-white/60">
                        {ACTION_LABELS[item.action_type] || item.action_type || 'did something'}
                      </span>
                    </p>
                    {item.created_at && (
                      <p className="text-[11px] text-white/30 mt-0.5">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => item.actor_email && openSheet('profile', { email: item.actor_email })}
                    className="flex-shrink-0 px-2 py-1 text-[10px] font-bold text-white/40 hover:text-white border border-white/10 hover:border-white/30 rounded-full transition-colors"
                  >
                    View
                  </button>
                </motion.div>
              ))}
            </div>
          )
        ) : (
          // Nearby tab
          nearbyUsers.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MapPin className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/40 text-sm">No one online nearby right now</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5">
              {nearbyUsers.map((user, i) => (
                <motion.button
                  key={user.id || i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => openSheet('profile', { email: user.email })}
                  className="aspect-square relative overflow-hidden bg-gradient-to-br from-[#C8962C]/20 to-[#C8962C]/20"
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-2xl font-black text-white/40">
                        {(user.full_name || '?')[0]}
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                    <p className="text-[10px] font-bold text-white truncate">{user.full_name}</p>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-[#00FF87] rounded-full" />
                      <span className="text-[9px] text-[#00FF87]">Online</span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
