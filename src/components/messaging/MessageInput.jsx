import React from 'react';
import { Send, Image, Video, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
 * Message input component with file upload support
 */
export default function MessageInput({
  messageText,
  setMessageText,
  onSend,
  onImageUpload,
  onVideoUpload,
  onTyping,
  uploading,
  readOnly,
  isSending,
  personasEnabled,
  boundProfile,
}) {
  return (
    <form onSubmit={onSend} className="bg-black border-t-2 border-white/20 p-4">
      {/* Bound Persona Indicator */}
      {personasEnabled && boundProfile && (
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
          <span className="text-[10px] text-white/40 uppercase tracking-wider">Sending as:</span>
          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
            <span>{getPersonaIcon(boundProfile)}</span>
            <span className="font-medium">{boundProfile.type_label || boundProfile.type_key || 'Main Profile'}</span>
          </div>
          {boundProfile.kind !== 'MAIN' && (
            <span className="text-[10px] text-white/30 italic">
              (locked to this conversation)
            </span>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="image/*"
          onChange={onImageUpload}
          className="hidden"
          id="image-upload"
          disabled={uploading || readOnly}
        />
        <label htmlFor="image-upload">
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            disabled={uploading || readOnly} 
            asChild
            className="text-white/60 hover:text-white hover:bg-white/10 border-2 border-white/20 hover:border-white"
          >
            <span>
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Image className="w-5 h-5" />}
            </span>
          </Button>
        </label>

        <input
          type="file"
          accept="video/*"
          onChange={onVideoUpload}
          className="hidden"
          id="video-upload"
          disabled={uploading || readOnly}
        />
        <label htmlFor="video-upload">
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            disabled={uploading || readOnly} 
            asChild
            className="text-white/60 hover:text-white hover:bg-white/10 border-2 border-white/20 hover:border-white"
          >
            <span>
              <Video className="w-5 h-5" />
            </span>
          </Button>
        </label>

        <Input
          value={messageText}
          onChange={(e) => {
            setMessageText(e.target.value);
            if (!readOnly && onTyping) onTyping();
          }}
          placeholder="TYPE MESSAGE..."
          disabled={readOnly}
          className="flex-1 bg-black border-2 border-white/20 text-white placeholder:text-white/40 placeholder:uppercase placeholder:font-mono placeholder:text-xs focus:border-white"
        />

        <Button 
          type="submit" 
          size="icon"
          disabled={readOnly || !messageText.trim() || isSending}
          className="bg-[#E62020] hover:bg-white text-black border-2 border-white"
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
    </form>
  );
}
