import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Settings, Clock, Eye, EyeOff, Trash2, Edit, Users, Shield, Lock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/utils/queryConfig';
import { isPersonasEnabled, getMaxSecondaryProfiles } from '@/lib/featureFlags';
import PersonaEditor from '@/components/personas/PersonaEditor';
import { cn } from '@/lib/utils';
import { useFeatureUnlock, useUserUnlocks } from '@/hooks/useFeatureUnlock';
import { Link } from 'react-router-dom';

/**
 * PersonaManagement - Full page for managing all personas
 */
export default function PersonaManagement() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const [editingProfile, setEditingProfile] = useState(null);
  const [showCreateNew, setShowCreateNew] = useState(false);

  // Fetch profiles
  const { data: profiles = [], isLoading, error } = useQuery({
    queryKey: ['user-profiles', currentUser?.auth_user_id],
    queryFn: async () => {
      if (!currentUser?.auth_user_id) return [];
      const result = await base44.entities.Profile.filter({
        account_id: currentUser.auth_user_id,
      });
      return result || [];
    },
    enabled: !!currentUser?.auth_user_id && isPersonasEnabled(),
  });

  const mainProfile = profiles.find((p) => p.kind === 'MAIN');
  const secondaryProfiles = profiles.filter((p) => p.kind === 'SECONDARY');
  const maxProfiles = getMaxSecondaryProfiles();
  
  // Check feature unlock for persona creation
  const { unlocked: personaUnlocked, requiredLevel } = useFeatureUnlock('create_persona');
  const { unlocked: unlimitedUnlocked } = useFeatureUnlock('unlimited_personas');
  const { level, xp, progress, xpToNext } = useUserUnlocks();
  
  // Can create if: feature unlocked AND (under limit OR has unlimited)
  const underLimit = secondaryProfiles.length < maxProfiles;
  const canCreateMore = personaUnlocked && (underLimit || unlimitedUnlocked);

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ profileId, active }) => {
      return base44.entities.Profile.update(profileId, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user-profiles']);
    },
  });

  if (!isPersonasEnabled()) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Personas Not Available</h2>
          <p className="text-white/60">This feature is not enabled for your account.</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (profile) => {
    if (!profile.active) return 'bg-gray-500';
    if (profile.expires_at) {
      const expiry = new Date(profile.expires_at);
      if (expiry <= new Date()) return 'bg-red-500';
      return 'bg-yellow-500';
    }
    return 'bg-green-500';
  };

  const getStatusLabel = (profile) => {
    if (!profile.active) return 'Inactive';
    if (profile.expires_at) {
      const expiry = new Date(profile.expires_at);
      if (expiry <= new Date()) return 'Expired';
      const diff = expiry - new Date();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      if (days > 0) return `${days}d left`;
      if (hours > 0) return `${hours}h left`;
      return 'Expires soon';
    }
    return 'Active';
  };

  const getProfileIcon = (profile) => {
    if (profile.kind === 'MAIN') return '👤';
    switch (profile.type_key) {
      case 'TRAVEL': return '✈️';
      case 'WEEKEND': return '🌙';
      default: return '🎭';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">PERSONAS</h1>
          <p className="text-white/60">
            Manage multiple profiles for different contexts
          </p>
        </motion.div>

        {/* Usage Stats */}
        <div className="mb-8 p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-white/60 text-sm">Secondary Profiles</span>
              <div className="text-2xl font-bold">
                {secondaryProfiles.length} / {maxProfiles}
              </div>
            </div>
            {canCreateMore && (
              <Button
                variant="cyan"
                onClick={() => setShowCreateNew(true)}
                className="font-bold uppercase"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Persona
              </Button>
            )}
          </div>
          {!canCreateMore && (
            <div className="mt-4">
              {!personaUnlocked ? (
                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-purple-300 font-bold">Unlock at Level {requiredLevel}</p>
                      <p className="text-white/60 text-sm">
                        You're Level {level}. Earn {xpToNext} more XP to unlock persona creation.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 bg-white/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                      style={{ width: `${Math.min(100, (level / requiredLevel) * 100)}%` }}
                    />
                  </div>
                  <Link to="/challenges" className="mt-3 inline-flex items-center gap-2 text-sm text-cyan-400 hover:underline">
                    <Zap className="w-4 h-4" />
                    Earn XP through challenges
                  </Link>
                </div>
              ) : (
                <p className="text-yellow-400 text-sm">
                  Maximum profiles reached. Delete one to create a new one.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto mb-4" />
            <p className="text-white/60">Loading personas...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg mb-8">
            <p className="text-red-400">Failed to load personas: {error.message}</p>
          </div>
        )}

        {/* Main Profile Section */}
        {mainProfile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="text-sm uppercase tracking-wider text-white/40 mb-4">Main Profile</h2>
            <div className="p-6 bg-white/5 rounded-xl border border-white/20">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{getProfileIcon(mainProfile)}</div>
                  <div>
                    <h3 className="text-xl font-bold">
                      {mainProfile.type_label || 'Main Profile'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn('w-2 h-2 rounded-full', getStatusColor(mainProfile))} />
                      <span className="text-sm text-white/60">{getStatusLabel(mainProfile)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-white/40 bg-white/10 px-2 py-1 rounded">
                    Primary
                  </span>
                </div>
              </div>
              <p className="mt-4 text-sm text-white/50">
                Your main profile is always visible and cannot be deleted.
                Edit your profile from the Profile page.
              </p>
            </div>
          </motion.div>
        )}

        {/* Secondary Profiles */}
        <div>
          <h2 className="text-sm uppercase tracking-wider text-white/40 mb-4">
            Secondary Personas ({secondaryProfiles.length})
          </h2>

          {secondaryProfiles.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/20">
              <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">No Secondary Personas</h3>
              <p className="text-white/50 mb-4">
                Create a persona for different contexts like travel or weekends
              </p>
              <Button
                variant="glass"
                onClick={() => setShowCreateNew(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Persona
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {secondaryProfiles.map((profile, index) => (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * (index + 1) }}
                  className="p-6 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">{getProfileIcon(profile)}</div>
                      <div>
                        <h3 className="text-xl font-bold">
                          {profile.type_label || profile.type_key}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1.5">
                            <span className={cn('w-2 h-2 rounded-full', getStatusColor(profile))} />
                            <span className="text-sm text-white/60">{getStatusLabel(profile)}</span>
                          </div>
                          {profile.expires_at && (
                            <div className="flex items-center gap-1 text-xs text-white/40">
                              <Clock className="w-3 h-3" />
                              <span>Expires {formatDate(profile.expires_at)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded">
                            {profile.inherit_mode?.replace('_', ' ')}
                          </span>
                          {profile.override_location_enabled && (
                            <span className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">
                              Custom Location
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleActiveMutation.mutate({ 
                          profileId: profile.id, 
                          active: !profile.active 
                        })}
                        disabled={toggleActiveMutation.isPending}
                        className={cn(
                          'p-2 rounded-lg transition-colors',
                          profile.active 
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-white/10 text-white/40 hover:bg-white/20'
                        )}
                        title={profile.active ? 'Deactivate' : 'Activate'}
                      >
                        {profile.active ? (
                          <Eye className="w-5 h-5" />
                        ) : (
                          <EyeOff className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingProfile(profile)}
                        className="p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Create New Button (Bottom) */}
        {canCreateMore && secondaryProfiles.length > 0 && (
          <div className="mt-8 text-center">
            <Button
              variant="glass"
              onClick={() => setShowCreateNew(true)}
              className="font-bold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Persona
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateNew || editingProfile) && (
        <PersonaEditor
          profile={editingProfile}
          onSave={() => {
            setShowCreateNew(false);
            setEditingProfile(null);
          }}
          onDelete={() => {
            setEditingProfile(null);
          }}
          onClose={() => {
            setShowCreateNew(false);
            setEditingProfile(null);
          }}
        />
      )}
    </div>
  );
}
