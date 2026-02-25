/**
 * L2PayoutsSheet — Seller balance, payout history, and request payout
 *
 * Shows:
 * - Available balance (sum of completed orders minus platform fee)
 * - Pending balance (awaiting delivery confirmation)
 * - Payout history
 * - Request payout button → creates seller_payouts record
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import {
  Wallet, ArrowDownToLine, Clock, CheckCircle2,
  AlertCircle, Loader2, TrendingUp, ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const PLATFORM_FEE = 0.10; // 10%

function fmt(n) {
  return `£${(Number(n) || 0).toFixed(2)}`;
}

export default function L2PayoutsSheet() {
  const queryClient = useQueryClient();
  const [requestAmount, setRequestAmount] = useState('');

  // Get current user from Supabase auth directly
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['supabase-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch seller orders (delivered/completed) — uses total_gbp column
  const { data: completedOrders = [] } = useQuery({
    queryKey: ['seller-completed-orders', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('id, total_gbp, status, created_at, buyer_email')
        .eq('seller_email', user.email)
        .in('status', ['delivered', 'completed'])
        .order('created_at', { ascending: false });
      if (error) { console.warn('[payouts] orders query:', error); return []; }
      return data || [];
    },
    enabled: !!user?.email,
  });

  // Fetch pending orders (paid but not delivered)
  const { data: pendingOrders = [] } = useQuery({
    queryKey: ['seller-pending-orders', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('id, total_gbp, status, created_at')
        .eq('seller_email', user.email)
        .in('status', ['paid', 'shipped'])
        .order('created_at', { ascending: false });
      if (error) { console.warn('[payouts] pending orders query:', error); return []; }
      return data || [];
    },
    enabled: !!user?.email,
  });

  // Fetch payout history
  const { data: payouts = [] } = useQuery({
    queryKey: ['seller-payouts', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from('seller_payouts')
        .select('*')
        .eq('seller_email', user.email)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) { console.warn('[payouts] payouts query:', error); return []; }
      return data || [];
    },
    enabled: !!user?.email,
  });

  const grossRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.total_gbp) || 0), 0);
  const platformFees = grossRevenue * PLATFORM_FEE;
  const totalPaidOut = payouts
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (Number(p.amount_gbp) || 0), 0);
  const totalRequested = payouts
    .filter(p => p.status === 'requested')
    .reduce((sum, p) => sum + (Number(p.amount_gbp) || 0), 0);
  const availableBalance = Math.max(0, grossRevenue - platformFees - totalPaidOut - totalRequested);
  const pendingBalance = pendingOrders.reduce((sum, o) => sum + (Number(o.total_gbp) || 0), 0) * (1 - PLATFORM_FEE);

  const requestPayout = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error('Not authenticated');
      const amount = parseFloat(requestAmount) || availableBalance;
      if (amount <= 0) throw new Error('Nothing to pay out');
      if (amount > availableBalance) throw new Error(`Maximum available: ${fmt(availableBalance)}`);

      const { error } = await supabase.from('seller_payouts').insert({
        seller_email: user.email,
        amount_gbp: amount,
        amount_xp: 0,
        currency: 'GBP',
        status: 'requested',
        requested_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Payout requested! We\'ll process it in 2–3 business days.');
      setRequestAmount('');
      queryClient.invalidateQueries(['seller-payouts']);
    },
    onError: (err) => toast.error(err.message || 'Failed to request payout'),
  });

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3">
        <Wallet className="w-10 h-10 text-white/20" />
        <p className="text-white/40 text-sm">Sign in to view payouts</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full px-4 py-4 space-y-5">
      {/* Balance cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1C1C1E] rounded-2xl p-4 border border-[#C8962C]/20">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-black mb-1">Available</p>
          <p className="text-2xl font-black text-[#C8962C]">{fmt(availableBalance)}</p>
          <p className="text-[10px] text-white/30 mt-0.5">After 10% fee</p>
        </div>
        <div className="bg-[#1C1C1E] rounded-2xl p-4 border border-white/8">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-black mb-1">Pending</p>
          <p className="text-2xl font-black text-white/70">{fmt(pendingBalance)}</p>
          <p className="text-[10px] text-white/30 mt-0.5">Awaiting delivery</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: TrendingUp, label: 'Gross Sales', value: fmt(grossRevenue) },
          { icon: ShoppingBag, label: 'Orders', value: completedOrders.length },
          { icon: Wallet, label: 'Paid Out', value: fmt(totalPaidOut) },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-[#1C1C1E] rounded-xl p-3 text-center border border-white/8">
            <Icon className="w-4 h-4 text-white/40 mx-auto mb-1" />
            <p className="text-white font-black text-base">{value}</p>
            <p className="text-white/30 text-[9px] uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* Request payout */}
      {availableBalance > 0 && (
        <div className="bg-[#1C1C1E] rounded-2xl p-4 border border-[#C8962C]/20 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-white">Request Payout</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C8962C] font-black text-sm">£</span>
            <input
              type="number"
              min="1"
              max={availableBalance}
              step="0.01"
              value={requestAmount}
              onChange={e => setRequestAmount(e.target.value)}
              placeholder={availableBalance.toFixed(2)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#C8962C]/60 text-sm"
            />
          </div>
          <Button
            onClick={() => requestPayout.mutate()}
            disabled={requestPayout.isPending}
            className="w-full bg-[#C8962C] text-black font-black rounded-xl py-3"
          >
            {requestPayout.isPending ? (
              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Processing...</span>
            ) : (
              <span className="flex items-center gap-2"><ArrowDownToLine className="w-4 h-4" /> Request {requestAmount ? `£${parseFloat(requestAmount).toFixed(2)}` : fmt(availableBalance)}</span>
            )}
          </Button>
          <p className="text-white/25 text-[10px] text-center">Paid to your registered bank account via Stripe · 2–3 business days</p>
        </div>
      )}

      {/* In-progress requests */}
      {totalRequested > 0 && (
        <div className="bg-[#1C1C1E] rounded-xl px-4 py-3 border border-[#C8962C]/15 flex items-center gap-3">
          <Clock className="w-4 h-4 text-[#C8962C] flex-shrink-0" />
          <p className="text-white/60 text-sm">{fmt(totalRequested)} payout in progress</p>
        </div>
      )}

      {/* Payout history */}
      <div>
        <p className="text-xs uppercase tracking-widest text-white/40 font-black mb-3">Payout History</p>
        {payouts.length === 0 ? (
          <div className="text-center py-8">
            <Wallet className="w-8 h-8 text-white/10 mx-auto mb-2" />
            <p className="text-white/30 text-sm">No payouts yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {payouts.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-[#1C1C1E] rounded-xl px-4 py-3 border border-white/8"
              >
                <div className="flex items-center gap-3">
                  {p.status === 'paid' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#39FF14] flex-shrink-0" />
                  ) : p.status === 'requested' ? (
                    <Clock className="w-4 h-4 text-[#C8962C] flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-white text-sm font-bold">{fmt(p.amount_gbp)}</p>
                    <p className="text-white/30 text-[10px]">
                      {p.created_at && formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  'text-[10px] font-black uppercase px-2 py-0.5 rounded-full',
                  p.status === 'paid' ? 'bg-[#39FF14]/15 text-[#39FF14]' :
                  p.status === 'requested' ? 'bg-[#C8962C]/15 text-[#C8962C]' :
                  'bg-red-500/15 text-red-400'
                )}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
