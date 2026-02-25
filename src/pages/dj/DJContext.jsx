import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Radio, Calendar, MapPin, Disc, Shield } from 'lucide-react';
import { DJ_ARCHETYPES, getVisibility } from '@/lib/dj/archetypes';

/**
 * DJ Context Page
 * 
 * This page ONLY appears via:
 * - Radio show
 * - Event
 * - Globe pulse
 * 
 * DJs are never browsable directly.
 */
export default function DJContext() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [dj, setDJ] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // Check entry point - must come from valid context
  useEffect(() => {
    const validEntryPoints = ['radio', 'event', 'globe'];
    const entryPoint = location.state?.from;
    
    if (!entryPoint || !validEntryPoints.includes(entryPoint)) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    // Mock DJ data - in production, fetch from API
    const mockDJ = {
      id,
      name: 'DJ Context',
      archetype: 'SCENE_ANCHOR',
      primaryCity: 'london',
      bio: 'A mood architect. A cultural translator. A local signal amplifier.',
      upcomingMoments: [
        { type: 'radio', title: 'Wake The Mess', date: '2026-02-05', city: 'London' },
        { type: 'event', title: 'MESS @ Fabric', date: '2026-02-10', city: 'London' },
      ],
      pastContext: [
        { type: 'radio', title: 'The Mess (Night)', date: '2026-01-20' },
      ],
      cityAffinities: {
        london: 0.9,
        berlin: 0.4,
      },
      labels: ['Scene Records'],
    };

    // Check visibility
    const visibility = getVisibility(mockDJ, { 
      entryPoint,
      city: location.state?.city,
    });

    if (visibility === 'hidden') {
      setAccessDenied(true);
    } else {
      setDJ({ ...mockDJ, visibility });
    }
    
    setLoading(false);
  }, [id, location.state]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C8962C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <Shield className="w-16 h-16 text-white/20 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Context Required</h1>
        <p className="text-white/50 text-center max-w-md mb-6">
          DJs appear through radio, events, or globe pulses. 
          They are experienced in context, not browsed in isolation.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 bg-[#C8962C] text-black font-bold rounded-full hover:bg-[#B5851D] transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const archetype = DJ_ARCHETYPES[dj?.archetype];

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
          <div>
            <p className="text-[10px] text-[#C8962C] uppercase tracking-widest">
              {archetype?.name || 'DJ'}
            </p>
            <h1 className="text-xl font-bold text-white">{dj?.name}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* DJ Manifesto Quote */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 border border-[#C8962C]/20 rounded-lg bg-[#C8962C]/5"
        >
          <p className="text-white/70 italic text-lg leading-relaxed">
            "{dj?.bio}"
          </p>
          <p className="text-white/40 text-sm mt-2">— The HOTMESS DJ Manifesto</p>
        </motion.div>

        {/* City Affinity */}
        <div className="mb-8">
          <h2 className="text-xs text-white/50 uppercase tracking-widest mb-3">City Presence</h2>
          <div className="flex gap-2">
            {Object.entries(dj?.cityAffinities || {}).map(([city, affinity]) => (
              <div 
                key={city}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-full"
              >
                <MapPin className="w-4 h-4 text-[#C8962C]" />
                <span className="text-white capitalize">{city}</span>
                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#C8962C]"
                    style={{ width: `${affinity * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Moments */}
        {dj?.upcomingMoments?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs text-white/50 uppercase tracking-widest mb-3">Upcoming Moments</h2>
            <div className="space-y-3">
              {dj.upcomingMoments.map((moment, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                  onClick={() => navigate(
                    moment.type === 'radio' ? '/radio' : `/events/${moment.id || ''}`,
                    { state: { from: 'dj' } }
                  )}
                >
                  {moment.type === 'radio' ? (
                    <Radio className="w-5 h-5 text-green-500" />
                  ) : (
                    <Calendar className="w-5 h-5 text-yellow-500" />
                  )}
                  <div className="flex-1">
                    <p className="text-white font-medium">{moment.title}</p>
                    <p className="text-white/40 text-sm">{moment.date} • {moment.city}</p>
                  </div>
                  <span className="text-xs text-[#C8962C] uppercase">{moment.type}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Past Context (Limited) */}
        {dj?.pastContext?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs text-white/50 uppercase tracking-widest mb-3">Recent Context</h2>
            <div className="flex gap-2 flex-wrap">
              {dj.pastContext.slice(0, 3).map((ctx, i) => (
                <span 
                  key={i}
                  className="px-3 py-1 bg-white/5 text-white/60 text-sm rounded-full"
                >
                  {ctx.title} • {ctx.date}
                </span>
              ))}
            </div>
            <p className="text-white/30 text-xs mt-2">
              Limited history shown. DJs are moments, not archives.
            </p>
          </div>
        )}

        {/* Labels */}
        {dj?.labels?.length > 0 && (
          <div>
            <h2 className="text-xs text-white/50 uppercase tracking-widest mb-3">Label Affiliations</h2>
            <div className="flex gap-2">
              {dj.labels.map((label, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-full"
                >
                  <Disc className="w-4 h-4 text-purple-500" />
                  <span className="text-white">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visibility Notice */}
        {dj?.visibility === 'reduced' && (
          <div className="mt-8 p-4 border border-white/10 rounded-lg">
            <p className="text-white/40 text-sm">
              This DJ's visibility is currently reduced to protect underground credibility.
              They will reappear naturally through future moments.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
