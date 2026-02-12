/**
 * Brutalist Redux Theme - Sharp, bold, ALL CAPS HOTMESS aesthetic
 * Style: 90° corners, thick borders, monospace, high contrast
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Image, ArrowLeft, Loader2, Check, CheckCheck, X, Bell, BellOff, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function BrutalistRedux({
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
    if (!user) return 'UNKNOWN';
    return (user.full_name || user.display_name || user.username || 'UNKNOWN').toUpperCase();
  };

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="bg-black border-b-2 border-white px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 border-2 border-white hover:bg-white hover:text-black transition-colors md:hidden"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-3 flex-1">
          {!isGroupChat && otherUsers[0] ? (
            <>
              <div className="w-12 h-12 bg-[#FF1493] border-2 border-white flex items-center justify-center">
                {otherUsers[0]?.avatar_url ? (
                  <img src={otherUsers[0].avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-black text-lg">{getDisplayName(otherUsers[0])[0]}</span>
                )}
              </div>
              <div>
                <p className="font-black text-white uppercase tracking-tight">{getDisplayName(otherUsers[0])}</p>
                <p className="text-[10px] text-[#39FF14] uppercase tracking-widest font-mono">■ ONLINE</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-white/10 border-2 border-white flex items-center justify-center">
                <span className="font-black text-white">GRP</span>
              </div>
              <div>
                <p className="font-black text-white uppercase tracking-tight">
                  {otherUsers.slice(0, 2).map(u => getDisplayName(u)).join(' + ')}
                </p>
                <p className="text-[10px] text-white/60 uppercase tracking-widest font-mono">{otherUsers.length} MEMBERS</p>
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => setShowSearch(!showSearch)}
          className="p-2 border-2 border-white/40 hover:border-white hover:bg-white hover:text-black transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>
        
        <button
          onClick={toggleMute}
          className="p-2 border-2 border-white/40 hover:border-white hover:bg-white hover:text-black transition-colors"
        >
          {isMuted ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
        </button>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="bg-black p-3 border-b-2 border-white">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-white/40" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH..."
              className="flex-1 bg-transparent text-white text-sm font-mono uppercase placeholder:text-white/40 outline-none border-b-2 border-white/20 focus:border-white py-1"
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a0a0a]">
        <AnimatePresence>
          {filteredMessages.map((msg, idx) => {
            const isOwn = msg.sender_email === currentUser.email;
            const sender = allUsers.find(u => u.email === msg.sender_email);

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: isOwn ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  {/* Sender name for group chats */}
                  {isGroupChat && !isOwn && (
                    <p className="text-[10px] text-white/50 uppercase tracking-widest font-mono mb-1">{getDisplayName(sender)}</p>
                  )}
                  
                  {/* Message box */}
                  {msg.message_type === 'text' && (
                    <div
                      className={`px-4 py-3 border-2 ${
                        isOwn
                          ? 'bg-[#FF1493] border-[#FF1493] text-black'
                          : 'bg-black border-white text-white'
                      }`}
                    >
                      <p className="text-sm font-bold uppercase tracking-tight leading-relaxed">{msg.content}</p>
                    </div>
                  )}

                  {/* Image */}
                  {msg.message_type === 'image' && msg.metadata?.image_url && (
                    <div className="border-2 border-white">
                      <img 
                        src={msg.metadata.image_url} 
                        alt="" 
                        className="max-w-full max-h-64 object-cover grayscale hover:grayscale-0 transition-all"
                      />
                    </div>
                  )}

                  {/* Video */}
                  {msg.message_type === 'video' && msg.metadata?.video_url && (
                    <div className="border-2 border-white">
                      <video 
                        src={msg.metadata.video_url} 
                        controls
                        className="max-w-full max-h-64 grayscale hover:grayscale-0 transition-all"
                      />
                    </div>
                  )}
                  
                  {/* Timestamp & read status */}
                  <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] text-white/40 font-mono">
                      {format(new Date(msg.created_date), 'HH:mm')}
                    </span>
                    {isOwn && (
                      msg.read_by?.length > 1 
                        ? <CheckCheck className="w-3 h-3 text-[#00D9FF]" />
                        : <Check className="w-3 h-3 text-white/40" />
                    )}
                  </div>

                  {/* Reactions */}
                  {msg.metadata?.reactions && Object.keys(msg.metadata.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(
                        Object.values(msg.metadata.reactions).flat().reduce((acc, emoji) => {
                          acc[emoji] = (acc[emoji] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(msg.id, emoji)}
                          className="px-2 py-1 bg-white/10 border border-white/40 hover:border-white text-sm flex items-center gap-1 transition-colors"
                        >
                          <span>{emoji}</span>
                          {count > 1 && <span className="text-xs text-white/60 font-mono">{count}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator */}
        {Object.keys(isTyping).length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex justify-start"
          >
            <div className="px-4 py-3 border-2 border-white bg-black">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 bg-white animate-pulse" />
                <div className="w-2 h-2 bg-white animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-white animate-pulse" style={{ animationDelay: '300ms' }} />
                <span className="ml-2 text-[10px] text-white/60 uppercase tracking-widest font-mono">TYPING</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-black border-t-2 border-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:pb-3">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="brutal-image-upload"
            disabled={uploading || readOnly}
          />
          <label htmlFor="brutal-image-upload">
            <div className="p-2.5 border-2 border-white/40 hover:border-white hover:bg-white hover:text-black transition-colors cursor-pointer">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Image className="w-5 h-5" />}
            </div>
          </label>

          <input
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              if (!readOnly) handleTyping();
            }}
            placeholder="TYPE HERE..."
            disabled={readOnly}
            className="flex-1 bg-black text-white text-sm font-bold uppercase tracking-tight placeholder:text-white/40 outline-none border-2 border-white/40 focus:border-white px-4 py-2.5 transition-colors"
          />

          <button
            type="submit"
            disabled={readOnly || !messageText.trim() || sendMutation?.isPending}
            className="p-2.5 bg-[#FF1493] border-2 border-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:text-black transition-colors"
          >
            {sendMutation?.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5 text-black" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
