import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Disc, Radio, MapPin, Sparkles, ArrowRight } from 'lucide-react';

/**
 * Records Page
 * 
 * Editorial moments, not a catalog.
 * Records are treated as moments, not tracks.
 */
export default function Records() {
  const navigate = useNavigate();
  const [activeCity, setActiveCity] = useState('all');

  // Mock editorial moments
  const moments = [
    {
      id: '1',
      type: 'release',
      title: 'Night Frequency EP',
      label: 'Scene Records',
      labelId: 'scene-records',
      city: 'london',
      description: 'A defining moment in London\'s underground scene.',
      date: '2026-01-15',
      featured: true,
      linkedDJs: ['DJ Scene'],
      linkedEvents: ['Scene Night @ Fabric'],
    },
    {
      id: '2',
      type: 'radio_premiere',
      title: 'First Play: Midnight Protocol',
      label: 'Export Label',
      labelId: 'export-label',
      city: 'berlin',
      description: 'World premiere on The Mess (Night).',
      date: '2026-01-20',
      show: 'The Mess (Night)',
    },
    {
      id: '3',
      type: 'city_resonance',
      title: 'Tokyo ↔ London Connection',
      description: 'Cross-city resonance detected in listener patterns.',
      cities: ['tokyo', 'london'],
      date: '2026-01-22',
    },
    {
      id: '4',
      type: 'release',
      title: 'Berlin Nights Compilation',
      label: 'Cult Imprint',
      labelId: 'cult-imprint',
      city: 'berlin',
      description: 'Limited pressing. Taste-driven selection.',
      date: '2026-01-25',
      limited: true,
    },
  ];

  const cities = [
    { id: 'all', name: 'All Cities' },
    { id: 'london', name: 'London' },
    { id: 'berlin', name: 'Berlin' },
    { id: 'tokyo', name: 'Tokyo' },
    { id: 'paris', name: 'Paris' },
  ];

  const filteredMoments = activeCity === 'all' 
    ? moments 
    : moments.filter(m => m.city === activeCity || m.cities?.includes(activeCity));

  const getMomentIcon = (type) => {
    switch (type) {
      case 'release': return Disc;
      case 'radio_premiere': return Radio;
      case 'city_resonance': return MapPin;
      default: return Sparkles;
    }
  };

  const getMomentColor = (type) => {
    switch (type) {
      case 'release': return 'purple';
      case 'radio_premiere': return 'green';
      case 'city_resonance': return 'pink';
      default: return 'white';
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-black text-white mb-2">Records</h1>
          <p className="text-white/50">
            Moments, not tracks. Context, not catalog.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* City filter */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 hide-scrollbar">
          {cities.map(city => (
            <button
              key={city.id}
              onClick={() => setActiveCity(city.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCity === city.id
                  ? 'bg-pink-500 text-black'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {city.name}
            </button>
          ))}
        </div>

        {/* Editorial intro */}
        <div className="mb-8 p-6 border border-white/10 rounded-lg">
          <p className="text-white/70 text-lg leading-relaxed">
            Records on HOTMESS are not uploads. They are <span className="text-pink-500">moments</span>—
            discovered through radio, experienced at events, resonating across cities.
            Every release appears because something is happening.
          </p>
        </div>

        {/* Moments grid */}
        <div className="space-y-6">
          {filteredMoments.map((moment, i) => {
            const Icon = getMomentIcon(moment.type);
            const color = getMomentColor(moment.type);
            
            return (
              <motion.div
                key={moment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`p-6 rounded-xl border transition-all cursor-pointer ${
                  moment.featured 
                    ? `border-${color}-500/50 bg-${color}-500/5 hover:bg-${color}-500/10`
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
                onClick={() => {
                  if (moment.labelId) {
                    navigate(`/label/${moment.labelId}`, { state: { from: 'release' } });
                  }
                }}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full bg-${color}-500/20 flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-6 h-6 text-${color}-500`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs text-${color}-500 uppercase tracking-widest`}>
                        {moment.type.replace('_', ' ')}
                      </span>
                      {moment.featured && (
                        <span className="px-2 py-0.5 bg-pink-500 text-black text-[10px] font-bold uppercase rounded-full">
                          Featured
                        </span>
                      )}
                      {moment.limited && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] uppercase rounded-full">
                          Limited
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-1">{moment.title}</h3>
                    
                    {moment.label && (
                      <p className="text-white/60 text-sm mb-2">{moment.label}</p>
                    )}
                    
                    <p className="text-white/50 mb-4">{moment.description}</p>
                    
                    <div className="flex items-center gap-4 text-sm">
                      {moment.city && (
                        <span className="flex items-center gap-1 text-white/40">
                          <MapPin className="w-4 h-4" />
                          <span className="capitalize">{moment.city}</span>
                        </span>
                      )}
                      {moment.cities && (
                        <span className="flex items-center gap-1 text-white/40">
                          <MapPin className="w-4 h-4" />
                          {moment.cities.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(' ↔ ')}
                        </span>
                      )}
                      <span className="text-white/30">{moment.date}</span>
                    </div>

                    {/* Linked context */}
                    {(moment.linkedDJs?.length > 0 || moment.linkedEvents?.length > 0 || moment.show) && (
                      <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-2">
                        {moment.linkedDJs?.map(dj => (
                          <span key={dj} className="px-3 py-1 bg-pink-500/10 text-pink-400 text-xs rounded-full">
                            DJ: {dj}
                          </span>
                        ))}
                        {moment.linkedEvents?.map(event => (
                          <span key={event} className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded-full">
                            Event: {event}
                          </span>
                        ))}
                        {moment.show && (
                          <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs rounded-full">
                            Radio: {moment.show}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <ArrowRight className="w-5 h-5 text-white/20" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* No uploads notice */}
        <div className="mt-12 text-center py-8 border-t border-white/5">
          <p className="text-white/30 text-sm">
            No open uploads. Everything here is contextual.
          </p>
        </div>
      </div>
    </div>
  );
}
