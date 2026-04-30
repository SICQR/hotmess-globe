import { useState, useEffect } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

const ICONS = {
  globe_glow: '🌟',
  profile_bump: '🚀',
  vibe_blast: '📡',
  incognito_week: '🕶️',
  extra_beacon_drop: '📍',
  highlighted_message: '✉️'
};

export default function L2BoostShopSheet() {
  const [types, setTypes] = useState([]);
  const [active, setActive] = useState(new Set());
  const [expiry, setExpiry] = useState({});
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      let { data: { user } } = await supabase.auth.getUser();
      const [{ data: bt }, { data: ab }] = await Promise.all([
        supabase.from('user_boost_types').select('*').order('price_pence'),
        supabase.from('user_active_boosts').select('boost_key,expires_at').eq('user_id', user.id).gt('expires_at', new Date().toISOString()),
      ]);
      setTypes(bt || []);
      setActive(new Set((ab || []).map(b => b.boost_key)));
      const exp = {};
      (ab || []).forEach(b => { exp[b.boost_key] = new Date(b.expires_at); });
      setExpiry(exp);
    } catch (e) {
      console.error('load boosts error', e);
    }
    setLoading(false);
  };

  const buy = async (key) => {
    setBuying(key);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch('/api/stripe/create-boost-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ boostKey: key }),
      });
      const json = await r.json();
      if (json.error) {
        // Hide developer env-var errors from users
        if (json.error.includes('env var') || json.error.includes('STRIPE_BOOST') || json.error.includes('PRICE_ID')) {
          toast('This is being finished now', { icon: '⚡' });
        } else {
          toast.error(json.error);
        }
        return;
      }
      window.location.href = json.url;
    } catch { toast('This is being finished now', { icon: '⚡' }); }
    finally { setBuying(null); }
  };

  const fmt = (p) => `£${(p / 100).toFixed(2)}`;
  const fmtExp = (d) => {
    const m = Math.round((d - Date.now()) / 60000);
    return m < 60 ? `${m}m left` : m < 1440 ? `${Math.round(m / 60)}h left` : `${Math.round(m / 1440)}d left`;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[#C8962C] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-xl font-black text-white">POWER-UPS</h2>
        <p className="text-white/40 text-sm mt-0.5">One-time purchases. No subscription needed.</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-3">
        {types.length === 0 && (
          <div className="text-center py-12 text-white/30 text-sm">No power-ups available yet.</div>
        )}
        {types.map(b => {
          const isActive = active.has(b.key);
          return (
            <div key={b.key} className={`rounded-2xl border p-4 ${isActive ? 'border-[#39FF14]/30 bg-[#39FF14]/5' : 'border-white/10 bg-white/5'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3 items-start flex-1 min-w-0">
                  <span className="text-2xl">{ICONS[b.key] || '⚡'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-black">{b.label}</p>
                      {b.duration_hours && (
                        <span className="text-[10px] text-white/40 border border-white/15 rounded-full px-2 py-0.5">
                          {b.duration_hours < 24 ? `${b.duration_hours}h` : b.duration_hours === 168 ? '7 days' : `${b.duration_hours}h`}
                        </span>
                      )}
                    </div>
                    <p className="text-white/50 text-sm mt-0.5 leading-snug">{b.description}</p>
                    {isActive && expiry[b.key] && (
                      <p className="text-[#39FF14] text-xs font-bold mt-1">✓ ACTIVE — {fmtExp(expiry[b.key])}</p>
                    )}
                  </div>
                </div>
                {isActive
                  ? <span className="px-3 py-1.5 bg-[#39FF14]/20 text-[#39FF14] text-xs font-black rounded-xl shrink-0">ACTIVE</span>
                  : <button onClick={() => buy(b.key)} disabled={!!buying}
                      className="px-4 py-2 bg-[#C8962C] text-black font-black text-sm rounded-xl shrink-0 disabled:opacity-50">
                      {buying === b.key ? '…' : fmt(b.price_pence)}
                    </button>
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

