import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sparkles } from 'lucide-react';
import ProductCard from './ProductCard';
import logger from '@/utils/logger';

export default function ComplementaryProducts({ product, onBuy }) {
  const [complementary, setComplementary] = useState([]);
  const [loading, setLoading] = useState(true);

  const { data: allProducts = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.filter({ status: 'active' }),
  });

  useEffect(() => {
    if (!product || allProducts.length === 0) {
      setLoading(false);
      return;
    }

    generateComplementary();
  }, [product, allProducts]);

  const generateComplementary = async () => {
    setLoading(true);
    try {
      const availableProducts = allProducts.filter(p => 
        p.id !== product.id &&
        (p.inventory_count === undefined || p.inventory_count > 0)
      );

      if (availableProducts.length === 0) {
        setComplementary([]);
        setLoading(false);
        return;
      }

      const invokeLLM = base44?.integrations?.Core?.InvokeLLM;
      if (typeof invokeLLM !== 'function') {
        const fallback = availableProducts
          .filter((p) => (product?.category ? p.category === product.category : true))
          .slice(0, 4);
        setComplementary(fallback);
        return;
      }

      const prompt = `You are recommending complementary products for HOTMESS LONDON marketplace.

Current Product:
- Name: ${product.name}
- Type: ${product.product_type}
- Category: ${product.category || 'N/A'}
- Description: ${product.description || 'N/A'}
- Tags: ${(product.tags || []).join(', ')}
- Price: £${product.price_gbp || 0}

Available Products to recommend:
${availableProducts.slice(0, 30).map(p => `ID: ${p.id}, Name: ${p.name}, Type: ${p.product_type}, Category: ${p.category || 'N/A'}, Tags: ${(p.tags || []).join(', ')}, Price: £${p.price_gbp || 0}`).join('\n')}

Recommend 4 complementary product IDs that would pair well with the current product. Consider:
1. Items that complete an outfit/experience
2. Similar style/aesthetic
3. Compatible categories
4. Price range makes sense together

Return ONLY a JSON array of product IDs, like: ["id1", "id2", "id3", "id4"]`;

      const response = await invokeLLM({
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

      const complementaryIds = response.product_ids || [];
      const complementaryProducts = availableProducts.filter(p => complementaryIds.includes(p.id)).slice(0, 4);

      setComplementary(complementaryProducts);
    } catch (error) {
      logger.warn('Failed to generate complementary products; using fallback', {
        error: error?.message,
      });
      const fallback = allProducts
        .filter((p) => p.id !== product.id)
        .filter((p) => (product?.category ? p.category === product.category : true))
        .slice(0, 4);
      setComplementary(fallback);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-12">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-[#00D9FF] animate-pulse" />
          <h2 className="text-2xl font-black uppercase">You Might Also Like</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl h-80 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (complementary.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-12"
    >
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-[#00D9FF]" />
        <h2 className="text-2xl font-black uppercase">You Might Also Like</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {complementary.map((product, idx) => (
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