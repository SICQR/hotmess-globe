/**
 * Vault Context - Unified Inventory System
 * 
 * The Vault fetches and merges inventory data from multiple sources:
 * 1. Shopify: customer.orders (Official merch)
 * 2. Supabase: p2p_transactions (Artist resale/Creator items)
 * 
 * Part of the HotMess OS Integration - provides a single source of truth
 * for all user-owned items across commerce systems.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';

const VaultContext = createContext(null);

/**
 * VaultProvider component
 * Manages user's inventory across all commerce platforms
 */
export function VaultProvider({ children }) {
  const [vaultItems, setVaultItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch Shopify orders
  const { data: shopifyOrders = [], isLoading: shopifyLoading } = useQuery({
    queryKey: ['shopify-orders', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      
      try {
        // Fetch from Shopify API endpoint
        const response = await fetch('/api/shopify/orders', {
          headers: {
            'Authorization': `Bearer ${(await base44.auth.getSession())?.access_token}`,
          },
        });
        
        if (!response.ok) {
          console.warn('[Vault] Failed to fetch Shopify orders');
          return [];
        }
        
        const data = await response.json();
        return Array.isArray(data.orders) ? data.orders : [];
      } catch (error) {
        console.error('[Vault] Shopify error:', error);
        return [];
      }
    },
    enabled: !!currentUser?.email,
    refetchInterval: 120000, // Refresh every 2 minutes
  });

  // Fetch P2P transactions from Supabase
  const { data: p2pTransactions = [], isLoading: p2pLoading } = useQuery({
    queryKey: ['p2p-transactions', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      
      try {
        // Query p2p_transactions table
        const transactions = await base44.entities.P2PTransaction?.filter(
          { buyer_email: currentUser.email, status: 'completed' }
        );
        
        return Array.isArray(transactions) ? transactions : [];
      } catch (error) {
        console.error('[Vault] P2P error:', error);
        return [];
      }
    },
    enabled: !!currentUser?.email,
    refetchInterval: 120000, // Refresh every 2 minutes
  });

  // Merge and normalize items from both sources
  useEffect(() => {
    if (shopifyLoading || p2pLoading) {
      setIsLoading(true);
      return;
    }

    const items = [];

    // Add Shopify items
    if (Array.isArray(shopifyOrders)) {
      shopifyOrders.forEach((order) => {
        if (order.line_items && Array.isArray(order.line_items)) {
          order.line_items.forEach((item) => {
            items.push({
              id: `shopify-${order.id}-${item.id}`,
              source: 'shopify',
              type: 'official',
              name: item.name || item.title,
              quantity: item.quantity,
              price: item.price,
              image: item.image?.src || null,
              orderId: order.id,
              orderNumber: order.order_number,
              orderDate: order.created_at,
              sku: item.sku,
              variant: item.variant_title,
            });
          });
        }
      });
    }

    // Add P2P items
    if (Array.isArray(p2pTransactions)) {
      p2pTransactions.forEach((transaction) => {
        items.push({
          id: `p2p-${transaction.id}`,
          source: 'p2p',
          type: 'creator',
          name: transaction.product_name || transaction.title,
          quantity: transaction.quantity || 1,
          price: transaction.price,
          image: transaction.image_url || transaction.product_image,
          orderId: transaction.id,
          orderDate: transaction.created_date || transaction.created_at,
          sellerId: transaction.seller_id,
          sellerEmail: transaction.seller_email,
          metadata: transaction.metadata,
        });
      });
    }

    setVaultItems(items);
    setIsLoading(false);
  }, [shopifyOrders, p2pTransactions, shopifyLoading, p2pLoading]);

  // Get items by type
  const getItemsByType = useCallback((type) => {
    return vaultItems.filter((item) => item.type === type);
  }, [vaultItems]);

  // Get items by source
  const getItemsBySource = useCallback((source) => {
    return vaultItems.filter((item) => item.source === source);
  }, [vaultItems]);

  // Get total item count
  const getTotalCount = useCallback(() => {
    return vaultItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  }, [vaultItems]);

  const value = {
    vaultItems,
    isLoading,
    shopifyOrders,
    p2pTransactions,
    getItemsByType,
    getItemsBySource,
    getTotalCount,
  };

  return (
    <VaultContext.Provider value={value}>
      {children}
    </VaultContext.Provider>
  );
}

/**
 * Hook to access the Vault context
 * @returns {Object} Vault context with inventory data and helpers
 */
export function useVault() {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within VaultProvider');
  }
  return context;
}

export default VaultContext;
