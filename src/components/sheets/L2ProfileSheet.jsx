/**
 * L2ProfileSheet — Profile as a sheet overlay
 * 
 * Replaces: /profile page navigation
 * Extracted from Profile.jsx (1,219 lines)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44, supabase } from '@/components/utils/supabaseClient';
import { 
  User, MessageCircle, Calendar, MapPin, Shield, 
  Instagram, Twitter, Music, ChevronRight,
  Loader2, MoreVertical, Flag, Ban, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SheetSection, SheetActions, SheetDivider } from './L2SheetContainer';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import { toast } from 'sonner';
import MembershipBadge from '@/components/membership/MembershipBadge';

export default function L2ProfileSheet({ email, uid }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { openSheet, closeSheet } = useSheet();
  const [activeTab, setActiveTab] = useState('about');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch profile user
  const { data: profileUser, isLoading } = useQuery({
    queryKey: ['profile-sheet', email, uid],
    queryFn: async () => {
      // If no params, show current user
      if (!email && !uid) {
        return await base44.auth.me();
      }
      
      // Try API lookup first
      const qs = new URLSearchParams();
      if (email) qs.set('email', email);
      else if (uid) qs.set('uid', uid);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        const res = await fetch(`/api/profile?${qs.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        
        if (res.ok) {
          const payload = await res.json();
          return payload?.user || null;
        }
      } catch {}

      // Fallback to direct query
      if (email) {
        const users = await base44.entities.User.filter({ email });
        return users?.[0] || null;
      }
      if (uid) {
        const users = await base44.entities.User.filter({ auth_user_id: uid });
        return users?.[0] || null;
      }
      return null;
    },
  });

  // Check if viewing own profile
  const isOwnProfile = !email && !uid || 
    (currentUser?.email && profileUser?.email === currentUser.email);

  // Fetch user's events (RSVPs)
  const { data: userEvents = [] } = useQuery({
    queryKey: ['user-events', profileUser?.email],
    queryFn: async () => {
      if (!profileUser?.email) return [];
      const rsvps = await base44.entities.EventRSVP.filter({ user_email: profileUser.email });
      return rsvps.slice(0, 5);
    },
    enabled: !!profileUser?.email,
  });

  // Fetch Right Now status
  const { data: rightNowStatus } = useQuery({
    queryKey: ['right-now-status', profileUser?.email],
    queryFn: async () => {
      if (!profileUser?.email) return null;
      const statuses = await base44.entities.RightNowStatus.filter({ 
        user_email: profileUser.email, 
        active: true 
      });
      const valid = statuses.find(s => new Date(s.expires_at) > new Date());
      return valid || null;
    },
    enabled: !!profileUser?.email,
  });

  // Message user
  const handleMessage = () => {
    if (!profileUser?.email) return;
    openSheet(SHEET_TYPES.CHAT, { 
      to: profileUser.email,
      title: `Chat with ${profileUser.full_name || profileUser.username}`
    });
  };

  // View on Globe
  const handleViewOnGlobe = () => {
    closeSheet();
    // TODO: Zoom globe to user location
    if (profileUser?.city) {
      toast.info(`Viewing ${profileUser.full_name || 'user'} in ${profileUser.city}`);
    }
  };

  // Block user
  const handleBlock = async () => {
    if (!currentUser || !profileUser) return;
    setIsBlocking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get target user's auth ID
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', profileUser.email)
        .single();

      if (!targetProfile) throw new Error('User not found');

      const { error } = await supabase
        .from('profile_blocklist_users')
        .insert({
          profile_id: user.id,
          blocked_user_id: targetProfile.id,
          reason: 'User blocked from profile',
        });

      if (error) throw error;

      toast.success(`${profileUser.full_name || 'User'} blocked`);
      setShowMoreMenu(false);
      closeSheet();
    } catch (err) {
      toast.error('Failed to block user');
    } finally {
      setIsBlocking(false);
    }
  };

  // Report user
  const handleReport = async () => {
    if (!currentUser || !profileUser || !reportReason.trim()) return;
    setIsReporting(true);
    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_email: currentUser.email,
          reported_item_type: 'user',
          reported_item_id: profileUser.email,
          reason: reportReason,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Report submitted. Our team will review it.');
      setShowReportModal(false);
      setReportReason('');
      setShowMoreMenu(false);
    } catch (err) {
      toast.error('Failed to submit report');
    } finally {
      setIsReporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <User className="w-12 h-12 text-white/20 mb-4" />
        <p className="text-white/60 mb-4">Profile not found</p>
        <Button variant="outline" onClick={closeSheet}>Close</Button>
      </div>
    );
  }

  const membershipTier = profileUser.membership_tier || 'free';
  const isVerified = profileUser.is_verified;

  return (
    <div className="pb-24">
      {/* Header with Avatar */}
      <div className="relative">
        {/* Cover gradient */}
        <div className="h-24 bg-gradient-to-br from-[#C8962C]/30 via-[#B026FF]/20 to-black" />
        
        {/* Avatar */}
        <div className="absolute -bottom-12 left-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-black bg-gradient-to-br from-[#C8962C] to-[#B026FF] flex items-center justify-center overflow-hidden">
              {profileUser.avatar_url ? (
                <img 
                  src={profileUser.avatar_url} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-black text-white">
                  {profileUser.full_name?.[0] || profileUser.username?.[0] || '?'}
                </span>
              )}
            </div>
            
            {/* Verified badge */}
            {isVerified && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#00D9FF] rounded-full flex items-center justify-center border-2 border-black">
                <Shield className="w-4 h-4 text-black" />
              </div>
            )}

            {/* Right Now indicator */}
            {rightNowStatus && (
              <div className="absolute -top-1 -right-1">
                <span className="flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39FF14] opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-[#39FF14]" />
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Membership badge */}
        {membershipTier !== 'free' && (
          <div className="absolute top-4 right-4">
            <MembershipBadge tier={membershipTier} size="sm" />
          </div>
        )}

        {/* More menu (Block/Report) - only show for other users */}
        {!isOwnProfile && (
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
              aria-label="More options"
            >
              <MoreVertical className="w-5 h-5 text-white" />
            </button>

            {/* Dropdown menu */}
            {showMoreMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowMoreMenu(false)} 
                />
                <div className="absolute right-0 top-12 z-50 w-48 bg-[#1C1C1E] border border-white/10 rounded-xl overflow-hidden shadow-xl">
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowReportModal(true);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <Flag className="w-4 h-4 text-[#C8962C]" />
                    <span className="text-white text-sm font-medium">Report User</span>
                  </button>
                  <button
                    onClick={handleBlock}
                    disabled={isBlocking}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left border-t border-white/5"
                  >
                    {isBlocking ? (
                      <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                    ) : (
                      <Ban className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-red-500 text-sm font-medium">Block User</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Name & Username */}
      <SheetSection className="pt-14">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">
              {profileUser.full_name || profileUser.username || 'Anonymous'}
            </h2>
            {profileUser.username && (
              <p className="text-[#00D9FF] text-sm font-medium">@{profileUser.username}</p>
            )}
            {profileUser.city && (
              <p className="text-white/40 text-sm flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {profileUser.city}
              </p>
            )}
          </div>

          {/* Quick actions */}
          {!isOwnProfile && (
            <Button
              onClick={handleMessage}
              size="sm"
              className="bg-[#C8962C] hover:bg-[#C8962C]/90"
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              Message
            </Button>
          )}
        </div>

        {/* Right Now status */}
        {rightNowStatus && (
          <div className="mt-3 p-3 bg-[#39FF14]/10 border border-[#39FF14]/30 rounded-lg">
            <p className="text-[#39FF14] text-sm font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-[#39FF14] rounded-full animate-pulse" />
              RIGHT NOW
            </p>
            {rightNowStatus.logistics?.length > 0 && (
              <p className="text-white/60 text-xs mt-1">
                {rightNowStatus.logistics.join(' • ')}
              </p>
            )}
          </div>
        )}
      </SheetSection>

      <SheetDivider />

      {/* Stats Bar */}
      <SheetSection>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-2 bg-white/5 rounded-lg">
            <p className="text-xl font-black text-[#39FF14]">{profileUser.events_attended || 0}</p>
            <p className="text-[10px] text-white/40 uppercase">Events</p>
          </div>
          <div className="p-2 bg-white/5 rounded-lg">
            <p className="text-xl font-black text-[#C8962C]">{profileUser.connections_count || 0}</p>
            <p className="text-[10px] text-white/40 uppercase">Links</p>
          </div>
        </div>
      </SheetSection>

      <SheetDivider />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full bg-white/5 border-b border-white/10 rounded-none p-0">
          <TabsTrigger 
            value="about" 
            className="flex-1 rounded-none data-[state=active]:bg-white/10 data-[state=active]:text-[#C8962C]"
          >
            About
          </TabsTrigger>
          <TabsTrigger 
            value="events" 
            className="flex-1 rounded-none data-[state=active]:bg-white/10 data-[state=active]:text-[#C8962C]"
          >
            Events
          </TabsTrigger>
          {(profileUser.is_seller || profileUser.is_creator) && (
            <TabsTrigger 
              value="shop" 
              className="flex-1 rounded-none data-[state=active]:bg-white/10 data-[state=active]:text-[#C8962C]"
            >
              Shop
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="about" className="mt-0">
          <SheetSection>
            {/* Bio */}
            {profileUser.bio ? (
              <p className="text-white/80 text-sm leading-relaxed">{profileUser.bio}</p>
            ) : (
              <p className="text-white/40 text-sm italic">No bio yet</p>
            )}

            {/* Social links */}
            {(profileUser.instagram || profileUser.twitter || profileUser.soundcloud) && (
              <div className="flex gap-3 mt-4">
                {profileUser.instagram && (
                  <a 
                    href={`https://instagram.com/${profileUser.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <Instagram className="w-5 h-5 text-[#E4405F]" />
                  </a>
                )}
                {profileUser.twitter && (
                  <a 
                    href={`https://twitter.com/${profileUser.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <Twitter className="w-5 h-5 text-[#1DA1F2]" />
                  </a>
                )}
                {profileUser.soundcloud && (
                  <a 
                    href={profileUser.soundcloud}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <Music className="w-5 h-5 text-[#FF5500]" />
                  </a>
                )}
              </div>
            )}

            {/* Persona type */}
            {profileUser.persona && (
              <div className="mt-4 p-3 bg-white/5 rounded-lg">
                <p className="text-xs text-white/40 uppercase mb-1">Persona</p>
                <p className="text-white font-medium capitalize">{profileUser.persona}</p>
              </div>
            )}
          </SheetSection>
        </TabsContent>

        <TabsContent value="events" className="mt-0">
          <SheetSection>
            {userEvents.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-8">No events yet</p>
            ) : (
              <div className="space-y-2">
                {userEvents.map((rsvp) => (
                  <button
                    key={rsvp.id}
                    onClick={() => openSheet(SHEET_TYPES.EVENT, { id: rsvp.beacon_id })}
                    className="w-full p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-left flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-[#00D9FF]" />
                      <span className="text-white text-sm">Event RSVP</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40" />
                  </button>
                ))}
              </div>
            )}
          </SheetSection>
        </TabsContent>

        <TabsContent value="shop" className="mt-0">
          <SheetSection>
            <button
              onClick={() => openSheet(SHEET_TYPES.SHOP, { seller: profileUser.email })}
              className="w-full p-4 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-lg text-center"
            >
              <p className="text-[#FFD700] font-bold">View Shop</p>
              <p className="text-white/40 text-xs mt-1">See items for sale</p>
            </button>
          </SheetSection>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <SheetActions>
        {isOwnProfile ? (
          <Button
            onClick={() => {
              closeSheet();
              navigate('/settings');
            }}
            className="flex-1 h-12 bg-white/10 hover:bg-white/20"
          >
            Edit Profile
          </Button>
        ) : (
          <>
            <Button
              onClick={handleViewOnGlobe}
              variant="outline"
              className="flex-1 h-12 border-white/20"
            >
              <MapPin className="w-4 h-4 mr-2" />
              View on Globe
            </Button>
            <Button
              onClick={handleMessage}
              className="flex-1 h-12 bg-[#C8962C] hover:bg-[#C8962C]/90"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Message
            </Button>
          </>
        )}
      </SheetActions>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#1C1C1E] border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-bold">Report User</h3>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason('');
                }}
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <p className="text-white/60 text-sm">
                Why are you reporting {profileUser?.full_name || 'this user'}?
              </p>
              
              <div className="space-y-2">
                {[
                  'Harassment or bullying',
                  'Spam or scam',
                  'Inappropriate content',
                  'Fake profile',
                  'Other',
                ].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setReportReason(reason)}
                    className={`w-full px-4 py-3 rounded-lg text-left text-sm font-medium transition-colors ${
                      reportReason === reason
                        ? 'bg-[#C8962C] text-black'
                        : 'bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <Button
                onClick={handleReport}
                disabled={!reportReason || isReporting}
                className="w-full h-12 bg-[#C8962C] hover:bg-[#C8962C]/90 disabled:opacity-50"
              >
                {isReporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Submit Report'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
