import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import { MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function MessageButton({ targetUser, currentUser, threadType = 'dm', metadata = {}, className = '' }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createThreadMutation = useMutation({
    mutationFn: async () => {
      // Check if thread already exists
      const existingThreads = await supabase.from('chat_threads').select('*');
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
      return await supabase.from('chat_threads').insert({
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

    const ok = await (async () => { const { data: { session } } = await supabase.auth.getSession(); if (!session) { window.location.href = "/auth"; return false; } return true; })();
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