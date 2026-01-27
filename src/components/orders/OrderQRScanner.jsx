import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QrCode, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function OrderQRScanner({ order, currentUser }) {
  const [orderId, setOrderId] = useState('');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const isBuyer = currentUser.email === order.buyer_email;

  const scanMutation = useMutation({
    mutationFn: async () => {
      if (orderId !== order.id) {
        throw new Error('Invalid order ID');
      }

      // Update order to mark QR as scanned
      await base44.entities.Order.update(order.id, {
        is_qr_scanned: true,
        qr_scanned_at: new Date().toISOString(),
        status: 'delivered'
      });
      
      // Notify seller
      await base44.entities.Notification.create({
        user_email: order.seller_email,
        type: 'order',
        title: 'Order Delivered',
        message: `Buyer confirmed receipt of order #${order.id.slice(0, 8)}. Payment released!`,
        link: 'OrderHistory',
        metadata: { order_id: order.id }
      });

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['buyer-orders']);
      queryClient.invalidateQueries(['seller-orders']);
      toast.success('Order confirmed! Funds released to seller.');
      setOpen(false);
      setOrderId('');
    },
    onError: (error) => {
      toast.error(error.message || 'Invalid QR code');
    }
  });

  if (!isBuyer || order.is_qr_scanned || order.status === 'delivered') {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-black">
          <QrCode className="w-4 h-4 mr-2" />
          Scan Item QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-black text-white border-2 border-[#E62020]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase">Confirm Receipt</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-white/60 uppercase">
            Scan the QR code on the physical item to confirm receipt and release payment to seller.
          </p>
          
          <div>
            <label className="text-xs text-white/40 uppercase mb-2 block">
              Enter Order ID from QR Code
            </label>
            <Input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="Paste or type order ID..."
              className="bg-white/5 border-white/20 text-white"
            />
          </div>

          <div className="bg-[#FFEB3B]/20 border border-[#FFEB3B]/40 p-4">
            <p className="text-xs text-white/80 font-bold uppercase">⚠️ Important</p>
            <p className="text-xs text-white/60 mt-1">
              Only scan after receiving and inspecting the physical item. This action is irreversible and will release payment to the seller.
            </p>
          </div>

          <Button
            onClick={() => scanMutation.mutate()}
            disabled={!orderId || scanMutation.isPending}
            className="w-full bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-black"
          >
            {scanMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirm Receipt
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}