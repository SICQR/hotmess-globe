import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Star, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const REVIEW_TAGS = [
  { id: 'fast_shipping', label: 'Fast Shipping', type: 'buyer_to_seller' },
  { id: 'as_described', label: 'As Described', type: 'buyer_to_seller' },
  { id: 'great_communication', label: 'Great Communication', type: 'both' },
  { id: 'responsive', label: 'Responsive', type: 'both' },
  { id: 'easy_transaction', label: 'Easy Transaction', type: 'both' },
  { id: 'fast_payment', label: 'Fast Payment', type: 'seller_to_buyer' },
  { id: 'friendly', label: 'Friendly', type: 'both' },
];

export default function MarketplaceReviewModal({ isOpen, onClose, order, currentUser }) {
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !order) return null;

  const isBuyer = currentUser.email === order.buyer_email;
  const reviewType = isBuyer ? 'buyer_to_seller' : 'seller_to_buyer';
  const reviewedUserEmail = isBuyer ? order.seller_email : order.buyer_email;

  const availableTags = REVIEW_TAGS.filter(
    tag => tag.type === 'both' || tag.type === reviewType
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await base44.entities.MarketplaceReview.create({
        order_id: order.id,
        product_id: order.id, // Assuming order has product info
        reviewer_email: currentUser.email,
        reviewed_user_email: reviewedUserEmail,
        rating,
        review_text: reviewText || 'No comment',
        review_type: reviewType,
        tags: selectedTags
      });

      // Create notification for reviewed user
      await base44.entities.Notification.create({
        user_email: reviewedUserEmail,
        type: 'post_like',
        title: 'New Marketplace Review',
        message: `${currentUser.full_name} left you a ${rating}-star review`,
        link: `/profile?email=${currentUser.email}`
      });

      toast.success('Review submitted!');
      onClose();
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error('Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tagId) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-black border-2 border-[#00D9FF] max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black uppercase">
            Rate {isBuyer ? 'Seller' : 'Buyer'}
          </h2>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star Rating */}
          <div>
            <label className="text-xs uppercase tracking-wider text-white/60 mb-3 block">
              Overall Rating
            </label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= rating
                        ? 'fill-[#FFEB3B] text-[#FFEB3B]'
                        : 'text-white/20'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-white/60 mt-2">
              {rating === 5 && 'Excellent!'}
              {rating === 4 && 'Good'}
              {rating === 3 && 'Average'}
              {rating === 2 && 'Below Average'}
              {rating === 1 && 'Poor'}
            </p>
          </div>

          {/* Quick Tags */}
          <div>
            <label className="text-xs uppercase tracking-wider text-white/60 mb-3 block">
              Quick Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all border-2 ${
                    selectedTags.includes(tag.id)
                      ? 'bg-[#00D9FF] text-black border-[#00D9FF]'
                      : 'bg-white/5 text-white/60 border-white/20 hover:border-white/40'
                  }`}
                >
                  {selectedTags.includes(tag.id) && <Check className="w-3 h-3 inline mr-1" />}
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Review Text */}
          <div>
            <label className="text-xs uppercase tracking-wider text-white/60 mb-2 block">
              Your Review (Optional)
            </label>
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience..."
              className="bg-white/5 border-white/20 text-white min-h-[100px]"
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 border-white/20"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black font-black"
            >
              {loading ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}