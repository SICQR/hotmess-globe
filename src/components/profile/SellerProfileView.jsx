import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ShoppingBag, Star, Package, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ProductCard from '../marketplace/ProductCard';

export default function SellerProfileView({ user }) {
  const { data: products = [] } = useQuery({
    queryKey: ['seller-products', user.email],
    queryFn: () => base44.entities.Product.filter({ seller_email: user.email, status: 'active' })
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['seller-reviews', user.email],
    queryFn: async () => {
      // Get all reviews for this seller's products
      const sellerProducts = await base44.entities.Product.filter({ seller_email: user.email });
      const productIds = sellerProducts.map(p => p.id);
      const allReviews = await base44.entities.Review.list();
      return allReviews.filter(r => productIds.includes(r.product_id));
    }
  });

  return (
    <div className="space-y-6">
      {/* Seller Bio */}
      {user?.seller_bio && (
        <div className="bg-white/5 border border-[#00D9FF]/20 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-[#00D9FF] mb-3 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            About This Shop
          </h3>
          <p className="text-white/80 leading-relaxed whitespace-pre-wrap">{user.seller_bio}</p>
        </div>
      )}

      {/* Shop Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Package className="w-6 h-6 mx-auto mb-2 text-[#00D9FF]" />
          <div className="text-2xl font-black">{products.length}</div>
          <div className="text-xs text-white/40 uppercase">Products</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-[#39FF14]" />
          <div className="text-2xl font-black">{user?.total_sales || 0}</div>
          <div className="text-xs text-white/40 uppercase">Sales</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Star className="w-6 h-6 mx-auto mb-2 text-[#FFEB3B]" />
          <div className="text-2xl font-black">{user?.seller_rating?.toFixed(1) || 'New'}</div>
          <div className="text-xs text-white/40 uppercase">Rating</div>
        </div>
      </div>

      {/* Products */}
      {products.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black uppercase">Products</h3>
            <Link 
              to={createPageUrl(`Marketplace?seller=${user.email}`)}
              className="text-xs text-[#00D9FF] hover:text-white uppercase font-bold"
            >
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.slice(0, 6).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Reviews */}
      {reviews.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4">Recent Reviews</h3>
          <div className="space-y-4">
            {reviews.slice(0, 5).map((review, idx) => (
              <div key={idx} className="border-b border-white/10 pb-4 last:border-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${i < review.rating ? 'fill-[#FFEB3B] text-[#FFEB3B]' : 'text-white/20'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-xs text-white/40">{review.reviewer_name}</span>
                </div>
                {review.comment && (
                  <p className="text-sm text-white/70">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}