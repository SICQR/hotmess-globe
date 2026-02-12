/**
 * Neon Minimal Theme - Clean modern messaging with HOTMESS brand accents
 * Style: Rounded bubbles, subtle shadows, smooth animations
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Image, ArrowLeft, Loader2, Check, CheckCheck, Smile, X, Bell, BellOff, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function NeonMinimal({
  messages,
  currentUser,
  otherUsers,
  isGroupChat,
  thread,
  messageText,
  setMessageText,
  handleSend,
  handleImageUpload,
  handleVideoUpload,
  handleTyping,
  handleReaction,
  uploading,
  sendMutation,
  onBack,
  readOnly,
  isMuted,
  toggleMute,
  showReactions,
  setShowReactions,
  messagesEndRef,
  filteredMessages,
  allUsers,
  searchQuery,
  setSearchQuery,
  showSearch,
  setShowSearch,
  REACTIONS,
  isTyping,
}) {
  const getDisplayName = (user) => {
    if (!user) return 'Unknown';
    return user.full_name || user.display_name || user.username || 'Unknown';
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-black/80 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors md:hidden"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        
        <div className="flex items-center gap-3 flex-1">
          {!isGroupChat && otherUsers[0] ? (
            <>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center overflow-hidden">
                  {otherUsers[0]?.avatar_url ? (
                    <img src={otherUsers[0].avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-sm text-white">{getDisplayName(otherUsers[0])[0]}</span>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#39FF14] rounded-full border-2 border-[#0a0a0a]" />
              </div>
              <div>
                <p className="font-semibold text-white">{getDisplayName(otherUsers[0])}</p>
                <p className="text-xs text-white/50">Online</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-sm">👥</span>
              </div>
              <div>
                <p className="font-semibold text-white">
                  {otherUsers.slice(0, 2).map(u => getDisplayName(u)).join(', ')}
                </p>
                <p className="text-xs text-white/50">{otherUsers.length} members</p>
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => setShowSearch(!showSearch)}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <Search className="w-5 h-5 text-white/60" />
        </button>
        
        <button
          onClick={toggleMute}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          {isMuted ? <BellOff className="w-5 h-5 text-white/60" /> : <Bell className="w-5 h-5 text-white/60" />}
        </button>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="bg-black/60 backdrop-blur-sm p-3 border-b border-white/10">
          <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2">
            <Search className="w-4 h-4 text-white/40" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="flex-1 bg-transparent text-white text-sm placeholder:text-white/40 outline-none"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {filteredMessages.map((msg, idx) => {
            const isOwn = msg.sender_email === currentUser.email;
            const sender = allUsers.find(u => u.email === msg.sender_email);
            const showAvatar = !isOwn && (idx === 0 || filteredMessages[idx - 1]?.sender_email !== msg.sender_email);

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-2 max-w-[75%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  {!isOwn && (
                    <div className="w-8 flex-shrink-0">
                      {showAvatar && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center overflow-hidden">
                          {sender?.avatar_url ? (
                            <img src={sender.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-white">{getDisplayName(sender)[0]}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div>
                    {/* Sender name for group chats */}
                    {isGroupChat && !isOwn && showAvatar && (
                      <p className="text-xs text-white/50 mb-1 ml-1">{getDisplayName(sender)}</p>
                    )}
                    
                    {/* Message bubble */}
                    {msg.message_type === 'text' && (
                      <div
                        className={`px-4 py-2.5 rounded-2xl ${
                          isOwn
                            ? 'bg-[#FF1493] text-black rounded-br-sm'
                            : 'bg-[#1a1a1a] text-white rounded-bl-sm'
                        }`}
                        style={isOwn ? { boxShadow: '0 2px 12px rgba(255, 20, 147, 0.3)' } : {}}
                      >
                        <p className="text-[15px] leading-relaxed">{msg.content}</p>
                      </div>
                    )}

                    {/* Image */}
                    {msg.message_type === 'image' && msg.metadata?.image_url && (
                      <div className={`rounded-2xl overflow-hidden ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                        <img 
                          src={msg.metadata.image_url} 
                          alt="" 
                          className="max-w-full max-h-64 object-cover"
                        />
                      </div>
                    )}

                    {/* Video */}
                    {msg.message_type === 'video' && msg.metadata?.video_url && (
                      <div className={`rounded-2xl overflow-hidden ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                        <video 
                          src={msg.metadata.video_url} 
                          controls
                          className="max-w-full max-h-64"
                        />
                      </div>
                    )}
                    
                    {/* Timestamp & read status */}
                    <div className={`flex items-center gap-1.5 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] text-white/40">
                        {format(new Date(msg.created_date), 'HH:mm')}
                      </span>
                      {isOwn && (
                        msg.read_by?.length > 1 
                          ? <CheckCheck className="w-3.5 h-3.5 text-[#00D9FF]" />
                          : <Check className="w-3.5 h-3.5 text-white/40" />
                      )}
                    </div>

                    {/* Reactions */}
                    {msg.metadata?.reactions && Object.keys(msg.metadata.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(
                          Object.values(msg.metadata.reactions).flat().reduce((acc, emoji) => {
                            acc[emoji] = (acc[emoji] || 0) + 1;
                            return acc;
                          }, {})
                        ).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            className="px-1.5 py-0.5 bg-white/10 rounded-full text-sm flex items-center gap-1"
                          >
                            <span>{emoji}</span>
                            {count > 1 && <span className="text-xs text-white/60">{count}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator */}
        {Object.keys(isTyping).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1a] rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-black/80 backdrop-blur-xl border-t border-white/10 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:pb-3">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="neon-image-upload"
            disabled={uploading || readOnly}
          />
          <label htmlFor="neon-image-upload">
            <div className="p-2.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer">
              {uploading ? <Loader2 className="w-5 h-5 text-white/60 animate-spin" /> : <Image className="w-5 h-5 text-white/60" />}
            </div>
          </label>

          <div className="flex-1 flex items-center bg-white/5 rounded-full px-4 py-2">
            <input
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                if (!readOnly) handleTyping();
              }}
              placeholder="Type a message..."
              disabled={readOnly}
              className="flex-1 bg-transparent text-white text-sm placeholder:text-white/40 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowReactions(showReactions ? null : 'input')}
              className="p-1 text-white/40 hover:text-white transition-colors"
            >
              <Smile className="w-5 h-5" />
            </button>
          </div>

          <button
            type="submit"
            disabled={readOnly || !messageText.trim() || sendMutation?.isPending}
            className="p-3 bg-[#FF1493] rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#FF1493]/80 transition-colors"
          >
            {sendMutation?.isPending ? (
              <Loader2 className="w-5 h-5 text-black animate-spin" />
            ) : (
              <Send className="w-5 h-5 text-black" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
