import React from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck, Smile, ZoomIn } from 'lucide-react';
import { format } from 'date-fns';
import ReactionPicker from './ReactionPicker';

// Get persona icon for display
const getPersonaIcon = (profile) => {
  if (!profile) return null;
  if (profile.kind === 'MAIN' || profile.profile_kind === 'MAIN') return '👤';
  const typeKey = profile.type_key || profile.profile_type_key;
  switch (typeKey) {
    case 'TRAVEL': return '✈️';
    case 'WEEKEND': return '🌙';
    default: return '🎭';
  }
};

/**
 * Individual message bubble component
 */
export default function MessageBubble({
  message,
  isOwn,
  sender,
  isGroupChat,
  participantCount,
  personasEnabled,
  profilesById,
  showReactions,
  onToggleReactions,
  onReaction,
  onMediaClick,
}) {
  const msg = message;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex gap-3 max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isOwn && (
          <div className="w-8 h-8 bg-gradient-to-br from-[#E62020] to-[#B026FF] flex items-center justify-center flex-shrink-0 border-2 border-white">
            {sender?.avatar_url ? (
              <img src={sender.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold">{sender?.full_name?.[0] || 'U'}</span>
            )}
          </div>
        )}
        
        <div>
          {isGroupChat && !isOwn && (
            <p className="text-[10px] text-white/40 uppercase font-bold mb-1 ml-1">
              {sender?.full_name}
              {personasEnabled && msg.sender_profile_id && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded text-[9px]">
                  {getPersonaIcon(profilesById.get(msg.sender_profile_id))}
                  {profilesById.get(msg.sender_profile_id)?.type_label || 'Persona'}
                </span>
              )}
            </p>
          )}
          
          {/* Image Message */}
          {msg.message_type === 'image' && msg.metadata?.image_url && (
            <div 
              className="relative border-2 border-white overflow-hidden mb-2 group cursor-pointer"
              onClick={() => onMediaClick(msg.metadata.image_url, 'image')}
            >
              <img 
                src={msg.metadata.image_url} 
                alt="Sent image" 
                className="max-w-full max-h-96 object-cover grayscale hover:grayscale-0 transition-all"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          )}

          {/* Video Message */}
          {msg.message_type === 'video' && msg.metadata?.video_url && (
            <div 
              className="relative border-2 border-white overflow-hidden mb-2 group cursor-pointer"
              onClick={() => onMediaClick(msg.metadata.video_url, 'video')}
            >
              <video 
                src={msg.metadata.video_url} 
                controls
                className="max-w-full max-h-96 grayscale hover:grayscale-0 transition-all"
              />
            </div>
          )}
          
          {/* Text Message */}
          {msg.message_type === 'text' && (
            <div
              className={`px-4 py-2.5 border-2 ${
                isOwn
                  ? 'bg-[#E62020] border-[#E62020] text-black'
                  : 'bg-black border-white text-white'
              }`}
            >
              <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
            </div>
          )}
          
          {/* System Message */}
          {msg.message_type === 'system' && (
            <div className="text-center text-xs text-white/40 italic uppercase font-mono">
              {msg.content}
            </div>
          )}
          
          {/* Message Footer */}
          <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <p className="text-[10px] text-white/40 font-mono">
              {format(new Date(msg.created_date), 'HH:mm')}
            </p>
            {isOwn && (
              <>
                {msg.read_by.length === 1 ? (
                  <Check className="w-3 h-3 text-white/40" title="Sent" />
                ) : msg.read_by.length === participantCount ? (
                  <CheckCheck className="w-3 h-3 text-[#00D9FF]" title="Read by all" />
                ) : (
                  <CheckCheck className="w-3 h-3 text-[#FFEB3B]" title={`Read by ${msg.read_by.length - 1}/${participantCount - 1}`} />
                )}
              </>
            )}
            
            {/* Reaction Button */}
            <button
              onClick={() => onToggleReactions(msg.id)}
              className="text-white/40 hover:text-white transition-colors"
            >
              <Smile className="w-3 h-3" />
            </button>
          </div>

          {/* Reactions Display */}
          {msg.metadata?.reactions && Object.keys(msg.metadata.reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(
                Object.values(msg.metadata.reactions)
                  .flat()
                  .reduce((acc, emoji) => {
                    acc[emoji] = (acc[emoji] || 0) + 1;
                    return acc;
                  }, {})
              ).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => onReaction(msg.id, emoji)}
                  className="px-2 py-1 bg-white/10 border border-white/20 hover:border-white/40 rounded-full text-sm flex items-center gap-1 transition-colors hover:bg-white/20"
                  title="Click to toggle reaction"
                >
                  <span className="text-base">{emoji}</span>
                  {count > 1 && <span className="text-xs text-white/60">{count}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Reaction Picker */}
          {showReactions === msg.id && (
            <ReactionPicker
              onSelect={(emoji) => onReaction(msg.id, emoji)}
              onClose={() => onToggleReactions(null)}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
