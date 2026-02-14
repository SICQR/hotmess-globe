import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTicketListing, useTicketThread, useInitiatePurchase } from '@/hooks/useTickets';
import { Button } from '@/components/ui/button';
import logger from '@/utils/logger';

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { listing, isLoading, error } = useTicketListing(id);
  const { thread } = useTicketThread(listing?.id);
  const { initiate, isPending } = useInitiatePurchase();

  const handleStartChat = async () => {
    if (!listing) return;
    try {
      const result = await initiate({ listingId: listing.id });
      if (result?.threadId) {
        navigate(`/tickets/chat/${result.threadId}`);
      }
    } catch (err) {
      logger.error('Failed to start chat:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-8 text-center">
            <div className="text-lg font-semibold text-red-400">Ticket not found</div>
            <Button variant="glass" className="mt-4" onClick={() => navigate('/tickets')}>
              Back to Tickets
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const demandColors = {
    low: 'text-white/50',
    normal: 'text-cyan-400',
    high: 'text-yellow-400',
    hot: 'text-red-400',
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl p-4">
        {/* Back button */}
        <button
          onClick={() => navigate('/tickets')}
          className="mb-4 flex items-center gap-2 text-sm text-white/60 hover:text-white"
        >
          ← Back to tickets
        </button>

        {/* Main card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          {/* Image */}
          {listing.proof_image_url && (
            <div className="aspect-video bg-black/20">
              <img
                src={listing.proof_image_url}
                alt="Ticket proof"
                className="h-full w-full object-contain"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {/* Title & demand */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-black text-white">{listing.event_name}</h1>
                <div className="text-sm text-white/60 mt-1">
                  {new Date(listing.event_date).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </div>
              <div className={`text-sm font-semibold ${demandColors[listing.demand_level] || 'text-white/50'}`}>
                {listing.demand_level?.toUpperCase()} demand
              </div>
            </div>

            {/* Details */}
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Ticket type</span>
                <span className="text-white font-medium">{listing.ticket_type || 'General'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Venue</span>
                <span className="text-white font-medium">{listing.venue_name || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Original price</span>
                <span className="text-white/50">£{listing.original_price?.toFixed(2) || '—'}</span>
              </div>
              <div className="flex justify-between text-lg border-t border-white/10 pt-3">
                <span className="text-white/60">Asking price</span>
                <span className="text-white font-black">£{listing.asking_price?.toFixed(2)}</span>
              </div>
            </div>

            {/* Seller note */}
            {listing.notes && (
              <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Seller note</div>
                <div className="text-sm text-white/80">{listing.notes}</div>
              </div>
            )}

            {/* CTA */}
            <div className="mt-6">
              {thread ? (
                <Button
                  variant="cyan"
                  className="w-full"
                  onClick={() => navigate(`/tickets/chat/${thread.id}`)}
                >
                  Continue Chat
                </Button>
              ) : (
                <Button
                  variant="hot"
                  className="w-full"
                  onClick={handleStartChat}
                  disabled={isPending}
                >
                  {isPending ? 'Starting...' : 'Start Chat to Buy'}
                </Button>
              )}
            </div>

            {/* Trust info */}
            <div className="mt-4 text-center text-xs text-white/40">
              Chat required before purchase • 10% platform fee • Escrow protected
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
