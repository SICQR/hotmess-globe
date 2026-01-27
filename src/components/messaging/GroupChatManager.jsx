import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function GroupChatManager({ currentUser, allUsers, eventId = null, squadId = null }) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const ok = await base44.auth.requireProfile(window.location.href);
      if (!ok) return null;

      const participantEmails = [currentUser.email, ...selectedUsers];
      
      const thread = await base44.entities.ChatThread.create({
        participant_emails: participantEmails,
        thread_type: eventId ? 'event' : squadId ? 'squad' : 'dm',
        active: true,
        metadata: {
          event_id: eventId,
          squad_id: squadId,
        },
        unread_count: {},
      });

      // Send welcome message
      await base44.entities.Message.create({
        thread_id: thread.id,
        sender_email: currentUser.email,
        content: `${currentUser.full_name} created this group`,
        message_type: 'system',
        read_by: [currentUser.email],
      });

      return thread;
    },
    onSuccess: (thread) => {
      if (!thread) return;
      queryClient.invalidateQueries(['chat-threads']);
      toast.success('Group created!');
      navigate(`/social/t/${encodeURIComponent(String(thread?.id || ''))}`);
      setShowCreate(false);
      setSelectedUsers([]);
    },
  });

  const toggleUser = (email) => {
    setSelectedUsers(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const filteredUsers = allUsers.filter(u =>
    u.email !== currentUser.email &&
    (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div>
      {!showCreate ? (
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-[#B026FF] hover:bg-[#B026FF]/90 text-white"
        >
          <Users className="w-4 h-4 mr-2" />
          Create Group Chat
        </Button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">New Group Chat</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="mb-4"
          />

          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedUsers.map(email => {
                const user = allUsers.find(u => u.email === email);
                return (
                  <div
                    key={email}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#E62020]/20 border border-[#E62020] rounded-lg"
                  >
                    <span className="text-sm">{user?.full_name || email}</span>
                    <button onClick={() => toggleUser(email)}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
            {filteredUsers.map(user => (
              <button
                key={user.email}
                onClick={() => toggleUser(user.email)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                  selectedUsers.includes(user.email)
                    ? 'bg-[#E62020]/20 border border-[#E62020]'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E62020] to-[#B026FF] flex items-center justify-center">
                  <span className="font-bold text-sm">{user.full_name?.[0] || 'U'}</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm">{user.full_name}</p>
                  <p className="text-xs text-white/40">{user.email}</p>
                </div>
              </button>
            ))}
          </div>

          <Button
            onClick={() => createGroupMutation.mutate()}
            disabled={selectedUsers.length === 0 || createGroupMutation.isPending}
            className="w-full bg-[#E62020] hover:bg-[#E62020]/90 text-black"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Group ({selectedUsers.length} selected)
          </Button>
        </motion.div>
      )}
    </div>
  );
}