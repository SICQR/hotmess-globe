/**
 * useUnifiedVault - Single nerve center for user's inventory, beacons, and stats
 * 
 * Aggregates:
 * - P2P orders (buyer)
 * - Shopify orders (stub for future)
 * - User's active beacons (signals)
 * - XP/rank stats
 */

import { useQuery } from '@tanstack/react-query';
import { base44, supabase } from '@/components/utils/supabaseClient';
import logger from '@/utils/logger';

/**
 * @param {Object} user - Current user from base44.auth.me()
 * @returns {Object} { inventory, beacons, stats, isLoading, error }
 */
export function useUnifiedVault(user) {
  const userId = user?.auth_user_id ?? user?.id;
  const userEmail = user?.email;

  // P2P Orders (buyer) - same pattern as OrderHistory
  const {
    data: p2pOrders = [],
    isLoading: p2pLoading,
    error: p2pError,
  } = useQuery({
    queryKey: ['vault-p2p-orders', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      const orders = await base44.entities.Order.filter(
        { buyer_email: userEmail },
        '-created_date'
      );
      return orders.map((order) => ({
        id: order.id,
        title: `Order #${String(order.id).slice(0, 8)}`,
        status: order.status || 'pending',
        source: 'p2p',
        created_date: order.created_date,
        total: order.total,
      }));
    },
    enabled: !!userEmail,
    staleTime: 30000,
  });

  // Shopify Orders (stub - TODO: integrate Shopify customer orders API)
  const {
    data: shopifyOrders = [],
    isLoading: shopifyLoading,
  } = useQuery({
    queryKey: ['vault-shopify-orders', userEmail],
    queryFn: async () => {
      // TODO: Fetch from Shopify customer orders API or webhook table
      return [];
    },
    enabled: !!userEmail,
    staleTime: 60000,
  });

  // User's active beacons
  const {
    data: beacons = [],
    isLoading: beaconsLoading,
    error: beaconsError,
  } = useQuery({
    queryKey: ['vault-beacons', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('Beacon')
        .select('id, kind, title, city, created_date, expires_at')
        .eq('promoter_id', userId)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('created_date', { ascending: false });

      if (error) {
        logger.error('[useUnifiedVault] Beacon fetch error:', error);
        return [];
      }

      return (data || []).map((b) => ({
        id: b.id,
        kind: b.kind || 'social',
        title: b.title || b.city || 'Signal',
        city: b.city,
        created_date: b.created_date,
        expires_at: b.expires_at,
      }));
    },
    enabled: !!userId,
    staleTime: 15000,
  });

  // Stats (XP, rank) - placeholder or from gamification
  const {
    data: stats = { xp: 0, rank: '—', level: 1 },
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ['vault-stats', userId],
    queryFn: async () => {
      if (!userId) return { xp: 0, rank: '—', level: 1 };
      
      // Try to get from user profile or gamification table
      try {
        const { data } = await supabase
          .from('User')
          .select('xp_points, level')
          .eq('id', userId)
          .single();
        
        if (data) {
          return {
            xp: data.xp_points || 0,
            level: data.level || 1,
            rank: data.level >= 10 ? 'Elite' : data.level >= 5 ? 'Regular' : 'Newcomer',
          };
        }
      } catch (e) {
        // Fallback to placeholder
      }
      
      return { xp: 0, rank: '—', level: 1 };
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  // Combine inventory from all sources
  const inventory = [...p2pOrders, ...shopifyOrders];

  const isLoading = p2pLoading || shopifyLoading || beaconsLoading || statsLoading;
  const error = p2pError || beaconsError;

  return {
    inventory,
    beacons,
    stats,
    isLoading,
    error,
    // Counts for quick stats
    counts: {
      orders: inventory.length,
      activeSignals: beacons.length,
      p2p: p2pOrders.length,
      shopify: shopifyOrders.length,
    },
  };
}

export default useUnifiedVault;
