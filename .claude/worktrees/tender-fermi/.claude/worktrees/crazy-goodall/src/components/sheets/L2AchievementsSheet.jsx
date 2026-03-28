/**
 * L2AchievementsSheet — Achievement gallery for the current user
 *
 * Shows the achievements catalog with locked/unlocked state.
 * DB: achievements (catalog) + user_achievements (user's unlocks)
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Lock, Loader2, Star } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';

// Fallback emoji when color/emoji metadata is missing
const FALLBACK_EMOJI = '🏆';

function AchievementCard({ achievement, unlocked, unlockedDate }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative bg-[#1C1C1E] rounded-2xl p-4 flex flex-col gap-2 ${
        unlocked ? 'border border-[#C8962C]/20' : 'opacity-50'
      }`}
    >
      {/* Icon */}
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
          unlocked ? 'bg-[#C8962C]/15' : 'bg-white/5'
        }`}
        style={achievement.color && unlocked ? { background: `${achievement.color}20` } : {}}
      >
        {unlocked ? (achievement.icon_emoji || FALLBACK_EMOJI) : '🔒'}
      </div>

      {/* Title & description */}
      <div>
        <p className={`font-black text-sm leading-tight ${unlocked ? 'text-white' : 'text-white/40'}`}>
          {achievement.title}
        </p>
        {achievement.description && (
          <p className="text-white/40 text-xs mt-0.5 leading-relaxed line-clamp-2">
            {achievement.description}
          </p>
        )}
      </div>

      {/* Unlock date */}
      {unlocked && unlockedDate && (
        <p className="text-[#C8962C] text-xs font-bold">
          Unlocked {new Date(unlockedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </p>
      )}

      {/* Lock badge */}
      {!unlocked && (
        <div className="absolute top-3 right-3">
          <Lock className="w-3.5 h-3.5 text-white/20" />
        </div>
      )}
    </motion.div>
  );
}

export default function L2AchievementsSheet() {
  const [catalog, setCatalog] = useState([]);
  const [userUnlocks, setUserUnlocks] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  async function loadAchievements() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Load full catalog + user's unlocks in parallel
    const [catalogRes, unlocksRes] = await Promise.all([
      supabase.from('achievements').select('*').order('created_at', { ascending: true }),
      supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_date')
        .eq('user_email', user.email),
    ]);

    if (catalogRes.data) setCatalog(catalogRes.data);

    if (unlocksRes.data) {
      const map = {};
      for (const row of unlocksRes.data) {
        map[row.achievement_id] = row.unlocked_date;
      }
      setUserUnlocks(map);
    }

    setLoading(false);
  }

  const unlockedCount = catalog.filter(a => userUnlocks[a.id]).length;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#0D0D0D]">

      {/* Hero banner */}
      <div className="px-4 pt-4 pb-5">
        <div className="bg-[#C8962C]/10 border border-[#C8962C]/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C8962C]/20 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-[#C8962C]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#C8962C] font-black text-sm">Achievements</p>
            {!loading && (
              <p className="text-white/60 text-xs mt-0.5">
                {unlockedCount} of {catalog.length} unlocked
              </p>
            )}
          </div>
          {!loading && (
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-[#C8962C]" />
              <span className="text-[#C8962C] font-black text-lg">{unlockedCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
        </div>
      )}

      {/* Unlocked section */}
      {!loading && unlockedCount > 0 && (
        <div className="px-4 pb-4">
          <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-3">Unlocked</p>
          <div className="grid grid-cols-2 gap-3">
            {catalog
              .filter(a => userUnlocks[a.id])
              .map(a => (
                <AchievementCard
                  key={a.id}
                  achievement={a}
                  unlocked
                  unlockedDate={userUnlocks[a.id]}
                />
              ))}
          </div>
        </div>
      )}

      {/* Locked section */}
      {!loading && catalog.filter(a => !userUnlocks[a.id]).length > 0 && (
        <div className="px-4 pb-6">
          <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-3">Locked</p>
          <div className="grid grid-cols-2 gap-3">
            {catalog
              .filter(a => !userUnlocks[a.id])
              .map(a => (
                <AchievementCard
                  key={a.id}
                  achievement={a}
                  unlocked={false}
                />
              ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && catalog.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
          <Trophy className="w-12 h-12 text-white/10 mb-4" />
          <p className="text-white/50 font-bold">No achievements yet</p>
          <p className="text-white/30 text-xs mt-1">Keep engaging with the community to unlock achievements.</p>
        </div>
      )}
    </div>
  );
}
