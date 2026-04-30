import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, Info, Sparkles, Rocket, Ghost, ShoppingBag, Radio, Loader2, HeartPulse } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

const BEACON_TYPES = [
  { id: 'social', label: 'Social', icon: Ghost, color: '#C8962C' },
  { id: 'event', label: 'Event', icon: Rocket, color: '#FF4F9A' },
  { id: 'market', label: 'Market', icon: ShoppingBag, color: '#FFD700' },
  { id: 'recovery', label: 'Recovery', icon: HeartPulse, color: '#FFFFFF' },
  { id: 'radio', label: 'Radio', icon: Radio, color: '#B026FF' },
];


export default function BeaconDropModal({ isOpen, onClose, onComplete }) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('social');
  const [loading, setLoading] = useState(false);

  const handleDrop = async () => {
    if (!title.trim()) {
      toast.error('Give your beacon a title');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current location
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
          enableHighAccuracy: true, 
          timeout: 10000 
        });
      });

      const { latitude: lat, longitude: lng } = pos.coords;
      
      if (kind === 'recovery') {
        // Permanent Cultural Anchor
        const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 5);
        const { error } = await supabase.from('pulse_places').insert({
          slug,
          name: title.trim(),
          type: 'recovery',
          lat,
          lng,
          priority: 50,
          is_active: true,
          notes: 'Community-dropped recovery resource',
          tier: 'community',
          subscription_status: 'active'
        });
        if (error) throw error;
        toast.success('Permanent Recovery Resource added to the globe!');
      } else {
        // Temporary Beacon
        const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
        const { error } = await supabase.from('beacons').insert({
          owner_id: user.id,
          title: title.trim(),
          type: kind, 
          geo_lat: lat,
          geo_lng: lng,
          starts_at: new Date().toISOString(),
          ends_at: expiresAt,
          intensity: 80,
          visibility: 'public',
          code: `B44-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          metadata: { title: title.trim() }
        });
        if (error) throw error;
        toast.success('Beacon dropped on the globe!');
      }

      onComplete?.();
      onClose();
    } catch (err) {
      console.error('Beacon drop error:', err);
      if (err.code === 1) {
        toast.error('Location denied. Please enable GPS permissions to drop a beacon.');
      } else if (err.code === 3) {
        toast.error('Location timeout. Please try again.');
      } else {
        toast.error('Failed to drop beacon. Ensure GPS is enabled.');
      }
    } finally {

      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100) onClose();
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[101] bg-[#0A0A0A] border-t border-white/10 rounded-t-[32px] px-6 pt-4 pb-[calc(80px+env(safe-area-inset-bottom,20px))]"
          >

            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#C8962C]/10 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[#C8962C]" />
                </div>
                <h3 className="text-xl font-black italic tracking-tight text-white uppercase">Drop Beacon</h3>
              </div>
              <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/40">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-8 flex gap-3">
              <Info className="w-5 h-5 text-[#C8962C] flex-shrink-0 mt-0.5" />
              <p className="text-white/60 text-xs leading-relaxed">
                Dropping a beacon alerts other members to your location for the next <span className="text-white">4 hours</span>. 
                Use this to find friends or coordinate meetups.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-3 block">Beacon Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 20))}
                  placeholder="What's happening?"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white text-lg font-bold focus:border-[#C8962C]/50 outline-none transition-all placeholder:text-white/10"
                />
                <div className="flex justify-end mt-2">
                  <span className="text-[10px] font-mono text-white/20">{title.length}/20</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-3 block">Beacon Kind</label>
                <div className="grid grid-cols-5 gap-2">

                  {BEACON_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setKind(type.id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                        kind === type.id 
                          ? 'bg-white/10 border-white/20 scale-[1.02]' 
                          : 'bg-transparent border-transparent grayscale opacity-40'
                      }`}
                    >
                      <type.icon className="w-5 h-5" style={{ color: kind === type.id ? type.color : 'white' }} />
                      <span className="text-[9px] font-black uppercase tracking-wider text-white">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleDrop}
                disabled={loading || !title.trim()}
                className="w-full h-16 bg-[#C8962C] disabled:bg-white/10 disabled:text-white/20 rounded-2xl text-black font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all"
                style={{ boxShadow: !loading && title.trim() ? '0 10px 40px -10px rgba(200, 150, 44, 0.5)' : 'none' }}
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Drop Signal
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
