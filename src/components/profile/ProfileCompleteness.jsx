import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, ChevronRight, Zap, Trophy, Music, Calendar, Crown, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

// Base checks for all profile types
const getBaseChecks = (user) => [
  { id: 'basic', label: 'Name & Avatar', completed: !!(user.full_name && user.avatar_url), xp: 100 },
  { id: 'bio', label: 'Bio', completed: !!(user.bio && user.bio.length > 10), xp: 75 },
  { id: 'location', label: 'Location', completed: !!user.city, xp: 50 },
  { id: 'interests', label: 'Interests', completed: !!(user.interests && user.interests.length > 0), xp: 100 },
  { id: 'vibes', label: 'Preferred Vibes', completed: !!(user.preferred_vibes && user.preferred_vibes.length > 0), xp: 75 },
  { id: 'music', label: 'Music Taste', completed: !!(user.music_taste && user.music_taste.length > 0), xp: 50 },
];

// Creator-specific checks
const getCreatorChecks = (user) => [
  { 
    id: 'creator_bio', 
    label: 'Creator Bio', 
    completed: !!(user.creator_bio && user.creator_bio.length > 20), 
    xp: 100,
    icon: Music,
  },
  { 
    id: 'soundcloud', 
    label: 'Link SoundCloud', 
    completed: !!(user.social_links?.soundcloud), 
    xp: 150,
    icon: Music,
  },
  { 
    id: 'genres', 
    label: 'Add Genres', 
    completed: !!(user.genres && user.genres.length > 0) || !!(user.music_taste && user.music_taste.length > 2), 
    xp: 75,
    icon: Music,
  },
  { 
    id: 'streaming', 
    label: 'Streaming Links', 
    completed: !!(user.social_links?.spotify || user.social_links?.apple_music || user.social_links?.bandcamp), 
    xp: 100,
    icon: Music,
  },
];

// Organizer-specific checks
const getOrganizerChecks = (user) => [
  { 
    id: 'organizer_bio', 
    label: 'Organizer Bio', 
    completed: !!(user.organizer_bio && user.organizer_bio.length > 20), 
    xp: 100,
    icon: Calendar,
  },
  { 
    id: 'first_event', 
    label: 'Create First Event', 
    completed: !!(user.events_created && user.events_created > 0), 
    xp: 200,
    icon: Calendar,
  },
  { 
    id: 'venue_partnerships', 
    label: 'Add Venue Partners', 
    completed: !!(user.venue_partnerships && user.venue_partnerships.length > 0), 
    xp: 150,
    icon: Calendar,
  },
  { 
    id: 'booking_email', 
    label: 'Booking Contact', 
    completed: !!user.booking_email, 
    xp: 75,
    icon: Calendar,
  },
];

// Premium-specific checks
const getPremiumChecks = (user) => [
  { 
    id: 'premium_bio', 
    label: 'Premium Bio', 
    completed: !!(user.premium_bio && user.premium_bio.length > 20), 
    xp: 100,
    icon: Crown,
  },
  { 
    id: 'premium_content', 
    label: 'Upload Premium Content', 
    completed: !!(user.photos && user.photos.some(p => p?.is_premium || p?.isPremium)), 
    xp: 200,
    icon: Crown,
  },
  { 
    id: 'subscription_price', 
    label: 'Set Subscription Price', 
    completed: !!(user.subscription_price_xp && user.subscription_price_xp > 0), 
    xp: 100,
    icon: Crown,
  },
  { 
    id: 'premium_perks', 
    label: 'Define Perks', 
    completed: !!(user.premium_perks && user.premium_perks.length > 0), 
    xp: 75,
    icon: Crown,
  },
];

// Seller-specific checks
const getSellerChecks = (user) => [
  { 
    id: 'seller_tagline', 
    label: 'Shop Tagline', 
    completed: !!(user.seller_tagline && user.seller_tagline.length > 5), 
    xp: 75,
    icon: ShoppingBag,
  },
  { 
    id: 'seller_bio', 
    label: 'Seller Bio', 
    completed: !!(user.seller_bio && user.seller_bio.length > 20), 
    xp: 100,
    icon: ShoppingBag,
  },
  { 
    id: 'shop_banner', 
    label: 'Shop Banner', 
    completed: !!user.shop_banner_url, 
    xp: 100,
    icon: ShoppingBag,
  },
  { 
    id: 'first_product', 
    label: 'List First Product', 
    completed: !!(user.products_listed && user.products_listed > 0), 
    xp: 200,
    icon: ShoppingBag,
  },
];

export default function ProfileCompleteness({ user }) {
  const profileType = (user?.profile_type || 'standard').toLowerCase();

  const checks = useMemo(() => {
    const baseChecks = getBaseChecks(user);
    
    switch (profileType) {
      case 'creator':
        return [...baseChecks, ...getCreatorChecks(user)];
      case 'organizer':
        return [...baseChecks, ...getOrganizerChecks(user)];
      case 'premium':
        return [...baseChecks, ...getPremiumChecks(user)];
      case 'seller':
        return [...baseChecks, ...getSellerChecks(user)];
      default:
        return baseChecks;
    }
  }, [user, profileType]);

  const completedCount = checks.filter(c => c.completed).length;
  const percentage = Math.round((completedCount / checks.length) * 100);
  const totalXP = checks.reduce((sum, c) => sum + c.xp, 0);
  const earnedXP = checks.filter(c => c.completed).reduce((sum, c) => sum + c.xp, 0);
  const isComplete = percentage === 100;

  const profileTypeLabel = {
    creator: 'Creator',
    organizer: 'Organizer',
    premium: 'Premium',
    seller: 'Seller',
    standard: 'Standard',
  }[profileType] || 'Standard';

  const profileTypeColor = {
    creator: '#B026FF',
    organizer: '#FF6B35',
    premium: '#FFD700',
    seller: '#00D9FF',
    standard: '#E62020',
  }[profileType] || '#E62020';

  if (isComplete) {
    return null; // Don't show if profile is 100% complete
  }

  // Split checks into base and type-specific for display
  const baseChecks = checks.slice(0, 6);
  const typeChecks = checks.slice(6);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-[#E62020]/20 to-[#B026FF]/20 border-2 border-[#E62020]/40 p-6 mb-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-black uppercase mb-1">Complete Your Profile</h3>
          <div className="flex items-center gap-3">
            <p className="text-xs text-white/60">
              {percentage}% complete
            </p>
            {profileType !== 'standard' && (
              <span 
                className="text-xs font-bold uppercase px-2 py-0.5 rounded"
                style={{ backgroundColor: `${profileTypeColor}30`, color: profileTypeColor, border: `1px solid ${profileTypeColor}` }}
              >
                {profileTypeLabel}
              </span>
            )}
            <div className="flex items-center gap-1 px-2 py-0.5 bg-[#FFEB3B]/20 border border-[#FFEB3B] rounded">
              <Zap className="w-3 h-3 text-[#FFEB3B]" />
              <span className="text-xs font-bold text-[#FFEB3B]">{earnedXP}/{totalXP} XP</span>
            </div>
          </div>
        </div>
        <Link to={createPageUrl('EditProfile')}>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-[#E62020] hover:bg-white text-white hover:text-black border-2 border-white font-black text-xs uppercase transition-colors">
            Edit Profile
            <ChevronRight className="w-3 h-3" />
          </button>
        </Link>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-white/10 mb-4">
        <motion.div
          className="h-full bg-gradient-to-r from-[#E62020] to-[#B026FF]"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Base Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {baseChecks.map(check => (
          <div key={check.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {check.completed ? (
                <CheckCircle2 className="w-4 h-4 text-[#39FF14]" />
              ) : (
                <Circle className="w-4 h-4 text-white/20" />
              )}
              <span className={`text-xs ${check.completed ? 'text-white/80' : 'text-white/40'}`}>
                {check.label}
              </span>
            </div>
            <div className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono ${
              check.completed
                ? 'text-[#39FF14]'
                : 'text-white/40'
            }`}>
              {check.completed ? <Trophy className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
              {check.xp}
            </div>
          </div>
        ))}
      </div>

      {/* Type-Specific Checklist */}
      {typeChecks.length > 0 && (
        <>
          <div 
            className="text-xs uppercase tracking-wider mb-2 mt-4 flex items-center gap-2"
            style={{ color: profileTypeColor }}
          >
            {profileTypeLabel} Tasks
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {typeChecks.map(check => {
              const IconComponent = check.icon || Circle;
              return (
                <div key={check.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {check.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-[#39FF14]" />
                    ) : (
                      <IconComponent className="w-4 h-4" style={{ color: profileTypeColor, opacity: 0.5 }} />
                    )}
                    <span className={`text-xs ${check.completed ? 'text-white/80' : 'text-white/40'}`}>
                      {check.label}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono ${
                    check.completed
                      ? 'text-[#39FF14]'
                      : 'text-white/40'
                  }`}>
                    {check.completed ? <Trophy className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
                    {check.xp}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}
