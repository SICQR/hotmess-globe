import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';

export default function NotificationBadge({ user }) {
  const [totalUnread, setTotalUnread] = useState(0);

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
    refetchInterval: 30000, // Poll every 30s (reduced from 3s)
    staleTime: 10000, // 10s
  });

  useEffect(() => {
    if (!user?.email || !Array.isArray(threads)) {
      setTotalUnread(0);
      return;
    }
    
    // Calculate unread safely
    const unread = threads.reduce((total, thread) => {
      // Safely access nested unread_count
      const threadUnread = thread?.unread_count?.[user.email];
      return total + (typeof threadUnread === 'number' ? threadUnread : 0);
    }, 0);
    
    setTotalUnread(unread);

    // Show browser notification for new messages (debounced)
    if (unread > 0 && 'Notification' in window && Notification.permission === 'granted') {
      const lastNotified = parseInt(localStorage.getItem('last_notification_count') || '0', 10);
      const lastNotifiedTime = parseInt(localStorage.getItem('last_notification_time') || '0', 10);
      const now = Date.now();
      
      // Only notify if count increased AND at least 10s passed
      if (unread > lastNotified && (now - lastNotifiedTime > 10000)) {
        new Notification('HOTMESS', {
          body: `You have ${unread} unread message${unread > 1 ? 's' : ''}`,
          icon: '/icon.png',
          badge: '/icon.png',
          tag: 'unread-messages', // Replace previous notification
        });
        localStorage.setItem('last_notification_count', unread.toString());
        localStorage.setItem('last_notification_time', now.toString());
      }
    }
  }, [threads, user]);

  // Don't auto-request notification permission - let user opt-in from settings

  if (totalUnread === 0) return null;

  return (
    <div className="relative">
      <Bell className="w-5 h-5" />
      <Badge className="absolute -top-2 -right-2 bg-[#FF1493] text-black text-xs min-w-[18px] h-[18px] flex items-center justify-center p-0">
        {totalUnread > 9 ? '9+' : totalUnread}
      </Badge>
    </div>
  );
}