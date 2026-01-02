import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, Image, Video, ArrowLeft, MoreVertical, Loader2, Lock, Users as UsersIcon, Check, CheckCheck, Smile, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAllUsers } from '../utils/queryConfig';
import MediaViewer from './MediaViewer';

export default function ChatThread({ thread, currentUser, onBack }) {
  const [messageText, setMessageText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isTyping, setIsTyping] = useState({});
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef({});
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

      // Send push notification to other participants only
      thread.participant_emails.forEach(async (email) => {
        if (email !== currentUser.email) {
          try {
            await base44.entities.Notification.create({
              user_email: email,
              type: 'message',
              title: `New message from ${currentUser.full_name}`,
              message: data.content.substring(0, 100),
              link: `/Messages?thread=${thread.id}`,
              metadata: { thread_id: thread.id, sender: currentUser.email }
            });
          } catch (err) {
            console.error('Failed to send notification:', err);
          }
        }
      });

      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['messages', thread.id]);
      queryClient.invalidateQueries(['chat-threads']);
      setMessageText('');
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    sendMutation.mutate({
      content: messageText,
      message_type: 'text',
    });
  };

  const handleImageUpload = async (e) => {
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
    // Broadcast typing indicator
    base44.entities.UserActivity.create({
      user_email: currentUser.email,
      activity_type: 'typing',
      metadata: { thread_id: thread.id }
    }).catch(() => {});
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

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
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
                  <span className="font-bold text-sm">{otherUsers[0]?.full_name?.[0] || 'U'}</span>
                )}
              </div>
              <div>
                <p className="font-black uppercase tracking-tight">{otherUsers[0]?.full_name || 'Unknown'}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-mono flex items-center gap-1">
                  {thread.thread_type}
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
                <p className="font-black uppercase tracking-tight">{otherUsers.slice(0, 2).map(u => u.full_name).join(', ')}</p>
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

        <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#0a0a0a]">
        {/* Load More Button */}
        {messages.length >= MESSAGES_PER_PAGE && (
          <div className="flex justify-center mb-4">
            <button 
              onClick={loadMoreMessages}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 text-white/60 text-xs uppercase font-bold transition-colors"
            >
              Load Earlier Messages
            </button>
          </div>
        )}
        
        <AnimatePresence>
          {messages.map((msg, idx) => {
            const isOwn = msg.sender_email === currentUser.email;
            const sender = allUsers.find(u => u.email === msg.sender_email);

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: idx * 0.01 }}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isOwn && (
                    <div className="w-8 h-8 bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center flex-shrink-0 border-2 border-white">
                      {sender?.avatar_url ? (
                        <img src={sender.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold">{sender?.full_name?.[0] || 'U'}</span>
                      )}
                    </div>
                  )}
                  
                  <div>
                    {isGroupChat && !isOwn && (
                      <p className="text-[10px] text-white/40 uppercase font-bold mb-1 ml-1">{sender?.full_name}</p>
                    )}
                    
                    {msg.message_type === 'image' && msg.metadata?.image_url && (
                      <div className="relative border-2 border-white overflow-hidden mb-2 group cursor-pointer"
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
                      <div className="relative border-2 border-white overflow-hidden mb-2 group cursor-pointer"
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
                            <Check className="w-3 h-3 text-white/40" />
                          ) : (
                            <CheckCheck className="w-3 h-3 text-[#00D9FF]" />
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
                      <div className="absolute z-10 mt-1 p-2 bg-black border-2 border-white rounded-lg flex gap-2">
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
        {Object.keys(isTyping).length > 0 && (
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
              <div className="bg-black border-2 border-white px-4 py-2.5 rounded-lg">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="bg-black border-t-2 border-white/20 p-4">
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
            disabled={uploading}
          />
          <label htmlFor="image-upload">
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              disabled={uploading} 
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
            onChange={handleVideoUpload}
            className="hidden"
            id="video-upload"
            disabled={uploading}
          />
          <label htmlFor="video-upload">
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              disabled={uploading} 
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
              handleTyping();
            }}
            placeholder="TYPE MESSAGE..."
            className="flex-1 bg-black border-2 border-white/20 text-white placeholder:text-white/40 placeholder:uppercase placeholder:font-mono placeholder:text-xs focus:border-white"
          />

          <Button 
            type="submit" 
            size="icon"
            disabled={!messageText.trim() || sendMutation.isPending}
            className="bg-[#FF1493] hover:bg-white text-black border-2 border-white"
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
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