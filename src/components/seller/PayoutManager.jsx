import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import { DollarSign, TrendingUp, Clock, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  pending: { icon: Clock, color: '#FFEB3B', label: 'Pending' },
  in_transit: { icon: TrendingUp, color: '#00C2E0', label: 'In Transit' },
  paid: { icon: CheckCircle2, color: '#39FF14', label: 'Paid' },
  failed: { icon: AlertCircle, color: '#FF073A', label: 'Failed' },
  cancelled: { icon: AlertCircle, color: '#FF6B35', label: 'Cancelled' },
};

export default function PayoutManager({ payouts, orders, sellerId, stripeConnectId }) {
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);

  // Calculate available balance (orders not yet paid out)
  const paidOutOrderIds = payouts.flatMap(p => p.order_ids || []);
  const unpaidOrders = orders.filter(o => 
    o.payment_method === 'stripe' && 
    o.status === 'delivered' &&
    !paidOutOrderIds.includes(o.id)
  );
  const availableBalance = unpaidOrders.reduce((sum, o) => sum + (o.total_gbp || 0), 0);

  const requestPayoutMutation = useMutation({
    mutationFn: async () => {
      if (unpaidOrders.length === 0) {
        throw new Error('No orders to pay out');
      }

      const { data, error } = await supabase.from('seller_payouts').insert({
        seller_id: sellerId,
        amount_gbp: availableBalance,
        stripe_connect_account_id: stripeConnectId,
        status: 'pending',
        payout_date: new Date().toISOString(),
        period_start: format(new Date(unpaidOrders[0].created_at || unpaidOrders[0].created_date), 'yyyy-MM-dd'),
        period_end: format(new Date(), 'yyyy-MM-dd'),
        order_ids: unpaidOrders.map(o => o.id)
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['seller-payouts']);
      toast.success('Payout requested');
    },
    onError: (error) => {
      toast.error(error.message || 'Payout failed');
    }
  });

  const connectStripe = async () => {
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please sign in to connect Stripe');
        return;
      }
      const res = await fetch('/api/stripe/connect-onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ seller_id: sellerId }),
      });
      const json = await res.json();
      if (json?.url) {
        window.location.href = json.url;
      } else {
        toast.error(json?.error || 'Could not start Stripe Connect onboarding');
      }
    } catch (error) {
      toast.error('Failed to connect Stripe');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-[#00C2E0]/20 to-[#C8962C]/20 border-2 border-[#00C2E0] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-white/60 uppercase tracking-wider mb-1">Available Balance</p>
            <p className="text-4xl font-black text-[#00C2E0]">£{availableBalance.toFixed(2)}</p>
            <p className="text-xs text-white/40 mt-1">{unpaidOrders.length} orders ready for payout</p>
          </div>
          <DollarSign className="w-12 h-12 text-[#00C2E0]" />
        </div>

        {!stripeConnectId ? (
          <Button
            onClick={connectStripe}
            disabled={connecting}
            className="w-full bg-white text-black hover:bg-white/90 font-bold"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Connect Stripe Account
          </Button>
        ) : (
          <Button
            onClick={() => requestPayoutMutation.mutate()}
            disabled={availableBalance === 0 || requestPayoutMutation.isPending}
            className="w-full bg-[#00C2E0] hover:bg-[#00C2E0]/90 text-black font-bold"
          >
            Request Payout
          </Button>
        )}
      </div>

      {/* Stripe Connect Status */}
      {stripeConnectId && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-bold">Stripe Connected</p>
              <p className="text-xs text-white/60">Account ID: {stripeConnectId.slice(0, 20)}...</p>
            </div>
          </div>
          <Button variant="outline" size="sm">
            Manage
          </Button>
        </div>
      )}

      {/* Payout History */}
      <div>
        <h3 className="text-xl font-black uppercase mb-4">Payout History</h3>
        <div className="space-y-2">
          {payouts.map((payout, idx) => {
            const config = STATUS_CONFIG[payout.status] || STATUS_CONFIG.pending;
            const Icon = config.icon;

            return (
              <motion.div
                key={payout.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white/5 border border-white/10 rounded-xl p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className="w-5 h-5 mt-1" style={{ color: config.color }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-xl font-black">£{payout.amount_gbp.toFixed(2)}</p>
                        <span
                          className="px-2 py-1 rounded text-xs font-bold uppercase"
                          style={{
                            backgroundColor: `${config.color}20`,
                            color: config.color
                          }}
                        >
                          {config.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-white/40 text-xs uppercase">Period</p>
                          <p className="font-bold">
                            {format(new Date(payout.period_start), 'MMM d')} - {format(new Date(payout.period_end), 'MMM d')}
                          </p>
                        </div>
                        <div>
                          <p className="text-white/40 text-xs uppercase">Orders</p>
                          <p className="font-bold">{payout.order_ids?.length || 0}</p>
                        </div>
                        {payout.arrival_date && (
                          <div>
                            <p className="text-white/40 text-xs uppercase">Arrival</p>
                            <p className="font-bold">{format(new Date(payout.arrival_date), 'MMM d, yyyy')}</p>
                          </div>
                        )}
                      </div>

                      {payout.stripe_payout_id && (
                        <p className="text-xs text-white/40 mt-2">
                          Payout ID: {payout.stripe_payout_id}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {payouts.length === 0 && (
            <div className="text-center py-12 text-white/40">
              <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No payouts yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
