import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageCircle, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChatThread from '../components/messaging/ChatThread';
import ThreadList from '../components/messaging/ThreadList';
import NewMessageModal from '../components/messaging/NewMessageModal';
import { useAllUsers, useCurrentUser } from '../components/utils/queryConfig';

export default function Messages() {
  const [selectedThread, setSelectedThread] = useState(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: allUsers = [] } = useAllUsers();

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['chat-threads', currentUser?.email],
    queryFn: async () => {
      const allThreads = await base44.entities.ChatThread.filter({ active: true }, '-last_message_at');
      return allThreads.filter(t => t.participant_emails.includes(currentUser.email));
    },
    enabled: !!currentUser,
    refetchInterval: 5000, // Poll every 5s (optimized)
  });

  // Check handshake status for DMs
  const { data: handshakes = [] } = useQuery({
    queryKey: ['handshakes', currentUser?.email],
    queryFn: async () => {
      const sessions = await base44.entities.BotSession.filter({ status: 'accepted' });
      return sessions.filter(s => 
        s.initiator_email === currentUser.email || s.target_email === currentUser.email
      );
    },
    enabled: !!currentUser,
  });

  if (!currentUser || isLoading || userLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-white/40 mx-auto mb-4 animate-pulse" />
          <p className="text-white/60 font-mono">LOADING MESSAGES...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto h-screen flex flex-col md:flex-row">
        {/* Thread List - Left Sidebar */}
        <div className={`${selectedThread ? 'hidden md:block' : 'block'} md:w-96 border-r-2 border-white/20 flex flex-col bg-black`}>
          <div className="p-6 border-b-2 border-white/20 bg-black">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-3xl font-black uppercase tracking-tighter mb-1">MESSAGES</h1>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">E2E ENCRYPTED VIA TELEGRAM</p>
            </motion.div>
            <Button
              onClick={() => setShowNewMessage(true)}
              className="w-full mt-4 bg-[#FF1493] hover:bg-white text-black font-black border-2 border-white hover:border-[#FF1493] transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              NEW MESSAGE
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <ThreadList
              threads={threads}
              currentUser={currentUser}
              allUsers={allUsers}
              onSelectThread={setSelectedThread}
            />
          </div>
        </div>

        {/* Chat Thread - Main Area */}
        <div className={`${selectedThread ? 'block' : 'hidden md:block'} flex-1 bg-black`}>
          {selectedThread ? (
            <ChatThread
              thread={selectedThread}
              currentUser={currentUser}
              onBack={() => setSelectedThread(null)}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-black">
              <div className="text-center">
                <div className="w-32 h-32 bg-black border-2 border-white flex items-center justify-center mb-8 mx-auto">
                  <MessageCircle className="w-16 h-16 text-white/20" />
                </div>
                <p className="text-white/60 text-xl font-black uppercase tracking-wider mb-2">SELECT A CONVERSATION</p>
                <p className="text-white/20 text-xs uppercase font-mono">ALL MESSAGES ARE END-TO-END ENCRYPTED</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Message Modal */}
      {showNewMessage && (
        <NewMessageModal
          currentUser={currentUser}
          allUsers={allUsers}
          handshakes={handshakes}
          onClose={() => setShowNewMessage(false)}
          onThreadCreated={(thread) => {
            setSelectedThread(thread);
            setShowNewMessage(false);
          }}
        />
      )}
    </div>
  );
}