/**
 * L2ChatSheet — Messages as a sheet overlay
 * 
 * Replaces: /social/inbox page navigation
 * Extracted from Messages.jsx + ChatThread.jsx
 */

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { 
  MessageCircle, Send, ArrowLeft, User, 
  Loader2, Plus, Search, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SheetSection, SheetDivider } from './L2SheetContainer';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function L2ChatSheet({ thread: initialThreadId, to: initialTo, title }) {
  const queryClient = useQueryClient();
  const { openSheet, updateSheetProps } = useSheet();
  const [selectedThread, setSelectedThread] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

  // Current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  // All users for lookups
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Chat threads
  const { data: threads = [], isLoading: threadsLoading } = useQuery({
    queryKey: ['chat-threads', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const allThreads = await base44.entities.ChatThread.filter({ active: true }, '-last_message_at');
      return allThreads.filter(t => t.participant_emails?.includes(currentUser.email));
    },
    enabled: !!currentUser?.email,
    refetchInterval: 5000,
  });

  // Messages for selected thread
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['chat-messages', selectedThread?.id],
    queryFn: async () => {
      if (!selectedThread?.id) return [];
      return await base44.entities.ChatMessage.filter({ thread_id: selectedThread.id }, 'created_date');
    },
    enabled: !!selectedThread?.id,
    refetchInterval: 3000,
  });

  // Auto-select thread from props
  useEffect(() => {
    if (initialThreadId && threads.length > 0) {
      const thread = threads.find(t => t.id === initialThreadId);
      if (thread) setSelectedThread(thread);
    }
  }, [initialThreadId, threads]);

  // Create new thread if "to" email provided
  useEffect(() => {
    if (initialTo && currentUser?.email && !selectedThread) {
      // Check if thread already exists
      const existing = threads.find(t => 
        t.participant_emails?.includes(initialTo) && 
        t.participant_emails?.includes(currentUser.email)
      );
      
      if (existing) {
        setSelectedThread(existing);
      }
      // If not, we'll create one on first message
    }
  }, [initialTo, currentUser, threads, selectedThread]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (text) => {
      if (!currentUser?.email) throw new Error('Please log in');
      if (!text.trim()) throw new Error('Message cannot be empty');

      let threadId = selectedThread?.id;

      // Create thread if needed
      if (!threadId && initialTo) {
        const newThread = await base44.entities.ChatThread.create({
          participant_emails: [currentUser.email, initialTo],
          active: true,
          created_date: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
        });
        threadId = newThread.id;
        setSelectedThread(newThread);
      }

      if (!threadId) throw new Error('No thread selected');

      // Create message
      await base44.entities.ChatMessage.create({
        thread_id: threadId,
        sender_email: currentUser.email,
        content: text.trim(),
        created_date: new Date().toISOString(),
      });

      // Update thread last_message_at
      await base44.entities.ChatThread.update(threadId, {
        last_message_at: new Date().toISOString(),
      });

      return { threadId };
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries(['chat-messages']);
      queryClient.invalidateQueries(['chat-threads']);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send message');
    },
  });

  // Get other participant
  const getOtherParticipant = (thread) => {
    const otherEmail = thread.participant_emails?.find(e => e !== currentUser?.email);
    return allUsers.find(u => u.email === otherEmail);
  };

  // Handle send
  const handleSend = () => {
    if (newMessage.trim()) {
      sendMutation.mutate(newMessage);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // View profile
  const handleViewProfile = (email) => {
    openSheet(SHEET_TYPES.PROFILE, { email });
  };

  // Back to thread list
  const handleBack = () => {
    setSelectedThread(null);
    updateSheetProps({ thread: null, to: null, title: 'Messages' });
  };

  // Filter threads by search
  const filteredThreads = threads.filter(thread => {
    if (!searchQuery) return true;
    const other = getOtherParticipant(thread);
    return (other?.full_name || other?.username || '')
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  });

  // Thread List View
  if (!selectedThread && !initialTo) {
    return (
      <div className="h-full flex flex-col">
        {/* Search */}
        <SheetSection>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="pl-10 bg-white/5 border-white/10"
            />
          </div>
        </SheetSection>

        <SheetDivider />

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {threadsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-[#FF1493] animate-spin" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 font-bold">No conversations yet</p>
              <p className="text-white/20 text-sm mt-1">
                Start chatting by tapping someone's profile
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredThreads.map((thread) => {
                const other = getOtherParticipant(thread);
                if (!other) return null;

                return (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThread(thread)}
                    className="w-full p-4 hover:bg-white/5 transition-colors text-left flex items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {other.avatar_url ? (
                        <img src={other.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-black text-white">
                          {other.full_name?.[0] || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold truncate">
                        {other.full_name || other.username || 'Anonymous'}
                      </p>
                      <p className="text-white/40 text-xs truncate">
                        {thread.last_message_preview || 'Start chatting...'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white/30 text-xs">
                        {thread.last_message_at && formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })}
                      </p>
                      <ChevronRight className="w-4 h-4 text-white/20 ml-auto mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Chat View
  const otherUser = selectedThread 
    ? getOtherParticipant(selectedThread)
    : allUsers.find(u => u.email === initialTo);

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="text-white/60"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <button
          onClick={() => otherUser && handleViewProfile(otherUser.email)}
          className="flex items-center gap-3 flex-1 min-w-0"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center overflow-hidden flex-shrink-0">
            {otherUser?.avatar_url ? (
              <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-black text-white">
                {otherUser?.full_name?.[0] || '?'}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold truncate">
              {otherUser?.full_name || otherUser?.username || title || 'Chat'}
            </p>
            <p className="text-white/40 text-xs">Tap to view profile</p>
          </div>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messagesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-[#FF1493] animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/40 text-sm">
              No messages yet. Say hi! 👋
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender_email === currentUser?.email;
            return (
              <motion.div
                key={msg.id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex', isMe ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[80%] px-4 py-2 rounded-2xl',
                    isMe
                      ? 'bg-[#FF1493] text-white rounded-br-sm'
                      : 'bg-white/10 text-white rounded-bl-sm'
                  )}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className={cn(
                    'text-[10px] mt-1',
                    isMe ? 'text-white/60' : 'text-white/40'
                  )}>
                    {msg.created_date && formatDistanceToNow(new Date(msg.created_date), { addSuffix: true })}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-black/50 backdrop-blur-sm">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-white/5 border-white/10"
            disabled={sendMutation.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sendMutation.isPending}
            className="bg-[#FF1493] hover:bg-[#FF1493]/90"
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
