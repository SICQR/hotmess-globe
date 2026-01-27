import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Crown, Lock, Unlock, Star, Heart, Users, Sparkles, Gift, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import MutualConnections from './MutualConnections';
import TierSelector, { TierBadge } from './TierSelector';
import { getUserPhotoUrls } from './utils/photoUtils';

const getPhotoMetadata = (user, idx) => {
  const photos = Array.isArray(user?.photos) ? user.photos : [];
  const p = photos[idx];
  if (!p || typeof p !== 'object') return { isPremium: false, price: 0 };
  return {
    isPremium: !!(p.is_premium || p.isPremium || p.premium),
    price: p.price_xp || p.priceXp || p.price || 100,
    id: p.id || `photo-${idx}`,
  };
};

export default function PremiumProfileView({ user, currentUser, isOwnProfile }) {
  const queryClient = useQueryClient();
  const [unlocking, setUnlocking] = useState(null);
  const [selectedTier, setSelectedTier] = useState('premium');
  const [showTierSelector, setShowTierSelector] = useState(false);

  const photoUrls = getUserPhotoUrls(user, 10);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState(null);
  const activePhotoIndex = previewPhotoIndex === null ? selectedPhotoIndex : previewPhotoIndex;
  const activeUrl = photoUrls[activePhotoIndex] || null;
  const activeMetadata = getPhotoMetadata(user, activePhotoIndex);
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(String(user?.full_name || 'User'))}&size=512&background=111111&color=ffffff`;
  const mainUrl = activeUrl || fallbackAvatar;

  // Check if viewer is subscribed to this creator
  const { data: subscription } = useQuery({
    queryKey: ['subscription', currentUser?.email, user?.email],
    queryFn: async () => {
      const subs = await base44.entities.Subscription?.filter?.({
        subscriber_email: currentUser.email,
        creator_email: user.email,
        status: 'active',
      });
      return subs?.[0] || null;
    },
    enabled: !!currentUser?.email && !!user?.email && !isOwnProfile,
  });

  // Fetch individual content unlocks
  const { data: unlocks = [] } = useQuery({
    queryKey: ['premium-unlocks', currentUser?.email, user?.email],
    queryFn: async () => {
      const allUnlocks = await base44.entities.PremiumUnlock?.filter?.({
        user_email: currentUser.email,
        owner_email: user.email,
      });
      return allUnlocks || [];
    },
    enabled: !!currentUser?.email && !!user?.email && !isOwnProfile,
  });

  // Fetch subscriber count for this creator
  const { data: subscriberCount = 0 } = useQuery({
    queryKey: ['subscriber-count', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.Subscription?.filter?.({
        creator_email: user.email,
        status: 'active',
      });
      return subs?.length || 0;
    },
    enabled: !!user?.email,
  });

  const isSubscribed = !!subscription;
  const currentSubscriptionTier = subscription?.tier || null;
  const tierPrices = user?.subscription_tier_prices || { basic: 500, premium: 1000, vip: 2500 };
  const tierPerks = user?.subscription_tier_perks || {
    basic: ['Access to basic premium content', 'Monthly exclusive updates'],
    premium: ['Access to all premium content', 'Direct messaging priority', 'Weekly exclusive content'],
    vip: ['Access to all content', '1-on-1 chat sessions', 'Behind-the-scenes access', 'Custom content requests'],
  };
  const subscriptionPrice = tierPrices[selectedTier] || user?.subscription_price_xp || 500;

  // Check if a specific photo is unlocked
  const isPhotoUnlocked = (photoIdx) => {
    if (isOwnProfile) return true;
    if (isSubscribed) return true;
    const metadata = getPhotoMetadata(user, photoIdx);
    if (!metadata.isPremium) return true;
    return unlocks.some((u) => u.item_id === metadata.id && u.unlock_type === 'photo');
  };

  const activeIsUnlocked = isPhotoUnlocked(activePhotoIndex);

  // Unlock content mutation
  const unlockMutation = useMutation({
    mutationFn: async ({ itemId, unlockType, price }) => {
      const res = await fetch('/api/premium/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_email: user.email,
          unlock_type: unlockType,
          item_id: itemId,
          price_xp: price,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to unlock content');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Content unlocked!');
      queryClient.invalidateQueries(['premium-unlocks', currentUser?.email, user?.email]);
      queryClient.invalidateQueries(['current-user']);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to unlock content');
    },
  });

  // Subscribe mutation with tier support
  const subscribeMutation = useMutation({
    mutationFn: async (tier) => {
      const tierPrice = tierPrices[tier] || subscriptionPrice;
      const res = await fetch('/api/premium/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_email: user.email,
          price_xp: tierPrice,
          tier,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to subscribe');
      }
      return res.json();
    },
    onSuccess: (data, tier) => {
      const action = currentSubscriptionTier ? 'Subscription updated' : 'Subscribed';
      toast.success(`${action} to ${tier} tier!`);
      queryClient.invalidateQueries(['subscription', currentUser?.email, user?.email]);
      queryClient.invalidateQueries(['current-user']);
      setShowTierSelector(false);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to subscribe');
    },
  });

  const handleUnlock = async (photoIdx) => {
    const metadata = getPhotoMetadata(user, photoIdx);
    if (!metadata.isPremium) return;
    
    setUnlocking(photoIdx);
    try {
      await unlockMutation.mutateAsync({
        itemId: metadata.id,
        unlockType: 'photo',
        price: metadata.price,
      });
    } finally {
      setUnlocking(null);
    }
  };

  const handleSubscribe = (tier) => {
    setSelectedTier(tier);
    subscribeMutation.mutate(tier);
  };

  // Premium content stats
  const premiumPhotos = photoUrls.filter((_, idx) => getPhotoMetadata(user, idx).isPremium);
  const publicPhotos = photoUrls.filter((_, idx) => !getPhotoMetadata(user, idx).isPremium);

  // Exclusive perks list
  const perks = Array.isArray(user?.premium_perks) ? user.premium_perks : [
    'Access to all premium photos & videos',
    'Exclusive updates and content',
    'Direct messaging priority',
    'Behind-the-scenes content',
  ];

  return (
    <div className="space-y-6">
      {/* Photo Gallery */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#FFD700]" />
          Premium Gallery
        </h3>

        {/* Main Photo */}
        <div className="relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-black/30">
          {activeMetadata.isPremium && !activeIsUnlocked ? (
            <div className="w-full h-full relative">
              {/* Blurred background */}
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ 
                  backgroundImage: `url(${mainUrl})`,
                  filter: 'blur(20px) brightness(0.5)',
                }}
              />
              {/* Lock overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/20 to-[#E62020]/20 flex items-center justify-center">
                <div className="text-center p-6">
                  <Lock className="w-12 h-12 mx-auto mb-4 text-[#FFD700]" />
                  <div className="text-lg font-black text-[#FFD700] uppercase mb-2">Premium Content</div>
                  <div className="text-sm text-white/60 mb-4">
                    {isSubscribed ? 'Loading...' : `Unlock for ${activeMetadata.price} XP`}
                  </div>
                  {!isOwnProfile && !isSubscribed && (
                    <Button
                      onClick={() => handleUnlock(activePhotoIndex)}
                      disabled={unlocking === activePhotoIndex}
                      className="bg-[#FFD700] text-black hover:bg-[#FFD700]/80 font-bold"
                    >
                      <Unlock className="w-4 h-4 mr-2" />
                      {unlocking === activePhotoIndex ? 'Unlocking...' : `Unlock (${activeMetadata.price} XP)`}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <img src={mainUrl} alt="Profile photo" className="w-full h-full object-cover" />
          )}
        </div>

        {/* Thumbnails */}
        <div className="mt-3 grid grid-cols-4 gap-3">
          {Array.from({ length: Math.min(4, photoUrls.length - 1) }).map((_, slotIdx) => {
            const photoIdx = slotIdx + 1;
            const url = photoUrls[photoIdx] || null;
            const metadata = getPhotoMetadata(user, photoIdx);
            const unlocked = isPhotoUnlocked(photoIdx);

            return (
              <button
                key={photoIdx}
                type="button"
                className="relative aspect-square overflow-hidden rounded-md border border-white/10 bg-black/30 hover:border-white/25 transition-colors disabled:opacity-60"
                onMouseEnter={() => setPreviewPhotoIndex(photoIdx)}
                onMouseLeave={() => setPreviewPhotoIndex(null)}
                onFocus={() => setPreviewPhotoIndex(photoIdx)}
                onBlur={() => setPreviewPhotoIndex(null)}
                onClick={() => {
                  if (!url) return;
                  setSelectedPhotoIndex(photoIdx);
                  setPreviewPhotoIndex(null);
                }}
                disabled={!url}
                aria-label={url ? `View photo ${photoIdx + 1}` : `Empty photo slot ${photoIdx + 1}`}
              >
                {metadata.isPremium && !unlocked ? (
                  <div className="w-full h-full relative">
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ 
                        backgroundImage: url ? `url(${url})` : undefined,
                        filter: 'blur(8px) brightness(0.4)',
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/30 to-[#E62020]/30 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-[#FFD700]" />
                    </div>
                  </div>
                ) : url ? (
                  <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-white/10 to-black/30" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subscription CTA - Multi-Tier */}
      {!isOwnProfile && !isSubscribed && (
        <div className="bg-gradient-to-br from-[#FFD700]/10 to-[#E62020]/10 border-2 border-[#FFD700]/40 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#FFD700] to-[#E62020] rounded-full flex items-center justify-center flex-shrink-0">
              <Crown className="w-7 h-7 text-black" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-[#FFD700] uppercase">Subscribe for Full Access</h3>
              <p className="text-sm text-white/60 mt-1">
                Get exclusive access to premium content from {user?.full_name}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTierSelector(!showTierSelector)}
              className="text-white/60 hover:text-white"
            >
              {showTierSelector ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </Button>
          </div>

          {showTierSelector ? (
            <TierSelector
              tierPrices={tierPrices}
              tierPerks={tierPerks}
              selectedTier={selectedTier}
              onSelectTier={setSelectedTier}
              currentTier={null}
              onSubscribe={handleSubscribe}
              isSubscribing={subscribeMutation.isPending}
              creatorName={user?.full_name}
            />
          ) : (
            <div className="flex items-center gap-4">
              <Button
                onClick={() => handleSubscribe('premium')}
                disabled={subscribeMutation.isPending}
                className="bg-gradient-to-r from-[#FFD700] to-[#E62020] text-black hover:opacity-90 font-bold"
              >
                <Crown className="w-4 h-4 mr-2" />
                {subscribeMutation.isPending ? 'Subscribing...' : `Subscribe (${tierPrices.premium} XP/month)`}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowTierSelector(true)}
                className="border-white/20 text-white/70 hover:text-white hover:border-white/40"
              >
                View All Tiers
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Upgrade/Manage Subscription (for existing subscribers) */}
      {isSubscribed && currentSubscriptionTier !== 'vip' && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TierBadge tier={currentSubscriptionTier || 'basic'} />
              <span className="text-sm text-white/60">Upgrade for more benefits</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTierSelector(!showTierSelector)}
              className="border-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700]/10"
            >
              {showTierSelector ? 'Hide' : 'Upgrade'}
            </Button>
          </div>
          
          {showTierSelector && (
            <div className="mt-4">
              <TierSelector
                tierPrices={tierPrices}
                tierPerks={tierPerks}
                selectedTier={selectedTier}
                onSelectTier={setSelectedTier}
                currentTier={currentSubscriptionTier}
                onSubscribe={handleSubscribe}
                isSubscribing={subscribeMutation.isPending}
                creatorName={user?.full_name}
              />
            </div>
          )}
        </div>
      )}

      {/* Subscriber Badge (if subscribed) */}
      {isSubscribed && (
        <div className="bg-gradient-to-r from-[#39FF14]/10 to-[#00D9FF]/10 border border-[#39FF14]/30 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-[#39FF14] rounded-full flex items-center justify-center">
            <Heart className="w-6 h-6 text-black fill-black" />
          </div>
          <div>
            <h4 className="font-bold text-[#39FF14]">You&apos;re Subscribed!</h4>
            <p className="text-xs text-white/60">You have full access to all premium content</p>
          </div>
        </div>
      )}

      {/* Premium Bio */}
      {(user?.bio || user?.premium_bio) && (
        <div className="bg-white/5 border border-[#FFD700]/20 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-[#FFD700] mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4" />
            About
          </h3>
          <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
            {user.premium_bio || user.bio}
          </p>
        </div>
      )}

      {/* Premium Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Users className="w-6 h-6 mx-auto mb-2 text-[#FFD700]" />
          <div className="text-2xl font-black">{subscriberCount}</div>
          <div className="text-xs text-white/40 uppercase">Subscribers</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Sparkles className="w-6 h-6 mx-auto mb-2 text-[#E62020]" />
          <div className="text-2xl font-black">{premiumPhotos.length}</div>
          <div className="text-xs text-white/40 uppercase">Exclusive</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Eye className="w-6 h-6 mx-auto mb-2 text-[#00D9FF]" />
          <div className="text-2xl font-black">{publicPhotos.length}</div>
          <div className="text-xs text-white/40 uppercase">Public</div>
        </div>
      </div>

      {/* Exclusive Perks */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
          <Gift className="w-4 h-4" />
          Subscriber Perks
        </h3>
        <ul className="space-y-3">
          {perks.map((perk, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <Star className="w-4 h-4 text-[#FFD700] mt-0.5 flex-shrink-0" />
              <span className="text-sm text-white/80">{perk}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Mutual Connections */}
      <MutualConnections targetUser={user} currentUser={currentUser} />
    </div>
  );
}
