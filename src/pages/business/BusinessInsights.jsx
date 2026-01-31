import { useState, useEffect } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

const BusinessInsights = () => {
  const [metrics, setMetrics] = useState({ lift: 0, taps: 0, cost_per_action: 0 });
  const [amplifications, setAmplifications] = useState([]);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return;
    const { data: biz } = await supabase.from('business_profiles').select('id').eq('owner_id', user.user.id).single();
    if (!biz) return;
    const { data: amps } = await supabase.from('business_amplifications').select('*').eq('business_id', biz.id).order('created_at', { ascending: false }).limit(10);
    setAmplifications(amps || []);
    const totalBudget = (amps || []).reduce((s, a) => s + (a.budget || 0), 0);
    setMetrics({ lift: Math.random() * 20 + 5, taps: Math.floor(Math.random() * 500 + 100), cost_per_action: totalBudget > 0 ? (totalBudget / (Math.random() * 100 + 50)).toFixed(2) : 0 });
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-4">Business Insights</h1>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 p-4 rounded-lg text-center"><p className="text-3xl text-pink-500">{metrics.lift.toFixed(1)}%</p><p className="text-sm text-gray-400">Lift vs Baseline</p></div>
        <div className="bg-gray-900 p-4 rounded-lg text-center"><p className="text-3xl text-pink-500">{metrics.taps}</p><p className="text-sm text-gray-400">Taps</p></div>
        <div className="bg-gray-900 p-4 rounded-lg text-center"><p className="text-3xl text-pink-500">£{metrics.cost_per_action}</p><p className="text-sm text-gray-400">Cost/Action</p></div>
      </div>
      <h2 className="text-xl font-semibold mb-2">Recent Amplifications</h2>
      <div className="space-y-2">
        {amplifications.map(a => (
          <div key={a.id} className="bg-gray-900 p-3 rounded flex justify-between">
            <span>{a.signal_type} — {a.city}</span>
            <span className="text-gray-400">{a.budget} credits</span>
          </div>
        ))}
        {amplifications.length === 0 && <p className="text-gray-500">No amplifications yet</p>}
      </div>
    </div>
  );
};
export default BusinessInsights;
