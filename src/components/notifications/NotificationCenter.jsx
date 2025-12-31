import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, Check, Trash2, MessageCircle, Package, Heart, Flag, MapPin, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { createPageUrl } from '../../utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const NOTIFICATION_ICONS = {
  order: Package,
  message: MessageCircle,
  post_like: Heart,
  post_comment: MessageCircle,
  escrow_release: Package,
  shadow_beacon: MapPin,
  flagged_post: Flag,
  event_reminder: MapPin,
  admin_alert: Shield,
};

export default function NotificationCenter({ currentUser }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', currentUser?.email],
    queryFn: () => {
      if (currentUser?.role === 'admin') {
        return base44.entities.Notification.filter(
          { user_email: ['admin', currentUser.email] },
          '-created_date',
          50
        );
      }
      return base44.entities.Notification.filter({ user_email: currentUser.email }, '-created_date', 50);
    },
    enabled: !!currentUser,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId) => base44.entities.Notification.update(notificationId, { read: true }),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      await Promise.all(unreadIds.map(id => base44.entities.Notification.update(id, { read: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      toast.success('All notifications marked as read');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (notificationId) => base44.entities.Notification.delete(notificationId),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      navigate(createPageUrl(notification.link));
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-white hover:text-[#FF1493] transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF1493] text-black text-[10px] font-black flex items-center justify-center rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 bg-black border-2 border-white/20 p-0" align="end">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-black uppercase text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              onClick={() => markAllReadMutation.mutate()}
              variant="ghost"
              size="sm"
              className="text-xs text-white/60 hover:text-white"
              disabled={markAllReadMutation.isPending}
            >
              <Check className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-white/40">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {notifications.map((notification) => {
                const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
                return (
                  <div
                    key={notification.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      notification.read ? 'bg-black hover:bg-white/5' : 'bg-white/10 hover:bg-white/15'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        notification.read ? 'bg-white/10' : 'bg-[#FF1493]'
                      }`}>
                        <Icon className={`w-4 h-4 ${notification.read ? 'text-white/40' : 'text-black'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold mb-1">{notification.title}</p>
                        <p className="text-xs text-white/60 mb-2 line-clamp-2">{notification.message}</p>
                        <p className="text-[10px] text-white/40 uppercase">
                          {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 h-8 w-8 text-white/40 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(notification.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}