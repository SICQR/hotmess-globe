import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sparkles } from 'lucide-react';
import ProductCard from './ProductCard';

export default function AIRecommendations({ currentUser, onBuy, excludeProductId = null }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  const { data: allProducts = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.filter({ status: 'active' }),
  });

  const { data: userViews = [] } = useQuery({
    queryKey: ['user-views', currentUser?.email],
    queryFn: () => base44.entities.ProductView.filter({ user_email: currentUser.email }, '-created_date', 50),
    enabled: !!currentUser,
  });

  const { data: userOrders = [] } = useQuery({
    queryKey: ['user-orders', currentUser?.email],
    queryFn: () => base44.entities.Order.filter({ buyer_email: currentUser.email }),
    enabled: !!currentUser,
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['order-items'],
    queryFn: () => base44.entities.OrderItem.list(),
  });

  const { data: userFavorites = [] } = useQuery({
    queryKey: ['user-favorites', currentUser?.email],
    queryFn: () => base44.entities.ProductFavorite.filter({ user_email: currentUser.email }),
    enabled: !!currentUser,
  });

  useEffect(() => {
    if (!currentUser || allProducts.length === 0) {
      setLoading(false);
      return;
    }

    generateRecommendations();
  }, [currentUser, allProducts, userViews, userOrders, userFavorites]);

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      const purchasedProductIds = orderItems
        .filter(item => userOrders.some(order => order.id === item.order_id))
        .map(item => item.product_id);

      const viewedProducts = userViews.slice(0, 20).map(v => ({
        id: v.product_id,
        name: v.product_name,
        category: v.product_category,
        tags: v.product_tags || []
      }));

      const favoritedProductIds = userFavorites.map(f => f.product_id);

      const availableProducts = allProducts.filter(p => 
        p.id !== excludeProductId &&
        !purchasedProductIds.includes(p.id) &&
        (p.inventory_count === undefined || p.inventory_count > 0)
      );

      if (availableProducts.length === 0) {
        setRecommendations([]);
        setLoading(false);
        return;
      }

      const prompt = `You are a product recommendation AI for HOTMESS LONDON marketplace.

User Profile:
- Recently viewed: ${viewedProducts.map(p => `${p.name} (${p.category})`).join(', ') || 'None'}
- Purchased: ${purchasedProductIds.length} products
- Favorited: ${favoritedProductIds.length} products

Available Products:
${availableProducts.slice(0, 30).map(p => `ID: ${p.id}, Name: ${p.name}, Type: ${p.product_type}, Category: ${p.category || 'N/A'}, Tags: ${(p.tags || []).join(', ')}, Price: ${p.price_xp} XP`).join('\n')}

Recommend 6 product IDs that best match this user's interests. Consider:
1. Similar categories/types to viewed items
2. Complementary products to past purchases
3. Popular items in categories they like
4. Price range similar to their purchases

Return ONLY a JSON array of product IDs, like: ["id1", "id2", "id3", "id4", "id5", "id6"]`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            product_ids: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      const recommendedIds = response.product_ids || [];
      const recommendedProducts = availableProducts.filter(p => recommendedIds.includes(p.id)).slice(0, 6);

      setRecommendations(recommendedProducts);
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      setRecommendations(allProducts.filter(p => p.id !== excludeProductId).slice(0, 6));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-[#FF1493] animate-pulse" />
          <h2 className="text-2xl font-black uppercase">AI Recommendations</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl h-80 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-8"
    >
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-[#FF1493]" />
        <h2 className="text-2xl font-black uppercase">Recommended For You</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.map((product, idx) => (
          <ProductCard
            key={product.id}
            product={product}
            index={idx}
            onBuy={onBuy}
          />
        ))}
      </div>
    </motion.div>
  );
}