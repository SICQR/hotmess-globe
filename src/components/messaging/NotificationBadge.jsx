import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44, supabase } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';

export default function NotificationBadge({ user }) {
  const [totalUnread, setTotalUnread] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Initial fetch of unread count
  const { data: threads = [] } = useQuery({
    queryKey: ['chat-threads-notifications', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const allThreads = await base44.entities.ChatThread.filter({ active: true });
      return allThreads.filter(t => 
        Array.isArray(t.participant_emails) && t.participant_emails.includes(user.email)
      );
    },
    enabled: !!user?.email,
    staleTime: 30000, // 30s
  });

  // Calculate unread from fetched threads
  useEffect(() => {
    if (!user?.email || !Array.isArray(threads)) {
      setTotalUnread(0);
      return;
    }
    
    const unread = threads.reduce((total, thread) => {
      const threadUnread = thread?.unread_count?.[user.email];
      return total + (typeof threadUnread === 'number' ? threadUnread : 0);
    }, 0);
    
    setTotalUnread(unread);
  }, [threads, user]);

  // Real-time subscription for instant notifications
  useEffect(() => {
    if (!user?.email) return;

    const channel = supabase
      .channel(`chat-badge-${user.email}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new;
          
          // Ignore own messages
          if (newMessage?.sender_email === user.email) return;
          
          // Check if this message is in a thread we're in
          const threadId = newMessage?.thread_id;
          if (!threadId) return;
          
          const { data: thread } = await supabase
            .from('chat_threads')
            .select('participant_emails')
            .eq('id', threadId)
            .single();
          
          if (!thread?.participant_emails?.includes(user.email)) return;
          
          // Increment unread
          setTotalUnread(prev => prev + 1);
          
          // Get sender info for notification
          const { data: sender } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('email', newMessage.sender_email)
            .single();
          
          const senderName = sender?.full_name || 'Someone';
          
          // Browser notification if permitted and not focused
          if (
            'Notification' in window && 
            Notification.permission === 'granted' &&
            document.visibilityState !== 'visible'
          ) {
            const notification = new Notification(senderName, {
              body: String(newMessage.content || 'Sent you a message').slice(0, 100),
              icon: '/icon.png',
              badge: '/icon.png',
              tag: `message-${newMessage.id}`,
              vibrate: [200, 100, 200],
            });
            
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
            
            setTimeout(() => notification.close(), 5000);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  if (totalUnread === 0) return null;

  return (
    <div className="relative">
      <MessageCircle className="w-5 h-5" />
      <Badge className="absolute -top-2 -right-2 bg-[#C8962C] text-black text-xs min-w-[18px] h-[18px] flex items-center justify-center p-0 animate-pulse">
        {totalUnread > 99 ? '99+' : totalUnread}
      </Badge>
    </div>
  );
}