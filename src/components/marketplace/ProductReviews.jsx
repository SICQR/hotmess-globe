/**
 * ProductReviews — Star ratings and review text for preloved products
 *
 * Queries `product_reviews` table (graceful empty state if table doesn't exist).
 * Shows write-review modal for buyers who have completed orders.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MessageSquare, Loader2, X } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { humanizeError } from '@/lib/errorUtils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

function StarRating({ rating, size = 'sm', interactive = false, onChange }) {
  const sizes = { sm: 'w-3.5 h-3.5', md: 'w-5 h-5', lg: 'w-7 h-7' };
  const cls = sizes[size] || sizes.sm;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(i)}
          className={interactive ? 'cursor-pointer active:scale-110 transition-transform' : 'cursor-default'}
        >
          <Star
            className={`${cls} ${i <= rating ? 'fill-[#C8962C] text-[#C8962C]' : 'text-white/15'} transition-colors`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1C1C1E] rounded-xl border border-white/[0.06] p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
          {review.reviewer_avatar ? (
            <img src={review.reviewer_avatar} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-white/40 text-xs font-bold">
              {(review.reviewer_name || 'A').charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-white font-bold text-sm truncate">{review.reviewer_name || 'Anonymous'}</p>
            <p className="text-white/30 text-[10px] flex-shrink-0">
              {review.created_at && formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
            </p>
          </div>
          <div className="mt-1">
            <StarRating rating={review.rating} />
          </div>
          {review.text && (
            <p className="text-white/60 text-sm mt-2 leading-relaxed">{review.text}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function ProductReviews({ productId }) {
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newText, setNewText] = useState('');
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from('product_reviews')
        .select('id, rating, text, reviewer_name, reviewer_avatar, created_at')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) {
        // Table might not exist — graceful empty
        console.warn('[reviews] query error:', error.message);
        return [];
      }
      return data || [];
    },
    enabled: !!productId,
  });

  // Check if current user has a completed order for this product (can review)
  const { data: canReview = false } = useQuery({
    queryKey: ['can-review', productId],
    queryFn: async () => {
      if (!productId) return false;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return false;
      // Check for completed/delivered order containing this product
      const { data: orders } = await supabase
        .from('orders')
        .select('id, items')
        .eq('buyer_id', session.user.id)
        .in('status', ['delivered', 'completed'])
        .limit(50);
      if (!orders?.length) return false;
      return orders.some(o => {
        const items = Array.isArray(o.items) ? o.items : [];
        return items.some(i => i.id === productId);
      });
    },
    enabled: !!productId,
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      if (newRating === 0) throw new Error('Select a rating');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Please log in');
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', session.user.id)
        .single();

      const { error } = await supabase.from('product_reviews').insert({
        product_id: productId,
        reviewer_id: session.user.id,
        reviewer_name: profile?.display_name || 'Anonymous',
        reviewer_avatar: profile?.avatar_url || null,
        rating: newRating,
        text: newText.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['product-reviews', productId]);
      setShowWriteModal(false);
      setNewRating(0);
      setNewText('');
      toast.success('Review submitted');
    },
    onError: (err) => {
      toast.error(humanizeError(err, 'Could not submit review'));
    },
  });

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
    : 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs uppercase tracking-widest text-white/30 font-black">Reviews</p>
          {reviews.length > 0 && (
            <span className="px-1.5 py-0.5 bg-[#C8962C]/15 text-[#C8962C] text-[10px] font-black rounded-full">
              {reviews.length}
            </span>
          )}
        </div>
        {reviews.length > 0 && (
          <div className="flex items-center gap-1.5">
            <StarRating rating={Math.round(avgRating)} />
            <span className="text-white/50 text-xs font-bold">{avgRating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="bg-[#C8962C]/10 animate-pulse rounded-xl h-20" />
      ) : reviews.length === 0 ? (
        <div className="bg-[#1C1C1E] rounded-xl border border-white/[0.06] p-6 text-center">
          <MessageSquare className="w-8 h-8 text-[#C8962C]/30 mx-auto mb-2" />
          <p className="text-white/40 text-sm font-bold">No reviews yet</p>
          <p className="text-white/20 text-xs mt-1">Be the first to leave a review</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reviews.map(r => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}

      {/* Write review button */}
      {canReview && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowWriteModal(true)}
          className="w-full py-3 rounded-xl border-2 border-dashed border-[#C8962C]/30 text-[#C8962C] font-bold text-sm hover:border-[#C8962C]/60 transition-colors"
        >
          Write a Review
        </motion.button>
      )}

      {/* Write review modal */}
      <AnimatePresence>
        {showWriteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowWriteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#1C1C1E] rounded-2xl p-6 mx-6 max-w-sm w-full border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-black text-lg">Write a Review</h3>
                <button onClick={() => setShowWriteModal(false)} className="text-white/40 hover:text-white/60">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex justify-center mb-4">
                <StarRating rating={newRating} size="lg" interactive onChange={setNewRating} />
              </div>

              <textarea
                value={newText}
                onChange={e => setNewText(e.target.value)}
                placeholder="Tell others about this item..."
                rows={3}
                maxLength={500}
                className="w-full bg-[#050507] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm resize-none focus:outline-none focus:border-[#C8962C]/60 transition-colors"
              />
              <p className="text-white/20 text-[10px] text-right mt-1">{newText.length}/500</p>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => submitReview.mutate()}
                disabled={newRating === 0 || submitReview.isPending}
                className="w-full mt-3 bg-[#C8962C] text-black font-black text-sm rounded-xl py-3 disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
              >
                {submitReview.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Submit Review'
                )}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
