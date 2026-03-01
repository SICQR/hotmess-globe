import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/components/utils/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Globe, Radio, TrendingUp, Users, Zap, 
  Activity, Target, Eye, RefreshCw 
} from 'lucide-react';

const CITIES = [
  { id: 'london', name: 'London', flag: '🇬🇧', color: '#C8962C' },
  { id: 'berlin', name: 'Berlin', flag: '🇩🇪', color: '#00D9FF' },
  { id: 'paris', name: 'Paris', flag: '🇫🇷', color: '#C8962C' },
  { id: 'tokyo', name: 'Tokyo', flag: '🇯🇵', color: '#FF6B35' },
  { id: 'nyc', name: 'New York', flag: '🇺🇸', color: '#39FF14' },
  { id: 'los_angeles', name: 'Los Angeles', flag: '🇺🇸', color: '#FFD700' },
  { id: 'san_francisco', name: 'San Francisco', flag: '🇺🇸', color: '#00D9FF' },
];

const BusinessGlobe = () => {
  const navigate = useNavigate();
  const [cityHeat, setCityHeat] = useState([]);
  const [radioSignals, setRadioSignals] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [selectedCity, setSelectedCity] = useState('london');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCityData();
  }, [selectedCity]);

  const loadCityData = async () => {
    setLoading(true);
    try {
      const { data: tiles } = await supabase
        .from('globe_heat_tiles')
        .select('*')
        .eq('city', selectedCity)
        .eq('k_threshold_met', true)
        .order('window_end', { ascending: false })
        .limit(20);
      setCityHeat(tiles || []);

      const { data: signals } = await supabase
        .from('radio_signals')
        .select('*')
        .eq('city', selectedCity)
        .gt('expires_at', new Date().toISOString());
      setRadioSignals(signals || []);

      const { data: cri } = await supabase
        .from('city_readiness')
        .select('*')
        .eq('city', selectedCity)
        .order('calculated_at', { ascending: false })
        .limit(1);
      setReadiness(cri?.[0] || null);
    } catch (error) {
      console.error('Failed to load city data:', error);
    }
    setLoading(false);
  };

  const currentCity = CITIES.find(c => c.id === selectedCity) || CITIES[0];
  const readinessScore = readiness?.score || 0;
  const readinessColor = readinessScore >= 70 ? '#39FF14' : readinessScore >= 40 ? '#FFD700' : '#FF6B35';

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button onClick={() => navigate(-1)} variant="ghost" className="mb-4 text-white/60">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black uppercase flex items-center gap-3">
                <Globe className="w-10 h-10 text-[#C8962C]" />
                Business <span className="text-[#C8962C]">Globe</span>
              </h1>
              <p className="text-white/60">Real-time city activity and signal analytics</p>
            </div>
            <Button onClick={loadCityData} variant="outline" className="border-white/20">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* City Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-8"
        >
          {CITIES.map((city) => (
            <button
              key={city.id}
              onClick={() => setSelectedCity(city.id)}
              className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
                selectedCity === city.id
                  ? 'text-black'
                  : 'bg-white/5 border border-white/20 hover:bg-white/10'
              }`}
              style={selectedCity === city.id ? { backgroundColor: city.color } : {}}
            >
              <span>{city.flag}</span>
              <span>{city.name}</span>
            </button>
          ))}
        </motion.div>

        {/* City Readiness Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-white/5 to-white/10 border border-white/20 rounded-xl p-6 mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">{currentCity.flag}</span>
                <div>
                  <h2 className="text-2xl font-black uppercase">{currentCity.name}</h2>
                  <p className="text-white/60 text-sm">City Readiness Index</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div>
                  <span className="text-white/60 text-sm">Confidence</span>
                  <p className="font-bold">{readiness?.confidence || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-white/60 text-sm">Trend</span>
                  <p className="font-bold flex items-center gap-1">
                    {readiness?.trend === 'up' && <TrendingUp className="w-4 h-4 text-[#39FF14]" />}
                    {readiness?.trend || 'Stable'}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div 
                className="text-6xl font-black"
                style={{ color: readinessColor }}
              >
                {readinessScore.toFixed(0)}
              </div>
              <div className="text-white/60 text-sm">/100</div>
              <div className="w-32 h-3 bg-white/10 rounded-full mt-2 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: readinessColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${readinessScore}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Activity, label: 'Heat Tiles', value: cityHeat.length, color: '#C8962C' },
            { icon: Radio, label: 'Active Signals', value: radioSignals.length, color: '#00D9FF' },
            { icon: Users, label: 'Active Users', value: Math.floor(readinessScore * 12), color: '#39FF14' },
            { icon: Target, label: 'Hotspots', value: cityHeat.filter(t => t.intensity > 0.7).length, color: '#FFD700' },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4"
            >
              <stat.icon className="w-6 h-6 mb-2" style={{ color: stat.color }} />
              <div className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-xs text-white/60 uppercase">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Data Panels */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Heat Tiles */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/5 border border-white/10 rounded-xl p-6"
          >
            <h3 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#C8962C]" />
              Heat Tiles
            </h3>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-white/5 rounded animate-pulse" />
                ))}
              </div>
            ) : cityHeat.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No active heat tiles</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cityHeat.slice(0, 8).map((tile, idx) => (
                  <div key={tile.id || idx} className="flex items-center justify-between p-3 bg-black/40 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: `hsl(${(1 - tile.intensity) * 120}, 100%, 50%)` }}
                      />
                      <span className="font-mono text-sm">{tile.tile_id || `Tile ${idx + 1}`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#C8962C] font-bold">{(tile.intensity * 100).toFixed(0)}%</span>
                      <Zap className="w-4 h-4 text-[#FFD700]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Radio Signals */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white/5 border border-white/10 rounded-xl p-6"
          >
            <h3 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
              <Radio className="w-5 h-5 text-[#00D9FF]" />
              Radio Signals
            </h3>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-white/5 rounded animate-pulse" />
                ))}
              </div>
            ) : radioSignals.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <Radio className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No active signals</p>
              </div>
            ) : (
              <div className="space-y-2">
                {radioSignals.slice(0, 8).map((signal, idx) => (
                  <div key={signal.id || idx} className="flex items-center justify-between p-3 bg-black/40 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Radio className="w-4 h-4 text-[#00D9FF] animate-pulse" />
                      <div>
                        <span className="font-bold text-sm">{signal.signal_type || 'Signal'}</span>
                        {signal.expires_at && (
                          <p className="text-xs text-white/40">
                            Expires {new Date(signal.expires_at).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[#00D9FF] font-bold">{(signal.intensity * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex gap-4 mt-8"
        >
          <Button 
            onClick={() => navigate('/business/amplify')}
            className="flex-1 bg-[#C8962C] text-black font-bold py-6"
          >
            <Target className="w-5 h-5 mr-2" />
            Launch Amplification
          </Button>
          <Button 
            onClick={() => navigate('/business/insights')}
            variant="outline"
            className="flex-1 border-white/20 py-6"
          >
            <Eye className="w-5 h-5 mr-2" />
            View Insights
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default BusinessGlobe;
