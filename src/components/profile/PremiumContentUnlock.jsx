import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Lock, Zap, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function PremiumContentUnlock({ profileUser, currentUser }) {
  const [unlocked, setUnlocked] = useState(false);
  const queryClient = useQueryClient();

  const checkUnlock = async () => {
    // CHROME members get free access to all premium content
    if (currentUser.membership_tier === 'pro') {
      return true;
    }
    
    const unlocks = await base44.entities.ContentUnlock.filter({
      unlocker_email: currentUser.email,
      owner_email: profileUser.email
    });
    return unlocks.length > 0;
  };

  React.useEffect(() => {
    checkUnlock().then(setUnlocked);
  }, [currentUser.email, profileUser.email, currentUser.membership_tier]);

  const unlockMutation = useMutation({
    mutationFn: async () => {
      const cost = profileUser.premium_unlock_xp || 1000;

      if (currentUser.xp < cost) {
        throw new Error('Not enough XP');
      }

      // Deduct XP from current user
      await base44.auth.updateMe({
        xp: currentUser.xp - cost
      });

      // Add XP to profile owner
      const ownerUsers = await base44.entities.User.filter({ email: profileUser.email });
      if (ownerUsers.length > 0) {
        const owner = ownerUsers[0];
        await base44.entities.User.update(owner.id, {
          xp: (owner.xp || 0) + cost
        });
      }

      // Create unlock record
      await base44.entities.ContentUnlock.create({
        unlocker_email: currentUser.email,
        owner_email: profileUser.email,
        xp_spent: cost
      });

      return cost;
    },
    onSuccess: (cost) => {
      setUnlocked(true);
      queryClient.invalidateQueries(['users']);
      toast.success(`Unlocked! ${cost} XP transferred`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to unlock');
    }
  });

  const premiumPhotos = profileUser.photos?.filter(p => p.is_premium) || [];
  const premiumVideos = profileUser.premium_videos || [];

  if (!profileUser.has_premium_content) return null;

  const cost = profileUser.premium_unlock_xp || 1000;
  const isChromeMemeber = currentUser.membership_tier === 'pro';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-[#FFD700]/20 to-[#E62020]/20 border-2 border-[#FFD700] p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <Crown className="w-6 h-6 text-[#FFD700]" />
        <div>
          <h3 className="text-lg font-black uppercase text-white">Premium Content</h3>
          <p className="text-xs text-white/60">
            {premiumPhotos.length} photos • {premiumVideos.length} videos
          </p>
        </div>
        {isChromeMemeber && (
          <div className="ml-auto">
            <Crown className="w-5 h-5 text-[#00D9FF]" title="CHROME members get free access" />
          </div>
        )}
      </div>

      {unlocked ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-[#39FF14]">
            <Eye className="w-4 h-4" />
            <span className="font-bold uppercase">
              {isChromeMemeber ? 'CHROME Access' : 'Unlocked'}
            </span>
          </div>

          {/* Premium Photos */}
          {premiumPhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {premiumPhotos.map((photo, idx) => (
                <img
                  key={idx}
                  src={photo.url}
                  alt={`Premium ${idx + 1}`}
                  className="w-full aspect-square object-cover"
                />
              ))}
            </div>
          )}

          {/* Premium Videos */}
          {premiumVideos.length > 0 && (
            <div className="space-y-3">
              {premiumVideos.map((video, idx) => (
                <div key={idx}>
                  <p className="text-sm font-bold text-white mb-1">{video.title}</p>
                  <video src={video.url} controls className="w-full aspect-video bg-black" />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            {[...Array(3)].map((_, idx) => (
              <div
                key={idx}
                className="flex-1 aspect-square bg-black/40 flex items-center justify-center"
              >
                <Lock className="w-8 h-8 text-white/40" />
              </div>
            ))}
          </div>

          <Button
            onClick={() => unlockMutation.mutate()}
            disabled={unlockMutation.isPending || currentUser.xp < cost}
            className="w-full bg-[#FFD700] text-black hover:bg-[#FFD700]/90 font-black text-lg py-6"
          >
            {unlockMutation.isPending ? (
              'Processing...'
            ) : (
              <>
                <Crown className="w-5 h-5 mr-2" />
                Unlock for {cost} XP
                <Zap className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>

          {currentUser.xp < cost && (
            <p className="text-xs text-red-400 text-center">
              Not enough XP. You have {currentUser.xp}, need {cost}.
            </p>
          )}

          <p className="text-xs text-white/40 text-center">
            One-time unlock • XP goes to profile owner
          </p>
          
          <div className="mt-4 p-3 bg-[#00D9FF]/10 border border-[#00D9FF]/30">
            <p className="text-xs text-[#00D9FF] font-bold uppercase text-center flex items-center justify-center gap-2">
              <Crown className="w-3 h-3" />
              CHROME members get instant access to all premium content
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}