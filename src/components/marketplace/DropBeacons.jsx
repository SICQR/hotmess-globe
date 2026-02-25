import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Clock, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function DropBeacons() {
  const [selectedDrop, setSelectedDrop] = useState(null);

  const { data: drops = [] } = useQuery({
    queryKey: ['drop-beacons'],
    queryFn: async () => {
      // Get beacons with mode=drop that are currently active
      const beacons = await base44.entities.Beacon.filter({ mode: 'drop', active: true });
      
      // Get products associated with these drop beacons
      const products = await base44.entities.Product.list();
      
      return beacons.map(beacon => {
        const dropProducts = products.filter(p => 
          p.details?.drop_beacon_id === beacon.id && 
          p.status === 'active'
        );
        
        return {
          ...beacon,
          products: dropProducts,
          expires_at: beacon.details?.expires_at,
          is_live: beacon.details?.is_live
        };
      }).filter(drop => drop.products.length > 0);
    },
    refetchInterval: 30000 // Check every 30 seconds
  });

  // Auto-dismiss expired drops
  useEffect(() => {
    const timer = setInterval(() => {
      drops.forEach(drop => {
        if (drop.expires_at && new Date(drop.expires_at) < new Date()) {
          // Mark as inactive (authenticated-only)
          base44.auth
            .isAuthenticated()
            .then((isAuth) => {
              if (!isAuth) return;
              base44.entities.Beacon.update(drop.id, { active: false });
            })
            .catch(() => {
              // ignore
            });
        }
      });
    }, 60000); // Check every minute
    
    return () => clearInterval(timer);
  }, [drops]);

  if (drops.length === 0) return null;

  return (
    <>
      {/* Floating Drop Indicator on Globe */}
      {drops.map(drop => (
        <div
          key={drop.id}
          className="fixed z-[100]"
          style={{
            // Position based on beacon coordinates (simplified)
            left: '50%',
            top: '30%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <motion.button
            onClick={() => setSelectedDrop(drop)}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            className="relative"
          >
            <div className="w-16 h-16 bg-[#C8962C] rounded-full flex items-center justify-center shadow-2xl">
              <Clock className="w-8 h-8 text-black" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">{drop.products.length}</span>
            </div>
          </motion.button>
        </div>
      ))}

      {/* Drop Modal */}
      <AnimatePresence>
        {selectedDrop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-lg p-6"
            onClick={() => setSelectedDrop(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-black border-2 border-[#C8962C] rounded-2xl max-w-2xl w-full overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#C8962C] to-[#B026FF] p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-8 h-8 text-black" />
                  <h2 className="text-3xl font-black italic text-black uppercase">LIVE DROP</h2>
                </div>
                <p className="text-black/80 font-bold uppercase tracking-wider">{selectedDrop.title}</p>
                {selectedDrop.expires_at && (
                  <div className="flex items-center gap-2 mt-3 text-black">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-bold">
                      Expires: {new Date(selectedDrop.expires_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Products */}
              <div className="p-6 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedDrop.products.map(product => (
                    <Link
                      key={product.id}
                      to={createPageUrl(`ProductDetail?id=${product.id}`)}
                      onClick={() => setSelectedDrop(null)}
                    >
                      <div className="bg-white/5 border-2 border-white/10 rounded-xl overflow-hidden hover:border-[#C8962C] transition-all">
                        {product.image_urls?.[0] && (
                          <img src={product.image_urls[0]} alt={product.name} className="w-full h-32 object-cover" />
                        )}
                        <div className="p-4">
                          <h3 className="font-black text-lg mb-2 text-white">{product.name}</h3>
                          <div className="flex items-center justify-between">
                            <span className="text-[#C8962C] font-bold">£{product.price_gbp || 0}</span>
                            <span className="text-xs text-white/60">{product.inventory_count} left</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Location */}
              {selectedDrop.city && (
                <div className="border-t border-white/10 p-4 flex items-center gap-2 text-white/60">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{selectedDrop.city}</span>
                </div>
              )}

              {/* Close Button */}
              <div className="p-4 border-t border-white/10">
                <button
                  onClick={() => setSelectedDrop(null)}
                  className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-bold uppercase transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}