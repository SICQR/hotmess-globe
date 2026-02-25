import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ShoppingBag, Star, Package, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductCard from '../marketplace/ProductCard';
import { isXpPurchasingEnabled } from '@/lib/featureFlags';

const getUserPhotoUrls = (user) => {
  const urls = [];
  const push = (value) => {
    const url = typeof value === 'string' ? value.trim() : '';
    if (!url) return;
    if (urls.includes(url)) return;
    urls.push(url);
  };

  push(user?.avatar_url);
  push(user?.avatarUrl);

  const photos = Array.isArray(user?.photos) ? user.photos : [];
  for (const item of photos) {
    if (!item) continue;
    if (typeof item === 'string') push(item);
    else if (typeof item === 'object') push(item.url || item.file_url || item.href);
  }

  const more = Array.isArray(user?.photo_urls) ? user.photo_urls : [];
  for (const u of more) push(u);

  const images = Array.isArray(user?.images) ? user.images : [];
  for (const img of images) {
    if (!img) continue;
    if (typeof img === 'string') push(img);
    else if (typeof img === 'object') push(img.url || img.src || img.file_url || img.href);
  }

  return urls.slice(0, 5);
};

const isPremiumPhoto = (user, idx) => {
  const photos = Array.isArray(user?.photos) ? user.photos : [];
  const p = photos[idx];
  if (!p || typeof p !== 'object') return false;
  return !!(p.is_premium || p.isPremium || p.premium);
};

export default function SellerProfileView({ user }) {
  const xpPurchasingEnabled = isXpPurchasingEnabled();

  const photoUrls = getUserPhotoUrls(user);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = React.useState(0);
  const [previewPhotoIndex, setPreviewPhotoIndex] = React.useState(null);
  const activePhotoIndex = previewPhotoIndex === null ? selectedPhotoIndex : previewPhotoIndex;
  const activeUrl = photoUrls[activePhotoIndex] || null;
  const activeIsPremium = isPremiumPhoto(user, activePhotoIndex);
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(String(user?.full_name || 'User'))}&size=512&background=111111&color=ffffff`;
  const mainUrl = activeUrl || fallbackAvatar;

  const { data: products = [] } = useQuery({
    queryKey: ['seller-products', user.email],
    queryFn: () => base44.entities.Product.filter({ seller_email: user.email, status: 'active' }),
    enabled: xpPurchasingEnabled && !!user?.email,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['seller-reviews', user.email],
    queryFn: async () => {
      // Get all reviews for this seller's products
      const sellerProducts = await base44.entities.Product.filter({ seller_email: user.email });
      const productIds = sellerProducts.map((p) => p.id);
      const allReviews = await base44.entities.Review.list();
      return allReviews.filter((r) => productIds.includes(r.product_id));
    },
    enabled: xpPurchasingEnabled && !!user?.email,
  });

  return (
    <div className="space-y-6">
      {/* Photos (seller profiles should still have the same detail-gallery UX) */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4">Photos</h3>

        <div className="relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-black/30">
          {activeIsPremium ? (
            <div className="w-full h-full bg-gradient-to-br from-[#FFD700]/15 to-[#C8962C]/15 border border-[#FFD700]/40 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl mb-2">🔒</div>
                <div className="text-xs text-[#FFD700] font-black uppercase">Premium</div>
              </div>
            </div>
          ) : (
            <img src={mainUrl} alt="Profile photo" className="w-full h-full object-cover" />
          )}
        </div>

        <div className="mt-3 grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, slotIdx) => {
            const photoIdx = slotIdx + 1;
            const url = photoUrls[photoIdx] || null;
            const premium = isPremiumPhoto(user, photoIdx);

            return (
              <button
                key={photoIdx}
                type="button"
                className="relative aspect-square overflow-hidden rounded-md border border-white/10 bg-black/30 hover:border-white/25 transition-colors disabled:opacity-60"
                onMouseEnter={() => setPreviewPhotoIndex(photoIdx)}
                onMouseLeave={() => setPreviewPhotoIndex(null)}
                onFocus={() => setPreviewPhotoIndex(photoIdx)}
                onBlur={() => setPreviewPhotoIndex(null)}
                onClick={() => {
                  if (!url) return;
                  setSelectedPhotoIndex(photoIdx);
                  setPreviewPhotoIndex(null);
                }}
                disabled={!url}
                aria-label={url ? `View photo ${photoIdx + 1}` : `Empty photo slot ${photoIdx + 1}`}
              >
                {premium ? (
                  <div className="w-full h-full bg-gradient-to-br from-[#FFD700]/15 to-[#C8962C]/15 border border-[#FFD700]/40 flex items-center justify-center">
                    <div className="text-xs text-[#FFD700] font-black uppercase">🔒</div>
                  </div>
                ) : url ? (
                  <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-white/10 to-black/30" />
                )}
              </button>
            );
          })}
        </div>
      </div>

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

      {!xpPurchasingEnabled && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/60 mb-2">Shopfront</h3>
          <p className="text-sm text-white/70">Seller listings are coming soon.</p>
          <div className="mt-4">
            <Link to="/market" className="text-xs text-[#00D9FF] hover:text-white uppercase font-bold">
              Browse Market →
            </Link>
          </div>
        </div>
      )}

      {/* Products */}
      {xpPurchasingEnabled && products.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black uppercase">Products</h3>
            <Link 
              to="/market"
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
      {xpPurchasingEnabled && reviews.length > 0 && (
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