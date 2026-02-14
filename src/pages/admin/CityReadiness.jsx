import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/components/utils/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Globe, TrendingUp, TrendingDown, Minus, RefreshCw,
  CheckCircle, Clock, AlertTriangle, MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import logger from '@/utils/logger';

const CITY_FLAGS = {
  london: '🇬🇧', berlin: '🇩🇪', paris: '🇫🇷', tokyo: '🇯🇵',
  nyc: '🇺🇸', los_angeles: '🇺🇸', san_francisco: '🇺🇸', sydney: '🇦🇺',
  amsterdam: '🇳🇱', barcelona: '🇪🇸', madrid: '🇪🇸', manchester: '🇬🇧',
};

const ALL_CITIES = ['london', 'berlin', 'paris', 'tokyo', 'nyc', 'los_angeles', 'san_francisco', 'sydney', 'amsterdam', 'barcelona'];

const CityReadiness = () => {
  const navigate = useNavigate();
  const [cities, setCities] = useState([]);
  const [calculating, setCalculating] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadReadiness(); }, []);

  const loadReadiness = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('city_readiness').select('*').order('score', { ascending: false });
      const latest = {};
      for (const c of data || []) { 
        if (!latest[c.city] || new Date(c.calculated_at) > new Date(latest[c.city].calculated_at)) {
          latest[c.city] = c;
        }
      }
      setCities(Object.values(latest).sort((a, b) => b.score - a.score));
    } catch (error) {
      logger.error('Failed to load readiness:', error);
    }
    setLoading(false);
  };

  const recalculate = async (city) => {
    setCalculating(city);
    try {
      await supabase.rpc('calculate_city_readiness', { p_city: city });
      await loadReadiness();
      toast.success(`${city} recalculated`);
    } catch (error) {
      toast.error('Calculation failed');
    }
    setCalculating(null);
  };

  const getStatusColor = (score) => {
    if (score >= 70) return '#39FF14';
    if (score >= 40) return '#FFD700';
    return '#FF6B35';
  };

  const getStatusLabel = (score) => {
    if (score >= 70) return { text: 'Launch Ready', icon: CheckCircle };
    if (score >= 40) return { text: 'Building', icon: Clock };
    return { text: 'Early Stage', icon: AlertTriangle };
  };

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-[#39FF14]" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-[#FF6B35]" />;
    return <Minus className="w-4 h-4 text-white/40" />;
  };

  const uncalculatedCities = ALL_CITIES.filter(c => !cities.find(x => x.city === c));

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      <div className="max-w-5xl mx-auto">
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
                <Globe className="w-10 h-10 text-[#00D9FF]" />
                City <span className="text-[#00D9FF]">Readiness</span>
              </h1>
              <p className="text-white/60">Monitor launch readiness across all cities</p>
            </div>
            <Button onClick={loadReadiness} variant="outline" className="border-white/20">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          <div className="bg-[#39FF14]/10 border border-[#39FF14]/30 rounded-xl p-4 text-center">
            <div className="text-3xl font-black text-[#39FF14]">
              {cities.filter(c => c.score >= 70).length}
            </div>
            <div className="text-sm text-white/60">Launch Ready</div>
          </div>
          <div className="bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-xl p-4 text-center">
            <div className="text-3xl font-black text-[#FFD700]">
              {cities.filter(c => c.score >= 40 && c.score < 70).length}
            </div>
            <div className="text-sm text-white/60">Building</div>
          </div>
          <div className="bg-[#FF6B35]/10 border border-[#FF6B35]/30 rounded-xl p-4 text-center">
            <div className="text-3xl font-black text-[#FF6B35]">
              {cities.filter(c => c.score < 40).length}
            </div>
            <div className="text-sm text-white/60">Early Stage</div>
          </div>
        </motion.div>

        {/* City List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3 mb-8"
        >
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
            ))
          ) : cities.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-xl">
              <Globe className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/60">No readiness data. Calculate cities below.</p>
            </div>
          ) : (
            cities.map((city, idx) => {
              const status = getStatusLabel(city.score);
              const StatusIcon = status.icon;
              
              return (
                <motion.div
                  key={city.city}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.05 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{CITY_FLAGS[city.city] || '🌍'}</div>
                      <div>
                        <h3 className="text-xl font-black uppercase flex items-center gap-2">
                          {city.city.replace('_', ' ')}
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                            style={{ 
                              backgroundColor: `${getStatusColor(city.score)}20`,
                              color: getStatusColor(city.score)
                            }}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {status.text}
                          </span>
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-white/60">
                          <span className="flex items-center gap-1">
                            Confidence: <strong>{city.confidence || 'N/A'}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            Trend: {getTrendIcon(city.trend)}
                          </span>
                          <span>
                            Updated: {city.calculated_at ? new Date(city.calculated_at).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div 
                          className="text-4xl font-black"
                          style={{ color: getStatusColor(city.score) }}
                        >
                          {city.score?.toFixed(0)}
                        </div>
                        <div className="text-xs text-white/40">/100</div>
                      </div>
                      <div className="w-24">
                        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: getStatusColor(city.score) }}
                            initial={{ width: 0 }}
                            animate={{ width: `${city.score}%` }}
                            transition={{ duration: 0.5, delay: 0.3 + idx * 0.05 }}
                          />
                        </div>
                      </div>
                      <Button 
                        onClick={() => recalculate(city.city)}
                        disabled={calculating === city.city}
                        variant="ghost"
                        size="sm"
                        className="text-white/60 hover:text-white"
                      >
                        <RefreshCw className={`w-4 h-4 ${calculating === city.city ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>

        {/* Calculate New Cities */}
        {uncalculatedCities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/5 border border-white/10 rounded-xl p-6"
          >
            <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#B026FF]" />
              Calculate New Cities
            </h2>
            <div className="flex flex-wrap gap-2">
              {uncalculatedCities.map(city => (
                <Button
                  key={city}
                  onClick={() => recalculate(city)}
                  disabled={calculating === city}
                  variant="outline"
                  className="border-white/20"
                >
                  <span className="mr-2">{CITY_FLAGS[city] || '🌍'}</span>
                  {city.replace('_', ' ')}
                  {calculating === city && <RefreshCw className="w-3 h-3 ml-2 animate-spin" />}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CityReadiness;
