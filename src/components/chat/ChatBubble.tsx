import React from 'react';
import { Check, CheckCheck } from 'lucide-react';

type Props = {
  content: string;
  timestamp: string;
  isMe: boolean;
  isRead?: boolean;
  senderName?: string;
  senderAvatar?: string;
};

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  if (isToday) return time;
  if (isYesterday) return `Yesterday ${time}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

export function ChatBubble({ content, timestamp, isMe, isRead, senderName, senderAvatar }: Props) {
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}>
      {!isMe && senderAvatar && (
        <img 
          src={senderAvatar} 
          alt={senderName || ''} 
          className="w-8 h-8 rounded-full mr-2 object-cover shrink-0"
        />
      )}
      
      <div className={`max-w-[75%] ${isMe ? 'order-1' : ''}`}>
        {!isMe && senderName && (
          <p className="text-xs text-white/50 mb-0.5 ml-1">{senderName}</p>
        )}
        
        <div
          className={`px-4 py-2.5 rounded-2xl ${
            isMe
              ? 'bg-[#C8962C] text-white rounded-br-sm'
              : 'bg-[#1C1C1E] text-white rounded-bl-sm'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        </div>

        <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] text-white/40">{formatTime(timestamp)}</span>
          {isMe && (
            isRead
              ? <CheckCheck className="w-3 h-3 text-white/70" />
              : <Check className="w-3 h-3 text-white/40" />
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatBubble;
