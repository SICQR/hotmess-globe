/**
 * Enhanced Profile Action Buttons
 * 
 * Dynamic CTAs with animations for profile views.
 * Consolidated from QuickActions.jsx - includes all follow/unfollow/message/share logic.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MessageCircle, 
  Heart, 
  UserPlus, 
  UserCheck,
  UserMinus,
  Share2, 
  ShoppingBag,
  Play,
  Calendar,
  Zap,
  Crown,
  Check,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Primary CTA Button with glow effect
 */
export function PrimaryCTA({ 
  variant = 'message', 
  onClick, 
  href,
  loading = false,
  disabled = false,
  className = ''
}) {
  const variants = {
    message: {
      icon: MessageCircle,
      label: 'Message',
      gradient: 'from-[#E62020] to-[#B026FF]',
      glow: 'shadow-lg shadow-pink-500/30',
    },
    follow: {
      icon: UserPlus,
      label: 'Follow',
      gradient: 'from-[#00D9FF] to-[#3B82F6]',
      glow: 'shadow-lg shadow-cyan-500/30',
    },
    shop: {
      icon: ShoppingBag,
      label: 'Shop',
      gradient: 'from-[#E62020] to-[#FF6B35]',
      glow: 'shadow-lg shadow-pink-500/30',
    },
    listen: {
      icon: Play,
      label: 'Listen',
      gradient: 'from-[#39FF14] to-[#00D9FF]',
      glow: 'shadow-lg shadow-green-500/30',
    },
    book: {
      icon: Calendar,
      label: 'Book',
      gradient: 'from-[#B026FF] to-[#E62020]',
      glow: 'shadow-lg shadow-purple-500/30',
    },
    unlock: {
      icon: Crown,
      label: 'Unlock',
      gradient: 'from-[#FFD700] to-[#FF6B35]',
      glow: 'shadow-lg shadow-yellow-500/30',
    },
  };

  const config = variants[variant] || variants.message;
  const Icon = config.icon;

  const buttonContent = (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        relative overflow-hidden
        w-full py-3 px-6 rounded-xl
        bg-gradient-to-r ${config.gradient}
        text-white font-black uppercase tracking-wider
        flex items-center justify-center gap-2
        transition-all duration-300
        ${config.glow}
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {/* Shimmer Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          <Icon className="w-5 h-5" />
          <span>{config.label}</span>
        </>
      )}
    </motion.button>
  );

  if (href) {
    return <Link to={href}>{buttonContent}</Link>;
  }

  return buttonContent;
}

/**
 * Follow/Unfollow button with state
 */
export function FollowButton({ 
  isFollowing = false, 
  onFollow, 
  onUnfollow,
  followerCount,
  size = 'md',
  showCount = false 
}) {
  const [loading, setLoading] = useState(false);
  const [localFollowing, setLocalFollowing] = useState(isFollowing);

  const handleClick = async () => {
    setLoading(true);
    try {
      if (localFollowing) {
        await onUnfollow?.();
        setLocalFollowing(false);
        toast.success('Unfollowed');
      } else {
        await onFollow?.();
        setLocalFollowing(true);
        toast.success('Following!');
      }
    } catch (error) {
      toast.error('Action failed');
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'py-1.5 px-3 text-xs gap-1',
    md: 'py-2 px-4 text-sm gap-1.5',
    lg: 'py-3 px-6 text-base gap-2',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      disabled={loading}
      className={`
        ${sizeClasses[size]}
        rounded-xl font-bold uppercase tracking-wide
        flex items-center justify-center
        transition-all duration-300
        ${localFollowing 
          ? 'bg-white/10 text-white border border-white/20 hover:border-red-500/50 hover:text-red-400' 
          : 'bg-gradient-to-r from-[#00D9FF] to-[#3B82F6] text-white shadow-lg shadow-cyan-500/20'
        }
        disabled:opacity-50
      `}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : localFollowing ? (
        <>
          <UserCheck className="w-4 h-4" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          <span>Follow</span>
        </>
      )}
      {showCount && followerCount !== undefined && (
        <span className="ml-1 opacity-60">({followerCount})</span>
      )}
    </motion.button>
  );
}

/**
 * Quick action icon buttons (compact version)
 */
export function QuickActionIcons({ 
  onMessage, 
  onLike, 
  onShare, 
  onFollow,
  isLiked = false,
  isFollowing = false,
  className = '' 
}) {
  const [liked, setLiked] = useState(isLiked);

  const handleLike = () => {
    setLiked(!liked);
    onLike?.(!liked);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Message */}
      {onMessage && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onMessage}
          className="w-12 h-12 rounded-full bg-[#E62020]/20 hover:bg-[#E62020] flex items-center justify-center transition-colors group"
        >
          <MessageCircle className="w-5 h-5 text-[#E62020] group-hover:text-white transition-colors" />
        </motion.button>
      )}

      {/* Like */}
      {onLike && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleLike}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center transition-all
            ${liked 
              ? 'bg-red-500 shadow-lg shadow-red-500/30' 
              : 'bg-white/10 hover:bg-red-500/20'
            }
          `}
        >
          <Heart 
            className={`w-5 h-5 transition-colors ${liked ? 'text-white fill-current' : 'text-red-400'}`}
          />
        </motion.button>
      )}

      {/* Share */}
      {onShare && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onShare}
          className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <Share2 className="w-5 h-5 text-white/80" />
        </motion.button>
      )}
    </div>
  );
}

/**
 * Full QuickActions component with react-query mutations
 * Consolidated from QuickActions.jsx - handles follow/unfollow/message/share
 */
export default function QuickActions({ profileUser, currentUser, isOwnProfile }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: following = [] } = useQuery({
    queryKey: ['following', currentUser?.email],
    queryFn: () => base44.entities.UserFollow.filter({ follower_email: currentUser.email }),
    enabled: !!currentUser
  });

  const { data: chatThreads = [] } = useQuery({
    queryKey: ['chat-threads', currentUser?.email],
    queryFn: () => base44.entities.ChatThread.list(),
    enabled: !!currentUser
  });

  const isFollowing = following.some(f => f.following_email === profileUser?.email);

  // Check if DM thread exists
  const existingThread = chatThreads.find(thread => 
    thread.participant_emails?.includes(currentUser?.email) &&
    thread.participant_emails?.includes(profileUser?.email) &&
    thread.thread_type === 'dm'
  );

  const followMutation = useMutation({
    mutationFn: async () => {
      // Create the follow record
      await base44.entities.UserFollow.create({
        follower_email: currentUser.email,
        following_email: profileUser.email
      });
      
      // Send notification to the followed user (don't await - fire and forget)
      base44.entities.Notification.create({
        user_email: profileUser.email,
        type: 'new_follower',
        title: 'New Follower',
        message: `${currentUser.full_name || 'Someone'} started following you`,
        link: 'Profile',
        metadata: { 
          follower_email: currentUser.email,
          follower_name: currentUser.full_name 
        },
        read: false,
        created_date: new Date().toISOString()
      }).catch(() => {}); // Silently fail if notification fails
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['following']);
      toast.success(`Following ${profileUser.full_name || profileUser.username}!`);
    }
  });

  const unfollowMutation = useMutation({
    mutationFn: () => {
      const followRecord = following.find(f => f.following_email === profileUser?.email);
      return base44.entities.UserFollow.delete(followRecord?.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['following']);
      toast.success('Unfollowed');
    }
  });

  const handleMessage = () => {
    if (existingThread) {
      navigate(`/social/t/${encodeURIComponent(String(existingThread.id))}`);
    } else {
      navigate(`/social/inbox?to=${encodeURIComponent(String(profileUser?.email || ''))}`);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      Promise.resolve(
        navigator.share({
          title: `${profileUser?.full_name || profileUser?.username} on HOTMESS`,
          text: `Check out ${profileUser?.full_name || profileUser?.username}'s profile`,
          url,
        })
      ).catch((err) => {
        // User cancelled the share sheet (common on iOS/macOS).
        if (err?.name === 'AbortError') return;
        toast.error('Share failed');
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Profile link copied!');
    }
  };

  if (isOwnProfile) return null;

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        onClick={async () => {
          const ok = await base44.auth.requireProfile(window.location.href);
          if (!ok) return;
          isFollowing ? unfollowMutation.mutate() : followMutation.mutate();
        }}
        variant="outline"
        size="sm"
        className="border-2 border-white text-white hover:bg-white hover:text-black font-black min-h-[44px]"
      >
        {isFollowing ? (
          <>
            <UserMinus className="w-4 h-4 mr-2" />
            UNFOLLOW
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4 mr-2" />
            FOLLOW
          </>
        )}
      </Button>

      <Button
        onClick={async () => {
          const ok = await base44.auth.requireProfile(window.location.href);
          if (!ok) return;
          handleMessage();
        }}
        size="sm"
        className="bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black font-black border-2 border-white min-h-[44px]"
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        MESSAGE
      </Button>

      <Button
        onClick={handleShare}
        variant="ghost"
        size="icon"
        className="border-2 border-white/20 hover:border-white min-h-[44px] min-w-[44px]"
      >
        <Share2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

/**
 * XP Unlock button for premium content
 */
export function UnlockButton({ xpCost, onUnlock, loading = false, unlocked = false }) {
  if (unlocked) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/40 rounded-xl">
        <Check className="w-5 h-5 text-green-400" />
        <span className="text-green-400 font-bold">Unlocked</span>
      </div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onUnlock}
      disabled={loading}
      className="
        relative overflow-hidden
        py-3 px-6 rounded-xl
        bg-gradient-to-r from-yellow-500 to-orange-500
        text-black font-black uppercase tracking-wider
        flex items-center justify-center gap-2
        shadow-lg shadow-yellow-500/30
        disabled:opacity-50
      "
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
      
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          <Crown className="w-5 h-5" />
          <span>Unlock</span>
          <div className="flex items-center gap-1 ml-1 px-2 py-0.5 bg-black/20 rounded">
            <Zap className="w-3 h-3" />
            <span className="text-sm">{xpCost}</span>
          </div>
        </>
      )}
    </motion.button>
  );
}

/**
 * Action button row for profile header
 */
export function ProfileActionRow({ 
  profileType, 
  email, 
  isOwnProfile,
  isFollowing,
  onFollow,
  onUnfollow,
  onMessage,
  onShare,
  className = ''
}) {
  if (isOwnProfile) {
    return (
      <div className={`flex gap-3 ${className}`}>
        <Link to="/edit-profile" className="flex-1">
          <Button variant="outline" className="w-full border-white/20 hover:border-white/40">
            Edit Profile
          </Button>
        </Link>
        <Button variant="glass" onClick={onShare}>
          <Share2 className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  const primaryVariant = {
    seller: 'shop',
    creator: 'listen',
    organizer: 'book',
    premium: 'unlock',
  }[profileType] || 'message';

  return (
    <div className={`flex gap-3 ${className}`}>
      <div className="flex-1">
        <PrimaryCTA 
          variant={primaryVariant}
          href={primaryVariant === 'message' ? `/social/inbox?to=${encodeURIComponent(email)}` : undefined}
          onClick={primaryVariant !== 'message' ? onMessage : undefined}
        />
      </div>
      <FollowButton 
        isFollowing={isFollowing}
        onFollow={onFollow}
        onUnfollow={onUnfollow}
        size="md"
      />
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onShare}
        className="w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
      >
        <Share2 className="w-5 h-5 text-white/80" />
      </motion.button>
    </div>
  );
}
