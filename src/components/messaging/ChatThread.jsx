import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useAllUsers } from '../utils/queryConfig';
import MediaViewer from './MediaViewer';
import { isPersonaBoundConversationsEnabled } from '@/lib/featureFlags';
import { useUserProfiles } from '@/components/personas/ProfileSwitcher';

// Extracted components
import ChatHeader from './ChatHeader';
import ChatSearchBar from './ChatSearchBar';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';

const MESSAGES_PER_PAGE = 50;

export default function ChatThread({ thread, currentUser, onBack, readOnly = false }) {
  const [messageText, setMessageText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isTyping, setIsTyping] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isMuted, setIsMuted] = useState(thread.muted_by?.includes(currentUser.email) || false);
  const messagesEndRef = useRef(null);
  const lastTypingEmitRef = useRef(0);
  const queryClient = useQueryClient();
  const isTelegramEncrypted = thread.telegram_chat_id || thread.thread_type === 'dm';
  
  // Persona support
  const { data: userProfiles = [] } = useUserProfiles();
  const personasEnabled = isPersonaBoundConversationsEnabled();
  
  // Get the bound profile for this conversation
  const { data: boundProfile } = useQuery({
    queryKey: ['conversation-participant', thread.id, currentUser?.auth_user_id],
    queryFn: async () => {
      if (!currentUser?.auth_user_id) return null;
      const participants = await base44.entities.ConversationParticipant.list(thread.id);
      const myParticipation = participants?.find(p => p.account_id === currentUser.auth_user_id);
      if (myParticipation?.profile_id) {
        return userProfiles.find(p => p.id === myParticipation.profile_id) || null;
      }
      return userProfiles.find(p => p.kind === 'MAIN') || null;
    },
    enabled: personasEnabled && !!currentUser?.auth_user_id && userProfiles.length > 0,
    staleTime: 60000,
  });
  
  // Map of profile_id to profile info for message display
  const profilesById = React.useMemo(() => {
    const map = new Map();
    userProfiles.forEach(p => map.set(p.id, p));
    return map;
  }, [userProfiles]);

  const [messagesPage, setMessagesPage] = useState(1);
  const [showReactions, setShowReactions] = useState(null);
  const [viewingMedia, setViewingMedia] = useState(null);
  const [mediaGallery, setMediaGallery] = useState([]);
  const [mediaIndex, setMediaIndex] = useState(0);

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', thread.id, messagesPage],
    queryFn: async () => {
      const allMessages = await base44.entities.Message.filter(
        { thread_id: thread.id }, 
        'created_date', 
        MESSAGES_PER_PAGE * messagesPage
      );
      return allMessages;
    },
    refetchInterval: 3000,
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
        new Date(a.created_date).getTime() > Date.now() - 5000
      );
    },
    refetchInterval: 2000,
  });

  const { data: allUsers = [] } = useAllUsers();

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      const ok = await base44.auth.requireProfile(window.location.href);
      if (!ok) return null;

      const messageData = {
        thread_id: thread.id,
        sender_email: currentUser.email,
        content: data.content,
        message_type: data.message_type || 'text',
        metadata: data.metadata || {},
        read_by: [currentUser.email],
      };

      if (personasEnabled && boundProfile?.id) {
        messageData.sender_profile_id = boundProfile.id;
      }

      const message = await base44.entities.Message.create(messageData);

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

      // Send notifications via secure RPC function (avoids RLS issues)
      const mutedBy = thread.muted_by || [];
      thread.participant_emails.forEach(async (email) => {
        if (email !== currentUser.email && !mutedBy.includes(email)) {
          try {
            // Use the send_notification RPC function which bypasses RLS safely
            const { supabase } = await import('@/components/utils/supabaseClient');
            await supabase.rpc('send_notification', {
              p_user_email: email,
              p_type: 'message',
              p_title: `New message from ${currentUser.full_name || 'Someone'}`,
              p_message: data.content.substring(0, 100),
              p_link: `/social/t/${encodeURIComponent(String(thread.id))}`,
              p_metadata: { thread_id: thread.id }
            });
          } catch {
            // Silently fail - notification is non-critical
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
    sendMutation.mutate({ content: messageText, message_type: 'text' });
  };

  const handleFileUpload = async (file, type) => {
    if (readOnly) {
      base44.auth.redirectToProfile(window.location.href);
      return;
    }

    const maxSize = type === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    const allowedTypes = type === 'image' 
      ? ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      : ['video/mp4', 'video/quicktime', 'video/webm'];
    
    if (file.size > maxSize) {
      toast.error(`${type === 'image' ? 'Image' : 'Video'} too large (max ${type === 'image' ? '10MB' : '50MB'})`);
      return;
    }
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      sendMutation.mutate({
        content: type === 'image' ? 'Image' : 'Video',
        message_type: type,
        metadata: { [`${type}_url`]: file_url },
      });
      toast.success(`${type === 'image' ? 'Image' : 'Video'} sent`);
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleTyping = () => {
    const now = Date.now();
    if (now - lastTypingEmitRef.current < 2000) return;
    lastTypingEmitRef.current = now;
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

    await base44.entities.ChatThread.update(thread.id, { muted_by: newMutedBy });
    setIsMuted(!isMuted);
    queryClient.invalidateQueries(['chat-threads']);
    toast.success(isMuted ? 'Conversation unmuted' : 'Conversation muted');
  };

  const handleReaction = async (messageId, emoji) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const reactions = message.metadata?.reactions || {};
    const userReactions = reactions[currentUser.email] || [];
    
    const newUserReactions = userReactions.includes(emoji)
      ? userReactions.filter(r => r !== emoji)
      : [...userReactions, emoji];

    const newReactions = { ...reactions, [currentUser.email]: newUserReactions };

    await base44.entities.Message.update(messageId, {
      metadata: { ...message.metadata, reactions: newReactions }
    });

    queryClient.invalidateQueries(['messages', thread.id]);
    setShowReactions(null);
  };

  const handleMediaClick = (url, type) => {
    const allMedia = messages
      .filter(m => m.message_type === 'image' || m.message_type === 'video')
      .map(m => ({ 
        url: m.message_type === 'image' ? m.metadata?.image_url : m.metadata?.video_url,
        type: m.message_type
      }));
    const index = allMedia.findIndex(m => m.url === url);
    setMediaGallery(allMedia);
    setMediaIndex(index);
    setViewingMedia(allMedia[index]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const typingUsers = {};
    typingIndicators.forEach((indicator) => {
      if (indicator.user_email !== currentUser.email) {
        typingUsers[indicator.user_email] = true;
      }
    });
    // Only update if the typing state actually changed to avoid infinite loops
    setIsTyping(prev => {
      const prevKeys = Object.keys(prev).sort().join(',');
      const newKeys = Object.keys(typingUsers).sort().join(',');
      if (prevKeys === newKeys) return prev;
      return typingUsers;
    });
  }, [typingIndicators, currentUser.email]);

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
        unread_count: { ...thread.unread_count, [currentUser.email]: 0 },
      });
      queryClient.invalidateQueries(['chat-threads']);
    }
  }, [messages, currentUser.email, thread.id]);

  const otherParticipants = thread.participant_emails.filter(email => email !== currentUser.email);
  const otherUsers = allUsers.filter(u => otherParticipants.includes(u.email));
  const isGroupChat = otherUsers.length > 1;

  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => 
        m.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.sender_email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  return (
    <div className="flex flex-col h-full bg-black">
      <ChatHeader
        thread={thread}
        otherUsers={otherUsers}
        isGroupChat={isGroupChat}
        isTelegramEncrypted={isTelegramEncrypted}
        isMuted={isMuted}
        showSearch={showSearch}
        onBack={onBack}
        onToggleSearch={() => setShowSearch(!showSearch)}
        onToggleMute={toggleMute}
      />

      {showSearch && (
        <ChatSearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          resultCount={filteredMessages.length}
          onClose={() => {
            setShowSearch(false);
            setSearchQuery('');
          }}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#0a0a0a]">
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
          {filteredMessages.map((msg) => {
            const isOwn = msg.sender_email === currentUser.email;
            const sender = allUsers.find(u => u.email === msg.sender_email);

            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={isOwn}
                sender={sender}
                isGroupChat={isGroupChat}
                participantCount={thread.participant_emails.length}
                personasEnabled={personasEnabled}
                profilesById={profilesById}
                showReactions={showReactions}
                onToggleReactions={(id) => setShowReactions(showReactions === id ? null : id)}
                onReaction={handleReaction}
                onMediaClick={handleMediaClick}
              />
            );
          })}
        </AnimatePresence>

        {!searchQuery && (
          <TypingIndicator typingUsers={isTyping} allUsers={allUsers} />
        )}

        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        messageText={messageText}
        setMessageText={setMessageText}
        onSend={handleSend}
        onImageUpload={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'image')}
        onVideoUpload={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'video')}
        onTyping={handleTyping}
        uploading={uploading}
        readOnly={readOnly}
        isSending={sendMutation.isPending}
        personasEnabled={personasEnabled}
        boundProfile={boundProfile}
      />

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
