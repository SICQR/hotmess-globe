import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Crown, Palette } from 'lucide-react';
import QuickActions from './QuickActions';
import BadgeDisplay from './BadgeDisplay';
import { buildUberDeepLink } from '@/utils/uberDeepLink';
import { Button } from '@/components/ui/button';
import { buildProfileRecText, recommendTravelModes } from '@/utils/travelRecommendations';
import { useNavigate } from 'react-router-dom';
import { Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { uploadToStorage, insertProfilePhoto } from '@/lib/uploadToStorage';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function ProfileHeader({ profileUser: user, isOwnProfile, currentUser, travelEtas }) {
  const navigate = useNavigate();
  const profileType = user?.profile_type || user?.business_type || 'standard';
  const themeGradient = {
    'default': 'from-[#C8962C] to-[#C8962C]',
    'cyber': 'from-[#00C2E0] to-[#39FF14]',
    'sunset': 'from-[#FF6B35] to-[#FFEB3B]',
    'midnight': 'from-[#1a1a2e] to-[#16213e]',
    'neon': 'from-[#C8962C] to-[#00C2E0]'
  }[user?.profile_theme || 'default'];

  const profileTypeConfig = {
    'standard': { icon: null, badge: null },
    'seller': { 
      icon: <ShoppingBag className="w-5 h-5" />, 
      badge: user?.verified_seller ? '✓ VERIFIED SELLER' : 'SELLER',
      color: '#00C2E0'
    },
    'premium': { 
      icon: <Crown className="w-5 h-5" />, 
      badge: '💎 PREMIUM',
      gradient: 'from-[#C8962C] to-[#D4A84B]'
    },
    'creator': { 
      icon: <Palette className="w-5 h-5" />, 
      badge: '🎨 CREATOR',
      color: '#C8962C'
    }
  };

  const config = profileTypeConfig[profileType];

  const formatEta = (eta) => {
    const seconds = eta?.duration_seconds;
    if (!Number.isFinite(seconds)) return null;
    return `${Math.max(1, Math.round(seconds / 60))}m`;
  };

  const walkEta = formatEta(travelEtas?.walk);
  const driveEta = formatEta(travelEtas?.drive);
  const bikeEta = formatEta(travelEtas?.bicycle);
  const hasAnyEta = !!walkEta || !!driveEta || !!bikeEta;

  const etaToSeconds = (eta) => {
    const seconds = eta?.duration_seconds;
    return Number.isFinite(seconds) ? Number(seconds) : null;
  };

  const recommendations = (() => {
    const viewerText = buildProfileRecText(currentUser);
    const targetText = buildProfileRecText(user);
    return recommendTravelModes({
      viewerText,
      targetText,
      seconds: {
        foot: etaToSeconds(travelEtas?.walk),
        cab: etaToSeconds(travelEtas?.drive),
        bike: etaToSeconds(travelEtas?.bicycle),
        uber: etaToSeconds(travelEtas?.drive),
      },
    });
  })();

  const orderedModes = (() => {
    const base = ['foot', 'cab', 'bike', 'uber'];
    const rec = Array.isArray(recommendations?.order) ? recommendations.order : base;
    const filtered = rec.filter((k) => base.includes(k));
    base.forEach((k) => {
      if (!filtered.includes(k)) filtered.push(k);
    });
    return filtered.slice(0, 4);
  })();

  const primaryMode = orderedModes[0] || null;

  const recommendedLabel = (() => {
    if (!primaryMode) return null;
    const label = primaryMode === 'foot' ? 'Foot' : primaryMode === 'cab' ? 'Cab' : primaryMode === 'bike' ? 'Bike' : 'Uber';
    const eta = primaryMode === 'foot' ? walkEta : primaryMode === 'cab' ? driveEta : primaryMode === 'bike' ? bikeEta : driveEta;
    return `Recommended: ${label}${eta ? ` ${eta}` : ''}`;
  })();

  const dropoffLat = Number.isFinite(user?.last_lat) ? user.last_lat : user?.lat;
  const dropoffLng = Number.isFinite(user?.last_lng) ? user.last_lng : user?.lng;
  const uberUrl = buildUberDeepLink({
    dropoffLat,
    dropoffLng,
    dropoffNickname: user?.username || user?.display_name,
  });

  const canDirections = Number.isFinite(dropoffLat) && Number.isFinite(dropoffLng);
  const openInAppDirections = (mode) => {
    if (!canDirections) return;
    const qs = new URLSearchParams();
    qs.set('lat', String(dropoffLat));
    qs.set('lng', String(dropoffLng));
    if (user?.username || user?.display_name) qs.set('label', String(user.username || user.display_name));
    qs.set('mode', mode);
    navigate(`/directions?${qs.toString()}`);
  };

  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef(null);

  const handleAvatarClick = () => {
    if (isOwnProfile && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;

    setIsUploading(true);
    const toastId = toast.loading('Uploading photo...');

    try {
      // 1. Upload to storage
      const url = await uploadToStorage(file, 'avatars', currentUser.id);
      
      // 2. Update profiles table and profile_photos
      await insertProfilePhoto(currentUser.id, url, 0, true);
      
      // 3. Invalidate queries to refresh UI everywhere
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profile-user-by-param'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      
      toast.success('Profile photo updated!', { id: toastId });
    } catch (err) {
      console.error('[ProfileHeader] Upload failed:', err);
      toast.error(err?.message || 'Failed to upload photo', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`relative h-80 border-b border-white/10 bg-gradient-to-br ${themeGradient}/20`}>
      {/* Banner for sellers */}
      {profileType === 'seller' && user?.shop_banner_url && (
        <img 
          src={user.shop_banner_url} 
          alt="Shop banner" 
          className="absolute inset-0 w-full h-full object-cover opacity-30" 
        />
      )}

      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`relative w-32 h-32 bg-gradient-to-br ${themeGradient} flex items-center justify-center border-4 border-white shadow-2xl overflow-hidden ${isOwnProfile ? 'cursor-pointer group' : ''}`}
            onClick={handleAvatarClick}
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.username || 'Profile'} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
            ) : (
              <span className="text-5xl font-bold">{user?.username?.[0] || user?.display_name?.[0] || 'U'}</span>
            )}

            {isOwnProfile && (
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex flex-col items-center justify-center text-white">
                {isUploading ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <div className="flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 mb-1" />
                    <span className="text-[10px] font-black uppercase">Change</span>
                  </div>
                )}
              </div>
            )}

            {isOwnProfile && !isUploading && (
              <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-black md:hidden">
                <Camera className="w-4 h-4" />
              </div>
            )}
            
            {isOwnProfile && (
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            )}
          </motion.div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-4xl md:text-6xl font-black">{user?.username || user?.display_name || 'Anonymous'}</h1>
              
              {/* Profile Type Badge */}
              {config.badge && (
                <span 
                  className={`px-2 py-1 text-xs font-black uppercase ${
                    config.gradient 
                      ? `bg-gradient-to-r ${config.gradient} text-black`
                      : 'text-white'
                  }`}
                  style={config.color && !config.gradient ? { backgroundColor: config.color, color: '#000' } : {}}
                >
                  {config.badge}
                </span>
              )}
            </div>

            {/* Badges */}
            <div className="mb-3">
              <BadgeDisplay userEmail={user?.email} />
            </div>

            {/* Seller Tagline */}
            {profileType === 'seller' && user?.seller_tagline && (
              <p className="text-[#00C2E0] text-lg font-bold mb-2">{user.seller_tagline}</p>
            )}

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
              <span className="text-white/60">{user?.city}</span>

              {!isOwnProfile && (hasAnyEta || !!uberUrl) && (
                <span className="inline-block">
                  {recommendedLabel && (
                    <div className="mb-1 text-[11px] text-white/70">{recommendedLabel}</div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {orderedModes
                      .filter((mode) => {
                        if (mode === 'foot') return canDirections;
                        if (mode === 'cab') return canDirections;
                        if (mode === 'bike') return canDirections;
                        return !!uberUrl;
                      })
                      .map((mode) => {
                        const isPrimary = mode === primaryMode;
                        const label = mode === 'foot' ? 'Foot' : mode === 'cab' ? 'Cab' : mode === 'bike' ? 'Bike' : 'Uber';
                        const eta = mode === 'foot' ? (walkEta || '—') : mode === 'cab' ? (driveEta || '—') : mode === 'bike' ? (bikeEta || '—') : (driveEta || '—');
                        const onClick = () => {
                          if (mode === 'uber') {
                            if (!uberUrl) return;
                            window.open(uberUrl, '_blank', 'noopener,noreferrer');
                            return;
                          }
                          openInAppDirections(mode);
                        };

                        return (
                          <Button
                            key={mode}
                            type="button"
                            variant={isPrimary ? 'default' : 'outline'}
                            size="sm"
                            onClick={onClick}
                            className={
                              isPrimary
                                ? 'bg-white/90 text-black hover:bg-white'
                                : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                            }
                          >
                            <span className="flex w-full items-center justify-between gap-2">
                              <span>{label}</span>
                              <span className="font-mono">{eta}</span>
                            </span>
                          </Button>
                        );
                      })}
                  </div>
                </span>
              )}
              
              {profileType === 'seller' ? (
                <>
                  <span className="text-[#39FF14] font-mono">
                    ★ {user?.seller_rating?.toFixed(1) || 'New'}
                  </span>
                  <span className="text-white/60">{user?.total_sales || 0} sales</span>
                </>
              ) : null}

              {user?.availability_status && user.availability_status !== 'offline' && (
                <span className={`px-2 py-1 text-xs font-bold uppercase ${
                  user.availability_status === 'available' ? 'bg-[#39FF14] text-black' :
                  user.availability_status === 'busy' ? 'bg-[#FF6B35] text-black' :
                  user.availability_status === 'away' ? 'bg-[#FFEB3B] text-black' :
                  'bg-[#C8962C] text-black'
                }`}>
                  {user.availability_status.replace('_', ' ')}
                </span>
              )}
            </div>

            {/* Actions */}
            <QuickActions profileUser={user} isOwnProfile={isOwnProfile} currentUser={currentUser} />
          </div>
        </div>
      </div>
    </div>
  );
}
