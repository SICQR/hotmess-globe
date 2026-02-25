import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Home, Car, Building, HelpCircle, Sparkles, X } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

const DURATIONS = [
  { value: 30,  label: '30 min' },
  { value: 60,  label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 480, label: 'Tonight' },
];

const LOGISTICS = [
  { value: 'can_host',    label: 'Can host',   icon: Home },
  { value: 'can_travel',  label: 'Can travel', icon: Car },
  { value: 'hotel',       label: 'Hotel',      icon: Building },
  { value: 'undecided',   label: 'Undecided',  icon: HelpCircle },
];

export default function RightNowModal({ isOpen, onClose }) {
  const [duration, setDuration]   = useState(60);
  const [logistics, setLogistics] = useState([]);
  const [coldVibe, setColdVibe]   = useState(false);
  const [loading, setLoading]     = useState(false);

  const toggleLogistics = (val) =>
    setLogistics(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  const goLive = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Not logged in'); return; }

      const expires_at = new Date(Date.now() + duration * 60 * 1000).toISOString();

      // Write to right_now_status TABLE (not profiles.right_now_status JSONB)
      const { error } = await supabase
        .from('right_now_status')
        .upsert({
          user_email: user.email,
          intent: 'explore', // valid intent value
          timeframe: duration < 60 ? `${duration}m` : `${duration/60}h`,
          active: true,
          updated_at: new Date().toISOString(),
          expires_at,
          preferences: {
            logistics,
            cold_vibe: coldVibe,
          },
        }, { onConflict: 'user_email' });

      if (error) throw error;
      toast.success("You're live! Auto-expires in " + (duration < 60 ? `${duration}m` : `${duration/60}h`));
      onClose?.();
    } catch (err) {
      toast.error(err.message || 'Failed to go live');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-[150] flex items-end justify-center pb-8 px-4"
          onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full max-w-sm bg-[#1C1C1E] rounded-3xl p-6 border border-[#C8962C]/20"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#C8962C]" />
                <span className="text-white font-black text-lg uppercase">Go Right Now</span>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/60">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Duration */}
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Duration</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {DURATIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setDuration(value)}
                  className={`py-3 rounded-2xl text-sm font-black transition-all ${
                    duration === value
                      ? 'bg-[#C8962C] text-black'
                      : 'bg-black/40 border border-white/10 text-white/60'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Logistics */}
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Logistics</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {LOGISTICS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => toggleLogistics(value)}
                  className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all ${
                    logistics.includes(value)
                      ? 'bg-[#C8962C]/20 border border-[#C8962C] text-[#C8962C]'
                      : 'bg-black/40 border border-white/10 text-white/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Cold Vibe */}
            <button
              onClick={() => setColdVibe(prev => !prev)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl mb-5 border transition-all ${
                coldVibe ? 'bg-green-500/10 border-green-500/50' : 'bg-black/40 border-white/10'
              }`}
            >
              <Sparkles className={`w-4 h-4 flex-shrink-0 ${coldVibe ? 'text-green-400' : 'text-white/30'}`} />
              <div className="text-left">
                <p className={`text-xs font-black uppercase ${coldVibe ? 'text-green-400' : 'text-white/50'}`}>Cold Vibe Mode</p>
                <p className="text-[10px] text-white/30">Cali Sober · Emerald glow on globe</p>
              </div>
              <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${coldVibe ? 'bg-green-500 border-green-500' : 'border-white/20'}`}>
                {coldVibe && <div className="w-2 h-2 bg-black rounded-full" />}
              </div>
            </button>

            <button
              onClick={goLive}
              disabled={loading}
              className="w-full py-4 bg-[#C8962C] text-black font-black rounded-2xl uppercase disabled:opacity-60"
            >
              {loading ? 'Going live...' : 'Go Live'}
            </button>
            <p className="text-[10px] text-white/20 text-center mt-3">Ends automatically. No ghost status.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
