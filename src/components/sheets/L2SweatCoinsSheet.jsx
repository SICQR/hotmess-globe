/**
 * L2SweatCoinsSheet — Sweat Coins wallet
 *
 * Shows current balance (from the latest balance_after), transaction history,
 * and earn/spend context.
 * DB: sweat_coins (transaction ledger — user_email, amount, transaction_type,
 *                 reference_type, balance_after, created_at)
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, TrendingDown, Loader2, Gift } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';

const TYPE_LABELS = {
  earn: 'Earned',
  spend: 'Spent',
  bonus: 'Bonus',
  refund: 'Refund',
  admin: 'Admin',
};

const REF_ICONS = {
  purchase: '🛍️',
  checkin: '📍',
  event: '🎉',
  streak: '🔥',
  referral: '🤝',
  bonus: '🎁',
  tap: '💛',
  woof: '🐾',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function TransactionRow({ tx }) {
  const isCredit = tx.amount > 0;
  const icon = REF_ICONS[tx.reference_type] || '💰';
  const label = TYPE_LABELS[tx.transaction_type] || tx.transaction_type || 'Transaction';

  return (
    <div className="flex items-center gap-3 p-4">
      <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 text-base">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm truncate">{label}</p>
        <p className="text-white/30 text-xs">{timeAgo(tx.created_at)}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`font-black text-sm ${isCredit ? 'text-emerald-400' : 'text-red-400'}`}>
          {isCredit ? '+' : ''}{tx.amount.toLocaleString()}
        </p>
        {tx.balance_after != null && (
          <p className="text-white/20 text-xs">{tx.balance_after.toLocaleString()} bal.</p>
        )}
      </div>
    </div>
  );
}

// Static earn guide rows
const EARN_WAYS = [
  { icon: '📍', label: 'Check in at a venue', coins: '+10' },
  { icon: '🎉', label: 'Attend an event', coins: '+25' },
  { icon: '🔥', label: 'Login streak (7 days)', coins: '+50' },
  { icon: '💛', label: 'Give a tap or woof', coins: '+2' },
  { icon: '🤝', label: 'Refer a friend', coins: '+100' },
  { icon: '🛍️', label: 'Make a purchase', coins: '+5%' },
];

export default function L2SweatCoinsSheet() {
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('History');

  useEffect(() => {
    loadWallet();
  }, []);

  async function loadWallet() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('sweat_coins')
      .select('*')
      .eq('user_email', user.email)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setTransactions(data);
      // Current balance = balance_after on the most recent transaction
      if (data.length > 0 && data[0].balance_after != null) {
        setBalance(data[0].balance_after);
      } else {
        // Fallback: sum all amounts
        setBalance(data.reduce((sum, tx) => sum + (tx.amount || 0), 0));
      }
    }

    setLoading(false);
  }

  const totalEarned = transactions
    .filter(tx => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#0D0D0D]">

      {/* Balance card */}
      <div className="px-4 pt-4 pb-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-[#C8962C]/20 via-[#C8962C]/10 to-transparent border border-[#C8962C]/25 rounded-3xl p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Sweat Coins</p>
              <p className="text-white/30 text-xs mt-0.5">Your balance</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#C8962C]/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#C8962C]" />
            </div>
          </div>

          {loading ? (
            <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl font-black text-white">
                  {balance != null ? balance.toLocaleString() : '—'}
                </span>
                <span className="text-[#C8962C] font-bold text-sm">SC</span>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 text-xs font-bold">{totalEarned.toLocaleString()} earned</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-white/30 text-xs font-bold">
                    {(totalEarned - (balance || 0)).toLocaleString()} spent
                  </span>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {['History', 'How to Earn'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-black transition-colors ${
                tab === t ? 'bg-[#C8962C] text-black' : 'text-white/50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* History tab */}
      {tab === 'History' && (
        <div className="px-4 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="bg-[#1C1C1E] rounded-2xl p-8 flex flex-col items-center text-center">
              <Zap className="w-10 h-10 text-white/10 mb-3" />
              <p className="text-white/50 font-bold text-sm">No transactions yet</p>
              <p className="text-white/30 text-xs mt-1">Start earning Sweat Coins by engaging with the community.</p>
            </div>
          ) : (
            <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-white/5">
              {transactions.map(tx => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* How to Earn tab */}
      {tab === 'How to Earn' && (
        <div className="px-4 pb-6 space-y-3">
          <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-white/5">
            {EARN_WAYS.map(way => (
              <div key={way.label} className="flex items-center gap-3 p-4">
                <span className="text-xl flex-shrink-0">{way.icon}</span>
                <p className="text-white font-bold text-sm flex-1">{way.label}</p>
                <span className="text-[#C8962C] font-black text-sm">{way.coins}</span>
              </div>
            ))}
          </div>

          <div className="bg-[#C8962C]/5 border border-[#C8962C]/15 rounded-2xl p-4 flex items-start gap-3">
            <Gift className="w-5 h-5 text-[#C8962C] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[#C8962C] font-black text-sm">Coming soon</p>
              <p className="text-white/50 text-xs mt-0.5 leading-relaxed">
                Spend Sweat Coins on discounts, drops, and exclusive HOTMESS perks.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
