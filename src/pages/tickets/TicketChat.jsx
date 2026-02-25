import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTicketThread, useTicketMessages, useSendTicketMessage, useInitiatePurchase } from '@/hooks/useTickets';
import { Button } from '@/components/ui/button';
import { supabase } from '@/components/utils/supabaseClient';

export default function TicketChat() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState(null);
  const messagesEndRef = useRef(null);

  const { thread, isLoading: threadLoading } = useTicketThread(null, threadId);
  const { messages, isLoading: messagesLoading, refetch } = useTicketMessages(threadId);
  const { send, isPending: sendPending } = useSendTicketMessage();
  const { initiate: initiatePurchase, isPending: purchasePending } = useInitiatePurchase();

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id || null);
    });
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`ticket-chat-${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ticket_chat_messages',
        filter: `thread_id=eq.${threadId}`,
      }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, refetch]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !threadId) return;
    setInput('');
    await send({ threadId, content: text });
    refetch();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePurchase = async () => {
    if (!thread?.listing_id) return;
    await initiatePurchase({ listingId: thread.listing_id, unlock: true });
    // In production, this would redirect to Stripe checkout
    alert('Payment flow would start here (Stripe integration required)');
  };

  if (threadLoading || messagesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-8 text-center">
            <div className="text-lg font-semibold text-red-400">Chat not found</div>
            <Button variant="glass" className="mt-4" onClick={() => navigate('/tickets')}>
              Back to Tickets
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isBuyer = userId === thread.buyer_id;
  const isSeller = userId === thread.seller_id;
  const canPurchase = thread.purchase_unlocked && isBuyer && thread.status === 'active';
  const messageCount = messages?.length || 0;
  const messagesUntilUnlock = Math.max(0, 3 - messageCount);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 p-4">
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate(`/tickets/${thread.listing_id}`)}
              className="text-sm text-white/60 hover:text-white"
            >
              ← Back to listing
            </button>
            <h1 className="text-lg font-bold text-white mt-1">
              {thread.listing?.event_name || 'Ticket Chat'}
            </h1>
          </div>
          <div className="text-right">
            <div className="text-sm text-white/60">
              {isBuyer ? 'You are buying' : isSeller ? 'You are selling' : 'Viewer'}
            </div>
            <div className="text-lg font-black text-white">
              £{thread.listing?.asking_price?.toFixed(2) || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* System message */}
          <div className="rounded-lg bg-white/5 p-3 text-center text-sm text-white/60">
            Chat with the {isBuyer ? 'seller' : 'buyer'} to verify the ticket before purchasing.
            {messagesUntilUnlock > 0 && (
              <span className="block mt-1 text-cyan-400">
                {messagesUntilUnlock} more message{messagesUntilUnlock !== 1 ? 's' : ''} until purchase unlocks
              </span>
            )}
          </div>

          {/* Message list */}
          {messages?.map((msg) => {
            const isOwn = msg.sender_id === userId;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    isOwn
                      ? 'bg-gradient-to-r from-[#C8962C] to-[#C8962C]/80 text-white'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  <div className="text-sm">{msg.content}</div>
                  <div className={`text-[10px] mt-1 ${isOwn ? 'text-white/60' : 'text-white/40'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Purchase banner (when unlocked) */}
      {canPurchase && (
        <div className="border-t border-white/10 bg-gradient-to-r from-[#C8962C]/10 to-[#00D9FF]/10 p-4">
          <div className="mx-auto max-w-2xl flex items-center justify-between">
            <div>
              <div className="text-sm text-white/60">Ready to buy?</div>
              <div className="text-lg font-bold text-white">
                £{thread.listing?.asking_price?.toFixed(2)} + 10% fee
              </div>
            </div>
            <Button
              variant="hot"
              onClick={handlePurchase}
              disabled={purchasePending}
            >
              {purchasePending ? 'Processing...' : 'Pay Now'}
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-white/10 bg-background p-4">
        <div className="mx-auto max-w-2xl flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/20 focus:outline-none"
          />
          <Button
            variant="cyan"
            onClick={handleSend}
            disabled={!input.trim() || sendPending}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
