/**
 * TicketPurchaseModal - Modal for purchasing a ticket with escrow
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Calendar, 
  MapPin, 
  Ticket, 
  Shield, 
  Star, 
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Info,
  Lock
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '../../lib/AuthContext';

export default function TicketPurchaseModal({ listing, onClose, onSuccess }) {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [listingDetails, setListingDetails] = useState(null);

  const eventDate = new Date(listing.event_date);
  
  // Fetch full listing details
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/ticket-reseller/${listing.id}`);
        const data = await res.json();
        if (res.ok) {
          setListingDetails(data);
        }
      } catch (error) {
        console.error('Failed to fetch listing details:', error);
      } finally {
        setDetailsLoading(false);
      }
    };
    fetchDetails();
  }, [listing.id]);

  // Calculate pricing
  const pricing = {
    unitPrice: listing.asking_price_gbp,
    quantity,
    subtotal: listing.asking_price_gbp * quantity,
    platformFee: Math.round(listing.asking_price_gbp * quantity * 0.10 * 100) / 100,
    buyerProtection: Math.round(listing.asking_price_gbp * quantity * 0.025 * 100) / 100,
  };
  pricing.total = Math.round((pricing.subtotal + pricing.platformFee + pricing.buyerProtection) * 100) / 100;

  const handlePurchase = async () => {
    if (!user) {
      toast.error('Please sign in to purchase tickets');
      return;
    }

    if (!agreed) {
      toast.error('Please agree to the terms and conditions');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/ticket-reseller/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listing_id: listing.id,
          quantity,
          success_url: `${window.location.origin}/ticket-reseller/orders`,
          cancel_url: `${window.location.origin}/ticket-reseller?listing=${listing.id}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate purchase');
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      }

    } catch (error) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  const seller = listing.seller || listingDetails?.listing?.seller;
  const priceHistory = listingDetails?.priceHistory || [];
  const sellerReviews = listingDetails?.sellerReviews || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-gray-900 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Purchase Ticket</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Event Info */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h3 className="font-semibold text-lg mb-2">{listing.event_name}</h3>
            <div className="space-y-1 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{listing.event_venue}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{format(eventDate, 'EEEE, MMMM d, yyyy')}</span>
                <span className="text-gray-600">•</span>
                <span>{format(eventDate, 'HH:mm')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                <span className="capitalize">{listing.ticket_type.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          {/* Seller Info */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h4 className="text-sm text-gray-400 mb-2">Seller</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {seller?.average_rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-medium">{seller.average_rating.toFixed(1)}</span>
                    <span className="text-gray-400 text-sm">
                      ({seller.total_ratings || 0} reviews)
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {seller?.id_verified && (
                  <span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    ID Verified
                  </span>
                )}
                {seller?.trust_score >= 80 && (
                  <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                    Trusted
                  </span>
                )}
              </div>
            </div>
            
            {/* Recent Reviews Preview */}
            {sellerReviews.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-xs text-gray-500 mb-2">Recent review:</p>
                <p className="text-sm text-gray-300 italic line-clamp-2">
                  "{sellerReviews[0].review_text}"
                </p>
              </div>
            )}
          </div>

          {/* Quantity Selector (if multiple available) */}
          {listing.ticket_quantity > 1 && (
            <div className="bg-gray-800/50 rounded-xl p-4">
              <label className="block text-sm text-gray-400 mb-2">Quantity</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="w-10 h-10 rounded-lg border border-gray-600 flex items-center justify-center disabled:opacity-50"
                >
                  -
                </button>
                <span className="text-xl font-semibold w-8 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(listing.ticket_quantity, quantity + 1))}
                  disabled={quantity >= listing.ticket_quantity}
                  className="w-10 h-10 rounded-lg border border-gray-600 flex items-center justify-center disabled:opacity-50"
                >
                  +
                </button>
                <span className="text-gray-400 text-sm">
                  {listing.ticket_quantity} available
                </span>
              </div>
            </div>
          )}

          {/* Price Breakdown */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h4 className="text-sm text-gray-400 mb-3">Price Breakdown</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">
                  Ticket{quantity > 1 ? 's' : ''} ({quantity} × £{pricing.unitPrice.toFixed(2)})
                </span>
                <span>£{pricing.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 flex items-center gap-1">
                  Service fee
                  <Info className="w-3 h-3" />
                </span>
                <span>£{pricing.platformFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyan-400 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Buyer protection
                </span>
                <span>£{pricing.buyerProtection.toFixed(2)}</span>
              </div>
              <div className="h-px bg-gray-700 my-2" />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>£{pricing.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-xl p-4">
            <h4 className="text-cyan-400 font-medium flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4" />
              How Buyer Protection Works
            </h4>
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Your payment is held securely in escrow</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Seller has 24 hours to transfer the ticket</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Confirm receipt to release payment to seller</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Full refund if ticket is invalid or not received</span>
              </div>
            </div>
          </div>

          {/* Terms Agreement */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 accent-pink-500"
            />
            <span className="text-sm text-gray-400">
              I understand that I'm purchasing from a third-party reseller and agree to the{' '}
              <a href="/terms" className="text-pink-400 hover:underline">terms & conditions</a>{' '}
              and{' '}
              <a href="/buyer-protection" className="text-pink-400 hover:underline">buyer protection policy</a>.
            </span>
          </label>

          {/* Purchase Button */}
          <button
            onClick={handlePurchase}
            disabled={loading || !agreed || !user}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              'Processing...'
            ) : !user ? (
              'Sign in to Purchase'
            ) : (
              <>
                Pay £{pricing.total.toFixed(2)}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Security Note */}
          <p className="text-center text-xs text-gray-500 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" />
            Secure payment powered by Stripe
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
