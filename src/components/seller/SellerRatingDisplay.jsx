import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, Clock, Package, MessageCircle, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function SellerRatingDisplay({ sellerEmail, compact = false }) {
  const { data: rating } = useQuery({
    queryKey: ['seller-rating', sellerEmail],
    queryFn: async () => {
      const ratings = await base44.entities.SellerRating.filter({ seller_email: sellerEmail });
      return ratings[0] || null;
    },
    enabled: !!sellerEmail
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['seller-reviews', sellerEmail],
    queryFn: () => base44.entities.MarketplaceReview.filter({ 
      reviewed_user_email: sellerEmail,
      review_type: 'buyer_to_seller'
    }),
    enabled: !!sellerEmail
  });

  if (!rating && reviews.length === 0) return null;

  const avgRating = rating?.average_rating || 
    (reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-[#FFEB3B] text-[#FFEB3B]" />
          <span className="font-bold">{avgRating.toFixed(1)}</span>
        </div>
        <span className="text-xs text-white/40">
          ({rating?.total_reviews || reviews.length} reviews)
        </span>
      </div>
    );
  }

  const breakdown = rating?.rating_breakdown || {
    '5_star': reviews.filter(r => r.rating === 5).length,
    '4_star': reviews.filter(r => r.rating === 4).length,
    '3_star': reviews.filter(r => r.rating === 3).length,
    '2_star': reviews.filter(r => r.rating === 2).length,
    '1_star': reviews.filter(r => r.rating === 1).length
  };

  const totalReviews = rating?.total_reviews || reviews.length;

  return (
    <div className="bg-white/5 border border-white/10 p-6">
      <h3 className="text-xl font-black uppercase mb-4">Seller Rating</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Overall Rating */}
        <div>
          <div className="text-center mb-4">
            <div className="text-5xl font-black mb-2">{avgRating.toFixed(1)}</div>
            <div className="flex items-center justify-center gap-1 mb-1">
              {[1, 2, 3, 4, 5].map(i => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${i <= Math.round(avgRating) ? 'fill-[#FFEB3B] text-[#FFEB3B]' : 'text-white/20'}`}
                />
              ))}
            </div>
            <p className="text-sm text-white/60">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</p>
          </div>

          {/* Rating Breakdown */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(stars => {
              const count = breakdown[`${stars}_star`] || 0;
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              
              return (
                <div key={stars} className="flex items-center gap-3 text-sm">
                  <span className="w-12 text-white/60">{stars} star</span>
                  <Progress value={percentage} className="flex-1 h-2" />
                  <span className="w-8 text-right text-white/40">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Seller Metrics */}
        <div className="space-y-4">
          {rating?.response_rate !== undefined && (
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-[#00D9FF] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold">Response Rate</span>
                  <span className="text-sm">{rating.response_rate}%</span>
                </div>
                <Progress value={rating.response_rate} className="h-2" />
              </div>
            </div>
          )}

          {rating?.avg_response_time_hours !== undefined && (
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#C8962C]" />
              <div className="flex-1">
                <p className="text-sm font-bold">Avg Response Time</p>
                <p className="text-xs text-white/60">
                  {rating.avg_response_time_hours < 24 
                    ? `${rating.avg_response_time_hours.toFixed(1)} hours`
                    : `${(rating.avg_response_time_hours / 24).toFixed(1)} days`
                  }
                </p>
              </div>
            </div>
          )}

          {rating?.on_time_delivery_rate !== undefined && (
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-[#39FF14] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold">On-Time Delivery</span>
                  <span className="text-sm">{rating.on_time_delivery_rate}%</span>
                </div>
                <Progress value={rating.on_time_delivery_rate} className="h-2" />
              </div>
            </div>
          )}

          {rating?.total_sales !== undefined && (
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-[#FFEB3B]" />
              <div>
                <p className="text-sm font-bold">Total Sales</p>
                <p className="text-xs text-white/60">{rating.total_sales} completed orders</p>
              </div>
            </div>
          )}

          {rating?.dispute_rate !== undefined && rating.dispute_rate > 0 && (
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-sm font-bold">Dispute Rate</p>
                <p className="text-xs text-white/60">{rating.dispute_rate}%</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
