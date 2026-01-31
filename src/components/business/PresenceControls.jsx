/**
 * Business Presence Controls
 * Controls heat, amplification, signal moments
 */

import React from 'react';
import { Flame, Zap, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBusinessPresence, useAmplification, useCreateSignal } from '@/hooks/useBusiness';

const SIGNAL_TYPES = [
  { value: 'doors_open', label: 'Doors Open', icon: '🚪', duration: 30 },
  { value: 'peak_hour', label: 'Peak Hour', icon: '🔥', duration: 60 },
  { value: 'final_call', label: 'Final Call', icon: '⏰', duration: 30 },
  { value: 'tonight_only', label: 'Tonight Only', icon: '✨', duration: 90 },
];

export function PresenceControls({ businessId }) {
  const { presence, isLoading } = useBusinessPresence(businessId);
  const { startAmplification, stopAmplification, isPending: ampPending } = useAmplification(businessId);
  const { createSignal, isPending: signalPending } = useCreateSignal();

  if (isLoading) return <div className="animate-pulse h-32 bg-white/5 rounded-xl" />;

  const heatLevel = presence?.heat_score || 0;
  const isAmplified = presence?.is_amplified;
  const isLandmark = presence?.is_landmark;
  const heatColor = heatLevel > 75 ? 'text-red-400' : heatLevel > 50 ? 'text-yellow-400' : heatLevel > 25 ? 'text-cyan-400' : 'text-white/50';

  const handleAmplify = async () => {
    if (isAmplified) await stopAmplification();
    else await startAmplification(2, 1.5);
  };

  const handleSignal = async (type) => {
    const st = SIGNAL_TYPES.find(s => s.value === type);
    if (!st) return;
    await createSignal({ businessId, signalType: type, startsAt: new Date().toISOString(), durationMinutes: st.duration, intensity: 70 });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center ${heatColor}`}><Flame size={20} /></div>
          <div>
            <div className="text-sm text-white/60">Current Heat</div>
            <div className={`text-2xl font-black ${heatColor}`}>{heatLevel}%</div>
          </div>
        </div>
        {isLandmark && <div className="px-2 py-1 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black text-[10px] font-bold uppercase">⭐ Landmark</div>}
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full transition-all ${heatLevel > 75 ? 'bg-red-500' : heatLevel > 50 ? 'bg-yellow-500' : 'bg-cyan-500'}`} style={{ width: `${heatLevel}%` }} />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-white/10">
        <div className="flex items-center gap-2">
          <Zap size={16} className={isAmplified ? 'text-yellow-400' : 'text-white/40'} />
          <span className="text-sm text-white/70">Amplification</span>
        </div>
        <Button size="sm" variant={isAmplified ? 'outline' : 'default'} onClick={handleAmplify} disabled={ampPending}>
          {isAmplified ? 'Stop' : 'Amplify'}
        </Button>
      </div>
      <div className="pt-2 border-t border-white/10">
        <div className="flex items-center gap-2 mb-3"><TrendingUp size={16} className="text-white/40" /><span className="text-sm text-white/70">Signal Moments</span></div>
        <div className="grid grid-cols-2 gap-2">
          {SIGNAL_TYPES.map((s) => (
            <Button key={s.value} size="sm" variant="outline" className="border-white/10 justify-start" onClick={() => handleSignal(s.value)} disabled={signalPending}>
              <span className="mr-2">{s.icon}</span>{s.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PresenceControls;
