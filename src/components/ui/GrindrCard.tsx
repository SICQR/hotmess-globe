import React from 'react';
import { MessageCircle } from 'lucide-react';

type Props = {
  name: string;
  photo: string;
  distance?: string;
  isOnline?: boolean;
  lastSeen?: string;
  lookingFor?: string[];
  onTap: () => void;
  onMessage: () => void;
};

export function GrindrCard({ name, photo, distance, isOnline, lastSeen, lookingFor, onTap, onMessage }: Props) {
  return (
    <div 
      className="relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-900 cursor-pointer group"
      onClick={onTap}
    >
      {/* Photo */}
      <img 
        src={photo || '/placeholder-avatar.png'} 
        alt={name}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      
      {/* Online indicator */}
      {isOnline && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full border-2 border-black shadow-lg" />
      )}
      
      {/* Distance badge */}
      {distance && (
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 rounded-full text-xs text-white font-medium">
          {distance}
        </div>
      )}
      
      {/* Bottom gradient with info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3">
        <div className="flex items-end justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{name}</p>
            {lastSeen && !isOnline && (
              <p className="text-white/50 text-xs">{lastSeen}</p>
            )}
            {lookingFor && lookingFor.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {lookingFor.slice(0, 2).map((tag, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-fuchsia-600/80 rounded text-[10px] text-white">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {/* Message button */}
          <button
            onClick={(e) => { e.stopPropagation(); onMessage(); }}
            className="w-9 h-9 flex items-center justify-center bg-fuchsia-600 rounded-full hover:bg-fuchsia-500 transition-colors ml-2 shrink-0"
          >
            <MessageCircle className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default GrindrCard;
