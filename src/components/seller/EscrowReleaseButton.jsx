import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Unlock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function EscrowReleaseButton({ order, buyerEmail }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  const releaseMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/orders/release-escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          buyer_email: buyerEmail,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to release escrow');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['buyer-orders']);
      toast.success(`Payment released! Seller received ${data.seller_received.toLocaleString()} XP`);
      setShowConfirm(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to release payment');
    },
  });

  // Only show for escrow orders
  if (order.status !== 'escrow') {
    return null;
  }

  const platformFee = Math.round(order.total_xp * 0.10);
  const sellerReceives = order.total_xp - platformFee;

  return (
    <>
      <Button
        onClick={() => setShowConfirm(true)}
        className="bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-bold"
        size="sm"
      >
        <Unlock className="w-4 h-4 mr-2" />
        Release Payment
      </Button>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-black border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="font-black uppercase flex items-center gap-2">
              <Unlock className="w-5 h-5 text-[#39FF14]" />
              Release Escrow Payment
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Confirm that you have received your order and are satisfied with it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h4 className="font-bold mb-3">Order #{order.id.slice(0, 8)}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Order Total</span>
                  <span className="font-bold text-[#FFEB3B]">{order.total_xp.toLocaleString()} XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Platform Fee (10%)</span>
                  <span className="text-white/40">-{platformFee.toLocaleString()} XP</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between">
                  <span className="text-white/60">Seller Receives</span>
                  <span className="font-bold text-[#39FF14]">{sellerReceives.toLocaleString()} XP</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-[#FFEB3B]/10 border border-[#FFEB3B]/30 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 text-[#FFEB3B] flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-[#FFEB3B] mb-1">This action is final</p>
                <p className="text-white/60">
                  Once released, the payment will be credited to the seller immediately. 
                  You cannot undo this action.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              className="border-white/20 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() => releaseMutation.mutate()}
              disabled={releaseMutation.isPending}
              className="bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-bold"
            >
              {releaseMutation.isPending ? (
                'Releasing...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Release
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
