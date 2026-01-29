import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Zap, MapPin, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
// createPageUrl no longer used after privacy URL refactor
import { motion } from 'framer-motion';
import { getProfileUrl } from '@/lib/userPrivacy';

export default function PeopleYouMayKnow({ currentUser, limit = 6 }) {
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: userTags = [] } = useQuery({
    queryKey: ['user-tags'],
    queryFn: () => base44.entities.UserTag.list()
  });

  const { data: userFollows = [] } = useQuery({
    queryKey: ['user-follows'],
    queryFn: () => base44.entities.UserFollow.list()
  });

  const { data: userActivities = [] } = useQuery({
    queryKey: ['user-activities-recent'],
    queryFn: () => base44.entities.UserActivity.filter({ visible: true }, '-created_date', 100)
  });

  const suggestions = useMemo(() => {
    if (!currentUser) return [];

    // Get current user's data
    const myFollowing = userFollows.filter(f => f.follower_email === currentUser.email).map(f => f.following_email);
    const myTags = userTags.filter(t => t.user_email === currentUser.email);
    const myTagIds = new Set(myTags.map(t => t.tag_id));
    const myInterests = new Set(currentUser.interests || []);
    const myVibes = new Set(currentUser.preferred_vibes || []);

    // Get mutual friends
    const myFollowers = userFollows.filter(f => f.following_email === currentUser.email).map(f => f.follower_email);
    const mutualConnections = new Map();
    
    myFollowing.forEach(followingEmail => {
      const theirFollowing = userFollows.filter(f => f.follower_email === followingEmail).map(f => f.following_email);
      theirFollowing.forEach(email => {
        if (email !== currentUser.email && !myFollowing.includes(email)) {
          mutualConnections.set(email, (mutualConnections.get(email) || 0) + 1);
        }
      });
    });

    // Score users
    const scored = allUsers
      .filter(user => 
        user.email !== currentUser.email && 
        !myFollowing.includes(user.email) &&
        user.full_name &&
        user.avatar_url
      )
      .map(user => {
        let score = 0;
        const reasons = [];

        // Mutual connections (highest weight)
        const mutualCount = mutualConnections.get(user.email) || 0;
        if (mutualCount > 0) {
          score += mutualCount * 50;
          reasons.push(`${mutualCount} mutual`);
        }

        // Same location
        if (user.city && user.city === currentUser.city) {
          score += 30;
          reasons.push('Same city');
        }

        // Shared interests
        const sharedInterests = (user.interests || []).filter(i => myInterests.has(i)).length;
        if (sharedInterests > 0) {
          score += sharedInterests * 20;
          reasons.push(`${sharedInterests} shared interests`);
        }

        // Shared vibes
        const sharedVibes = (user.preferred_vibes || []).filter(v => myVibes.has(v)).length;
        if (sharedVibes > 0) {
          score += sharedVibes * 15;
          reasons.push(`${sharedVibes} shared vibes`);
        }

        // Shared tags
        const theirTags = userTags.filter(t => t.user_email === user.email);
        const sharedTags = theirTags.filter(t => myTagIds.has(t.tag_id)).length;
        if (sharedTags > 0) {
          score += sharedTags * 25;
          reasons.push(`${sharedTags} shared tags`);
        }

        // Recent activity (active users get boost)
        const recentActivity = userActivities.find(a => a.user_email === user.email);
        if (recentActivity) {
          const ageMinutes = (Date.now() - new Date(recentActivity.created_date).getTime()) / 60000;
          if (ageMinutes < 60) {
            score += 10;
            reasons.push('Recently active');
          }
        }

        // Similar XP level
        const xpDiff = Math.abs((user.xp || 0) - (currentUser.xp || 0));
        if (xpDiff < 500) {
          score += 5;
        }

        return { 
          user, 
          score, 
          reasons: reasons.slice(0, 2), // Top 2 reasons
          mutualCount
        };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored;
  }, [currentUser, allUsers, userTags, userFollows, userActivities, limit]);

  if (suggestions.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[#B026FF]" />
        <h2 className="text-xl font-black uppercase">People You May Know</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {suggestions.map((suggestion, idx) => (
          <motion.div
            key={suggestion.user.email}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Link to={getProfileUrl(suggestion.user)}>
              <div className="group bg-black border-2 border-white hover:border-[#B026FF] transition-all overflow-hidden">
                {/* Profile Image */}
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={suggestion.user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(suggestion.user.full_name)}&size=400&background=B026FF&color=000`}
                    alt={suggestion.user.full_name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                  />
                  
                  {/* Mutual Badge */}
                  {suggestion.mutualCount > 0 && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-[#B026FF] text-white text-[9px] font-black uppercase border-2 border-white">
                      <Users className="w-2.5 h-2.5 inline mr-1" />
                      {suggestion.mutualCount} Mutual
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="p-3 space-y-2">
                  <h3 className="font-black text-sm truncate group-hover:text-[#B026FF] transition-colors">
                    {suggestion.user.full_name}
                  </h3>

                  {/* Reasons */}
                  {suggestion.reasons.length > 0 && (
                    <div className="space-y-1">
                      {suggestion.reasons.map((reason, i) => (
                        <div key={i} className="text-[9px] text-white/60 uppercase tracking-wider">
                          • {reason}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-[10px] pt-2 border-t border-white/10">
                    {suggestion.user.city && (
                      <div className="flex items-center gap-1 text-white/60">
                        <MapPin className="w-3 h-3" />
                        <span>{suggestion.user.city}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[#FFEB3B]">
                      <Zap className="w-3 h-3" />
                      <span className="font-mono">{suggestion.user.xp || 0}</span>
                    </div>
                  </div>

                  {/* Preview Vibe */}
                  {suggestion.user.preferred_vibes && suggestion.user.preferred_vibes[0] && (
                    <div className="pt-2">
                      <span className="text-[9px] px-2 py-1 bg-[#B026FF]/20 border border-[#B026FF] text-[#B026FF] uppercase font-bold">
                        {suggestion.user.preferred_vibes[0]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}