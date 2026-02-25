import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { 
  Crown,
  Lock,
  Unlock,
  Users,
  Sparkles,
  Eye,
  Check,
  Image as ImageIcon,
  Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import MutualConnections from './MutualConnections';

const getUserPhotoUrls = (user) => {
  const urls = [];
  const push = (value) => {
    const url = typeof value === 'string' ? value.trim() : '';
    if (!url) return;
    if (urls.includes(url)) return;
    urls.push(url);
  };

  push(user?.avatar_url);
  push(user?.avatarUrl);

  const photos = Array.isArray(user?.photos) ? user.photos : [];
  for (const item of photos) {
    if (!item) continue;
    if (typeof item === 'string') push(item);
    else if (typeof item === 'object') push(item.url || item.file_url || item.href);
  }

  return urls.slice(0, 10);
};

const getPhotoMeta = (user, idx) => {
  const photos = Array.isArray(user?.photos) ? user.photos : [];
  const p = photos[idx];
  if (!p || typeof p !== 'object') return { isPremium: false, price: 0 };
  return {
    isPremium: !!(p.is_premium || p.isPremium || p.premium),
    price: p.price_xp || p.priceXp || 50,
    id: p.id || `photo_${idx}`,
  };
};

export default function PremiumProfileView({ user, currentUser, isOwnProfile }) {
  const queryClient = useQueryClient();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockingPhoto, setUnlockingPhoto] = useState(null);

  const photoUrls = getUserPhotoUrls(user);
  const activePhotoIndex = previewPhotoIndex === null ? selectedPhotoIndex : previewPhotoIndex;
  const activeUrl = photoUrls[activePhotoIndex] || null;
  const activePhotoMeta = getPhotoMeta(user, activePhotoIndex);
  
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(String(user?.full_name || 'User'))}&size=512&background=111111&color=ffffff`;
  const mainUrl = activeUrl || fallbackAvatar;

  // Count premium content
  const photos = Array.isArray(user?.photos) ? user.photos : [];
  const premiumPhotos = photos.filter(p => p && typeof p === 'object' && (p.is_premium || p.isPremium || p.premium));
  const publicPhotos = photos.length - premiumPhotos.length;

  // Check if current user has subscription to this profile
  const { data: subscription } = useQuery({
    queryKey: ['subscription', currentUser?.email, user?.email],
    queryFn: async () => {
      if (!currentUser?.email || !user?.email) return null;
      const subs = await base44.entities.Subscription?.filter({
        subscriber_email: currentUser.email,
        creator_email: user.email,
        status: 'active'
      }).catch(() => []);
      return Array.isArray(subs) && subs.length > 0 ? subs[0] : null;
    },
    enabled: !!currentUser?.email && !!user?.email && !isOwnProfile,
  });

  // Check what content the current user has unlocked
  const { data: unlockedContent = [] } = useQuery({
    queryKey: ['unlocked-content', currentUser?.email, user?.email],
    queryFn: async () => {
      if (!currentUser?.email || !user?.email) return [];
      const unlocks = await base44.entities.PremiumUnlock?.filter({
        user_email: currentUser.email,
        owner_email: user.email,
      }).catch(() => []);
      return Array.isArray(unlocks) ? unlocks : [];
    },
    enabled: !!currentUser?.email && !!user?.email && !isOwnProfile,
  });

  // Get subscriber count for this profile
  const { data: subscriberCount = 0 } = useQuery({
    queryKey: ['subscriber-count', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.Subscription?.filter({
        creator_email: user.email,
        status: 'active'
      }).catch(() => []);
      return Array.isArray(subs) ? subs.length : 0;
    },
    enabled: !!user?.email,
  });

  const isSubscribed = !!subscription || isOwnProfile;
  
  const hasUnlockedPhoto = (photoId) => {
    if (isOwnProfile || isSubscribed) return true;
    return unlockedContent.some(u => u.item_id === photoId && u.unlock_type === 'photo');
  };

  // Unlock content mutation
  const unlockMutation = useMutation({
    mutationFn: async ({ photoId, priceXp }) => {
      // Get authentication token
      const { data: { session } } = await base44.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/premium/unlock', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          owner_email: user.email,
          unlock_type: 'photo',
          item_id: photoId,
          price_xp: priceXp,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to unlock content');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['unlocked-content']);
      toast.success('Content unlocked!');
      setShowUnlockModal(false);
      setUnlockingPhoto(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to unlock content');
    },
  });

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      // Get authentication token
      const { data: { session } } = await base44.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/premium/subscribe', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          creator_email: user.email,
          price_xp: user.subscription_price_xp || 500,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to subscribe');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['subscription']);
      toast.success(`Subscribed to ${user.full_name}!`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to subscribe');
    },
  });

  const handleUnlockClick = (photoMeta) => {
    if (!currentUser) {
      toast.error('Please sign in to unlock content');
      return;
    }
    setUnlockingPhoto(photoMeta);
    setShowUnlockModal(true);
  };

  const subscriptionPrice = user?.subscription_price_xp || 500;

  return (
    <div className="space-y-6">
      {/* Premium Badge Header */}
      <div className="bg-gradient-to-r from-[#FFD700]/20 via-[#C8962C]/20 to-[#FFD700]/20 border-2 border-[#FFD700]/50 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FFD700] to-[#C8962C] flex items-center justify-center">
              <Crown className="w-6 h-6 text-black" />
            </div>
            <div>
              <h3 className="font-black text-[#FFD700] uppercase">Premium Creator</h3>
              <p className="text-xs text-white/60">Exclusive content available</p>
            </div>
          </div>
          {!isOwnProfile && !isSubscribed && (
            <Button
              onClick={() => subscribeMutation.mutate()}
              disabled={subscribeMutation.isPending}
              className="bg-gradient-to-r from-[#FFD700] to-[#C8962C] text-black font-black uppercase hover:opacity-90"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Subscribe
            </Button>
          )}
          {isSubscribed && !isOwnProfile && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#39FF14]/20 border border-[#39FF14]/50 text-[#39FF14]">
              <Check className="w-4 h-4" />
              <span className="text-sm font-bold uppercase">Subscribed</span>
            </div>
          )}
        </div>
      </div>

      {/* Photo Gallery with Premium Content */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Content Gallery
        </h3>

        {/* Main Photo */}
        <div className="relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-black/30">
          {activePhotoMeta.isPremium && !hasUnlockedPhoto(activePhotoMeta.id) ? (
            <div className="w-full h-full relative">
              {/* Blurred preview */}
              <img 
                src={mainUrl} 
                alt="Premium content" 
                className="w-full h-full object-cover blur-xl scale-110"
              />
              {/* Lock overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/30 to-[#C8962C]/30 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-[#FFD700] to-[#C8962C] flex items-center justify-center">
                    <Lock className="w-8 h-8 text-black" />
                  </div>
                  <p className="text-[#FFD700] font-black uppercase mb-2">Premium Content</p>
                  <p className="text-white/60 text-sm mb-4">Premium content</p>
                  <Button
                    onClick={() => handleUnlockClick(activePhotoMeta)}
                    className="bg-gradient-to-r from-[#FFD700] to-[#C8962C] text-black font-black uppercase"
                  >
                    <Unlock className="w-4 h-4 mr-2" />
                    Unlock Now
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <img src={mainUrl} alt="Profile photo" className="w-full h-full object-cover" />
          )}

          {/* Premium indicator */}
          {activePhotoMeta.isPremium && hasUnlockedPhoto(activePhotoMeta.id) && (
            <div className="absolute top-3 right-3 px-2 py-1 bg-[#FFD700] text-black text-xs font-black uppercase flex items-center gap-1">
              <Crown className="w-3 h-3" />
              Premium
            </div>
          )}
        </div>

        {/* Photo Grid */}
        <div className="mt-3 grid grid-cols-5 gap-2">
          {Array.from({ length: 9 }).map((_, slotIdx) => {
            const url = photoUrls[slotIdx] || null;
            const meta = getPhotoMeta(user, slotIdx);
            const isUnlocked = hasUnlockedPhoto(meta.id);

            return (
              <button
                key={slotIdx}
                type="button"
                className={`
                  relative aspect-square overflow-hidden rounded-md border transition-all
                  ${slotIdx === activePhotoIndex 
                    ? 'border-[#FFD700] ring-2 ring-[#FFD700]/50' 
                    : 'border-white/10 hover:border-white/25'
                  }
                  ${!url ? 'opacity-40' : ''}
                `}
                onMouseEnter={() => setPreviewPhotoIndex(slotIdx)}
                onMouseLeave={() => setPreviewPhotoIndex(null)}
                onClick={() => {
                  if (!url) return;
                  setSelectedPhotoIndex(slotIdx);
                  setPreviewPhotoIndex(null);
                }}
                disabled={!url}
              >
                {meta.isPremium && !isUnlocked ? (
                  <div className="w-full h-full bg-gradient-to-br from-[#FFD700]/20 to-[#C8962C]/20 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-[#FFD700]" />
                  </div>
                ) : url ? (
                  <>
                    <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    {meta.isPremium && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-[#FFD700] flex items-center justify-center">
                        <Crown className="w-2.5 h-2.5 text-black" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-white/5 to-black/30" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <ImageIcon className="w-6 h-6 mx-auto mb-2 text-[#FFD700]" />
          <div className="text-2xl font-black">{premiumPhotos.length}</div>
          <div className="text-xs text-white/40 uppercase">Premium</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Users className="w-6 h-6 mx-auto mb-2 text-[#C8962C]" />
          <div className="text-2xl font-black">{subscriberCount}</div>
          <div className="text-xs text-white/40 uppercase">Subscribers</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Eye className="w-6 h-6 mx-auto mb-2 text-[#00D9FF]" />
          <div className="text-2xl font-black">{publicPhotos}</div>
          <div className="text-xs text-white/40 uppercase">Free</div>
        </div>
      </div>

      {/* Subscription Tiers */}
      {!isOwnProfile && !isSubscribed && (
        <div className="bg-gradient-to-br from-[#FFD700]/10 to-[#C8962C]/10 border border-[#FFD700]/30 rounded-xl p-6">
          <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FFD700]" />
            Subscription Benefits
          </h3>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#39FF14]/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-[#39FF14]" />
              </div>
              <p className="text-white/80">Unlock all premium photos & videos</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#39FF14]/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-[#39FF14]" />
              </div>
              <p className="text-white/80">Exclusive content updates</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#39FF14]/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-[#39FF14]" />
              </div>
              <p className="text-white/80">Direct messaging priority</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#39FF14]/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-[#39FF14]" />
              </div>
              <p className="text-white/80">Support the creator directly</p>
            </div>
          </div>

          <Button
            onClick={() => subscribeMutation.mutate()}
            disabled={subscribeMutation.isPending}
            className="w-full bg-gradient-to-r from-[#FFD700] to-[#C8962C] text-black font-black uppercase text-lg py-6 hover:opacity-90"
          >
            <Crown className="w-5 h-5 mr-2" />
            Subscribe
          </Button>
        </div>
      )}

      {/* Premium Bio */}
      {user?.bio && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-3">About</h3>
          <p className="text-white/80 leading-relaxed">{user.bio}</p>
        </div>
      )}

      {/* Exclusive Perks (for subscribers) */}
      {isSubscribed && !isOwnProfile && (
        <div className="bg-gradient-to-r from-[#39FF14]/10 to-[#00D9FF]/10 border border-[#39FF14]/30 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-[#39FF14] mb-4 flex items-center gap-2">
            <Gift className="w-4 h-4" />
            Your Subscriber Perks
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-black/30 border border-white/10 text-center">
              <Unlock className="w-6 h-6 mx-auto mb-2 text-[#39FF14]" />
              <p className="text-xs font-bold uppercase">All Content Unlocked</p>
            </div>
            <div className="p-3 bg-black/30 border border-white/10 text-center">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-[#C8962C]" />
              <p className="text-xs font-bold uppercase">Priority Messages</p>
            </div>
          </div>
        </div>
      )}

      {/* Mutual Connections */}
      <MutualConnections targetUser={user} currentUser={currentUser} />

      {/* Unlock Modal */}
      <AnimatePresence>
        {showUnlockModal && unlockingPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowUnlockModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-black border-2 border-[#FFD700]/50 rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#FFD700] to-[#C8962C] flex items-center justify-center">
                  <Unlock className="w-8 h-8 text-black" />
                </div>
                <h3 className="text-xl font-black uppercase mb-2">Unlock Premium Content</h3>
                <p className="text-white/60">Unlock this content permanently.</p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-white/30"
                  onClick={() => setShowUnlockModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-[#FFD700] to-[#C8962C] text-black font-black"
                  onClick={() => unlockMutation.mutate({
                    photoId: unlockingPhoto.id,
                    priceXp: unlockingPhoto.price,
                  })}
                  disabled={unlockMutation.isPending}
                >
                  {unlockMutation.isPending ? 'Unlocking...' : 'Unlock Now'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
