import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

export default function RightNowNotifications({ currentUser }) {
  const { data: rightNowUsers = [] } = useQuery({
    queryKey: ['right-now-active'],
    queryFn: () => base44.entities.RightNowStatus.filter({ active: true }),
    enabled: !!currentUser,
    refetchInterval: 30000 // Check every 30 seconds
  });

  const { data: userTags = [] } = useQuery({
    queryKey: ['user-tags', currentUser?.email],
    queryFn: () => base44.entities.UserTag.filter({ user_email: currentUser.email }),
    enabled: !!currentUser
  });

  const { data: allUserTags = [] } = useQuery({
    queryKey: ['all-user-tags'],
    queryFn: () => base44.entities.UserTag.list(),
    enabled: !!currentUser,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!currentUser,
  });

  useEffect(() => {
    if (!currentUser || rightNowUsers.length === 0) return;

    // Don't show notifications during onboarding
    const hasCompletedTour = localStorage.getItem('hotmess_welcome_tour_completed');
    const hasCookieConsent = localStorage.getItem('hotmess_cookie_consent');
    if (!hasCompletedTour || !hasCookieConsent) return;

    // Find compatible matches who just went Right Now
    const myEssentialTags = userTags.filter(t => t.is_essential).map(t => t.tag_id);
    const myDealbreakers = userTags.filter(t => t.is_dealbreaker).map(t => t.tag_id);

    rightNowUsers.forEach(status => {
      if (status.user_email === currentUser.email) return;

      // Check if this is a new Right Now status (created in last minute)
      const createdAt = new Date(status.created_date);
      const now = new Date();
      const diffMinutes = (now - createdAt) / 1000 / 60;
      
      if (diffMinutes > 1) return; // Skip old statuses

      // Get their tags
      const theirTags = allUserTags.filter(t => t.user_email === status.user_email).map(t => t.tag_id);
      
      // Check compatibility
      const hasMyEssentials = myEssentialTags.every(tag => theirTags.includes(tag));
      const hasDealbreakers = myDealbreakers.some(tag => theirTags.includes(tag));
      
      if (hasMyEssentials && !hasDealbreakers) {
        const user = allUsers.find(u => u.email === status.user_email);
        const userName = user?.full_name || 'Someone';
        
        // Calculate match percentage
        const commonTags = userTags.filter(t => theirTags.includes(t.tag_id)).length;
        const totalTags = Math.max(userTags.length, theirTags.length);
        const matchPercent = totalTags > 0 ? Math.round((commonTags / totalTags) * 100) : 0;

        toast.success(`${userName} is Right Now! ${matchPercent}% match`, {
          description: 'Check Connect to view their profile',
          duration: 8000
        });
      }
    });
  }, [rightNowUsers, currentUser, userTags, allUserTags, allUsers]);

  return null; // Background service
}