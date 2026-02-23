import React from 'react';

type Props = {
  isOnline: boolean;
  lastSeen?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
};

function formatLastSeen(timestamp?: string): string {
  if (!timestamp) return 'Offline';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return `${Math.floor(diffMins / 1440)}d ago`;
}

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export function OnlineIndicator({ isOnline, lastSeen, size = 'md', showLabel = false }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <div 
        className={`${sizeClasses[size]} rounded-full ${
          isOnline ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-zinc-600'
        }`}
      />
      {showLabel && (
        <span className={`text-xs ${isOnline ? 'text-green-400' : 'text-white/50'}`}>
          {isOnline ? 'Online' : formatLastSeen(lastSeen)}
        </span>
      )}
    </div>
  );
}

export default OnlineIndicator;
