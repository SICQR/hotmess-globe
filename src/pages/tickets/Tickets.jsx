import React from 'react';
import { useTicketListings } from '@/hooks/useTickets';
import TicketCard from '@/components/tickets/TicketCard';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function Tickets() {
  const navigate = useNavigate();
  const { listings, isLoading, error } = useTicketListings();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl p-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Tickets</h1>
            <p className="text-sm text-white/60">Buy & sell event tickets securely</p>
          </div>
          <Button
            variant="hot"
            onClick={() => navigate('/tickets/new')}
          >
            Sell Ticket
          </Button>
        </div>

        {/* Info banner */}
        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🎟️</div>
            <div>
              <div className="font-semibold text-white">Peer-to-Peer Resale</div>
              <div className="text-sm text-white/70">
                All sales require chat first. We verify tickets and hold payment in escrow until transfer is confirmed.
              </div>
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-red-400">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && listings?.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
            <div className="text-4xl mb-4">🎫</div>
            <div className="text-lg font-semibold text-white mb-2">No tickets listed yet</div>
            <div className="text-sm text-white/60 mb-4">
              Be the first to list a ticket for resale
            </div>
            <Button variant="cyan" onClick={() => navigate('/tickets/new')}>
              List Your Ticket
            </Button>
          </div>
        )}

        {/* Listings grid */}
        {!isLoading && !error && listings?.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <TicketCard
                key={listing.id}
                listing={listing}
                onClick={() => navigate(`/tickets/${listing.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
