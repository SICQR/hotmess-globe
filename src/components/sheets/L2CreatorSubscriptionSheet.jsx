/**
 * L2CreatorSubscriptionSheet — Creator subscriptions
 *
 * Two modes:
 *   creatorId prop  → Subscribe/manage subscription to a specific creator
 *   no props        → My Subscriptions dashboard (who I follow + my subscriber count)
 *
 * Schema (live DB):
 *   creator_subscriptions: id, subscriber_id, creator_id, price_cents,
 *                          status, current_period_start, current_period_end,
 *                          stripe_subscription_id, cancelled_at, created_at
 *   creator_profiles:      id, user_id, creator_name, subscription_price_cents,
 *                          subscriber_count, total_earnings_cents, is_verified_creator
 *
 * NOTE: Stripe recurring billing not yet wired. Subscribe button is intentionally
 * disabled until api/subscriptions/creator.js is implemented.
 * See: https://github.com/SICQR/hotmess-globe/issues — "Creator subscription billing"
 */

import { useState, useEffect } from 'react';
import { Star, Users, CheckCircle, XCircle, Loader2, Crown, TrendingUp, Lock, Clock } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

const STATUS_STYLE = {
  active:    'text-emerald-400 bg-emerald-400/10',
  cancelled: 'text-red-400 bg-red-400/10',
  expired:   'text-white/30 bg-white/5',
  paused:    'text-[#C8962C] bg-[#C8962C]/10',
};

function fmt(cents) {
  return `£${(Number(cents || 0) / 100).toFixed(2)}`;
}

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function SubscriptionRow({ sub }) {
  const statusClass = STATUS_STYLE[sub.status] || STATUS_STYLE.expired;
  const name = sub.creator_profile?.creator_name
    || sub.creator_profile?.username
    || sub.creator_profile?.display_name
    || 'Creator';

  return (
    <div className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#C8962C]/15 flex items-center justify-center flex-shrink-0">
        <Crown className="w-5 h-5 text-[#C8962C]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm truncate">{name}</p>
        <p className="text-white/40 text-xs mt-0.5">
          {fmt(sub.price_cents)}/mo
          {sub.current_period_end && ` · renews ${fmtDate(sub.current_period_end)}`}
          {sub.cancelled_at && ` · cancelled ${fmtDate(sub.cancelled_at)}`}
        </p>
      </div>
      <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase ${statusClass}`}>
        {sub.status || 'unknown'}
      </span>
    </div>
  );
}

export default function L2CreatorSubscriptionSheet({ creatorId, creatorName, priceCents }) {
  const [mySubscriptions, setMySubscriptions]     = useState([]);
  const [mySubscriberCount, setMySubscriberCount] = useState(0);
  const [creatorProfile, setCreatorProfile]       = useState(null);
  const [existing, setExisting]                   = useState(null);
  const [loading, setLoading]                     = useState(true);
  const [cancelling, setCancelling]               = useState(false);
  const [tab, setTab]                             = useState('active');
  const [currentUser, setCurrentUser]             = useState(null);

  const isCreatorView = !!creatorId;

  useEffect(() => { loadData(); }, [creatorId]);

  async function loadData() {
    setLoading(true);
    try {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      if (isCreatorView) {
        const [profileRes, subRes] = await Promise.all([
          supabase
            .from('creator_profiles')
            .select('id, creator_name, creator_bio, subscription_price_cents, subscriber_count, is_verified_creator')
            .eq('user_id', creatorId)
            .maybeSingle(),
          supabase
            .from('creator_subscriptions')
            .select('*')
            .eq('creator_id', creatorId)
            .eq('subscriber_id', user.id)
            .maybeSingle(),
        ]);
        if (profileRes.data) setCreatorProfile(profileRes.data);
        setExisting(subRes.data);
      } else {
        const [subsRes, countRes] = await Promise.all([
          supabase
            .from('creator_subscriptions')
            .select('*, creator_profile:creator_profiles!creator_id(creator_name)')
            .eq('subscriber_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('creator_subscriptions')
            .select('id', { count: 'exact', head: true })
            .eq('creator_id', user.id)
            .eq('status', 'active'),
        ]);
        if (subsRes.data) setMySubscriptions(subsRes.data);
        if (countRes.count != null) setMySubscriberCount(countRes.count);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Subscribe: DISABLED until Stripe recurring billing is wired ───────────
  // DO NOT re-enable this without first:
  //   1. Creating api/subscriptions/creator.js (Stripe Subscription API)
  //   2. Storing stripe_subscription_id in creator_subscriptions
  //   3. Handling webhook events for renewal + cancellation
  function handleSubscribeComingSoon() {
    toast.info('Creator subscriptions launching soon — stay tuned.');
  }

  async function handleCancel() {
    if (!existing) return;
    setCancelling(true);
    try {
      const { error } = await supabase
        .from('creator_subscriptions')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (error) throw error;
      toast.success('Subscription cancelled');
      await loadData();
    } catch (err) {
      toast.error(err?.message || 'Cancel failed');
    } finally {
      setCancelling(false);
    }
  }

  // ── Creator-specific view ──────────────────────────────────────────────────
  if (isCreatorView) {
    const isActive = existing?.status === 'active';
    const displayPrice = priceCents || creatorProfile?.subscription_price_cents || 499;
    const displayName = creatorName || creatorProfile?.creator_name || 'Creator';

    return (
      <div className="flex flex-col h-full overflow-y-auto bg-[#0D0D0D]">
        <div className="px-4 pt-4 pb-8 space-y-4">

          {/* Creator header */}
          <div className="bg-[#C8962C]/10 border border-[#C8962C]/20 rounded-2xl p-5 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#C8962C]/20 flex items-center justify-center mb-3">
              <Crown className="w-8 h-8 text-[#C8962C]" />
            </div>
            <p className="text-white font-black text-lg">{displayName}</p>
            {creatorProfile?.is_verified_creator && (
              <span className="mt-1 px-2 py-0.5 bg-[#C8962C]/20 text-[#C8962C] text-xs font-black rounded-full uppercase tracking-wider">
                Verified Creator
              </span>
            )}
            {creatorProfile?.creator_bio && (
              <p className="text-white/50 text-sm mt-2 leading-relaxed">{creatorProfile.creator_bio}</p>
            )}
            {creatorProfile?.subscriber_count > 0 && (
              <p className="text-white/30 text-xs mt-2">
                {creatorProfile.subscriber_count.toLocaleString()} subscribers
              </p>
            )}
          </div>

          {/* Tier card */}
          <div className="bg-[#1C1C1E] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-black">Monthly Access</p>
              <div className="flex items-baseline gap-1">
                <span className="text-[#C8962C] font-black text-2xl">{fmt(displayPrice)}</span>
                <span className="text-white/30 text-sm">/mo</span>
              </div>
            </div>
            <div className="space-y-2">
              {['Exclusive posts & updates', 'Direct messaging priority', 'Early event access', 'Subscriber-only content'].map(perk => (
                <div key={perk} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#C8962C] flex-shrink-0" />
                  <span className="text-white/70 text-sm">{perk}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
            </div>
          ) : isActive ? (
            <div className="space-y-3">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-emerald-400 font-black text-sm">Subscribed</p>
                  <p className="text-white/40 text-xs mt-0.5">
                    Since {fmtDate(existing.current_period_start)}
                    {existing.current_period_end && ` · renews ${fmtDate(existing.current_period_end)}`}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full py-3 bg-white/5 rounded-2xl text-red-400 font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Cancel Subscription
              </button>
            </div>
          ) : (
            /* Subscribe button — disabled, coming soon */
            <div className="space-y-3">
              <button
                onClick={handleSubscribeComingSoon}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-white/40 font-black text-base flex items-center justify-center gap-2 cursor-default"
              >
                <Clock className="w-5 h-5" />
                Coming Soon — {fmt(displayPrice)}/mo
              </button>
              <p className="text-white/20 text-xs text-center">
                Creator subscriptions launching soon with Stripe billing.
              </p>
            </div>
          )}

        </div>
      </div>
    );
  }

  // ── My subscriptions dashboard ─────────────────────────────────────────────
  const activeCount = mySubscriptions.filter(s => s.status === 'active').length;
  const filtered    = tab === 'active'
    ? mySubscriptions.filter(s => s.status === 'active')
    : mySubscriptions;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#0D0D0D]">

      {/* Stats */}
      <div className="px-4 pt-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1C1C1E] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#C8962C]" />
              <p className="text-white/50 text-xs font-bold uppercase tracking-wider">I Subscribe To</p>
            </div>
            <p className="text-white font-black text-3xl">
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-[#C8962C]" /> : activeCount}
            </p>
          </div>
          <div className="bg-[#1C1C1E] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-[#C8962C]" />
              <p className="text-white/50 text-xs font-bold uppercase tracking-wider">My Subscribers</p>
            </div>
            <p className="text-white font-black text-3xl">
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-[#C8962C]" /> : mySubscriberCount}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {[['active', 'Active'], ['all', 'All']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setTab(val)}
              className={`flex-1 py-2 rounded-lg text-sm font-black transition-colors ${
                tab === val ? 'bg-[#C8962C] text-black' : 'text-white/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="px-4 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#1C1C1E] rounded-2xl p-8 flex flex-col items-center text-center">
            <Crown className="w-10 h-10 text-white/10 mb-3" />
            <p className="text-white/50 font-bold text-sm">
              {tab === 'active' ? 'No active subscriptions' : 'No subscriptions yet'}
            </p>
            <p className="text-white/30 text-xs mt-1">
              Creator subscriptions are launching soon.
            </p>
          </div>
        ) : (
          <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-white/5">
            {filtered.map(sub => (
              <SubscriptionRow key={sub.id} sub={sub} />
            ))}
          </div>
        )}
      </div>

      {/* Become a creator CTA */}
      <div className="px-4 pb-8">
        <div className="bg-[#C8962C]/8 border border-[#C8962C]/15 rounded-2xl p-4 flex items-center gap-3">
          <Lock className="w-5 h-5 text-[#C8962C] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm">Want subscribers?</p>
            <p className="text-white/40 text-xs mt-0.5">Creator billing launching soon. Set up your profile now.</p>
          </div>
          <button className="px-3 py-1.5 bg-[#C8962C] text-black font-black text-xs rounded-xl">
            Set up
          </button>
        </div>
      </div>
    </div>
  );
}
