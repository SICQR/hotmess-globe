/**
 * L2GoLiveSheet — Unified "Go Live" entry point.
 *
 * One tap → visible on Ghosted + Pulse + optional radio/movement.
 * This is the system switch that makes everything connect.
 */

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Radio, Navigation, X, Eye, EyeOff } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { useLiveMode } from '@/contexts/LiveModeContext';
import { useRadio } from '@/contexts/RadioContext';
import { supabase } from '@/components/utils/supabaseClient';
import { hapticMedium, hapticLight } from '@/lib/haptics';
import { toast } from 'sonner';

const AMBER = '#C8962C';

const VIBES = [
  { key: 'hookup', label: 'Looking', color: '#FF5500' },
  { key: 'hang', label: 'Chill', color: '#00C2E0' },
  { key: 'explore', label: 'Explore', color: '#A899D8' },
  { key: 'aftercare', label: 'Aftercare', color: '#34C759' },
];

export default function L2GoLiveSheet() {
  const { closeSheet } = useSheet();
  const { isLive, enterLive, exitLive, liveContext } = useLiveMode();
  const { isPlaying: radioPlaying, togglePlay: toggleRadio, currentShowName } = useRadio();

  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
  const [joinRadio, setJoinRadio] = useState(radioPlaying);
  const [shareMovement, setShareMovement] = useState(false);
  const [going, setGoing] = useState(false);

  // If already live, show exit state
  if (isLive) {
    return (
      <div className="px-5 pt-6 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: `${AMBER}20` }}
          >
            <Zap className="w-5 h-5" style={{ color: AMBER }} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">You're live</h2>
            <p className="text-xs text-white/50">People nearby can see you</p>
          </div>
        </div>

        {/* Live stats */}
        <div
          className="rounded-xl p-4 mb-4"
          style={{ background: `${AMBER}08`, border: `1px solid ${AMBER}15` }}
        >
          <p className="text-xs font-semibold text-white/40 mb-1">Context</p>
          <p className="text-sm font-bold text-white">
            {liveContext?.venueName || liveContext?.areaLabel || liveContext?.radioShowName || 'Nearby'}
          </p>
        </div>

        <p className="text-[10px] text-white/30 mb-4 text-center">
          Sharing approximate location · You can stop anytime
        </p>

        <button
          onClick={() => {
            hapticLight();
            exitLive();
            closeSheet();
            toast('Stopped being live');
          }}
          className="w-full h-12 rounded-2xl text-sm font-bold bg-white/10 text-white active:scale-95 transition-all border border-white/10"
        >
          Stop being live
        </button>
      </div>
    );
  }

  const handleGoLive = async () => {
    if (going) return;
    setGoing(true);
    hapticMedium();

    try {
      // Write right_now_status
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

        await supabase.from('right_now_status').upsert({
          user_id: session.user.id,
          intention: selectedVibe || 'explore',
          expires_at: expiresAt,
        }, { onConflict: 'user_id' });

        // Enter live mode
        enterLive({
          type: 'global',
          areaLabel: 'Nearby',
        });

        // Start radio if opted in and not already playing
        if (joinRadio && !radioPlaying) {
          toggleRadio();
        }

        // Start movement sharing if opted in
        if (shareMovement) {
          await supabase.from('movement_sessions').upsert({
            user_id: session.user.id,
            status: 'active',
            visibility: 'public_live',
            started_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        }
      }

      toast('You\'re live');
      closeSheet();
    } catch {
      toast('Failed to go live');
    }
    setGoing(false);
  };

  return (
    <div className="px-5 pt-6 pb-8">
      {/* Header */}
      <h2 className="text-xl font-black text-white mb-1">Go Live</h2>
      <p className="text-sm text-white/40 mb-6">Show up on Ghosted and Pulse nearby</p>

      {/* Vibe selector */}
      <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Share your vibe</p>
      <div className="grid grid-cols-2 gap-2 mb-6">
        {VIBES.map(v => {
          const active = selectedVibe === v.key;
          return (
            <button
              key={v.key}
              onClick={() => {
                hapticLight();
                setSelectedVibe(active ? null : v.key);
              }}
              className="h-11 rounded-xl text-sm font-bold active:scale-95 transition-all"
              style={{
                background: active ? `${v.color}20` : 'rgba(255,255,255,0.04)',
                color: active ? v.color : 'rgba(255,255,255,0.4)',
                border: `1px solid ${active ? `${v.color}40` : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              {v.label}
            </button>
          );
        })}
      </div>

      {/* Optional: Join Radio */}
      <div className="space-y-2 mb-6">
        <button
          onClick={() => {
            hapticLight();
            setJoinRadio(!joinRadio);
          }}
          className="w-full flex items-center gap-3 p-3 rounded-xl active:bg-white/5 transition-colors"
          style={{
            background: joinRadio ? 'rgba(0,194,224,0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${joinRadio ? 'rgba(0,194,224,0.2)' : 'rgba(255,255,255,0.06)'}`,
          }}
        >
          <Radio className="w-4 h-4" style={{ color: joinRadio ? '#00C2E0' : 'rgba(255,255,255,0.3)' }} />
          <span className="text-sm font-semibold" style={{ color: joinRadio ? '#00C2E0' : 'rgba(255,255,255,0.4)' }}>
            Join Radio{currentShowName ? ` · ${currentShowName}` : ''}
          </span>
        </button>

        <button
          onClick={() => {
            hapticLight();
            setShareMovement(!shareMovement);
          }}
          className="w-full flex items-center gap-3 p-3 rounded-xl active:bg-white/5 transition-colors"
          style={{
            background: shareMovement ? `${AMBER}08` : 'rgba(255,255,255,0.03)',
            border: `1px solid ${shareMovement ? `${AMBER}20` : 'rgba(255,255,255,0.06)'}`,
          }}
        >
          <Navigation className="w-4 h-4" style={{ color: shareMovement ? AMBER : 'rgba(255,255,255,0.3)' }} />
          <span className="text-sm font-semibold" style={{ color: shareMovement ? AMBER : 'rgba(255,255,255,0.4)' }}>
            Share movement
          </span>
        </button>
      </div>

      {/* Privacy disclosure */}
      <p className="text-[10px] text-white/25 mb-4 text-center">
        Sharing approximate location · You can stop anytime
      </p>

      {/* CTA */}
      <button
        onClick={handleGoLive}
        disabled={going}
        className="w-full h-12 rounded-2xl text-sm font-bold active:scale-95 transition-all"
        style={{ background: AMBER, color: '#000' }}
      >
        {going ? 'Going live...' : 'Go Live'}
      </button>
    </div>
  );
}
