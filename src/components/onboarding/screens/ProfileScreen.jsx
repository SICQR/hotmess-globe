import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

const PRONOUNS = ['he/him','they/them','he/they','any'];
const ORIENTATIONS = ['Gay','Bisexual','Queer','Pansexual','Fluid'];
const BODY_TYPES = ['Slim','Athletic','Average','Muscular','Stocky','Chubby'];
const ETHNICITIES = ['White','Black','Asian','Latino','Middle Eastern','South Asian','Mixed','Other'];

const Pill = ({label, active, onPress}) => (
  <motion.button whileTap={{scale:0.97}} onClick={onPress}
    className={`px-3 py-1.5 rounded-full text-sm font-bold border transition-all ${
      active ? 'bg-[#C8962C] text-black border-[#C8962C]' : 'bg-white/5 text-white/60 border-white/15'
    }`}>{label}</motion.button>
);

export default function ProfileScreen({ onNext, onSkip }) {
  const [pronouns, setPronouns] = useState('');
  const [orientation, setOrientation] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [ethnicity, setEthnicity] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggleEth = (e) => setEthnicity(p => p.includes(e) ? p.filter(x=>x!==e) : [...p,e]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const attrs = {};
      if (pronouns) attrs.pronouns = pronouns;
      if (orientation) attrs.sexual_orientation = orientation;
      if (bodyType) attrs.body_type = bodyType;
      if (heightCm) attrs.height_cm = parseInt(heightCm);
      if (ethnicity.length) attrs.ethnicity = ethnicity;
      await supabase.from('profiles').upsert({
        id: user.id, public_attributes: attrs,
        onboarding_stage: 'profile_complete', updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      onNext?.();
    } catch { toast.error('Could not save. Try again.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col h-full px-6 pt-8 pb-6 overflow-y-auto">
      <h1 className="text-2xl font-black text-white mb-1">About you</h1>
      <p className="text-white/40 text-sm mb-6">Optional. Skip anything you're not ready for.</p>
      <div className="space-y-6 flex-1">
        {[
          {label:'Pronouns', items:PRONOUNS, val:pronouns, set:setPronouns},
          {label:'Orientation', items:ORIENTATIONS, val:orientation, set:setOrientation},
          {label:'Body type', items:BODY_TYPES, val:bodyType, set:setBodyType},
        ].map(({label,items,val,set}) => (
          <div key={label}>
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-2">{label}</p>
            <div className="flex flex-wrap gap-2">
              {items.map(i => <Pill key={i} label={i} active={val===i} onPress={()=>set(v=>v===i?'':i)} />)}
            </div>
          </div>
        ))}
        <div>
          <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-2">Height (cm)</p>
          <input type="number" min="140" max="220" value={heightCm} onChange={e=>setHeightCm(e.target.value)}
            placeholder="175" className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white w-32 outline-none focus:border-[#C8962C]/50" />
        </div>
        <div>
          <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-2">Ethnicity</p>
          <div className="flex flex-wrap gap-2">
            {ETHNICITIES.map(e => <Pill key={e} label={e} active={ethnicity.includes(e)} onPress={()=>toggleEth(e)} />)}
          </div>
        </div>
      </div>
      <div className="space-y-3 pt-6">
        <button onClick={handleSubmit} disabled={saving}
          className="w-full py-4 bg-[#C8962C] text-black font-black rounded-2xl disabled:opacity-50">
          {saving ? 'Saving…' : 'Continue'}
        </button>
        <button onClick={onSkip} className="w-full py-3 text-white/40 text-sm">Skip for now</button>
      </div>
    </div>
  );
}
