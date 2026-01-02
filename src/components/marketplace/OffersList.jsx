import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Clock, Check, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function OffersList({ userEmail, type = 'received' }) {
  const queryClient = useQueryClient();

  const { data: offers = [] } = useQuery({
    queryKey: ['product-offers', type, userEmail],
    queryFn: () => {
      if (type === 'received') {
        return base44.entities.ProductOffer.filter({ seller_email: userEmail }, '-created_date');
      }
      return base44.entities.ProductOffer.filter({ buyer_email: userEmail }, '-created_date');
    },
    enabled: !!userEmail
  });

  const acceptOfferMutation = useMutation({
    mutationFn: async (offer) => {
      await base44.entities.ProductOffer.update(offer.id, { status: 'accepted' });
      
      // Create order
      await base44.entities.Order.create({
        buyer_email: offer.buyer_email,
        seller_email: offer.seller_email,
        total_xp: offer.offer_xp,
        total_gbp: offer.offer_gbp || 0,
        status: 'pending',
        payment_method: 'xp'
      });

      // Notify buyer
      await base44.entities.Notification.create({
        user_email: offer.buyer_email,
        type: 'order',
        title: 'Offer Accepted!',
        message: `Your offer was accepted. Order processing.`,
        link: `/order-history`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['product-offers']);
      toast.success('Offer accepted!');
    }
  });

  const declineOfferMutation = useMutation({
    mutationFn: async (offer) => {
      await base44.entities.ProductOffer.update(offer.id, { status: 'declined' });
      await base44.entities.Notification.create({
        user_email: offer.buyer_email,
        type: 'order',
        title: 'Offer Declined',
        message: `Your offer was declined by the seller.`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['product-offers']);
      toast.success('Offer declined');
    }
  });

  return (
    <div className="space-y-4">
      {offers.map((offer, idx) => {
        const isExpired = new Date(offer.expires_at) < new Date();
        const isPending = offer.status === 'pending' && !isExpired;

        return (
          <motion.div
            key={offer.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white/5 border border-white/10 rounded-xl p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-bold text-white mb-1">
                  {type === 'received' ? `Offer from ${offer.buyer_email}` : `Your offer`}
                </h3>
                <div className="text-sm text-white/60 flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(offer.created_date), { addSuffix: true })}
                  {isExpired && <span className="text-red-400">• Expired</span>}
                </div>
              </div>
              <div
                className={`px-3 py-1 text-xs font-bold uppercase ${
                  offer.status === 'accepted'
                    ? 'bg-[#39FF14] text-black'
                    : offer.status === 'declined'
                    ? 'bg-red-500 text-white'
                    : isExpired
                    ? 'bg-white/10 text-white/40'
                    : 'bg-[#FF1493] text-black'
                }`}
              >
                {isExpired && offer.status === 'pending' ? 'Expired' : offer.status}
              </div>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/60">Offer Amount</span>
                <span className="text-lg font-black text-[#FF1493]">
                  {offer.offer_xp} XP
                  {offer.offer_gbp > 0 && ` + £${offer.offer_gbp}`}
                </span>
              </div>
              {offer.message && (
                <div className="flex items-start gap-2 mt-2 pt-2 border-t border-white/10">
                  <MessageCircle className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-white/80">{offer.message}</p>
                </div>
              )}
            </div>

            {type === 'received' && isPending && (
              <div className="flex gap-2">
                <Button
                  onClick={() => acceptOfferMutation.mutate(offer)}
                  className="flex-1 bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-black"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Accept
                </Button>
                <Button
                  onClick={() => declineOfferMutation.mutate(offer)}
                  variant="outline"
                  className="flex-1 border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                >
                  <X className="w-4 h-4 mr-2" />
                  Decline
                </Button>
              </div>
            )}
          </motion.div>
        );
      })}

      {offers.length === 0 && (
        <div className="text-center py-12 text-white/40">
          <p>No offers yet</p>
        </div>
      )}
    </div>
  );
}