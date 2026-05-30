import { useState, useEffect } from 'react';
import { Copy, Share2, Check } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

export default function L2ReferralSheet() {
  const [code, setCode] = useState('');
  const [stats, setStats] = useState({ invited: 0, joined: 0 });
  const [copied, setCopied] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    let { data: { user } } = await supabase.auth.getUser();
    const { data: p } = await supabase.from('profiles').select('referral_code').eq('id', user.id).single();
    if (p?.referral_code) setCode(p.referral_code);
    const [{ count: inv }, { count: joined }] = await Promise.all([
      supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', user.id),
      supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', user.id).eq('status', 'completed'),
    ]);
    setStats({ invited: inv || 0, joined: joined || 0 });
  };

  const url = `https://hotmessldn.com/?ref=${code}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    toast.success('Copied!');
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'Join HOTMESS', text: 'Join me on HOTMESS — the queer nightlife app.', url }).catch(() => handleCopy());
    } else handleCopy();
  };

  return (
    <div className="flex flex-col h-full px-4 pt-6 pb-8">
      <h2 className="text-xl font-black text-white mb-1">Invite Friends</h2>
      <p className="text-white/40 text-sm mb-6">Each friend who joins earns you 7 days HOTMESS free.</p>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Your invite code</p>
        <p className="text-[#C8962C] font-black text-3xl tracking-widest">{code || '—'}</p>
        <p className="text-white/30 text-xs mt-2 break-all">{url}</p>
      </div>
      <div className="flex gap-3 mb-6">
        <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 border border-white/15 rounded-2xl text-white font-bold text-sm">
          {copied ? <Check className="w-4 h-4 text-[#39FF14]" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#C8962C] rounded-2xl text-black font-black text-sm">
          <Share2 className="w-4 h-4" />Share
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[{ l: 'Friends invited', v: stats.invited }, { l: 'Joined', v: stats.joined }].map(s => (
          <div key={s.l} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-white">{s.v}</p>
            <p className="text-white/40 text-xs mt-1">{s.l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

