import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function InventoryAlerts({ sellerEmail }) {
  const { data: products = [] } = useQuery({
    queryKey: ['seller-products', sellerEmail],
    queryFn: () => base44.entities.Product.filter({ seller_email: sellerEmail, status: 'active' }),
    enabled: !!sellerEmail,
    refetchInterval: 60000 // Check every minute
  });

  const lowStockProducts = products.filter(p => 
    p.inventory_count !== undefined && 
    p.inventory_count <= 5 && 
    p.inventory_count > 0
  );

  const outOfStockProducts = products.filter(p => 
    p.inventory_count !== undefined && 
    p.inventory_count === 0
  );

  // Show toast notifications for critical stock levels
  useEffect(() => {
    if (outOfStockProducts.length > 0) {
      toast.error(`${outOfStockProducts.length} product(s) out of stock`, {
        description: 'Update inventory to continue selling',
        duration: 10000
      });
    }
  }, [outOfStockProducts.length]);

  if (lowStockProducts.length === 0 && outOfStockProducts.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-3 mb-6"
      >
        {/* Out of Stock Alert */}
        {outOfStockProducts.length > 0 && (
          <div className="bg-red-600/20 border-2 border-red-600 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <div>
                <h3 className="font-black uppercase text-red-500">Out of Stock</h3>
                <p className="text-xs text-white/60">{outOfStockProducts.length} product(s) unavailable</p>
              </div>
            </div>
            <div className="space-y-2">
              {outOfStockProducts.slice(0, 3).map(product => (
                <div key={product.id} className="flex items-center justify-between bg-black/40 p-3 rounded">
                  <span className="text-sm font-bold">{product.name}</span>
                  <span className="text-xs px-2 py-1 bg-red-600 text-white rounded">0 LEFT</span>
                </div>
              ))}
              {outOfStockProducts.length > 3 && (
                <p className="text-xs text-white/40 text-center">+{outOfStockProducts.length - 3} more</p>
              )}
            </div>
          </div>
        )}

        {/* Low Stock Warning */}
        {lowStockProducts.length > 0 && (
          <div className="bg-[#FFEB3B]/20 border-2 border-[#FFEB3B] rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Package className="w-6 h-6 text-[#FFEB3B]" />
              <div>
                <h3 className="font-black uppercase text-[#FFEB3B]">Low Stock Alert</h3>
                <p className="text-xs text-white/60">{lowStockProducts.length} product(s) running low</p>
              </div>
            </div>
            <div className="space-y-2">
              {lowStockProducts.slice(0, 3).map(product => (
                <div key={product.id} className="flex items-center justify-between bg-black/40 p-3 rounded">
                  <span className="text-sm font-bold">{product.name}</span>
                  <span className="text-xs px-2 py-1 bg-[#FFEB3B] text-black rounded font-bold">
                    {product.inventory_count} LEFT
                  </span>
                </div>
              ))}
              {lowStockProducts.length > 3 && (
                <p className="text-xs text-white/40 text-center">+{lowStockProducts.length - 3} more</p>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}