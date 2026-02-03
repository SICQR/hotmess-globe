import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, ShoppingBag, Heart, Users, MapPin, Calendar, BellOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const THREAD_TYPE_ICONS = {
  dm: MessageCircle,
  order: ShoppingBag,
  connect: Heart,
  squad: Users,
  event: Calendar,
  beacon: MapPin,
};

const THREAD_TYPE_COLORS = {
  dm: '#00D9FF',
  order: '#FFEB3B',
  connect: '#FF1493',
  squad: '#B026FF',
  event: '#FF6B35',
  beacon: '#39FF14',
};

// Helper to get display name (username preferred over email)
const getDisplayName = (user) => {
  if (!user) return 'Unknown';
  return user.display_name || user.full_name || user.username || user.email?.split('@')[0] || 'Unknown';
};

// Helper to get username handle
const getUsername = (user) => {
  if (!user) return '';
  if (user.username) return `@${user.username}`;
  return '';
};

export default function ThreadList({ threads, currentUser, allUsers, onSelectThread, selectedThreadId, onNewMessage, canStartNew = true }) {
  return (
    <div className="space-y-2">
      {threads.map((thread, idx) => {
        const Icon = THREAD_TYPE_ICONS[thread.thread_type] || MessageCircle;
        const color = THREAD_TYPE_COLORS[thread.thread_type] || '#FF1493';
        
        const currentEmail = currentUser?.email || '';
        const participantEmails = Array.isArray(thread.participant_emails) ? thread.participant_emails : [];
        const otherParticipants = participantEmails.filter(email => email !== currentEmail);
        const otherUsers = (allUsers || []).filter(u => u?.email && otherParticipants.includes(u.email));
        const unreadCount = thread.unread_count?.[currentEmail] || 0;
        const isGroupChat = otherUsers.length > 1;
        const isMuted = thread.muted_by?.includes(currentEmail) || false;
        const isSelected = selectedThreadId === thread.id;

        return (
          <motion.button
            key={thread.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.03 }}
            onClick={() => onSelectThread(thread)}
            className={`w-full bg-black hover:bg-white/5 border-2 p-4 transition-all text-left ${
              isSelected 
                ? 'border-[#FF1493] bg-[#FF1493]/10' 
                : unreadCount > 0 
                  ? 'border-[#FF1493]' 
                  : 'border-white/20 hover:border-white/40'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              {!isGroupChat && otherUsers[0] ? (
                <div className="w-12 h-12 bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center flex-shrink-0 border-2 border-white">
                  {otherUsers[0].avatar_url ? (
                    <img src={otherUsers[0].avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold">{getDisplayName(otherUsers[0])[0].toUpperCase()}</span>
                  )}
                </div>
              ) : (
                <div className="w-12 h-12 bg-white/10 border-2 border-white flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-white/60" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-black uppercase tracking-tight truncate text-sm">
                    {isGroupChat 
                      ? `${otherUsers.slice(0, 2).map(u => getDisplayName(u)).join(', ')}${otherUsers.length > 2 ? ` +${otherUsers.length - 2}` : ''}`
                      : getDisplayName(otherUsers[0])
                    }
                  </p>
                  {thread.last_message_at && (
                    <span className="text-[10px] text-white/40 ml-2 flex-shrink-0 font-mono">
                      {format(new Date(thread.last_message_at), 'HH:mm')}
                    </span>
                  )}
                </div>

                {/* Username handle */}
                {!isGroupChat && getUsername(otherUsers[0]) && (
                  <p className="text-[10px] text-white/50 font-mono mb-1">{getUsername(otherUsers[0])}</p>
                )}

                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-3 h-3" style={{ color }} />
                  <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{thread.thread_type}</span>
                  {isMuted && (
                    <BellOff className="w-3 h-3 text-white/40" title="Muted" />
                  )}
                </div>

                {thread.last_message && (
                  <p className={`text-xs truncate font-mono ${unreadCount > 0 ? 'text-white' : 'text-white/60'}`}>
                    {thread.last_message}
                  </p>
                )}
              </div>

              {unreadCount > 0 && (
                <Badge className="bg-[#FF1493] text-black flex-shrink-0 font-black border-2 border-white">
                  {unreadCount}
                </Badge>
              )}
            </div>
          </motion.button>
        );
      })}

      {threads.length === 0 && (
        <div className="text-center py-20">
          <div className="w-24 h-24 bg-black border-2 border-white/20 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-12 h-12 text-white/20" />
          </div>
          <p className="text-white/40 uppercase font-bold text-sm">NO CONVERSATIONS YET</p>
          <p className="text-white/20 text-xs font-mono mt-1">START A NEW MESSAGE</p>
        </div>
      )}
    </div>
  );
}