import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { ArrowLeft, Star, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import MessageButton from '../components/social/MessageButton';
import ComplementaryProducts from '../components/marketplace/ComplementaryProducts';
import { isXpPurchasingEnabled } from '@/lib/featureFlags';
import logger from '@/utils/logger';

export default function ProductDetail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const productId = searchParams.get('id');
  const productHandle = searchParams.get('handle');
  const productLookup = productId || productHandle;
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const queryClient = useQueryClient();
  const xpPurchasingEnabled = isXpPurchasingEnabled();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        logger.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productLookup],
    queryFn: async () => {
      const key = String(productLookup ?? '').trim();
      if (!key) return null;

      const products = await base44.entities.Product.list();
      if (!Array.isArray(products)) return null;

      // 1) Canonical: UUID
      const byId = products.find((p) => p?.id === key);
      if (byId) return byId;

      const normalized = key.toLowerCase();

      // 2) Shopify handle stored in details
      const byHandle = products.find((p) => String(p?.details?.shopify_handle ?? '').toLowerCase() === normalized);
      if (byHandle) return byHandle;

      // 3) Tag fallback
      const byTag = products.find((p) => Array.isArray(p?.tags) && p.tags.map((t) => String(t).toLowerCase()).includes(normalized));
      if (byTag) return byTag;

      // 4) Name fallback (last resort)
      const byName = products.find((p) => String(p?.name ?? '').toLowerCase().includes(normalized));
      if (byName) return byName;

      return null;
    },
    enabled: !!productLookup,
  });

  const resolvedProductId = product?.id || null;

  const normalizedDetails = React.useMemo(() => {
    const raw = product?.details;
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    }
    return {};
  }, [product?.details]);

  const shopifyVariants = React.useMemo(() => {
    const variants = normalizedDetails?.shopify_variants;
    return Array.isArray(variants)
      ? variants
          .map((v) => ({
            id: String(v?.id || '').trim(),
            title: String(v?.title || '').trim() || 'Default',
          }))
          .filter((v) => v.id)
      : [];
  }, [normalizedDetails]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [resolvedProductId]);

  useEffect(() => {
    if (!product) return;
    const defaultVariantId = normalizedDetails?.shopify_variant_id ? String(normalizedDetails.shopify_variant_id).trim() : null;
    const firstVariantId = shopifyVariants?.[0]?.id || null;
    setSelectedVariantId(defaultVariantId || firstVariantId);
  }, [product?.id, normalizedDetails, shopifyVariants]);

  const { data: reviews = [] } = useQuery({
    queryKey: ['product-reviews', resolvedProductId],
    queryFn: () => base44.entities.Review.filter({ product_id: resolvedProductId }, '-created_date'),
    enabled: !!resolvedProductId,
  });

  const { data: seller } = useQuery({
    queryKey: ['seller', product?.seller_email],
    queryFn: async () => {
      const email = String(product?.seller_email || '').trim().toLowerCase();
      if (!email) return null;

      const users = await base44.entities.User.list();
      if (!Array.isArray(users)) return null;

      return users.find((u) => String(u?.email || '').trim().toLowerCase() === email) || null;
    },
    enabled: !!product?.seller_email,
  });


  const reviewMutation = useMutation({
    mutationFn: (data) => base44.entities.Review.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['product-reviews']);
      setReviewText('');
      setReviewRating(5);
      toast.success('Review submitted!');
    },
  });

  // Track product view
  useEffect(() => {
    if (!product || !currentUser) return;

    const trackView = async () => {
      try {
        await base44.entities.ProductView.create({
          user_email: currentUser.email,
          product_id: product.id,
          product_name: product.name,
          product_category: product.category,
          product_tags: product.tags || [],
        });
      } catch (error) {
        logger.error('Failed to track view:', error);
      }
    };

    trackView();
  }, [product?.id, currentUser?.email]);

  const handlePurchase = () => {
    const isShopifyProduct =
      String(product?.seller_email || '').toLowerCase() === 'shopify@hotmess.london' &&
      !!(normalizedDetails?.shopify_variant_id || shopifyVariants?.[0]?.id);

    if (isShopifyProduct) {
      const handle = String(normalizedDetails?.shopify_handle || '').trim();
      if (!handle) {
        toast.error('This product is not available in the shop yet.');
        return;
      }
      navigate(`/market/p/${encodeURIComponent(handle)}`);
      return;
    }

    if (!xpPurchasingEnabled) {
      toast.message('XP purchasing is coming soon.');
      return;
    }

    toast.message('XP purchasing is not available yet.');
  };

  const handleReview = () => {
    if (!reviewText.trim()) return;

    reviewMutation.mutate({
      product_id: product.id,
      reviewer_email: currentUser.email,
      seller_email: product.seller_email,
      rating: reviewRating,
      comment: reviewText,
    });
  };

  if (isLoading || !product) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-white/40 mx-auto mb-4 animate-pulse" />
          <p className="text-white/60">Loading product...</p>
        </div>
      </div>
    );
  }

  const isOutOfStock = product.status === 'sold_out' || (product.inventory_count !== undefined && product.inventory_count <= 0);
  const isShopifyProduct =
    String(product?.seller_email || '').toLowerCase() === 'shopify@hotmess.london' &&
    !!(normalizedDetails?.shopify_variant_id || shopifyVariants?.[0]?.id);
  const canAfford = isShopifyProduct ? true : true;
  const meetsLevel = isShopifyProduct ? true : true;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Button onClick={() => navigate(-1)} variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Images */}
          <div className="space-y-4">
            {product.image_urls && product.image_urls.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="aspect-square rounded-xl overflow-hidden"
              >
                <img
                  src={product.image_urls[Math.min(selectedImageIndex, product.image_urls.length - 1)]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            ) : (
              <div className="aspect-square bg-white/5 rounded-xl flex items-center justify-center">
                <Package className="w-24 h-24 text-white/20" />
              </div>
            )}

            {product.image_urls && product.image_urls.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {product.image_urls.map((url, idx) => (
                  <button
                    key={`${url}-${idx}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      idx === selectedImageIndex ? 'border-white' : 'border-white/20 hover:border-white/50'
                    }`}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div>
                  <Badge className="mb-2 uppercase">{product.product_type}</Badge>
                  <h1 className="text-4xl font-black mb-2 break-words">{product.name}</h1>
                  {product.category && (
                    <p className="text-white/40 uppercase text-sm tracking-wider">{product.category}</p>
                  )}
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-4xl font-black text-[#FFEB3B]">
                    {product.price_xp.toLocaleString()} XP
                  </div>
                  {!isShopifyProduct && product.min_xp_level && (
                    <p className="text-xs text-white/40 mt-1">
                      Requires Level {Math.floor(product.min_xp_level / 1000) + 1}+
                    </p>
                  )}
                </div>
              </div>

              {product.average_rating && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= Math.round(product.average_rating)
                            ? 'fill-[#FFEB3B] text-[#FFEB3B]'
                            : 'text-white/20'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-white/60">
                    {product.average_rating.toFixed(1)} ({reviews.length} reviews)
                  </span>
                </div>
              )}

              <p className="text-white/80 leading-relaxed mb-6">{product.description}</p>

              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {product.tags.map(tag => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              )}

              {product.inventory_count !== undefined && (
                <p className="text-sm text-white/40 mb-4">
                  {product.inventory_count} in stock
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Button
                onClick={handlePurchase}
                disabled={isShopifyProduct ? false : !xpPurchasingEnabled}
                className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-bold text-lg py-6"
              >
                {isShopifyProduct ? 'View product' : 'XP purchasing coming soon'}
              </Button>

              {!isShopifyProduct ? (
                <p className="text-xs text-white/50 uppercase tracking-wider">
                  You can browse drops now. Buying with XP is next.
                </p>
              ) : null}

              {seller && (
                <div className="space-y-2">
                  <Link to={createPageUrl(`Profile?email=${seller.email}`)}>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center">
                          <span className="font-bold">{seller.full_name?.[0] || 'S'}</span>
                        </div>
                        <div>
                          <p className="text-sm text-white/40 uppercase tracking-wider">Seller</p>
                          <p className="font-bold">{seller.full_name}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                  {currentUser && currentUser.email !== seller.email && (
                    <MessageButton
                      targetUser={seller}
                      currentUser={currentUser}
                      threadType="order"
                      metadata={{ product_id: product.id }}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reviews */}
        <Tabs defaultValue="reviews">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="reviews" className="mt-6">
            {currentUser && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                <h3 className="font-bold mb-4">Write a Review</h3>
                <div className="flex gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="transition-colors"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= reviewRating ? 'fill-[#FFEB3B] text-[#FFEB3B]' : 'text-white/20'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <Textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your thoughts..."
                  rows={4}
                  className="mb-4"
                />
                <Button onClick={handleReview} disabled={!reviewText.trim()}>
                  Submit Review
                </Button>
              </div>
            )}

            <div className="space-y-4">
              {reviews.map((review, idx) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                    <div>
                      <p className="font-bold">{review.reviewer_email}</p>
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating ? 'fill-[#FFEB3B] text-[#FFEB3B]' : 'text-white/20'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-white/40 sm:text-right">
                      {format(new Date(review.created_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <p className="text-white/80">{review.comment}</p>
                </motion.div>
              ))}

              {reviews.length === 0 && (
                <div className="text-center py-12">
                  <Star className="w-12 h-12 text-white/20 mx-auto mb-2" />
                  <p className="text-white/40">No reviews yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="details" className="mt-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-white/40 text-sm uppercase tracking-wider mb-1">Product Type</p>
                  <p className="font-bold">{product.product_type}</p>
                </div>
                {product.category && (
                  <div>
                    <p className="text-white/40 text-sm uppercase tracking-wider mb-1">Category</p>
                    <p className="font-bold">{product.category}</p>
                  </div>
                )}
                <div>
                  <p className="text-white/40 text-sm uppercase tracking-wider mb-1">Created</p>
                  <p className="font-bold">{format(new Date(product.created_date), 'MMM d, yyyy')}</p>
                </div>
              </div>
            </div>
          </TabsContent>
          </Tabs>

          <ComplementaryProducts 
          product={product} 
          onBuy={handlePurchase}
          />
          </div>
          </div>
          );
          }