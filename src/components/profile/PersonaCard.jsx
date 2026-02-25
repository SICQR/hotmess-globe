import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Clock,
  Star,
  Crown,
  ShoppingBag,
  Music,
  Calendar,
  Verified,
  Flame,
  Navigation
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProfileUrl } from '@/lib/userPrivacy';
// createPageUrl no longer used after privacy URL refactor

/**
 * PersonaCard - Multi-layered profile skin display
 * 
 * Per HOTMESS OS spec:
 * "Multi-Layered Profile Skins - Profiles that adapt:
 *  Standard, Seller, Creator, Organizer, Premium"
 * 
 * Each persona type has distinct visual treatment
 */

const PERSONA_CONFIGS = {
  standard: {
    label: 'Member',
    color: '#FFFFFF',
    gradient: 'from-white/20 to-white/5',
    icon: Star,
    borderColor: 'border-white/20',
  },
  seller: {
    label: 'Seller',
    color: '#B026FF',
    gradient: 'from-[#B026FF]/30 to-[#B026FF]/5',
    icon: ShoppingBag,
    borderColor: 'border-[#B026FF]/50',
  },
  creator: {
    label: 'Creator',
    color: '#C8962C',
    gradient: 'from-[#C8962C]/30 to-[#C8962C]/5',
    icon: Star,
    borderColor: 'border-[#C8962C]/50',
  },
  organizer: {
    label: 'Organizer',
    color: '#00D9FF',
    gradient: 'from-[#00D9FF]/30 to-[#00D9FF]/5',
    icon: Calendar,
    borderColor: 'border-[#00D9FF]/50',
  },
  premium: {
    label: 'Premium',
    color: '#FFD700',
    gradient: 'from-[#FFD700]/30 to-[#FFD700]/5',
    icon: Crown,
    borderColor: 'border-[#FFD700]/50',
  },
  dj: {
    label: 'DJ',
    color: '#39FF14',
    gradient: 'from-[#39FF14]/30 to-[#39FF14]/5',
    icon: Music,
    borderColor: 'border-[#39FF14]/50',
  },
};

const STATUS_BADGES = {
  online: { color: '#39FF14', label: 'Online', pulse: true },
  rightnow: { color: '#FF6B35', label: 'Right Now', pulse: true, hot: true },
  busy: { color: '#FFEB3B', label: 'Busy', pulse: false },
  away: { color: '#FF6B35', label: 'Away', pulse: false },
  offline: { color: '#666666', label: 'Offline', pulse: false },
};

export default function PersonaCard({
  user,
  variant = 'default', // default, compact, featured
  showActions = true,
  showDistance = true,
  matchScore,
  distance,
  eta,
  onMessage,
  onNavigate,
  className,
}) {
  const personaType = user?.profile_type || 'standard';
  const config = PERSONA_CONFIGS[personaType] || PERSONA_CONFIGS.standard;
  
  const status = user?.activity_status || 'offline';
  const statusConfig = STATUS_BADGES[status] || STATUS_BADGES.offline;
  
  const isRightNow = user?.right_now_active || status === 'rightnow';
  
  const profileUrl = getProfileUrl(user);

  // Avatar with fallback
  const avatarUrl = user?.avatar_url || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'U')}&background=111&color=fff`;

  // Display name and age
  const displayName = user?.full_name || 'Anonymous';
  const age = user?.age || user?.birthdate ? calculateAge(user.birthdate) : null;

  // Compact variant
  if (variant === 'compact') {
    return (
      <Link 
        to={profileUrl}
        className={cn(
          "block bg-black border-2 p-3 transition-all hover:scale-[1.02]",
          config.borderColor,
          className
        )}
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative">
            <img 
              src={avatarUrl} 
              alt={displayName}
              className="w-12 h-12 object-cover"
            />
            {statusConfig.pulse && (
              <div 
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black"
                style={{ backgroundColor: statusConfig.color }}
              />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white truncate">{displayName}</span>
              {age && <span className="text-white/50">{age}</span>}
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40">
              {distance && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {distance}
                </span>
              )}
              {eta && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {eta}
                </span>
              )}
            </div>
          </div>

          {/* Match score */}
          {matchScore && (
            <div 
              className="px-2 py-1 text-xs font-black"
              style={{ 
                backgroundColor: matchScore >= 80 ? '#C8962C20' : '#ffffff10',
                color: matchScore >= 80 ? '#C8962C' : '#ffffff60'
              }}
            >
              {matchScore}%
            </div>
          )}
        </div>
      </Link>
    );
  }

  // Featured variant (larger, more prominent)
  if (variant === 'featured') {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={cn(
          "relative bg-black border-2 overflow-hidden",
          config.borderColor,
          className
        )}
      >
        {/* Gradient background */}
        <div className={cn("absolute inset-0 bg-gradient-to-b", config.gradient)} />

        {/* Image */}
        <div className="relative aspect-[3/4]">
          <img 
            src={avatarUrl} 
            alt={displayName}
            className="w-full h-full object-cover"
          />
          
          {/* Status badge - top left */}
          {isRightNow ? (
            <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-black uppercase">
              <Flame className="w-3 h-3" />
              RIGHT NOW
            </div>
          ) : statusConfig.pulse && (
            <div 
              className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 text-xs font-black uppercase"
              style={{ backgroundColor: `${statusConfig.color}30`, color: statusConfig.color }}
            >
              <div 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: statusConfig.color }}
              />
              {statusConfig.label}
            </div>
          )}

          {/* Persona badge - top right */}
          <div 
            className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 text-[10px] font-black uppercase"
            style={{ backgroundColor: `${config.color}20`, color: config.color }}
          >
            <config.icon className="w-3 h-3" />
            {config.label}
          </div>

          {/* Match score - if high */}
          {matchScore && matchScore >= 70 && (
            <div className="absolute top-14 right-3 px-2 py-1 bg-gradient-to-r from-[#C8962C] to-[#B026FF] text-white text-xs font-black">
              {matchScore}% MATCH
            </div>
          )}

          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/80 to-transparent" />

          {/* Info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-black text-white">
                  {displayName}{age && <span className="text-white/60">, {age}</span>}
                </h3>
                
                {user?.city && (
                  <p className="flex items-center gap-1 text-sm text-white/60 mt-1">
                    <MapPin className="w-3 h-3" />
                    {user.city}
                    {distance && <span>• {distance}</span>}
                  </p>
                )}


                {/* Vibes/tags */}
                {user?.preferred_vibes?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {user.preferred_vibes.slice(0, 3).map((vibe, idx) => (
                      <span 
                        key={idx}
                        className="px-2 py-0.5 bg-white/10 text-white/60 text-[10px] font-bold uppercase"
                      >
                        {vibe}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Verified badge */}
              {user?.is_verified && (
                <div className="w-8 h-8 bg-[#00D9FF] rounded-full flex items-center justify-center">
                  <Verified className="w-5 h-5 text-black" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 p-3 bg-black border-t border-white/10">
            <Link to={profileUrl} className="flex-1">
              <button className="w-full py-2 bg-white/10 text-white text-sm font-bold uppercase hover:bg-white/20 transition-colors">
                Profile
              </button>
            </Link>
            {onMessage && (
              <button 
                onClick={onMessage}
                className="flex-1 py-2 bg-[#C8962C] text-black text-sm font-bold uppercase hover:bg-white transition-colors"
              >
                Message
              </button>
            )}
            {onNavigate && eta && (
              <button 
                onClick={onNavigate}
                className="py-2 px-3 bg-[#00D9FF] text-black text-sm font-bold uppercase hover:bg-white transition-colors"
              >
                <Navigation className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </motion.div>
    );
  }

  // Default variant
  return (
    <Link 
      to={profileUrl}
      className={cn(
        "block bg-black border-2 overflow-hidden transition-all hover:scale-[1.02] hover:border-opacity-100",
        config.borderColor,
        className
      )}
    >
      {/* Image container */}
      <div className="relative aspect-[4/5]">
        <img 
          src={avatarUrl} 
          alt={displayName}
          className="w-full h-full object-cover"
        />

        {/* Status indicator */}
        {isRightNow ? (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] font-black uppercase">
            <Flame className="w-3 h-3" />
            NOW
          </div>
        ) : statusConfig.pulse && (
          <div 
            className="absolute top-2 left-2 w-3 h-3 rounded-full animate-pulse border border-black"
            style={{ backgroundColor: statusConfig.color }}
          />
        )}

        {/* Persona icon */}
        <div 
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center"
          style={{ backgroundColor: `${config.color}30` }}
        >
          <config.icon className="w-3 h-3" style={{ color: config.color }} />
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black to-transparent" />

        {/* Name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-white text-lg leading-tight">
                {displayName}{age && <span className="text-white/60">, {age}</span>}
              </p>
              {(distance || user?.city) && (
                <p className="text-xs text-white/50 mt-0.5">
                  {user?.city}{distance && ` • ${distance}`}
                </p>
              )}
            </div>
            {matchScore && (
              <div 
                className="text-xs font-black px-1.5 py-0.5"
                style={{ 
                  backgroundColor: matchScore >= 80 ? '#C8962C' : matchScore >= 60 ? '#00D9FF20' : '#ffffff10',
                  color: matchScore >= 80 ? '#000' : matchScore >= 60 ? '#00D9FF' : '#ffffff60'
                }}
              >
                {matchScore}%
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// Helper to calculate age from birthdate
function calculateAge(birthdate) {
  if (!birthdate) return null;
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * PersonaGrid - Grid layout for persona cards
 */
export function PersonaGrid({ users, variant = 'default', columns = 4, className }) {
  return (
    <div 
      className={cn(
        "grid gap-4",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-2 md:grid-cols-3",
        columns === 4 && "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
        className
      )}
    >
      {users.map((user) => (
        <PersonaCard 
          key={user.id || user.email} 
          user={user} 
          variant={variant}
        />
      ))}
    </div>
  );
}
