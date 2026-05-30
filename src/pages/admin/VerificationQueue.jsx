/**
 * /admin/verification — admin queue for selfie verification submissions.
 *
 * Auth: client-side gate is decorative; the real lock is RLS on
 * profile_verifications (admin SELECT/UPDATE require profiles.is_admin).
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import UserVerification from '@/components/admin/UserVerification';

export default function VerificationQueue() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, isAdmin: false });

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) setState({ loading: false, isAdmin: false });
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();
      if (active) setState({ loading: false, isAdmin: !!profile?.is_admin });
    })();
    return () => { active = false; };
  }, []);

  if (state.loading) {
    return (
      <div className="min-h-screen bg-[#050507] text-white flex items-center justify-center">
        <Shield className="w-10 h-10 text-white/40 animate-pulse" />
      </div>
    );
  }

  if (!state.isAdmin) {
    return (
      <div className="min-h-screen bg-[#050507] text-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <Shield className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h1 className="text-xl font-black mb-2">Admin only</h1>
          <p className="text-white/50 text-sm mb-6">
            You don't have access to this page.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-xl bg-[#C8962C] text-black font-bold text-sm"
          >
            Go home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 pb-32">
        <header className="mb-8">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Admin</p>
          <h1 className="text-2xl font-black uppercase">Verification Queue</h1>
          <p className="text-white/50 text-sm mt-1">
            Selfie submissions awaiting human review.
          </p>
        </header>
        <UserVerification />
      </div>
    </div>
  );
}
