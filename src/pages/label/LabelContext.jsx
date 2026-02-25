import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Disc, Calendar, MapPin, Users, Shield } from 'lucide-react';
import { LABEL_ARCHETYPES, getLabelVisibility } from '@/lib/dj/labels';

/**
 * Label Context Page
 * 
 * Labels appear via:
 * - Release moments
 * - DJ context
 * - Events
 * - Radio
 * 
 * Labels are partners, not advertisers.
 */
export default function LabelContext() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [label, setLabel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const validEntryPoints = ['release', 'dj_context', 'event', 'radio'];
    const entryPoint = location.state?.from;
    
    if (!entryPoint || !validEntryPoints.includes(entryPoint)) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    // Mock label data
    const mockLabel = {
      id,
      name: 'Scene Records',
      archetype: 'SCENE_LABEL',
      description: 'Local. Physical + digital. Event-integrated.',
      primaryCity: 'london',
      releases: [
        { id: '1', title: 'Night Frequency EP', artist: 'Various', date: '2026-01-15', type: 'EP' },
        { id: '2', title: 'London Calling', artist: 'DJ Scene', date: '2026-01-01', type: 'Single' },
      ],
      roster: [
        { id: '1', name: 'DJ Scene', archetype: 'scene_anchor' },
        { id: '2', name: 'The Selector', archetype: 'cult_translator' },
      ],
      upcomingEvents: [
        { id: '1', title: 'Scene Night', date: '2026-02-15', city: 'London', venue: 'Fabric' },
      ],
      cityResonance: {
        london: 0.95,
        berlin: 0.4,
        paris: 0.3,
      },
    };

    const visibility = getLabelVisibility(mockLabel, { entryPoint });
    
    if (visibility === 'hidden') {
      setAccessDenied(true);
    } else {
      setLabel({ ...mockLabel, visibility });
    }
    
    setLoading(false);
  }, [id, location.state]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <Shield className="w-16 h-16 text-white/20 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Context Required</h1>
        <p className="text-white/50 text-center max-w-md mb-6">
          Labels appear through releases, DJs, events, or radio.
          They are partners, not advertisers.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 bg-purple-500 text-black font-bold rounded-full hover:bg-purple-400 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const archetype = LABEL_ARCHETYPES[label?.archetype];

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Disc className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-[10px] text-purple-500 uppercase tracking-widest">
                {archetype?.name || 'Label'}
              </p>
              <h1 className="text-xl font-bold text-white">{label?.name}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-white/70 text-lg">{label?.description}</p>
          {archetype?.value && (
            <div className="flex gap-2 mt-4">
              {archetype.value.map((v, i) => (
                <span key={i} className="px-3 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-full">
                  {v.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {/* City Resonance */}
        <div className="mb-8">
          <h2 className="text-xs text-white/50 uppercase tracking-widest mb-3">City Resonance</h2>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(label?.cityResonance || {}).map(([city, resonance]) => (
              <div key={city} className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-purple-500" />
                  <span className="text-white capitalize">{city}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${resonance * 100}%` }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Releases */}
        {label?.releases?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs text-white/50 uppercase tracking-widest mb-3">Recent Moments</h2>
            <div className="space-y-3">
              {label.releases.map((release, i) => (
                <motion.div
                  key={release.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="w-12 h-12 bg-purple-500/20 rounded flex items-center justify-center">
                    <Disc className="w-6 h-6 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{release.title}</p>
                    <p className="text-white/40 text-sm">{release.artist} • {release.date}</p>
                  </div>
                  <span className="text-xs text-purple-500/60 uppercase">{release.type}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Roster */}
        {label?.roster?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs text-white/50 uppercase tracking-widest mb-3">Roster</h2>
            <div className="flex gap-3 flex-wrap">
              {label.roster.map((dj) => (
                <div
                  key={dj.id}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full cursor-pointer transition-colors"
                  onClick={() => navigate(`/dj/${dj.id}`, { state: { from: 'dj_context' } })}
                >
                  <Users className="w-4 h-4 text-[#C8962C]" />
                  <span className="text-white">{dj.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        {label?.upcomingEvents?.length > 0 && (
          <div>
            <h2 className="text-xs text-white/50 uppercase tracking-widest mb-3">Upcoming Events</h2>
            <div className="space-y-3">
              {label.upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                  onClick={() => navigate(`/events/${event.id}`, { state: { from: 'event' } })}
                >
                  <Calendar className="w-5 h-5 text-yellow-500" />
                  <div className="flex-1">
                    <p className="text-white font-medium">{event.title}</p>
                    <p className="text-white/40 text-sm">{event.date} • {event.venue}, {event.city}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Protected visibility note for cult imprints */}
        {label?.visibility === 'protected' && (
          <div className="mt-8 p-4 border border-purple-500/20 bg-purple-500/5 rounded-lg">
            <p className="text-purple-400/80 text-sm">
              Protected visibility. This label's presence is curated to maintain underground credibility.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
