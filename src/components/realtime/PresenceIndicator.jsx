import React from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

/**
 * Online Status Dot
 * Shows a simple online/offline indicator
 */
export function OnlineStatusDot({ isOnline, size = 'sm', className = '' }) {
  const sizes = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };
  
  return (
    <span 
      className={`
        ${sizes[size]} rounded-full inline-block
        ${isOnline ? 'bg-[#39FF14]' : 'bg-white/30'}
        ${isOnline ? 'animate-pulse' : ''}
        ${className}
      `}
      title={isOnline ? 'Online' : 'Offline'}
    />
  );
}

/**
 * User Presence Badge
 * Shows user status with avatar
 */
export function UserPresenceBadge({ 
  user, 
  isOnline, 
  lastSeen,
  showLastSeen = true,
  size = 'md' 
}) {
  const formatLastSeen = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };
  
  const sizes = {
    sm: { avatar: 'w-8 h-8', dot: 'w-2 h-2 -right-0.5 -bottom-0.5' },
    md: { avatar: 'w-10 h-10', dot: 'w-2.5 h-2.5 -right-0.5 -bottom-0.5' },
    lg: { avatar: 'w-12 h-12', dot: 'w-3 h-3 -right-1 -bottom-1' },
  };
  
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className={`${sizes[size].avatar} rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center overflow-hidden`}>
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold">
              {user.full_name?.[0] || user.email?.[0] || '?'}
            </span>
          )}
        </div>
        <span className={`
          absolute ${sizes[size].dot} rounded-full border-2 border-black
          ${isOnline ? 'bg-[#39FF14]' : 'bg-white/30'}
        `} />
      </div>
      
      <div>
        <div className="font-semibold">{user.full_name || user.display_name}</div>
        {showLastSeen && (
          <div className="text-xs text-white/60">
            {isOnline ? (
              <span className="text-[#39FF14]">Online</span>
            ) : (
              <span>{formatLastSeen(lastSeen)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Typing Indicator
 * Shows animated dots when someone is typing
 */
export function TypingIndicator({ users = [] }) {
  if (users.length === 0) return null;
  
  const getText = () => {
    if (users.length === 1) {
      return `${users[0].full_name || 'Someone'} is typing`;
    }
    if (users.length === 2) {
      return `${users[0].full_name} and ${users[1].full_name} are typing`;
    }
    return `${users.length} people are typing`;
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 text-sm text-white/60 px-4 py-2"
    >
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 bg-[#FF1493] rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.1,
            }}
          />
        ))}
      </div>
      <span>{getText()}</span>
    </motion.div>
  );
}

/**
 * Online Users Count
 * Shows the number of users currently online
 */
export function OnlineUsersCount({ count, max = 99, showIcon = true }) {
  const displayCount = count > max ? `${max}+` : count;
  
  return (
    <div className="flex items-center gap-2 text-sm">
      {showIcon && <Users className="w-4 h-4 text-[#39FF14]" />}
      <span className="text-white/80">
        <span className="font-bold text-[#39FF14]">{displayCount}</span>
        {' '}online
      </span>
    </div>
  );
}

/**
 * Presence List
 * Shows a list of online users
 */
export function PresenceList({ users = [], maxDisplay = 5 }) {
  const onlineUsers = users.filter(u => u.online);
  const displayUsers = onlineUsers.slice(0, maxDisplay);
  const remainingCount = onlineUsers.length - maxDisplay;
  
  if (onlineUsers.length === 0) {
    return (
      <div className="text-center py-4 text-white/40">
        No one else is here right now
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/60">Currently Online</span>
        <OnlineUsersCount count={onlineUsers.length} showIcon={false} />
      </div>
      
      <div className="space-y-2">
        {displayUsers.map((user) => (
          <UserPresenceBadge
            key={user.id || user.email}
            user={user}
            isOnline={true}
            size="sm"
            showLastSeen={false}
          />
        ))}
        
        {remainingCount > 0 && (
          <div className="text-sm text-white/40 pl-11">
            +{remainingCount} more online
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Connection Status Banner
 * Shows when the real-time connection is interrupted
 */
export function ConnectionStatusBanner({ status, onRetry }) {
  if (status === 'connected') return null;
  
  const statusConfig = {
    connecting: {
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/40',
      text: 'Connecting...',
      icon: '🔄',
    },
    disconnected: {
      bg: 'bg-red-500/20',
      border: 'border-red-500/40',
      text: 'Disconnected',
      icon: '⚠️',
    },
    reconnecting: {
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/40',
      text: 'Reconnecting...',
      icon: '🔄',
    },
    error: {
      bg: 'bg-red-500/20',
      border: 'border-red-500/40',
      text: 'Connection error',
      icon: '❌',
    },
  };
  
  const config = statusConfig[status] || statusConfig.error;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${config.bg} ${config.border} border rounded-lg px-4 py-2 flex items-center justify-between`}
    >
      <div className="flex items-center gap-2">
        <span>{config.icon}</span>
        <span className="text-sm">{config.text}</span>
      </div>
      {(status === 'disconnected' || status === 'error') && onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-white/60 hover:text-white underline"
        >
          Retry
        </button>
      )}
    </motion.div>
  );
}

export default {
  OnlineStatusDot,
  UserPresenceBadge,
  TypingIndicator,
  OnlineUsersCount,
  PresenceList,
  ConnectionStatusBanner,
};
