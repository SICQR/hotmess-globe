import { useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

export default function PinSetupScreen({ onNext, onSkip }) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phase, setPhase] = useState('enter');
  const [saving, setSaving] = useState(false);

  const hashPin = async (p) => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  };

  const handleDigit = (d) => {
    if (phase === 'enter') {
      const n = pin + d; setPin(n);
      if (n.length === 4) setPhase('confirm');
    } else {
      const n = confirm + d; setConfirm(n);
      if (n.length === 4) handleConfirm(n);
    }
  };

  const handleConfirm = async (confirmPin) => {
    if (pin !== confirmPin) {
      toast.error("PINs don't match"); setPhase('enter'); setPin(''); setConfirm(''); return;
    }
    setSaving(true);
    try {
      const hash = await hashPin(pin);
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('profiles').update({
        pin_code_hash: hash, onboarding_stage: 'pin_complete', updated_at: new Date().toISOString(),
      }).eq('id', user.id);
      onNext?.();
    } catch { toast.error('Could not save PIN'); } finally { setSaving(false); }
  };

  const dots = (val) => [0,1,2,3].map(i => (
    <div key={i} className={`w-3 h-3 rounded-full border-2 transition-all ${
      i < val.length ? 'bg-[#C8962C] border-[#C8962C]' : 'border-white/30'}`} />
  ));

  return (
    <div className="flex flex-col items-center h-full px-6 pt-12 pb-6">
      <div className="text-4xl mb-4">🔒</div>
      <h1 className="text-2xl font-black text-white mb-1">Protect your account</h1>
      <p className="text-white/40 text-sm text-center mb-8">4-digit PIN. Auto-locks after 5 min idle.</p>
      <p className="text-white/50 text-xs uppercase tracking-wider mb-4">{phase==='enter'?'Enter PIN':'Confirm PIN'}</p>
      <div className="flex gap-4 mb-8">{dots(phase==='enter'?pin:confirm)}</div>
      <div className="grid grid-cols-3 gap-4 w-64">
        {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d,i) => (
          <button key={i} onClick={() => {
            if (d==='⌫') { phase==='enter'?setPin(p=>p.slice(0,-1)):setConfirm(c=>c.slice(0,-1)); }
            else if (d!=='') handleDigit(String(d));
          }} disabled={saving}
          className={`h-14 rounded-2xl text-white font-bold text-xl ${d===''?'':'bg-white/10 active:bg-[#C8962C]/30'} transition-all`}
          >{d}</button>
        ))}
      </div>
      <button onClick={onSkip} className="mt-8 text-white/30 text-sm">Skip — set PIN later in Safety settings</button>
    </div>
  );
}
