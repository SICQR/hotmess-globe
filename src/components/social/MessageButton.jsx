import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function MessageButton({ targetUser, currentUser, threadType = 'dm', metadata = {}, className = '' }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
      navigate(`/social/t/${encodeURIComponent(String(thread?.id || ''))}`);
    },
    onError: () => {
      toast.error('Failed to start conversation');
    },
  });

  const handleMessage = async () => {
    if (!currentUser) {
      toast.error('Please log in');
      return;
    }

    const ok = await base44.auth.requireProfile(window.location.href);
    if (!ok) return;

    if (currentUser.email === targetUser.email) {
      toast.error('Cannot message yourself');
      return;
    }

    createThreadMutation.mutate();
  };

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