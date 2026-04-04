/**
 * ResetPassword — handles the magic link from "Forgot password" email
 * Supabase redirects here with the session already set in the URL hash.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [ready, setReady]             = useState(false);

  // Supabase puts the recovery token in the URL hash.
  // Listening for PASSWORD_RECOVERY event confirms the session is live.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    // Also check if we already have a session (page reload case)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    if (password.length < 8)    return toast.error('Password must be at least 8 characters');
    if (password !== confirm)   return toast.error("Passwords don't match");

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated! Signing you in...');
      setTimeout(() => navigate('/', { replace: true }), 1200);
    } catch (err) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-end pb-0 overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: 'url(/assets/hero-main.png)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 w-full"
      >
        <div className="w-full bg-[#0D0D0D] border-t border-white/10 rounded-t-3xl px-6 pt-8 pb-12">
          <div className="mb-6">
            <p className="text-[#C8962C] text-[10px] font-black uppercase tracking-widest mb-1">HOTMESS</p>
            <h2 className="text-white font-black text-2xl">New password</h2>
            <p className="text-white/40 text-sm mt-1">Choose something you'll remember.</p>
          </div>

          {!ready ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-7 h-7 text-[#C8962C] animate-spin" />
              <p className="text-white/30 text-xs">Verifying reset link…</p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-3">
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="New password (min 8 chars)"
                  autoComplete="new-password"
                  autoFocus
                  className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C8962C]/60 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C8962C]/60 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {confirm && password !== confirm && (
                <p className="text-[#C8962C] text-xs pl-1">Passwords don't match</p>
              )}

              <button
                type="submit"
                disabled={loading || password.length < 8 || password !== confirm}
                className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl py-4 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 mt-2"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
                  : <><Check className="w-4 h-4" /> Set New Password</>}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
