/**
 * L2CreatorSubscriptionSheet — Creator subscriptions manager
 *
 * Two views depending on props:
 *   - No props (default): "My Subscriptions" — who I subscribe to + my subscriber count
 *   - creatorId prop: Subscribe to a specific creator
 *
 * DB: creator_subscriptions (creator_id UUID, subscriber_id UUID, price_paid, status,
 *                            stripe_subscription_id, started_at, expires_at)
 * Note: creator_id/subscriber_id are auth.users UUIDs.
 */

import { useState, useEffect } from 'react';
import { Star, Users, CheckCircle, XCircle, Loader2, Crown, TrendingUp } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';

const STATUS_STYLE = {
  active: 'text-emerald-400 bg-emerald-400/10',
  cancelled: 'text-red-400 bg-red-400/10',
  expired: 'text-white/30 bg-white/5',
  paused: 'text-amber-400 bg-amber-400/10',
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function SubscriptionRow({ sub }) {
  const statusClass = STATUS_STYLE[sub.status] || 'text-white/30 bg-white/5';
  return (
    <div className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#C8962C]/15 flex items-center justify-center flex-shrink-0">
        <Crown className="w-5 h-5 text-[#C8962C]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm truncate">
          {sub.creator_profile?.display_name || sub.creator_id?.slice(0, 8) || 'Creator'}
        </p>
        <p className="text-white/40 text-xs mt-0.5">
          £{Number(sub.price_paid).toFixed(2)}/mo
          {sub.expires_at && ` · expires ${formatDate(sub.expires_at)}`}
        </p>
      </div>
      <span className={`px-2 py-0.5 rounded-full text-xs font-black ${statusClass}`}>
        {sub.status}
      </span>
    </div>
  );
}

export default function L2CreatorSubscriptionSheet({ creatorId, creatorName, tierPrice }) {
  const [mySubscriptions, setMySubscriptions] = useState([]);
  const [mySubscriberCount, setMySubscriberCount] = useState(0);
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [tab, setTab] = useState('Subscriptions');
  const [currentUser, setCurrentUser] = useState(null);

  const isCreatorView = !!creatorId;

  useEffect(() => {
    loadData();
  }, [creatorId]);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setCurrentUser(user);

    if (isCreatorView) {
      // Check if user already subscribes to this creator
      const { data } = await supabase
        .from('creator_subscriptions')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('subscriber_id', user.id)
        .maybeSingle();
      setExisting(data);
    } else {
      // Load who I subscribe to
      const [subsRes, countRes] = await Promise.all([
        supabase
          .from('creator_subscriptions')
          .select('*')
          .eq('subscriber_id', user.id)
          .order('started_at', { ascending: false }),
        supabase
          .from('creator_subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', user.id)
          .eq('status', 'active'),
      ]);

      if (subsRes.data) setMySubscriptions(subsRes.data);
      if (countRes.count != null) setMySubscriberCount(countRes.count);
    }

    setLoading(false);
  }

  async function handleSubscribe() {
    if (!currentUser || !creatorId) return;
    setSubscribing(true);

    const { error } = await supabase
      .from('creator_subscriptions')
      .insert({
        creator_id: creatorId,
        subscriber_id: currentUser.id,
        price_paid: tierPrice || 4.99,
        status: 'active',
        started_at: new Date().toISOString(),
      });

    setSubscribing(false);
    if (!error) loadData();
  }

  async function handleCancel() {
    if (!existing) return;
    setCancelling(true);

    await supabase
      .from('creator_subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', existing.id);

    setCancelling(false);
    loadData();
  }

  // ─── Creator-specific view ─────────────────────────────────────────────────
  if (isCreatorView) {
    const isActive = existing?.status === 'active';

    return (
      <div className="flex flex-col h-full overflow-y-auto bg-[#0D0D0D]">
        <div className="px-4 pt-4 pb-6">

          {/* Creator header */}
          <div className="bg-[#C8962C]/10 border border-[#C8962C]/20 rounded-2xl p-5 flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#C8962C]/20 flex items-center justify-center mb-3">
              <Crown className="w-8 h-8 text-[#C8962C]" />
            </div>
            <p className="text-white font-black text-lg">{creatorName || 'Creator'}</p>
            <p className="text-white/50 text-sm mt-1">Subscribe for exclusive content</p>
          </div>

          {/* Tier card */}
          <div className="bg-[#1C1C1E] rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-black">Monthly Access</p>
              <div className="flex items-baseline gap-1">
                <span className="text-[#C8962C] font-black text-2xl">
                  £{(tierPrice || 4.99).toFixed(2)}
                </span>
                <span className="text-white/30 text-sm">/mo</span>
              </div>
            </div>
            <div className="space-y-2">
              {['Exclusive posts & updates', 'Direct messaging priority', 'Early event access'].map(perk => (
                <div key={perk} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#C8962C] flex-shrink-0" />
                  <span className="text-white/70 text-sm">{perk}</span>
                </div>
              ))}
            </div>
          </div>

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
                    Since {formatDate(existing.started_at)}
                    {existing.expires_at && ` · renews ${formatDate(existing.expires_at)}`}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full py-3 bg-white/5 rounded-2xl text-red-400 font-black text-sm flex items-center justify-center gap-2"
              >
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Cancel Subscription
              </button>
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              className="w-full py-4 bg-[#C8962C] rounded-2xl text-black font-black text-base flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {subscribing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Star className="w-5 h-5" />}
              Subscribe — £{(tierPrice || 4.99).toFixed(2)}/mo
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── My subscriptions view (no creatorId prop) ─────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#0D0D0D]">

      {/* Stats row */}
      <div className="px-4 pt-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1C1C1E] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#C8962C]" />
              <p className="text-white/50 text-xs font-bold uppercase tracking-wider">Subscriptions</p>
            </div>
            <p className="text-white font-black text-3xl">
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-[#C8962C]" /> : mySubscriptions.filter(s => s.status === 'active').length}
            </p>
          </div>
          <div className="bg-[#1C1C1E] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-[#C8962C]" />
              <p className="text-white/50 text-xs font-bold uppercase tracking-wider">Subscribers</p>
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
          {['Subscriptions', 'All'].map(t => (
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

      <div className="px-4 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
          </div>
        ) : mySubscriptions.length === 0 ? (
          <div className="bg-[#1C1C1E] rounded-2xl p-8 flex flex-col items-center text-center">
            <Crown className="w-10 h-10 text-white/10 mb-3" />
            <p className="text-white/50 font-bold text-sm">No subscriptions yet</p>
            <p className="text-white/30 text-xs mt-1">
              Subscribe to creators to get exclusive content and updates.
            </p>
          </div>
        ) : (
          <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-white/5">
            {mySubscriptions
              .filter(s => tab === 'All' || s.status === 'active')
              .map(sub => (
                <SubscriptionRow key={sub.id} sub={sub} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
