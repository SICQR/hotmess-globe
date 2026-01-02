import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Ticket, Search, Filter, DollarSign, Calendar, MapPin, User, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function TicketMarketplace() {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [filterType, setFilterType] = useState('all');

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          base44.auth.redirectToLogin();
          return;
        }
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const { data: tickets = [] } = useQuery({
    queryKey: ['ticket-listings'],
    queryFn: () => base44.entities.Product.filter({ product_type: 'ticket', status: 'active' }, '-created_date')
  });

  const { data: myOrders = [] } = useQuery({
    queryKey: ['my-orders', currentUser?.email],
    queryFn: () => base44.entities.Order.filter({ buyer_email: currentUser.email }),
    enabled: !!currentUser
  });

  const purchaseMutation = useMutation({
    mutationFn: async (ticket) => {
      const order = await base44.entities.Order.create({
        buyer_email: currentUser.email,
        seller_email: ticket.seller_email,
        total_xp: ticket.price_xp,
        total_gbp: ticket.price_gbp || 0,
        status: 'escrow',
        payment_method: 'xp'
      });

      await base44.entities.OrderItem.create({
        order_id: order.id,
        product_id: ticket.id,
        quantity: 1,
        price_xp: ticket.price_xp
      });

      await base44.auth.updateMe({ xp: (currentUser.xp || 0) - ticket.price_xp });

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket-listings']);
      queryClient.invalidateQueries(['my-orders']);
      toast.success('Ticket purchased! Check your orders.');
    },
    onError: () => {
      toast.error('Purchase failed');
    }
  });

  const filteredTickets = tickets
    .filter(t => {
      const matchesSearch = t.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           t.details?.event_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || t.details?.ticket_type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.created_date) - new Date(a.created_date);
      if (sortBy === 'price_low') return a.price_xp - b.price_xp;
      if (sortBy === 'price_high') return b.price_xp - a.price_xp;
      return 0;
    });

  if (!currentUser) {
    return <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Ticket className="w-12 h-12 text-[#FFEB3B]" />
            <div>
              <h1 className="text-5xl font-black italic">TICKET MARKETPLACE</h1>
              <p className="text-white/60 uppercase tracking-wider text-sm">Resale, legit, verified</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6 bg-white/5 border-2 border-white/10 p-4 rounded-xl">
          <div className="flex-1 min-w-[200px]">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events..."
              className="bg-white/5 border-white/20 text-white"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 bg-white/5 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Latest</SelectItem>
              <SelectItem value="price_low">Price: Low</SelectItem>
              <SelectItem value="price_high">Price: High</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40 bg-white/5 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="early_access">Early Access</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tickets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTickets.map(ticket => (
            <div key={ticket.id} className="bg-white/5 border-2 border-white/10 rounded-xl overflow-hidden hover:border-[#FFEB3B] transition-all">
              {ticket.image_urls?.[0] && (
                <img src={ticket.image_urls[0]} alt={ticket.name} className="w-full h-48 object-cover" />
              )}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-black text-xl mb-1">{ticket.name}</h3>
                    {ticket.details?.event_date && (
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(ticket.details.event_date), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>
                  {ticket.details?.ticket_type && (
                    <span className="px-2 py-1 bg-[#FFEB3B]/20 border border-[#FFEB3B] text-[#FFEB3B] text-xs font-bold rounded uppercase">
                      {ticket.details.ticket_type}
                    </span>
                  )}
                </div>

                {ticket.details?.venue && (
                  <div className="flex items-center gap-2 text-sm text-white/60 mb-3">
                    <MapPin className="w-4 h-4" />
                    <span>{ticket.details.venue}</span>
                  </div>
                )}

                <div className="border-t border-white/10 pt-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-black text-[#FFEB3B]">{ticket.price_xp} XP</span>
                    {ticket.price_gbp && (
                      <span className="text-white/60">or £{ticket.price_gbp}</span>
                    )}
                  </div>
                  <div className="text-xs text-white/40">
                    {ticket.inventory_count} available
                  </div>
                </div>

                <Button
                  onClick={() => purchaseMutation.mutate(ticket)}
                  disabled={purchaseMutation.isPending || ticket.inventory_count === 0 || (currentUser.xp || 0) < ticket.price_xp}
                  className="w-full bg-[#FFEB3B] hover:bg-white text-black font-black uppercase"
                >
                  {ticket.inventory_count === 0 ? 'Sold Out' : 'Buy Now'}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredTickets.length === 0 && (
          <div className="text-center py-20">
            <Ticket className="w-20 h-20 mx-auto mb-4 text-white/20" />
            <p className="text-2xl font-black text-white/40 uppercase">No tickets available</p>
          </div>
        )}
      </div>
    </div>
  );
}