import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Music, Calendar, Mic2, Send, X, Check, Clock, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const COLLABORATION_TYPES = [
  { id: 'general', label: 'General', icon: Users, description: 'Open collaboration request' },
  { id: 'event', label: 'Event', icon: Calendar, description: 'Co-organize an event' },
  { id: 'music', label: 'Music', icon: Music, description: 'Music production collab' },
  { id: 'feature', label: 'Feature', icon: Mic2, description: 'Featured appearance' },
  { id: 'collab_track', label: 'Collab Track', icon: Music, description: 'Create a track together' },
];

export function CollaborationRequestButton({ creatorEmail, creatorName, currentUser, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('general');
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();

  // Check for existing request
  const { data: existingRequest } = useQuery({
    queryKey: ['collab-request-status', currentUser?.email, creatorEmail],
    queryFn: async () => {
      const res = await fetch(`/api/collaborations?type=sent`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await window.supabase?.auth.getSession())?.data?.session?.access_token || ''}`,
        },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.requests?.find(r => 
        r.creator_email === creatorEmail && 
        ['pending', 'accepted'].includes(r.status)
      ) || null;
    },
    enabled: !!currentUser?.email && !!creatorEmail,
  });

  const sendRequest = useMutation({
    mutationFn: async () => {
      const session = await window.supabase?.auth.getSession();
      const token = session?.data?.session?.access_token;
      
      const res = await fetch('/api/collaborations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          creator_email: creatorEmail,
          collaboration_type: selectedType,
          message: message.trim() || null,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send request');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Collaboration request sent!');
      setIsOpen(false);
      setMessage('');
      queryClient.invalidateQueries(['collab-request-status', currentUser?.email, creatorEmail]);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  if (!currentUser || currentUser.email === creatorEmail) {
    return null;
  }

  // Show status if request already exists
  if (existingRequest) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
        existingRequest.status === 'pending' 
          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          : 'bg-green-500/20 text-green-400 border border-green-500/30',
        className
      )}>
        {existingRequest.status === 'pending' ? (
          <>
            <Clock className="w-4 h-4" />
            Request Pending
          </>
        ) : (
          <>
            <Check className="w-4 h-4" />
            Collaboration Active
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          'bg-gradient-to-r from-[#B026FF] to-[#E62020] text-white hover:opacity-90 font-bold',
          className
        )}
      >
        <Users className="w-4 h-4 mr-2" />
        Request Collab
      </Button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md bg-[#111] border border-white/20 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-bold">Request Collaboration</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-sm text-white/60">
                Send a collaboration request to <span className="text-white font-medium">{creatorName}</span>
              </p>

              {/* Collaboration Type */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-white/40">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {COLLABORATION_TYPES.map((type) => {
                    const Icon = type.icon;
                    const selected = selectedType === type.id;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={cn(
                          'flex items-center gap-2 p-3 rounded-lg border text-left transition-colors',
                          selected
                            ? 'bg-[#B026FF]/20 border-[#B026FF]/50 text-[#B026FF]'
                            : 'bg-white/5 border-white/10 text-white/70 hover:border-white/20'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <div>
                          <div className="text-sm font-medium">{type.label}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-white/40">
                  Message (optional)
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Introduce yourself and describe what you'd like to collaborate on..."
                  className="bg-white/5 border-white/10 text-white resize-none h-24"
                  maxLength={500}
                />
                <div className="text-xs text-white/40 text-right">{message.length}/500</div>
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-white/10">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1 border-white/20"
              >
                Cancel
              </Button>
              <Button
                onClick={() => sendRequest.mutate()}
                disabled={sendRequest.isPending}
                className="flex-1 bg-gradient-to-r from-[#B026FF] to-[#E62020] text-white"
              >
                {sendRequest.isPending ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Request
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Collaboration Inbox Component
export function CollaborationInbox({ userEmail }) {
  const [activeTab, setActiveTab] = useState('received');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['collaborations', activeTab, userEmail],
    queryFn: async () => {
      const session = await window.supabase?.auth.getSession();
      const token = session?.data?.session?.access_token;
      
      const res = await fetch(`/api/collaborations?type=${activeTab}`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!userEmail,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, action, response_message }) => {
      const session = await window.supabase?.auth.getSession();
      const token = session?.data?.session?.access_token;
      
      const res = await fetch(`/api/collaborations/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action, response_message }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to respond');
      }
      return res.json();
    },
    onSuccess: (_, { action }) => {
      toast.success(`Request ${action}ed`);
      queryClient.invalidateQueries(['collaborations']);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const requests = data?.requests || [];
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('received')}
          className={cn(
            'flex-1 px-4 py-3 text-sm font-medium transition-colors',
            activeTab === 'received'
              ? 'bg-white/10 text-white border-b-2 border-[#B026FF]'
              : 'text-white/60 hover:text-white'
          )}
        >
          Received {pendingCount > 0 && activeTab === 'received' && (
            <span className="ml-2 px-2 py-0.5 bg-[#B026FF] text-white text-xs rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={cn(
            'flex-1 px-4 py-3 text-sm font-medium transition-colors',
            activeTab === 'sent'
              ? 'bg-white/10 text-white border-b-2 border-[#B026FF]'
              : 'text-white/60 hover:text-white'
          )}
        >
          Sent
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="text-center py-8 text-white/40">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 text-white/40">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No collaboration requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => {
              const otherUser = activeTab === 'received' ? request.requester : request.creator;
              const typeConfig = COLLABORATION_TYPES.find(t => t.id === request.collaboration_type) || COLLABORATION_TYPES[0];
              const Icon = typeConfig.icon;

              return (
                <div
                  key={request.id}
                  className="p-4 bg-black/30 border border-white/10 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={otherUser?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.full_name || 'User')}&background=111111&color=ffffff`}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white truncate">
                          {otherUser?.full_name || otherUser?.email}
                        </span>
                        <span className={cn(
                          'px-2 py-0.5 text-xs font-medium rounded-full',
                          request.status === 'pending' && 'bg-yellow-500/20 text-yellow-400',
                          request.status === 'accepted' && 'bg-green-500/20 text-green-400',
                          request.status === 'declined' && 'bg-red-500/20 text-red-400',
                          request.status === 'cancelled' && 'bg-white/10 text-white/40'
                        )}>
                          {request.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-white/60">
                        <Icon className="w-3 h-3" />
                        <span>{typeConfig.label}</span>
                        <span>•</span>
                        <span>{new Date(request.created_at).toLocaleDateString()}</span>
                      </div>
                      {request.message && (
                        <p className="mt-2 text-sm text-white/70 line-clamp-2">
                          {request.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions for pending received requests */}
                  {activeTab === 'received' && request.status === 'pending' && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                      <Button
                        size="sm"
                        onClick={() => respondMutation.mutate({ id: request.id, action: 'accept' })}
                        disabled={respondMutation.isPending}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => respondMutation.mutate({ id: request.id, action: 'decline' })}
                        disabled={respondMutation.isPending}
                        className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  )}

                  {/* Cancel button for pending sent requests */}
                  {activeTab === 'sent' && request.status === 'pending' && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => respondMutation.mutate({ id: request.id, action: 'cancel' })}
                        disabled={respondMutation.isPending}
                        className="w-full border-white/20 text-white/60 hover:text-white"
                      >
                        Cancel Request
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default CollaborationRequestButton;
