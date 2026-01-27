import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, User, Clock, Check, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { isPersonasEnabled } from '@/lib/featureFlags';
import { useCurrentUser } from '@/components/utils/queryConfig';
import { cn } from '@/lib/utils';

/**
 * ProfileSwitcher - Dropdown for selecting active persona
 * Shows main profile + secondary profiles with status indicators
 */
export default function ProfileSwitcher({
  selectedProfileId,
  onSelectProfile,
  onCreateNew,
  className,
  disabled = false,
  showCreateButton = true,
  compact = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { data: currentUser } = useCurrentUser();

  // Fetch user's profiles
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['user-profiles', currentUser?.auth_user_id],
    queryFn: async () => {
      if (!currentUser?.auth_user_id) return [];
      const result = await base44.entities.Profile.filter({
        account_id: currentUser.auth_user_id,
      });
      return result || [];
    },
    enabled: !!currentUser?.auth_user_id && isPersonasEnabled(),
    staleTime: 30000,
  });

  // Find selected profile
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) || 
    profiles.find((p) => p.kind === 'MAIN');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isPersonasEnabled()) {
    return null;
  }

  const handleSelect = (profile) => {
    onSelectProfile?.(profile);
    setIsOpen(false);
  };

  const formatExpiry = (expiresAt) => {
    if (!expiresAt) return null;
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diff = expiry - now;
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d left`;
    if (hours > 0) return `${hours}h left`;
    return 'Soon';
  };

  const getStatusIndicator = (profile) => {
    if (!profile.active) {
      return { color: 'bg-gray-500', label: 'Inactive' };
    }
    if (profile.expires_at) {
      const expiry = new Date(profile.expires_at);
      if (expiry <= new Date()) {
        return { color: 'bg-red-500', label: 'Expired' };
      }
      return { color: 'bg-yellow-500', label: formatExpiry(profile.expires_at) };
    }
    return { color: 'bg-green-500', label: 'Active' };
  };

  const getProfileIcon = (profile) => {
    if (profile.kind === 'MAIN') return '👤';
    switch (profile.type_key) {
      case 'TRAVEL': return '✈️';
      case 'WEEKEND': return '🌙';
      default: return '🎭';
    }
  };

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Selected Profile Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
          'bg-black/40 border-white/20 hover:border-white/40',
          disabled && 'opacity-50 cursor-not-allowed',
          compact ? 'text-xs' : 'text-sm'
        )}
      >
        {isLoading ? (
          <span className="text-white/60">Loading...</span>
        ) : selectedProfile ? (
          <>
            <span>{getProfileIcon(selectedProfile)}</span>
            <span className="text-white font-medium truncate max-w-[120px]">
              {selectedProfile.type_label || selectedProfile.type_key}
            </span>
            <span className={cn(
              'w-2 h-2 rounded-full',
              getStatusIndicator(selectedProfile).color
            )} />
          </>
        ) : (
          <>
            <User className="w-4 h-4 text-white/60" />
            <span className="text-white/60">Select Profile</span>
          </>
        )}
        <ChevronDown className={cn(
          'w-4 h-4 text-white/60 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-black/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Profile List */}
          <div className="max-h-64 overflow-y-auto">
            {profiles.map((profile) => {
              const status = getStatusIndicator(profile);
              const isSelected = profile.id === selectedProfile?.id;
              
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => handleSelect(profile)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                    'hover:bg-white/10',
                    isSelected && 'bg-white/5'
                  )}
                >
                  <span className="text-lg">{getProfileIcon(profile)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium truncate">
                        {profile.type_label || profile.type_key}
                      </span>
                      {profile.kind === 'MAIN' && (
                        <span className="text-[10px] uppercase tracking-wider text-white/40 bg-white/10 px-1.5 py-0.5 rounded">
                          Main
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn('w-1.5 h-1.5 rounded-full', status.color)} />
                      <span className="text-[11px] text-white/50">{status.label}</span>
                      {profile.expires_at && (
                        <>
                          <Clock className="w-3 h-3 text-white/40" />
                          <span className="text-[10px] text-white/40">
                            {formatExpiry(profile.expires_at)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-cyan-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Create New Button */}
          {showCreateButton && (
            <div className="border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onCreateNew?.();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-colors"
              >
                <Plus className="w-5 h-5 text-cyan-400" />
                <span className="text-cyan-400 font-medium">Create New Persona</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ProfileBadge - Read-only badge showing current persona
 */
export function ProfileBadge({ profile, className }) {
  if (!profile) return null;

  const getIcon = () => {
    if (profile.kind === 'MAIN') return '👤';
    switch (profile.type_key) {
      case 'TRAVEL': return '✈️';
      case 'WEEKEND': return '🌙';
      default: return '🎭';
    }
  };

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-1 rounded-full',
      'bg-white/10 border border-white/20',
      'text-xs text-white/80',
      className
    )}>
      <span>{getIcon()}</span>
      <span className="font-medium">
        {profile.type_label || profile.type_key}
      </span>
    </div>
  );
}

/**
 * useUserProfiles - Hook to fetch user's profiles
 */
export function useUserProfiles() {
  const { data: currentUser } = useCurrentUser();

  return useQuery({
    queryKey: ['user-profiles', currentUser?.auth_user_id],
    queryFn: async () => {
      if (!currentUser?.auth_user_id) return [];
      const result = await base44.entities.Profile.filter({
        account_id: currentUser.auth_user_id,
      });
      return result || [];
    },
    enabled: !!currentUser?.auth_user_id && isPersonasEnabled(),
    staleTime: 30000,
  });
}

/**
 * useMainProfile - Hook to get user's main profile
 */
export function useMainProfile() {
  const { data: profiles = [], ...rest } = useUserProfiles();
  const mainProfile = profiles.find((p) => p.kind === 'MAIN');
  return { data: mainProfile, profiles, ...rest };
}
