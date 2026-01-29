import React from 'react';
import { MessageCircle, UserPlus, UserMinus, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { notifyNewFollower } from '@/lib/notifications';

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

  const isFollowing = following.some(f => f.following_email === profileUser.email);

  // Check if DM thread exists
  const existingThread = chatThreads.find(thread => 
    thread.participant_emails.includes(currentUser?.email) &&
    thread.participant_emails.includes(profileUser.email) &&
    thread.thread_type === 'dm'
  );

  const followMutation = useMutation({
    mutationFn: () => base44.entities.UserFollow.create({
      follower_email: currentUser.email,
      following_email: profileUser.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['following']);
      toast.success(`Following ${profileUser.full_name}!`);
      
      // Send notification to the followed user (fire and forget)
      notifyNewFollower(
        currentUser.full_name || currentUser.email?.split('@')[0] || 'Someone',
        currentUser.email,
        profileUser.email
      );
    }
  });

  const unfollowMutation = useMutation({
    mutationFn: () => {
      const followRecord = following.find(f => f.following_email === profileUser.email);
      return base44.entities.UserFollow.delete(followRecord.id);
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
          title: `${profileUser.full_name} on HOTMESS`,
          text: `Check out ${profileUser.full_name}'s profile`,
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
        className="border-2 border-white text-white hover:bg-white hover:text-black font-black"
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
        className="bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black font-black border-2 border-white"
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        MESSAGE
      </Button>

      <Button
        onClick={handleShare}
        variant="ghost"
        size="icon"
        className="border-2 border-white/20 hover:border-white"
      >
        <Share2 className="w-4 h-4" />
      </Button>
    </div>
  );
}