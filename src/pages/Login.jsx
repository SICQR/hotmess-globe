import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';

function useReturnUrl() {
  const location = useLocation();
  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('returnUrl') || '/';
  }, [location.search]);
}

export default function Login() {
  const returnUrl = useReturnUrl();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      window.location.href = returnUrl;
    } catch (err) {
      setError(err?.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-xl p-6">
        <h1 className="text-2xl font-black uppercase tracking-tight">Sign in</h1>
        <p className="text-white/60 text-sm mt-1">Use your Supabase account credentials.</p>

        <form onSubmit={signIn} className="mt-6 space-y-3">
          <div>
            <label className="text-xs text-white/60 uppercase tracking-wider">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              className="mt-1 w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-white outline-none focus:border-white/30"
              required
            />
          </div>

          <div>
            <label className="text-xs text-white/60 uppercase tracking-wider">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-white outline-none focus:border-white/30"
              required
            />
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold rounded-md px-3 py-2 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
