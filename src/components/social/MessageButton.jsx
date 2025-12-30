import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageCircle, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '../../utils';
import { toast } from 'sonner';
import HandshakeButton from './HandshakeButton';

export default function MessageButton({ targetUser, currentUser, threadType = 'dm', metadata = {}, className = '' }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Check if handshake exists
  const { data: handshake } = useQuery({
    queryKey: ['handshake', currentUser?.email, targetUser?.email],
    queryFn: async () => {
      const sessions = await base44.entities.BotSession.list();
      return sessions.find(s => 
        ((s.initiator_email === currentUser.email && s.target_email === targetUser.email) ||
         (s.initiator_email === targetUser.email && s.target_email === currentUser.email)) &&
        s.status === 'accepted'
      );
    },
    enabled: !!currentUser && !!targetUser && threadType === 'dm',
  });

  const createThreadMutation = useMutation({
    mutationFn: async () => {
      // Check if thread already exists
      const existingThreads = await base44.entities.ChatThread.list();
      const existing = existingThreads.find(t => 
        t.participant_emails.includes(currentUser.email) &&
        t.participant_emails.includes(targetUser.email) &&
        t.thread_type === threadType &&
        JSON.stringify(t.metadata || {}) === JSON.stringify(metadata)
      );

      if (existing) {
        return existing;
      }

      // Create new thread
      return await base44.entities.ChatThread.create({
        participant_emails: [currentUser.email, targetUser.email],
        thread_type: threadType,
        metadata: metadata,
        last_message: 'New conversation',
        last_message_at: new Date().toISOString(),
        unread_count: {},
        active: true,
      });
    },
    onSuccess: (thread) => {
      queryClient.invalidateQueries(['chat-threads']);
      navigate(createPageUrl('Messages'));
    },
    onError: () => {
      toast.error('Failed to start conversation');
    },
  });

  const handleMessage = () => {
    if (!currentUser) {
      toast.error('Please log in');
      return;
    }

    if (currentUser.email === targetUser.email) {
      toast.error('Cannot message yourself');
      return;
    }

    // Check handshake for DM threads
    if (threadType === 'dm' && !handshake) {
      toast.error('Complete Telegram handshake first');
      return;
    }

    createThreadMutation.mutate();
  };

  // For DM threads, require handshake first
  if (threadType === 'dm' && !handshake) {
    return (
      <HandshakeButton
        targetUser={targetUser}
        currentUser={currentUser}
        variant="default"
        className={className}
      />
    );
  }

  return (
    <Button
      onClick={handleMessage}
      disabled={createThreadMutation.isPending}
      className={className}
    >
      {createThreadMutation.isPending ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <MessageCircle className="w-4 h-4 mr-2" />
      )}
      Message
    </Button>
  );
}