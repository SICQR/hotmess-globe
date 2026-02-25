/**
 * L2LocationSheet — Location settings
 * Set home city, location sharing precision, proximity radius.
 */

import { useState, useEffect } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PRECISION_OPTIONS = [
  { value: 'exact', label: 'Exact', desc: 'Shows your precise location (±100m)' },
  { value: 'approximate', label: 'Approximate', desc: 'Rounds to ~1km (recommended)' },
  { value: 'hidden', label: 'Hidden', desc: 'Others see no distance at all' },
];

const RADIUS_OPTIONS = [1, 2, 5, 10, 25, 50];

export default function L2LocationSheet() {
  const [city, setCity] = useState('');
  const [precision, setPrecision] = useState('approximate');
  const [radius, setRadius] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('profiles')
        .select('location, location_precision, discovery_radius')
        .eq('id', user.id)
        .single();
      if (data) {
        setCity(data.location || '');
        setPrecision(data.location_precision || 'approximate');
        setRadius(data.discovery_radius || 10);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('profiles').update({
        location: city.trim() || null,
        location_precision: precision,
        discovery_radius: radius,
      }).eq('id', user.id);
      toast.success('Location settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const detectLocation = () => {
    setDetecting(true);
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
          );
          const data = await res.json();
          const detected = data.address?.city || data.address?.town || data.address?.county || '';
          setCity(detected);
          toast.success(`Detected: ${detected}`);
        } catch {
          toast.error('Could not determine city');
        } finally {
          setDetecting(false);
        }
      },
      () => {
        toast.error('Location access denied');
        setDetecting(false);
      }
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* City */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">
            Your City
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="London, Berlin, Amsterdam..."
                className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C8962C]/60"
              />
            </div>
            <button
              onClick={detectLocation}
              disabled={detecting}
              className="w-12 h-12 bg-[#1C1C1E] border border-white/10 rounded-xl flex items-center justify-center hover:border-[#C8962C]/40 transition-colors disabled:opacity-50"
            >
              {detecting
                ? <Loader2 className="w-4 h-4 text-[#C8962C] animate-spin" />
                : <Navigation className="w-4 h-4 text-white/40" />}
            </button>
          </div>
        </div>

        {/* Precision */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-3">
            Location Precision
          </label>
          <div className="space-y-2">
            {PRECISION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPrecision(opt.value)}
                className={cn(
                  'w-full px-4 py-3 rounded-xl text-left flex items-center justify-between transition-all border',
                  precision === opt.value
                    ? 'bg-[#C8962C]/15 border-[#C8962C]/30 text-[#C8962C]'
                    : 'bg-[#1C1C1E] border-white/5 text-white/60'
                )}
              >
                <div>
                  <p className="font-bold text-sm">{opt.label}</p>
                  <p className={cn('text-xs mt-0.5', precision === opt.value ? 'text-[#C8962C]/70' : 'text-white/30')}>{opt.desc}</p>
                </div>
                {precision === opt.value && <span className="text-[#C8962C] flex-shrink-0">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Discovery radius */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-3">
            Discovery Radius
          </label>
          <div className="flex gap-2 flex-wrap">
            {RADIUS_OPTIONS.map(r => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-bold transition-all',
                  radius === r
                    ? 'bg-[#C8962C] text-black'
                    : 'bg-[#1C1C1E] text-white/50 border border-white/8'
                )}
              >
                {r}km
              </button>
            ))}
          </div>
        </div>

      </div>

      <div className="px-4 py-4 border-t border-white/8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl py-4 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            : 'Save Location Settings'}
        </button>
      </div>
    </div>
  );
}
