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
      const allThreads = await base44.entities.ChatThread.filter({ active: true });
      return allThreads.filter(t => t.participant_emails.includes(user.email));
    },
    enabled: !!user,
    refetchInterval: 3000, // Poll every 3 seconds
  });

  useEffect(() => {
    if (!user) return;
    
    const unread = threads.reduce((total, thread) => {
      return total + (thread.unread_count?.[user.email] || 0);
    }, 0);
    
    setTotalUnread(unread);

    // Show browser notification for new messages
    if (unread > 0 && 'Notification' in window && Notification.permission === 'granted') {
      // Avoid spam by only notifying once per update
      const lastNotified = localStorage.getItem('last_notification_count');
      if (lastNotified !== unread.toString()) {
        new Notification('HOTMESS LONDON', {
          body: `You have ${unread} unread message${unread > 1 ? 's' : ''}`,
          icon: '/icon.png',
          badge: '/icon.png',
        });
        localStorage.setItem('last_notification_count', unread.toString());
      }
    }
  }, [threads, user]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

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