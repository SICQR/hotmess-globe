import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';

/**
 * Ticket Resale Hooks
 * 
 * Flow:
 * 1. Seller lists ticket (with proof)
 * 2. Buyer browses listings
 * 3. Buyer enters chat (mandatory)
 * 4. After min messages, purchase unlocks
 * 5. Buyer pays (escrow)
 * 6. Seller transfers ticket
 * 7. Buyer confirms, escrow releases
 */

// ============================================================================
// LISTINGS
// ============================================================================

export function useTicketListings(filters = {}) {
  return useQuery({
    queryKey: ['ticket-listings', filters],
    queryFn: async () => {
      let query = supabase
        .from('ticket_listings')
        .select(`
          *,
          seller:seller_id (id, full_name, avatar_url),
          event:event_id (id, title, venue_name)
        `)
        .eq('status', 'active')
        .order('event_date', { ascending: true });

      if (filters.city) {
        query = query.ilike('event_city', `%${filters.city}%`);
      }
      if (filters.eventId) {
        query = query.eq('event_id', filters.eventId);
      }
      if (filters.minPrice) {
        query = query.gte('asking_price', filters.minPrice);
      }
      if (filters.maxPrice) {
        query = query.lte('asking_price', filters.maxPrice);
      }
      if (filters.search) {
        query = query.textSearch('search_vector', filters.search);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useTicketListing(listingId) {
  return useQuery({
    queryKey: ['ticket-listing', listingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_listings')
        .select(`
          *,
          seller:seller_id (id, full_name, avatar_url, is_verified),
          event:event_id (id, title, venue_name, start_date)
        `)
        .eq('id', listingId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!listingId,
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listing) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('ticket_listings')
        .insert({
          ...listing,
          seller_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket-listings']);
    },
  });
}

export function useMyListings() {
  return useQuery({
    queryKey: ['my-ticket-listings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('ticket_listings')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

// ============================================================================
// CHAT (Mandatory before purchase)
// ============================================================================

export function useTicketThread(listingId) {
  return useQuery({
    queryKey: ['ticket-thread', listingId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get or create thread
      const { data, error } = await supabase
        .rpc('get_or_create_ticket_thread', {
          p_listing_id: listingId,
          p_buyer_id: user.id,
        });

      if (error) throw error;
      return data;
    },
    enabled: !!listingId,
  });
}

export function useTicketMessages(threadId) {
  return useQuery({
    queryKey: ['ticket-messages', threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_chat_messages')
        .select(`
          *,
          sender:sender_id (id, full_name, avatar_url)
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!threadId,
    refetchInterval: 5000, // Poll every 5s
  });
}

export function useSendTicketMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ threadId, content }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('ticket_chat_messages')
        .insert({
          thread_id: threadId,
          sender_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['ticket-messages', variables.threadId]);
      queryClient.invalidateQueries(['ticket-thread']);
    },
  });
}

// ============================================================================
// PURCHASES
// ============================================================================

export function useMyPurchases() {
  return useQuery({
    queryKey: ['my-ticket-purchases'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('ticket_purchases')
        .select(`
          *,
          listing:listing_id (
            event_name, event_date, event_venue, ticket_type
          ),
          seller:seller_id (id, full_name)
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useMySales() {
  return useQuery({
    queryKey: ['my-ticket-sales'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('ticket_purchases')
        .select(`
          *,
          listing:listing_id (
            event_name, event_date, ticket_type
          ),
          buyer:buyer_id (id, full_name)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useInitiatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId, quantity = 1 }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check chat requirement
      const { data: thread } = await supabase
        .from('ticket_chat_threads')
        .select('can_purchase')
        .eq('listing_id', listingId)
        .eq('buyer_id', user.id)
        .single();

      if (!thread?.can_purchase) {
        throw new Error('You must chat with the seller before purchasing');
      }

      // Get listing
      const { data: listing } = await supabase
        .from('ticket_listings')
        .select('*')
        .eq('id', listingId)
        .single();

      if (!listing || listing.status !== 'active') {
        throw new Error('Listing no longer available');
      }

      // Calculate fees
      const { data: fees } = await supabase
        .rpc('calculate_ticket_fees', {
          p_price: listing.asking_price,
          p_quantity: quantity,
        });

      // Create purchase record
      const { data, error } = await supabase
        .from('ticket_purchases')
        .insert({
          listing_id: listingId,
          buyer_id: user.id,
          seller_id: listing.seller_id,
          quantity,
          unit_price: listing.asking_price,
          subtotal: fees[0].subtotal,
          platform_fee: fees[0].platform_fee,
          seller_payout: fees[0].seller_payout,
          currency: listing.currency,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket-listings']);
      queryClient.invalidateQueries(['my-ticket-purchases']);
    },
  });
}

// ============================================================================
// ACTIONS
// ============================================================================

export function useIncrementView() {
  return useMutation({
    mutationFn: async (listingId) => {
      const { error } = await supabase
        .from('ticket_listings')
        .update({ view_count: supabase.sql`view_count + 1` })
        .eq('id', listingId);

      if (error) throw error;
    },
  });
}

export function useSaveListing() {
  return useMutation({
    mutationFn: async (listingId) => {
      const { error } = await supabase
        .from('ticket_listings')
        .update({ save_count: supabase.sql`save_count + 1` })
        .eq('id', listingId);

      if (error) throw error;
    },
  });
}

export default useTicketListings;
