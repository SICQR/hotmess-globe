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

export default function ProductDetail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const productId = searchParams.get('id');
  const [currentUser, setCurrentUser] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const products = await base44.entities.Product.list();
      return products.find(p => p.id === productId);
    },
    enabled: !!productId,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: () => base44.entities.Review.filter({ product_id: productId }, '-created_date'),
    enabled: !!productId,
  });

  const { data: seller } = useQuery({
    queryKey: ['seller', product?.seller_email],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.find(u => u.email === product.seller_email);
    },
    enabled: !!product?.seller_email,
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      // Create order
      const order = await base44.entities.Order.create({
        buyer_email: currentUser.email,
        seller_email: product.seller_email,
        total_xp: product.price_xp,
        status: 'pending',
        payment_method: 'xp',
      });

      // Create order item
      await base44.entities.OrderItem.create({
        order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        price_xp: product.price_xp,
      });

      // Deduct XP from buyer
      const newXp = (currentUser.xp || 0) - product.price_xp;
      await base44.auth.updateMe({ xp: newXp });

      // Update product sales count and inventory
      await base44.entities.Product.update(product.id, {
        sales_count: (product.sales_count || 0) + 1,
        inventory_count: Math.max(0, (product.inventory_count || 0) - 1),
      });

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['product']);
      toast.success('Purchase successful!');
      navigate(createPageUrl('OrderHistory'));
    },
    onError: () => {
      toast.error('Purchase failed');
    },
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
        console.error('Failed to track view:', error);
      }
    };

    trackView();
  }, [product?.id, currentUser?.email]);

  const handlePurchase = () => {
    if (!currentUser) {
      toast.error('Please log in to purchase');
      return;
    }

    if ((currentUser.xp || 0) < product.price_xp) {
      toast.error('Insufficient XP');
      return;
    }

    if (product.min_xp_level && (currentUser.xp || 0) < product.min_xp_level) {
      toast.error(`Requires Level ${Math.floor(product.min_xp_level / 1000) + 1}+`);
      return;
    }

    purchaseMutation.mutate();
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
  const canAfford = currentUser && (currentUser.xp || 0) >= product.price_xp;
  const meetsLevel = !product.min_xp_level || (currentUser && (currentUser.xp || 0) >= product.min_xp_level);

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
                <img src={product.image_urls[0]} alt={product.name} className="w-full h-full object-cover" />
              </motion.div>
            ) : (
              <div className="aspect-square bg-white/5 rounded-xl flex items-center justify-center">
                <Package className="w-24 h-24 text-white/20" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Badge className="mb-2 uppercase">{product.product_type}</Badge>
                  <h1 className="text-4xl font-black mb-2">{product.name}</h1>
                  {product.category && (
                    <p className="text-white/40 uppercase text-sm tracking-wider">{product.category}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black text-[#FFEB3B]">
                    {product.price_xp.toLocaleString()} XP
                  </div>
                  {product.min_xp_level && (
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
                disabled={isOutOfStock || !canAfford || !meetsLevel || purchaseMutation.isPending}
                className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-bold text-lg py-6"
              >
                {isOutOfStock ? 'Sold Out' : !canAfford ? 'Insufficient XP' : !meetsLevel ? 'Level Locked' : 'Buy Now'}
              </Button>

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
                  <div className="flex items-start justify-between mb-3">
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
                    <p className="text-xs text-white/40">
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