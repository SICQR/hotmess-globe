/**
 * L2GhostedSheet — Social / Right Now as a sheet overlay
 * 
 * Replaces: /social page navigation
 * Unifies: RightNowModal, RightNowGrid, RightNowManager
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/components/utils/supabaseClient';
import { Zap, MapPin, Clock, MessageCircle, 
  Loader2, ChevronRight, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SheetSection, SheetActions, SheetDivider } from './L2SheetContainer';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import MembershipBadge from '@/components/membership/MembershipBadge';

// Right Now toggle duration options
const DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
];

export default function L2GhostedSheet() {
  const queryClient = useQueryClient();
  const { openSheet } = useSheet();
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [showFilters, setShowFilters] = useState(false);

  // Current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  // Current user's Right Now status
  const { data: myStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['my-right-now-status', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const statuses = await base44.entities.RightNowStatus.filter({
        user_email: currentUser.email,
        active: true,
      });
      const valid = statuses.find(s => new Date(s.expires_at) > new Date());
      return valid || null;
    },
    enabled: !!currentUser?.email,
    refetchInterval: 30000,
  });

  // All active Right Now users
  const { data: rightNowUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['right-now-active'],
    queryFn: async () => {
      const statuses = await base44.entities.RightNowStatus.filter(
        { active: true },
        '-created_date'
      );
      return statuses.filter(s => new Date(s.expires_at) > new Date());
    },
    refetchInterval: 15000,
  });

  // All users for profiles
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Map statuses to users
  const usersWithStatus = rightNowUsers
    .map(status => ({
      status,
      user: allUsers.find(u => u.email === status.user_email),
    }))
    .filter(item => item.user && item.user.email !== currentUser?.email);

  // Toggle Right Now mutation
  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.email) throw new Error('Please log in');
      
      if (myStatus) {
        // Deactivate
        await base44.entities.RightNowStatus.update(myStatus.id, { active: false });
        return { action: 'off' };
      } else {
        // Activate
        const expiresAt = new Date(Date.now() + selectedDuration * 60 * 1000);
        await base44.entities.RightNowStatus.create({
          user_email: currentUser.email,
          active: true,
          expires_at: expiresAt.toISOString(),
          created_date: new Date().toISOString(),
          logistics: [],
        });
        return { action: 'on', duration: selectedDuration };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['my-right-now-status']);
      queryClient.invalidateQueries(['right-now-active']);
      
      if (result.action === 'on') {
        toast.success(`You're live for ${result.duration} minutes! 🟢`);
      } else {
        toast.success('You went offline');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update status');
    },
  });

  const isLive = !!myStatus;

  // View profile
  const handleViewProfile = (email) => {
    openSheet(SHEET_TYPES.PROFILE, { email });
  };

  // Start chat
  const handleStartChat = (email, userName) => {
    openSheet(SHEET_TYPES.CHAT, { to: email, title: `Chat with ${userName}` });
  };

  return (
    <div className="pb-24">
      {/* Live Toggle Section */}
      <SheetSection>
        <div className={cn(
          'p-4 rounded-xl border-2 transition-all',
          isLive 
            ? 'bg-[#39FF14]/10 border-[#39FF14]' 
            : 'bg-white/5 border-white/20'
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                isLive ? 'bg-[#39FF14]' : 'bg-white/10'
              )}>
                <Zap className={cn('w-6 h-6', isLive ? 'text-black' : 'text-white/40')} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  {isLive ? 'YOU ARE LIVE' : 'GO LIVE'}
                </h3>
                <p className="text-xs text-white/60">
                  {isLive 
                    ? `Expires ${formatDistanceToNow(new Date(myStatus.expires_at), { addSuffix: true })}`
                    : 'Let others know you\'re available'
                  }
                </p>
              </div>
            </div>
            
            <Switch
              checked={isLive}
              onCheckedChange={() => toggleMutation.mutate()}
              disabled={toggleMutation.isPending || !currentUser}
              className="data-[state=checked]:bg-[#39FF14]"
            />
          </div>

          {/* Duration selector (only when not live) */}
          {!isLive && (
            <div className="flex gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedDuration(opt.value)}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all',
                    selectedDuration === opt.value
                      ? 'bg-[#39FF14] text-black'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetSection>

      <SheetDivider />

      {/* Live count */}
      <SheetSection>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#39FF14] rounded-full animate-pulse" />
            <span className="text-white font-bold">{usersWithStatus.length}</span>
            <span className="text-white/60 text-sm">people live right now</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-white/60"
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </SheetSection>

      <SheetDivider />

      {/* Users Grid */}
      <SheetSection title="Right Now">
        {usersLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
          </div>
        ) : usersWithStatus.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 font-bold">No one live right now</p>
            <p className="text-white/20 text-sm mt-1">Be the first!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {usersWithStatus.map(({ user, status }, index) => (
                <motion.div
                  key={status.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-[#39FF14]/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <button
                      onClick={() => handleViewProfile(user.email)}
                      className="relative flex-shrink-0"
                    >
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#C8962C] to-[#B026FF] flex items-center justify-center overflow-hidden">
                        {user.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt="" 
                            className="w-full h-full object-cover grayscale contrast-125" 
                          />
                        ) : (
                          <span className="text-lg font-black text-white">
                            {user.full_name?.[0] || '?'}
                          </span>
                        )}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#39FF14] rounded-full border-2 border-black" />
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-bold truncate">
                          {user.full_name || user.username || 'Anonymous'}
                        </p>
                        {user.membership_tier && user.membership_tier !== 'free' && (
                          <MembershipBadge tier={user.membership_tier} size="xs" />
                        )}
                      </div>
                      
                      {user.city && (
                        <p className="text-white/40 text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {user.city}
                        </p>
                      )}
                      
                      {status.logistics?.length > 0 && (
                        <p className="text-[#39FF14]/80 text-xs mt-1 truncate">
                          {status.logistics.join(' • ')}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewProfile(user.email)}
                        className="text-white/60 hover:text-white"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleStartChat(user.email, user.full_name || user.username)}
                        className="bg-[#C8962C] hover:bg-[#C8962C]/90"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </SheetSection>

      {/* CTA */}
      {!isLive && usersWithStatus.length > 0 && (
        <SheetActions>
          <Button
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending || !currentUser}
            className="flex-1 h-14 bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-black text-lg"
          >
            {toggleMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                GO LIVE NOW
              </>
            )}
          </Button>
        </SheetActions>
      )}
    </div>
  );
}
