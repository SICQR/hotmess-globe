import React, { useCallback } from 'react';
import MutualConnections from './MutualConnections';
import { taxonomyConfig } from '../discovery/taxonomyConfig';
import SwipeGesture from '../mobile/SwipeGesture';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const buildTagLabelMap = () => {
  const map = new Map();
  (taxonomyConfig?.tags || []).forEach((t) => {
    if (t?.id) map.set(String(t.id), t);
  });
  return map;
};

const TAG_BY_ID = buildTagLabelMap();

export default function StandardProfileView({ user, currentUser, isHandshakeConnection, isOwnProfile }) {
  const tagIds = Array.isArray(user?.tag_ids)
    ? user.tag_ids
    : Array.isArray(user?.tags)
      ? user.tags
      : [];

  const normalizedTagIds = tagIds
    .map((t) => String(t || '').trim())
    .filter(Boolean);

  const tagged = normalizedTagIds
    .map((id) => {
      const tag = TAG_BY_ID.get(id);
      return {
        id,
        label: tag?.label || id,
        isSensitive: !!tag?.isSensitive,
      };
    });

  const canSeeSensitiveTags = !!isOwnProfile || !!isHandshakeConnection;
  const safeTags = tagged.filter((t) => !t.isSensitive);
  const sensitiveTags = tagged.filter((t) => t.isSensitive);
  const visibleSensitive = canSeeSensitiveTags ? sensitiveTags : [];
  const hiddenSensitiveCount = canSeeSensitiveTags ? 0 : sensitiveTags.length;

  const photos = Array.isArray(user?.photos) ? user.photos.slice(0, 10) : [];

  const photoUrls = (() => {
    const urls = [];
    const push = (value) => {
      const url = typeof value === 'string' ? value.trim() : '';
      if (!url) return;
      if (urls.includes(url)) return;
      urls.push(url);
    };

    // Always prefer explicit avatar first if present.
    push(user?.avatar_url);
    push(user?.avatarUrl);

    // Canonical: photos array (strings or objects)
    for (const item of photos) {
      if (!item) continue;
      if (typeof item === 'string') push(item);
      else if (typeof item === 'object') push(item.url || item.file_url || item.href);
    }

    // Back-compat: photo_urls array
    const more = Array.isArray(user?.photo_urls) ? user.photo_urls : [];
    for (const u of more) push(u);

    // Back-compat: images array
    const images = Array.isArray(user?.images) ? user.images : [];
    for (const img of images) {
      if (!img) continue;
      if (typeof img === 'string') push(img);
      else if (typeof img === 'object') push(img.url || img.src || img.file_url || img.href);
    }

    return urls.slice(0, 5);
  })();

  const isPremiumPhoto = (idx) => {
    const p = photos[idx];
    if (!p || typeof p !== 'object') return false;
    return !!(p.is_premium || p.isPremium || p.premium);
  };

  const [selectedPhotoIndex, setSelectedPhotoIndex] = React.useState(0);
  const [previewPhotoIndex, setPreviewPhotoIndex] = React.useState(null);

  const activePhotoIndex = previewPhotoIndex === null ? selectedPhotoIndex : previewPhotoIndex;
  const activeUrl = photoUrls[activePhotoIndex] || null;
  const activeIsPremium = isPremiumPhoto(activePhotoIndex);

  // Photo navigation
  const totalPhotos = photoUrls.length;
  const goToPrevPhoto = useCallback(() => {
    setSelectedPhotoIndex((i) => Math.max(0, i - 1));
    setPreviewPhotoIndex(null);
  }, []);
  const goToNextPhoto = useCallback(() => {
    setSelectedPhotoIndex((i) => Math.min(totalPhotos - 1, i + 1));
    setPreviewPhotoIndex(null);
  }, [totalPhotos]);

  // Tap-to-navigate: tap left side = prev, tap right side = next
  const handlePhotoTap = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    if (x < width / 3) {
      goToPrevPhoto();
    } else if (x > (width * 2) / 3) {
      goToNextPhoto();
    }
  }, [goToPrevPhoto, goToNextPhoto]);

  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(String(user?.full_name || 'User'))}&size=512&background=111111&color=ffffff`;
  const mainUrl = activeUrl || fallbackAvatar;
  const preferredVibes = Array.isArray(user?.preferred_vibes) ? user.preferred_vibes : [];
  const skills = Array.isArray(user?.skills) ? user.skills : [];
  const musicTaste = Array.isArray(user?.music_taste) ? user.music_taste : [];

  return (
    <div className="space-y-6">
      {/* Photo Gallery */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4">Photos</h3>

        {/* Main photo with swipe/tap navigation */}
        <SwipeGesture
          onSwipeLeft={goToNextPhoto}
          onSwipeRight={goToPrevPhoto}
          threshold={40}
          className="relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-black/30 cursor-pointer select-none"
        >
          <div onClick={handlePhotoTap} className="w-full h-full">
            {activeIsPremium ? (
              <div className="w-full h-full bg-gradient-to-br from-[#FFD700]/15 to-[#FF1493]/15 border border-[#FFD700]/40 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl mb-2">🔒</div>
                  <div className="text-xs text-[#FFD700] font-black uppercase">Premium</div>
                </div>
              </div>
            ) : (
              <img src={mainUrl} alt="Profile photo" className="w-full h-full object-cover" draggable={false} />
            )}
          </div>

          {/* Navigation arrows (visible on hover/desktop) */}
          {totalPhotos > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goToPrevPhoto(); }}
                disabled={selectedPhotoIndex === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 items-center justify-center text-white/80 hover:bg-black/70 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hidden md:flex"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goToNextPhoto(); }}
                disabled={selectedPhotoIndex === totalPhotos - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/80 hover:bg-black/70 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hidden md:flex"
                aria-label="Next photo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Photo indicator dots */}
          {totalPhotos > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              {photoUrls.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPhotoIndex(idx);
                    setPreviewPhotoIndex(null);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === selectedPhotoIndex
                      ? 'bg-pink-500 w-4'
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`Go to photo ${idx + 1}`}
                />
              ))}
            </div>
          )}

          {/* Photo counter */}
          {totalPhotos > 1 && (
            <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white/80 text-xs font-bold">
              {selectedPhotoIndex + 1}/{totalPhotos}
            </div>
          )}
        </SwipeGesture>

        {/* 4 other photos: hover to preview, click to select */}
        <div className="mt-3 grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, slotIdx) => {
            const photoIdx = slotIdx + 1;
            const url = photoUrls[photoIdx] || null;
            const premium = isPremiumPhoto(photoIdx);

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
                {premium ? (
                  <div className="w-full h-full bg-gradient-to-br from-[#FFD700]/15 to-[#FF1493]/15 border border-[#FFD700]/40 flex items-center justify-center">
                    <div className="text-xs text-[#FFD700] font-black uppercase">🔒</div>
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

      {/* Tags */}
      {(safeTags.length > 0 || visibleSensitive.length > 0) && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-sm uppercase tracking-wider text-white/40">Tags</h3>
            {hiddenSensitiveCount > 0 && (
              <span className="text-[10px] text-white/40 uppercase">Sensitive tags hidden</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {safeTags.concat(visibleSensitive).slice(0, 14).map((tag) => (
              <span
                key={tag.id}
                className={
                  tag.isSensitive
                    ? 'px-3 py-1 bg-[#FF1493]/15 border border-[#FF1493]/40 text-[#FF1493] text-xs font-bold uppercase'
                    : 'px-3 py-1 bg-[#00D9FF]/15 border border-[#00D9FF]/35 text-[#00D9FF] text-xs font-bold uppercase'
                }
              >
                {tag.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bio */}
      {user?.bio && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-3">About</h3>
          <p className="text-white/80 leading-relaxed">{user.bio}</p>
        </div>
      )}

      {/* Vibes */}
      {preferredVibes.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-3">Vibes</h3>
          <div className="flex flex-wrap gap-2">
            {preferredVibes.slice(0, 8).map((vibe, idx) => (
              <span key={idx} className="px-3 py-1 bg-white/10 border border-white/15 text-white/80 text-xs font-bold uppercase">
                {String(vibe).replaceAll('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-3">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {skills.slice(0, 10).map((skill, idx) => (
              <span key={idx} className="px-3 py-1 bg-[#B026FF]/15 border border-[#B026FF]/35 text-[#D7B8FF] text-xs font-bold uppercase">
                {String(skill)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Music Taste */}
      {musicTaste.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-3">Music Taste</h3>
          <p className="text-white/70 text-sm leading-relaxed">
            {musicTaste.slice(0, 10).join(' • ')}
          </p>
        </div>
      )}

      {/* Interests */}
      {user?.interests && user.interests.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-3">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {user.interests.map((interest, idx) => (
              <span key={idx} className="px-3 py-1 bg-[#00D9FF]/20 border border-[#00D9FF]/40 text-[#00D9FF] text-xs font-bold uppercase">
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Looking For */}
      {user?.looking_for && user.looking_for.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-3">Looking For</h3>
          <div className="flex flex-wrap gap-2">
            {user.looking_for.map((item, idx) => (
              <span key={idx} className="px-3 py-1 bg-[#FF1493]/20 border border-[#FF1493]/40 text-[#FF1493] text-xs font-bold uppercase">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Aftercare Menu - visible only to connections */}
      {isHandshakeConnection && user?.aftercare_menu && user.aftercare_menu.length > 0 && (
        <div className="bg-white/5 border border-[#39FF14]/20 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-[#39FF14] mb-3">Aftercare Menu 🔒</h3>
          <div className="flex flex-wrap gap-2">
            {user.aftercare_menu.map((item, idx) => (
              <span key={idx} className="px-3 py-1 bg-[#39FF14]/20 border border-[#39FF14]/40 text-[#39FF14] text-xs font-bold uppercase">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Dealbreakers */}
      {user?.dealbreakers_text && user.dealbreakers_text.length > 0 && (
        <div className="bg-white/5 border border-red-500/20 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-red-400 mb-3">Dealbreakers</h3>
          <div className="flex flex-wrap gap-2">
            {user.dealbreakers_text.map((item, idx) => (
              <span key={idx} className="px-3 py-1 bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold uppercase">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Mutual Connections */}
      <MutualConnections targetUser={user} currentUser={currentUser} />
    </div>
  );
}