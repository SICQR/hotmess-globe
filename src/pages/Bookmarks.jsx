import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bookmark, MapPin, Calendar, ShoppingBag, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import logger from '@/utils/logger';

export default function Bookmarks() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('beacons');
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          base44.auth.redirectToLogin();
          return;
        }
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        logger.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const { data: beaconBookmarks = [] } = useQuery({
    queryKey: ['beacon-bookmarks', user?.email],
    queryFn: () => base44.entities.BeaconBookmark.filter({ user_email: user.email }),
    enabled: !!user
  });

  const { data: productFavorites = [] } = useQuery({
    queryKey: ['product-favorites', user?.email],
    queryFn: () => base44.entities.ProductFavorite.filter({ user_email: user.email }),
    enabled: !!user
  });

  const { data: beacons = [] } = useQuery({
    queryKey: ['beacons'],
    queryFn: () => base44.entities.Beacon.list()
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const bookmarkedBeacons = beacons
    .filter(b => beaconBookmarks.some(bm => bm.beacon_id === b.id))
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.created_date) - new Date(a.created_date);
      if (sortBy === 'event_date') return new Date(a.event_date || 0) - new Date(b.event_date || 0);
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      return 0;
    });

  const favoritedProducts = products
    .filter(p => productFavorites.some(pf => pf.product_id === p.id))
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.created_date) - new Date(a.created_date);
      if (sortBy === 'price') return a.price_xp - b.price_xp;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Bookmark className="w-8 h-8 text-[#FFEB3B]" />
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Bookmarks</h1>
              <p className="text-white/60">
                {activeTab === 'beacons' && `${bookmarkedBeacons.length} saved events`}
                {activeTab === 'products' && `${favoritedProducts.length} saved products`}
              </p>
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-white/40" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 bg-white/5 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Latest</SelectItem>
                {activeTab === 'beacons' && <SelectItem value="event_date">Event Date</SelectItem>}
                {activeTab === 'products' && <SelectItem value="price">Price</SelectItem>}
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('beacons')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-black uppercase text-sm transition-all ${
              activeTab === 'beacons'
                ? 'bg-[#FF1493] text-black'
                : 'bg-white/5 text-white hover:bg-white/10'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Events ({bookmarkedBeacons.length})
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-black uppercase text-sm transition-all ${
              activeTab === 'products'
                ? 'bg-[#FF1493] text-black'
                : 'bg-white/5 text-white hover:bg-white/10'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Products ({favoritedProducts.length})
          </button>
        </div>

        {/* Beacons Tab */}
        {activeTab === 'beacons' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookmarkedBeacons.map((beacon, idx) => (
              <Link key={beacon.id} to={createPageUrl(`BeaconDetail?id=${beacon.id}`)}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white/5 border-2 border-white/10 rounded-xl p-5 hover:border-[#FF1493] hover:bg-white/10 transition-all"
                >
                  {beacon.image_url && (
                    <img src={beacon.image_url} alt={beacon.title} className="w-full h-32 object-cover rounded-lg mb-3" />
                  )}
                  <h3 className="font-black text-lg mb-2">{beacon.title}</h3>
                  {beacon.event_date && (
                    <div className="flex items-center gap-2 text-sm text-[#FFEB3B] mb-2">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(beacon.event_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <MapPin className="w-4 h-4" />
                    <span>{beacon.city}</span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoritedProducts.map((product, idx) => (
              <Link key={product.id} to={createPageUrl(`ProductDetail?id=${product.id}`)}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white/5 border-2 border-white/10 rounded-xl overflow-hidden hover:border-[#39FF14] hover:bg-white/10 transition-all"
                >
                  {product.image_urls?.[0] && (
                    <img src={product.image_urls[0]} alt={product.name} className="w-full h-48 object-cover" />
                  )}
                  <div className="p-4">
                    <h3 className="font-black text-lg mb-2">{product.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[#39FF14] font-bold">{product.price_xp} XP</span>
                      {product.price_gbp && (
                        <>
                          <span className="text-white/40">•</span>
                          <span className="text-white/60">£{product.price_gbp}</span>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty States */}
        {activeTab === 'beacons' && bookmarkedBeacons.length === 0 && (
          <div className="text-center py-20">
            <MapPin className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-2xl font-black text-white/40 uppercase mb-2">No saved events</p>
            <p className="text-white/60">Bookmark events to see them here</p>
          </div>
        )}

        {activeTab === 'products' && favoritedProducts.length === 0 && (
          <div className="text-center py-20">
            <ShoppingBag className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-2xl font-black text-white/40 uppercase mb-2">No saved products</p>
            <p className="text-white/60">Favorite products to see them here</p>
          </div>
        )}
      </div>
    </div>
  );
}