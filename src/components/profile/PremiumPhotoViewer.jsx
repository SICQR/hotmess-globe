import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { 
  Lock, 
  Unlock, 
  Crown, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function PremiumPhotoViewer({ 
  photos = [], 
  profileEmail, 
  profileName,
  unlockPrice = 1000,
  isOwner = false,
  currentUserXp = 0,
}) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const queryClient = useQueryClient();

  // Check if user has unlocked this profile's premium content
  const { data: unlockStatus } = useQuery({
    queryKey: ['premium-unlock', profileEmail],
    queryFn: async () => {
      if (isOwner) return { unlocked: true };
      
      try {
        const unlocks = await base44.entities.PremiumUnlock?.filter({
          profile_email: profileEmail,
        });
        return { unlocked: unlocks?.length > 0 };
      } catch {
        return { unlocked: false };
      }
    },
    enabled: !isOwner,
  });

  const isUnlocked = unlockStatus?.unlocked || isOwner;

  // Separate regular and premium photos
  const regularPhotos = photos.filter(p => !p.is_premium);
  const premiumPhotos = photos.filter(p => p.is_premium);

  // Unlock mutation
  const unlockMutation = useMutation({
    mutationFn: async () => {
      if (currentUserXp < unlockPrice) {
        throw new Error(`Not enough XP. Need ${unlockPrice} XP, you have ${currentUserXp} XP.`);
      }

      const response = await fetch('/api/premium/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_email: profileEmail,
          xp_cost: unlockPrice,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unlock');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['premium-unlock', profileEmail]);
      queryClient.invalidateQueries(['users']);
      setShowUnlockModal(false);
      toast.success('Premium content unlocked!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const openPhoto = (index, isPremium) => {
    if (isPremium && !isUnlocked) {
      setShowUnlockModal(true);
      return;
    }
    setSelectedIndex({ index, isPremium });
  };

  const closeViewer = () => setSelectedIndex(null);

  const navigatePhoto = (direction) => {
    if (!selectedIndex) return;
    
    const photoList = selectedIndex.isPremium ? premiumPhotos : regularPhotos;
    const newIndex = selectedIndex.index + direction;
    
    if (newIndex >= 0 && newIndex < photoList.length) {
      setSelectedIndex({ ...selectedIndex, index: newIndex });
    }
  };

  if (photos.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Regular Photos */}
      {regularPhotos.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-white/60 mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Photos
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {regularPhotos.map((photo, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => openPhoto(idx, false)}
                className="aspect-square relative cursor-pointer overflow-hidden group"
              >
                <img
                  src={photo.url}
                  alt={`Photo ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {photo.is_primary && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-[#E62020] text-black text-[8px] font-black uppercase">
                    Main
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Premium Photos */}
      {premiumPhotos.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-[#FFD700] mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4" />
            Premium Content
            {!isUnlocked && (
              <span className="text-white/40 ml-2">
                • {unlockPrice.toLocaleString()} XP to unlock
              </span>
            )}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {premiumPhotos.map((photo, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => openPhoto(idx, true)}
                className="aspect-square relative cursor-pointer overflow-hidden group"
              >
                {isUnlocked ? (
                  <img
                    src={photo.url}
                    alt={`Premium ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <>
                    {/* Blurred preview */}
                    <img
                      src={photo.url}
                      alt="Premium content"
                      className="w-full h-full object-cover filter blur-xl scale-110"
                    />
                    {/* Lock overlay */}
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#FFD700] to-[#E62020] flex items-center justify-center mb-2">
                        <Lock className="w-6 h-6 text-black" />
                      </div>
                      <span className="text-xs font-bold text-white/80">Premium</span>
                    </div>
                  </>
                )}
                <div className="absolute top-2 right-2">
                  <Crown className="w-4 h-4 text-[#FFD700]" />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Unlock Button */}
          {!isUnlocked && (
            <Button
              onClick={() => setShowUnlockModal(true)}
              className="w-full mt-4 bg-gradient-to-r from-[#FFD700] to-[#E62020] text-black font-bold py-6"
            >
              <Unlock className="w-5 h-5 mr-2" />
              Unlock {premiumPhotos.length} Premium Photo{premiumPhotos.length > 1 ? 's' : ''} • {unlockPrice.toLocaleString()} XP
            </Button>
          )}
        </div>
      )}

      {/* Full Screen Viewer */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={closeViewer}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white z-10"
              onClick={closeViewer}
            >
              <X className="w-6 h-6" />
            </Button>

            {/* Navigation */}
            {selectedIndex.index > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  navigatePhoto(-1);
                }}
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>
            )}

            {selectedIndex.index < (selectedIndex.isPremium ? premiumPhotos : regularPhotos).length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  navigatePhoto(1);
                }}
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            )}

            <motion.img
              key={`${selectedIndex.isPremium}-${selectedIndex.index}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              src={(selectedIndex.isPremium ? premiumPhotos : regularPhotos)[selectedIndex.index]?.url}
              alt="Full size"
              className="max-w-[90vw] max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Premium badge */}
            {selectedIndex.isPremium && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-gradient-to-r from-[#FFD700] to-[#E62020] rounded-full flex items-center gap-2">
                <Crown className="w-4 h-4 text-black" />
                <span className="text-sm font-bold text-black">Premium Content</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unlock Modal */}
      <AnimatePresence>
        {showUnlockModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setShowUnlockModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-black border-2 border-[#FFD700] rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-[#FFD700] to-[#E62020] flex items-center justify-center">
                  <Crown className="w-10 h-10 text-black" />
                </div>
                <h3 className="text-2xl font-black uppercase mb-2">Unlock Premium</h3>
                <p className="text-white/60">
                  Get access to {premiumPhotos.length} exclusive photo{premiumPhotos.length > 1 ? 's' : ''} from {profileName || 'this user'}
                </p>
              </div>

              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/60">Unlock Price</span>
                  <span className="font-bold text-[#FFD700]">{unlockPrice.toLocaleString()} XP</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/60">Your Balance</span>
                  <span className={`font-bold ${currentUserXp >= unlockPrice ? 'text-[#39FF14]' : 'text-red-400'}`}>
                    {currentUserXp.toLocaleString()} XP
                  </span>
                </div>
                {currentUserXp >= unlockPrice && (
                  <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <span className="text-white/60">After Unlock</span>
                    <span className="font-bold">{(currentUserXp - unlockPrice).toLocaleString()} XP</span>
                  </div>
                )}
              </div>

              {currentUserXp < unlockPrice && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6 text-center">
                  <p className="text-red-400 text-sm font-bold">
                    Need {(unlockPrice - currentUserXp).toLocaleString()} more XP
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowUnlockModal(false)}
                  className="flex-1 border-white/20 text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => unlockMutation.mutate()}
                  disabled={currentUserXp < unlockPrice || unlockMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-[#FFD700] to-[#E62020] text-black font-bold"
                >
                  {unlockMutation.isPending ? (
                    'Unlocking...'
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Unlock Now
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
