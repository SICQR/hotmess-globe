import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Check, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/components/utils/supabaseClient';

const TIER_COLORS = { seed: 'text-white/50', grow: 'text-green-400', scale: 'text-cyan-400', live: 'text-[#FF1493]' };
const TIER_COSTS = { seed: 0, grow: 50, scale: 200, live: 500 };

export default function CadencePanel() {
  const [cities, setCities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionPending, setActionPending] = useState(null);

  useEffect(() => { fetchCities(); }, []);

  const fetchCities = async () => {
    const { data } = await supabase.from('city_cadence').select('*, city:cities(id, name)').order('revenue_30d', { ascending: false });
    setCities(data || []);
    setIsLoading(false);
  };

  const handleApprove = async (cityId) => {
    setActionPending(cityId);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.rpc('approve_cadence_escalation', { p_city_id: cityId, p_admin_id: user.id });
    await fetchCities();
    setActionPending(null);
  };

  const handleReject = async (cityId) => {
    setActionPending(cityId);
    await supabase.from('city_cadence').update({ pending_escalation: null }).eq('city_id', cityId);
    await fetchCities();
    setActionPending(null);
  };

  if (isLoading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black mb-2">Cadence Control</h1>
        <p className="text-white/60 mb-8">Revenue-tied ingestion escalation</p>
        {cities.filter(c => c.pending_escalation).length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2"><AlertTriangle size={20} />Pending Approvals</h2>
            {cities.filter(c => c.pending_escalation).map(city => (
              <div key={city.id} className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-4 mb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{city.city?.name}</div>
                    <div className="text-sm text-white/60">{city.current_tier} → <span className={TIER_COLORS[city.pending_escalation]}>{city.pending_escalation}</span></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-red-400/50 text-red-400" onClick={() => handleReject(city.city_id)} disabled={actionPending === city.city_id}><X size={16} /></Button>
                    <Button size="sm" className="bg-green-500" onClick={() => handleApprove(city.city_id)} disabled={actionPending === city.city_id}><Check size={16} /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-white/10"><th className="text-left p-4 text-sm text-white/60">City</th><th className="text-left p-4 text-sm text-white/60">Tier</th><th className="text-right p-4 text-sm text-white/60">Revenue</th><th className="text-right p-4 text-sm text-white/60">Cost</th><th className="text-right p-4 text-sm text-white/60">Engagement</th><th className="text-center p-4 text-sm text-white/60">ROI</th></tr></thead>
            <tbody>
              {cities.map(city => {
                const cost = TIER_COSTS[city.current_tier];
                const roi = cost > 0 ? ((city.revenue_30d - cost) / cost * 100).toFixed(0) : '∞';
                return (
                  <tr key={city.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 font-semibold">{city.city?.name}</td>
                    <td className="p-4"><span className={`font-bold uppercase ${TIER_COLORS[city.current_tier]}`}>{city.current_tier}</span></td>
                    <td className="p-4 text-right">£{city.revenue_30d?.toLocaleString()}</td>
                    <td className="p-4 text-right text-white/60">£{cost}</td>
                    <td className="p-4 text-right">{(city.signal_engagement_rate * 100).toFixed(1)}%</td>
                    <td className="p-4 text-center"><div className={`flex items-center justify-center gap-1 ${city.revenue_30d > cost ? 'text-green-400' : 'text-red-400'}`}>{city.revenue_30d > cost ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{roi}%</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
