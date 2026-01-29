/**
 * Notification Center Component
 * 
 * Displays all user notifications with real-time updates.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Heart, 
  MessageSquare, 
  Calendar,
  Gift,
  Shield,
  Star,
  User,
  X,
  Check,
  Trash2,
  Settings,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/utils/AuthProvider';
import { supabase } from '@/components/utils/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

// Notification type configs
const NOTIFICATION_TYPES = {
  match: { icon: Heart, color: '#FF1493', label: 'New Match' },
  message: { icon: MessageSquare, color: '#00D9FF', label: 'Message' },
  like: { icon: Star, color: '#FFB800', label: 'Like' },
  view: { icon: User, color: '#B026FF', label: 'Profile View' },
  event: { icon: Calendar, color: '#39FF14', label: 'Event' },
  safety: { icon: Shield, color: '#FF1493', label: 'Safety' },
  system: { icon: Bell, color: '#FFFFFF', label: 'System' },
  promo: { icon: Gift, color: '#FFB800', label: 'Offer' }
};

export default function NotificationCenter({ 
  isOpen, 
  onClose,
  className = '' 
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Fetch notifications
  useEffect(() => {
    async function fetchNotifications() {
      if (!user?.id) return;

      setLoading(true);
      
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter !== 'all') {
        query = query.eq('notification_type', filter);
      }

      const { data, error } = await query;

      if (!error) {
        setNotifications(data || []);
      }
      setLoading(false);
    }

    if (isOpen) {
      fetchNotifications();
    }
  }, [user?.id, isOpen, filter]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id || !isOpen) return;

    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [user?.id, isOpen]);

  // Mark as read
  const markAsRead = async (notificationId) => {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
    );
  };

  // Mark all as read
  const markAllAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);

    setNotifications(prev => 
      prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  // Handle notification click
  const handleClick = (notification) => {
    markAsRead(notification.id);
    
    // Navigate based on type
    const routes = {
      match: `/profile/${notification.payload?.user_id}`,
      message: `/messages/${notification.payload?.thread_id}`,
      like: `/profile/${notification.payload?.user_id}`,
      view: '/insights/views',
      event: `/events/${notification.payload?.event_id}`,
      safety: '/safety'
    };

    const route = routes[notification.notification_type];
    if (route) {
      navigate(route);
      onClose();
    }
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        fixed top-16 right-4 w-96 max-h-[70vh] bg-black border-2 border-white/20 
        shadow-2xl z-50 flex flex-col ${className}
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#FF1493]" />
          <h3 className="font-bold text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-[#FF1493] text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-white/60 hover:text-white"
            >
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="p-1 hover:bg-white/10">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="p-2 border-b border-white/10 flex gap-1 overflow-x-auto">
        {['all', 'match', 'message', 'event'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`
              px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors
              ${filter === f 
                ? 'bg-[#FF1493] text-white' 
                : 'bg-white/5 text-white/60 hover:text-white'
              }
            `}
          >
            {f === 'all' ? 'All' : NOTIFICATION_TYPES[f]?.label || f}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-white/40" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Bell className="w-10 h-10 text-white/20 mb-3" />
            <p className="text-white/60">No notifications yet</p>
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map((notification) => {
              const config = NOTIFICATION_TYPES[notification.notification_type] || NOTIFICATION_TYPES.system;
              const Icon = config.icon;
              const isUnread = !notification.read_at;

              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`
                    p-3 border-b border-white/5 cursor-pointer
                    hover:bg-white/5 transition-colors group
                    ${isUnread ? 'bg-white/5' : ''}
                  `}
                  onClick={() => handleClick(notification)}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div 
                      className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${config.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: config.color }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${isUnread ? 'text-white font-medium' : 'text-white/80'}`}>
                          {notification.title}
                        </p>
                        {isUnread && (
                          <div className="w-2 h-2 rounded-full bg-[#FF1493] flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      {notification.body && (
                        <p className="text-xs text-white/50 mt-0.5 line-clamp-2">
                          {notification.body}
                        </p>
                      )}
                      <p className="text-[10px] text-white/30 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3 text-white/40" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={() => {
            navigate('/settings/notifications');
            onClose();
          }}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-white/60 hover:text-white transition-colors"
        >
          <Settings className="w-3 h-3" />
          Notification Settings
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Notification Bell with Badge
 */
export function NotificationBell({ className = '' }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch unread count
  useEffect(() => {
    async function fetchCount() {
      if (!user?.id) return;

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null);

      setUnreadCount(count || 0);
    }

    fetchCount();

    // Subscribe to new notifications
    const subscription = supabase
      .channel('notification-count')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user?.id}`
      }, () => {
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [user?.id]);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 hover:bg-white/10 transition-colors ${className}`}
      >
        <Bell className="w-5 h-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF1493] text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <NotificationCenter isOpen={isOpen} onClose={() => setIsOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
