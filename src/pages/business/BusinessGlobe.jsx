import { useState, useEffect } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

const BusinessGlobe = () => {
  const [cityHeat, setCityHeat] = useState([]);
  const [radioSignals, setRadioSignals] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [selectedCity, setSelectedCity] = useState('london');

  useEffect(() => {
    loadCityData();
  }, [selectedCity]);

  const loadCityData = async () => {
    const { data: tiles } = await supabase.from('globe_heat_tiles').select('*').eq('city', selectedCity).eq('k_threshold_met', true).order('window_end', { ascending: false }).limit(20);
    setCityHeat(tiles || []);
    const { data: signals } = await supabase.from('radio_signals').select('*').eq('city', selectedCity).gt('expires_at', new Date().toISOString());
    setRadioSignals(signals || []);
    const { data: cri } = await supabase.from('city_readiness').select('*').eq('city', selectedCity).order('calculated_at', { ascending: false }).limit(1);
    setReadiness(cri?.[0] || null);
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-4">Business Globe — {selectedCity}</h1>
      <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="bg-gray-800 p-2 rounded mb-6">
        {['london','berlin','paris','tokyo','nyc','los_angeles','san_francisco'].map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      {readiness && (
        <div className="bg-gray-900 p-4 rounded-lg mb-6">
          <h2 className="text-xl">City Readiness: <span className="text-pink-500">{readiness.score?.toFixed(0)}/100</span></h2>
          <p className="text-sm text-gray-400">Confidence: {readiness.confidence} | Trend: {readiness.trend}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Heat Tiles ({cityHeat.length})</h3>
          {cityHeat.slice(0, 5).map(t => <div key={t.id} className="text-sm text-gray-300">{t.tile_id}: {t.intensity?.toFixed(2)}</div>)}
        </div>
        <div className="bg-gray-900 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Radio Signals ({radioSignals.length})</h3>
          {radioSignals.slice(0, 5).map(s => <div key={s.id} className="text-sm text-gray-300">{s.signal_type}: {s.intensity?.toFixed(2)}</div>)}
        </div>
      </div>
    </div>
  );
};
export default BusinessGlobe;
