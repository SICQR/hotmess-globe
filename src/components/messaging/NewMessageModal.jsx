/**
 * NewMessageModal - Simplified DM-only message composer
 * Group/Event/Squad messaging removed
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, MessageCircle, Search, Check } from 'lucide-react';
import { toast } from 'sonner';

// Helper to get display name
const getDisplayName = (user) => {
  if (!user) return 'Unknown';
  return user.display_name || user.full_name || user.username || user.email?.split('@')[0] || 'Unknown';
};

// Helper to get username
const getUsername = (user) => {
  if (!user?.username) return user?.email;
  return `@${user.username}`;
};

export default function NewMessageModal({ currentUser, allUsers, onClose, onThreadCreated, prefillToEmail }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const didPrefillRef = useRef(false);

  // Prefill if email provided
  useEffect(() => {
    const email = prefillToEmail ? String(prefillToEmail).trim().toLowerCase() : '';
    if (!email) return;
    if (didPrefillRef.current) return;
    if (!currentUser?.email) return;
    if (email === String(currentUser.email).trim().toLowerCase()) return;

    didPrefillRef.current = true;
    setSearchQuery(email);
    
    const user = allUsers.find(u => u?.email?.toLowerCase() === email);
    if (user) {
      setSelectedUser(user);
    } else if (email.includes('@')) {
      // User not in list but email looks valid - create a placeholder
      setSelectedUser({
        email: email,
        full_name: email.split('@')[0],
        display_name: email.split('@')[0],
      });
    }
  }, [currentUser?.email, prefillToEmail, allUsers]);

  const createThreadMutation = useMutation({
    mutationFn: async () => {
      const ok = await base44.auth.requireProfile(window.location.href);
      if (!ok) return null;

      if (!selectedUser) throw new Error('Select a user to message');
      
      const targetEmail = selectedUser.email;
      
      // Check if thread already exists
      const existingThreads = await base44.entities.ChatThread.filter({ active: true });
      const existingThread = existingThreads.find(t => 
        t.thread_type === 'dm' &&
        t.participant_emails.length === 2 &&
        t.participant_emails.includes(currentUser.email) &&
        t.participant_emails.includes(targetEmail)
      );
      
      if (existingThread) return existingThread;

      // Create new thread
      const thread = await base44.entities.ChatThread.create({
        participant_emails: [currentUser.email, targetEmail],
        thread_type: 'dm',
        active: true,
        metadata: {},
        unread_count: {},
      });

      return thread;
    },
    onSuccess: (thread) => {
      if (!thread) return;
      queryClient.invalidateQueries(['chat-threads']);
      toast.success('Conversation started!');
      onThreadCreated(thread);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to start conversation');
    },
  });

  // Filter users
  const filteredUsers = allUsers.filter(u =>
    u.email !== currentUser?.email &&
    (getDisplayName(u).toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.username?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-black border border-white/20 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FF1493]/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-[#FF1493]" />
              </div>
              <div>
                <h2 className="font-black text-lg">New Message</h2>
                <p className="text-xs text-white/40">Start a conversation</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or username..."
                className="pl-10 bg-white/5 border-white/10 rounded-xl"
                autoFocus
              />
            </div>
          </div>

          {/* Selected User Preview */}
          {selectedUser && (
            <div className="p-4 bg-[#FF1493]/10 border-b border-[#FF1493]/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center overflow-hidden">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-sm">{getDisplayName(selectedUser)[0]}</span>
                  )}
                </div>
                <div>
                  <p className="font-bold text-sm">{getDisplayName(selectedUser)}</p>
                  <p className="text-xs text-white/40 font-mono">{getUsername(selectedUser)}</p>
                </div>
              </div>
              <Button
                onClick={() => createThreadMutation.mutate()}
                disabled={createThreadMutation.isLoading}
                className="bg-[#FF1493] hover:bg-[#FF1493]/80 text-white font-bold rounded-full px-6"
              >
                {createThreadMutation.isLoading ? 'Starting...' : 'Start Chat'}
              </Button>
            </div>
          )}

          {/* User List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-white/40">
                <p>No users found</p>
              </div>
            ) : (
              filteredUsers.map(user => (
                <button
                  key={user.email}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors border-b border-white/5 ${
                    selectedUser?.email === user.email ? 'bg-white/10' : ''
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold">{getDisplayName(user)[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-bold text-sm truncate">{getDisplayName(user)}</p>
                    <p className="text-xs text-white/40 font-mono truncate">{getUsername(user)}</p>
                  </div>
                  {selectedUser?.email === user.email && (
                    <Check className="w-5 h-5 text-[#FF1493]" />
                  )}
                </button>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
