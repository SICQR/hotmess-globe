/**
 * Notification utilities for sending engagement notifications
 */

import { supabase } from '@/components/utils/supabaseClient';

const getAccessToken = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

export type NotificationType = 
  | 'new_follower'
  | 'post_liked'
  | 'post_commented'
  | 'profile_viewed'
  | 'new_message'
  | 'event_reminder'
  | 'match_online'
  | 'streak_expiring';

export type NotificationPayload = {
  type: NotificationType;
  recipient_email: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  action_url?: string;
};

/**
 * Send a notification via the API
 */
export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  try {
    const token = await getAccessToken();
    if (!token) {
      console.warn('No auth token for notification');
      return false;
    }

    const response = await fetch('/api/notifications/dispatch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return false;
  }
}

/**
 * Send follow notification
 */
export async function notifyNewFollower(
  followerName: string,
  followerEmail: string,
  recipientEmail: string
): Promise<boolean> {
  return sendNotification({
    type: 'new_follower',
    recipient_email: recipientEmail,
    title: 'New Follower',
    body: `${followerName} started following you`,
    data: {
      follower_email: followerEmail,
      follower_name: followerName,
    },
    action_url: `/social/u/${encodeURIComponent(followerEmail)}`,
  });
}

/**
 * Send post liked notification
 */
export async function notifyPostLiked(
  likerName: string,
  likerEmail: string,
  recipientEmail: string,
  postId: string,
  postPreview?: string
): Promise<boolean> {
  return sendNotification({
    type: 'post_liked',
    recipient_email: recipientEmail,
    title: 'Post Liked',
    body: `${likerName} liked your post${postPreview ? `: "${postPreview.slice(0, 50)}..."` : ''}`,
    data: {
      liker_email: likerEmail,
      liker_name: likerName,
      post_id: postId,
    },
    action_url: `/feed?post=${postId}`,
  });
}

/**
 * Send profile view notification (batched - call this periodically, not on every view)
 */
export async function notifyProfileViews(
  recipientEmail: string,
  viewCount: number
): Promise<boolean> {
  if (viewCount < 5) return false; // Only notify at threshold

  return sendNotification({
    type: 'profile_viewed',
    recipient_email: recipientEmail,
    title: 'Profile Views',
    body: `Your profile is getting attention - ${viewCount} views today!`,
    data: {
      view_count: viewCount,
    },
    action_url: '/social',
  });
}

/**
 * Send match online notification
 */
export async function notifyMatchOnline(
  matchName: string,
  matchEmail: string,
  recipientEmail: string,
  matchPercentage?: number
): Promise<boolean> {
  return sendNotification({
    type: 'match_online',
    recipient_email: recipientEmail,
    title: 'Match Online',
    body: matchPercentage 
      ? `${matchName} (${matchPercentage}% match) is online now`
      : `${matchName} is online now`,
    data: {
      match_email: matchEmail,
      match_name: matchName,
      match_percentage: matchPercentage,
    },
    action_url: `/social/u/${encodeURIComponent(matchEmail)}`,
  });
}

/**
 * Send streak expiring warning
 */
export async function notifyStreakExpiring(
  recipientEmail: string,
  currentStreak: number
): Promise<boolean> {
  return sendNotification({
    type: 'streak_expiring',
    recipient_email: recipientEmail,
    title: 'Streak Expiring!',
    body: `Your ${currentStreak}-day streak is about to end! Check in to keep it`,
    data: {
      current_streak: currentStreak,
    },
    action_url: '/',
  });
}

/**
 * Track profile view (for batched notifications)
 */
export async function trackProfileView(viewedEmail: string): Promise<void> {
  try {
    const token = await getAccessToken();
    if (!token) return;

    // This would call a dedicated API endpoint to track views
    // For now, we'll use localStorage to batch views client-side
    const key = `profile_views_${viewedEmail}_${new Date().toISOString().slice(0, 10)}`;
    const current = parseInt(localStorage.getItem(key) || '0', 10);
    localStorage.setItem(key, String(current + 1));
  } catch {
    // Silent fail
  }
}
