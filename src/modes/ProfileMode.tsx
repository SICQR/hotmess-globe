/**
 * ProfileMode - User Authority Surface
 * 
 * User settings, safety, listings.
 * Slide-up sheet or immersive mode.
 * No website-style account page stacking.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  User, Settings, Shield, Heart, ShoppingBag, LogOut, 
  ChevronRight, Bell, Lock, Eye, HelpCircle, Star,
  Camera, MapPin, Edit3
} from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { useBootGuard } from '@/contexts/BootGuardContext';
import { getCurrentProfile, getMyListings, type Profile, type Product } from '@/lib/data';
import { ListItemSkeleton } from '@/components/ui/SkeletonLoaders';

interface ProfileModeProps {
  className?: string;
}

export function ProfileMode({ className = '' }: ProfileModeProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { openSheet } = useSheet();
  const { signOut } = useBootGuard();
  const navigate = useNavigate();

  // Load profile data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [profileData, listingsData] = await Promise.all([
        getCurrentProfile(),
        getMyListings(),
      ]);
      
      setProfile(profileData);
      setListings(listingsData);
      setIsLoading(false);
    };

    loadData();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (isLoading) {
    return (
      <div className="h-full w-full bg-black p-4 space-y-2">
        {[...Array(8)].map((_, i) => (
          <ListItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  const menuSections = [
    {
      title: 'Account',
      items: [
        { icon: Edit3, label: 'Edit Profile', action: () => openSheet('edit-profile', {}) },
        { icon: Camera, label: 'Photos', action: () => openSheet('photos', {}) },
        { icon: MapPin, label: 'Location', action: () => openSheet('location', {}) },
      ],
    },
    {
      title: 'Safety',
      items: [
        { icon: Shield, label: 'Safety Center', action: () => openSheet('safety', {}) },
        { icon: Eye, label: 'Privacy Settings', action: () => openSheet('privacy', {}) },
        { icon: Lock, label: 'Blocked Users', action: () => openSheet('blocked', {}) },
      ],
    },
    {
      title: 'Activity',
      items: [
        { icon: Heart, label: 'Favorites', action: () => openSheet('favorites', {}) },
        { icon: ShoppingBag, label: `My Listings (${listings.length})`, action: () => openSheet('my-listings', {}) },
        { icon: Star, label: 'Membership', action: () => openSheet('membership', {}) },
      ],
    },
    {
      title: 'Settings',
      items: [
        { icon: Bell, label: 'Notifications', action: () => openSheet('notifications', {}) },
        { icon: Settings, label: 'App Settings', action: () => openSheet('settings', {}) },
        { icon: HelpCircle, label: 'Help & Support', action: () => openSheet('help', {}) },
      ],
    },
  ];

  return (
    <div className={`h-full w-full bg-black overflow-y-auto scroll-momentum pb-24 ${className}`}>
      {/* Profile Header */}
      <div className="relative">
        {/* Cover gradient */}
        <div className="h-32 bg-gradient-to-b from-[#FF1493]/30 to-black" />

        {/* Avatar + Info */}
        <div className="px-4 -mt-16 relative z-10">
          <div className="flex items-end gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-black overflow-hidden bg-white/10">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-10 h-10 text-white/40" />
                  </div>
                )}
              </div>
              {profile?.verified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#FF1493] rounded-full flex items-center justify-center">
                  <Star className="w-3 h-3 text-white" fill="white" />
                </div>
              )}
            </div>

            {/* Name + Status */}
            <div className="flex-1 pb-2">
              <h1 className="text-xl font-bold text-white">
                {profile?.display_name || 'Anonymous'}
              </h1>
              <p className="text-white/50 text-sm">
                {profile?.bio || 'No bio yet'}
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-6 mt-4 pb-4 border-b border-white/10">
            <div className="text-center">
              <div className="text-lg font-bold text-white">{listings.length}</div>
              <div className="text-xs text-white/50">Listings</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white capitalize">
                {profile?.membership_tier || 'Free'}
              </div>
              <div className="text-xs text-white/50">Membership</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <span className={`w-2 h-2 rounded-full ${profile?.is_online ? 'bg-green-500' : 'bg-white/30'}`} />
                <span className="text-lg font-bold text-white">
                  {profile?.is_online ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="text-xs text-white/50">Status</div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="px-4 py-4 space-y-6">
        {menuSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
              {section.title}
            </h2>
            <div className="bg-white/5 rounded-xl overflow-hidden border border-white/10">
              {section.items.map((item, index) => (
                <motion.button
                  key={item.label}
                  onClick={item.action}
                  className={`w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors ${
                    index < section.items.length - 1 ? 'border-b border-white/5' : ''
                  }`}
                  whileTap={{ scale: 0.99 }}
                >
                  <item.icon className="w-5 h-5 text-white/50" />
                  <span className="flex-1 text-white">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </motion.button>
              ))}
            </div>
          </div>
        ))}

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>

        {/* Version */}
        <div className="text-center text-white/20 text-xs py-4">
          HOTMESS OS v1.0.0
        </div>
      </div>
    </div>
  );
}

export default ProfileMode;
