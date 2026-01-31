import { useState, useEffect } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

const CityReadiness = () => {
  const [cities, setCities] = useState([]);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => { loadReadiness(); }, []);

  const loadReadiness = async () => {
    const { data } = await supabase.from('city_readiness').select('*').order('score', { ascending: false });
    const latest = {};
    for (const c of data || []) { if (!latest[c.city] || new Date(c.calculated_at) > new Date(latest[c.city].calculated_at)) latest[c.city] = c; }
    setCities(Object.values(latest).sort((a, b) => b.score - a.score));
  };

  const recalculate = async (city) => {
    setCalculating(true);
    await supabase.rpc('calculate_city_readiness', { p_city: city });
    await loadReadiness();
    setCalculating(false);
  };

  const launchRecommended = (score) => score >= 70;

  return (
    <div className="p-6 bg-black min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-4">City Readiness Index (CRI)</h1>
      <div className="space-y-3">
        {cities.map(c => (
          <div key={c.city} className="bg-gray-900 p-4 rounded-lg flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{c.city} <span className={launchRecommended(c.score) ? 'text-green-400' : 'text-yellow-400'}>{launchRecommended(c.score) ? '✓ Launch Ready' : '⏳ Building'}</span></h3>
              <p className="text-sm text-gray-400">Confidence: {c.confidence} | Trend: {c.trend}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-pink-500">{c.score?.toFixed(0)}</p>
              <button onClick={() => recalculate(c.city)} disabled={calculating} className="text-xs text-gray-500 hover:text-white">Recalculate</button>
            </div>
          </div>
        ))}
        {cities.length === 0 && <p className="text-gray-500">No readiness data. Run calculations.</p>}
      </div>
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Calculate New City</h2>
        <div className="flex gap-2">
          {['london','berlin','paris','tokyo','nyc','los_angeles','san_francisco','sydney'].filter(c => !cities.find(x => x.city === c)).map(c => (
            <button key={c} onClick={() => recalculate(c)} className="bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-sm">{c}</button>
          ))}
        </div>
      </div>
    </div>
  );
};
export default CityReadiness;
