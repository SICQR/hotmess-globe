/**
 * MarketPage — Marketplace / Shop
 * 
 * Category tabs, product cards, unified dark/gold theme.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaTag, FaCheckCircle, FaBolt, FaShoppingCart } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { AppNavBar } from '@/components/nav/AppNavBar';
import PurchaseSheet from '@/components/sheets/PurchaseSheet';

const categories = ['RAW', 'HUNG', 'HIGH', 'LUX', 'PRELOVED'];

const products = [
  {
    id: '1',
    category: 'RAW',
    name: 'Fire Leather Harness',
    price: 185,
    image: '/product-leather-harness.jpg',
    badge: 'LIMITED STOCK',
    hot: true,
  },
  {
    id: '2',
    category: 'RAW',
    name: 'Mesh Tank Top',
    price: 45,
    image: '/product-mesh-tank.jpg',
    badge: null,
    hot: false,
  },
  {
    id: '3',
    category: 'HUNG',
    name: 'Premium Jockstrap',
    price: 35,
    image: '/product-jockstrap.jpg',
    badge: 'BESTSELLER',
    hot: true,
  },
  {
    id: '4',
    category: 'LUX',
    name: 'Gold Chain Collar',
    price: 220,
    image: '/product-collar.jpg',
    badge: 'NEW',
    hot: false,
  },
];

export default function MarketPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('RAW');
  const [showPurchaseSheet, setShowPurchaseSheet] = useState(false);
  const [purchasedProduct, setPurchasedProduct] = useState<string | null>(null);

  const filteredProducts = products.filter((p) => p.category === activeCategory);

  const handleBuy = (productName: string) => {
    setPurchasedProduct(productName);
    setShowPurchaseSheet(true);
  };

  return (
    <div className="min-h-screen bg-dark font-sans text-light flex flex-col pb-20">
      {/* ─────────────────────────────────────────────────────────────────────
          HEADER
      ───────────────────────────────────────────────────────────────────── */}
      <header className="px-4 py-5 flex items-center justify-between border-b border-borderGlow">
        <div className="text-accent font-black text-2xl tracking-wide">MARKET</div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/cart')}
            className="text-gold text-xl hover:text-goldGlow transition-colors relative"
          >
            <FaShoppingCart />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-white text-xs rounded-full flex items-center justify-center">
              2
            </span>
          </button>
          <button className="bg-gold text-dark rounded-full p-2 shadow-gold hover:shadow-[0_0_24px_#FFC94088] transition-shadow">
            <FaPlus />
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────
          CATEGORY TABS
      ───────────────────────────────────────────────────────────────────── */}
      <div className="flex gap-2 px-4 mt-4 mb-4 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-all ${
              activeCategory === cat
                ? 'bg-gold text-dark shadow-gold'
                : 'bg-dark text-gold border border-gold hover:bg-gold/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          PRODUCTS LIST
      ───────────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col gap-4 px-4">
        <AnimatePresence mode="wait">
          {filteredProducts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-muted py-12"
            >
              No products in this category yet.
            </motion.div>
          ) : (
            filteredProducts.map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: idx * 0.08 }}
                className="bg-gray rounded-lg shadow-gold border border-borderGlow p-4"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="relative">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-20 h-20 object-cover rounded-lg border-2 border-gold"
                    />
                    {product.hot && (
                      <span className="absolute -top-2 -right-2 bg-accent text-white text-xs px-1.5 py-0.5 rounded-full">
                        <FaBolt className="inline" />
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-gold font-bold text-sm">{product.category}</div>
                    <div className="text-light font-semibold text-lg">{product.name}</div>
                    <div className="text-muted text-sm mt-1">
                      {product.badge && (
                        <span className="text-accent mr-2">{product.badge}</span>
                      )}
                      £{product.price}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleBuy(product.name)}
                    className="flex-1 bg-gold text-dark font-bold rounded-md px-5 py-2 shadow-gold transition"
                  >
                    Buy Now
                  </motion.button>
                  <button className="flex-1 bg-chatGray border border-gold text-gold rounded-md px-5 py-2 hover:bg-gold/10 transition">
                    Details
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <AppNavBar active="market" />

      {/* Purchase Sheet */}
      <AnimatePresence>
        {showPurchaseSheet && (
          <PurchaseSheet
            onClose={() => setShowPurchaseSheet(false)}
            productName={purchasedProduct || undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
