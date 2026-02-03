/**
 * Ghost Mode Theme - Glass morphism, gradients, glow effects
 * Style: Matches Ghosted swipe UI - premium, floating, animated
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Image, Video, ArrowLeft, Loader2, Check, CheckCheck, Smile, X, Bell, BellOff, Search, Ghost } from 'lucide-react';
import { format } from 'date-fns';

export default function GhostMode({
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
    <div className="flex flex-col h-full bg-black relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#FF1493]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-40 right-10 w-64 h-64 bg-[#B026FF]/20 rounded-full blur-[100px]" />
      </div>

      {/* Header - Floating card style */}
      <div className="relative z-10 p-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-1 rounded-xl hover:bg-white/10 transition-colors md:hidden"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex items-center gap-3 flex-1">
            {!isGroupChat && otherUsers[0] ? (
              <>
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF1493] to-[#B026FF] p-[2px]">
                    <div className="w-full h-full rounded-2xl bg-black flex items-center justify-center overflow-hidden">
                      {otherUsers[0]?.avatar_url ? (
                        <img src={otherUsers[0].avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <span className="font-bold text-white">{getDisplayName(otherUsers[0])[0]}</span>
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#39FF14] rounded-full border-2 border-black flex items-center justify-center">
                    <div className="w-2 h-2 bg-[#39FF14] rounded-full animate-pulse" />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-white">{getDisplayName(otherUsers[0])}</p>
                  <p className="text-xs text-[#39FF14] flex items-center gap-1">
                    <Ghost className="w-3 h-3" /> Active now
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF1493]/50 to-[#B026FF]/50 backdrop-blur flex items-center justify-center">
                  <span className="text-xl">👻</span>
                </div>
                <div>
                  <p className="font-bold text-white">
                    {otherUsers.slice(0, 2).map(u => getDisplayName(u)).join(', ')}
                  </p>
                  <p className="text-xs text-white/50">{otherUsers.length} ghosts</p>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <Search className="w-5 h-5 text-white/60" />
          </button>
          
          <button
            onClick={toggleMute}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            {isMuted ? <BellOff className="w-5 h-5 text-white/60" /> : <Bell className="w-5 h-5 text-white/60" />}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="relative z-10 px-4 pb-2">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 px-4 py-2 flex items-center gap-2">
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
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 relative z-10">
        <AnimatePresence>
          {filteredMessages.map((msg, idx) => {
            const isOwn = msg.sender_email === currentUser.email;
            const sender = allUsers.find(u => u.email === msg.sender_email);
            const showAvatar = !isOwn && (idx === 0 || filteredMessages[idx - 1]?.sender_email !== msg.sender_email);

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  {!isOwn && (
                    <div className="w-8 flex-shrink-0 self-end">
                      {showAvatar && (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF1493] to-[#B026FF] p-[1px]">
                          <div className="w-full h-full rounded-xl bg-black flex items-center justify-center overflow-hidden">
                            {sender?.avatar_url ? (
                              <img src={sender.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-white">{getDisplayName(sender)[0]}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    {/* Sender name for group chats */}
                    {isGroupChat && !isOwn && showAvatar && (
                      <p className="text-xs text-white/50 ml-3">{getDisplayName(sender)}</p>
                    )}
                    
                    {/* Message bubble - Glass morphism */}
                    {msg.message_type === 'text' && (
                      <div
                        className={`px-4 py-3 rounded-2xl backdrop-blur-sm ${
                          isOwn
                            ? 'bg-gradient-to-br from-[#FF1493] to-[#B026FF] text-white rounded-br-md'
                            : 'bg-white/10 text-white rounded-bl-md border border-white/10'
                        }`}
                        style={isOwn ? { 
                          boxShadow: '0 4px 20px rgba(255, 20, 147, 0.4), 0 0 40px rgba(255, 20, 147, 0.1)' 
                        } : {}}
                      >
                        <p className="text-[15px] leading-relaxed">{msg.content}</p>
                      </div>
                    )}

                    {/* Image */}
                    {msg.message_type === 'image' && msg.metadata?.image_url && (
                      <div className={`rounded-2xl overflow-hidden border border-white/10 ${isOwn ? 'rounded-br-md' : 'rounded-bl-md'}`}
                        style={isOwn ? { boxShadow: '0 4px 20px rgba(255, 20, 147, 0.3)' } : {}}>
                        <img 
                          src={msg.metadata.image_url} 
                          alt="" 
                          className="max-w-full max-h-72 object-cover"
                        />
                      </div>
                    )}

                    {/* Video */}
                    {msg.message_type === 'video' && msg.metadata?.video_url && (
                      <div className={`rounded-2xl overflow-hidden border border-white/10 ${isOwn ? 'rounded-br-md' : 'rounded-bl-md'}`}>
                        <video 
                          src={msg.metadata.video_url} 
                          controls
                          className="max-w-full max-h-72"
                        />
                      </div>
                    )}
                    
                    {/* Timestamp & read status */}
                    <div className={`flex items-center gap-1.5 px-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
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
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(
                          Object.values(msg.metadata.reactions).flat().reduce((acc, emoji) => {
                            acc[emoji] = (acc[emoji] || 0) + 1;
                            return acc;
                          }, {})
                        ).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            className="px-2 py-1 bg-white/10 backdrop-blur-sm rounded-full text-sm flex items-center gap-1 border border-white/10 hover:border-white/30 transition-colors"
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
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="flex justify-start"
          >
            <div className="flex items-center gap-2 px-4 py-3 bg-white/10 backdrop-blur-sm rounded-2xl rounded-bl-md border border-white/10">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gradient-to-r from-[#FF1493] to-[#B026FF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gradient-to-r from-[#FF1493] to-[#B026FF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gradient-to-r from-[#FF1493] to-[#B026FF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-white/50">typing...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input - Floating pill */}
      <div className="relative z-10 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:pb-4">
        <form onSubmit={handleSend} className="bg-white/5 backdrop-blur-xl rounded-full border border-white/10 p-2 flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="ghost-image-upload"
            disabled={uploading || readOnly}
          />
          <label htmlFor="ghost-image-upload">
            <div className="p-2.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer">
              {uploading ? <Loader2 className="w-5 h-5 text-white/60 animate-spin" /> : <Image className="w-5 h-5 text-white/60" />}
            </div>
          </label>

          <input
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              if (!readOnly) handleTyping();
            }}
            placeholder="Send a message..."
            disabled={readOnly}
            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/40 outline-none px-2"
          />

          <button
            type="button"
            onClick={() => setShowReactions(showReactions ? null : 'input')}
            className="p-2.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <Smile className="w-5 h-5 text-white/60" />
          </button>

          <button
            type="submit"
            disabled={readOnly || !messageText.trim() || sendMutation?.isPending}
            className="p-3 bg-gradient-to-r from-[#FF1493] to-[#B026FF] rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_20px_rgba(255,20,147,0.5)]"
          >
            {sendMutation?.isPending ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Send className="w-5 h-5 text-white" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
