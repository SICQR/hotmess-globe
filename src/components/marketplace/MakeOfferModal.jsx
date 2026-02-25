import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { addHours } from 'date-fns';

export default function MakeOfferModal({ isOpen, onClose, product, currentUser }) {
  const [offerGbp, setOfferGbp] = useState(product.price_gbp ? Math.floor(product.price_gbp * 0.8) : 0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    try {
      await base44.entities.ProductOffer.create({
        product_id: product.id,
        buyer_email: currentUser.email,
        seller_email: product.seller_email,
        offer_xp: 0,
        offer_gbp: offerGbp || 0,
        message: message || 'No message',
        status: 'pending',
        expires_at: addHours(new Date(), 48).toISOString()
      });

      // Create notification for seller
      await base44.entities.Notification.create({
        user_email: product.seller_email,
        type: 'order',
        title: 'New Offer Received',
        message: `${currentUser.full_name} offered £${offerGbp} for ${product.name}`,
        link: `/seller-dashboard?tab=offers`
      });

      toast.success('Offer submitted! Seller has 48 hours to respond.');
      onClose();
    } catch (error) {
      console.error('Failed to submit offer:', error);
      toast.error('Failed to submit offer');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-black border-2 border-[#C8962C] max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-modal-title"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="offer-modal-title" className="text-2xl font-black uppercase">Make Offer</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-4 p-4 bg-white/5 border border-white/10">
          <h3 className="font-bold mb-1">{product.name}</h3>
          <div className="text-sm text-white/60">
            Asking: £{product.price_gbp || 0}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-white/60 mb-2 block">
              Your Offer (£)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#39FF14]" />
              <Input
                type="number"
                value={offerGbp}
                onChange={(e) => setOfferGbp(Number(e.target.value))}
                min={0}
                step="0.01"
                className="pl-10 bg-white/5 border-white/20 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-white/60 mb-2 block">
              Message to Seller
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explain your offer..."
              className="bg-white/5 border-white/20 text-white min-h-[100px]"
            />
          </div>

          <div className="bg-[#C8962C]/10 border border-[#C8962C]/40 p-3 text-xs text-white/80">
            <strong>Note:</strong> Offer expires in 48 hours. Seller can accept, decline, or counter.
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
              className="flex-1 bg-[#C8962C] hover:bg-[#C8962C]/90 text-black font-black"
            >
              {loading ? 'Submitting...' : 'Submit Offer'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}