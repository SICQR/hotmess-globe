/**
 * VibeScreen — Vibe archetype + scene/tribe selection.
 * Writes to user_vibes (archetype) and user_tribes (scenes).
 * Both tables use user_email for RLS.
 */
import React, { useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { Loader2 } from 'lucide-react';
import { ProgressDots } from './AgeGateScreen';

const GOLD = '#C8962C';

const VIBES = [
  { emoji: '🔥', label: 'On One', value: 'on_one' },
  { emoji: '🎧', label: 'In The Music', value: 'music_head' },
  { emoji: '👁', label: 'Watching', value: 'observer' },
  { emoji: '⚡', label: "Let's Go", value: 'activator' },
  { emoji: '🌙', label: 'Night Crawler', value: 'night_crawler' },
  { emoji: '🤝', label: 'Connector', value: 'connector' },
];

const SCENES = [
  'Rave', 'Queer', 'Fetish', 'House', 'Techno', 'Jungle',
  'Disco', 'Kink-friendly', 'Sober Curious', 'Bears', 'Masc', 'Leather',
];

const VIBE_LABELS = Object.fromEntries(VIBES.map((v) => [v.value, v.label]));

export default function VibeScreen({ session, onComplete }) {
  const [selectedVibe, setSelectedVibe] = useState(null);
  const [selectedScenes, setSelectedScenes] = useState([]);
  const [loading, setLoading] = useState(false);

  const userEmail = session?.user?.email;
  const userId = session?.user?.id;

  const toggleScene = (scene) => {
    setSelectedScenes((prev) => {
      if (prev.includes(scene)) return prev.filter((s) => s !== scene);
      if (prev.length >= 3) return prev;
      return [...prev, scene];
    });
  };

  const handleSubmit = async (skip = false) => {
    setLoading(true);
    try {
      if (!skip && selectedVibe && userEmail) {
        // Write vibe
        await supabase.from('user_vibes').upsert(
          {
            user_email: userEmail,
            archetype: selectedVibe,
            vibe_title: VIBE_LABELS[selectedVibe],
            traits: selectedScenes,
            last_synthesized: new Date().toISOString(),
            synthesis_count: 1,
          },
          { onConflict: 'user_email' }
        );

        // Write tribes
        for (const scene of selectedScenes) {
          await supabase.from('user_tribes').upsert(
            {
              user_email: userEmail,
              tribe_id: scene,
            },
            { onConflict: 'user_email,tribe_id' }
          );
        }
      }

      // Advance stage
      await supabase
        .from('profiles')
        .update({
          onboarding_stage: 'safety',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      onComplete();
    } catch (err) {
      console.error('[VibeScreen] error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center px-6 overflow-y-auto">
      <div className="w-full max-w-xs py-12">
        <ProgressDots current={4} total={5} />

        <h2 className="text-white text-xl font-bold mb-2">Your Vibe</h2>
        <p className="text-white/40 text-sm mb-6">Pick one</p>

        {/* Vibe grid */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          {VIBES.map((vibe) => {
            const active = selectedVibe === vibe.value;
            return (
              <button
                key={vibe.value}
                onClick={() => setSelectedVibe(vibe.value)}
                className="flex flex-col items-center justify-center py-4 px-2 rounded-lg border-2 transition-all"
                style={{
                  borderColor: active ? GOLD : 'rgba(255,255,255,0.06)',
                  background: active ? 'rgba(200,150,44,0.08)' : 'rgba(255,255,255,0.04)',
                }}
              >
                <span className="text-2xl mb-1">{vibe.emoji}</span>
                <span
                  className="text-xs font-bold tracking-wide"
                  style={{ color: active ? GOLD : 'rgba(255,255,255,0.6)' }}
                >
                  {vibe.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Scene chips */}
        <h3 className="text-white text-base font-bold mb-2">Your Scene</h3>
        <p className="text-white/40 text-xs mb-4">Pick up to 3</p>

        <div className="flex flex-wrap gap-2 mb-10">
          {SCENES.map((scene) => {
            const active = selectedScenes.includes(scene);
            return (
              <button
                key={scene}
                onClick={() => toggleScene(scene)}
                className="px-4 py-2 rounded-lg text-xs font-bold tracking-wide border transition-all"
                style={{
                  borderColor: active ? GOLD : 'rgba(255,255,255,0.1)',
                  color: active ? GOLD : 'rgba(255,255,255,0.5)',
                  background: active ? 'rgba(200,150,44,0.08)' : 'transparent',
                }}
              >
                {scene}
              </button>
            );
          })}
        </div>

        {/* CTAs */}
        <button
          onClick={() => handleSubmit(false)}
          disabled={loading}
          className="w-full py-4 rounded-lg text-black font-bold text-base tracking-wide flex items-center justify-center gap-2 transition-opacity mb-3"
          style={{
            backgroundColor: GOLD,
            opacity: loading ? 0.3 : 1,
          }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
        </button>

        <button
          onClick={() => handleSubmit(true)}
          disabled={loading}
          className="w-full py-3 text-sm font-medium"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
