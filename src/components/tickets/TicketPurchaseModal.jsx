import React, { useState } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

function CheckoutForm({ event, onClose, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);

    try {
      const cardElement = elements.getElement(CardElement);
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error) {
        throw new Error(error.message);
      }

      const session = await base44.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch('/api/tickets/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          beacon_id: event.id,
          payment_method_id: paymentMethod.id
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Purchase failed');
      }

      toast.success('Ticket purchased successfully!');
      onSuccess?.();
      onClose();

    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white/5 p-4 rounded-lg border border-white/10 space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-white/10">
          <span className="text-white/60">Total</span>
          <span className="text-2xl font-black text-[#00D9FF]">
            £{((event.ticket_price_cents || 0) / 100).toFixed(2)}
          </span>
        </div>
        
        <div className="p-3 bg-white rounded border border-white/20">
            <CardElement options={{
                style: {
                    base: {
                        fontSize: '16px',
                        color: '#000',
                        '::placeholder': { color: '#666' },
                        iconColor: '#000',
                    },
                },
                hidePostalCode: true
            }} />
        </div>
        
        <div className="flex items-center gap-2 text-[10px] text-white/40 justify-center">
            <ShieldCheck className="w-3 h-3" />
            <span>Encrypted via Stripe • Official Primary Sale</span>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full h-12 bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black font-black uppercase tracking-wider text-base"
        disabled={!stripe || loading}
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Payment'}
      </Button>
    </form>
  );
}

export default function TicketPurchaseModal({ isOpen, onClose, event, onSuccess }) {
  const stripePromise = getStripe();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/95 border-white/10 text-white max-w-md sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
            Secure Ticket
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-2">
            <h3 className="font-bold text-lg mb-1">{event.title}</h3>
            <p className="text-sm text-white/60 mb-6">
                Official Ticket • Linked to ID • 10% Resale Cap
            </p>

            {stripePromise ? (
                <Elements stripe={stripePromise}>
                    <CheckoutForm event={event} onClose={onClose} onSuccess={onSuccess} />
                </Elements>
            ) : (
                <div className="p-4 text-center bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    Stripe configuration missing.
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
