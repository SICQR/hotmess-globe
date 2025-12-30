import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageCircle } from 'lucide-react';
import ChatThread from '../components/messaging/ChatThread';
import ThreadList from '../components/messaging/ThreadList';
import GroupChatManager from '../components/messaging/GroupChatManager';

export default function Messages() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['chat-threads', currentUser?.email],
    queryFn: async () => {
      const allThreads = await base44.entities.ChatThread.filter({ active: true }, '-last_message_at');
      return allThreads.filter(t => t.participant_emails.includes(currentUser.email));
    },
    enabled: !!currentUser,
    refetchInterval: 3000, // Real-time polling for new threads
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  if (!currentUser || isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-white/40 mx-auto mb-4 animate-pulse" />
          <p className="text-white/60">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto h-screen flex flex-col md:flex-row">
        {/* Thread List - Left Sidebar */}
        <div className={`${selectedThread ? 'hidden md:block' : 'block'} md:w-96 border-r border-white/10 flex flex-col`}>
          <div className="p-6 border-b border-white/10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Messages</h1>
              <p className="text-sm text-white/60">Encrypted via Telegram</p>
            </motion.div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-4">
              <GroupChatManager
                currentUser={currentUser}
                allUsers={allUsers}
              />
            </div>
            
            <ThreadList
              threads={threads}
              currentUser={currentUser}
              allUsers={allUsers}
              onSelectThread={setSelectedThread}
            />
          </div>
        </div>

        {/* Chat Thread - Main Area */}
        <div className={`${selectedThread ? 'block' : 'hidden md:block'} flex-1`}>
          {selectedThread ? (
            <ChatThread
              thread={selectedThread}
              currentUser={currentUser}
              onBack={() => setSelectedThread(null)}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/40 text-lg">Select a conversation</p>
                <p className="text-white/20 text-sm mt-2">All messages are end-to-end encrypted</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}