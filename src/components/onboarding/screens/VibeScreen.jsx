/**
 * VibeScreen — Vibe archetype + scene/tribe selection.
 * Writes to user_vibes (archetype) and user_tribes (scenes).
 * Both tables use user_email for RLS.
 */
import React, { useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { Loader2 } from 'lucide-react';
import { ProgressDots } from './AgeGateScreen';
import OnboardingBackButton from '../OnboardingBackButton';

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
  'Rave','House','Techno','Jungle','Disco','UK Garage','Bass','Deep House','Ambient',
  'Queer','Bears','Masc','Twinks','Daddies','Otters','Cubs','Muscles','Jocks',
  'Fetish','Kink-friendly','Leather','Rubber','Gear','Military','Sportswear','Underwear','Pup Play',
  'Sober Curious','Cali Sober','Fitness','Circuit','Alternative','Spiritual',
  'Networking','Travel Buddy','After Party','Clubbing',
];

const VIBE_LABELS = Object.fromEntries(VIBES.map((v) => [v.value, v.label]));

export default function VibeScreen({ session, onComplete, onBack }) {
  const [selectedVibe, setSelectedVibe] = useState(null);
  const [selectedScenes, setSelectedScenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [age, setAge] = useState('');
  const [position, setPosition] = useState('');
  const [lookingFor, setLookingFor] = useState([]);
  const [relationshipStatus, setRelationshipStatus] = useState('');
  const [timeHorizon, setTimeHorizon] = useState('');
  const [bio, setBio] = useState('');

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
      if (selectedVibe && userEmail) {
        await supabase.from('user_vibes').upsert({
          user_email: userEmail, archetype: selectedVibe, vibe_title: VIBE_LABELS[selectedVibe], traits: selectedScenes,
        }, { onConflict: 'user_email' });
      }
      for (const scene of selectedScenes) {
        await supabase.from('user_tribes').upsert({
          user_email: userEmail, tribe_id: scene.toLowerCase().replace(/\s+/g,'-'),
        }, { onConflict: 'user_email,tribe_id' });
      }
      await supabase.from('profiles').upsert({
        id: userId,
        bio: bio.trim() || null,
        public_attributes: {
          age: age ? parseInt(age) : undefined,
          position: position || undefined,
          looking_for: lookingFor.length ? lookingFor : undefined,
          relationship_status: relationshipStatus || undefined,
          time_horizon: timeHorizon || undefined,
          vibe: selectedVibe || undefined,
          scenes: selectedScenes,
        },
        onboarding_stage: 'vibe_complete',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      await supabase.from('personas')
        .update({ position, looking_for: lookingFor, tags: selectedScenes })
        .eq('user_id', userId).eq('is_default', true);
      onComplete();
    } catch (err) {
      console.error('[VibeScreen] error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center px-6 overflow-y-auto">
      <OnboardingBackButton onBack={onBack} />
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

        <div className="mt-6 space-y-5">
          <h3 className="text-white font-black text-lg">About you</h3>
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Age</p>
            <input type="number" min="18" max="99" value={age} onChange={e=>setAge(e.target.value)}
              placeholder="25" className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white w-24 outline-none focus:border-[#C8962C]/50" />
          </div>
          {[
            {label:'Position', key:'position', set:setPosition, val:position, opts:['Top','Vers Top','Versatile','Vers Bottom','Bottom','Side','No preference'], single:true},
            {label:'Looking for (max 3)', key:'looking_for', opts:['Hookups','Dates','Friends','Relationship','Networking'], multi:true},
            {label:'Relationship status', key:'relationship_status', set:setRelationshipStatus, val:relationshipStatus, opts:['Single','Open','Partnered'], single:true},
            {label:'Available', key:'time_horizon', set:setTimeHorizon, val:timeHorizon, opts:['Right Now','Tonight','Ongoing'], single:true},
          ].map(({label,key,set,val,opts,single,multi})=>(
            <div key={key}>
              <p className="text-white/50 text-xs uppercase tracking-wider mb-2">{label}</p>
              <div className="flex flex-wrap gap-2">
                {opts.map(o=>(
                  <button key={o} onClick={()=>{
                    if(single) set(v=>v===o?'':o);
                    else if(multi) setLookingFor(p=>p.includes(o)?p.filter(x=>x!==o):p.length<3?[...p,o]:p);
                  }} className={`px-3 py-1.5 rounded-full text-sm font-bold border transition-all ${
                    (single?val===o:lookingFor.includes(o))
                      ?'bg-[#C8962C] text-black border-[#C8962C]'
                      :'bg-white/5 text-white/60 border-white/15'
                  }`}>{o}</button>
                ))}
              </div>
            </div>
          ))}
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Bio (optional)</p>
            <textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={500}
              placeholder="Say something about yourself…"
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#C8962C]/50 resize-none" rows={3} />
            <p className="text-white/20 text-xs mt-1 text-right">{bio.length}/500</p>
          </div>
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
