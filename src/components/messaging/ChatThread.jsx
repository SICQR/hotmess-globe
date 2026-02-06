import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44, supabase } from '@/api/base44Client';
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

// Theme imports
import { NeonMinimal, BrutalistRedux, GhostMode } from './themes';

const THEMES = {
  ghost: GhostMode,
  neon: NeonMinimal,
  brutalist: BrutalistRedux,
};

export default function ChatThread({ thread, currentUser, onBack, readOnly = false, theme = 'ghost', allUsers: propAllUsers, hideHeader = false }) {
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

  // Demo messages for fallback when viewing demo threads
  const DEMO_MESSAGES = thread?._isDemo ? [
    {
      id: 'demo_msg_1',
      thread_id: thread.id,
      sender_email: thread.participant_emails[1],
      content: 'Hey! Great vibes at the club last night 🔥',
      message_type: 'text',
      created_date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      read_by: [currentUser?.email],
    },
    {
      id: 'demo_msg_2',
      thread_id: thread.id,
      sender_email: currentUser?.email,
      content: 'Totally! That DJ set was incredible',
      message_type: 'text',
      created_date: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString(),
      read_by: [currentUser?.email, thread.participant_emails[1]],
    },
    {
      id: 'demo_msg_3',
      thread_id: thread.id,
      sender_email: thread.participant_emails[1],
      content: 'We should def link up again this weekend 👀',
      message_type: 'text',
      created_date: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      read_by: [currentUser?.email],
    },
    {
      id: 'demo_msg_4',
      thread_id: thread.id,
      sender_email: thread.participant_emails[1],
      content: thread.last_message,
      message_type: 'text',
      created_date: new Date(thread.last_message_at).toISOString(),
      read_by: [],
    },
  ] : [];

  const { data: fetchedMessages = [], hasNextPage } = useQuery({
    queryKey: ['messages', thread.id, messagesPage],
    queryFn: async () => {
      // Skip API call for demo threads
      if (thread?._isDemo) return [];
      
      const allMessages = await base44.entities.Message.filter(
        { thread_id: thread.id }, 
        'created_date', 
        MESSAGES_PER_PAGE * messagesPage
      );
      return allMessages;
    },
    refetchInterval: thread?._isDemo ? false : 15000, // Fallback polling (real-time handles most updates)
    keepPreviousData: true,
    enabled: !thread?._isDemo,
  });

  // Use fetched messages or demo messages
  const messages = thread?._isDemo ? DEMO_MESSAGES : fetchedMessages;

  // Real-time subscription for new messages
  useEffect(() => {
    if (thread?._isDemo || !thread?.id || !supabase) return;

    const channel = supabase
      .channel(`messages-${thread.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'Message',
          filter: `thread_id=eq.${thread.id}`
        },
        (payload) => {
          // Add new message to cache if not from current user (already optimistically added)
          if (payload.new?.sender_email !== currentUser?.email) {
            queryClient.setQueryData(['messages', thread.id], (old = []) => {
              const exists = old.some(m => m.id === payload.new.id);
              if (exists) return old;
              return [...old, payload.new];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [thread?.id, thread?._isDemo, currentUser?.email, queryClient]);

  const loadMoreMessages = () => {
    if (messages.length >= MESSAGES_PER_PAGE * messagesPage) {
      setMessagesPage(p => p + 1);
    }
  };

  const { data: typingIndicators = [] } = useQuery({
    queryKey: ['typing', thread.id],
    queryFn: async () => {
      if (thread?._isDemo) return [];
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
    refetchInterval: thread?._isDemo ? false : 2000,
    enabled: !thread?._isDemo,
  });

  // Use passed users or fetch them
  const { data: fetchedUsers = [] } = useAllUsers();
  const allUsers = propAllUsers || fetchedUsers;

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      // For demo threads, show a toast and return fake message
      if (thread?._isDemo) {
        toast.info('Demo Mode', {
          description: 'Sign up to start real conversations! 🚀',
        });
        return {
          id: `demo_sent_${Date.now()}`,
          thread_id: thread.id,
          sender_email: currentUser.email,
          content: data.content,
          message_type: data.message_type || 'text',
          created_date: new Date().toISOString(),
          read_by: [currentUser.email],
          _isDemo: true,
        };
      }

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
      if (!thread?._isDemo) {
        queryClient.invalidateQueries(['messages', thread.id]);
        queryClient.invalidateQueries(['chat-threads']);
      }
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

  // Get the themed component
  const ThemeComponent = THEMES[theme] || THEMES.ghost;

  // Common props for all themes
  const themeProps = {
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
  };

  return (
    <>
      <ThemeComponent {...themeProps} />
      
      {/* Media Viewer Modal - shared across all themes */}
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
    </>
  );
}