import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, Image, Video, ArrowLeft, MoreVertical, Loader2, Lock, Users as UsersIcon, Check, CheckCheck, Smile, ZoomIn, Search, X, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAllUsers } from '../utils/queryConfig';
import MediaViewer from './MediaViewer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

export default function ChatThread({ thread, currentUser, onBack, readOnly = false, hideHeader = false }) {
  const [messageText, setMessageText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isTyping, setIsTyping] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isMuted, setIsMuted] = useState(thread.muted_by?.includes(currentUser.email) || false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef({});
  const lastTypingEmitRef = useRef(0);
  const queryClient = useQueryClient();
  const isTelegramEncrypted = thread.telegram_chat_id || thread.thread_type === 'dm';

  const [messagesPage, setMessagesPage] = useState(1);
  const MESSAGES_PER_PAGE = 50;
  const [showReactions, setShowReactions] = useState(null);
  const [viewingMedia, setViewingMedia] = useState(null);
  const [mediaGallery, setMediaGallery] = useState([]);
  const [mediaIndex, setMediaIndex] = useState(0);

  const REACTIONS = ['❤️', '😂', '😮', '😢', '👍', '🔥', '💯', '🎉'];

  const { data: messages = [], hasNextPage } = useQuery({
    queryKey: ['messages', thread.id, messagesPage],
    queryFn: async () => {
      const allMessages = await base44.entities.Message.filter(
        { thread_id: thread.id }, 
        'created_date', 
        MESSAGES_PER_PAGE * messagesPage
      );
      return allMessages;
    },
    refetchInterval: 3000, // Poll every 3s (optimized)
    keepPreviousData: true,
  });

  const loadMoreMessages = () => {
    if (messages.length >= MESSAGES_PER_PAGE * messagesPage) {
      setMessagesPage(p => p + 1);
    }
  };

  const { data: typingIndicators = [] } = useQuery({
    queryKey: ['typing', thread.id],
    queryFn: async () => {
      const activities = await base44.entities.UserActivity.filter(
        { activity_type: 'typing' },
        '-created_date',
        50
      );
      return activities.filter(a => 
        a.metadata?.thread_id === thread.id &&
        new Date(a.created_date).getTime() > Date.now() - 5000 // Last 5 seconds
      );
    },
    refetchInterval: 2000, // Poll every 2s (optimized)
  });

  const { data: allUsers = [] } = useAllUsers();

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      const ok = await base44.auth.requireProfile(window.location.href);
      if (!ok) return null;

      const message = await base44.entities.Message.create({
        thread_id: thread.id,
        sender_email: currentUser.email,
        content: data.content,
        message_type: data.message_type || 'text',
        metadata: data.metadata || {},
        read_by: [currentUser.email],
      });

      // Update thread's last message and increment unread count
      const newUnreadCount = { ...thread.unread_count };
      thread.participant_emails.forEach(email => {
        if (email !== currentUser.email) {
          newUnreadCount[email] = (newUnreadCount[email] || 0) + 1;
        }
      });

      await base44.entities.ChatThread.update(thread.id, {
        last_message: data.content,
        last_message_at: new Date().toISOString(),
        unread_count: newUnreadCount,
      });

      // Send push notification to other participants only (skip if muted)
      const mutedBy = thread.muted_by || [];
      thread.participant_emails.forEach(async (email) => {
        if (email !== currentUser.email && !mutedBy.includes(email)) {
          try {
            await base44.entities.Notification.create({
              user_email: email,
              type: 'message',
              title: `New message from ${currentUser.full_name}`,
              message: data.content.substring(0, 100),
              link: `/social/t/${encodeURIComponent(String(thread.id))}`,
              metadata: { thread_id: thread.id, sender: currentUser.email }
            });
          } catch (err) {
            console.error('Failed to send notification:', err);
          }
        }
      });

      return message;
    },
    onSuccess: (message) => {
      if (!message) return;
      queryClient.invalidateQueries(['messages', thread.id]);
      queryClient.invalidateQueries(['chat-threads']);
      setMessageText('');
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (readOnly) {
      base44.auth.redirectToProfile(window.location.href);
      return;
    }
    if (!messageText.trim()) return;

    sendMutation.mutate({
      content: messageText,
      message_type: 'text',
    });
  };

  const handleImageUpload = async (e) => {
    if (readOnly) {
      base44.auth.redirectToProfile(window.location.href);
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    if (file.size > maxSize) {
      toast.error('Image too large (max 10MB)');
      return;
    }
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Use JPEG, PNG, WebP, or GIF.');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      sendMutation.mutate({
        content: 'Image',
        message_type: 'image',
        metadata: { image_url: file_url },
      });
      
      toast.success('Image sent');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (e) => {
    if (readOnly) {
      base44.auth.redirectToProfile(window.location.href);
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    
    if (file.size > maxSize) {
      toast.error('Video too large (max 50MB)');
      return;
    }
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Use MP4, MOV, or WebM.');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      sendMutation.mutate({
        content: 'Video',
        message_type: 'video',
        metadata: { video_url: file_url },
      });
      
      toast.success('Video sent');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleTyping = () => {
    // Throttle typing indicator to every 2 seconds
    const now = Date.now();
    if (now - lastTypingEmitRef.current < 2000) return;
    lastTypingEmitRef.current = now;

    // Broadcast typing indicator
    base44.entities.UserActivity.create({
      user_email: currentUser.email,
      activity_type: 'typing',
      metadata: { thread_id: thread.id }
    }).catch(() => {});
  };

  const toggleMute = async () => {
    const mutedBy = thread.muted_by || [];
    const newMutedBy = isMuted 
      ? mutedBy.filter(email => email !== currentUser.email)
      : [...mutedBy, currentUser.email];

    await base44.entities.ChatThread.update(thread.id, {
      muted_by: newMutedBy
    });

    setIsMuted(!isMuted);
    queryClient.invalidateQueries(['chat-threads']);
    toast.success(isMuted ? 'Conversation unmuted' : 'Conversation muted');
  };

  const handleReaction = async (messageId, emoji) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const reactions = message.metadata?.reactions || {};
    const userReactions = reactions[currentUser.email] || [];
    
    let newUserReactions;
    if (userReactions.includes(emoji)) {
      newUserReactions = userReactions.filter(r => r !== emoji);
    } else {
      newUserReactions = [...userReactions, emoji];
    }

    const newReactions = {
      ...reactions,
      [currentUser.email]: newUserReactions
    };

    await base44.entities.Message.update(messageId, {
      metadata: { ...message.metadata, reactions: newReactions }
    });

    queryClient.invalidateQueries(['messages', thread.id]);
    setShowReactions(null);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Process typing indicators
  useEffect(() => {
    const typingUsers = {};
    typingIndicators.forEach((indicator) => {
      if (indicator.user_email !== currentUser.email) {
        typingUsers[indicator.user_email] = true;
      }
    });
    setIsTyping(typingUsers);
  }, [typingIndicators, currentUser.email]);

  // Mark messages as read
  useEffect(() => {
    const unreadMessages = messages.filter(
      m => m.sender_email !== currentUser.email && !m.read_by.includes(currentUser.email)
    );

    if (unreadMessages.length > 0) {
      unreadMessages.forEach(msg => {
        base44.entities.Message.update(msg.id, {
          read_by: [...msg.read_by, currentUser.email],
        });
      });

      base44.entities.ChatThread.update(thread.id, {
        unread_count: {
          ...thread.unread_count,
          [currentUser.email]: 0,
        },
      });
      queryClient.invalidateQueries(['chat-threads']);
    }
  }, [messages, currentUser.email, thread.id]);

  const otherParticipants = thread.participant_emails.filter(email => email !== currentUser.email);
  const otherUsers = allUsers.filter(u => otherParticipants.includes(u.email));
  const isGroupChat = otherUsers.length > 1;

  // Filter messages based on search
  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => 
        m.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.sender_email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      {/* Header - only show if not hidden by parent */}
      {!hideHeader && (
        <div className="bg-black border-b-2 border-white/20 p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden text-white hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-3 flex-1">
            {!isGroupChat ? (
              <>
                <div className="w-10 h-10 bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center border-2 border-white">
                  {otherUsers[0]?.avatar_url ? (
                    <img src={otherUsers[0].avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-sm">{getDisplayName(otherUsers[0])[0].toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <p className="font-black uppercase tracking-tight">{getDisplayName(otherUsers[0])}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider font-mono flex items-center gap-1">
                    {getUsername(otherUsers[0]) || thread.thread_type}
                    {isTelegramEncrypted && (
                      <>
                        <span>•</span>
                        <Lock className="w-3 h-3 text-[#00D9FF]" />
                        <span className="text-[#00D9FF]">E2E</span>
                      </>
                    )}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 bg-white/10 border-2 border-white flex items-center justify-center">
                  <UsersIcon className="w-5 h-5 text-white/60" />
                </div>
                <div>
                  <p className="font-black uppercase tracking-tight">{otherUsers.slice(0, 2).map(u => getDisplayName(u)).join(', ')}</p>
                  {otherUsers.length > 2 && (
                    <p className="text-[10px] text-white/60">+{otherUsers.length - 2} more</p>
                  )}
                  <p className="text-[10px] text-white/40 uppercase tracking-wider font-mono flex items-center gap-1">
                    GROUP • {thread.thread_type}
                    {isTelegramEncrypted && (
                      <>
                        <span>•</span>
                        <Lock className="w-3 h-3 text-[#00D9FF]" />
                        <span className="text-[#00D9FF]">E2E</span>
                      </>
                    )}
                  </p>
                </div>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch(!showSearch)}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <Search className="w-5 h-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-black border-2 border-white text-white">
              <DropdownMenuItem onClick={toggleMute} className="hover:bg-white/10 cursor-pointer">
                {isMuted ? (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    Unmute Conversation
                  </>
                ) : (
                  <>
                    <BellOff className="w-4 h-4 mr-2" />
                    Mute Conversation
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Search Bar */}
      {showSearch && (
        <div className="bg-black border-b-2 border-white/20 p-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH IN CONVERSATION..."
              className="flex-1 bg-black border-2 border-white/20 text-white placeholder:text-white/40 placeholder:uppercase placeholder:font-mono placeholder:text-xs"
              autoFocus
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery('')}
                className="text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
              className="text-white/60 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          {searchQuery && (
            <p className="text-xs text-white/40 mt-2 font-mono">
              {filteredMessages.length} {filteredMessages.length === 1 ? 'result' : 'results'} found
            </p>
          )}
        </div>
      )}

      {/* Messages - scrollable area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0a0a] min-h-0">
        {/* Load More Button */}
        {messages.length >= MESSAGES_PER_PAGE && (
          <div className="flex justify-center mb-4">
            <button 
              onClick={loadMoreMessages}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border-2 border-white/20 text-white/60 text-xs uppercase font-bold transition-colors"
            >
              Load Earlier Messages
            </button>
          </div>
        )}
        
        <AnimatePresence>
          {filteredMessages.map((msg, idx) => {
            const isOwn = msg.sender_email === currentUser.email;
            const sender = allUsers.find(u => u.email === msg.sender_email);

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: idx * 0.01 }}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
              >
                <div className={`flex gap-3 max-w-[75%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isOwn && (
                    <div className="w-8 h-8 bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center flex-shrink-0 border-2 border-white">
                      {sender?.avatar_url ? (
                        <img src={sender.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold">{getDisplayName(sender)[0].toUpperCase()}</span>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    {isGroupChat && !isOwn && (
                      <p className="text-[10px] text-white/40 uppercase font-bold ml-1">{getDisplayName(sender)}</p>
                    )}
                    
                    {msg.message_type === 'image' && msg.metadata?.image_url && (
                      <div className="relative border-2 border-white overflow-hidden group cursor-pointer"
                        onClick={() => {
                          const allMedia = messages
                            .filter(m => m.message_type === 'image' || m.message_type === 'video')
                            .map(m => ({ 
                              url: m.message_type === 'image' ? m.metadata?.image_url : m.metadata?.video_url,
                              type: m.message_type
                            }));
                          const index = allMedia.findIndex(m => m.url === msg.metadata.image_url);
                          setMediaGallery(allMedia);
                          setMediaIndex(index);
                          setViewingMedia(allMedia[index]);
                        }}>
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

                    {msg.message_type === 'video' && msg.metadata?.video_url && (
                      <div className="relative border-2 border-white overflow-hidden group cursor-pointer"
                        onClick={() => {
                          const allMedia = messages
                            .filter(m => m.message_type === 'image' || m.message_type === 'video')
                            .map(m => ({ 
                              url: m.message_type === 'image' ? m.metadata?.image_url : m.metadata?.video_url,
                              type: m.message_type
                            }));
                          const index = allMedia.findIndex(m => m.url === msg.metadata.video_url);
                          setMediaGallery(allMedia);
                          setMediaIndex(index);
                          setViewingMedia(allMedia[index]);
                        }}>
                        <video 
                          src={msg.metadata.video_url} 
                          controls
                          className="max-w-full max-h-96 grayscale hover:grayscale-0 transition-all"
                        />
                      </div>
                    )}
                    
                    {msg.message_type === 'text' && (
                      <div
                        className={`px-4 py-2.5 border-2 ${
                          isOwn
                            ? 'bg-[#FF1493] border-[#FF1493] text-black'
                            : 'bg-black border-white text-white'
                        }`}
                      >
                        <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                      </div>
                    )}
                    
                    {msg.message_type === 'system' && (
                      <div className="text-center text-xs text-white/40 italic uppercase font-mono">
                        {msg.content}
                      </div>
                    )}
                    
                    <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <p className="text-[10px] text-white/40 font-mono">
                        {format(new Date(msg.created_date), 'HH:mm')}
                      </p>
                      {isOwn && (
                        <>
                          {msg.read_by.length === 1 ? (
                            <Check className="w-3 h-3 text-white/40" title="Sent" />
                          ) : msg.read_by.length === thread.participant_emails.length ? (
                            <CheckCheck className="w-3 h-3 text-[#00D9FF]" title="Read by all" />
                          ) : (
                            <CheckCheck className="w-3 h-3 text-[#FFEB3B]" title={`Read by ${msg.read_by.length - 1}/${thread.participant_emails.length - 1}`} />
                          )}
                        </>
                      )}
                      
                      {/* Reaction Button */}
                      <button
                        onClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)}
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
                            onClick={() => handleReaction(msg.id, emoji)}
                            className="px-2 py-1 bg-white/10 border-2 border-white/20 hover:border-white/40 text-sm flex items-center gap-1 transition-colors hover:bg-white/20"
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
                      <div className="absolute z-10 mt-1 p-2 bg-black border-2 border-white flex gap-2">
                        {REACTIONS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            className="text-xl hover:scale-125 transition-transform"
                          >
                            {emoji}
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

        {/* Typing Indicator */}
        {Object.keys(isTyping).length > 0 && !searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex justify-start"
          >
            <div className="flex gap-3 items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center flex-shrink-0 border-2 border-white">
                <span className="text-xs font-bold">...</span>
              </div>
              <div className="bg-black border-2 border-white px-4 py-2.5">
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="ml-2 text-xs text-white/60 font-mono uppercase">
                    {Object.keys(isTyping).length === 1 
                      ? getDisplayName(allUsers.find(u => u.email === Object.keys(isTyping)[0]))
                      : `${Object.keys(isTyping).length} people`
                    } typing
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed at bottom on mobile, sticky on desktop */}
      <form 
        onSubmit={handleSend} 
        className="bg-black border-t-2 border-white/20 p-4 pb-safe md:pb-4 sticky bottom-0 z-30"
      >
        <div className="flex items-center gap-2">
          {/* Media buttons */}
          <div className="flex gap-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id={`image-upload-${thread?.id}`}
              disabled={uploading || readOnly}
            />
            <label htmlFor={`image-upload-${thread?.id}`}>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                disabled={uploading || readOnly} 
                asChild
                className="text-white/60 hover:text-white hover:bg-white/10 border-2 border-white/20 hover:border-white h-10 w-10"
              >
                <span>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                </span>
              </Button>
            </label>

            <input
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
              id={`video-upload-${thread?.id}`}
              disabled={uploading || readOnly}
            />
            <label htmlFor={`video-upload-${thread?.id}`} className="hidden md:block">
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                disabled={uploading || readOnly} 
                asChild
                className="text-white/60 hover:text-white hover:bg-white/10 border-2 border-white/20 hover:border-white h-10 w-10"
              >
                <span>
                  <Video className="w-4 h-4" />
                </span>
              </Button>
            </label>
          </div>

          <Input
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              if (!readOnly) handleTyping();
            }}
            placeholder="TYPE A MESSAGE..."
            disabled={readOnly}
            className="flex-1 bg-black border-2 border-white/20 text-white placeholder:text-white/40 placeholder:uppercase placeholder:text-xs focus:border-[#FF1493] h-10"
          />

          <Button 
            type="submit" 
            size="icon"
            disabled={readOnly || !messageText.trim() || sendMutation.isPending}
            className="bg-[#FF1493] hover:bg-white hover:text-black text-black border-2 border-white h-10 w-10 flex-shrink-0"
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>

      {/* Media Viewer Modal */}
      {viewingMedia && (
        <MediaViewer
          mediaUrl={viewingMedia.url}
          mediaType={viewingMedia.type}
          allMedia={mediaGallery}
          currentIndex={mediaIndex}
          onNavigate={(newIndex) => {
            setMediaIndex(newIndex);
            setViewingMedia(mediaGallery[newIndex]);
          }}
          onClose={() => {
            setViewingMedia(null);
            setMediaGallery([]);
            setMediaIndex(0);
          }}
        />
      )}
    </div>
  );
}