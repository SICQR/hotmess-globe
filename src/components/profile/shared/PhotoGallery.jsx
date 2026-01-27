import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Lock, ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { getUserPhotoUrls, isPremiumPhoto, getFallbackAvatarUrl } from '../utils/photoUtils';

/**
 * Enhanced photo gallery component for profile views
 * Features: smooth transitions, fullscreen mode, premium indicators
 */
export default function PhotoGallery({ user, title = 'Photos', maxSlots = 5 }) {
  const photoUrls = getUserPhotoUrls(user, maxSlots);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const activePhotoIndex = previewPhotoIndex === null ? selectedPhotoIndex : previewPhotoIndex;
  const activeUrl = photoUrls[activePhotoIndex] || null;
  const activeIsPremium = isPremiumPhoto(user, activePhotoIndex);
  const fallbackAvatar = getFallbackAvatarUrl(user?.full_name);
  const mainUrl = activeUrl || fallbackAvatar;
  
  const totalPhotos = photoUrls.filter(Boolean).length;
  
  const goToPhoto = (index) => {
    const maxIndex = photoUrls.length - 1;
    if (index < 0) setSelectedPhotoIndex(maxIndex);
    else if (index > maxIndex) setSelectedPhotoIndex(0);
    else setSelectedPhotoIndex(index);
    setPreviewPhotoIndex(null);
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm uppercase tracking-wider text-white/40 font-bold">{title}</h3>
          <span className="text-xs text-white/30">{totalPhotos} / {maxSlots}</span>
        </div>

        {/* Main Photo */}
        <div className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/40 group">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePhotoIndex}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              {activeIsPremium ? (
                <div className="w-full h-full bg-gradient-to-br from-yellow-500/10 via-pink-500/10 to-purple-500/10 flex items-center justify-center">
                  <motion.div 
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="text-center p-6"
                  >
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-yellow-500/30 to-orange-500/30 flex items-center justify-center">
                      <Lock className="w-8 h-8 text-yellow-400" />
                    </div>
                    <div className="flex items-center justify-center gap-1 text-yellow-400">
                      <Crown className="w-4 h-4" />
                      <span className="text-sm font-black uppercase tracking-wider">Premium Photo</span>
                    </div>
                    <p className="text-xs text-white/40 mt-2">Unlock to view</p>
                  </motion.div>
                </div>
              ) : (
                <img 
                  src={mainUrl} 
                  alt="Profile photo" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Overlay */}
          {totalPhotos > 1 && (
            <>
              {/* Photo Dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {photoUrls.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToPhoto(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === activePhotoIndex 
                        ? 'w-6 bg-white' 
                        : 'w-1.5 bg-white/40 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>

              {/* Arrow Navigation */}
              <button
                onClick={() => goToPhoto(selectedPhotoIndex - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => goToPhoto(selectedPhotoIndex + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </>
          )}

          {/* Fullscreen Button */}
          {!activeIsPremium && activeUrl && (
            <button
              onClick={() => setIsFullscreen(true)}
              className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
            >
              <Maximize2 className="w-4 h-4 text-white" />
            </button>
          )}
        </div>

        {/* Thumbnails */}
        <div className="mt-3 grid grid-cols-5 gap-2">
          {Array.from({ length: maxSlots }).map((_, slotIdx) => {
            const url = photoUrls[slotIdx] || null;
            const premium = isPremiumPhoto(user, slotIdx);
            const isActive = slotIdx === activePhotoIndex;

            return (
              <motion.button
                key={slotIdx}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                className={`
                  relative aspect-square overflow-hidden rounded-lg 
                  transition-all duration-200
                  ${isActive 
                    ? 'ring-2 ring-[#E62020] ring-offset-2 ring-offset-black' 
                    : 'border border-white/10 hover:border-white/30'
                  }
                  ${!url ? 'opacity-40' : ''}
                `}
                onMouseEnter={() => url && setPreviewPhotoIndex(slotIdx)}
                onMouseLeave={() => setPreviewPhotoIndex(null)}
                onClick={() => url && goToPhoto(slotIdx)}
                disabled={!url}
              >
                {premium ? (
                  <div className="w-full h-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                    <Lock className="w-3 h-3 text-yellow-400" />
                  </div>
                ) : url ? (
                  <img 
                    src={url} 
                    alt="" 
                    className="w-full h-full object-cover" 
                    loading="lazy" 
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-white/5 to-black/20" />
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {isFullscreen && !activeIsPremium && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setIsFullscreen(false)}
          >
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={mainUrl}
              alt="Fullscreen photo"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            
            {/* Fullscreen Navigation */}
            {totalPhotos > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); goToPhoto(selectedPhotoIndex - 1); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); goToPhoto(selectedPhotoIndex + 1); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
