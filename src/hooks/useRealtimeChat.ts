/**
 * useRealtimeChat - Real-time chat notifications like Grindr
 * 
 * Features:
 * - Instant message notifications via Supabase Realtime
 * - Unread badge count
 * - Browser push notifications (with permission)
 * - Sound alerts (optional)
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  thread_id: string;
  sender_email: string;
  content: string;
  message_type: string;
  created_date: string;
  read_by: string[];
}

interface ChatThread {
  id: string;
  participant_emails: string[];
  last_message_at: string;
  unread_count: Record<string, number>;
}

interface UseRealtimeChatOptions {
  userEmail: string | null;
  enabled?: boolean;
  playSound?: boolean;
}

interface UseRealtimeChatReturn {
  unreadCount: number;
  lastMessage: Message | null;
  isConnected: boolean;
}

// Notification sound (base64 encoded short beep)
const NOTIFICATION_SOUND_URL = '/notification.mp3';

export function useRealtimeChat({
  userEmail,
  enabled = true,
  playSound = true,
}: UseRealtimeChatOptions): UseRealtimeChatReturn {
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMessage, setLastMessage] = useState<Message | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();

  // Initialize audio
  useEffect(() => {
    if (playSound && typeof window !== 'undefined') {
      audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
      audioRef.current.volume = 0.5;
    }
  }, [playSound]);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Audio play failed - browser autoplay policy
      });
    }
  }, []);

  // Fetch initial unread count
  useEffect(() => {
    if (!userEmail || !enabled) return;

    const fetchUnreadCount = async () => {
      try {
        const { data: threads, error } = await supabase
          .from('chat_threads')
          .select('unread_count')
          .contains('participant_emails', [userEmail])
          .eq('active', true);

        if (error) throw error;

        const total = (threads || []).reduce((sum, thread) => {
          const count = thread.unread_count?.[userEmail] || 0;
          return sum + count;
        }, 0);

        setUnreadCount(total);
      } catch (err) {
        console.error('[useRealtimeChat] Error fetching unread count:', err);
      }
    };

    fetchUnreadCount();
  }, [userEmail, enabled]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!userEmail || !enabled) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtime = async () => {
      // Get user's thread IDs first
      const { data: threads } = await supabase
        .from('chat_threads')
        .select('id')
        .contains('participant_emails', [userEmail])
        .eq('active', true);

      const threadIds = threads?.map(t => t.id) || [];
      if (threadIds.length === 0) return;

      // Subscribe to messages in user's threads
      channel = supabase
        .channel(`messages-${userEmail}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          async (payload) => {
            const newMessage = payload.new as Message;
            
            // Ignore own messages
            if (newMessage.sender_email === userEmail) return;
            
            // Check if message is in user's threads
            if (!threadIds.includes(newMessage.thread_id)) return;

            setLastMessage(newMessage);
            setUnreadCount(prev => prev + 1);

            // Play sound
            if (playSound) {
              playNotificationSound();
            }

            // Get sender info for notification
            const { data: senderData } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('email', newMessage.sender_email)
              .single();

            const senderName = senderData?.full_name || 'Someone';

            // Show toast notification
            toast(senderName, {
              description: newMessage.content?.slice(0, 50) || 'Sent a message',
              action: {
                label: 'Reply',
                onClick: () => navigate(`/social/inbox?thread=${newMessage.thread_id}`),
              },
              duration: 5000,
            });

            // Browser notification (if permission granted and tab not focused)
            if (
              'Notification' in window &&
              Notification.permission === 'granted' &&
              document.visibilityState !== 'visible'
            ) {
              const notification = new Notification(senderName, {
                body: newMessage.content?.slice(0, 100) || 'Sent a message',
                icon: senderData?.avatar_url || '/icon.png',
                badge: '/icon.png',
                tag: `message-${newMessage.id}`,
                vibrate: [200, 100, 200],
              } as NotificationOptions & { vibrate?: number[] });

              notification.onclick = () => {
                window.focus();
                navigate(`/social/inbox?thread=${newMessage.thread_id}`);
                notification.close();
              };

              // Auto-close after 5 seconds
              setTimeout(() => notification.close(), 5000);
            }
          }
        )
        .subscribe((status) => {
          setIsConnected(status === 'SUBSCRIBED');
          console.log('[useRealtimeChat] Subscription status:', status);
        });
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userEmail, enabled, playSound, playNotificationSound, navigate]);

  // Mark messages as read when opening a thread
  const markAsRead = useCallback(async (threadId: string) => {
    if (!userEmail) return;

    try {
      // Update all unread messages in thread
      await supabase
        .from('messages')
        .update({ read_by: supabase.sql`array_append(read_by, ${userEmail})` })
        .eq('thread_id', threadId)
        .not('read_by', 'cs', `{${userEmail}}`);

      // Update thread unread count
      const { data: thread } = await supabase
        .from('chat_threads')
        .select('unread_count')
        .eq('id', threadId)
        .single();

      if (thread?.unread_count) {
        const newCount = { ...thread.unread_count, [userEmail]: 0 };
        await supabase
          .from('chat_threads')
          .update({ unread_count: newCount })
          .eq('id', threadId);
      }

      // Refresh unread count
      setUnreadCount(prev => Math.max(0, prev - (thread?.unread_count?.[userEmail] || 0)));
    } catch (err) {
      console.error('[useRealtimeChat] Error marking as read:', err);
    }
  }, [userEmail]);

  return {
    unreadCount,
    lastMessage,
    isConnected,
  };
}

export default useRealtimeChat;
