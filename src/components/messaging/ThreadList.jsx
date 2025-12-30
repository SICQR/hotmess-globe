import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, ShoppingBag, Heart, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const THREAD_TYPE_ICONS = {
  dm: MessageCircle,
  order: ShoppingBag,
  connect: Heart,
  squad: Users,
};

const THREAD_TYPE_COLORS = {
  dm: '#00D9FF',
  order: '#FFEB3B',
  connect: '#FF1493',
  squad: '#B026FF',
};

export default function ThreadList({ threads, currentUser, allUsers, onSelectThread }) {
  return (
    <div className="space-y-2">
      {threads.map((thread, idx) => {
        const Icon = THREAD_TYPE_ICONS[thread.thread_type] || MessageCircle;
        const color = THREAD_TYPE_COLORS[thread.thread_type] || '#FF1493';
        
        const otherParticipants = thread.participant_emails.filter(email => email !== currentUser.email);
        const otherUsers = allUsers.filter(u => otherParticipants.includes(u.email));
        const unreadCount = thread.unread_count?.[currentUser.email] || 0;

        return (
          <motion.button
            key={thread.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => onSelectThread(thread)}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-all text-left"
          >
            <div className="flex items-start gap-3">
              {otherUsers.length === 1 ? (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center flex-shrink-0">
                  <span className="font-bold">{otherUsers[0].full_name?.[0] || 'U'}</span>
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-white/60" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold truncate">
                    {otherUsers.map(u => u.full_name).join(', ') || 'Unknown'}
                  </p>
                  {thread.last_message_at && (
                    <span className="text-xs text-white/40 ml-2 flex-shrink-0">
                      {format(new Date(thread.last_message_at), 'HH:mm')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Icon className="w-3 h-3" style={{ color }} />
                  <span className="text-xs text-white/40 uppercase tracking-wider">{thread.thread_type}</span>
                </div>

                {thread.last_message && (
                  <p className="text-sm text-white/60 truncate mt-1">{thread.last_message}</p>
                )}
              </div>

              {unreadCount > 0 && (
                <Badge className="bg-[#FF1493] text-black flex-shrink-0">
                  {unreadCount}
                </Badge>
              )}
            </div>
          </motion.button>
        );
      })}

      {threads.length === 0 && (
        <div className="text-center py-20">
          <MessageCircle className="w-12 h-12 text-white/20 mx-auto mb-2" />
          <p className="text-white/40">No conversations yet</p>
        </div>
      )}
    </div>
  );
}